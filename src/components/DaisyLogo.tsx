interface DaisyLogoProps {
  size?: number;
  /** 'mark' = icono con fondo (navbar, auth). 'flower' = solo la flor. */
  variant?: 'mark' | 'flower';
}

const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Logo de La Margarita — margarita refinada, 8 pétalos, centro dorado.
 */
export const DaisyLogo = ({ size = 40, variant = 'mark' }: DaisyLogoProps) => {
  const isMark = variant === 'mark';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="La Margarita"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="lm-bg" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a8f76" />
          <stop offset="1" stopColor="#22a88c" />
        </linearGradient>
        <radialGradient id="lm-center" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 32) scale(9)">
          <stop stopColor="#f8c96a" />
          <stop offset="1" stopColor="#e8a832" />
        </radialGradient>
        <filter id="lm-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#0d3d32" floodOpacity="0.18" />
        </filter>
      </defs>

      {isMark && (
        <>
          <rect width="64" height="64" rx="16" fill="url(#lm-bg)" />
          <rect
            x="0.5"
            y="0.5"
            width="63"
            height="63"
            rx="15.5"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />
        </>
      )}

      <g transform="translate(32 32)" filter={isMark ? 'url(#lm-soft)' : undefined}>
        {PETAL_ANGLES.map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-14"
            rx="5.2"
            ry="11"
            fill="#ffffff"
            fillOpacity={0.97}
            transform={`rotate(${a})`}
          />
        ))}
        <circle r="9" fill="url(#lm-center)" />
        <circle r="9" fill="none" stroke="#d4921f" strokeWidth="0.8" strokeOpacity="0.5" />
        <circle r="3.2" fill="#f5e6b8" fillOpacity="0.55" />
      </g>
    </svg>
  );
};
