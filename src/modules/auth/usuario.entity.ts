import { Entity, Property, OneToOne, Ref, PrimaryKey } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { v7 as uuidv7 } from 'uuid';

export enum Rol {
  ADMIN = 'ADMIN',
  SOCIO = 'SOCIO',
  DISTRIBUIDOR = 'DISTRIBUIDOR',
  CLIENTE = 'CLIENTE',
  AUTORIDAD = 'AUTORIDAD',
}

@Entity({ tableName: 'usuarios' })
export class Usuario {
  @PrimaryKey({
    type: 'uuid',
    onCreate: () => uuidv7(),
  })
  id!: string;

  @Property({ unique: true })
  username!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Property({ type: 'string[]' })
  roles: Rol[] = [Rol.CLIENTE];

  //@Property({ default: true })
  //isActive: boolean = true;

  //@Property({ default: false })
  //emailVerified: boolean = false;

  //@Property({ nullable: true })
  //emailVerificationToken?: string;

  //@Property({ nullable: true })
  //passwordResetToken?: string;

  //@Property({ nullable: true })
  //passwordResetExpiresAt?: Date;

  //@Property({ nullable: true })
  //lastLoginAt?: Date;

  // Perfil completado - porcentaje de información proporcionada
  //@Property({ default: 25 })
  //profileCompleteness: number = 25;

  //@Property()
  //createdAt: Date = new Date();

  //@Property({ onUpdate: () => new Date() })
  //updatedAt: Date = new Date();

  @OneToOne({ entity: () => BaseEntityPersona, nullable: true, owner: true })
  persona?: Ref<BaseEntityPersona>;

  constructor(
    username: string,
    email: string,
    password: string,
    roles: Rol[] = [Rol.CLIENTE]
  ) {
    this.username = username;
    this.email = email;
    this.password = password;
    this.roles = roles;
  }

  toDTO() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      roles: this.roles,
    };
  }
  /*get hasPersonalInfo(): boolean {
    return !!this.persona;
  }
  get displayName(): string {
    return this.persona?.getEntity().nombre || this.username;
  }
  
  canPerformAction(
    action: 'purchase' | 'withdrawal' | 'verification'
  ): boolean {
    switch (action) {
      case 'purchase':
        return this.emailVerified; // Solo necesita email verificado
      case 'withdrawal':
      case 'verification':
        return this.hasPersonalInfo() && this.emailVerified; // Necesita datos personales
      default:
        return true;
    }
  }
  */
  //  calculateProfileCompleteness(): number {
  //    let completeness = 25; // Base por tener cuenta
  //
  //    if (this.emailVerified) completeness += 25; // +25% por email verificado
  //    if (this.persona) {
  //      completeness += 35; // +35% por datos personales básicos7
  //
  //      // Bonus por verificaciones adicionales
  //      if (this.persona.documentVerified) completeness += 10;
  //      if (this.persona.phoneVerified) completeness += 5;
  //    }
  //
  //    return Math.min(completeness, 100);
  //  }

  /*getProfileSuggestions(): string[] {
    const suggestions: string[] = [];

    if (!this.emailVerified) {
      suggestions.push('Verifica tu email para mayor seguridad');
    }

    if (!this.persona) {
      suggestions.push(
        'Completa tu perfil personal para acceder a más funciones'
      );
    } else {
      if (!this.persona.documentVerified) {
      suggestions.push('Verifica tu documento de identidad');
      }
      if (!this.persona.phoneVerified && this.persona.phoneNumber) {
        suggestions.push('Verifica tu número de teléfono');
      }
    }

    return suggestions;
  }*/
}
