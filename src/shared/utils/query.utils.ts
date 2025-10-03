import { Request } from 'express';

export type QueryOptions = {
  where: any;
  limit?: number;
  offset?: number;
};

/**
 * Build MikroORM-like query options from request query params.
 * - q: string to search across provided fields using LIKE
 * - page: 1-based page index
 * - limit: page size
 */
export function buildQueryOptions(
  req: Request,
  searchableFields: string[] = []
): QueryOptions {
  const { q } = (req.query || {}) as { q?: string };

  // pagination
  const pageRaw = (req.query?.page as string) ?? '1';
  const limitRaw = (req.query?.limit as string) ?? '20';
  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(limitRaw, 10) || 20));
  const offset = (page - 1) * limit;

  let where: any = {};
  if (q && q.trim() && searchableFields.length) {
    const like = `%${q.trim()}%`;
    where = {
      $or: searchableFields.map((f) => ({ [f]: { $like: like } })),
    };
  }

  return { where, limit, offset };
}
