import {
  PrimaryKey,
  Property,
  DateTimeType,
  OneToOne,
  Ref,
  Entity,
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

  @Property({ type: String, unique: true })
  dni!: string;

  @Property({ type: String, nullable: false })
  name!: string;

  @Property({ type: String, nullable: false })
  email!: string;

  @Property({ type: String, nullable: false })
  phone!: string;

  @Property({ type: String, nullable: false })
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

  @OneToOne({ entity: () => User, nullable: true })
  user?: Ref<User>;

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