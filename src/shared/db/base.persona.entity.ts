import { PrimaryKey, Property, DateTimeType, OneToOne, Ref, Entity } from '@mikro-orm/core'
import { Usuario } from '../../modules/auth/usuario.entity.js';
import { v7 as uuidv7 } from 'uuid';

@Entity({tableName:'personas'})
export class BaseEntityPersona {
  @PrimaryKey({ 
    type: 'uuid',
    onCreate: () => uuidv7() })
  id!: string;

  @Property({unique:true})
  dni!:string;

  @Property({nullable:false})
  nombre!: string;

  @Property({nullable:false})
  email!: string;

  @Property({nullable:false})
  telefono!: string;

  @Property({nullable:false})
  direccion!: string;
  
  @OneToOne({entity:() => Usuario, nullable: true })
  usuario?: Ref<Usuario>;
}

/*
  @Property({ type: DateTimeType })
  createdAt = new Date();

  @Property({ 
    type: DateTimeType,
    onUpdate: () => new Date(),
    nullable: true
  })
  updatedAt?: Date;
  
 
  POR EJEMPLO, PARA AUTORIDAD, LA FECHA A PARTIR DE LA CUAL COMENZÓ A TRABAJAR
  CLANDESTINAMENTE, O LOS SOCIOS, PARA SABER SU ANTIGÜEDAD

  */
