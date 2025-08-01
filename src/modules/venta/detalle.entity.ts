import { Entity, DateTimeType, Property, OneToMany, ManyToOne, Collection, Cascade } from "@mikro-orm/core"
import { BaseEntityObjeto } from "../../shared/db/base.objeto.entity.js"
import { Venta } from "./venta.entity.js"
import { Producto } from "../producto/producto.entity.js";

@Entity({ tableName: 'detalles_venta' })
export class Detalle extends BaseEntityObjeto{ 

  @Property()
  cantidad!:number
  
  @Property({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number
  
  @ManyToOne(()=>Venta,{nullable:false})
  venta!:Venta
  
  @ManyToOne(() => Producto,{nullable:false})
  producto!: Producto; 

  toDTO() {
    return {
      producto: {
        id: this.producto.id,
        nombre: this.producto.descripcion,
      },
      cantidad: this.cantidad,
      precioUnitario: this.precioUnitario,
      subtotal: this.subtotal,
    };
  }
}
