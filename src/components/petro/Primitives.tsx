import type { ReactNode } from 'react';

/** ts-icons glyph (SmartMag icon font, v3.2 codepoints) */
export function Tsi({ code, className = '', label }: { code: string; className?: string; label?: string }) {
  return (
    <i
      className={`pt-icon ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    >
      {String.fromCodePoint(parseInt(code, 16))}
    </i>
  );
}

export const Icons = {
  search: 'f002',
  times: 'f00d',
  play: 'f04b',
  angleLeft: 'f104',
  angleRight: 'f105',
  envelopeO: 'f003',
  facebook: 'f09a',
  twitter: 'e90a',
  youtubePlay: 'f16a',
  telegram: 'e903',
  instagram: 'f16d',
  linkedin: 'f0e1',
  pictureO: 'f03e',
} as const;

export type IconName = keyof typeof Icons;

export function Icon({ name, className = '', label }: { name: IconName; className?: string; label?: string }) {
  return <Tsi code={Icons[name]} className={className} label={label} />;
}

/** category chip (نفت / بین الملل / magazine …) */
export function CategoryChip({ label, href }: { label: string; href: string | null }) {
  const cls = 'pt-cat-chip';
  if (!href) return <span className={cls}>{label}</span>;
  return (
    <a href={href} className={cls} rel="category">
      {label}
    </a>
  );
}

/** meta row: category — date (the — separator is drawn by CSS ::before) */
export function PostMeta({
  category,
  categoryUrl,
  dateText,
  variant = 'light',
  above = false,
}: {
  category: string | null;
  categoryUrl: string | null;
  dateText: string;
  variant?: 'light' | 'dark';
  above?: boolean;
}) {
  return (
    <div className={`pt-post-meta ${variant === 'dark' ? 'pt-meta-dark' : ''}`}>
      {above && category ? (
        <div className="meta-above">
          <span className="meta-item cat-labels">
            <CategoryChip label={category} href={categoryUrl} />
          </span>
        </div>
      ) : null}
      <div className="meta-below meta-below-row">
        {category && !above ? (
          <span className="meta-item post-cat">
            <a href={categoryUrl ?? '#'} className="post-cat-link" rel="category">
              {category}
            </a>
          </span>
        ) : null}
        <span className="meta-item date">
          <span className="date-link">
            <time className="post-date">{dateText}</time>
          </span>
        </span>
      </div>
    </div>
  );
}

export function MetaSlot({ children }: { children: ReactNode }) {
  return <div className="meta-below meta-below-row">{children}</div>;
}
