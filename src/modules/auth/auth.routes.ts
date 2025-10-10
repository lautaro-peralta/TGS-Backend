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
 * @route   POST /api/auth/register
 * @desc    Register a new user.
 *          This endpoint validates the request body against the registerSchema.
 * @access  Public
 */
authRouter.post(
  '/register',
  validateWithSchema({ body: registerSchema }),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate a user and return a JWT.
 *          This endpoint validates the request body against the loginSchema.
 * @access  Public
 */
authRouter.post(
  '/login',
  validateWithSchema({ body: loginSchema }),
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Log out the current user by clearing the session cookie.
 * @access  Public
 */
authRouter.post('/logout', authController.logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token.
 * @access  Public
 */
authRouter.post('/refresh', authController.refresh);

// Mount sub-routers
authRouter.use('/users', userRouter);
authRouter.use('/role-requests', roleRequestRouter);

export { authRouter };