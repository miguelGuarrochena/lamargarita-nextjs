interface DaisySprigProps {
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

/** Pequeño daisy/flor para cada cabeza del ramito. */
const Bloom = ({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) => {
  const petals = Array.from({ length: 9 }, (_, i) => i * 40);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {petals.map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy="-9"
          rx="3.1"
          ry="6.6"
          fill="#fffdfb"
          stroke="#f3e6d6"
          strokeWidth="0.7"
          transform={`rotate(${a})`}
        />
      ))}
      <circle cx="0" cy="0" r="4.6" fill="#f7cf6b" stroke="#eab94a" strokeWidth="0.8" />
    </g>
  );
};

/**
 * Ramito decorativo de margaritas con tallos y hojas, en tonos pastel.
 * Pensado como adorno (firulete floral), sin interacción.
 */
export const DaisySprig = ({ size = 120, style, className }: DaisySprigProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={style}
      className={className}
    >
      {/* Tallos */}
      <path d="M60 116 C 58 90, 44 74, 36 48" stroke="#a9cf95" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M60 116 C 62 92, 74 78, 84 56" stroke="#a9cf95" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M60 116 C 60 96, 60 82, 60 62" stroke="#a9cf95" strokeWidth="2.4" strokeLinecap="round" />

      {/* Hojas */}
      <path d="M48 84 C 38 80, 32 84, 28 92 C 38 92, 46 90, 48 84 Z" fill="#bcd9a8" />
      <path d="M72 88 C 82 82, 90 86, 94 94 C 84 94, 76 94, 72 88 Z" fill="#bcd9a8" />
      <path d="M60 92 C 54 86, 50 86, 46 90 C 52 94, 58 96, 60 92 Z" fill="#c7e0b4" />

      {/* Flores */}
      <Bloom x={36} y={44} scale={1.05} />
      <Bloom x={84} y={52} scale={0.92} />
      <Bloom x={60} y={58} scale={1.15} />
    </svg>
  );
};
