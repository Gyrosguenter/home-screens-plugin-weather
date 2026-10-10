import React from 'react';
import type { PluginComponentProps } from './hs-plugin';
import { hostFrameStyle, scalePx } from './host-style';
import { buildForecast, describeCode, formatTemp, type Forecast } from './weather-logic';
import { ICON_KEYFRAMES, WeatherIcon } from './weather-icons';

const PLUGIN_ID = 'weather-animated';
const DEFAULT_LAT = 48.1371;
const DEFAULT_LON = 11.5754;

type PluginFetch = (
  pluginId: string,
  options: { url: string; method?: string; headers?: Record<string, string>; cacheTtlMs?: number },
) => Promise<Response>;

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && value !== '' && value !== null ? n : fallback;
}

/** Holt Aktuell-, Stunden- und Tageswerte in einem Open-Meteo-Aufruf (kostenlos,
 *  ohne API-Key) über den serverseitigen `pluginFetch`-Proxy des Hosts. Bei
 *  einem Fehler bleiben die zuletzt geladenen Werte stehen. */
function useForecast(lat: number, lon: number, hourlyCount: number, dailyCount: number, refreshMs: number) {
  const [forecast, setForecast] = React.useState<Forecast | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const pluginFetch = window.__HS_SDK__?.pluginFetch as PluginFetch | undefined;
        if (!pluginFetch) throw new Error('SDK nicht verfügbar');
        const params = new URLSearchParams({
          latitude: String(lat),
          longitude: String(lon),
          current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m',
          hourly: 'temperature_2m,weather_code,is_day,precipitation_probability',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
          timezone: 'auto',
          forecast_days: String(Math.min(16, dailyCount + 2)),
          wind_speed_unit: 'kmh',
        });
        const res = await pluginFetch(PLUGIN_ID, {
          url: `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
          cacheTtlMs: Math.max(60000, refreshMs - 60000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const built = buildForecast(await res.json(), hourlyCount, dailyCount);
        if (cancelled) return;
        if (built) {
          setForecast(built);
          setFailed(false);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    load();
    const id = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [lat, lon, hourlyCount, dailyCount, refreshMs]);

  return { forecast, failed };
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2em', minWidth: 0 }}>
      {children}
    </div>
  );
}

export default function WeatherAnimatedPlugin({ config, style }: PluginComponentProps) {
  const lat = num(config.latitude, DEFAULT_LAT);
  const lon = num(config.longitude, DEFAULT_LON);
  const hourlyCount = Math.min(12, Math.max(0, Math.round(num(config.hourlyCount, 6))));
  const dailyCount = Math.min(7, Math.max(0, Math.round(num(config.dailyCount, 4))));
  const refreshMs = Math.max(300000, num(config.refreshIntervalMs, 600000));
  const location = typeof config.locationName === 'string' ? config.locationName.trim() : 'München';

  const { forecast, failed } = useForecast(lat, lon, hourlyCount, dailyCount, refreshMs);

  const root: React.CSSProperties = {
    ...hostFrameStyle(style),
    display: 'flex',
    alignItems: 'center',
    gap: '1.4em',
  };

  if (!forecast) {
    return (
      <div style={root}>
        <span style={{ opacity: 0.6, fontSize: '0.9em' }}>
          {failed ? 'Wetterdaten momentan nicht verfügbar' : 'Lade Wetter…'}
        </span>
      </div>
    );
  }

  const { current, todayMax, todayMin, hourly, daily } = forecast;
  const info = describeCode(current.code);
  const range = [
    todayMax !== null ? `↑ ${formatTemp(todayMax)}` : '',
    todayMin !== null ? `↓ ${formatTemp(todayMin)}` : '',
  ]
    .filter(Boolean)
    .join('  ');

  return (
    <div style={root}>
      <style>{ICON_KEYFRAMES}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9em', flexShrink: 0 }}>
        <WeatherIcon kind={info.kind} isDay={current.isDay} size={scalePx(112)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15em' }}>
          {location && <div style={{ fontSize: '0.8em', opacity: 0.7 }}>{location}</div>}
          <div style={{ fontSize: '3.2em', fontWeight: 300, lineHeight: 1 }}>{formatTemp(current.temp)}</div>
          <div style={{ fontSize: '0.95em' }}>{info.label}</div>
          <div style={{ fontSize: '0.75em', opacity: 0.7, whiteSpace: 'nowrap' }}>
            {range}
            {current.feelsLike !== null && `${range ? '  ·  ' : ''}Gefühlt ${formatTemp(current.feelsLike)}`}
          </div>
        </div>
      </div>

      {(hourly.length > 0 || daily.length > 0) && (
        <>
          <div style={{ alignSelf: 'stretch', width: 1, background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.7em' }}>
            {hourly.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hourly.length}, 1fr)`, gap: '0.4em' }}>
                {hourly.map((h) => (
                  <Cell key={h.hour}>
                    <span style={{ fontSize: '0.7em', opacity: 0.7 }}>{h.hour} Uhr</span>
                    <WeatherIcon kind={describeCode(h.code).kind} isDay={h.isDay} size={scalePx(40)} />
                    <span style={{ fontSize: '0.95em', fontWeight: 600 }}>{formatTemp(h.temp)}</span>
                    {h.precipProbability !== null && h.precipProbability >= 30 && (
                      <span style={{ fontSize: '0.65em', color: '#60a5fa' }}>{Math.round(h.precipProbability)} %</span>
                    )}
                  </Cell>
                ))}
              </div>
            )}
            {hourly.length > 0 && daily.length > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
            )}
            {daily.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daily.length}, 1fr)`, gap: '0.4em' }}>
                {daily.map((d) => (
                  <Cell key={d.weekday}>
                    <span style={{ fontSize: '0.75em', opacity: 0.8 }}>{d.weekday}</span>
                    <WeatherIcon kind={describeCode(d.code).kind} isDay size={scalePx(40)} />
                    <span style={{ fontSize: '0.85em' }}>
                      <b style={{ fontWeight: 600 }}>{formatTemp(d.max)}</b>
                      <span style={{ opacity: 0.6 }}> / {formatTemp(d.min)}</span>
                    </span>
                  </Cell>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
