import type { NextApiRequest, NextApiResponse } from 'next';

const IPFS_GATEWAYS = [
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const { cid } = req.query;
  if (!cid || typeof cid !== 'string') {
    return res.status(400).json({ error: 'Missing CID' });
  }

  // Try each gateway in order
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}${cid}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).send(buffer);
    } catch {
      continue;
    }
  }

  return res.status(502).json({ error: 'Failed to fetch from IPFS' });
}
