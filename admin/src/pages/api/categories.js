import { categoryChoices } from '../../lib/record.js';
export const prerender = false;
export async function GET() {
  return new Response(JSON.stringify({ categories: categoryChoices() }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}
