import { readFileSync } from 'fs';
import { join } from 'path';

export const GET = () => {
  const filePath = join(process.cwd(), 'public', 'favicon.svg');
  const svg = readFileSync(filePath, 'utf-8');
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
};
