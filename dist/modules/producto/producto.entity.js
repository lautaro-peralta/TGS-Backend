var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, Property } from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';
export let Producto = class Producto extends BaseEntityObjeto {
    constructor(precio, stock, descripcion, esIlegal) {
        super();
        this.precio = precio;
        this.stock = stock;
        this.descripcion = descripcion;
        this.esIlegal = esIlegal;
    }
    toDTO() {
        return {
            id: this.id,
            descripcion: this.descripcion,
            precio: this.precio,
            stock: this.stock,
            esIlegal: this.esIlegal
        };
    }
};
__decorate([
    Property(),
    __metadata("design:type", String)
], Producto.prototype, "descripcion", void 0);
__decorate([
    Property(),
    __metadata("design:type", Number)
], Producto.prototype, "precio", void 0);
__decorate([
    Property(),
    __metadata("design:type", Number)
], Producto.prototype, "stock", void 0);
__decorate([
    Property({ default: false }),
    __metadata("design:type", Boolean)
], Producto.prototype, "esIlegal", void 0);
Producto = __decorate([
    Entity({ tableName: 'productos' }),
    __metadata("design:paramtypes", [Number, Number, String, Boolean])
], Producto);
//# sourceMappingURL=producto.entity.js.map