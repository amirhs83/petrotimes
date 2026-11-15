import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/newsletter
 * Proxies newsletter subscriptions to the WordPress Contact Form 7 endpoint
 * when WP_BASE_URL is configured. Without a WordPress backend this endpoint
 * honestly reports NOT IMPLEMENTED — the live site's CF7 form is the real
 * submission target (see LIMITATIONS.md §8).
 */
export async function POST(request: Request) {
  const baseUrl = process.env.WP_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      {
        ok: false,
        implemented: false,
        message:
          'Newsletter submission requires the WordPress backend (Contact Form 7). Configure WP_BASE_URL to enable it.',
      },
      { status: 501 }
    );
  }
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email) {
      return NextResponse.json({ ok: false, message: 'Email is required.' }, { status: 400 });
    }
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/wp-json/contact-form-7/v1/contact-forms/feeds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, message: 'Upstream error' }, { status: 502 });
  }
}
