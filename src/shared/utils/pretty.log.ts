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
 * // Rutas cargadas:
 * //   • /api/users
 * //   • /api/products
 */
export function logRoutes(routes: string[]) {
  console.log(bold(cyan('Rutas cargadas:')));
  routes.forEach((route) => {
    console.log(`  ${yellow('•')} ${yellow(route)}`);
  });
}
