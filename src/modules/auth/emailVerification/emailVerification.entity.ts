// ============================================================================
// EMAIL VERIFICATION ENTITY - Entidad para verificación automática de email
// ============================================================================

import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v7 as uuidv7 } from 'uuid';

/**
 * Estados posibles de una verificación de email
 */
export enum EmailVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
}

/**
 * Entidad que representa una verificación automática de email
 * Este es el sistema clásico de "click en el link del email"
 * Es DIFERENTE de la verificación de usuario (manual por admin en userVerification)
 */
@Entity({ tableName: 'email_verifications' })
export class EmailVerification {

  @PrimaryKey()
  id!: number;

  @Property()
  token: string;

  @Property()
  email: string;

  @Property()
  status: EmailVerificationStatus = EmailVerificationStatus.PENDING;

  @Property()
  expiresAt: Date;

  @Property()
  verifiedAt?: Date;

  @Property()
  createdAt: Date = new Date();

  /**
   * Crea una nueva verificación de email
   */
  constructor(email: string, expiresInHours: number = 48) {
    this.token = this.generateSecureToken();
    this.email = email.toLowerCase().trim();
    this.expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
  }

  /**
   * Genera un token seguro para verificación
   */
  private generateSecureToken(): string {
    return uuidv7();
  }

  /**
   * Verifica si el token es válido y no ha expirado
   */
  isValid(): boolean {
    return this.status === EmailVerificationStatus.PENDING && this.expiresAt > new Date();
  }

  /**
   * Marca la verificación como completada
   */
  markAsVerified(): void {
    this.status = EmailVerificationStatus.VERIFIED;
    this.verifiedAt = new Date();
  }

  /**
   * Marca la verificación como expirada
   */
  markAsExpired(): void {
    this.status = EmailVerificationStatus.EXPIRED;
  }
}

