import React from 'react';
import type { IconKind } from './weather-logic';

/** Keyframes für alle Symbole, einmal pro Modul eingebunden. Bewusst
 *  langsam und klein gehalten — ein Spiegel soll ruhig wirken, nicht
 *  flackern. Präfix `hsw-` verhindert Kollisionen mit Host/anderen Plugins. */
export const ICON_KEYFRAMES = `
@keyframes hsw-spin { to { transform: rotate(360deg); } }
@keyframes hsw-pulse { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.12); } }
@keyframes hsw-float { 0%, 100% { transform: translateX(-2.5px); } 50% { transform: translateX(2.5px); } }
@keyframes hsw-float-slow { 0%, 100% { transform: translateX(2px); } 50% { transform: translateX(-3px); } }
@keyframes hsw-fall { 0% { transform: translateY(-5px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(12px); opacity: 0; } }
@keyframes hsw-flake { 0% { transform: translate(0, -5px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(4px, 12px); opacity: 0; } }
@keyframes hsw-flash { 0%, 84%, 100% { opacity: 0; } 86% { opacity: 1; } 90% { opacity: 0.25; } 93% { opacity: 1; } }
@keyframes hsw-fog { 0%, 100% { transform: translateX(-4px); opacity: 0.55; } 50% { transform: translateX(4px); opacity: 0.95; } }
@keyframes hsw-twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
.hsw-box { transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: reduce) { .hsw-anim { animation: none !important; } }
`;

const SUN = '#fbbf24';
const MOON = '#fde68a';
const CLOUD = '#e2e8f0';
const CLOUD_DARK = '#94a3b8';
const RAIN = '#60a5fa';
const SNOW = '#f1f5f9';
const BOLT = '#fde047';

function Sun({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <circle r="15" fill={SUN} opacity="0.35" className="hsw-box hsw-anim" style={{ animation: 'hsw-pulse 4s ease-in-out infinite' }} />
      <g className="hsw-box hsw-anim" style={{ animation: 'hsw-spin 40s linear infinite' }}>
        {rays.map((deg) => (
          <line key={deg} x1="0" y1="-14" x2="0" y2="-19" stroke={SUN} strokeWidth="3" strokeLinecap="round" transform={`rotate(${deg})`} />
        ))}
      </g>
      <circle r="10" fill={SUN} />
    </g>
  );
}

function Moon({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <path d="M6 -14 a15 15 0 1 0 8 25 a12 12 0 0 1 -8 -25z" fill={MOON} />
      <circle cx="14" cy="-12" r="1.4" fill={MOON} className="hsw-anim" style={{ animation: 'hsw-twinkle 3s ease-in-out infinite' }} />
      <circle cx="19" cy="-4" r="1" fill={MOON} className="hsw-anim" style={{ animation: 'hsw-twinkle 4s ease-in-out 1s infinite' }} />
    </g>
  );
}

/** Wolke aus drei Kreisen und einem Balken — robuster als ein Pfad mit
 *  Bogensegmenten und sieht in jeder Größe gleich aus. */
function Cloud({ x = 0, y = 0, fill = CLOUD, drift = 'hsw-float 7s ease-in-out infinite' }: { x?: number; y?: number; fill?: string; drift?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="hsw-anim" style={{ animation: drift }}>
        <rect x="12" y="34" width="42" height="15" rx="7.5" fill={fill} />
        <circle cx="25" cy="33" r="10" fill={fill} />
        <circle cx="38" cy="28" r="13" fill={fill} />
      </g>
    </g>
  );
}

function Drops({ count, color = RAIN }: { count: number; color?: string }) {
  const xs = count === 2 ? [26, 42] : [22, 34, 46];
  return (
    <g>
      {xs.map((x, i) => (
        <line
          key={x}
          x1={x}
          y1="48"
          x2={x - 2}
          y2="54"
          stroke={color}
          strokeWidth="2.6"
          strokeLinecap="round"
          className="hsw-anim"
          style={{ animation: `hsw-fall 1.3s linear ${i * 0.35}s infinite` }}
        />
      ))}
    </g>
  );
}

function Flakes() {
  return (
    <g>
      {[22, 34, 46].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy="52"
          r="2.3"
          fill={SNOW}
          className="hsw-anim"
          style={{ animation: `hsw-flake 2.6s ease-in-out ${i * 0.7}s infinite` }}
        />
      ))}
    </g>
  );
}

export function WeatherIcon({ kind, isDay = true, size }: { kind: IconKind; isDay?: boolean; size: string }) {
  let content: React.ReactNode;
  switch (kind) {
    case 'clear':
      content = isDay ? <Sun cx={32} cy={32} /> : <Moon cx={30} cy={34} />;
      break;
    case 'partly':
      content = (
        <>
          {isDay ? <Sun cx={24} cy={24} scale={0.85} /> : <Moon cx={22} cy={26} scale={0.8} />}
          <Cloud x={4} y={4} />
        </>
      );
      break;
    case 'cloudy':
      content = (
        <>
          <Cloud x={-8} y={-9} fill={CLOUD_DARK} drift="hsw-float-slow 9s ease-in-out infinite" />
          <Cloud x={4} y={3} />
        </>
      );
      break;
    case 'fog':
      content = (
        <>
          <Cloud x={0} y={-8} fill={CLOUD_DARK} />
          {[44, 51, 58].map((y, i) => (
            <line
              key={y}
              x1="14"
              y1={y}
              x2="50"
              y2={y}
              stroke={CLOUD}
              strokeWidth="3"
              strokeLinecap="round"
              className="hsw-anim"
              style={{ animation: `hsw-fog ${5 + i}s ease-in-out ${i * 0.8}s infinite` }}
            />
          ))}
        </>
      );
      break;
    case 'drizzle':
      content = (
        <>
          <Cloud fill={CLOUD_DARK} y={-6} />
          <Drops count={2} />
        </>
      );
      break;
    case 'rain':
      content = (
        <>
          <Cloud fill={CLOUD_DARK} y={-6} />
          <Drops count={3} />
        </>
      );
      break;
    case 'snow':
      content = (
        <>
          <Cloud fill={CLOUD} y={-6} />
          <Flakes />
        </>
      );
      break;
    case 'thunder':
      content = (
        <>
          <Cloud fill="#64748b" y={-6} />
          <path
            d="M34 40 L27 52 H33 L30 61 L41 47 H35 L38 40 Z"
            fill={BOLT}
            className="hsw-anim"
            style={{ animation: 'hsw-flash 5s linear infinite' }}
          />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" style={{ overflow: 'visible', flexShrink: 0 }}>
      {content}
    </svg>
  );
}
