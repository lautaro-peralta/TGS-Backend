import request from 'supertest';
import { app } from '../../src/app';

/**
 * API Response Format Validation Tests
 * Verifica que todas las respuestas de la API sigan el formato estándar
 */

describe('API Response Format Validation', () => {
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

  describe('Success Response Format', () => {
    it('should return consistent format for GET requests', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verificar estructura de respuesta exitosa
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('success', true);

      // Verificar que data sea array o objeto
      expect(
        Array.isArray(response.body.data) || typeof response.body.data === 'object'
      ).toBe(true);
    });

    it('should return consistent format for POST requests', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Product',
          category: 'WHISKY',
          price: 100,
          stock: 50,
        })
        .expect(201);

      // Verificar estructura de respuesta exitosa
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('success', true);
      expect(typeof response.body.data).toBe('object');
      expect(response.body.data).not.toBeNull();
    });

    it('should return consistent format for PATCH requests', async () => {
      // Primero obtener un producto existente
      const getResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const productId = getResponse.body.data[0]?.id;
      if (!productId) {
        throw new Error('No products found for testing');
      }

      const response = await request(app)
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          price: 150,
        })
        .expect(200);

      // Verificar estructura de respuesta exitosa
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('success', true);
      expect(typeof response.body.data).toBe('object');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent format for 400 Bad Request', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          name: '',
        })
        .expect(400);

      // Verificar estructura de respuesta de error
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('statusCode', 400);
      expect(typeof response.body.error.message).toBe('string');
    });

    it('should return consistent format for 401 Unauthorized', async () => {
      const response = await request(app)
        .get('/api/products')
        // No enviar token de autenticación
        .expect(401);

      // Verificar estructura de respuesta de error
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('statusCode', 401);
    });

    it('should return consistent format for 404 Not Found', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';

      const response = await request(app)
        .get(`/api/products/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verificar estructura de respuesta de error
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });

    it('should return consistent format for 403 Forbidden', async () => {
      // Login como usuario sin permisos
      const viewerLogin = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'viewer@test.com',
          password: 'TestPassword123',
        });

      const viewerToken = viewerLogin.body.accessToken;

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Forbidden Product',
          category: 'WHISKY',
          price: 100,
          stock: 50,
        })
        .expect(403);

      // Verificar estructura de respuesta de error
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('statusCode', 403);
    });
  });

  describe('Content-Type Headers', () => {
    it('should return application/json content-type', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should accept application/json content-type', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({
          name: 'JSON Product',
          category: 'WHISKY',
          price: 100,
          stock: 50,
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Response Status Codes', () => {
    it('should return 200 for successful GET requests', async () => {
      await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 201 for successful POST requests', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Status Code Product',
          category: 'WHISKY',
          price: 100,
          stock: 50,
        })
        .expect(201);
    });

    it('should return 200 for successful PATCH requests', async () => {
      const getResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const productId = getResponse.body.data[0]?.id;
      if (!productId) {
        throw new Error('No products found for testing');
      }

      await request(app)
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          price: 200,
        })
        .expect(200);
    });

    it('should return 204 for successful DELETE requests', async () => {
      // Crear producto para eliminar
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Product to Delete',
          category: 'WHISKY',
          price: 100,
          stock: 50,
        })
        .expect(201);

      const productId = createResponse.body.data.id;

      await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });
});
