import { BodyMeasurements, TailorMeasurement } from '../types';
import {
  fetchTailorMeasurementsFromSupabase,
  insertTailorMeasurementToSupabase,
  updateTailorMeasurementInSupabase,
  deleteTailorMeasurementFromSupabase
} from './supabaseService';

/**
 * Maps raw 360° AI body scan measurements into a complete 32-field Tailor Measurement set
 */
export function mapScanToTailorMeasurement(
  scan: BodyMeasurements,
  customerName: string = 'Name not provided',
  snapshotUrl?: string
): TailorMeasurement {
  const c = scan.chest;
  const w = scan.waist;
  const hip = scan.hip;
  const sh = scan.shoulder;
  const sl = scan.sleeveLength;
  const ins = scan.inseam;
  const th = scan.thigh;
  const calf = scan.calf;
  const fa = scan.forearm;

  return {
    name: customerName,
    neck: Math.round(scan.neck * 10) / 10,
    shoulder_width: Math.round(sh * 10) / 10,
    across_back: Math.round(scan.acrossBack * 10) / 10,
    across_front: Math.round(scan.acrossFront * 10) / 10,
    chest: Math.round(c * 10) / 10,
    upper_chest: Math.round(scan.upperChest * 10) / 10,
    waist: Math.round(w * 10) / 10,
    stomach: Math.round(scan.stomach * 10) / 10,
    seat: Math.round(scan.seat * 10) / 10,
    hip: Math.round(hip * 10) / 10,
    armhole: Math.round(scan.armhole * 10) / 10,
    bicep: Math.round(scan.bicep * 10) / 10,
    elbow: Math.round(scan.elbow * 10) / 10,
    forearm: Math.round(fa * 10) / 10,
    wrist: Math.round(scan.wrist * 10) / 10,
    arm_length: Math.round(scan.armLength * 10) / 10,
    sleeve_length: Math.round(sl * 10) / 10,
    half_sleeve_length: Math.round(scan.halfSleeveLength * 10) / 10,
    shoulder_to_elbow: Math.round(scan.shoulderToElbow * 10) / 10,
    shoulder_to_wrist: Math.round(scan.shoulderToWrist * 10) / 10,
    back_length: Math.round(scan.backLength * 10) / 10,
    front_length: Math.round(scan.frontLength * 10) / 10,
    shirt_length: Math.round(scan.shirtLength * 10) / 10,
    neck_to_waist: Math.round(scan.neckToWaist * 10) / 10,
    waist_to_floor: Math.round(scan.waistToFloor * 10) / 10,
    inseam: Math.round(ins * 10) / 10,
    outseam: Math.round(scan.outseam * 10) / 10,
    thigh: Math.round(th * 10) / 10,
    mid_thigh: Math.round(scan.midThigh * 10) / 10,
    knee: Math.round(scan.knee * 10) / 10,
    calf: Math.round(calf * 10) / 10,
    snapshot_url: snapshotUrl || '',
    notes: `Calibrated 360° AI Body Mesh Scan (${scan.calibration?.method || 'Calibrated'})`
  };
}

export async function getAllTailorMeasurements(): Promise<TailorMeasurement[]> {
  return fetchTailorMeasurementsFromSupabase();
}

export async function getTailorMeasurementById(id: string): Promise<TailorMeasurement | null> {
  const all = await fetchTailorMeasurementsFromSupabase();
  return all.find(m => m.id === id) || null;
}

export async function getMeasurementsByCustomerName(name: string): Promise<TailorMeasurement[]> {
  const all = await fetchTailorMeasurementsFromSupabase();
  const lower = name.toLowerCase().trim();
  return all.filter(m => m.name.toLowerCase().includes(lower));
}

export async function saveTailorMeasurement(measurement: TailorMeasurement): Promise<TailorMeasurement> {
  if (measurement.id) {
    return updateTailorMeasurementInSupabase(measurement.id, measurement);
  } else {
    return insertTailorMeasurementToSupabase(measurement);
  }
}

export async function deleteTailorMeasurement(id: string): Promise<boolean> {
  return deleteTailorMeasurementFromSupabase(id);
}
