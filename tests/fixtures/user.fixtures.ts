import { User, Role } from '../../src/modules/auth/user/user.entity.js';

/**
 * Create a mock user for testing
 */
export const createMockUser = (overrides?: Partial<User>): User => {
  const user = new User();
  user.id = '01234567-89ab-cdef-0123-456789abcdef';
  user.username = 'testuser';
  user.email = 'test@example.com';
  user.password = '$argon2id$v=19$m=65536,t=3,p=4$hashed_password';
  user.roles = [Role.USER];
  user.isActive = true;
  user.verifiedByAdmin = false;
  user.emailVerified = false;

  return Object.assign(user, overrides);
};

/**
 * Create a mock admin user
 */
export const createMockAdminUser = (overrides?: Partial<User>): User => {
  return createMockUser({
    username: 'admin',
    email: 'admin@example.com',
    roles: [Role.ADMIN],
    verifiedByAdmin: true,
    emailVerified: true,
    ...overrides,
  });
};

/**
 * Create a mock client user
 */
export const createMockClientUser = (overrides?: Partial<User>): User => {
  return createMockUser({
    username: 'client',
    email: 'client@example.com',
    roles: [Role.CLIENT],
    verifiedByAdmin: true,
    emailVerified: true,
    ...overrides,
  });
};

/**
 * User registration data
 */
export const mockRegisterData = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'SecurePassword123!',
};

/**
 * User login data
 */
export const mockLoginData = {
  username: 'testuser',
  password: 'SecurePassword123!',
};
