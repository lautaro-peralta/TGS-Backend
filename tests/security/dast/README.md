# OWASP ZAP - Dynamic Application Security Testing (DAST)

Pruebas de seguridad dinámica para el backend de TGS usando OWASP ZAP.

---

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Prerequisitos](#prerequisitos)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Tipos de Escaneos](#tipos-de-escaneos)
- [Interpretación de Resultados](#interpretación-de-resultados)
- [Troubleshooting](#troubleshooting)

---

## Descripción General

OWASP ZAP (Zed Attack Proxy) es una herramienta de seguridad de código abierto que encuentra vulnerabilidades en aplicaciones web mediante:

1. **Passive Scanning**: Analiza tráfico sin modificarlo
2. **Active Scanning**: Envía payloads maliciosos para detectar vulnerabilidades
3. **Spider**: Explora la aplicación para descubrir endpoints

**Vulnerabilidades detectadas**:
- SQL Injection
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Path Traversal
- Remote File Inclusion
- Server-Side Request Forgery (SSRF)
- Security Headers Missing
- Authentication/Authorization Issues

---

## Prerequisitos

### 1. Docker

ZAP se ejecuta mediante Docker:

```bash
# Verificar instalación de Docker
docker --version

# Si no está instalado, descargar de:
# https://www.docker.com/products/docker-desktop
```

### 2. Backend Corriendo

El backend debe estar ejecutándose:

```bash
# Iniciar backend en modo desarrollo
pnpm run start:dev

# Verificar que responda
curl http://localhost:3000/api/health
```

### 3. Datos de Prueba

Asegurarse de tener usuarios de prueba en la base de datos:

```sql
-- Usuarios necesarios para ZAP (ver seeds/test-users.sql)
- admin@test.com (ADMIN)
- seller@test.com (VENDEDOR)
- viewer@test.com (VISUALIZADOR)
```

---

## Configuración

### Archivos de Configuración

**`zap-config.yaml`**: Configuración principal de ZAP
- Contextos y URLs a escanear
- Autenticación y sesiones
- Reglas de escaneo activo/pasivo
- Umbrales de riesgo

**`run-zap-scan.sh`**: Script para escaneo básico (5-10 minutos)

**`run-zap-full-scan.sh`**: Script para escaneo completo (30-60 minutos)

**`zap-hooks.py`**: Hooks personalizados para eventos de ZAP

### Variables de Entorno

```bash
# URL del backend (default: http://host.docker.internal:3000)
export API_BASE_URL=http://localhost:3000

# Directorio de reportes (default: tests/security/reports)
export REPORT_DIR=tests/security/reports
```

---

## Ejecución

### Escaneo Básico (Baseline Scan)

**Duración**: 5-10 minutos
**Agresividad**: Baja (solo passive scan)
**Uso recomendado**: CI/CD, desarrollo diario

```bash
# Linux/Mac
bash tests/security/dast/run-zap-scan.sh

# Windows (Git Bash)
bash tests/security/dast/run-zap-scan.sh

# Usando pnpm (agregado más adelante)
pnpm run test:security:dast
```

**Qué hace**:
1. Verifica que el backend esté corriendo
2. Ejecuta passive scan
3. Ejecuta spider básico
4. Genera reportes HTML, JSON y Markdown

---

### Escaneo Completo (Full Scan)

**Duración**: 30-60 minutos
**Agresividad**: Alta (active scan completo)
**Uso recomendado**: Pre-producción, auditorías de seguridad

```bash
# Linux/Mac
bash tests/security/dast/run-zap-full-scan.sh

# Windows (Git Bash)
bash tests/security/dast/run-zap-full-scan.sh

# Usando pnpm (agregado más adelante)
pnpm run test:security:dast:full
```

**Qué hace**:
1. Verifica que el backend esté corriendo
2. Ejecuta spider profundo (descubre todos los endpoints)
3. Ejecuta passive scan
4. Ejecuta active scan con payloads maliciosos
5. Genera reportes completos

**⚠ Advertencia**: Este escaneo puede generar muchas peticiones y puede afectar el rendimiento del backend.

---

## Tipos de Escaneos

### 1. Passive Scan

**Descripción**: Analiza respuestas HTTP sin enviar payloads maliciosos

**Detecta**:
- Missing security headers (CSP, HSTS, X-Frame-Options)
- Cookies sin flags seguros (HttpOnly, Secure)
- Information disclosure (stack traces, version numbers)
- Timestamp disclosure

**Ventajas**:
- No invasivo
- Rápido (< 5 minutos)
- Seguro para producción

---

### 2. Active Scan

**Descripción**: Envía payloads maliciosos para intentar explotar vulnerabilidades

**Detecta**:
- SQL Injection
- XSS (Reflected, Stored, DOM-based)
- Path Traversal
- Remote Code Execution
- SSRF
- XXE (XML External Entity)
- NoSQL Injection

**Desventajas**:
- Puede afectar rendimiento
- Genera muchos logs de errores
- NO ejecutar en producción

---

### 3. Spider

**Descripción**: Explora la aplicación para descubrir endpoints

**Configuración actual**:
- Profundidad máxima: 5
- Duración máxima: 5 minutos
- Hijos máximos por nodo: 10
- Delay entre requests: 200ms

---

## Interpretación de Resultados

### Niveles de Riesgo

| Nivel | Color | Acción Requerida | Umbral CI/CD |
|-------|-------|------------------|--------------|
| **High** | 🔴 Rojo | Fix inmediato | ❌ Fail (0 permitidos) |
| **Medium** | 🟡 Amarillo | Fix en < 7 días | ⚠️ Warn (max 5) |
| **Low** | 🟢 Verde | Fix opcional | ✅ Pass (max 10) |
| **Info** | ⚪ Gris | Informativo | ✅ Pass (ilimitado) |

---

### Estructura de Reportes

```
tests/security/reports/
├── zap-baseline-report.html      # Reporte visual (baseline)
├── zap-baseline-report.json      # Datos estructurados (baseline)
├── zap-baseline-report.md        # Markdown (baseline)
├── zap-full-report.html          # Reporte visual (full)
├── zap-full-report.json          # Datos estructurados (full)
├── zap-full-report.md            # Markdown (full)
└── zap-full-report.xml           # XML (full)
```

---

### Ejemplo de Vulnerabilidad en Reporte

```json
{
  "name": "SQL Injection",
  "riskcode": "3",  // High
  "confidence": "2", // Medium
  "riskdesc": "High (Medium)",
  "desc": "SQL injection may be possible",
  "solution": "Use parameterized queries",
  "reference": "https://owasp.org/www-community/attacks/SQL_Injection",
  "cweid": "89",
  "wascid": "19",
  "url": "http://localhost:3000/api/sales?id=1",
  "method": "GET",
  "param": "id",
  "attack": "1' OR '1'='1",
  "evidence": "You have an error in your SQL syntax"
}
```

---

## Umbrales de Seguridad

### Para CI/CD

Configurados en `zap-config.yaml`:

```yaml
thresholds:
  high: 0      # ❌ Build falla si hay vulnerabilidades High
  medium: 5    # ⚠️ Permite hasta 5 Medium
  low: 10      # ✅ Permite hasta 10 Low
  info: 999    # ✅ Informativo ilimitado
```

### Códigos de Salida

| Código | Significado | Estado CI/CD |
|--------|-------------|--------------|
| `0` | Ninguna vulnerabilidad | ✅ Pass |
| `1` | Solo Low/Info | ⚠️ Warning |
| `2` | High/Medium encontradas | ❌ Fail |
| `>2` | Error de ejecución | ❌ Fail |

---

## Troubleshooting

### Error: "Connection refused"

**Causa**: Backend no está corriendo

**Solución**:
```bash
# Verificar si el backend está corriendo
curl http://localhost:3000/api/health

# Si no responde, iniciar el backend
pnpm run start:dev
```

---

### Error: "Cannot connect to Docker daemon"

**Causa**: Docker no está corriendo

**Solución**:
```bash
# Verificar Docker
docker ps

# Iniciar Docker Desktop (Windows/Mac)
# O iniciar el servicio (Linux)
sudo systemctl start docker
```

---

### Error: "Authentication failed"

**Causa**: Credenciales de prueba no existen en la base de datos

**Solución**:
```bash
# Verificar que existan usuarios de prueba
psql -U postgres -d tgs_backend -c "SELECT email FROM users WHERE email LIKE '%test.com';"

# Si no existen, ejecutar seeds
pnpm run db:seed:test
```

---

### Falsos Positivos

**Problema**: ZAP reporta vulnerabilidades que no son reales

**Soluciones**:

1. **Ajustar umbrales** en `zap-config.yaml`:
```yaml
alertFilters:
  - ruleId: 10096  # Timestamp Disclosure
    newRisk: "Info"  # Bajar de Low a Info
```

2. **Excluir endpoints** específicos:
```yaml
excludePaths:
  - "http://localhost:3000/api/health"
  - "http://localhost:3000/api/docs.*"
```

3. **Revisar manualmente** el reporte HTML para confirmar

---

### Escaneo Muy Lento

**Problema**: El escaneo tarda demasiado tiempo

**Soluciones**:

1. **Reducir profundidad** del spider:
```yaml
spider:
  maxDepth: 3  # Reducir de 5 a 3
  maxDuration: 3  # Reducir de 5 a 3 minutos
```

2. **Limitar threads**:
```yaml
activeScan:
  threadPerHost: 1  # Reducir de 2 a 1
```

3. **Reducir tiempo máximo**:
```yaml
activeScan:
  maxScanDurationInMins: 15  # Reducir de 30 a 15
```

---

## Recursos

**OWASP ZAP Docs**:
- https://www.zaproxy.org/docs/

**Docker Images**:
- https://www.zaproxy.org/docs/docker/

**Baseline Scan**:
- https://www.zaproxy.org/docs/docker/baseline-scan/

**Full Scan**:
- https://www.zaproxy.org/docs/docker/full-scan/

**Automation Framework**:
- https://www.zaproxy.org/docs/desktop/addons/automation-framework/

---

## Checklist Pre-Escaneo

- [ ] Docker está corriendo
- [ ] Backend está corriendo en `http://localhost:3000`
- [ ] Usuarios de prueba existen en la base de datos
- [ ] Directorio de reportes existe (`tests/security/reports/`)
- [ ] No hay otros escaneos de ZAP corriendo
- [ ] Base de datos de prueba tiene datos realistas

---

**Última actualización**: 5 de Noviembre, 2025
**Mantenido por**: Equipo de Backend TGS

---

🤖 **Generated with [Claude Code](https://claude.com/claude-code)**

Co-Authored-By: Claude <noreply@anthropic.com>
