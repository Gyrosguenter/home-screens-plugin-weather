export type IconKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

export interface CodeInfo {
  kind: IconKind;
  label: string;
}

/** WMO-Wettercode (Open-Meteo) → Symbolart und deutsche Beschreibung, siehe
 *  https://open-meteo.com/en/docs#weathervariables */
export function describeCode(code: number): CodeInfo {
  if (code === 0) return { kind: 'clear', label: 'Klarer Himmel' };
  if (code === 1) return { kind: 'clear', label: 'Überwiegend klar' };
  if (code === 2) return { kind: 'partly', label: 'Teils bewölkt' };
  if (code === 3) return { kind: 'cloudy', label: 'Bedeckt' };
  if (code === 45 || code === 48) return { kind: 'fog', label: 'Nebel' };
  if (code >= 51 && code <= 57) return { kind: 'drizzle', label: 'Nieselregen' };
  if (code === 61 || code === 80) return { kind: 'rain', label: 'Leichter Regen' };
  if (code === 63 || code === 81) return { kind: 'rain', label: 'Regen' };
  if (code === 65 || code === 82 || code === 66 || code === 67) return { kind: 'rain', label: 'Starker Regen' };
  if (code === 71 || code === 85) return { kind: 'snow', label: 'Leichter Schneefall' };
  if (code === 73 || code === 86) return { kind: 'snow', label: 'Schneefall' };
  if (code === 75 || code === 77) return { kind: 'snow', label: 'Starker Schneefall' };
  if (code >= 95 && code <= 99) return { kind: 'thunder', label: 'Gewitter' };
  return { kind: 'cloudy', label: 'Bewölkt' };
}

export interface CurrentWeather {
  temp: number;
  feelsLike: number | null;
  code: number;
  isDay: boolean;
  wind: number | null;
}

export interface HourPoint {
  /** Volle Stunde, 0–23. */
  hour: number;
  temp: number;
  code: number;
  isDay: boolean;
  precipProbability: number | null;
}

export interface DayPoint {
  /** Kurzer Wochentag, z. B. "Sa.". */
  weekday: string;
  code: number;
  max: number;
  min: number;
  precipProbability: number | null;
}

export interface Forecast {
  current: CurrentWeather;
  todayMax: number | null;
  todayMin: number | null;
  hourly: HourPoint[];
  daily: DayPoint[];
}

/** Antwort von Open-Meteo, nur die verwendeten Felder. */
interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
    is_day?: number[];
    precipitation_probability?: (number | null)[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
  };
}

const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

/** "2026-10-10" → "Sa." ohne Zeitzonenfallen (Datum wird als lokales Datum
 *  der Orts-Zeitzone gelesen, nicht als UTC). */
export function weekdayShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Bereitet die Open-Meteo-Antwort für die Anzeige auf: aktuelle Werte, die
 *  nächsten `hourlyCount` vollen Stunden und die nächsten `dailyCount` Tage
 *  (ohne heute — heute steckt im aktuellen Block). Gibt null zurück, wenn
 *  die Antwort nicht brauchbar ist. */
export function buildForecast(
  data: OpenMeteoResponse | null | undefined,
  hourlyCount: number,
  dailyCount: number,
): Forecast | null {
  const cur = data?.current;
  if (!cur || typeof cur.temperature_2m !== 'number' || typeof cur.weather_code !== 'number') return null;

  const current: CurrentWeather = {
    temp: cur.temperature_2m,
    feelsLike: typeof cur.apparent_temperature === 'number' ? cur.apparent_temperature : null,
    code: cur.weather_code,
    isDay: Number(cur.is_day) === 1,
    wind: typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : null,
  };

  const hourly: HourPoint[] = [];
  const h = data?.hourly;
  if (h?.time && h.temperature_2m && h.weather_code && cur.time) {
    // Zeitstrings sind lokale Ortszeit ("2026-10-10T16:00"); ein
    // Stringvergleich bis zur Stunde genügt und umgeht Zeitzonenumrechnung.
    const currentHour = cur.time.slice(0, 13);
    for (let i = 0; i < h.time.length && hourly.length < hourlyCount; i++) {
      if (h.time[i].slice(0, 13) <= currentHour) continue;
      hourly.push({
        hour: Number(h.time[i].slice(11, 13)),
        temp: h.temperature_2m[i],
        code: h.weather_code[i],
        isDay: h.is_day ? Number(h.is_day[i]) === 1 : true,
        precipProbability: h.precipitation_probability?.[i] ?? null,
      });
    }
  }

  const daily: DayPoint[] = [];
  const d = data?.daily;
  let todayMax: number | null = null;
  let todayMin: number | null = null;
  if (d?.time && d.temperature_2m_max && d.temperature_2m_min && d.weather_code) {
    todayMax = d.temperature_2m_max[0] ?? null;
    todayMin = d.temperature_2m_min[0] ?? null;
    for (let i = 1; i < d.time.length && daily.length < dailyCount; i++) {
      daily.push({
        weekday: weekdayShort(d.time[i]),
        code: d.weather_code[i],
        max: d.temperature_2m_max[i],
        min: d.temperature_2m_min[i],
        precipProbability: d.precipitation_probability_max?.[i] ?? null,
      });
    }
  }

  return { current, todayMax, todayMin, hourly, daily };
}

/** 13.6 → "14°" (ganze Grad, "−" statt "-" für Minuswerte). */
export function formatTemp(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? '−' : ''}${Math.abs(rounded)}°`;
}
