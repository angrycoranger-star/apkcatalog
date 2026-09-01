#!/usr/bin/env node
/**
 * Scrapes the Google top-10 for every configured query × geo, compares it with
 * the previous run and reports what moved.
 *
 *   node scripts/serp-monitor.js              # scan, diff, notify, save
 *   node scripts/serp-monitor.js --dry-run    # scan and print, save nothing
 *   node scripts/serp-monitor.js --query "apk indir" --target tr
 *
 * State lives in data/serp/: latest.json is the current ranking, history/ keeps
 * one snapshot per run so a position can be traced back over time.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { QUERIES, SETTINGS, TARGETS, TOP_N } from '../config/serp.js';
import { BlockedError, randomInt, scan } from './lib/serp.js';
import { diffRanking, formatReport } from './lib/serp-diff.js';
import { notifyJobSummary, notifyTelegram } from './lib/serp-notify.js';
import { ROOT } from './lib/util.js';

const SERP_DIR = path.join(ROOT, 'data', 'serp');
const LATEST = path.join(SERP_DIR, 'latest.json');

function parseArgs(argv) {
  const args = { dryRun: false, query: null, target: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--query') args.query = argv[++i];
    else if (argv[i] === '--target') args.target = argv[++i];
  }
  return args;
}

/** Every query × target pair to scan, after the CLI filters. */
function plan({ query, target }) {
  const jobs = [];
  for (const entry of QUERIES) {
    if (query && entry.q !== query) continue;
    for (const t of TARGETS) {
      if (target && t.id !== target) continue;
      if (entry.targets && !entry.targets.includes(t.id)) continue;
      jobs.push({ key: `${t.id}|${entry.q}`, query: entry.q, target: t });
    }
  }
  return jobs;
}

async function readLatest() {
  try {
    return JSON.parse(await readFile(LATEST, 'utf8'));
  } catch {
    return { scans: {} };
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const jobs = plan(args);
  if (!jobs.length) {
    console.error('Nothing to scan — check config/serp.js or the --query/--target filters.');
    process.exitCode = 1;
    return;
  }

  const previous = await readLatest();
  const now = new Date();
  const scans = {};
  const reportable = [];
  let blocked = 0;

  for (const [index, job] of jobs.entries()) {
    if (index) await delay(randomInt(...SETTINGS.delayMs));

    const before = previous.scans?.[job.key]?.results ?? [];
    process.stderr.write(`[${index + 1}/${jobs.length}] ${job.target.id} · ${job.query} … `);

    try {
      const results = await scan(job.target, job.query);
      console.error(`${results.length} results`);
      scans[job.key] = { query: job.query, target: job.target.id, scannedAt: now.toISOString(), results };

      /* A first-ever scan has nothing to compare against — record it as the
         baseline rather than announcing ten "new" entries. */
      const changes = before.length ? diffRanking(before, results) : [];
      if (changes.length) reportable.push({ ...job, targetLabel: job.target.label, changes });
    } catch (error) {
      blocked++;
      console.error(`FAILED: ${error.message}`);
      /* Keep the last good ranking so tomorrow diffs against real data. */
      scans[job.key] = {
        ...(previous.scans?.[job.key] ?? { query: job.query, target: job.target.id, results: [] }),
        error: error.message,
        failedAt: now.toISOString()
      };
      if (error instanceof BlockedError) {
        reportable.push({ ...job, targetLabel: job.target.label, error: error.message });
      }
    }
  }

  const date = now.toISOString().slice(0, 10);
  const snapshot = { generatedAt: now.toISOString(), topN: TOP_N, scans: { ...previous.scans, ...scans } };

  if (args.dryRun) {
    console.log(JSON.stringify({ snapshot, reportable }, null, 2));
    return;
  }

  await mkdir(path.join(SERP_DIR, 'history'), { recursive: true });
  await writeFile(LATEST, `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeFile(path.join(SERP_DIR, 'history', `${date}.json`), `${JSON.stringify(snapshot, null, 2)}\n`);

  if (!reportable.length) {
    console.error('No changes worth reporting.');
    await notifyJobSummary(`Google SERP ${date}: без изменений (${jobs.length} проверок).`);
    return;
  }

  const report = formatReport(reportable, { date });
  await notifyJobSummary(report);
  const sent = await notifyTelegram(report);
  console.error(sent ? 'Notification sent to Telegram.' : 'TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID unset — report not pushed.');
  console.log(report);

  /* Every scan challenged means the scraper is blocked, not that the SERP is
     quiet — fail the run so it is visible rather than looking like a no-op. */
  if (blocked === jobs.length) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
