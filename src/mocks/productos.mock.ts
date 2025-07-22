// src/mocks/productos.mock.ts

export const productosMock = [
  {
    _id: 'prod001',
    nombre: 'Fernet ilegal del Garrison',
    precio: 2500,
    esIlegal: true
  },
  {
    _id: 'prod002',
    nombre: 'Empanadas de Tío Riko',
    precio: 900,
    esIlegal: false
  },
  {
    _id: 'prod003',
    nombre: 'USB con datos clasificados',
    precio: 5000,
    esIlegal: true
  },
  {
    _id: 'prod004',
    nombre: 'Yerba mate orgánica',
    precio: 1200,
    esIlegal: false
  }
];


export function obtenerProductoPorId(id: string) {
  return productosMock.find(p => p._id === id);
}