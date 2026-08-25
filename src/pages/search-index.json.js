import { searchIndex } from '../lib/apps.js';

/* Emitted once per language build and fetched lazily by the search box. */
export function GET() {
  return new Response(JSON.stringify(searchIndex()), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600'
    }
  });
}
