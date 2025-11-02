import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'The Garrison System API',
      version: '1.0.0',
      description: `API REST para The Garrison System - Sistema de ventas y gestión de recursos ambientado en el Birmingham de los años 1920.

## 🔐 Autenticación

Esta API usa **autenticación basada en cookies HTTP-only** con JWT para máxima seguridad.

### Flujo de Autenticación

\`\`\`
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       │ 1. POST /api/auth/register
       │    (username, email, password)
       ▼
┌─────────────────┐
│     Servidor    │─────► Crea cuenta
└────────┬────────┘       Envía email de verificación
         │
         │ 2. Verifica email (opcional en dev)
         │
         │ 3. POST /api/auth/login
         │    (email, password)
         ▼
┌─────────────────┐
│     Servidor    │─────► Valida credenciales
└────────┬────────┘       Establece cookies HTTP-only:
         │                • access_token
         │                • refresh_token
         │
         │ 4. Cookies establecidas ✓
         │
         │ 5. Request a endpoint protegido
         │    (cookies enviadas automáticamente)
         ▼
┌─────────────────┐
│     Servidor    │─────► Valida token
└────────┬────────┘       Autoriza acceso
         │
         │ 6. Respuesta exitosa
         ▼
┌─────────────┐
│   Usuario   │
└─────────────┘
\`\`\`

### Cómo usar en Swagger UI

**🎯 No necesitas hacer nada especial - las cookies funcionan automáticamente!**

#### Paso a paso:

1. **Registra una cuenta** → \`POST /api/auth/register\`
   - Proporciona username, email y password
   - En desarrollo, la verificación de email es opcional

2. **Inicia sesión** → \`POST /api/auth/login\`
   - Usa tus credenciales
   - El servidor establece cookies automáticamente
   - ✅ **Ya estás autenticado!**

3. **Usa cualquier endpoint protegido**
   - Las cookies se envían automáticamente con cada request
   - No necesitas copiar/pegar tokens
   - No necesitas el botón "Authorize"

4. **Cierra sesión** → \`POST /api/auth/logout\`
   - Limpia las cookies del navegador

### Ciclo de Vida del Token

\`\`\`
Access Token (15 min)  ──────► Expira
         │
         │ Auto-refresh mediante
         │ POST /api/auth/refresh
         ▼
Refresh Token (7 días) ──────► Token renovado
         │
         │ Si expira
         ▼
Re-login requerido
\`\`\`

### Arquitectura de Seguridad

\`\`\`
┌──────────────────────────────────────┐
│         Capas de Seguridad           │
├──────────────────────────────────────┤
│ 🛡️  Helmet (Security Headers)       │
│ ⚡  Rate Limiting                    │
│ 🔒  CORS Configurado                 │
│ 🍪  Cookies HTTP-only (no JS access)│
│ 🔑  JWT con refresh token rotation   │
│ ✉️  Email Verification               │
│ ✅  Admin User Verification          │
└──────────────────────────────────────┘
\`\`\`

### Roles y Permisos

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **ADMIN** | Administrador del sistema | Acceso completo a todos los endpoints |
| **PARTNER** | Socio del negocio | Gestión de decisiones, acuerdos, revisiones |
| **CLIENT** | Cliente | Gestión de ventas y productos |
| **DISTRIBUTOR** | Distribuidor | Gestión de distribución |
| **AUTHORITY** | Autoridad/Policía | Gestión de sobornos |

### Tips para Testing

- ✅ **Desarrollo**: Usa \`localhost:3000\` para que las cookies funcionen
- ✅ **Producción**: Las cookies solo funcionan sobre HTTPS
- ✅ **Multi-sesión**: Cada navegador mantiene su propia sesión
- ✅ **Logout**: Cierra sesión para probar con otro usuario`,
      contact: {
        name: 'The Garrison System',
        url: 'https://github.com/Lau-prog/TP-Desarrollo-de-Software',
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
    },
    tags: [
      {
        name: 'Auth',
        description: 'Autenticación y autorización',
      },
      {
        name: 'Users',
        description: 'Gestión de usuarios y perfiles',
      },
      {
        name: 'Admin',
        description: 'Gestión de administradores',
      },
      {
        name: 'Role Requests',
        description: 'Solicitudes de cambio de rol',
      },
      {
        name: 'Email Verification',
        description: 'Verificación de correo electrónico',
      },
      {
        name: 'User Verification',
        description: 'Verificación de usuarios por administrador',
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
        name: 'Distributors',
        description: 'Gestión de distribuidores',
      },
      {
        name: 'Zones',
        description: 'Gestión de zonas de Birmingham',
      },
      {
        name: 'Authorities',
        description: 'Gestión de autoridades y policía',
      },
      {
        name: 'Bribes',
        description: 'Gestión de sobornos a autoridades',
      },
      {
        name: 'Strategic Decisions',
        description: 'Decisiones estratégicas del Consejo Shelby',
      },
      {
        name: 'Topics',
        description: 'Temas de discusión',
      },
      {
        name: 'Shelby Council',
        description: 'Gestión del Consejo Shelby',
      },
      {
        name: 'Monthly Reviews',
        description: 'Revisiones mensuales del consejo',
      },
      {
        name: 'Clandestine Agreements',
        description: 'Acuerdos clandestinos',
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
