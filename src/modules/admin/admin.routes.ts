// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';
import { z } from 'zod';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import {
  authMiddleware,
  rolesMiddleware,
} from '../../modules/auth/auth.middleware.js';
import { AdminController } from './admin.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createAdminSchema,
  updateAdminSchema,
} from './admin.schema.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - Admin
// ============================================================================
export const adminRouter = Router();
const adminController = new AdminController();

/**
 * Zod schema for DNI parameter validation.
 */
const dniParamSchema = z.object({
  dni: z.string().min(7).max(10),
});

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/search:
 *   get:
 *     tags: [Admin]
 *     summary: Search for administrators
 *     description: Search administrators by name or department with pagination
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *         example: "Arthur"
 *       - in: query
 *         name: by
 *         schema:
 *           type: string
 *           enum: [name, department]
 *         description: Field to search by
 *         example: "name"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
adminRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  adminController.searchAdmins
);

/**
 * @swagger
 * /api/admin:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new administrator
 *     description: Creates a new admin in the system (Admin role required)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dni
 *               - name
 *               - email
 *             properties:
 *               dni:
 *                 type: string
 *                 example: "12345678"
 *               name:
 *                 type: string
 *                 example: "Arthur Shelby"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "arthur@shelby.com"
 *               phone:
 *                 type: string
 *                 example: "+44 121 496 0000"
 *               address:
 *                 type: string
 *                 example: "Watery Lane, Birmingham"
 *               rank:
 *                 type: integer
 *                 example: 2
 *               department:
 *                 type: string
 *                 example: "Operations"
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       409:
 *         description: Admin with this DNI already exists
 */
adminRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ body: createAdminSchema }),
  adminController.createAdmin
);

/**
 * @swagger
 * /api/admin:
 *   get:
 *     tags: [Admin]
 *     summary: Get all administrators
 *     description: Retrieves a list of all administrators in the system
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of administrators
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
adminRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  adminController.getAllAdmins
);

/**
 * @swagger
 * /api/admin/{dni}:
 *   get:
 *     tags: [Admin]
 *     summary: Get administrator by DNI
 *     description: Retrieves a specific administrator by their DNI
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Administrator's DNI
 *         example: "12345678"
 *     responses:
 *       200:
 *         description: Administrator found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Administrator not found
 */
adminRouter.get(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: dniParamSchema }),
  adminController.getOneAdminByDni
);

/**
 * @swagger
 * /api/admin/{dni}:
 *   put:
 *     tags: [Admin]
 *     summary: Update administrator
 *     description: Updates an administrator's information by DNI
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Administrator's DNI
 *         example: "12345678"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Arthur Shelby Jr."
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "arthur.jr@shelby.com"
 *               phone:
 *                 type: string
 *                 example: "+44 121 496 0001"
 *               address:
 *                 type: string
 *                 example: "Arrow House, Warwickshire"
 *               rank:
 *                 type: integer
 *                 example: 3
 *               department:
 *                 type: string
 *                 example: "Strategic Operations"
 *     responses:
 *       200:
 *         description: Administrator updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Administrator not found
 */
adminRouter.put(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: dniParamSchema, body: updateAdminSchema }),
  adminController.updateAdmin
);

/**
 * @swagger
 * /api/admin/{dni}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete administrator
 *     description: Removes an administrator from the system by DNI
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Administrator's DNI
 *         example: "12345678"
 *     responses:
 *       200:
 *         description: Administrator deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: Administrator not found
 */
adminRouter.delete(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN]),
  validateWithSchema({ params: dniParamSchema }),
  adminController.deleteAdmin
);