import { OWN_DOMAINS, SETTINGS, TOP_N } from '../../config/serp.js';

/** True when a result belongs to one of OWN_DOMAINS (or a subdomain of one). */
export const isOwn = (domain) => OWN_DOMAINS.some((own) => domain === own || domain.endsWith(`.${own}`));

/**
 * Compares two rankings for one query+target and returns the changes worth
 * telling someone about. Entries and exits always qualify; a re-ranking only
 * does when it clears `moveThreshold`, unless it is one of our own domains, in
 * which case every position counts.
 */
export function diffRanking(before = [], after = []) {
  const previous = new Map(before.map((r) => [r.domain, r.position]));
  const current = new Map(after.map((r) => [r.domain, r.position]));
  const changes = [];

  for (const { domain, position, url, title } of after) {
    const was = previous.get(domain);
    if (was === undefined) {
      changes.push({ type: 'entered', domain, to: position, url, title, own: isOwn(domain) });
    } else if (was !== position) {
      const move = Math.abs(was - position);
      if (move >= SETTINGS.moveThreshold || isOwn(domain)) {
        changes.push({ type: was > position ? 'up' : 'down', domain, from: was, to: position, move, url, title, own: isOwn(domain) });
      }
    }
  }

  for (const { domain, position } of before) {
    if (!current.has(domain)) changes.push({ type: 'left', domain, from: position, own: isOwn(domain) });
  }

  /* Own domains first, then the biggest moves — the notification is read top
     down and often only the first lines are read at all. */
  return changes.sort((a, b) => Number(b.own) - Number(a.own) || (b.move ?? TOP_N) - (a.move ?? TOP_N));
}

const arrow = { entered: '🆕', left: '❌', up: '🔼', down: '🔽' };

export function formatChange(change) {
  const mark = `${arrow[change.type]}${change.own ? ' ★' : ''}`;
  if (change.type === 'entered') return `${mark} ${change.domain} — вошёл на #${change.to}`;
  if (change.type === 'left') return `${mark} ${change.domain} — выпал из топ-${TOP_N} (был #${change.from})`;
  return `${mark} ${change.domain} — #${change.from} → #${change.to}`;
}

/** The notification body: only queries that actually changed, own domains first. */
export function formatReport(entries, { date }) {
  const lines = [`*Google SERP — изменения за ${date}*`];
  for (const entry of entries) {
    lines.push('', `*${entry.query}* · ${entry.targetLabel}`);
    if (entry.error) {
      lines.push(`⚠️ скан не удался: ${entry.error}`);
      continue;
    }
    for (const change of entry.changes) lines.push(formatChange(change));
  }
  return lines.join('\n');
}
