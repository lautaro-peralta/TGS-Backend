# 🚀 Performance Testing - TGS Backend

Tests de rendimiento y carga usando Artillery para el backend de The Garrison System.

---

## 📋 Tabla de Contenidos

- [Tipos de Tests](#tipos-de-tests)
- [Instalación](#instalación)
- [Ejecución](#ejecución)
- [Escenarios](#escenarios)
- [Umbrales de Rendimiento](#umbrales-de-rendimiento)
- [Reportes](#reportes)
- [CI/CD](#cicd)

---

## 🎯 Tipos de Tests

### 1. **Load Testing** (Prueba de Carga)
**Archivo**: `artillery/scenarios/load-test.yml`

**Objetivo**: Verificar que el sistema maneja carga normal sin degradación

**Configuración**:
- Warm-up: 5-10 usuarios (30s)
- Carga sostenida: 50 usuarios concurrentes (2 minutos)
- Cool-down: 50 → 5 usuarios (30s)

**Métricas clave**:
- Response time p95 < 500ms
- Response time p99 < 1000ms
- Error rate < 1%
- Throughput > 100 req/s

---

### 2. **Stress Testing** (Prueba de Estrés)
**Archivo**: `artillery/scenarios/stress-test.yml`

**Objetivo**: Encontrar el punto de quiebre del sistema

**Configuración**:
- Incremento gradual: 10 → 200 usuarios (5 minutos)
- Carga máxima: 200 usuarios (2 minutos)
- Descenso: 200 → 10 usuarios (2 minutos)

**Métricas clave**:
- Response time p95 < 1000ms
- Response time p99 < 2000ms
- Error rate < 5% (aceptable bajo estrés)
- Identificar punto de saturación

---

### 3. **Spike Testing** (Prueba de Picos)
**Archivo**: `artillery/scenarios/spike-test.yml`

**Objetivo**: Verificar recuperación ante picos súbitos de tráfico

**Configuración**:
- Baseline: 10 usuarios (1 minuto)
- Spike súbito: 0 → 100 usuarios (30 segundos)
- Recuperación: 100 → 10 usuarios (1 minuto)
- Segundo spike: 0 → 150 usuarios (30 segundos)
- Normalización: 150 → 10 usuarios (1 minuto)

**Métricas clave**:
- Response time p95 < 800ms
- Response time p99 < 1500ms
- Error rate < 3%
- Tiempo de recuperación < 30s

---

### 4. **Soak Testing** (Prueba de Resistencia)
**Archivo**: `artillery/scenarios/soak-test.yml`

**Objetivo**: Detectar memory leaks y degradación a largo plazo

**Configuración**:
- Warm-up: 10 → 30 usuarios (2 minutos)
- Carga sostenida: 30 usuarios (10 minutos)
- Cool-down: 30 → 5 usuarios (1 minuto)

**Métricas clave**:
- Response time p95 < 600ms (sin degradación en el tiempo)
- Response time p99 < 1200ms
- Error rate < 1%
- Uso de memoria estable (no creciente)

---

## 📦 Instalación

Artillery ya está instalado como devDependency:

\`\`\`bash
# Verificar instalación
pnpm list artillery

# Si no está instalado
pnpm add -D artillery
\`\`\`

---

## ▶️ Ejecución

### Ejecución Local

**Prerrequisitos**:
1. Backend debe estar corriendo en `http://localhost:3000`
2. Base de datos PostgreSQL disponible
3. Variables de entorno configuradas

**Comandos**:

\`\`\`bash
# Load Test
pnpm run test:performance:load

# Stress Test
pnpm run test:performance:stress

# Spike Test
pnpm run test:performance:spike

# Soak Test
pnpm run test:performance:soak

# Ejecutar todos los tests
pnpm run test:performance
\`\`\`

---

### Ejecución contra ambiente específico

\`\`\`bash
# Staging
API_BASE_URL=https://staging.api.thegarrison.com pnpm run test:performance:load

# Producción (solo con autorización)
API_BASE_URL=https://api.thegarrison.com pnpm run test:performance:load
\`\`\`

---

## 📊 Escenarios

### Escenarios de Load Test

#### 1. **Authentication Flow** (30% del tráfico)
- POST `/api/auth/login`
- GET `/api/auth/me`

#### 2. **Get Sales** (40% del tráfico)
- GET `/api/sales?page=1&limit=10`
- GET `/api/sales/search?startDate=...&endDate=...`

#### 3. **Get Products** (20% del tráfico)
- GET `/api/products`
- GET `/api/products/:id`

#### 4. **Get Zones** (10% del tráfico)
- GET `/api/zones`

---

### Escenarios de Stress Test

#### 1. **Create Sales Under Stress** (60% del tráfico)
- POST `/api/sales` (operación pesada)

#### 2. **Heavy Read Operations** (40% del tráfico)
- GET `/api/sales?page=...&limit=50`
- GET `/api/products?page=...&limit=20`
- GET `/api/bribes?paid=false`

---

### Escenarios de Spike Test

#### 1. **Concurrent Sale Creation** (70% del tráfico)
- POST `/api/sales` (simultáneo)

#### 2. **Concurrent Queries** (30% del tráfico)
- GET `/api/sales` (paralelo)
- GET `/api/products` (paralelo)
- GET `/api/zones` (paralelo)

---

### Escenarios de Soak Test

#### 1. **Realistic User Behavior** (100% del tráfico)
- Navegación simulada:
  1. GET `/api/sales` (+ 2s think time)
  2. GET `/api/products` (+ 3s think time)
  3. GET `/api/zones` (+ 2s think time)
  4. POST `/api/sales` (+ 5s think time)
  5. Repetir 3 veces

---

## 🎯 Umbrales de Rendimiento

### Umbrales Generales

| Métrica | Load Test | Stress Test | Spike Test | Soak Test |
|---------|-----------|-------------|------------|-----------|
| **p95** | < 500ms | < 1000ms | < 800ms | < 600ms |
| **p99** | < 1000ms | < 2000ms | < 1500ms | < 1200ms |
| **Error Rate** | < 1% | < 5% | < 3% | < 1% |
| **Throughput** | > 100 req/s | > 80 req/s | > 90 req/s | > 100 req/s |

### Umbrales por Endpoint

| Endpoint | Método | p95 | p99 | Notes |
|----------|--------|-----|-----|-------|
| `/api/auth/login` | POST | 200ms | 400ms | Operación crítica |
| `/api/sales` | GET | 300ms | 600ms | Con paginación |
| `/api/sales` | POST | 500ms | 1000ms | Operación pesada (DB writes) |
| `/api/products` | GET | 200ms | 400ms | Lectura simple |
| `/api/zones` | GET | 250ms | 500ms | Con relaciones |

---

## 📈 Reportes

### Generar Reportes HTML

\`\`\`bash
# Load test con reporte HTML
artillery run tests/performance/artillery/scenarios/load-test.yml \\
  --output tests/performance/reports/load-test-results.json

artillery report tests/performance/reports/load-test-results.json \\
  --output tests/performance/reports/load-test-report.html
\`\`\`

### Estructura de Reportes

\`\`\`
tests/performance/reports/
├── load-test-results.json          # Datos raw
├── load-test-report.html           # Reporte visual
├── stress-test-results.json
├── stress-test-report.html
├── spike-test-results.json
├── spike-test-report.html
├── soak-test-results.json
└── soak-test-report.html
\`\`\`

### Métricas en Reportes

**Response Time**:
- Min, Max, Median
- p50, p75, p95, p99

**Throughput**:
- Total requests
- Requests/second
- Requests completed
- Requests failed

**Errors**:
- Error count por código de estado
- Error rate (%)
- Errores por endpoint

**Latency Distribution**:
- Histograma de latencias
- Percentiles

---

## 🔄 CI/CD

### GitHub Actions

Los tests de performance se ejecutan en GitHub Actions:

**Workflow**: `.github/workflows/ci-cd.yml`

**Job**: `performance-test`

**Triggers**:
- Pull Request a `main` (opcional)
- Push a `main` (después de merge)
- Manual dispatch

**Configuración**:

\`\`\`yaml
performance-test:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request' || github.ref == 'refs/heads/main'

  services:
    postgres:
      image: postgres:16
      # ...

  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v4

    - name: Install dependencies
      run: pnpm install

    - name: Build application
      run: pnpm run build

    - name: Start application
      run: pnpm run start:prod &
      env:
        NODE_ENV: production
        PORT: 3000

    - name: Wait for app
      run: sleep 10

    - name: Run load test
      run: pnpm run test:performance:load
      continue-on-error: true

    - name: Upload performance report
      uses: actions/upload-artifact@v4
      with:
        name: performance-report
        path: tests/performance/reports/
\`\`\`

---

## 🛠️ Troubleshooting

### Problema 1: "Connection refused"

**Causa**: Backend no está corriendo

**Solución**:
\`\`\`bash
# Verificar que el backend esté corriendo
curl http://localhost:3000/api/health

# Iniciar el backend
pnpm run start:dev
\`\`\`

---

### Problema 2: "Timeout exceeded"

**Causa**: Backend responde muy lento

**Solución**:
- Verificar que la base de datos esté disponible
- Revisar logs del backend para errores
- Ajustar timeout en `artillery/config.yml`:
  \`\`\`yaml
  config:
    http:
      timeout: 60  # Aumentar a 60 segundos
  \`\`\`

---

### Problema 3: "Error rate > threshold"

**Causa**: Backend tiene errores o no puede manejar la carga

**Solución**:
- Revisar logs de errores en el backend
- Verificar que las credenciales de test sean válidas
- Reducir carga inicial:
  \`\`\`yaml
  phases:
    - duration: 60
      arrivalRate: 10  # Reducir de 50 a 10
  \`\`\`

---

### Problema 4: "High memory usage"

**Causa**: Memory leak en el backend

**Solución**:
- Ejecutar Soak Test para identificar memory leaks
- Usar herramientas de profiling (Node.js inspector)
- Verificar que las conexiones de DB se cierren correctamente

---

## 📚 Recursos

**Artillery Documentation**:
- https://www.artillery.io/docs

**Best Practices**:
- https://www.artillery.io/docs/guides/guides/test-script-reference

**Plugins**:
- artillery-plugin-expect: https://github.com/artilleryio/artillery-plugin-expect
- artillery-plugin-metrics-by-endpoint: https://github.com/artilleryio/artillery-plugin-metrics-by-endpoint

---

## ✅ Checklist

Antes de ejecutar tests de performance:

- [ ] Backend está corriendo
- [ ] Base de datos está disponible
- [ ] Variables de entorno configuradas
- [ ] Datos de test poblados en la base de datos
- [ ] Artillery instalado (`pnpm list artillery`)
- [ ] Directorio de reportes existe (`tests/performance/reports/`)

---

**Última actualización**: 5 de Noviembre, 2025
**Mantenido por**: Equipo de Backend TGS

---

🤖 **Generated with [Claude Code](https://claude.com/claude-code)**

Co-Authored-By: Claude <noreply@anthropic.com>
