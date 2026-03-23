import { readFileSync } from 'fs';
import { join } from 'path';

export const GET = () => {
  const filePath = join(process.cwd(), 'public', 'site.webmanifest');
  const json = readFileSync(filePath, 'utf-8');
  return new Response(json, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
};
