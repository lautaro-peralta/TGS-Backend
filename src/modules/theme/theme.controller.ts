import { Request, Response } from 'express';
import { Theme } from './theme.entity.js';
import { orm } from '../../shared/db/orm.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const em = orm.em.fork();

export class ThemeController {
  async getAllThemes(req: Request, res: Response) {
    try {
      const themes = await em.find(Theme, {});
      const themesDTO = themes.map((t) => t.toDTO());
      const message = ResponseUtil.generateListMessage(themesDTO.length, 'theme');

      return ResponseUtil.successList(res, message, themesDTO);
    } catch (err) {
      console.error('Error getting themes:', err);
      return ResponseUtil.internalError(res, 'Error getting themes', err);
    }
  }

  async getOneThemeById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' }
        ]);
      }

      const theme = await em.findOne(
        Theme,
        { id },
        { populate: ['decisions'] }
      );

      if (!theme) {
        return ResponseUtil.notFound(res, 'Theme', id);
      }

      return ResponseUtil.success(res, 'Theme found successfully', theme.toDetailedDTO());
    } catch (err) {
      console.error('Error searching for theme:', err);
      return ResponseUtil.internalError(res, 'Error searching for theme', err);
    }
  }

  async createTheme(req: Request, res: Response) {
    //Search by description
    const { description } = res.locals.validated.body;

    let theme = await em.findOne(Theme, {
      description: description,
    });

    try {
      if (theme) {
        return ResponseUtil.conflict(res, 'Theme already exists', 'description');
      }
      const newTheme = em.create(Theme, {
        description,
      });

      await em.persistAndFlush(newTheme);

      return ResponseUtil.created(res, 'Theme created successfully', newTheme.toDTO());
    } catch (err: any) {
      console.error('Error creating Theme:', err);
      return ResponseUtil.internalError(res, 'Error creating theme', err);
    }
  }

  async updateTheme(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' }
        ]);
      }
      
      const theme = await em.findOne(Theme, { id });
      if (!theme) {
        return ResponseUtil.notFound(res, 'Theme', id);
      }

      const updates = res.locals.validated.body;

      em.assign(theme, updates);
      await em.flush();

      return ResponseUtil.updated(res, 'Theme updated successfully', theme.toDTO());
    } catch (err) {
      console.error('Error updating theme:', err);
      return ResponseUtil.internalError(res, 'Error updating theme', err);
    }
  }

  async deleteTheme(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' }
        ]);
      }

      const theme = await em.findOne(Theme, { id });
      if (!theme) {
        return ResponseUtil.notFound(res, 'Theme', id);
      }

      await em.removeAndFlush(theme);
      return ResponseUtil.deleted(res, 'Theme deleted successfully');
    } catch (err) {
      console.error('Error deleting theme:', err);
      return ResponseUtil.internalError(res, 'Error deleting theme', err);
    }
  }
}
