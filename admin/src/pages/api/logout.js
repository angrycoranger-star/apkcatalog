import { clearCookieHeader } from '../../lib/auth.js';
export const prerender = false;
export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': clearCookieHeader() }
  });
}
