import {
  Entity,
  OneToMany,
  ManyToOne,
  Property,
  Rel,
  Collection,
} from '@mikro-orm/core';
import { Sale } from '../sale/sale.entity.js';
import { Zone } from '../zone/zone.entity.js';
import { Bribe } from '../bribe/bribe.entity.js';
import { BasePersonEntity } from '../../shared/db/base.person.entity.js';

@Entity({ tableName: 'authorities' })
export class Authority extends BasePersonEntity {
  @Property()
  rank!: number;

  @OneToMany({ entity: () => Sale, mappedBy: (sale) => sale.authority })
  sales = new Collection<Sale>(this);

  @ManyToOne({ entity: () => Zone, nullable: false })
  zone!: Rel<Zone>;

  @OneToMany({
    entity: () => Bribe,
    mappedBy: (bribe) => bribe.authority,
  })
  bribes = new Collection<Bribe>(this);

  static calculatePercentageByRank(rank: number): number {
    const map: Record<number, number> = {
      0: 0.05,
      1: 0.1,
      2: 0.15,
      3: 0.25,
    };
    return map[rank] ?? 0;
  }

  static rankToCommission(rank: number) {
    return Authority.calculatePercentageByRank(rank);
  }

  toDTO() {
    return {
      dni: this.dni,
      name: this.name,
      rank: this.rank,
      zone: this.zone,
      bribes:
        this.bribes.isInitialized() && this.bribes.length > 0
          ? this.bribes.getItems().map((bribe) => bribe.toWithoutAuthDTO())
          : 'No bribes yet...',
    };
  }
}
