import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import { orm } from '../../shared/db/orm.js';
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';
export class AuthController {
    static async signup(req, res, next) {
        const em = orm.em.fork();
        try {
            console.log('Request body:', req.body);
            const { nombre, email, password, username, dni } = req.body || {};
            if (!nombre || !password || !dni || !email || !username) {
                return res.status(400).json({ message: 'Faltan datos obligatorios' });
            }
            const existingUsername = await em.findOne(Usuario, { username });
            if (existingUsername) {
                return res.status(409).json({ message: 'El nombre de usuario ya está registrado' });
            }
            const existingEmail = await em.findOne(Usuario, { email });
            if (existingEmail) {
                return res.status(409).json({ message: 'El email ya está registrado' });
            }
            const hashedPassword = await argon2.hash(password);
            // Crear el usuario incluyendo el rol, que es obligatorio
            const userNew = em.create(Usuario, {
                dni,
                nombre,
                username,
                email,
                password: hashedPassword,
                rol: Rol.CLIENTE, // Asignamos un rol por defecto
            });
            await em.persistAndFlush(userNew);
            return res.status(201).json({ message: 'Usuario creado con éxito' });
        }
        catch (error) {
            next(error);
        }
    }
    static async login(req, res, next) {
        const em = orm.em.fork();
        try {
            const { email, password } = req.body;
            const usuario = await em.findOne(Usuario, { email });
            if (!usuario || !(await argon2.verify(usuario.password, password))) {
                return res.status(401).json({ message: 'Credenciales inválidas' });
            }
            const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, JWT_SECRET, { expiresIn: '1h' });
            return res.status(200).json({ token });
        }
        catch (err) {
            next(err);
        }
    }
}
//# sourceMappingURL=auth.controller.js.map