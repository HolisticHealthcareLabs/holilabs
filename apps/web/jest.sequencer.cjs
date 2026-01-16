/**
 * Minimal Jest test sequencer.
 *
 * Some pnpm workspace layouts can make Jest's default sequencer package
 * (`@jest/test-sequencer`) fail to resolve at runtime. Providing our own
 * sequencer avoids that dependency entirely and keeps test ordering deterministic.
 */

class HoliTestSequencer {
  /**
   * @param {Array<{path: string}>} tests
   */
  sort(tests) {
    return [...tests].sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Support Jest sharding API (no-op unless configured).
   * @param {Array<any>} tests
   * @param {{shardIndex: number, shardCount: number}} options
   */
  shard(tests, options) {
    const { shardIndex, shardCount } = options || {};
    if (!shardIndex || !shardCount) return tests;
    return tests.filter((_t, idx) => idx % shardCount === shardIndex - 1);
  }

  /**
   * Jest expects this to exist; we don't need caching for our use-case.
   */
  cacheResults() {
    // no-op
  }
}

module.exports = HoliTestSequencer;


