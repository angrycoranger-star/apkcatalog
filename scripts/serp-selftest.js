#!/usr/bin/env node
/**
 * Offline check of the SERP parser and the change detector — no network.
 * The fixture mirrors the shape of a Google result page (ads, organic hits with
 * an <h3> inside the anchor, /url? redirects, non-result anchors), so it guards
 * the parsing rules; it cannot guarantee Google's live markup still matches.
 *
 * Usage: npm run serp:selftest
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseResults } from './lib/serp.js';
import { diffRanking, formatChange } from './lib/serp-diff.js';
import { ROOT } from './lib/util.js';

const html = await readFile(path.join(ROOT, 'scripts', 'fixtures', 'serp-page.html'), 'utf8');
const results = parseResults(html);

assert.deepEqual(
  results.map((r) => `${r.position}:${r.domain}`),
  ['1:apk4orge.com', '2:apkpure.com', '3:apkmirror.com', '4:f-droid.org'],
  'organic results, in order, ads and non-result anchors excluded'
);
assert.equal(results[0].url, 'https://apk4orge.com/', '/url? redirects are unwrapped');
assert.equal(results[1].title, 'APKPure — Download APK', 'titles are entity-decoded');

const changes = diffRanking(
  [
    { domain: 'apk4orge.com', position: 1 },
    { domain: 'apkpure.com', position: 2 },
    { domain: 'gone.example', position: 3 }
  ],
  results
);
const kinds = Object.fromEntries(changes.map((c) => [c.domain, c.type]));
assert.equal(kinds['gone.example'], 'left', 'a domain missing from the new top-N is reported as left');
assert.equal(kinds['apkmirror.com'], 'entered', 'a domain new to the top-N is reported as entered');
assert.equal(kinds['apk4orge.com'], undefined, 'an own domain that held its position is not reported');
assert.ok(!('apkpure.com' in kinds), 'a sub-threshold move on a foreign domain is filtered as noise');

const moved = diffRanking([{ domain: 'apk4orge.com', position: 1 }], [{ domain: 'apk4orge.com', position: 2 }]);
assert.equal(moved[0].type, 'down', 'any move on an own domain is reported, however small');
assert.match(formatChange(moved[0]), /apk4orge\.com — #1 → #2/);

console.log('serp self-test passed');
