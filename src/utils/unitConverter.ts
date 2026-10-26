import { MeasurementUnit } from '../types';

export function cmToInches(cm: number | undefined | null): number {
  if (cm == null || isNaN(cm)) return 0;
  return Number((cm / 2.54).toFixed(2));
}

export function inchesToCm(inches: number | undefined | null): number {
  if (inches == null || isNaN(inches)) return 0;
  return Number((inches * 2.54).toFixed(1));
}

export function kgToLbs(kg: number | undefined | null): number {
  if (kg == null || isNaN(kg)) return 0;
  return Number((kg * 2.20462).toFixed(1));
}

export function lbsToKg(lbs: number | undefined | null): number {
  if (lbs == null || isNaN(lbs)) return 0;
  return Number((lbs / 2.20462).toFixed(1));
}

export function formatLength(cm: number | undefined | null, unit: MeasurementUnit): string {
  if (cm == null || isNaN(cm)) {
    return unit === 'imperial' ? '0.00 in' : '0.0 cm';
  }
  if (unit === 'imperial') {
    const inches = (Number(cm) / 2.54).toFixed(2);
    return `${inches} in`;
  }
  return `${Number(cm).toFixed(1)} cm`;
}
