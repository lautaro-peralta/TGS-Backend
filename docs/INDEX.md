# Documentación Completa - TGS Backend API

## Índice General

Bienvenido a la documentación académica completa del backend de **The Garrison System (TGS)**. Esta documentación está organizada por temas para facilitar la comprensión del sistema.

---

## 📚 Guías de Documentación

### Guías Esenciales

1. **[Inicio Rápido](01-QUICK-START.md)**
   - Requisitos previos
   - Instalación paso a paso
   - Primera ejecución
   - Verificación del sistema

2. **[Arquitectura del Proyecto](02-ARCHITECTURE.md)**
   - Estructura de directorios
   - Patrones de diseño utilizados
   - Flujo de datos en la aplicación
   - Separación de responsabilidades

3. **[Configuración de Entorno](03-ENVIRONMENT-CONFIG.md)**
   - Variables de entorno explicadas
   - Configuración para desarrollo
   - Configuración para producción
   - Modos de operación (desarrollo, demo, producción)

4. **[Base de Datos](04-DATABASE.md)**
   - Modelo de datos
   - Entidades y relaciones
   - Configuración de MikroORM
   - Migraciones y esquemas

5. **[Sistema de Autenticación](05-AUTHENTICATION.md)**
   - Flujo de autenticación con JWT
   - Registro de usuarios
   - Verificación de email
   - Gestión de roles y permisos

6. **[API Endpoints](06-API-ENDPOINTS.md)**
   - Documentación completa de endpoints
   - Ejemplos de request/response
   - Códigos de estado HTTP
   - Validación de datos

7. **[Seguridad y Mejores Prácticas](07-SECURITY.md)**
   - Medidas de seguridad implementadas
   - Rate limiting
   - CORS y headers de seguridad
   - Mejores prácticas de desarrollo

8. **[User Verification & Bribes](08-USER-VERIFICATION-AND-BRIBES.md)**
   - Sistema de verificación de usuarios
   - Gestión de sobornos (bribes)
   - Endpoints de aprobación/rechazo
   - Búsqueda y pagos de bribes

---

## 🎯 ¿Por dónde empezar?

### Si eres nuevo en el proyecto:

1. Lee la **[Guía de Inicio Rápido](01-QUICK-START.md)** para poner en marcha la aplicación
2. Revisa la **[Arquitectura del Proyecto](02-ARCHITECTURE.md)** para entender la estructura
3. Consulta la **[Configuración de Entorno](03-ENVIRONMENT-CONFIG.md)** para personalizar tu entorno

### Si quieres entender la lógica de negocio:

1. Estudia el **[Modelo de Base de Datos](04-DATABASE.md)** para comprender las entidades
2. Revisa los **[API Endpoints](06-API-ENDPOINTS.md)** para ver las operaciones disponibles
3. Lee sobre **[Autenticación](05-AUTHENTICATION.md)** para entender el control de acceso

### Si vas a contribuir al proyecto:

1. Familiarízate con **[Seguridad y Mejores Prácticas](07-SECURITY.md)**
2. Consulta las guías técnicas específicas según tu área de trabajo

---

## 📊 Diagramas y Recursos Visuales

A lo largo de esta documentación encontrarás:

- Diagramas de flujo de procesos
- Diagramas de arquitectura
- Diagramas de entidad-relación (ER)
- Diagramas de secuencia para flujos complejos

---

## 🛠️ Stack Tecnológico

- **Runtime**: Node.js
- **Lenguaje**: TypeScript
- **Framework Web**: Express.js
- **ORM**: MikroORM
- **Base de Datos**: PostgreSQL 16
- **Autenticación**: JWT (JSON Web Tokens)
- **Validación**: Zod
- **Logging**: Pino
- **Caché**: Redis (opcional)
- **Email**: Nodemailer / SendGrid

---

## 📞 Recursos Adicionales

- **Repositorio General**: [GarrSYS](https://github.com/Lau-prog/GarrSYS)
- **README Principal**: [README.md](../README.md)

---

**Última actualización**: 2026-09-04
