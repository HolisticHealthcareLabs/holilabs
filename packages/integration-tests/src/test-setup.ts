/**
 * Jest test setup - mocks Redis/ioredis globally
 */

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    xadd: jest.fn().mockResolvedValue('mock-message-id'),
    xread: jest.fn().mockResolvedValue(null),
    pipeline: jest.fn().mockReturnValue({
      xadd: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    quit: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
  }));
});
