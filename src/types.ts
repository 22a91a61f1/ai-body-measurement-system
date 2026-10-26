export type MensTailoringKey =
  | 'neckline'
  | 'chest'
  | 'shoulder'
  | 'sleeve'
  | 'bicep'
  | 'wrist'
  | 'belly'
  | 'hip'
  | 'jacketLength'
  | 'pantOutseam'
  | 'thigh'
  | 'waist';

export type MeasurementStatus =
  | 'verified'
  | 'estimated'
  | 'needs_recapture'
  | 'manually_entered'
  | 'verified_tape';

export interface TailoringMeasurementItem {
  key: MensTailoringKey;
  label: string;
  category: 'upper' | 'lower';
  valueCm: number;
  status: MeasurementStatus;
  confidence: number; // Landmark detection confidence (0-100%)
  definition: string;
  tailoringConvention: string;
  isManual?: boolean;
  manualNote?: string;
  toleranceCm?: number; // Acceptable tailoring tolerance (e.g. ±1.2cm)
  uncertaintyCm?: number; // Optical uncertainty bound (e.g. ±0.8cm)
  tapeVerifiedCm?: number; // Master tailor verified tape measure (if verified)
  deltaFromTapeCm?: number; // Difference between scan and ground-truth tape
}

export interface MensTailoringReport {
  items: Record<MensTailoringKey, TailoringMeasurementItem>;
  overallStatus: 'verified' | 'needs_attention' | 'calibrated' | 'tape_validated';
  overallConfidence: number; // Landmark detection confidence average
  scanQualityScore: number; // Scan quality based on lighting, framing, jitter, and calibration lock
  calibrationMethod: string;
  scanTimestamp: string;
  qualityWarning?: string;
  stabilityJitterMm?: number; // Frame-to-frame movement variance
  lightingCondition?: 'optimal' | 'low_contrast' | 'overexposed' | 'acceptable';
  maeCm?: number; // Mean absolute error when tape verified
  signedBiasCm?: number; // Signed bias when tape verified
  validatedAccuracyScore?: number; // Ground-truth empirical accuracy score (ONLY when tape verified)
}

export interface TailorBenchmarkSubject {
  id: string;
  profileName: string;
  heightCm: number;
  groundTruthCm: Record<MensTailoringKey, number>;
  tolerancesCm: Record<MensTailoringKey, number>;
  notes: string;
}

export interface ExtendedMeasurements {
  neck: number;
  shoulder_width: number;
  across_back: number;
  across_front: number;
  chest: number;
  upper_chest: number;
  waist: number;
  stomach: number;
  seat: number;
  hip: number;
  armhole: number;
  bicep: number;
  elbow: number;
  forearm: number;
  wrist: number;
  arm_length: number;
  sleeve_length: number;
  half_sleeve_length: number;
  shoulder_to_elbow: number;
  shoulder_to_wrist: number;
  back_length: number;
  front_length: number;
  shirt_length: number;
  neck_to_waist: number;
  waist_to_floor: number;
  inseam: number;
  outseam: number;
  thigh: number;
  mid_thigh: number;
  knee: number;
  calf: number;
  // Men's 13 tailoring explicit aliases
  neckline?: number;
  belly?: number;
  jacket_length?: number;
  pant_outseam?: number;
}

export type TailorMeasurement = ExtendedMeasurements & {
  id?: string;
  name: string;
  measurement_date?: string;
  notes?: string;
  snapshot_url?: string;
};

export type MeasurementUnit = 'metric' | 'imperial';

export interface CalibrationData {
  method: 'a4_paper' | 'aruco_marker' | 'user_height';
  pixelToCmScale: number; // cm per pixel
  calibrationConfirmed: boolean;
  userSpecifiedHeightCm?: number;
  paperPixels?: number;
  markerPixels?: number;
}

export interface BodyMeasurements {
  // 32 Calibrated Anatomical Measurements from 3D Mesh
  neck: number; // in cm
  shoulder: number; // Shoulder width in cm
  acrossBack: number;
  acrossFront: number;
  chest: number; // in cm
  upperChest: number;
  waist: number; // in cm
  stomach: number;
  seat: number;
  hip: number; // in cm
  armhole: number;
  bicep: number;
  elbow: number;
  forearm: number; // in cm
  wrist: number; // in cm
  armLength: number; // in cm
  sleeveLength: number; // in cm
  halfSleeveLength: number;
  shoulderToElbow: number;
  shoulderToWrist: number;
  backLength: number;
  frontLength: number;
  shirtLength: number;
  neckToWaist: number;
  waistToFloor: number;
  inseam: number; // in cm
  outseam: number;
  thigh: number; // in cm
  midThigh: number;
  knee: number;
  calf: number; // in cm

  // Metadata & Depth Camera Compatibility
  confidenceScore: number; // overall percentage e.g. 94.5
  confidenceMap?: Record<string, number>; // individual confidence score per measurement
  calibration?: CalibrationData;
  sensorType?: 'rgb_camera' | 'depth_camera' | 'lidar';
  reconstructionMethod?: 'SMPL_X_MultiView_Mesh';
  isCalibrated3D?: boolean;
  isEstimated?: boolean;
  mensTailoring?: MensTailoringReport;
}

export interface CapturedAngleFrame {
  angle: number;
  label: string;
  snapshotUrl: string;
  landmarks?: any;
  detectedAngle?: number;
  actualOrientation?: string;
  isKeyAngle?: boolean;
}

export interface BodyLandmarks {
  headTop: { x: number; y: number };
  neckCenter: { x: number; y: number };
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
  chestCenter: { x: number; y: number };
  leftElbow: { x: number; y: number };
  rightElbow: { x: number; y: number };
  leftWrist: { x: number; y: number };
  rightWrist: { x: number; y: number };
  waistCenter: { x: number; y: number };
  leftHip: { x: number; y: number };
  rightHip: { x: number; y: number };
  leftKnee: { x: number; y: number };
  rightKnee: { x: number; y: number };
  leftAnkle: { x: number; y: number };
  rightAnkle: { x: number; y: number };
}

export interface ScanRecord extends ExtendedMeasurements {
  id: string;
  name: string;
  measurement_date: string; // ISO date string
  timestamp: number;
  snapshot_url?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  date?: string;
  snapshotUrl?: string;
  angleFrames?: CapturedAngleFrame[];
  measurements?: BodyMeasurements;
  landmarks?: BodyLandmarks;
}

export interface SizeRecommendations {
  suitJacket: string; // e.g. "40R"
  dressShirt: string; // e.g. "15.5 / 34-35"
  pantsWaistInseam: string; // e.g. "32W x 32L"
  tShirtSize: string; // e.g. "Large (L)"
}

export interface CameraSettings {
  deviceId: string;
  resolution: '1080p' | '720p' | '4k';
  frameRate: number;
  countdownTimer: number; // in seconds (0, 3, 5, 10)
  showGuideOverlay: boolean;
  autoCaptureOnPose: boolean;
}

export interface SystemSettings {
  unit: MeasurementUnit;
  darkMode: boolean;
  camera: CameraSettings;
  precisionMode: 'high_precision' | 'ultra_fast';
  autoSaveHistory: boolean;
}
