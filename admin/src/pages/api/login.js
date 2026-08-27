import { passwordMatches, issueToken, cookieHeader } from '../../lib/auth.js';

export const prerender = false;

export async function POST({ request }) {
  let password = '';
  try {
    ({ password = '' } = await request.json());
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  if (!passwordMatches(password)) {
    return json({ error: 'invalid password' }, 401);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': cookieHeader(issueToken()) }
  });
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
