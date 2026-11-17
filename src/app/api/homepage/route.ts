import { NextResponse } from 'next/server';
import { getHomepageData } from '@/lib/content';

export const dynamic = 'force-dynamic';

/**
 * GET /api/homepage
 * Serves the assembled homepage data (snapshot source by default, external
 * content backend when CONTENT_API_MODE=remote). Used by tests and external
 * consumers.
 */
export async function GET() {
  const data = await getHomepageData();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
