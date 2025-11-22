import {
  PrimaryKey,
  Property,
  DateTimeType,
  OneToOne,
  Ref,
  Entity,
  BeforeCreate,
  BeforeUpdate,
  EventArgs,
} from '@mikro-orm/core';
import { User } from '../modules/auth/user/user.entity.js';
import { v7 as uuidv7 } from 'uuid';

@Entity({ tableName: 'persons' })
export class BasePersonEntity {
  @PrimaryKey({
    type: 'uuid',
    onCreate: () => uuidv7(),
  })
  id!: string;

  @Property({ unique: true })
  dni!: string;

  @Property({ nullable: false })
  name!: string;

  @Property({ nullable: false })
  email!: string;

  @Property({ nullable: false })
  phone!: string;

  @Property({ nullable: false })
  address!: string;

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

  @OneToOne({ entity: () => User, nullable: true, mappedBy: 'person' })
  user?: Ref<User>;

  /**
   * Hook que valida que el email de BasePersonEntity coincida con el email del User
   * Esto previene inconsistencias de datos donde el usuario cambia el email
   * en sus datos personales sin actualizar su email de autenticación
   */
  @BeforeCreate()
  @BeforeUpdate()
  async validateEmailSync(args: EventArgs<BasePersonEntity>): Promise<void> {
    const em = args.em;

    // Si hay un usuario asociado, validar que los emails coincidan
    if (this.user) {
      const user = await this.user.load();

      if (user && user.email !== this.email) {
        throw new Error(
          `Email mismatch: BasePersonEntity email (${this.email}) must match User email (${user.email}). ` +
          `To change your email, please update it in your account settings, which will trigger a new email verification.`
        );
      }
    }
  }

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
    let score = 40; // Base for having personal data
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
  
 
  FOR EXAMPLE, FOR AN AUTHORITY, THE DATE FROM WHICH THEY STARTED WORKING
  CLANDESTINELY, OR FOR PARTNERS, TO KNOW THEIR SENIORITY

  */