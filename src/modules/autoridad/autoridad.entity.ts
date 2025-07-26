import { Entity, OneToMany, ManyToOne, Property, Collection} from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { Venta } from '../../modules/venta/venta.entity.js';
import { Zona } from '../../modules/zona/zona.entity.js';

@Entity({tableName:'autoridades'})
export class Autoridad extends BaseEntityPersona{

  @Property()
  rango!: number;

  @OneToMany(() => Venta, venta => venta.autoridad)
  ventas = new Collection<Venta>(this);

  @ManyToOne(() => Zona)
  zona!: Zona;      
  
  static calcularPorcentajePorRango(rango: number): number {
  const mapa: Record<number, number> = {
    0: 0.05,
    1: 0.10,
    2: 0.15,
    3: 0.25
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
      zona: this.zona ? {nombre: this.zona.nombre } : null,
      rango:this.rango
      // agregá lo que consideres necesario
    };
  }
}