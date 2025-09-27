import { Entity, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
// Opcional: descomentar si ya existe Distribuidor y la FK en esa entidad
// import { Distribuidor } from '../distribuidor/distribuidor.entity.js';

@Entity({ tableName: 'socios' })
export class Socio extends BaseEntityPersona {
  // Relación 1:N opcional con Distribuidor (si tu modelo lo requiere)
  // @OneToMany({ entity: () => Distribuidor, mappedBy: 'socio' })
  // distribuidores = new Collection<Distribuidor>(this);

  toDTO() {
    return {
      dni: this.dni,
      nombre: this.nombre,
      email: this.email,
      direccion: this.direccion,
      telefono: this.telefono,
      // status: this.status, // descomenta si BaseEntityPersona tiene status
    };
  }

  toDetailedDTO() {
    return {
      ...this.toDTO(),
      // Si agregás la relación con Distribuidor, podés exponerla así:
      // distribuidores: this.distribuidores?.isInitialized()
      //   ? (this.distribuidores.isEmpty()
      //       ? 'Sin distribuidores asociados'
      //       : this.distribuidores.getItems().map(d => d.toDTO?.() ?? d))
      //   : 'Información no disponible',
    };
  }
}
