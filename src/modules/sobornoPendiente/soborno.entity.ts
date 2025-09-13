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
  
  @ManyToOne({entity: () => Autoridad, nullable: false})
  autoridad!: Rel<Autoridad>;

  @ManyToOne({entity: ()=> Venta, nullable: false})
  venta!: Rel<Venta>;

  toDTO(){
    return{
      monto: this.monto,
      pagado:this.pagado,
      fechaCreacion: this.fechaCreacion,
      autoridad: {
        dni: this.autoridad.dni,
        nombre: this.autoridad.nombre
      },
      venta: {
        id: this.venta.id,
      }
    }
  }

}