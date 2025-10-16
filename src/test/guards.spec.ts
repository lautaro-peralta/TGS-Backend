import request from 'supertest';
import { createApp } from '../app.js';

describe('Guards/roles', () => {
  const app = createApp();

  function fakeCookie(role = 'ADMIN') {
    
    return `auth=fake-token-with-${role}`;
  }

  it('ruta protegida ⇒ 401 sin sesión', async () => {
    const res = await request(app).get('/api/admin/only');
    expect([401, 403]).toContain(res.status);
  });

  it('ruta protegida ⇒ 403 con sesión sin rol', async () => {
    const res = await request(app).get('/api/admin/only').set('Cookie', fakeCookie('CLIENT'));
    expect(res.status).toBe(403);
  });

  it('ruta protegida ⇒ 200 con rol', async () => {
    const res = await request(app).get('/api/admin/only').set('Cookie', fakeCookie('ADMIN'));
    expect(res.status).toBe(200);
  });
});
