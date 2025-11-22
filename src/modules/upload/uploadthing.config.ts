// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { createUploadthing, type FileRouter } from 'uploadthing/server';

// ============================================================================
// UPLOADTHING CONFIGURATION
// ============================================================================

/**
 * Initialize UploadThing instance.
 * Uses UPLOADTHING_TOKEN from environment variables.
 */
const f = createUploadthing();

/**
 * File Router for UploadThing.
 * Defines upload endpoints and their configurations.
 *
 * @see https://docs.uploadthing.com/getting-started/appdir
 */
export const uploadRouter = {
  /**
   * Product Image Uploader
   *
   * Allows uploading a single image for a product.
   * This endpoint is used by distributors to add/update product images.
   *
   * Restrictions:
   * - Max file size: 4MB
   * - Max files: 1 (one image per product)
   * - Allowed formats: All image types (jpeg, png, webp, gif, svg, etc.)
   */
  productImage: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      /**
       * Middleware executed BEFORE upload starts.
       *
       * Here you can:
       * - Authenticate the user
       * - Validate permissions
       * - Add metadata to the uploaded file
       *
       * Note: Authentication is handled at the route level,
       * so this middleware assumes the user is already authenticated
       * and has the DISTRIBUTOR role.
       */

      // Return metadata that will be available in onUploadComplete
      return {
        uploadedAt: new Date().toISOString(),
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      /**
       * Callback executed AFTER upload completes successfully.
       *
       * Here you can:
       * - Log the upload
       * - Update database
       * - Send notifications
       *
       * Note: The actual database update (saving imageUrl and imageKey)
       * is handled in the upload controller, not here.
       */

      console.log('[UploadThing] Upload complete:', {
        fileName: file.name,
        fileUrl: file.url,
        fileKey: file.key,
        uploadedAt: metadata.uploadedAt,
      });

      // Return data that will be sent to the client
      return {
        url: file.url,
        key: file.key,
        name: file.name,
        size: file.size,
      };
    }),
} satisfies FileRouter;

/**
 * Export type definition for the router.
 * This is used by the frontend to get type-safe access to the API.
 */
export type UploadThingRouter = typeof uploadRouter;
