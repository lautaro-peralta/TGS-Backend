import { bold, cyan, yellow } from 'colorette';

export function logRoutes(routes: string[]) {
  console.log(bold(cyan('Rutas cargadas:')));
  routes.forEach((route) => {
    console.log(`  ${yellow('•')} ${yellow(route)}`);
  });
}
