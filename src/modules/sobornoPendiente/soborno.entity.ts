import { Entity, Rel, Property, ManyToOne } from "@mikro-orm/core";
import { Venta } from "../venta/venta.entity.js";
import { Autoridad } from "../autoridad/autoridad.entity.js";
import { BaseEntityObjeto } from "../../shared/db/base.objeto.entity.js";

@Entity({ tableName: 'sobornos_pendientes' })
export class SobornoPendiente extends BaseEntityObjeto{

  @Property()
  monto!: number;

  @Property()
  pagado: boolean = false;

  @Property()
  fechaCreacion: Date = new Date();
  
  @ManyToOne(() => Autoridad, {nullable: false})
  autoridad!: Rel<Autoridad>;

  @ManyToOne(()=> Venta, {nullable:false})
  venta!: Rel<Venta>;

  toDTO(){
    return{
      monto: this.monto,
      pagado:this.pagado,
      fechaCreacion: this.fechaCreacion,
      autoridad: {
        dni: this.autoridad.usuario.dni,
        nombre: this.autoridad.usuario.nombre
      },
      venta: {
        id: this.venta.id,
      }
    }
  }

}