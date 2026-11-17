import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/newsletter
 *
 * Proxies newsletter subscriptions to the external content backend (which may
 * be implemented in any language). Configuration:
 *  - NEWSLETTER_API_URL      absolute URL of the upstream subscribe endpoint
 *                            (falls back to CONTENT_API_BASE_URL + /newsletter)
 *  - CONTENT_API_TOKEN       optional, sent as `Authorization: Bearer <token>`
 *
 * Upstream contract (see docs/API-CONTRACT.md):
 *   POST {base}/newsletter   body: { "email": "..." }
 *   → 2xx on success, 4xx/5xx on failure
 *
 * Without an upstream configured this endpoint reports NOT IMPLEMENTED (501)
 * and the UI keeps working — submissions are simply not persisted.
 */
export async function POST(request: Request) {
  const explicit = process.env.NEWSLETTER_API_URL;
  const base = process.env.CONTENT_API_BASE_URL;
  const upstream = explicit ?? (base ? `${base.replace(/\/+$/, '')}/newsletter` : null);
  if (!upstream) {
    return NextResponse.json(
      {
        ok: false,
        implemented: false,
        message:
          'Newsletter submission requires an upstream endpoint. Configure NEWSLETTER_API_URL or CONTENT_API_BASE_URL to enable it.',
      },
      { status: 501 }
    );
  }
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, message: 'A valid email is required.' }, { status: 400 });
    }
    const token = process.env.CONTENT_API_TOKEN;
    const res = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email }),
    });
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, message: 'Upstream error' }, { status: 502 });
  }
}
