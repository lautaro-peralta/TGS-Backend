import { Entity, OneToMany, Collection } from '@mikro-orm/core';
import { Venta } from '../venta/venta.entity.js';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';

@Entity({tableName:'clientes'})
export class Cliente extends BaseEntityPersona{

  @OneToMany({entity:() => Venta, mappedBy: 'cliente'})
  regCompras = new Collection<Venta>(this);

  toDTO() {
    return {
      dni: this.dni,
      nombre: this.nombre,
      email: this.email,
      direccion: this.direccion,
      telefono: this.telefono,
      regCompras: this.regCompras.isEmpty()
        ? 'No hay nada aquí por ahora...' : this.regCompras.getItems().map(v => v.toDTO?.() ?? v),
    };
  }
}
