import { mock, mockDeep } from 'jest-mock-extended';
import { EntityManager, EntityRepository } from '@mikro-orm/core';

/**
 * Create a mock EntityManager
 */
export const createMockEntityManager = () => {
  const em = mockDeep<EntityManager>();

  em.fork.mockReturnValue(em);
  em.flush.mockResolvedValue(undefined);
  em.persistAndFlush.mockResolvedValue(undefined);
  em.removeAndFlush.mockResolvedValue(undefined);
  em.findOne.mockResolvedValue(null);
  em.find.mockResolvedValue([]);
  em.count.mockResolvedValue(0);

  return em;
};

/**
 * Create a mock EntityRepository
 */
export const createMockRepository = <T>() => {
  return mockDeep<EntityRepository<T>>();
};
