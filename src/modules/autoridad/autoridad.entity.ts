import {
  Entity,
  OneToMany,
  ManyToOne,
  Property,
  Rel,
  Collection,
} from '@mikro-orm/core';
import { Venta } from '../venta/venta.entity.js';
import { Zona } from '../zona/zona.entity.js';
import { Soborno } from '../soborno/soborno.entity.js';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';

@Entity({ tableName: 'autoridades' })
export class Autoridad extends BaseEntityPersona {
  @Property()
  rango!: number;

  @OneToMany({ entity: () => Venta, mappedBy: (venta) => venta.autoridad })
  ventas = new Collection<Venta>(this);

  @ManyToOne({ entity: () => Zona, nullable: false })
  zona!: Rel<Zona>;

  @OneToMany({
    entity: () => Soborno,
    mappedBy: (soborno) => soborno.autoridad,
  })
  sobornos = new Collection<Soborno>(this);

  static calcularPorcentajePorRango(rango: number): number {
    const mapa: Record<number, number> = {
      0: 0.05,
      1: 0.1,
      2: 0.15,
      3: 0.25,
    };
    return mapa[rango] ?? 0;
  }

  static rangoToComision(rango: number) {
    return Autoridad.calcularPorcentajePorRango(rango);
  }

  toDTO() {
    return {
      dni: this.dni,
      nombre: this.nombre,
      rango: this.rango,
      zona: this.zona,
      sobornos:
        this.sobornos.isInitialized() && this.sobornos.length > 0
          ? this.sobornos.getItems().map((soborno) => soborno.toSinAutDTO())
          : 'Sin sobornos aún...',
    };
  }
}
