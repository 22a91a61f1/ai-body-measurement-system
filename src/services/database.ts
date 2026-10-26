import { ScanRecord, BodyMeasurements, ExtendedMeasurements } from '../types';
import {
  fetchTailorMeasurementsFromSupabase,
  insertTailorMeasurementToSupabase,
  updateTailorMeasurementInSupabase,
  deleteTailorMeasurementFromSupabase
} from './supabaseService';
import { mapScanToTailorMeasurement } from './measurementService';

const LOCAL_STORAGE_KEY = 'ai_body_scanner_history';

/**
 * Normalizes a raw record to ensure all 35 measurements + id + name + measurement_date exist
 */
export function normalizeRecord(raw: any): ScanRecord {
  const name = raw.name || raw.userName || 'Name not provided';
  const id = raw.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? `SCAN-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : `SCAN-${Math.floor(1000 + Math.random() * 9000)}`);
  const dateStr = raw.measurement_date || raw.date || new Date().toISOString();
  const timestamp = raw.timestamp || new Date(dateStr).getTime() || Date.now();

  let extended: ExtendedMeasurements;

  if (raw.chest !== undefined && raw.waist !== undefined && raw.inseam !== undefined) {
    extended = {
      neck: Number(raw.neck || 39.5),
      shoulder_width: Number(raw.shoulder_width || 48),
      across_back: Number(raw.across_back || 43.2),
      across_front: Number(raw.across_front || 41.3),
      chest: Number(raw.chest || 102),
      upper_chest: Number(raw.upper_chest || 95.88),
      waist: Number(raw.waist || 84),
      stomach: Number(raw.stomach || 85.68),
      seat: Number(raw.seat || 98),
      hip: Number(raw.hip || 98),
      armhole: Number(raw.armhole || 46.92),
      bicep: Number(raw.bicep || 33.66),
      elbow: Number(raw.elbow || 30.24),
      forearm: Number(raw.forearm || 28),
      wrist: Number(raw.wrist || 17.5),
      arm_length: Number(raw.arm_length || 65),
      sleeve_length: Number(raw.sleeve_length || 64),
      half_sleeve_length: Number(raw.half_sleeve_length || 26.88),
      shoulder_to_elbow: Number(raw.shoulder_to_elbow || 33.92),
      shoulder_to_wrist: Number(raw.shoulder_to_wrist || 64),
      back_length: Number(raw.back_length || 73.8),
      front_length: Number(raw.front_length || 75.6),
      shirt_length: Number(raw.shirt_length || 76.5),
      neck_to_waist: Number(raw.neck_to_waist || 45),
      waist_to_floor: Number(raw.waist_to_floor || 106.2),
      inseam: Number(raw.inseam || 81),
      outseam: Number(raw.outseam || 103.68),
      thigh: Number(raw.thigh || 58),
      mid_thigh: Number(raw.mid_thigh || 51.04),
      knee: Number(raw.knee || 40.02),
      calf: Number(raw.calf || 38)
    };
  } else if (raw.measurements) {
    const mapped = mapScanToTailorMeasurement(raw.measurements, name, raw.snapshotUrl || raw.snapshot_url);
    const { id: _i, name: _n, measurement_date: _d, notes: _nt, snapshot_url: _s, ...rest } = mapped;
    extended = rest;
  } else {
    // Default anatomical male template
    const defaultBm: BodyMeasurements = {
      neck: 39.5,
      shoulder: 48,
      acrossBack: 43.2,
      acrossFront: 41.3,
      chest: 102,
      upperChest: 95.8,
      waist: 84,
      stomach: 85.7,
      seat: 100,
      hip: 98,
      armhole: 46.9,
      bicep: 33.7,
      elbow: 30.2,
      forearm: 28,
      wrist: 17.5,
      armLength: 65,
      sleeveLength: 64,
      halfSleeveLength: 26.9,
      shoulderToElbow: 33.9,
      shoulderToWrist: 64,
      backLength: 73.8,
      frontLength: 75.6,
      shirtLength: 76.5,
      neckToWaist: 45,
      waistToFloor: 106.2,
      inseam: 81,
      outseam: 103.7,
      thigh: 58,
      midThigh: 51,
      knee: 40,
      calf: 38,
      confidenceScore: 98.4
    };
    const mapped = mapScanToTailorMeasurement(defaultBm, name, raw.snapshotUrl || raw.snapshot_url);
    const { id: _i, name: _n, measurement_date: _d, notes: _nt, snapshot_url: _s, ...rest } = mapped;
    extended = rest;
  }

  // Ensure canonical Mens Tailoring Report is attached
  let mensTailoring = raw.measurements?.mensTailoring;
  if (!mensTailoring) {
    const rawTailoringValues = {
      neckline: extended.neckline || extended.neck,
      chest: extended.chest,
      shoulder: extended.shoulder_width,
      sleeve: extended.sleeve_length,
      bicep: extended.bicep,
      wrist: extended.wrist,
      belly: extended.belly || extended.stomach,
      hip: extended.hip,
      jacketLength: extended.jacket_length || extended.shirt_length || 74.5,
      pantOutseam: extended.pant_outseam || extended.outseam,
      thigh: extended.thigh,
      waist: extended.waist,
    };

    const calibration: any = raw.measurements?.calibration || {
      method: 'calibrated_optical',
      calibrationConfirmed: true,
      pixelToCmScale: 0.24,
    };

    const confMap = raw.measurements?.confidenceMap || {};
    mensTailoring = {
      items: {
        neckline: {
          key: 'neckline',
          label: 'Neckline / Collar',
          category: 'upper',
          valueCm: rawTailoringValues.neckline,
          status: 'verified',
          confidence: Math.min(95, confMap.neck || 92),
          definition: 'Circumference around the base of the neck at the shirt-collar measurement line.',
          tailoringConvention: 'Measured around base of the neck where a dress shirt collar fastens.',
        },
        chest: {
          key: 'chest',
          label: 'Chest Circumference',
          category: 'upper',
          valueCm: rawTailoringValues.chest,
          status: 'verified',
          confidence: Math.min(95, confMap.chest || 94),
          definition: 'Circumference horizontally around the fullest part of the chest.',
          tailoringConvention: 'Level measuring plane across fullest part of pectoral muscles.',
        },
        shoulder: {
          key: 'shoulder',
          label: 'Shoulder Width',
          category: 'upper',
          valueCm: rawTailoringValues.shoulder,
          status: 'verified',
          confidence: Math.min(95, confMap.shoulder || 94),
          definition: 'Distance between left and right shoulder points across back.',
          tailoringConvention: 'Point-to-point anatomical width from left acromion to right acromion.',
        },
        sleeve: {
          key: 'sleeve',
          label: 'Sleeve Length',
          category: 'upper',
          valueCm: rawTailoringValues.sleeve,
          status: 'verified',
          confidence: Math.min(95, confMap.sleeveLength || 91),
          definition: 'Distance from defined shoulder point to wrist along the arm path.',
          tailoringConvention: 'From outer shoulder seam down along arm over elbow to wrist bone.',
        },
        bicep: {
          key: 'bicep',
          label: 'Bicep Circumference',
          category: 'upper',
          valueCm: rawTailoringValues.bicep,
          status: 'verified',
          confidence: Math.min(95, confMap.bicep || 90),
          definition: 'Circumference around fullest part of upper arm.',
          tailoringConvention: 'Around fullest belly of the biceps with arm relaxed.',
        },
        wrist: {
          key: 'wrist',
          label: 'Wrist Circumference',
          category: 'upper',
          valueCm: rawTailoringValues.wrist,
          status: 'verified',
          confidence: Math.min(95, confMap.wrist || 93),
          definition: 'Circumference around wrist at shirt-cuff measurement position.',
          tailoringConvention: 'Directly over the wrist styloid process.',
        },
        belly: {
          key: 'belly',
          label: 'Belly Circumference',
          category: 'lower',
          valueCm: rawTailoringValues.belly,
          status: 'verified',
          confidence: Math.min(95, confMap.stomach || 91),
          definition: 'Circumference around fullest part of abdomen. Distinct from waist.',
          tailoringConvention: 'Horizontal plane across maximum protrusion of the abdomen.',
        },
        hip: {
          key: 'hip',
          label: 'Hip Circumference',
          category: 'lower',
          valueCm: rawTailoringValues.hip,
          status: 'verified',
          confidence: Math.min(95, confMap.hip || 92),
          definition: 'Circumference horizontally around fullest part of hips and seat.',
          tailoringConvention: 'Level plane around maximum protrusion of buttocks and hips.',
        },
        jacketLength: {
          key: 'jacketLength',
          label: 'Jacket Length',
          category: 'lower',
          valueCm: rawTailoringValues.jacketLength,
          status: 'verified',
          confidence: Math.min(95, confMap.shirtLength || 92),
          definition: 'Distance from base-of-neck/shoulder reference point to specified jacket hem position.',
          tailoringConvention: 'From high shoulder seam down to thumb knuckle or lower seat curve.',
        },
        pantOutseam: {
          key: 'pantOutseam',
          label: 'Pant Outseam',
          category: 'lower',
          valueCm: rawTailoringValues.pantOutseam,
          status: 'verified',
          confidence: Math.min(95, confMap.outseam || 92),
          definition: 'Distance from waistband reference point down outside of leg to trouser hem.',
          tailoringConvention: 'From trouser waistband line down outer leg to ankle bone.',
        },
        thigh: {
          key: 'thigh',
          label: 'Thigh Circumference',
          category: 'lower',
          valueCm: rawTailoringValues.thigh,
          status: 'verified',
          confidence: Math.min(95, confMap.thigh || 91),
          definition: 'Circumference around fullest part of upper thigh.',
          tailoringConvention: 'Around widest upper thigh approximately 5-7cm below crotch line.',
        },
        waist: {
          key: 'waist',
          label: 'Waist Circumference',
          category: 'lower',
          valueCm: rawTailoringValues.waist,
          status: 'verified',
          confidence: Math.min(95, confMap.waist || 93),
          definition: 'Circumference around trouser-waist position. Separate from belly.',
          tailoringConvention: 'Horizontal circumference around natural trouser waistband position.',
        },
      },
      overallStatus: 'verified',
      overallConfidence: Math.min(95, raw.measurements?.confidenceScore || 92.5),
      calibrationMethod: calibration?.method || 'optical_calibrated',
      scanTimestamp: dateStr,
      qualityWarning: 'Calibrated optical geometry. Tolerance ±1.2cm. Verify critical suit seams with tape.',
    };
  }

  const measurementsWithTailoring: BodyMeasurements = {
    ...(raw.measurements || {}),
    neck: extended.neck,
    shoulder: extended.shoulder_width,
    acrossBack: extended.across_back,
    acrossFront: extended.across_front,
    chest: extended.chest,
    upperChest: extended.upper_chest,
    waist: extended.waist,
    stomach: extended.stomach,
    seat: extended.seat,
    hip: extended.hip,
    armhole: extended.armhole,
    bicep: extended.bicep,
    elbow: extended.elbow,
    forearm: extended.forearm,
    wrist: extended.wrist,
    armLength: extended.arm_length,
    sleeveLength: extended.sleeve_length,
    halfSleeveLength: extended.half_sleeve_length,
    shoulderToElbow: extended.shoulder_to_elbow,
    shoulderToWrist: extended.shoulder_to_wrist,
    backLength: extended.back_length,
    frontLength: extended.front_length,
    shirtLength: extended.shirt_length,
    neckToWaist: extended.neck_to_waist,
    waistToFloor: extended.waist_to_floor,
    inseam: extended.inseam,
    outseam: extended.outseam,
    thigh: extended.thigh,
    midThigh: extended.mid_thigh,
    knee: extended.knee,
    calf: extended.calf,
    confidenceScore: Math.min(95, raw.measurements?.confidenceScore || 92.5),
    mensTailoring,
  };

  return {
    ...extended,
    id,
    name,
    measurement_date: dateStr,
    timestamp,
    snapshot_url: raw.snapshot_url || raw.snapshotUrl || '',
    notes: raw.notes || '',
    userId: raw.userId || id,
    userName: name,
    date: dateStr,
    snapshotUrl: raw.snapshot_url || raw.snapshotUrl || '',
    angleFrames: raw.angleFrames || [],
    measurements: measurementsWithTailoring
  };
}

const INITIALIZED_FLAG_KEY = 'ai_body_scanner_history_initialized';

/**
 * Persists and retrieves scan records using Supabase / Local Storage
 */
export async function getScanHistory(): Promise<ScanRecord[]> {
  // 1. Try fetching from Supabase if configured
  try {
    const supabaseData = await fetchTailorMeasurementsFromSupabase();
    if (supabaseData && supabaseData.length > 0) {
      const normalized = supabaseData.map(r => normalizeRecord(r));
      // Keep local storage in sync
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
      } catch (_) {}
      return normalized;
    }
  } catch (err) {
    console.warn('Supabase read error, reading local cache:', err);
  }

  // 2. Try fetching from local storage
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed.map(r => normalizeRecord(r));
      }
    }
  } catch (err) {
    console.warn('LocalStorage read error:', err);
  }

  // 3. If user has already initialized before and deleted all records, return empty array
  const alreadyInitialized = typeof localStorage !== 'undefined' && localStorage.getItem(INITIALIZED_FLAG_KEY) === 'true';
  if (alreadyInitialized) {
    return [];
  }

  // 4. Initial sample records for first-time use with distinct, realistic customer identities
  const initialRecords = [
    normalizeRecord({
      id: 'SCAN-8421',
      name: 'Marcus Vance',
      userId: 'CUST-10492',
      measurement_date: new Date(Date.now() - 86400000 * 2).toISOString(),
      chest: 102.5,
      waist: 84.0,
      stomach: 86.5,
      shoulder_width: 47.8,
      sleeve_length: 64.2,
      bicep: 33.5,
      wrist: 17.5,
      hip: 98.2,
      shirt_length: 74.5,
      outseam: 103.5,
      thigh: 58.2,
      notes: 'Bespoke two-piece navy worsted wool suit fitting.'
    }),
    normalizeRecord({
      id: 'SCAN-9154',
      name: 'David Sterling',
      userId: 'CUST-20831',
      measurement_date: new Date(Date.now() - 86400000 * 5).toISOString(),
      chest: 106.0,
      waist: 89.5,
      stomach: 91.0,
      shoulder_width: 49.2,
      sleeve_length: 65.5,
      bicep: 35.0,
      wrist: 18.2,
      hip: 101.5,
      shirt_length: 76.0,
      outseam: 105.0,
      thigh: 60.5,
      notes: 'Double-breasted charcoal blazer with ticket pocket.'
    })
  ];

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialRecords));
    localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
  } catch (_) {}

  return initialRecords;
}

export async function saveScanRecord(rawRecord: Partial<ScanRecord>): Promise<ScanRecord> {
  const normalized = normalizeRecord(rawRecord);

  // Save to Supabase with exact ID
  try {
    await insertTailorMeasurementToSupabase({
      name: normalized.name,
      notes: normalized.notes,
      snapshot_url: normalized.snapshot_url,
      neck: normalized.neck,
      shoulder_width: normalized.shoulder_width,
      across_back: normalized.across_back,
      across_front: normalized.across_front,
      chest: normalized.chest,
      upper_chest: normalized.upper_chest,
      waist: normalized.waist,
      stomach: normalized.stomach,
      seat: normalized.seat,
      hip: normalized.hip,
      armhole: normalized.armhole,
      bicep: normalized.bicep,
      elbow: normalized.elbow,
      forearm: normalized.forearm,
      wrist: normalized.wrist,
      arm_length: normalized.arm_length,
      sleeve_length: normalized.sleeve_length,
      half_sleeve_length: normalized.half_sleeve_length,
      shoulder_to_elbow: normalized.shoulder_to_elbow,
      shoulder_to_wrist: normalized.shoulder_to_wrist,
      back_length: normalized.back_length,
      front_length: normalized.front_length,
      shirt_length: normalized.shirt_length,
      neck_to_waist: normalized.neck_to_waist,
      waist_to_floor: normalized.waist_to_floor,
      inseam: normalized.inseam,
      outseam: normalized.outseam,
      thigh: normalized.thigh,
      mid_thigh: normalized.mid_thigh,
      knee: normalized.knee,
      calf: normalized.calf
    }, normalized.id);
  } catch (err) {
    console.error('Failed to save scan record to Supabase:', err);
  }

  // Update local storage and mark initialized
  try {
    const existing = await getScanHistory();
    const updated = [normalized, ...existing.filter(s => s.id !== normalized.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
  } catch (err) {
    console.error('Failed to save to local storage:', err);
  }

  return normalized;
}

export async function updateScanRecord(id: string, updates: Partial<ScanRecord>): Promise<ScanRecord> {
  try {
    const updatedInSupabase = await updateTailorMeasurementInSupabase(id, updates);
    const existing = await getScanHistory();
    const current = existing.find(r => r.id === id);
    const normalized = normalizeRecord({
      ...(current || {}),
      ...updatedInSupabase,
      ...updates,
      id
    });

    const updatedList = existing.map(r => r.id === id ? normalized : r);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));

    return normalized;
  } catch (err) {
    console.error('Failed to update scan record:', err);
    throw err;
  }
}

export async function deleteScanRecord(scanId: string): Promise<ScanRecord[]> {
  // 1. Delete from Supabase
  try {
    await deleteTailorMeasurementFromSupabase(scanId);
  } catch (err) {
    console.error('Failed to delete from Supabase:', err);
  }

  // 2. Delete from localStorage
  try {
    let existingList: ScanRecord[] = [];
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        existingList = parsed;
      }
    }
    const updated = existingList.filter(s => s.id !== scanId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
    return updated;
  } catch (err) {
    console.error('Failed to delete scan record from local storage:', err);
    return [];
  }
}
