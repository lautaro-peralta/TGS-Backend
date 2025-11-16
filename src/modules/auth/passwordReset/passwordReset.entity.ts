import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v7 as uuidv7 } from 'uuid';

export enum PasswordResetStatus {
  PENDING = 'pending',
  USED = 'used',
  EXPIRED = 'expired',
}

@Entity({ tableName: 'password_resets' })
export class PasswordReset {
  @PrimaryKey()
  id!: number;

  @Property()
  token: string;

  @Property()
  email: string;

  @Property()
  status: PasswordResetStatus = PasswordResetStatus.PENDING;

  @Property()
  expiresAt: Date;

  @Property({ nullable: true })
  usedAt?: Date;

  @Property()
  createdAt: Date = new Date();

  constructor(email: string, expiresInMinutes: number = 30) {
    this.token = this.generateSecureToken();
    this.email = email.toLowerCase().trim();
    this.expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  }

  private generateSecureToken(): string {
    return uuidv7();
  }

  isValid(): boolean {
    return (
      this.status === PasswordResetStatus.PENDING && this.expiresAt > new Date()
    );
  }

  markAsUsed(): void {
    this.status = PasswordResetStatus.USED;
    this.usedAt = new Date();
  }

  markAsExpired(): void {
    this.status = PasswordResetStatus.EXPIRED;
  }
}
