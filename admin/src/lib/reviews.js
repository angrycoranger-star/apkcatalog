import { randomBytes } from 'node:crypto';
import { put, list } from '@vercel/blob';

/**
 * Visitor reviews (a comment + a 1–5 rating) kept as one small JSON blob per
 * app: reviews/<slug>.json = { slug, comments: [{ id, name, text, rating, at }] }.
 * Reads list+fetch the blob; writes read-modify-put it. Good enough for a young,
 * low-traffic catalog — a busier one would want an atomic store (KV/Postgres).
 */
const PREFIX = 'reviews/';
const MAX_NAME = 40;
const MAX_TEXT = 1000;
const MAX_PER_SLUG = 500;

function keyFor(slug) {
  return `${PREFIX}${slug}.json`;
}

/** Clean, bounded values or throw. A rating is required; text/name optional. */
export function validateSubmission({ name, text, rating }) {
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) throw new Error('rating must be an integer 1–5');
  const cleanText = String(text ?? '').trim().slice(0, MAX_TEXT);
  const cleanName = String(name ?? '').trim().slice(0, MAX_NAME);
  return { rating: r, text: cleanText, name: cleanName };
}

async function readStore(slug) {
  const { blobs } = await list({ prefix: keyFor(slug), limit: 1 });
  const hit = blobs.find((b) => b.pathname === keyFor(slug));
  if (!hit) return { slug, comments: [] };
  try {
    const res = await fetch(hit.url, { cache: 'no-store' });
    if (!res.ok) return { slug, comments: [] };
    const data = await res.json();
    return { slug, comments: Array.isArray(data.comments) ? data.comments : [] };
  } catch {
    return { slug, comments: [] };
  }
}

async function writeStore(store) {
  await put(keyFor(store.slug), JSON.stringify(store), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0
  });
}

/** Average rating + count over the stored comments. */
export function aggregate(comments) {
  const rated = comments.filter((c) => typeof c.rating === 'number');
  if (!rated.length) return { average: null, count: 0 };
  const sum = rated.reduce((a, c) => a + c.rating, 0);
  return { average: Math.round((sum / rated.length) * 10) / 10, count: rated.length };
}

/** Public view: newest first, only the fields a page renders. */
export async function getReviews(slug) {
  const store = await readStore(slug);
  const comments = [...store.comments].sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  return {
    slug,
    rating: aggregate(store.comments),
    comments: comments.map((c) => ({ id: c.id, name: c.name || '', text: c.text || '', rating: c.rating, at: c.at }))
  };
}

/** Append a submission and return the fresh public view. */
export async function addReview(slug, submission) {
  const clean = validateSubmission(submission);
  const store = await readStore(slug);
  const comment = {
    id: randomBytes(8).toString('hex'),
    name: clean.name,
    text: clean.text,
    rating: clean.rating,
    at: new Date().toISOString()
  };
  store.comments.push(comment);
  if (store.comments.length > MAX_PER_SLUG) store.comments = store.comments.slice(-MAX_PER_SLUG);
  await writeStore(store);
  return {
    slug,
    rating: aggregate(store.comments),
    comment: { id: comment.id, name: comment.name, text: comment.text, rating: comment.rating, at: comment.at }
  };
}

/** Moderation: drop one comment by id. */
export async function deleteReview(slug, id) {
  const store = await readStore(slug);
  const before = store.comments.length;
  store.comments = store.comments.filter((c) => c.id !== id);
  if (store.comments.length === before) throw new Error('no such comment');
  await writeStore(store);
  return { ok: true, slug, id };
}

/** Moderation feed: newest comments across every app, for the admin screen. */
export async function listRecentReviews(limit = 100) {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  const out = [];
  for (const b of blobs) {
    try {
      const res = await fetch(b.url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      for (const c of data.comments || []) {
        out.push({ slug: data.slug, id: c.id, name: c.name || '', text: c.text || '', rating: c.rating, at: c.at });
      }
    } catch {
      /* skip unreadable blob */
    }
  }
  out.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  return out.slice(0, limit);
}
