import { Entity, OneToMany, ManyToOne,OneToOne, Property, Collection} from '@mikro-orm/core';
import { Venta } from '../venta/venta.entity.js';
import { Zona } from '../zona/zona.entity.js';
import { SobornoPendiente} from '../sobornoPendiente/soborno.entity.js'
import { Usuario } from '../auth/usuario.entity.js';

@Entity({tableName:'autoridades'})
export class Autoridad{

  @Property()
  rango!: number;

  @OneToMany(() => Venta, venta => venta.autoridad)
  ventas = new Collection<Venta>(this);

  @ManyToOne(() => Zona)
  zona!: Zona;      
  
  @OneToMany(() => SobornoPendiente, soborno => soborno.autoridad)
  sobornosPendientes = new Collection<SobornoPendiente>(this);

  @OneToOne(() => Usuario)
  usuario!: Usuario;

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
      dni: this.usuario.dni,
      nombre: this.usuario.nombre,
      zona: this.zona,
      rango:this.rango,
      sobornosPendientes: this.sobornosPendientes.getItems().map(s => s.toDTO()),
    };
  }
}