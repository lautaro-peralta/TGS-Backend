import request from 'supertest';
import { createApp } from '../app.js';

describe('Sales', () => {
  const app = createApp();

  it('POST /api/sales ⇒ 201 con payload válido', async () => {
    const res = await request(app)
      .post('/api/sales')
      .send({ productId: 'p1', qty: 2, customerId: 'c1' });

    expect([201, 200]).toContain(res.status);
    expect(res.body).toBeTruthy();
  });

  it('POST /api/sales ⇒ 400 si payload inválido', async () => {
    const res = await request(app)
      .post('/api/sales')
      .send({/* vacío */});
    expect([400, 422]).toContain(res.status);
  });
});
