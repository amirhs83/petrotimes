import { NextResponse } from 'next/server';
import { getHomepageData } from '@/lib/wp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/homepage
 * Serves the assembled homepage data (snapshot source by default, live
 * WordPress REST API when WP_MODE=live). Used by tests and external consumers.
 */
export async function GET() {
  const data = await getHomepageData();
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
