// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { bold, cyan, yellow } from 'colorette';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Logs a formatted list of API routes to the console
 * Used during application startup to display available endpoints
 *
 * @param routes - Array of route paths to display
 *
 * @example
 * logRoutes(['/api/users', '/api/products']);
 * // Output:
 * // Loaded routes:
 * //   * /api/users
 * //   * /api/products
 */
export function logRoutes(routes: string[]) {
  console.log(bold(cyan('Loaded routes:')));
  routes.forEach((route) => {
    console.log(`  ${yellow('*')} ${yellow(route)}`);
  });
}