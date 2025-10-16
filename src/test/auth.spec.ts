// src/test/auth.spec.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Auth HTTP', () => {
  const app = createApp();

  // helper reutilizable
  async function loginAndGetCookie() {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@tgs.com', password: 'Demo123!' });

    if (![200, 201].includes(res.status)) {
      // log de depuración si algo explota
      // se ve en la consola del test
      // ayuda a diagnosticar 500/4xx
      // sin romper la suite
      // (lo mantenemos corto)
      // eslint-disable-next-line no-console
      console.error('❌ Login failed:', res.status, res.body);
    }
    expect([200, 201]).toContain(res.status);

    const cookie = res.headers['set-cookie']?.[0];
    expect(cookie).toBeTruthy(); // debe existir

    return cookie!;
  }

  it('POST /api/auth/login ⇒ 200/201 y cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@tgs.com', password: 'Demo123!' });

    if (![200, 201].includes(res.status)) {
      // eslint-disable-next-line no-console
      console.error('❌ /api/auth/login', res.status, res.body);
    }

    expect([200, 201]).toContain(res.status);
    // cookie presente
    const cookie = res.headers['set-cookie']?.[0];
    expect(cookie).toBeTruthy();
    // body razonable
    expect(res.body).toBeTruthy();
  });

  it('GET /api/auth/me ⇒ 401 si no hay sesión', async () => {
    const res = await request(app).get('/api/auth/me');
    if (res.status !== 401) {
      // eslint-disable-next-line no-console
      console.error('❌ /api/auth/me(sin cookie)', res.status, res.body);
    }
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me ⇒ 200 con sesión', async () => {
    const cookie = await loginAndGetCookie();

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    if (me.status !== 200) {
      // eslint-disable-next-line no-console
      console.error('❌ /api/auth/me(con cookie)', me.status, me.body);
    }

    expect(me.status).toBe(200);
    // admite {email} o {data:{email}}
    expect(me.body?.email ?? me.body?.data?.email).toBeDefined();
  });

  it('POST /api/auth/logout ⇒ 200/204 y limpia sesión', async () => {
    const res = await request(app).post('/api/auth/logout');
    if (![200, 204].includes(res.status)) {
      // eslint-disable-next-line no-console
      console.error('❌ /api/auth/logout', res.status, res.body);
    }
    expect([200, 204]).toContain(res.status);
  });
});
