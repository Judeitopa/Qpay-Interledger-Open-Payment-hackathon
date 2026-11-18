import { handleInterledgerRequest } from '../server/apiRouter.js';

/**
 * Vercel Serverless Function entry point for all /api/interledger/* routes.
 * Reconstructs req.url from Vercel's ?__route=... rewrite while preserving query params.
 */
export default async function handler(req, res) {
  try {
    const parsed = new URL(req.url || '/api/interledger', 'https://vercel.local');
    const rewrittenRoute = parsed.searchParams.get('__route');
    if (rewrittenRoute !== null) {
      parsed.searchParams.delete('__route');
      const remainingQuery = parsed.searchParams.toString();
      const cleanRoute = rewrittenRoute.replace(/^\/+/, '');
      req.url = `/api/interledger/${cleanRoute}${remainingQuery ? `?${remainingQuery}` : ''}`;
    }
  } catch {
    // Keep original req.url if URL parsing fails
  }

  return handleInterledgerRequest(req, res);
}
