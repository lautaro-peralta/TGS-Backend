// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Router } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { AuthController } from './auth.controller.js';
import { validateWithSchema } from '../../shared/middleware/validation.middleware.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import { userRouter } from './user/user.routes.js';
import { roleRequestRouter } from './roleRequest/roleRequest.routes.js';

// ============================================================================
// ROUTER - Auth
// ============================================================================
const authRouter = Router();
const authController = new AuthController();

// ──────────────────────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new user account. In production mode, sends verification email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "thomas_shelby"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "thomas@shelby.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "SecurePass123"
 *     responses:
 *       201:
 *         description: User created successfully
 *       409:
 *         description: Username or email already exists
 */
authRouter.post(
  '/register',
  validateWithSchema({ body: registerSchema }),
  authController.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login to the system
 *     description: Authenticates user and sets HTTP-only cookies with access and refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "thomas@shelby.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass123"
 *     responses:
 *       200:
 *         description: Login successful, cookies set automatically
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
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email verification required
 */
authRouter.post(
  '/login',
  validateWithSchema({ body: loginSchema }),
  authController.login
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout from the system
 *     description: Revokes refresh token and clears authentication cookies
 *     responses:
 *       200:
 *         description: Logout successful
 */
authRouter.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Uses refresh token cookie to generate new access token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
authRouter.post('/refresh', authController.refresh);

// Mount sub-routers
authRouter.use('/users', userRouter);
authRouter.use('/role-requests', roleRequestRouter);

export { authRouter };