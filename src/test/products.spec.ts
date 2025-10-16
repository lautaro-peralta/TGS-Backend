import request from 'supertest';
import { createApp } from '../app.js';


describe('Products', () => {
  const app = createApp();

  it('GET /api/products ⇒ lista', async () => {
   

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.data ?? res.body)).toBe(true);
  });

  it('GET /api/products/:id ⇒ 404 si no existe', async () => {
    const res = await request(app).get('/api/products/nada');
    expect([404, 400]).toContain(res.status);
  });

  it('POST /api/products ⇒ 201 crea (si tu API lo permite)', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Abrigo Shelby', price: 100 });
    expect([201, 200]).toContain(res.status);
    expect(res.body?.id ?? res.body?.data?.id).toBeDefined();
  });
});
