// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';
import { UTApi } from 'uploadthing/server';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Product } from '../product/product.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

// ============================================================================
// UPLOADTHING API CLIENT
// ============================================================================

/**
 * UploadThing API client for file operations.
 * Uses UPLOADTHING_TOKEN from environment variables.
 */
const utapi = new UTApi();

// ============================================================================
// CONTROLLER - Upload
// ============================================================================

/**
 * Controller for handling file upload operations.
 * Manages product images via UploadThing.
 *
 * @class UploadController
 */
export class UploadController {
  // ──────────────────────────────────────────────────────────────────────────
  // UPLOAD PRODUCT IMAGE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Uploads a product image and stores the URL in the database.
   *
   * This endpoint:
   * 1. Validates that the product exists
   * 2. Deletes the old image from UploadThing if one exists
   * 3. Uploads the new image to UploadThing
   * 4. Updates the database with the new imageUrl and imageKey
   *
   * @param {Request} req - The Express request object
   * @param {Response} res - The Express response object
   * @returns {Promise<Response>} A promise that resolves to the response
   */
  async uploadProductImage(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate product exists
      // ──────────────────────────────────────────────────────────────────────
      const productId = Number(req.params.id);
      const product = await em.findOne(Product, { id: productId });

      if (!product) {
        return ResponseUtil.notFound(res, 'Product', productId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Validate that a file was uploaded
      // ──────────────────────────────────────────────────────────────────────
      if (!req.file) {
        return ResponseUtil.validationError(res, 'No file uploaded', [
          { field: 'file', message: 'A file is required' },
        ]);
      }

      const file = req.file;

      // Note: File type and size validation is already handled by multer middleware
      // but we keep this check for security in depth
      if (!file.mimetype.startsWith('image/')) {
        return ResponseUtil.validationError(res, 'Invalid file type', [
          { field: 'file', message: 'File must be an image' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete old image from UploadThing if exists
      // ──────────────────────────────────────────────────────────────────────
      if (product.imageKey) {
        try {
          await utapi.deleteFiles(product.imageKey);
          console.log(`[Upload] Deleted old image: ${product.imageKey}`);
        } catch (deleteError) {
          // Log error but continue (old image might have been deleted manually)
          console.warn(
            `[Upload] Failed to delete old image: ${product.imageKey}`,
            deleteError
          );
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Upload new image to UploadThing
      // ──────────────────────────────────────────────────────────────────────
      // Convert multer file (Buffer) to File object for UploadThing
      const fileBlob = new File([file.buffer], file.originalname, {
        type: file.mimetype,
      });

      const uploadResponse = await utapi.uploadFiles(fileBlob);

      if (!uploadResponse || uploadResponse.error) {
        return ResponseUtil.internalError(
          res,
          'Failed to upload image to UploadThing',
          uploadResponse?.error
        );
      }

      const { url, key, name, size } = uploadResponse.data;

      // ──────────────────────────────────────────────────────────────────────
      // Update product with new image URL and key
      // ──────────────────────────────────────────────────────────────────────
      product.imageUrl = url;
      product.imageKey = key;
      await em.flush();

      console.log(`[Upload] Image uploaded for product ${productId}:`, {
        url,
        key,
        name,
        size,
      });

      // ──────────────────────────────────────────────────────────────────────
      // Return success response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(res, 'Image uploaded successfully', {
        productId: product.id,
        imageUrl: product.imageUrl,
        imageName: name,
        imageSize: size,
      });
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error uploading image', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE PRODUCT IMAGE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a product image from UploadThing and removes the URL from the database.
   *
   * This endpoint:
   * 1. Validates that the product exists
   * 2. Validates that the product has an image
   * 3. Deletes the image from UploadThing
   * 4. Removes the imageUrl and imageKey from the database
   *
   * @param {Request} req - The Express request object
   * @param {Response} res - The Express response object
   * @returns {Promise<Response>} A promise that resolves to the response
   */
  async deleteProductImage(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate product exists
      // ──────────────────────────────────────────────────────────────────────
      const productId = Number(req.params.id);
      const product = await em.findOne(Product, { id: productId });

      if (!product) {
        return ResponseUtil.notFound(res, 'Product', productId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Validate product has an image
      // ──────────────────────────────────────────────────────────────────────
      if (!product.imageKey) {
        return ResponseUtil.validationError(
          res,
          'Product does not have an image',
          [{ field: 'imageUrl', message: 'No image to delete' }]
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete image from UploadThing
      // ──────────────────────────────────────────────────────────────────────
      try {
        await utapi.deleteFiles(product.imageKey);
        console.log(`[Upload] Deleted image: ${product.imageKey}`);
      } catch (deleteError) {
        // Log error but continue (image might have been deleted manually)
        console.warn(
          `[Upload] Failed to delete image from UploadThing: ${product.imageKey}`,
          deleteError
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Remove image URL and key from database
      // ──────────────────────────────────────────────────────────────────────
      product.imageUrl = undefined;
      product.imageKey = undefined;
      await em.flush();

      console.log(`[Upload] Image removed from product ${productId}`);

      // ──────────────────────────────────────────────────────────────────────
      // Return success response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(res, 'Image deleted successfully', {
        productId: product.id,
      });
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error deleting image', err);
    }
  }
}
