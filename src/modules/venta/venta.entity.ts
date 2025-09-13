import { Entity, wrap, DateTimeType, Ref,Loaded, Property, OneToMany, ManyToOne, Collection, Cascade } from "@mikro-orm/core"
import { BaseEntityObjeto } from "../../shared/db/base.objeto.entity.js"
import { Cliente } from "../cliente/cliente.entity.js"
import { Detalle } from "./detalle.entity.js"
import { Autoridad } from "../../modules/autoridad/autoridad.entity.js"

function callToDTO<T extends { toDTO(): any }>(ref: Ref<T>|Loaded<T>): any {
  const entity = wrap(ref).toObject() as T;
  return entity.toDTO();
}

@Entity({ tableName: 'ventas' })
export class Venta extends BaseEntityObjeto{ 

  @Property({nullable:true})
  descripcion?:string
  
  @Property({type: Date})
  fechaVenta!: Date

  @Property()
  montoVenta!: number
  
  @ManyToOne({entity: () => Cliente, nullable: true})
  cliente?: Ref<Cliente>|Loaded<Cliente>;

  @OneToMany({entity: () => Detalle, mappedBy:'venta', cascade: [Cascade.ALL]})
  detalles = new Collection<Detalle>(this);

  @ManyToOne({entity: () => Autoridad,  nullable: true })
  autoridad?: Ref<Autoridad> | Loaded<Autoridad>;

  toDTO() {
    return {
      id: this.id,
      descripcion: this.descripcion || null,
      fecha: this.fechaVenta.toISOString(),
      monto: this.montoVenta,
      detalles: this.detalles.getItems().map(d => d.toDTO()),
      cliente: this.cliente ? callToDTO(this.cliente) : null,
      autoridad: this.autoridad ? callToDTO(this.autoridad) : null,
    };
    }
}