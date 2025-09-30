import { PrimaryKey } from '@mikro-orm/core';

export abstract class BaseObjectEntity {
  @PrimaryKey()
  id!: number;
}