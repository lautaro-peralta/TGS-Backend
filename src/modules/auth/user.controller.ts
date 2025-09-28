import { Request, Response, NextFunction } from 'express';
import { User, Role } from './user.entity.js';
import { orm } from '../../shared/db/orm.js';
import { validate as isUuid } from 'uuid';
import { wrap } from '@mikro-orm/core';
import { BasePersonEntity } from '../../shared/db/base.person.entity.js';
import argon2 from 'argon2';
import { ResponseUtil } from '../../shared/utils/response.util.js';

export class UserController {
  // Get authenticated user profile
  async getUserProfile(req: Request, res: Response) {
    try {
      const { id } = (req as any).user;

      const em = orm.em.fork();
      const user = await em.findOne(
        User,
        { id }
        //{ populate: ['person'] }
      );

      if (!user) {
        return ResponseUtil.notFound(res, 'User', id);
      }

      return ResponseUtil.success(
        res,
        'Client found successfully',
        user.toDTO()
      );
    } catch (err) {
      console.error('Error getting clients:', err);
      return ResponseUtil.internalError(res, 'Error getting user', err);
    }
  }

  // Get all users (admin only)
  async getAllUsers(req: Request, res: Response) {
    try {
      const em = orm.em.fork();
      const users = await em.find(User, {});
      return ResponseUtil.success(
        res,
        'Users obtained successfully',
        users.map((u) => u.toDTO())
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error getting users', err);
    }
  }

  //
  async getOneUserById(req: Request, res: Response) {
    const { identifier } = req.params;
    const em = orm.em.fork();

    try {
      let user;

      if (isUuid(identifier)) {
        user = await em.findOne(User, { id: identifier });
      } else {
        user = await em.findOne(User, { username: identifier });
      }

      if (!user) {
        return ResponseUtil.notFound(res, 'User', identifier);
      }

      const { password, ...safeUser } = wrap(user).toJSON();
      return ResponseUtil.success(
        res,
        'User obtained successfully',
        safeUser
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error getting user', err);
    }
  }

  // Change user role (admin only)
  async updateUserRoles(req: Request, res: Response) {
    try {
      const em = orm.em.fork();
      const { id } = res.locals.validated.params;
      const { role } = res.locals.validated.body;

      if (!Object.values(Role).includes(role)) {
        return ResponseUtil.error(res, 'Invalid role', 400);
      }

      const user = await em.findOne(User, { id });
      if (!user) {
        return ResponseUtil.notFound(res, 'User', id);
      }

      if (!user.roles.includes(role)) {
        user.roles.push(role);
        await em.flush();
        return ResponseUtil.success(
          res,
          'Role added successfully',
          user.toDTO()
        );
      }

      return ResponseUtil.success(
        res,
        'User updated successfully',
        user.toDTO()
      );
    } catch (err) {
      return ResponseUtil.internalError(
        res,
        'Error updating user',
        err
      );
    }
  }

  async createUser(req: Request, res: Response) {
    const em = orm.em.fork();
    const { personId, username, email, password, roles } =
      res.locals.validated.body;

    // Search for existing person
    const person = await em.findOne(BasePersonEntity, { id: personId });
    if (!person) return ResponseUtil.notFound(res, 'Person', personId);

    // Verify if the person already has a user
    if (person.user)
      return ResponseUtil.conflict(
        res,
        'The person already has a user assigned'
      );

    // Verify that the username/email is not duplicated
    const usernameExists = await em.findOne(User, { username });
    const emailExists = await em.findOne(User, { email });

    if (usernameExists || emailExists) {
      return ResponseUtil.conflict(res, 'The username or email are already in use');
    }

    // Create user
    const hashedPassword = await argon2.hash(password);
    const user = em.create(User, {
      username,
      email,
      password: hashedPassword,
      roles,
      person,
    });

    await em.persistAndFlush(user);

    return ResponseUtil.success(
      res,
      'User created successfully',
      user.toDTO()
    );
  }
}
