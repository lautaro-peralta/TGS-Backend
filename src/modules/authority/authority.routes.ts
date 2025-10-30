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
import { AuthorityController } from './authority.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import {
  createAuthoritySchema,
  updateAuthoritySchema,
  partialUpdateAuthoritySchema,
} from './authority.schema.js';
import { Role } from '../auth/user/user.entity.js';

// ============================================================================
// ROUTER - Authority
// ============================================================================
export const authorityRouter = Router();
const authorityController = new AuthorityController();

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
 * /api/authorities/search:
 *   get:
 *     tags: [Authorities]
 *     summary: Search authorities
 *     description: Search for police authorities by multiple criteria including zone and rank
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term for name or email
 *         example: "Inspector Campbell"
 *       - in: query
 *         name: zone
 *         schema:
 *           type: string
 *         description: Filter by zone name
 *         example: "Small Heath"
 *       - in: query
 *         name: rank
 *         schema:
 *           type: string
 *         description: Filter by rank (0=Officer, 1=Sergeant, 2=Inspector, 3=Chief Inspector)
 *         example: "2"
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
 *         description: Search results with pagination
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
 *                     properties:
 *                       dni:
 *                         type: string
 *                         example: "12345678"
 *                       name:
 *                         type: string
 *                         example: "Inspector Chester Campbell"
 *                       email:
 *                         type: string
 *                         example: "campbell@birminghampolice.gov.uk"
 *                       rank:
 *                         type: integer
 *                         example: 2
 *                       zone:
 *                         type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 */
authorityRouter.get(
  '/search',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  authorityController.searchAuthorities
);

/**
 * @swagger
 * /api/authorities:
 *   post:
 *     tags: [Authorities]
 *     summary: Create new authority
 *     description: Register a new police authority in the system (Admin/Partner only)
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
 *               - rank
 *               - zoneId
 *             properties:
 *               dni:
 *                 type: string
 *                 example: "87654321"
 *               name:
 *                 type: string
 *                 example: "Inspector Moss"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "moss@birminghampolice.gov.uk"
 *               address:
 *                 type: string
 *                 example: "Birmingham Police Station, Small Heath"
 *               phone:
 *                 type: string
 *                 example: "+44 121 626 5000"
 *               rank:
 *                 type: string
 *                 enum: ['0', '1', '2', '3']
 *                 description: "0=Officer, 1=Sergeant, 2=Inspector, 3=Chief Inspector"
 *                 example: "2"
 *               zoneId:
 *                 type: string
 *                 example: "1"
 *     responses:
 *       201:
 *         description: Authority created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       409:
 *         description: Authority with this DNI already exists
 */
authorityRouter.post(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ body: createAuthoritySchema }),
  authorityController.createAuthority
);

/**
 * @swagger
 * /api/authorities:
 *   get:
 *     tags: [Authorities]
 *     summary: Get all authorities
 *     description: Retrieves a list of all registered police authorities
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all authorities
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
 *                     properties:
 *                       dni:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       rank:
 *                         type: integer
 *                       zone:
 *                         type: object
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 */
authorityRouter.get(
  '/',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  authorityController.getAllAuthorities
);

/**
 * @swagger
 * /api/authorities/{dni}:
 *   get:
 *     tags: [Authorities]
 *     summary: Get authority by DNI
 *     description: Retrieves detailed information about a specific authority
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 7
 *           maxLength: 10
 *         description: Authority's DNI
 *         example: "12345678"
 *     responses:
 *       200:
 *         description: Authority details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     dni:
 *                       type: string
 *                       example: "12345678"
 *                     name:
 *                       type: string
 *                       example: "Inspector Chester Campbell"
 *                     email:
 *                       type: string
 *                       example: "campbell@birminghampolice.gov.uk"
 *                     rank:
 *                       type: integer
 *                       example: 2
 *                     zone:
 *                       type: object
 *       400:
 *         description: Invalid DNI format
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin or Partner role required
 *       404:
 *         description: Authority not found
 */
authorityRouter.get(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.PARTNER]),
  validateWithSchema({ params: dniParamSchema }),
  authorityController.getOneAuthorityByDni
);

/**
 * @swagger
 * /api/authorities/{dni}/bribes:
 *   get:
 *     tags: [Authorities]
 *     summary: Get authority's bribes
 *     description: Retrieves all bribes associated with a specific authority
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Authority's DNI
 *         example: "12345678"
 *       - in: query
 *         name: paid
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by payment status
 *         example: "false"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of bribes for this authority
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
 *                     properties:
 *                       id:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                         example: 500
 *                       isPaid:
 *                         type: boolean
 *                         example: false
 *                       date:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin, Authority, or Partner role required
 *       404:
 *         description: Authority not found
 */
authorityRouter.get(
  '/:dni/bribes',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.AUTHORITY, Role.PARTNER]),
  authorityController.getAuthorityBribes
);

/**
 * @swagger
 * /api/authorities/{dni}:
 *   put:
 *     tags: [Authorities]
 *     summary: Update authority (full)
 *     description: Performs a complete update of an authority's information
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Authority's DNI
 *         example: "12345678"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - rank
 *               - zoneId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Chief Inspector Campbell"
 *               rank:
 *                 type: string
 *                 enum: ['0', '1', '2', '3']
 *                 example: "3"
 *               zoneId:
 *                 type: string
 *                 example: "1"
 *     responses:
 *       200:
 *         description: Authority updated successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin, Authority, or Partner role required
 *       404:
 *         description: Authority not found
 */
authorityRouter.put(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.AUTHORITY, Role.PARTNER]),
  validateWithSchema({ body: updateAuthoritySchema }),
  authorityController.putUpdateAuthority
);

/**
 * @swagger
 * /api/authorities/{dni}:
 *   patch:
 *     tags: [Authorities]
 *     summary: Update authority (partial)
 *     description: Performs a partial update of an authority's information
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Authority's DNI
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
 *                 example: "Chief Inspector Campbell"
 *               rank:
 *                 type: string
 *                 enum: ['0', '1', '2', '3']
 *                 example: "3"
 *               zoneId:
 *                 type: string
 *                 example: "2"
 *     responses:
 *       200:
 *         description: Authority updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin, Authority, or Partner role required
 *       404:
 *         description: Authority not found
 */
authorityRouter.patch(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.AUTHORITY, Role.PARTNER]),
  validateWithSchema({ body: partialUpdateAuthoritySchema }),
  authorityController.patchUpdateAuthority
);

/**
 * @swagger
 * /api/authorities/{dni}:
 *   delete:
 *     tags: [Authorities]
 *     summary: Delete authority
 *     description: Removes an authority from the system
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: dni
 *         required: true
 *         schema:
 *           type: string
 *         description: Authority's DNI
 *         example: "12345678"
 *     responses:
 *       200:
 *         description: Authority deleted successfully
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
 *                   example: "Authority deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin, Authority, or Partner role required
 *       404:
 *         description: Authority not found
 */
authorityRouter.delete(
  '/:dni',
  authMiddleware,
  rolesMiddleware([Role.ADMIN, Role.AUTHORITY, Role.PARTNER]),
  authorityController.deleteAuthority
);
