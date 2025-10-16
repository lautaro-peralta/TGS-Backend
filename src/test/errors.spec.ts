import request from 'supertest';
import { createApp } from '../app.js';

describe('Infra / errores', () => {
  const app = createApp();

  it('404 handler', async () => {
    const res = await request(app).get('/api/__nope__');
    expect(res.status).toBe(404);
  });

  it('error handler (500)', async () => {
    const res = await request(app).get('/api/force-error'); // creá un endpoint que lance error
    expect([500, 501]).toContain(res.status);
  });
});
