import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'The Garrison System API',
      version: '1.0.0',
      description: `
        API REST para The Garrison System - Sistema de ventas y gestión de recursos
        ambientado en el Birmingham de los años 1920.

        ## Autenticación
        Esta API usa autenticación basada en cookies HTTP-only con JWT.

        **Cómo autenticarte:**
        1. Usa el endpoint \`POST /api/auth/login\` para iniciar sesión
        2. El servidor automáticamente establecerá cookies seguras en tu navegador
        3. Todas las peticiones subsiguientes incluirán automáticamente las cookies
        4. **No necesitas copiar/pegar tokens manualmente**

        **Importante para Swagger UI:**
        - Las cookies funcionan automáticamente en el mismo dominio
        - Si usas Swagger UI desde localhost:3000, las cookies funcionarán sin configuración adicional
        - Simplemente haz login y luego prueba otros endpoints protegidos
      `,
      contact: {
        name: 'Grupo Shelby',
        url: 'https://github.com/Lau-prog/TP-Desarrollo-de-Software',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desarrollo',
      },
      {
        url: 'https://api.tgs.com',
        description: 'Servidor de Producción',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
          description: 'JWT token almacenado en cookie HTTP-only. Se establece automáticamente al hacer login.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Error de validación',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Autenticación y autorización',
      },
      {
        name: 'Products',
        description: 'Gestión de productos (legales e ilegales)',
      },
      {
        name: 'Clients',
        description: 'Gestión de clientes',
      },
      {
        name: 'Sales',
        description: 'Gestión de ventas',
      },
      {
        name: 'Partners',
        description: 'Gestión de socios',
      },
      {
        name: 'Zones',
        description: 'Gestión de zonas',
      },
      {
        name: 'Bribes',
        description: 'Gestión de sobornos',
      },
      {
        name: 'Strategic Decisions',
        description: 'Decisiones estratégicas del Consejo Shelby',
      },
    ],
  };

  const options: swaggerJsdoc.Options = {
    definition: swaggerDefinition,
    // Rutas donde están tus archivos con anotaciones
    apis: [
      './src/modules/**/*.routes.ts',
      './src/modules/**/*.controller.ts',
      './src/shared/**/*.ts',
    ],
  };

  export const swaggerSpec = swaggerJsdoc(options);
