import { BodyMeasurements, CapturedAngleFrame, CalibrationData } from '../types';
import { estimateBodyMeasurementsFromLandmarks, validateAdultMeasurements } from './measurementEngine';

export interface AngleStepInfo {
  angle: number;
  label: string;
  instruction: string;
}

export const SCAN_ANGLE_STEPS: AngleStepInfo[] = [
  { angle: 0, label: 'Front (0°)', instruction: 'Stand approximately 2m away facing camera directly.' },
  { angle: 45, label: 'Front-Left (45°)', instruction: 'Turn slightly to your left.' },
  { angle: 90, label: 'Left Profile (90°)', instruction: 'Turn to face left completely.' },
  { angle: 135, label: 'Back-Left (135°)', instruction: 'Rotate further to your back left.' },
  { angle: 180, label: 'Back (180°)', instruction: 'Face directly away from the camera.' },
  { angle: 225, label: 'Back-Right (225°)', instruction: 'Turn towards your back right.' },
  { angle: 270, label: 'Right Profile (270°)', instruction: 'Turn to face right completely.' },
  { angle: 315, label: 'Front-Right (315°)', instruction: 'Turn slightly towards front right.' },
  { angle: 360, label: 'Front Finish (360°)', instruction: 'Complete full rotation back to front.' }
];

/**
 * Multi-angle 3D Body Reconstruction Engine
 * - Combines 360° rotational frames (0° to 360°)
 * - Passes front (0°) and side profile (90°/270°) landmarks into calibrated engine
 * - Enforces realistic adult human measurement validation (Requirement 12)
 * - Caps maximum confidence score at 95.0% (Requirement 11)
 */
export function reconstruct3DBodyMeasurements(
  capturedFrames: CapturedAngleFrame[],
  calibration: CalibrationData,
  videoResolution: { width: number; height: number } = { width: 1280, height: 720 },
  diagnostics?: {
    stabilityJitterMm?: number;
    lightingCondition?: 'optimal' | 'low_contrast' | 'overexposed' | 'acceptable';
  }
): {
  measurements: BodyMeasurements;
  landmarkCloud: Array<{ x: number; y: number; z: number; angle: number }>;
} {
  if (!calibration || !calibration.calibrationConfirmed) {
    throw new Error('Camera calibration is required before scanning. Please complete calibration setup.');
  }

  // Extract all valid landmark frames
  const validFrames = (capturedFrames || []).filter(
    f => f && f.landmarks && Array.isArray(f.landmarks) && f.landmarks.length >= 33
  );

  if (validFrames.length === 0) {
    throw new Error('Unable to detect full body. Please stand farther back with your entire body visible.');
  }

  // Find front frame (0° or 360°) and profile frame (90° or 270°)
  const frontFrame = validFrames.find(f => f.angle === 0 || f.angle === 360) || validFrames[0];
  const profileFrame = validFrames.find(f => f.angle === 90 || f.angle === 270) || validFrames.find(f => Math.abs(f.angle - 90) <= 28 || Math.abs(f.angle - 270) <= 28);

  if (!frontFrame || !frontFrame.landmarks || !Array.isArray(frontFrame.landmarks) || frontFrame.landmarks.length < 33) {
    throw new Error('Unable to detect full body. Please stand farther back with your entire body visible.');
  }

  // Base measurements from calibrated 3D mesh engine using front and side profile landmarks
  const baseMeasurements = estimateBodyMeasurementsFromLandmarks(
    frontFrame.landmarks,
    calibration,
    videoResolution,
    profileFrame?.landmarks,
    diagnostics
  );

  // Generate 3D point cloud for avatar alignment
  const landmarkCloud: Array<{ x: number; y: number; z: number; angle: number }> = [];
  validFrames.forEach((frame) => {
    if (frame && frame.landmarks && Array.isArray(frame.landmarks) && frame.landmarks.length >= 33) {
      const rad = (frame.angle * Math.PI) / 180;
      const l = frame.landmarks;
      [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((idx) => {
        const pt = l[idx];
        if (pt) {
          const rawX = (pt.x - 0.5);
          const rawY = -(pt.y - 0.5);
          const rawZ = pt.z || 0;

          const rotX = rawX * Math.cos(rad) + rawZ * Math.sin(rad);
          const rotZ = -rawX * Math.sin(rad) + rawZ * Math.cos(rad);

          landmarkCloud.push({
            x: rotX * 1.8,
            y: rawY * 2.2,
            z: rotZ * 1.8,
            angle: frame.angle
          });
        }
      });
    }
  });

  // Requirement 11: Capped at 95.0% max confidence
  const confidenceScore = Math.min(95.0, baseMeasurements.confidenceScore);

  // Requirement 12: Validate final measurements against realistic adult human ranges
  const validation = validateAdultMeasurements(baseMeasurements);
  if (!validation.valid) {
    throw new Error(`Scan Rejected: ${validation.errorReason} Please verify calibration settings and rescan.`);
  }

  const measurements: BodyMeasurements = {
    ...baseMeasurements,
    confidenceScore,
    isCalibrated3D: true,
    isEstimated: false
  };

  return {
    measurements,
    landmarkCloud
  };
}
