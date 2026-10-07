import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { compare } from '../lib/analysis.ts';
import type { Report } from '../lib/analysis.ts';

// Replay the saved observations through the same analysis used by the app.
// This verifies arithmetic, not current API coverage or copy intent.
const saved: Report = JSON.parse(readFileSync(new URL('../docs/example.json', import.meta.url), 'utf8'));
const history = (side: 'leader' | 'follower') => ({
  ...saved.coverage[side],
  trades: saved.rows.flatMap(row => row[side]?.trades ?? []),
});
const replay = compare(history('leader'), history('follower'), saved);
assert.equal(replay.comparableCount, saved.comparableCount);
assert.deepEqual(replay.rows, saved.rows);
assert.equal(replay.leaderAverage, saved.leaderAverage);
assert.equal(replay.followerAverage, saved.followerAverage);
assert.equal(replay.gap, saved.gap);
console.log(`Verified saved article example: A ${replay.leaderAverage?.toFixed(4)}%, B ${replay.followerAverage?.toFixed(4)}%, difference ${replay.gap?.toFixed(4)} pp (before fees).`);
