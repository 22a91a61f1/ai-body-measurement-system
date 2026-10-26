import { TailorMeasurement } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const NUMERIC_TAILOR_FIELDS: Array<keyof Omit<TailorMeasurement, 'id' | 'name' | 'measurement_date' | 'notes' | 'snapshot_url'>> = [
  'neck',
  'shoulder_width',
  'across_back',
  'across_front',
  'chest',
  'upper_chest',
  'waist',
  'stomach',
  'seat',
  'hip',
  'armhole',
  'bicep',
  'elbow',
  'forearm',
  'wrist',
  'arm_length',
  'sleeve_length',
  'half_sleeve_length',
  'shoulder_to_elbow',
  'shoulder_to_wrist',
  'back_length',
  'front_length',
  'shirt_length',
  'neck_to_waist',
  'waist_to_floor',
  'inseam',
  'outseam',
  'thigh',
  'mid_thigh',
  'knee',
  'calf'
];

/**
 * Validates a tailor measurement record before database write.
 */
export function validateTailorMeasurement(data: Partial<TailorMeasurement>): ValidationResult {
  const errors: Record<string, string> = {};

  // Check customer name
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.name = 'Customer Name is required';
  }

  // Check each numeric measurement field
  NUMERIC_TAILOR_FIELDS.forEach((field) => {
    const val = data[field];
    if (val === undefined || val === null || val === ('' as any)) {
      errors[field] = `${field.replace(/_/g, ' ')} is required`;
    } else {
      const num = Number(val);
      if (isNaN(num)) {
        errors[field] = 'Must be a valid numeric value';
      } else if (num <= 0) {
        errors[field] = 'Must be a positive number (> 0)';
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
