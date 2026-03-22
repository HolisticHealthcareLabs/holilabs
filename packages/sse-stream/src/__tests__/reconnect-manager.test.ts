import { ReconnectManager } from '../reconnect-manager';

describe('ReconnectManager', () => {
  let manager: ReconnectManager;

  beforeEach(() => {
    manager = new ReconnectManager(
      10,      // maxReconnectAttempts
      1000,    // baseReconnectDelayMs
      30000    // maxReconnectDelayMs
    );
  });

  describe('getNextDelay', () => {
    it('should implement exponential backoff', () => {
      // Attempt 0: base = 1000, max = 1000
      const delay0 = manager.getNextDelay(0);
      expect(delay0).toBeLessThanOrEqual(1000);
      expect(delay0).toBeGreaterThanOrEqual(0);

      // Attempt 1: base = 2000, max = 2000
      const delay1 = manager.getNextDelay(1);
      expect(delay1).toBeLessThanOrEqual(2000);
      expect(delay1).toBeGreaterThanOrEqual(0);

      // Attempt 2: base = 4000, max = 4000
      const delay2 = manager.getNextDelay(2);
      expect(delay2).toBeLessThanOrEqual(4000);
      expect(delay2).toBeGreaterThanOrEqual(0);
    });

    it('should cap at maxReconnectDelayMs', () => {
      // Very high attempt should be capped
      const delayHigh = manager.getNextDelay(100);
      expect(delayHigh).toBeLessThanOrEqual(30000);
    });

    it('should implement full jitter (random distribution)', () => {
      const samples: number[] = [];

      for (let i = 0; i < 100; i++) {
        samples.push(manager.getNextDelay(2)); // Attempt 2: base = 4000
      }

      // Check that we get varied delays (not all the same)
      const unique = new Set(samples);
      expect(unique.size).toBeGreaterThan(1);

      // All should be within expected bounds
      samples.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(4000);
        expect(delay).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle negative attempts as 0', () => {
      const delay = manager.getNextDelay(-5);
      expect(delay).toBeLessThanOrEqual(1000); // Base delay
      expect(delay).toBeGreaterThanOrEqual(0);
    });

    it('should follow AWS full jitter algorithm', () => {
      // Full jitter: random(0, min(baseDelay * 2^attempt, maxDelay))
      // For attempt 3: min(1000 * 2^3, 30000) = min(8000, 30000) = 8000
      const samples = [];
      for (let i = 0; i < 50; i++) {
        samples.push(manager.getNextDelay(3));
      }

      const max = Math.max(...samples);
      expect(max).toBeLessThanOrEqual(8000);

      // Should have good distribution
      const sorted = samples.sort((a, b) => a - b);
      const p25 = sorted[Math.floor(sorted.length * 0.25)];
      const p75 = sorted[Math.floor(sorted.length * 0.75)];

      // With full jitter, 25th percentile should be well below max
      expect(p25).toBeLessThan(max * 0.75);
    });
  });

  describe('shouldReconnect', () => {
    it('should allow reconnection within max attempts', () => {
      for (let i = 0; i < 10; i++) {
        expect(manager.shouldReconnect(i)).toBe(true);
      }
    });

    it('should deny reconnection after max attempts', () => {
      expect(manager.shouldReconnect(10)).toBe(false);
      expect(manager.shouldReconnect(11)).toBe(false);
      expect(manager.shouldReconnect(100)).toBe(false);
    });

    it('should respect custom max attempts', () => {
      const customManager = new ReconnectManager(5, 1000, 30000);

      expect(customManager.shouldReconnect(4)).toBe(true);
      expect(customManager.shouldReconnect(5)).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset attempt counter on successful connection', () => {
      manager.nextAttempt();
      manager.nextAttempt();

      expect(manager.getCurrentAttempt()).toBe(2);

      manager.reset();

      expect(manager.getCurrentAttempt()).toBe(0);
    });

    it('should track successful reconnections', () => {
      manager.nextAttempt();
      manager.nextAttempt();
      manager.reset();

      const stats = manager.getStats();
      expect(stats.successfulReconnects).toBe(1);
      expect(stats.totalAttempts).toBe(2);
    });

    it('should calculate running average of attempts', () => {
      // First reconnection: 2 attempts
      manager.nextAttempt();
      manager.nextAttempt();
      manager.reset();

      // Second reconnection: 3 attempts
      manager.nextAttempt();
      manager.nextAttempt();
      manager.nextAttempt();
      manager.reset();

      const stats = manager.getStats();
      expect(stats.successfulReconnects).toBe(2);
      expect(stats.totalAttempts).toBe(5); // 2 + 3
      expect(stats.averageAttempts).toBe(2.5); // (2 + 3) / 2
    });

    it('should set lastResetAt timestamp', () => {
      manager.nextAttempt();
      manager.reset();

      const stats = manager.getStats();
      expect(stats.lastAttemptAt).toBeDefined();

      const resetTime = new Date(stats.lastAttemptAt!);
      const now = new Date();

      // Should be very recent (within 1 second)
      expect(now.getTime() - resetTime.getTime()).toBeLessThan(1000);
    });
  });

  describe('nextAttempt', () => {
    it('should increment attempt counter', () => {
      expect(manager.getCurrentAttempt()).toBe(0);

      manager.nextAttempt();
      expect(manager.getCurrentAttempt()).toBe(1);

      manager.nextAttempt();
      expect(manager.getCurrentAttempt()).toBe(2);
    });

    it('should return next attempt number', () => {
      const attempt1 = manager.nextAttempt();
      expect(attempt1).toBe(0);

      const attempt2 = manager.nextAttempt();
      expect(attempt2).toBe(1);
    });
  });

  describe('recordFailure', () => {
    it('should record failed reconnection attempts', () => {
      manager.recordFailure();
      manager.recordFailure();

      const stats = manager.getStats();
      expect(stats.failedReconnects).toBe(2);
    });

    it('should update lastAttemptAt', () => {
      manager.recordFailure();

      const stats = manager.getStats();
      expect(stats.lastAttemptAt).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return comprehensive reconnection statistics', () => {
      manager.nextAttempt();
      manager.recordFailure();
      manager.nextAttempt();
      manager.reset();

      const stats = manager.getStats();

      expect(stats).toHaveProperty('totalAttempts');
      expect(stats).toHaveProperty('successfulReconnects');
      expect(stats).toHaveProperty('failedReconnects');
      expect(stats).toHaveProperty('averageAttempts');
    });
  });

  describe('isMaxAttemptsReached', () => {
    it('should return false initially', () => {
      expect(manager.isMaxAttemptsReached()).toBe(false);
    });

    it('should return false before max', () => {
      for (let i = 0; i < 9; i++) {
        manager.nextAttempt();
      }

      expect(manager.isMaxAttemptsReached()).toBe(false);
    });

    it('should return true at max attempts', () => {
      for (let i = 0; i < 10; i++) {
        manager.nextAttempt();
      }

      expect(manager.isMaxAttemptsReached()).toBe(true);
    });

    it('should return true after max', () => {
      for (let i = 0; i < 15; i++) {
        manager.nextAttempt();
      }

      expect(manager.isMaxAttemptsReached()).toBe(true);
    });
  });

  describe('complete reconnection flow', () => {
    it('should handle full reconnection sequence', () => {
      // Start reconnection attempts
      const attempt1 = manager.nextAttempt();
      expect(attempt1).toBe(0);

      const delay1 = manager.getNextDelay(attempt1);
      expect(delay1).toBeLessThanOrEqual(1000);

      manager.recordFailure();

      // Second attempt
      const attempt2 = manager.nextAttempt();
      expect(attempt2).toBe(1);

      const delay2 = manager.getNextDelay(attempt2);
      expect(delay2).toBeLessThanOrEqual(2000);

      // Successful connection
      manager.reset();

      const stats = manager.getStats();
      expect(stats.successfulReconnects).toBe(1);
      expect(stats.totalAttempts).toBe(2);
      expect(stats.failedReconnects).toBe(1);
    });

    it('should eventually give up (QUINN graceful degradation)', () => {
      for (let i = 0; i < 10; i++) {
        expect(manager.shouldReconnect(i)).toBe(true);
        manager.nextAttempt();
        manager.recordFailure();
      }

      // At attempt 10, should give up
      expect(manager.shouldReconnect(10)).toBe(false);

      const stats = manager.getStats();
      expect(stats.failedReconnects).toBe(10);
    });
  });
});
