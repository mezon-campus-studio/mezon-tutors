import type { CSSProperties } from 'react';

export type MezonlyLogoProps = {
  variant?: 'fullcolor' | 'inverse' | 'mono-ink' | 'mono-white';
  symbolOnly?: boolean;
  width?: number;
  className?: string;
  style?: CSSProperties;
  /** Use alt="" if the surrounding link already has aria-label="Mezonly". */
  alt?: string;
};

/**
 * MezonlyLogo renders the official turtle logo artwork from public/brand/logos/svg.
 * Keeps the original outlined lettering and precise aspect ratio.
 */
export function MezonlyLogo({
  variant = 'fullcolor',
  symbolOnly = false,
  width,
  className,
  style,
  alt = 'Mezonly',
}: MezonlyLogoProps) {
  const asset = symbolOnly ? 'mark' : 'logo';
  const safeVariant = symbolOnly && variant === 'inverse' ? 'fullcolor' : variant;
  const viewWidth = symbolOnly ? 250 : 840;
  const viewHeight = symbolOnly ? 153 : 184;
  const displayWidth = width ?? (symbolOnly ? 48 : 210);

  return (
    <img
      src={`/brand/logos/svg/mezonly-${asset}-${safeVariant}.svg`}
      alt={alt}
      width={viewWidth}
      height={viewHeight}
      className={className}
      style={{ width: displayWidth, height: 'auto', display: 'block', ...style }}
      decoding="async"
    />
  );
}
