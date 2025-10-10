import { describe, it, expect } from 'vitest';
import { Partner } from '../../src/modules/partner/partner.entity.js';

describe('Partner.toDTO', () => {
  it('mapea campos públicos en inglés', () => {
    const p = new Partner();
    // @ts-ignore setters directos para test
    p.dni = '123';
    p.nombre = 'Ada';
    p.email = 'ada@ex.com';
    p.direccion = 'Main 1';
    p.telefono = '555';

    const dto = p.toDTO();
    expect(dto).toMatchObject({
      dni: '123',
      name: 'Ada',
      email: 'ada@ex.com',
      address: 'Main 1',
      phone: '555'
    });
  });
});
