import {
  Entity,
  OneToMany,
  ManyToOne,
  OneToOne,
  Property,
  Rel,
  Collection,
} from '@mikro-orm/core';
import { Venta } from '../venta/venta.entity.js';
import { Zona } from '../zona/zona.entity.js';
import { SobornoPendiente } from '../sobornoPendiente/soborno.entity.js';
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
    entity: () => SobornoPendiente,
    mappedBy: (soborno) => soborno.autoridad,
  })
  sobornosPendientes = new Collection<SobornoPendiente>(this);

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
      zona: this.zona,
      rango: this.rango,
      sobornosPendientes:
        this.sobornosPendientes.isInitialized() &&
        this.sobornosPendientes.length > 0
          ? this.sobornosPendientes.getItems()
          : 'Sin sobornos aún...',
    };
  }
}
