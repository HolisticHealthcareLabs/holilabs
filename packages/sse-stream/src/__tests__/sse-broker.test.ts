import { SSEBroker } from '../sse-broker';
import { SSEConnection, SSEEvent } from '../types';

describe('SSEBroker', () => {
  let broker: SSEBroker;

  beforeEach(() => {
    broker = new SSEBroker({
      heartbeatIntervalMs: 5000,
      maxConnectionsPerTenant: 10
    });
  });

  describe('addConnection', () => {
    it('should add a connection for a tenant', () => {
      const conn: SSEConnection = {
        id: 'conn-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        subscribedTypes: ['lab.critical.result'],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'CRITICAL'
      };

      broker.addConnection(conn);
      const stats = broker.getStats();

      expect(stats.totalConnections).toBe(1);
      expect(stats.connectionsByTenant['tenant-1']).toBe(1);
    });

    it('should reject connection without tenantId (CYRUS)', () => {
      const conn: SSEConnection = {
        id: 'conn-1',
        tenantId: '', // CYRUS violation
        userId: 'user-1',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      expect(() => broker.addConnection(conn)).toThrow('tenantId');
    });

    it('should enforce max connections per tenant (CYRUS)', () => {
      const tenantId = 'tenant-1';

      // Add max connections
      for (let i = 0; i < 10; i++) {
        const conn: SSEConnection = {
          id: `conn-${i}`,
          tenantId,
          userId: `user-${i}`,
          subscribedTypes: [],
          connectedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
          priority: 'NORMAL'
        };
        broker.addConnection(conn);
      }

      // Try to exceed
      const conn11: SSEConnection = {
        id: 'conn-11',
        tenantId,
        userId: 'user-11',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      expect(() => broker.addConnection(conn11)).toThrow('Max connections');
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection', () => {
      const conn: SSEConnection = {
        id: 'conn-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      broker.addConnection(conn);
      expect(broker.getStats().totalConnections).toBe(1);

      broker.removeConnection('conn-1');
      expect(broker.getStats().totalConnections).toBe(0);
    });

    it('should not throw when removing non-existent connection (QUINN)', () => {
      // QUINN: graceful degradation
      expect(() => broker.removeConnection('nonexistent')).not.toThrow();
    });
  });

  describe('broadcast', () => {
    it('should broadcast event to all connections for a tenant', async () => {
      const tenantId = 'tenant-1';
      const conn1: SSEConnection = {
        id: 'conn-1',
        tenantId,
        userId: 'user-1',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      const conn2: SSEConnection = {
        id: 'conn-2',
        tenantId,
        userId: 'user-2',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      broker.addConnection(conn1);
      broker.addConnection(conn2);

      const event: SSEEvent = {
        id: 'evt-1',
        type: 'lab.critical.result',
        data: JSON.stringify({ severity: 'CRITICAL' })
      };

      await broker.broadcast(tenantId, event);

      // Both connections should have received the event
      const writes1 = broker.getMockWrites('conn-1');
      const writes2 = broker.getMockWrites('conn-2');

      expect(writes1.length).toBeGreaterThan(0);
      expect(writes2.length).toBeGreaterThan(0);
      expect(writes1[0]).toContain('evt-1');
      expect(writes2[0]).toContain('evt-1');
    });

    it('should enforce tenant isolation (CYRUS)', async () => {
      const conn1: SSEConnection = {
        id: 'conn-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      const conn2: SSEConnection = {
        id: 'conn-2',
        tenantId: 'tenant-2',
        userId: 'user-2',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      broker.addConnection(conn1);
      broker.addConnection(conn2);

      const event: SSEEvent = {
        id: 'evt-1',
        type: 'lab.critical.result',
        data: JSON.stringify({ severity: 'CRITICAL' })
      };

      // Broadcast to tenant-1
      await broker.broadcast('tenant-1', event);

      // Only tenant-1 connection should have received it
      const writes1 = broker.getMockWrites('conn-1');
      const writes2 = broker.getMockWrites('conn-2');

      expect(writes1.length).toBeGreaterThan(0);
      expect(writes2.length).toBe(0); // CYRUS: no cross-tenant broadcast
    });

    it('should filter by subscription type', async () => {
      const tenantId = 'tenant-1';
      const conn1: SSEConnection = {
        id: 'conn-1',
        tenantId,
        userId: 'user-1',
        subscribedTypes: ['lab.critical.result'], // Only interested in lab results
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      broker.addConnection(conn1);

      // Send different event type
      const event: SSEEvent = {
        id: 'evt-1',
        type: 'record.ingested', // Different type
        data: JSON.stringify({})
      };

      await broker.broadcast(tenantId, event);

      // Connection should NOT receive it (not subscribed)
      const writes = broker.getMockWrites('conn-1');
      expect(writes.length).toBe(0);
    });
  });

  describe('broadcastFiltered', () => {
    it('should apply event filter config', async () => {
      const tenantId = 'tenant-1';
      const conn: SSEConnection = {
        id: 'conn-1',
        tenantId,
        userId: 'user-1',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      broker.addConnection(conn);

      const event: SSEEvent = {
        id: 'evt-1',
        type: 'lab.critical.result',
        data: JSON.stringify({ severity: 'CRITICAL' })
      };

      // Filter for only CRITICAL events
      await broker.broadcastFiltered(event, {
        tenantId,
        severityMin: 'CRITICAL'
      });

      const writes = broker.getMockWrites('conn-1');
      expect(writes.length).toBeGreaterThan(0);
    });

    it('should enforce tenant in filter (CYRUS)', async () => {
      expect(() =>
        broker.broadcastFiltered(
          { id: 'evt-1', type: 'test', data: '{}' },
          { tenantId: '' } // Missing tenantId
        )
      ).rejects.toThrow('tenantId');
    });
  });

  describe('disconnectTenant', () => {
    it('should disconnect all connections for a tenant (CYRUS)', () => {
      const tenantId = 'tenant-1';

      for (let i = 0; i < 5; i++) {
        const conn: SSEConnection = {
          id: `conn-${i}`,
          tenantId,
          userId: `user-${i}`,
          subscribedTypes: [],
          connectedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
          priority: 'NORMAL'
        };
        broker.addConnection(conn);
      }

      expect(broker.getStats().totalConnections).toBe(5);

      broker.disconnectTenant(tenantId);

      expect(broker.getStats().totalConnections).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      const conn1: SSEConnection = {
        id: 'conn-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      const conn2: SSEConnection = {
        id: 'conn-2',
        tenantId: 'tenant-2',
        userId: 'user-2',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      broker.addConnection(conn1);
      broker.addConnection(conn2);

      const stats = broker.getStats();

      expect(stats.totalConnections).toBe(2);
      expect(stats.connectionsByTenant['tenant-1']).toBe(1);
      expect(stats.connectionsByTenant['tenant-2']).toBe(1);
      expect(stats.eventsDelivered).toBe(0); // No events sent yet
    });

    it('should track events delivered and dropped', async () => {
      const conn: SSEConnection = {
        id: 'conn-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      broker.addConnection(conn);

      const event: SSEEvent = {
        id: 'evt-1',
        type: 'test.event',
        data: '{}'
      };

      await broker.broadcast('tenant-1', event);

      const stats = broker.getStats();
      expect(stats.eventsDelivered).toBeGreaterThan(0);
    });
  });

  describe('cleanupStaleConnections', () => {
    it('should return number of stale connections removed', () => {
      const conn: SSEConnection = {
        id: 'conn-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        subscribedTypes: [],
        connectedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        priority: 'NORMAL'
      };

      broker.addConnection(conn);

      // In a real scenario, stale would be detected by heartbeat timeout
      // For now, this tests that the method exists and returns a number
      const cleaned = broker.cleanupStaleConnections();
      expect(typeof cleaned).toBe('number');
    });
  });
});
