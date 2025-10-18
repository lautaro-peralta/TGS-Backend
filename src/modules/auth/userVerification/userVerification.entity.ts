// ============================================================================
// USER VERIFICATION ENTITY - Entidad para solicitudes de verificación de usuario
// ============================================================================

import { Entity, PrimaryKey, Property, ManyToOne, EntityDTO } from '@mikro-orm/core';
import { BasePersonEntity } from '../../../shared/base.person.entity.js';
import { v7 as uuidv7 } from 'uuid';
import { nullable } from 'zod';

/**
 * Estados posibles de una solicitud de verificación de usuario
 */
export enum UserVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Entidad que representa una solicitud de verificación de usuario
 * Este proceso es manual por admin y verifica TODA la información del usuario:
 * DNI, nombre, email, teléfono y dirección
 */
@Entity({ tableName: 'user_verifications' })
export class UserVerification {

  @PrimaryKey()
  id!: number;

  @Property()
  token: string;

  @Property()
  email: string;

  @Property()
  status: UserVerificationStatus = UserVerificationStatus.PENDING;

  @Property()
  expiresAt: Date;

  @Property({ nullable: true })
  verifiedAt?: Date;

  @Property()
  attempts: number = 0;

  @Property()
  maxAttempts: number = 3;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  /**
   * Crea una nueva solicitud de verificación de email
   */
  constructor(email: string, expiresInHours: number = 24) {
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
    return this.status === UserVerificationStatus.PENDING && this.expiresAt > new Date();
  }

  /**
   * Marca la verificación como completada
   */
  markAsVerified(): void {
    this.status = UserVerificationStatus.VERIFIED;
    this.verifiedAt = new Date();
  }

  /**
   * Marca la verificación como expirada
   */
  markAsExpired(): void {
    this.status = UserVerificationStatus.EXPIRED;
  }

  /**
   * Cancela la solicitud de verificación
   */
  cancel(): void {
    this.status = UserVerificationStatus.CANCELLED;
  }

  /**
   * Incrementa el contador de intentos
   */
  incrementAttempts(): void {
    this.attempts++;

    // Si se exceden los intentos máximos, marcar como expirado
    if (this.attempts >= this.maxAttempts) {
      this.markAsExpired();
    }
  }

  /**
   * Verifica si se pueden hacer más intentos
   */
  canAttempt(): boolean {
    return this.attempts < this.maxAttempts && this.isValid();
  }

  /**
   * DTO para respuestas de API
   */
  toDTO(): UserVerificationDTO {
    return {
      id: this.id,
      token: this.token,
      email: this.email,
      status: this.status,
      expiresAt: this.expiresAt.toISOString(),
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      verifiedAt: this.verifiedAt?.toISOString(),
    };
  }
}

/**
 * DTO para respuestas de API de verificación de usuario
 */
export interface UserVerificationDTO {
  id: number;
  token: string;
  email: string;
  status: UserVerificationStatus;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}
