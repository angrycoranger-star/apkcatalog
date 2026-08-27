import { handleUpload } from '@vercel/blob/client';
import { isAuthed } from '../../lib/auth.js';

export const prerender = false;

/**
 * Issues short-lived client-upload tokens so the browser can send large APKs
 * and screenshots straight to Vercel Blob — bypassing the ~4.5 MB function
 * request limit. The token is only granted to an authenticated owner.
 */
export async function POST({ request }) {
  const authed = isAuthed(request);
  const body = await request.json();
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!authed) throw new Error('unauthorized');
        const apk = pathname.toLowerCase().endsWith('.apk');
        return {
          allowedContentTypes: apk
            ? ['application/vnd.android.package-archive', 'application/octet-stream']
            : ['image/png', 'image/jpeg', 'image/webp'],
          maximumSizeInBytes: apk ? 512 * 1024 * 1024 : 8 * 1024 * 1024,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => {}
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
}
