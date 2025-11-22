// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';
import multer from 'multer';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { UploadController } from './upload.controller.js';
import { authMiddleware, rolesMiddleware } from '../auth/auth.middleware.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

/**
 * Configure multer to store files in memory as Buffer objects.
 * This allows us to upload files directly to UploadThing without
 * saving them to disk first.
 *
 * Limits:
 * - File size: 4MB (4 * 1024 * 1024 bytes)
 * - Files per request: 1
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB
    files: 1, // Only one file per request
  },
  fileFilter: (req, file, cb) => {
    // Accept any image format
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ============================================================================
// ROUTER - Upload
// ============================================================================
export const uploadRouter = Router();
const uploadController = new UploadController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/products/{id}/image:
 *   post:
 *     tags: [Products]
 *     summary: Upload product image
 *     description: Uploads an image for a product (Distributor only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (max 4MB, any image format)
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Image uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     imageUrl:
 *                       type: string
 *                       example: "https://utfs.io/f/abc123..."
 *       400:
 *         description: Invalid file or product not found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions (Distributor only)
 */
uploadRouter.post(
  '/:id/image',
  authMiddleware,
  rolesMiddleware([Role.DISTRIBUTOR]),
  upload.single('file'),
  uploadController.uploadProductImage
);

/**
 * @swagger
 * /api/products/{id}/image:
 *   delete:
 *     tags: [Products]
 *     summary: Delete product image
 *     description: Deletes the image of a product (Distributor only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Product does not have an image
 *       404:
 *         description: Product not found
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions (Distributor only)
 */
uploadRouter.delete(
  '/:id/image',
  authMiddleware,
  rolesMiddleware([Role.DISTRIBUTOR]),
  uploadController.deleteProductImage
);
