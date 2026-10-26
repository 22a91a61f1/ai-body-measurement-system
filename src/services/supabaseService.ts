import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TailorMeasurement } from '../types';

const metaEnv = (import.meta as any).env || {};
const SUPABASE_URL = metaEnv.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const SUPABASE_ANON_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  metaEnv.VITE_SUPABASE_URL &&
  metaEnv.VITE_SUPABASE_ANON_KEY &&
  !String(metaEnv.VITE_SUPABASE_URL).includes('placeholder') &&
  !String(metaEnv.VITE_SUPABASE_ANON_KEY).includes('placeholder')
);

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOCAL_STORAGE_KEY = 'tailor_measurements_db';

/**
 * Helper to get local backup database records
 */
export function getLocalRecords(): TailorMeasurement[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return [];
}

/**
 * Helper to save local backup database records
 */
export function saveLocalRecords(records: TailorMeasurement[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

/**
 * Fetch all tailor measurements from Supabase tailor_measurements table
 */
export async function fetchTailorMeasurementsFromSupabase(): Promise<TailorMeasurement[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('tailor_measurements')
        .select('*')
        .order('measurement_date', { ascending: false });

      if (!error && data) {
        saveLocalRecords(data as TailorMeasurement[]);
        return data as TailorMeasurement[];
      }
      if (error) {
        console.warn('Supabase fetch error, using local database cache:', error.message);
      }
    } catch (e) {
      console.warn('Supabase connection error:', e);
    }
  }

  return getLocalRecords();
}

/**
 * Insert new tailor measurement into Supabase tailor_measurements table
 */
export async function insertTailorMeasurementToSupabase(
  measurement: Partial<TailorMeasurement> & Omit<TailorMeasurement, 'measurement_date'>,
  explicitId?: string
): Promise<TailorMeasurement> {
  const newId = explicitId || measurement.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tailor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const now = measurement.measurement_date || new Date().toISOString();

  const recordToInsert: TailorMeasurement = {
    ...(measurement as TailorMeasurement),
    id: newId,
    measurement_date: now
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('tailor_measurements')
        .insert([recordToInsert])
        .select()
        .single();

      if (!error && data) {
        const saved = data as TailorMeasurement;
        const local = getLocalRecords();
        saveLocalRecords([saved, ...local.filter(r => r.id !== saved.id)]);
        return saved;
      }
      if (error) {
        console.warn('Supabase insert warning, saving to local store:', error.message);
      }
    } catch (e) {
      console.warn('Supabase insert exception:', e);
    }
  }

  // Fallback to local persistence
  const local = getLocalRecords();
  const updated = [recordToInsert, ...local.filter(r => r.id !== recordToInsert.id)];
  saveLocalRecords(updated);
  return recordToInsert;
}

/**
 * Update existing tailor measurement in Supabase tailor_measurements table
 */
export async function updateTailorMeasurementInSupabase(
  id: string,
  updates: Partial<TailorMeasurement>
): Promise<TailorMeasurement> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('tailor_measurements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const updatedRecord = data as TailorMeasurement;
        const local = getLocalRecords();
        saveLocalRecords(local.map(r => r.id === id ? updatedRecord : r));
        return updatedRecord;
      }
      if (error) {
        console.warn('Supabase update warning:', error.message);
      }
    } catch (e) {
      console.warn('Supabase update exception:', e);
    }
  }

  const local = getLocalRecords();
  let foundRecord: TailorMeasurement | null = null;
  const updatedList = local.map(r => {
    if (r.id === id) {
      foundRecord = { ...r, ...updates };
      return foundRecord;
    }
    return r;
  });

  if (!foundRecord) {
    foundRecord = { ...(updates as TailorMeasurement), id };
    updatedList.unshift(foundRecord);
  }

  saveLocalRecords(updatedList);
  return foundRecord;
}

/**
 * Delete tailor measurement from Supabase tailor_measurements table
 */
export async function deleteTailorMeasurementFromSupabase(id: string): Promise<boolean> {
  let success = true;
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('tailor_measurements')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase delete warning:', error.message);
        success = false;
      }
    } catch (e) {
      console.warn('Supabase delete exception:', e);
      success = false;
    }
  }

  const local = getLocalRecords();
  saveLocalRecords(local.filter(r => r.id !== id));
  return success;
}
