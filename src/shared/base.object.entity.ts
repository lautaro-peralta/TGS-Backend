import { PrimaryKey } from '@mikro-orm/core';

export abstract class BaseObjectEntity {
  @PrimaryKey({ type: Number })
  id!: number;
}