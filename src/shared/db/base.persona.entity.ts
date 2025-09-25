import {
  PrimaryKey,
  Property,
  DateTimeType,
  OneToOne,
  Ref,
  Entity,
} from '@mikro-orm/core';
import { Usuario } from '../../modules/auth/usuario.entity.js';
import { v7 as uuidv7 } from 'uuid';

@Entity({ tableName: 'personas' })
export class BaseEntityPersona {
  @PrimaryKey({
    type: 'uuid',
    onCreate: () => uuidv7(),
  })
  id!: string;

  @Property({ unique: true })
  dni!: string;

  @Property({ nullable: false })
  nombre!: string;

  @Property({ nullable: false })
  email!: string;

  @Property({ nullable: false })
  telefono!: string;

  @Property({ nullable: false })
  direccion!: string;

  //@Property({ nullable: true })
  //city?: string;

  //@Property({ nullable: true })
  //country?: string;

  //@Property({ nullable: true })
  //postalCode?: string;

  //@Property({ type: 'date' })
  //birthDate!: Date;

  //@Property({ default: false })
  //documentVerified: boolean = false;

  //@Property({ default: false })
  //phoneVerified: boolean = false;

  //@Property({ default: false })
  //addressVerified: boolean = false;

  //@Property()
  //createdAt: Date = new Date();

  //@Property({ onUpdate: () => new Date() })
  //updatedAt: Date = new Date();

  @OneToOne({ entity: () => Usuario, nullable: true })
  usuario?: Ref<Usuario>;

  // get fullName(): string {
  //return this.middleName
  //  ? `${this.firstName} ${this.middleName} ${this.lastName}`
  //  : `${this.firstName} ${this.lastName}`;
  //}

  /*get age(): number {
    const today = new Date();
    const birthYear = this.birthDate.getFullYear();
    const age = today.getFullYear() - birthYear;
    const monthDiff = today.getMonth() - this.birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < this.birthDate.getDate())
    ) {
      return age - 1;
    }
    return age;
}
    get verificationScore(): number {
    let score = 40; // Base por tener datos personales
    if (this.documentVerified) score += 30;
    if (this.phoneVerified) score += 20;
    if (this.addressVerified) score += 10;
    return score;
  }

  get verificationLevel(): 'basic' | 'intermediate' | 'advanced' | 'complete' {
    const score = this.verificationScore;
    if (score >= 90) return 'complete';
    if (score >= 70) return 'advanced';
    if (score >= 50) return 'intermediate';
    return 'basic';
  }
    */
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
