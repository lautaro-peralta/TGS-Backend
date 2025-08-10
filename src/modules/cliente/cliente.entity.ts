import { Entity, Property, OneToMany, OneToOne, Collection } from '@mikro-orm/core';
import { Venta } from '../venta/venta.entity.js';
import { Usuario } from '../auth/usuario.entity.js';

@Entity({tableName:'clientes'})
export class Cliente{

  @OneToMany(() => 'Venta', 'cliente')
  regCompras = new Collection<Venta>(this);

  @OneToOne(() => Usuario, usuario => usuario.cliente, { nullable:true })
  usuario!: Usuario;

  toDTO() {
    return {
      dni: this.usuario.dni,
      nombre: this.usuario.nombre,
      email: this.usuario.email,
      direccion: this.usuario.direccion,
      telefono: this.usuario.telefono,
      regCompras: this.regCompras.isEmpty()
        ? 'No hay nada aquí por ahora...' : this.regCompras.getItems().map(v => v.toDTO?.() ?? v),
    };
  }
}
