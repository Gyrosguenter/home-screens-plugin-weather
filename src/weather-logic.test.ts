import { describe, expect, it } from 'vitest';
import { buildForecast, describeCode, formatTemp, weekdayShort } from './weather-logic';

describe('describeCode', () => {
  it('ordnet WMO-Codes Symbolart und Beschreibung zu', () => {
    expect(describeCode(0)).toEqual({ kind: 'clear', label: 'Klarer Himmel' });
    expect(describeCode(2).kind).toBe('partly');
    expect(describeCode(3).kind).toBe('cloudy');
    expect(describeCode(45).kind).toBe('fog');
    expect(describeCode(53).kind).toBe('drizzle');
    expect(describeCode(63)).toEqual({ kind: 'rain', label: 'Regen' });
    expect(describeCode(81).kind).toBe('rain');
    expect(describeCode(73)).toEqual({ kind: 'snow', label: 'Schneefall' });
    expect(describeCode(95).kind).toBe('thunder');
  });
  it('unbekannte Codes → bewölkt', () => {
    expect(describeCode(42).kind).toBe('cloudy');
  });
});

describe('weekdayShort', () => {
  it('liest das Datum ohne Zeitzonenverschiebung', () => {
    expect(weekdayShort('2026-10-10')).toBe('Sa.');
    expect(weekdayShort('2026-10-11')).toBe('So.');
    expect(weekdayShort('2026-10-12')).toBe('Mo.');
  });
});

describe('formatTemp', () => {
  it('rundet und nutzt echtes Minuszeichen', () => {
    expect(formatTemp(13.6)).toBe('14°');
    expect(formatTemp(-0.4)).toBe('0°');
    expect(formatTemp(-3.2)).toBe('−3°');
  });
});

const sample = {
  current: { time: '2026-10-10T16:45', temperature_2m: 14.2, apparent_temperature: 12.1, weather_code: 3, is_day: 1, wind_speed_10m: 9 },
  hourly: {
    time: ['2026-10-10T15:00', '2026-10-10T16:00', '2026-10-10T17:00', '2026-10-10T18:00', '2026-10-10T19:00'],
    temperature_2m: [15, 14, 13, 12, 11],
    weather_code: [3, 3, 61, 61, 0],
    is_day: [1, 1, 1, 0, 0],
    precipitation_probability: [0, 10, 60, 70, null],
  },
  daily: {
    time: ['2026-10-10', '2026-10-11', '2026-10-12'],
    weather_code: [3, 61, 0],
    temperature_2m_max: [16, 12, 18],
    temperature_2m_min: [8, 6, 5],
    precipitation_probability_max: [20, 80, 0],
  },
};

describe('buildForecast', () => {
  it('liefert aktuelle Werte', () => {
    const f = buildForecast(sample, 3, 2)!;
    expect(f.current).toEqual({ temp: 14.2, feelsLike: 12.1, code: 3, isDay: true, wind: 9 });
    expect(f.todayMax).toBe(16);
    expect(f.todayMin).toBe(8);
  });

  it('nimmt als Stunden erst die nach der aktuellen vollen Stunde', () => {
    const f = buildForecast(sample, 3, 2)!;
    expect(f.hourly.map((h) => h.hour)).toEqual([17, 18, 19]);
    expect(f.hourly[0]).toMatchObject({ temp: 13, code: 61, isDay: true, precipProbability: 60 });
    expect(f.hourly[2].precipProbability).toBeNull();
    expect(f.hourly[1].isDay).toBe(false);
  });

  it('begrenzt die Stundenzahl', () => {
    expect(buildForecast(sample, 2, 2)!.hourly).toHaveLength(2);
  });

  it('Tage ohne heute', () => {
    const f = buildForecast(sample, 3, 5)!;
    expect(f.daily.map((d) => d.weekday)).toEqual(['So.', 'Mo.']);
    expect(f.daily[0]).toMatchObject({ code: 61, max: 12, min: 6, precipProbability: 80 });
  });

  it('unbrauchbare Antwort → null', () => {
    expect(buildForecast(null, 3, 3)).toBeNull();
    expect(buildForecast({}, 3, 3)).toBeNull();
  });
});
