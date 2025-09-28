import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { User, Role } from '../auth/user.entity.js';
import { orm } from '../../shared/db/orm.js';
import { registerSchema } from './auth.schema.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ultra-secure-secret';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    const em = orm.em.fork();
    try {
      const validatedData = registerSchema.parse(req.body);
      const { username, email, password } = validatedData;

      //USER VALIDATION
      const existingUsername = await em.findOne(User, { username });
      if (existingUsername) {
        return ResponseUtil.conflict(
          res,
          'Username is already registered',
          'username'
        );
      }
      const existingEmail = await em.findOne(User, { email });
      if (existingEmail) {
        return ResponseUtil.conflict(
          res,
          'Email is already registered',
          'email'
        );
      }

      const hashedPassword = await argon2.hash(password);
      // Create the user including the role, which is mandatory
      const newUser = em.create(User, {
        username,
        roles: [Role.CLIENT], // We assign a default role
        password: hashedPassword,
        email,
      });

      await em.persistAndFlush(newUser);

      return ResponseUtil.created(res, 'User created successfully', {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        roles: newUser.roles,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    const em = orm.em.fork();
    try {
      const { email, password } = req.body;
      const user = await em.findOne(User, { email });

      if (!user || !(await argon2.verify(user.password, password))) {
        return ResponseUtil.unauthorized(res, 'Invalid credentials');
      }

      const token = jwt.sign(
        { id: user.id, roles: user.roles },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      /*const refreshToken = jwt.sign(
        { id: user.id, roles: user.roles },
        JWT_SECRET,
        { expiresIn: '15d' }
      );*/
      res
        .cookie('access_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60,
        })
        .json({
          success: true,
          message: 'Login successful',
          data: user.toDTO(),
          meta: {
            timestamp: new Date().toISOString(),
            statusCode: 200,
          },
        });
      /*res
        .cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60,
        })
        .send(user.toDTO());*/
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response) {
    res.clearCookie('access_token').json({
      success: true,
      message: 'Logout successful',
      meta: {
        timestamp: new Date().toISOString(),
        statusCode: 200,
      },
    });
  }
}
