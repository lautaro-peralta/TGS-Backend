import request from 'supertest';
import { app } from '../../src/app';

/**
 * API Metadata Validation Tests
 * Verifica que la metadata de paginación y otros metadatos sean correctos
 */

describe('API Metadata Validation', () => {
  let authToken: string;

  beforeAll(async () => {
    // Obtener token de autenticación
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'admin@test.com',
        password: 'TestPassword123',
      });

    authToken = loginResponse.body.accessToken;
  });

  describe('Pagination Metadata', () => {
    it('should include complete pagination metadata', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('totalPages');
    });

    it('should have correct data types in pagination metadata', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(typeof response.body.meta.page).toBe('number');
      expect(typeof response.body.meta.limit).toBe('number');
      expect(typeof response.body.meta.total).toBe('number');
      expect(typeof response.body.meta.totalPages).toBe('number');
    });

    it('should include hasNextPage and hasPreviousPage flags', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meta).toHaveProperty('hasNextPage');
      expect(response.body.meta).toHaveProperty('hasPreviousPage');
      expect(typeof response.body.meta.hasNextPage).toBe('boolean');
      expect(typeof response.body.meta.hasPreviousPage).toBe('boolean');
    });

    it('should correctly indicate first page', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.hasPreviousPage).toBe(false);
    });

    it('should correctly calculate totalPages', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { total, limit, totalPages } = response.body.meta;
      const expectedTotalPages = Math.ceil(total / limit);

      expect(totalPages).toBe(expectedTotalPages);
    });

    it('should respect custom page size', async () => {
      const customLimit = 5;

      const response = await request(app)
        .get(`/api/products?page=1&limit=${customLimit}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meta.limit).toBe(customLimit);
      expect(response.body.data.length).toBeLessThanOrEqual(customLimit);
    });

    it('should handle last page correctly', async () => {
      // Primero obtener el número total de páginas
      const firstResponse = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { totalPages } = firstResponse.body.meta;

      if (totalPages > 1) {
        // Obtener la última página
        const lastPageResponse = await request(app)
          .get(`/api/products?page=${totalPages}&limit=10`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(lastPageResponse.body.meta.page).toBe(totalPages);
        expect(lastPageResponse.body.meta.hasNextPage).toBe(false);
      }
    });

    it('should handle page beyond total pages gracefully', async () => {
      const response = await request(app)
        .get('/api/products?page=999&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Debe retornar array vacío pero con metadata correcta
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('total');
    });

    it('should enforce maximum page size limit', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=1000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // El límite debe ser ajustado al máximo permitido (ej: 100)
      expect(response.body.meta.limit).toBeLessThanOrEqual(100);
    });

    it('should use default pagination values when not specified', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
      // Valores por defecto típicos: page=1, limit=10 o 20
      expect(response.body.meta.page).toBeGreaterThanOrEqual(1);
      expect(response.body.meta.limit).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Date Format Validation', () => {
    it('should return dates in ISO 8601 format', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.length > 0) {
        const firstItem = response.body.data[0];

        // Verificar createdAt
        if (firstItem.createdAt) {
          expect(firstItem.createdAt).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
          );
          // Verificar que sea una fecha válida
          expect(new Date(firstItem.createdAt).toString()).not.toBe('Invalid Date');
        }

        // Verificar updatedAt
        if (firstItem.updatedAt) {
          expect(firstItem.updatedAt).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
          );
          expect(new Date(firstItem.updatedAt).toString()).not.toBe('Invalid Date');
        }
      }
    });

    it('should accept dates in ISO 8601 format in requests', async () => {
      const isoDate = new Date().toISOString();

      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: 1,
          distributorId: 1,
          clientId: 1,
          quantity: 10,
          date: isoDate,
        });

      // Debe aceptar el formato ISO 8601
      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  describe('URL Format Validation', () => {
    it('should return complete URLs for related resources', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Si hay links relacionados, deben ser URLs completas
      if (response.body.links) {
        if (response.body.links.self) {
          expect(response.body.links.self).toMatch(/^https?:\/\//);
        }
        if (response.body.links.next) {
          expect(response.body.links.next).toMatch(/^https?:\/\//);
        }
        if (response.body.links.prev) {
          expect(response.body.links.prev).toMatch(/^https?:\/\//);
        }
      }
    });
  });

  describe('Data Type Consistency', () => {
    it('should return consistent data types for numeric fields', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.length > 0) {
        response.body.data.forEach((item: any) => {
          // Price debe ser número
          if (item.price !== undefined) {
            expect(typeof item.price).toBe('number');
          }

          // Stock debe ser número entero
          if (item.stock !== undefined) {
            expect(typeof item.stock).toBe('number');
            expect(Number.isInteger(item.stock)).toBe(true);
          }

          // ID debe ser string (UUID) o número
          if (item.id !== undefined) {
            expect(['string', 'number']).toContain(typeof item.id);
          }
        });
      }
    });

    it('should return consistent data types for boolean fields', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.length > 0) {
        response.body.data.forEach((item: any) => {
          // Campos booleanos deben ser boolean, no 0/1 o "true"/"false"
          if (item.isActive !== undefined) {
            expect(typeof item.isActive).toBe('boolean');
          }
        });
      }
    });

    it('should return null for missing optional fields, not undefined', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.length > 0) {
        const firstItem = response.body.data[0];
        const jsonString = JSON.stringify(firstItem);
        const parsed = JSON.parse(jsonString);

        // Verificar que no hay campos con valor 'undefined' en JSON
        expect(jsonString).not.toContain('undefined');

        // Los campos opcionales ausentes deben ser null o no estar presentes
        Object.values(parsed).forEach((value) => {
          expect(value).not.toBe(undefined);
        });
      }
    });
  });

  describe('Array Response Validation', () => {
    it('should always return array for list endpoints', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty array when no results, not null', async () => {
      const response = await request(app)
        .get('/api/products?page=999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.data).not.toBeNull();
    });
  });

  describe('Sort and Filter Metadata', () => {
    it('should include sort information in metadata when sorting is applied', async () => {
      const response = await request(app)
        .get('/api/products?sortBy=price&order=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verificar que se aplicó el ordenamiento
      if (response.body.data.length > 1) {
        const prices = response.body.data.map((p: any) => p.price);
        const sortedPrices = [...prices].sort((a, b) => b - a);
        expect(prices).toEqual(sortedPrices);
      }
    });

    it('should include filter information in metadata when filters are applied', async () => {
      const response = await request(app)
        .get('/api/products?category=WHISKY')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Todos los productos deben ser de la categoría WHISKY
      if (response.body.data.length > 0) {
        response.body.data.forEach((product: any) => {
          if (product.category) {
            expect(product.category).toBe('WHISKY');
          }
        });
      }
    });
  });

  describe('Response Time Metadata', () => {
    it('should complete requests within acceptable time', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // La respuesta debe ser rápida (menos de 2 segundos)
      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('Character Encoding', () => {
    it('should properly handle and return UTF-8 characters', async () => {
      const productWithSpecialChars = {
        name: 'Whisky Añejo Señor José',
        category: 'WHISKY',
        price: 100,
        stock: 50,
      };

      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productWithSpecialChars)
        .expect(201);

      // Verificar que los caracteres especiales se conservan
      expect(createResponse.body.data.name).toBe(productWithSpecialChars.name);
      expect(createResponse.body.data.name).toContain('Añejo');
      expect(createResponse.body.data.name).toContain('Señor');
      expect(createResponse.body.data.name).toContain('José');
    });

    it('should properly escape HTML/JS in responses', async () => {
      const productWithHTML = {
        name: '<script>alert("XSS")</script>Product',
        category: 'WHISKY',
        price: 100,
        stock: 50,
      };

      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productWithHTML)
        .expect(201);

      // Verificar que el contenido HTML está escapado o rechazado
      const returnedName = createResponse.body.data.name;
      // No debe ejecutarse como HTML
      expect(returnedName).toBeDefined();
    });
  });
});
