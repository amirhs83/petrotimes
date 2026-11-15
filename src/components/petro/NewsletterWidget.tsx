'use client';

import { useState } from 'react';
import type { NewsletterData } from '@/lib/wp';
import { Icon } from './Primitives';

/**
 * Newsletter widget — real form behavior: client-side email validation,
 * submission goes to /api/newsletter which proxies to the site's Contact
 * Form 7 endpoint when a WordPress backend is configured (WP_BASE_URL).
 * Without a backend the API answers 501 and the message is shown honestly.
 */
export function NewsletterWidget({ data }: { data: NewsletterData }) {
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !agree) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus('ok');
        setMessage('Thank you for subscribing.');
      } else {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setStatus('error');
        setMessage(body?.message ?? 'Subscription is not available in this environment.');
      }
    } catch {
      setStatus('error');
      setMessage('Subscription request failed.');
    }
  }

  return (
    <div className="pt-newsletter" data-testid="newsletter">
      <div className="inner">
        <div className="mail-bg-icon">
          <Icon name="envelopeO" />
        </div>
        <h3 className="heading">{data.heading}</h3>
        <div className="message">
          <p>{data.text}</p>
        </div>
        <form method="post" className="form fields-style fields-full" onSubmit={handleSubmit} noValidate={false}>
          <div className="main-fields">
            <p className="field-email">
              <input
                type="email"
                name="EMAIL"
                placeholder={data.placeholder}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label={data.placeholder}
              />
            </p>
            <p className="field-submit">
              <input type="submit" value={data.button} disabled={status === 'sending'} />
            </p>
          </div>
          <p className="disclaimer">
            <label>
              <input
                type="checkbox"
                name="privacy"
                required
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              {data.disclaimer} <a href="#">{data.disclaimerLink}</a> agreement.
            </label>
          </p>
        </form>
        {status === 'ok' || status === 'error' ? (
          <p className={`pt-newsletter-status ${status === 'ok' ? 'is-ok' : 'is-error'}`} role="status">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
