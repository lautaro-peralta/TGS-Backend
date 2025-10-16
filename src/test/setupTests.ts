import { beforeAll, afterAll, afterEach, vi } from 'vitest';


vi.mock('../shared/services/redis.service.js', () => ({
  redisService: {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isReady: () => false,
    get: vi.fn(),
    set: vi.fn(),
  },
}));


vi.mock('../shared/services/email.service.js', () => ({
  emailService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    isAvailable: () => false,
    send: vi.fn().mockResolvedValue({ ok: true }),
  },
}));


vi.mock('../shared/db/orm.js', () => ({
  orm: { em: {} as any },
  syncSchema: vi.fn().mockResolvedValue(undefined),
}));


afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
 
});
