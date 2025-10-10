import request from 'supertest';
import { orm } from '../../src/shared/db/orm.js';
import { Partner } from '../../src/modules/partner/partner.entity.js';

const app = (globalThis as any).__APP__;

describe('GET /api/partners', () => {
  it('200 y devuelve array con al menos 1 item', async () => {
    const em = orm.em.fork();
    const p = new Partner();
    // @ts-ignore
    p.dni = '111'; p.nombre = 'Grace'; p.email = 'g@ex.com';
    // @ts-ignore
    p.direccion = 'Harvard'; p.telefono = '555-111';
    await em.persistAndFlush(p);

    const res = await request(app).get('/api/partners');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
