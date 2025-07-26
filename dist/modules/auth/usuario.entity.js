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
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
export var Rol;
(function (Rol) {
    Rol["ADMIN"] = "ADMIN";
    Rol["SOCIO"] = "SOCIO";
    Rol["DISTRIBUIDOR"] = "DISTRIBUIDOR";
    Rol["CLIENTE"] = "CLIENTE";
})(Rol || (Rol = {}));
export let Usuario = class Usuario extends BaseEntityPersona {
    constructor(nombre, email, password, rol = Rol.CLIENTE) {
        super();
        this.rol = Rol.CLIENTE; // Por defecto cliente
        this.nombre = nombre;
        this.email = email;
        this.password = password;
        this.rol = rol;
    }
    toDTO() {
        return {
            id: this.id,
            nombre: this.nombre,
            username: this.username,
            email: this.email,
            rol: this.rol,
        };
    }
};
__decorate([
    Property(),
    __metadata("design:type", String)
], Usuario.prototype, "username", void 0);
__decorate([
    Property({ unique: true }),
    __metadata("design:type", String)
], Usuario.prototype, "email", void 0);
__decorate([
    Property(),
    __metadata("design:type", String)
], Usuario.prototype, "password", void 0);
__decorate([
    Property(),
    __metadata("design:type", String)
], Usuario.prototype, "rol", void 0);
Usuario = __decorate([
    Entity({ tableName: 'usuarios' }),
    __metadata("design:paramtypes", [String, String, String, String])
], Usuario);
//# sourceMappingURL=usuario.entity.js.map