# Graph Report - tgs-backend  (2026-09-13)

## Corpus Check
- 138 files · ~120,506 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1413 nodes · 3202 edges · 116 communities (71 shown, 45 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac79238b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- common.schema.ts
- .notFound
- Base de Datos - TGS Backend
- API Endpoints - TGS Backend
- error.middleware.ts
- Role
- Seguridad y Mejores Prácticas - TGS Backend
- Guía de Inicio Rápido - TGS Backend
- searchEntityWithPagination
- Sistema de Autenticación - TGS Backend
- user.entity.ts
- roleRequest.controller.ts
- Sale
- Arquitectura del Proyecto - TGS Backend
- app.ts
- .success
- EmailVerification
- monthlyReview.controller.ts
- clandestineAgreement.controller.ts
- .internalError
- user.routes.ts
- sale.controller.ts
- common.types.ts
- compilerOptions
- .error
- userVerification.routes.ts
- .validationError
- RedisService
- User Verification & Bribes - TGS Backend
- .reviewRequest
- clandestineAgreement.routes.ts
- validateWithSchema
- Configuración de Entorno - TGS Backend
- devDependencies
- User
- emailVerification.schema.ts
- EmailService
- TGS Backend - The Garrison System
- package.json
- UserVerification
- Documentación Completa - TGS Backend API
- authority.routes.ts
- bribe.routes.ts
- MonthlyReview
- rate-limiting.middleware.ts
- CacheService
- scripts
- health.controller.ts
- notification.routes.ts
- dependencies
- email.service.ts
- Configuración por Categoría
- admin.routes.ts
- RefreshToken
- RoleRequest
- Notification
- redis.middleware.ts
- roleRequest.entity.ts
- distributor.routes.ts
- ReviewStatus
- topic.routes.ts
- zone.routes.ts
- validation.middleware.ts
- Mejores Prácticas
- NotificationType
- HealthController
- EntityFilters
- Troubleshooting
- seed-test-data.mjs
- AgreementStatus
- .searchNotifications
- uploadthing.config.ts
- .validateEmailSync
- argon2
- colorette
- cookie-parser
- cors
- cross-env
- dotenv
- express
- express-rate-limit
- jsonwebtoken
- @mikro-orm/core
- @mikro-orm/knex
- @mikro-orm/migrations
- @mikro-orm/postgresql
- @mikro-orm/reflection
- @mikro-orm/sql-highlighter
- multer
- node-cron
- nodemon
- pg
- pino
- pino-pretty
- reflect-metadata
- @sendgrid/mail
- string-width
- swagger-jsdoc
- swagger-ui-express
- @types/express-rate-limit
- @types/nodemailer
- uploadthing
- uuid
- zod
- rimraf
- tsc-watch
- tsx
- @types/cors
- @types/express
- @types/jsonwebtoken
- @types/node

## God Nodes (most connected - your core abstractions)
1. `routeParam()` - 81 edges
2. `Role` - 48 edges
3. `searchEntityWithPagination()` - 47 edges
4. `User` - 42 edges
5. `ResponseUtil` - 39 edges
6. `logger` - 38 edges
7. `validateQueryParams()` - 37 edges
8. `BasePersonEntity` - 28 edges
9. `orm` - 27 edges
10. `RedisService` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Admin` --inherits--> `BasePersonEntity`  [EXTRACTED]
  src/modules/admin/admin.entity.ts → src/shared/base.person.entity.ts
- `RefreshToken` --references--> `User`  [EXTRACTED]
  src/modules/auth/refreshToken.entity.ts → src/modules/auth/user/user.entity.ts
- `RoleRequest` --references--> `Role`  [EXTRACTED]
  src/modules/auth/roleRequest/roleRequest.entity.ts → src/modules/auth/user/user.entity.ts
- `RoleRequest` --references--> `User`  [EXTRACTED]
  src/modules/auth/roleRequest/roleRequest.entity.ts → src/modules/auth/user/user.entity.ts
- `RoleRequestFilters` --references--> `Role`  [EXTRACTED]
  src/shared/types/common.types.ts → src/modules/auth/user/user.entity.ts

## Import Cycles
- None detected.

## Communities (116 total, 45 thin omitted)

### Community 0 - "common.schema.ts"
Cohesion: 0.05
Nodes (48): clientController, clientRouter, createClientSchema, searchClientsSchema, updateClientSchema, productController, productRouter, createProductSchema (+40 more)

### Community 1 - ".notFound"
Cohesion: 0.11
Nodes (10): AdminController, AuthorityController, BribeController, ClandestineAgreementController, ClientController, DecisionController, DistributorController, ProductController (+2 more)

### Community 2 - "Base de Datos - TGS Backend"
Cohesion: 0.04
Nodes (44): 10. ShelbyCouncil (Consejo Shelby), 11. Authority (Autoridad), 1. One-to-One (1:1), 1. Unit of Work (UoW), 1. User (Usuario del Sistema), 2. BasePersonEntity (Información Personal), 2. Identity Map, 2. One-to-Many (1:N) y Many-to-One (N:1) (+36 more)

### Community 3 - "API Endpoints - TGS Backend"
Cohesion: 0.04
Nodes (45): 🔒 Actualizar Información Personal, 🔒 Actualizar Producto, API Endpoints - TGS Backend, Autenticación, Autenticación, Base URL, 🔒 Cerrar Sesión, Clientes (+37 more)

### Community 4 - "error.middleware.ts"
Cohesion: 0.07
Nodes (22): AppError, BadRequestError, ConflictError, DatabaseError, ErrorFactory, ForbiddenError, InternalServerError, NotFoundError (+14 more)

### Community 5 - "Role"
Cohesion: 0.07
Nodes (33): authMiddleware(), rolesMiddleware(), TokenPayload, roleRequestController, additionalDataSchema, createRoleRequestSchema, reviewRoleRequestSchema, searchRoleRequestsSchema (+25 more)

### Community 6 - "Seguridad y Mejores Prácticas - TGS Backend"
Cohesion: 0.05
Nodes (41): 1. Password Hashing con Argon2, 1. Principio de Mínimo Privilegio, 1. SQL Injection, 2. Cross-Site Scripting (XSS), 2. JWT Tokens, 2. Validar Siempre en el Backend, 3. Cross-Site Request Forgery (CSRF), 3. Refresh Token Rotation (+33 more)

### Community 7 - "Guía de Inicio Rápido - TGS Backend"
Cohesion: 0.05
Nodes (38): 1. Clonar el Repositorio, 1. Compilar el Proyecto, 1. Crear Archivo de Entorno, 1. Health Check, 2. Editar Variables de Entorno, 2. Iniciar el Servidor en Modo Desarrollo, 2. Instalar Dependencias, 2. Probar Login (+30 more)

### Community 8 - "searchEntityWithPagination"
Cohesion: 0.09
Nodes (9): validateQueryParams(), createMultiFieldTextFilter(), createOrder(), createSearchCacheKey(), createTextFilter(), hasToDTO(), sanitizeSearchValue(), searchEntityWithPagination() (+1 more)

### Community 9 - "Sistema de Autenticación - TGS Backend"
Cohesion: 0.06
Nodes (34): 1. Hashing de Contraseñas (Argon2), 2. JWT Security Best Practices, 3. HTTP-Only Cookies, 4. Refresh Token Rotation, 5. Verificación de Email, authenticateToken, Código Ejemplo, Diagrama de Flujo del Middleware (+26 more)

### Community 10 - "user.entity.ts"
Cohesion: 0.25
Nodes (10): RelatedEntityType, utapi, orm, BribeFilters, Express, logger, Request, Response (+2 more)

### Community 11 - "roleRequest.controller.ts"
Cohesion: 0.11
Nodes (21): createAuthorityRecord(), createDistributorRecord(), createPartnerRecord(), createRoleRecordForApproval(), deleteRoleRecordForRoleChange(), UserVerificationDTO, Distributor, Entity (+13 more)

### Community 12 - "Sale"
Cohesion: 0.09
Nodes (14): Bribe, Entity, ManyToOne, Property, Client, Entity, OneToMany, callToDTO() (+6 more)

### Community 13 - "Arquitectura del Proyecto - TGS Backend"
Cohesion: 0.07
Nodes (30): 1. Modularidad, 1. Patrón MVC (Model-View-Controller) Adaptado, 2. Patrón Repository (Implementado por MikroORM), 2. Reutilización de Código, 3. Inyección de Dependencias, 3. Middleware Pattern, 4. Dependency Injection (DI), 4. Validación en Capas (+22 more)

### Community 14 - "app.ts"
Cohesion: 0.11
Nodes (21): allowedOrigins, initDev(), options, swaggerDefinition, swaggerSpec, syncSchema(), createAdminDev(), createZoneDev() (+13 more)

### Community 15 - ".success"
Cohesion: 0.12
Nodes (5): processRoleAssignment(), UserController, validateRoleCompatibility(), CleanupController, RedisController

### Community 16 - "EmailVerification"
Cohesion: 0.10
Nodes (10): EmailVerification, EmailVerificationStatus, EXPIRED, PENDING, VERIFIED, Entity, PrimaryKey, Property (+2 more)

### Community 17 - "monthlyReview.controller.ts"
Cohesion: 0.13
Nodes (12): StrategicDecision, Entity, ManyToMany, ManyToOne, Property, Partner, Entity, ManyToMany (+4 more)

### Community 18 - "clandestineAgreement.controller.ts"
Cohesion: 0.11
Nodes (16): Admin, Entity, Property, Authority, Entity, ManyToOne, OneToMany, Property (+8 more)

### Community 20 - "user.routes.ts"
Cohesion: 0.12
Nodes (16): AuthController, authController, authRouter, loginSchema, registerSchema, roleRequestRouter, userController, userRouter (+8 more)

### Community 21 - "sale.controller.ts"
Cohesion: 0.18
Nodes (13): Product, Entity, ManyToMany, OneToMany, Property, Detail, Entity, ManyToOne (+5 more)

### Community 22 - "common.types.ts"
Cohesion: 0.09
Nodes (22): ApiErrorResponse, ApiSuccessResponse, AppError, BaseDTO, BusinessRule, ChartData, CommissionCalculation, DatabaseError (+14 more)

### Community 23 - "compilerOptions"
Cohesion: 0.09
Nodes (21): dist, node_modules, src/**/*, compilerOptions, alwaysStrict, baseUrl, emitDecoratorMetadata, esModuleInterop (+13 more)

### Community 24 - ".error"
Cohesion: 0.15
Nodes (3): EmailVerificationController, NotificationController, SaleController

### Community 25 - "userVerification.routes.ts"
Cohesion: 0.13
Nodes (17): UserVerificationStatus, CANCELLED, EXPIRED, PENDING, VERIFIED, userVerificationController, userVerificationRouter, EmailParam (+9 more)

### Community 26 - ".validationError"
Cohesion: 0.14
Nodes (9): TopicController, UploadController, ZoneController, createValidationMiddleware(), validateAndTransform(), validateFileUpload(), validateRequestBody(), validateRequestParams() (+1 more)

### Community 28 - "User Verification & Bribes - TGS Backend"
Cohesion: 0.11
Nodes (17): Aprobar Verificación (👤 ADMIN), Bribes, Bribes (Sobornos), Buscar Bribes, Cambios en la tabla `bribes`, Códigos de Error Comunes, Estado de Verificación, Estructura de Datos (+9 more)

### Community 29 - ".reviewRequest"
Cohesion: 0.17
Nodes (4): RoleRequestController, validateRoleCompatibility(), UserVerificationController, sendNotificationToUser()

### Community 30 - "clandestineAgreement.routes.ts"
Cohesion: 0.15
Nodes (13): clandestineAgreementController, clandestineAgreementRouter, idParamSchema, createClandestineAgreementSchema, searchClandestineAgreementsSchema, updateClandestineAgreementSchema, idParamSchema, shelbyCouncilController (+5 more)

### Community 31 - "validateWithSchema"
Cohesion: 0.15
Nodes (13): decisionController, decisionRouter, createDecisionSchema, searchDecisionsSchema, today, updateDecisionSchema, partnerController, partnerRouter (+5 more)

### Community 32 - "Configuración de Entorno - TGS Backend"
Cohesion: 0.12
Nodes (16): 1. Modo Desarrollo (Development), 2. Modo Demo, 3. Modo Producción (Production), Archivos de Configuración, Configuración de Entorno - TGS Backend, Conversión Automática de Tipos, Cómo se Cargan las Variables, Estructura de Archivos .env (+8 more)

### Community 33 - "devDependencies"
Cohesion: 0.13
Nodes (15): @mikro-orm/cli, devDependencies, @mikro-orm/cli, ts-node, @types/cookie-parser, @types/multer, @types/swagger-jsdoc, @types/swagger-ui-express (+7 more)

### Community 34 - "User"
Cohesion: 0.14
Nodes (5): Entity, OneToOne, PrimaryKey, Property, User

### Community 35 - "emailVerification.schema.ts"
Cohesion: 0.19
Nodes (12): emailVerificationController, emailVerificationRouter, EmailParam, emailParamSchema, GetAllEmailVerificationsQuery, getAllEmailVerificationsQuerySchema, RequestEmailVerificationInput, requestEmailVerificationSchema (+4 more)

### Community 37 - "TGS Backend - The Garrison System"
Cohesion: 0.15
Nodes (13): Con Infraestructura Docker (Recomendado), Configuración del Entorno, 📚 Documentación Completa, Estructura del Repositorio, ⚡ Inicio Rápido, Modo Demo (Para Evaluación/Testing), Opción 1: Usar el script de demo (Recomendado), Opción 2: Configurar manualmente en .env (+5 more)

### Community 38 - "package.json"
Cohesion: 0.17
Nodes (11): author, description, engines, node, keywords, license, main, name (+3 more)

### Community 39 - "UserVerification"
Cohesion: 0.21
Nodes (4): Entity, PrimaryKey, Property, UserVerification

### Community 40 - "Documentación Completa - TGS Backend API"
Cohesion: 0.18
Nodes (11): 📊 Diagramas y Recursos Visuales, Documentación Completa - TGS Backend API, 📚 Guías de Documentación, Guías Esenciales, 🎯 ¿Por dónde empezar?, 📞 Recursos Adicionales, Si eres nuevo en el proyecto:, Si quieres entender la lógica de negocio: (+3 more)

### Community 41 - "authority.routes.ts"
Cohesion: 0.24
Nodes (9): authorityController, authorityRouter, dniParamSchema, authorityBribesQuerySchema, createAuthoritySchema, partialUpdateAuthoritySchema, payBribesSchema, searchAuthoritiesSchema (+1 more)

### Community 42 - "bribe.routes.ts"
Cohesion: 0.22
Nodes (9): bribeController, bribeRouter, PayBribeAmountInput, payBribeAmountSchema, payBribeInput, payBribesSchema, searchBribesSchema, UpdateBribeInput (+1 more)

### Community 43 - "MonthlyReview"
Cohesion: 0.22
Nodes (4): MonthlyReview, Entity, ManyToOne, Property

### Community 44 - "rate-limiting.middleware.ts"
Cohesion: 0.29
Nodes (8): FixedWindowConfig, fixedWindowRateLimit(), getDefaultKey(), intelligentRateLimit(), SlidingWindowConfig, slidingWindowRateLimit(), TokenBucketConfig, tokenBucketRateLimit()

### Community 46 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, clean, schema:create, start, start:demo, start:dev, start:prod (+2 more)

### Community 47 - "health.controller.ts"
Cohesion: 0.33
Nodes (5): app, initServices(), env, envSchema, parseBoolean()

### Community 48 - "notification.routes.ts"
Cohesion: 0.24
Nodes (8): NotificationStatus, READ, UNREAD, notificationController, notificationRouter, createNotificationSchema, markAsReadSchema, searchNotificationsSchema

### Community 50 - "dependencies"
Cohesion: 0.22
Nodes (9): helmet, nodemailer, dependencies, helmet, nodemailer, redis, @types/node-cron, redis (+1 more)

### Community 51 - "email.service.ts"
Cohesion: 0.22
Nodes (8): EmailConfig, emailConfigSchema, EmailTemplate, ADMIN_NOTIFICATION, PASSWORD_RESET, USER_VERIFICATION_REJECTED, VERIFICATION, WELCOME

### Community 52 - "Configuración por Categoría"
Cohesion: 0.25
Nodes (8): Aplicación (Application), Autenticación (JWT), Base de Datos (Database), Configuración por Categoría, Logging, Redis (Opcional), Seguridad (Security), Servicio de Email

### Community 53 - "admin.routes.ts"
Cohesion: 0.32
Nodes (6): adminController, adminRouter, dniParamSchema, createAdminSchema, searchAdminsSchema, updateAdminSchema

### Community 54 - "RefreshToken"
Cohesion: 0.29
Nodes (5): RefreshToken, Entity, ManyToOne, PrimaryKey, Property

### Community 55 - "RoleRequest"
Cohesion: 0.25
Nodes (5): RoleRequest, Entity, ManyToOne, PrimaryKey, Property

### Community 56 - "Notification"
Cohesion: 0.25
Nodes (5): Notification, Entity, ManyToOne, PrimaryKey, Property

### Community 58 - "roleRequest.entity.ts"
Cohesion: 0.29
Nodes (6): RequestStatus, APPROVED, PENDING, REJECTED, RoleRequestAdditionalData, RoleRequestFilters

### Community 59 - "distributor.routes.ts"
Cohesion: 0.38
Nodes (5): distributorController, distributorRouter, createDistributorSchema, searchDistributorsSchema, updateDistributorSchema

### Community 60 - "ReviewStatus"
Cohesion: 0.29
Nodes (7): ReviewStatus, APPROVED, COMPLETED, IN_REVIEW, PENDING, REJECTED, MonthlyReviewFilters

### Community 61 - "topic.routes.ts"
Cohesion: 0.38
Nodes (5): topicController, topicRouter, createTopicSchema, searchTopicsSchema, updateTopicSchema

### Community 62 - "zone.routes.ts"
Cohesion: 0.38
Nodes (5): zoneController, zoneRouter, createZoneSchema, searchZonesSchema, updateZoneSchema

### Community 63 - "validation.middleware.ts"
Cohesion: 0.43
Nodes (4): autoSanitize(), sanitizeObject(), sanitizeValue(), validateRequestComplexity()

### Community 64 - "Mejores Prácticas"
Cohesion: 0.33
Nodes (6): 1. Nunca Subir .env al Repositorio, 2. Usar .env.example como Plantilla, 3. Diferentes Configuraciones por Entorno, 4. Generar Secretos Seguros, 5. Documentar Variables Personalizadas, Mejores Prácticas

### Community 65 - "NotificationType"
Cohesion: 0.33
Nodes (6): NotificationType, ROLE_REQUEST_APPROVED, ROLE_REQUEST_REJECTED, SYSTEM, USER_VERIFICATION_APPROVED, USER_VERIFICATION_REJECTED

### Community 67 - "EntityFilters"
Cohesion: 0.33
Nodes (6): AuthorityFilters, EntityFilters, PartnerFilters, ProductFilters, SalesFilters, ZoneFilters

### Community 68 - "Troubleshooting"
Cohesion: 0.40
Nodes (5): Cambios en .env no se reflejan, ¿Cómo sé qué variables están cargadas?, Error: "Cannot find module '.env.development'", Error: "JWT_SECRET must be at least 32 characters", Troubleshooting

### Community 69 - "seed-test-data.mjs"
Cohesion: 0.40
Nodes (3): DB_CONFIG, __dirname, __filename

### Community 70 - "AgreementStatus"
Cohesion: 0.50
Nodes (4): AgreementStatus, ACTIVE, CANCELLED, COMPLETED

### Community 71 - ".searchNotifications"
Cohesion: 0.67
Nodes (3): isEnumValue(), toPositiveInt(), toSingleString()

### Community 72 - "uploadthing.config.ts"
Cohesion: 0.50
Nodes (3): f, uploadRouter, UploadThingRouter

## Knowledge Gaps
- **468 isolated node(s):** `name`, `type`, `version`, `description`, `main` (+463 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `routeParam()` connect `.notFound` to `user.entity.ts`, `roleRequest.controller.ts`, `.success`, `monthlyReview.controller.ts`, `clandestineAgreement.controller.ts`, `.internalError`, `sale.controller.ts`, `.error`, `.validationError`, `.reviewRequest`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `User` connect `User` to `user.entity.ts`, `roleRequest.controller.ts`, `EmailVerification`, `monthlyReview.controller.ts`, `sale.controller.ts`, `RefreshToken`, `RoleRequest`, `Notification`, `roleRequest.entity.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `logger` connect `user.entity.ts` to `error.middleware.ts`, `Role`, `roleRequest.controller.ts`, `rate-limiting.middleware.ts`, `app.ts`, `health.controller.ts`, `EmailVerification`, `monthlyReview.controller.ts`, `clandestineAgreement.controller.ts`, `email.service.ts`, `sale.controller.ts`, `redis.middleware.ts`, `validation.middleware.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _468 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `common.schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.048051948051948054 - nodes in this community are weakly interconnected._
- **Should `.notFound` be split into smaller, more focused modules?**
  _Cohesion score 0.10549645390070922 - nodes in this community are weakly interconnected._
- **Should `Base de Datos - TGS Backend` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._