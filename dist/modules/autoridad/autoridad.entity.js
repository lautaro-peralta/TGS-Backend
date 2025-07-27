var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Autoridad_1;
import { Entity, OneToMany, ManyToOne, Property, Collection } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { Venta } from '../../modules/venta/venta.entity.js';
import { Zona } from '../../modules/zona/zona.entity.js';
let Autoridad = Autoridad_1 = class Autoridad extends BaseEntityPersona {
    constructor() {
        super(...arguments);
        this.ventas = new Collection(this);
    }
    static calcularPorcentajePorRango(rango) {
        const mapa = {
            0: 0.05,
            1: 0.10,
            2: 0.15,
            3: 0.25
        };
        return mapa[rango] ?? 0;
    }
    static rangoToComision(rango) {
        return Autoridad_1.calcularPorcentajePorRango(rango);
    }
    toDTO() {
        return {
            dni: this.dni,
            nombre: this.nombre,
            zona: this.zona ? { nombre: this.zona.nombre } : null,
            rango: this.rango
            // agregá lo que consideres necesario
        };
    }
};
__decorate([
    Property(),
    __metadata("design:type", Number)
], Autoridad.prototype, "rango", void 0);
__decorate([
    OneToMany(() => Venta, venta => venta.autoridad),
    __metadata("design:type", Object)
], Autoridad.prototype, "ventas", void 0);
__decorate([
    ManyToOne(() => Zona),
    __metadata("design:type", Zona)
], Autoridad.prototype, "zona", void 0);
Autoridad = Autoridad_1 = __decorate([
    Entity({ tableName: 'autoridades' })
], Autoridad);
export { Autoridad };
//# sourceMappingURL=autoridad.entity.js.map