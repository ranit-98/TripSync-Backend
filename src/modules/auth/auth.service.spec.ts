import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('password-hash'),
  compare: jest.fn(),
}));

describe('AuthService registration', () => {
  const dto = {
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    password: 'StrongPass123',
  };

  function createService(createError: unknown) {
    const users = {
      exists: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      create: jest.fn().mockRejectedValue(createError),
    };

    return new AuthService(users as never, {} as never);
  }

  it('returns a conflict when MongoDB rejects a duplicate email', async () => {
    const service = createService({ code: 11000, keyPattern: { email: 1 } });

    await expect(service.register(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not misreport a stale username index as a duplicate email', async () => {
    const staleIndexError = {
      code: 11000,
      keyPattern: { username: 1 },
      keyValue: { username: null },
    };
    const service = createService(staleIndexError);

    await expect(service.register(dto)).rejects.toBe(staleIndexError);
  });

  it('does not hide unexpected database errors', async () => {
    const databaseError = new Error('database unavailable');
    const service = createService(databaseError);

    await expect(service.register(dto)).rejects.toBe(databaseError);
  });
});
