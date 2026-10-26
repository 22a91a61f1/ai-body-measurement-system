import { PoseLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { NormalizedLandmarkList, POSE_CONNECTIONS } from '@mediapipe/pose';

export interface PoseLandmarks {
  landmarks: NormalizedLandmark[];
  worldLandmarks?: NormalizedLandmark[];
  confidence: number;
}

export interface KeyBodyLandmarks {
  head: { x: number; y: number; z: number };
  neck: { x: number; y: number; z: number };
  leftShoulder: { x: number; y: number; z: number };
  rightShoulder: { x: number; y: number; z: number };
  leftElbow: { x: number; y: number; z: number };
  rightElbow: { x: number; y: number; z: number };
  leftWrist: { x: number; y: number; z: number };
  rightWrist: { x: number; y: number; z: number };
  chest: { x: number; y: number; z: number };
  waist: { x: number; y: number; z: number };
  leftHip: { x: number; y: number; z: number };
  rightHip: { x: number; y: number; z: number };
  leftKnee: { x: number; y: number; z: number };
  rightKnee: { x: number; y: number; z: number };
  leftAnkle: { x: number; y: number; z: number };
  rightAnkle: { x: number; y: number; z: number };
}

export class PoseDetectorService {
  private poseLandmarker: PoseLandmarker | null = null;
  private poseClassic: any = null;
  private isInitialized = false;
  private useTasksVision = true;
  private lastDetectedLandmarks: NormalizedLandmark[] | null = null;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Try initializing MediaPipe Tasks Vision PoseLandmarker
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        minPosePresenceConfidence: 0.5
      });

      this.useTasksVision = true;
      this.isInitialized = true;
      console.log('MediaPipe Tasks Vision PoseLandmarker initialized successfully.');
      return;
    } catch (err) {
      console.warn('Tasks Vision initialization warning, attempting fallback to @mediapipe/pose:', err);
    }

    // Fallback to classic @mediapipe/pose
    try {
      const { Pose } = await import('@mediapipe/pose');
      this.poseClassic = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      this.poseClassic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.poseClassic.onResults((results: any) => {
        if (results && results.poseLandmarks) {
          this.lastDetectedLandmarks = results.poseLandmarks;
        } else {
          this.lastDetectedLandmarks = null;
        }
      });

      await this.poseClassic.initialize();
      this.useTasksVision = false;
      this.isInitialized = true;
      console.log('@mediapipe/pose classic initialized successfully.');
    } catch (fallbackErr) {
      console.error('All MediaPipe Pose initialization options failed:', fallbackErr);
      throw new Error('Failed to load MediaPipe Pose landmarker service.');
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Process a single video frame synchronously (returns landmarks or null)
   */
  public detectPose(video: HTMLVideoElement, timestampMs: number): NormalizedLandmark[] | null {
    if (!this.isInitialized) return null;

    if (this.useTasksVision && this.poseLandmarker) {
      try {
        const result = this.poseLandmarker.detectForVideo(video, timestampMs);
        if (result && result.landmarks && result.landmarks.length > 0) {
          this.lastDetectedLandmarks = result.landmarks[0];
          return result.landmarks[0];
        } else {
          this.lastDetectedLandmarks = null;
          return null;
        }
      } catch (err) {
        console.warn('Tasks Vision detection frame error:', err);
        return null;
      }
    } else if (this.poseClassic) {
      try {
        this.poseClassic.send({ image: video });
        return this.lastDetectedLandmarks;
      } catch (err) {
        return null;
      }
    }

    return null;
  }

  public async detect(video: HTMLVideoElement, timestampMs: number): Promise<NormalizedLandmark[] | null> {
    return this.detectPose(video, timestampMs);
  }

  public close(): void {
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    if (this.poseClassic) {
      this.poseClassic.close();
      this.poseClassic = null;
    }
    this.isInitialized = false;
    this.lastDetectedLandmarks = null;
  }
}

/**
 * Utility to extract key body landmark points from MediaPipe landmark list
 */
export function extractKeyLandmarks(landmarks: NormalizedLandmark[]): KeyBodyLandmarks | null {
  if (!landmarks || landmarks.length < 33) return null;

  const nose = landmarks[0];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lElbow = landmarks[13];
  const rElbow = landmarks[14];
  const lWrist = landmarks[15];
  const rWrist = landmarks[16];
  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const lKnee = landmarks[25];
  const rKnee = landmarks[26];
  const lAnkle = landmarks[27];
  const rAnkle = landmarks[28];

  const neck = {
    x: (lShoulder.x + rShoulder.x) / 2,
    y: (lShoulder.y + rShoulder.y) / 2 - 0.04,
    z: ((lShoulder.z ?? 0) + (rShoulder.z ?? 0)) / 2
  };

  const chest = {
    x: (lShoulder.x + rShoulder.x) / 2,
    y: (lShoulder.y + rShoulder.y) / 2 + 0.08,
    z: ((lShoulder.z ?? 0) + (rShoulder.z ?? 0)) / 2
  };

  const waist = {
    x: (lHip.x + rHip.x) / 2,
    y: ((lShoulder.y + rShoulder.y) / 2) + (((lHip.y + rHip.y) / 2 - (lShoulder.y + rShoulder.y) / 2) * 0.65),
    z: ((lHip.z ?? 0) + (rHip.z ?? 0)) / 2
  };

  return {
    head: { x: nose.x, y: nose.y - 0.08, z: nose.z ?? 0 },
    neck,
    leftShoulder: { x: lShoulder.x, y: lShoulder.y, z: lShoulder.z ?? 0 },
    rightShoulder: { x: rShoulder.x, y: rShoulder.y, z: rShoulder.z ?? 0 },
    leftElbow: { x: lElbow.x, y: lElbow.y, z: lElbow.z ?? 0 },
    rightElbow: { x: rElbow.x, y: rElbow.y, z: rElbow.z ?? 0 },
    leftWrist: { x: lWrist.x, y: lWrist.y, z: lWrist.z ?? 0 },
    rightWrist: { x: rWrist.x, y: rWrist.y, z: rWrist.z ?? 0 },
    chest,
    waist,
    leftHip: { x: lHip.x, y: lHip.y, z: lHip.z ?? 0 },
    rightHip: { x: rHip.x, y: rHip.y, z: rHip.z ?? 0 },
    leftKnee: { x: lKnee.x, y: lKnee.y, z: lKnee.z ?? 0 },
    rightKnee: { x: rKnee.x, y: rKnee.y, z: rKnee.z ?? 0 },
    leftAnkle: { x: lAnkle.x, y: lAnkle.y, z: lAnkle.z ?? 0 },
    rightAnkle: { x: rAnkle.x, y: rAnkle.y, z: rAnkle.z ?? 0 }
  };
}

/**
 * Draws custom skeleton overlay with color-coded keypoints on HTML Canvas
 */
export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  options: { showSkeleton?: boolean; showLabels?: boolean } = {}
): void {
  const { showSkeleton = true, showLabels = true } = options;
  if (!landmarks || landmarks.length === 0) return;

  ctx.save();

  // Draw Skeleton connections
  if (showSkeleton) {
    const connections = [
      // Face
      [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
      // Torso / Shoulders
      [11, 12], [11, 23], [12, 24], [23, 24],
      // Arms
      [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
      [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
      // Legs
      [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
      [24, 26], [26, 28], [28, 30], [30, 32], [28, 32]
    ];

    ctx.strokeStyle = '#00f0ff'; // Neon Cyan/Blue
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
    ctx.shadowBlur = 8;

    connections.forEach(([i, j]) => {
      const pt1 = landmarks[i];
      const pt2 = landmarks[j];

      if (
        pt1 &&
        pt2 &&
        (pt1.visibility === undefined || pt1.visibility > 0.2) &&
        (pt2.visibility === undefined || pt2.visibility > 0.2)
      ) {
        ctx.beginPath();
        ctx.moveTo(pt1.x * width, pt1.y * height);
        ctx.lineTo(pt2.x * width, pt2.y * height);
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 0;
  }

  // Key Joint Indices to Highlight
  const keyIndices = [
    { idx: 0, label: 'Head', color: '#38bdf8' },
    { idx: 11, label: 'L-Shoulder', color: '#34d399' },
    { idx: 12, label: 'R-Shoulder', color: '#34d399' },
    { idx: 13, label: 'L-Elbow', color: '#fbbf24' },
    { idx: 14, label: 'R-Elbow', color: '#fbbf24' },
    { idx: 15, label: 'L-Wrist', color: '#f87171' },
    { idx: 16, label: 'R-Wrist', color: '#f87171' },
    { idx: 23, label: 'L-Hip', color: '#c084fc' },
    { idx: 24, label: 'R-Hip', color: '#c084fc' },
    { idx: 25, label: 'L-Knee', color: '#f472b6' },
    { idx: 26, label: 'R-Knee', color: '#f472b6' },
    { idx: 27, label: 'L-Ankle', color: '#22d3ee' },
    { idx: 28, label: 'R-Ankle', color: '#22d3ee' },
    { idx: 31, label: 'L-Foot', color: '#a3e635' },
    { idx: 32, label: 'R-Foot', color: '#a3e635' }
  ];

  keyIndices.forEach(({ idx, label, color }) => {
    const pt = landmarks[idx];
    if (pt && (pt.visibility === undefined || pt.visibility > 0.2)) {
      const cx = pt.x * width;
      const cy = pt.y * height;

      // Outer Glow Circle
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Inner White Core
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      if (showLabels) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(label, cx + 9, cy + 3);
        ctx.shadowBlur = 0;
      }
    }
  });

  ctx.restore();
}

export interface DetectedBodyOrientation {
  angleDegrees: number; // 0 to 360
  label: string; // e.g. 'Front (0°)', 'Left Profile (90°)', 'Back (180°)', 'Right Profile (270°)'
  nearestStepAngle: number; // 0, 45, 90, 135, 180, 225, 270, 315, 360
  isFront: boolean;
  isLeftProfile: boolean;
  isBack: boolean;
  isRightProfile: boolean;
  isStable: boolean;
  fullBodyTracked: boolean;
  confidence: number;
}

/**
 * Calculates real-time 3D facing orientation and rotation angle of the body
 * using multi-joint geometry, relative depth, and facial landmark visibility.
 */
export function detectBodyOrientation(
  landmarks: NormalizedLandmark[] | null
): DetectedBodyOrientation | null {
  if (!landmarks || landmarks.length < 33) return null;

  const nose = landmarks[0];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const lKnee = landmarks[25];
  const rKnee = landmarks[26];
  const lAnkle = landmarks[27];
  const rAnkle = landmarks[28];

  const getVis = (pt?: NormalizedLandmark) => (pt && pt.visibility !== undefined ? pt.visibility : 0.8);

  const visHead = getVis(nose) > 0.25;
  const visShoulders = getVis(lShoulder) > 0.3 && getVis(rShoulder) > 0.3;
  const visHips = getVis(lHip) > 0.3 && getVis(rHip) > 0.3;
  const visKnees = getVis(lKnee) > 0.3 && getVis(rKnee) > 0.3;
  const visAnkles = getVis(lAnkle) > 0.25 || getVis(rAnkle) > 0.25;

  const fullBodyTracked = visHead && visShoulders && visHips && visKnees && visAnkles;

  // Vector across shoulders (X: horizontal on screen, Z: depth relative to hips)
  const dxSh = (lShoulder.x - rShoulder.x);
  const dzSh = ((lShoulder.z ?? 0) - (rShoulder.z ?? 0));

  // Vector across hips
  const dxHip = (lHip.x - rHip.x);
  const dzHip = ((lHip.z ?? 0) - (rHip.z ?? 0));

  // Weighted torso vector
  const torsoX = dxSh * 0.65 + dxHip * 0.35;
  const torsoZ = dzSh * 0.65 + dzHip * 0.35;

  // Facial orientation cue
  const noseVis = getVis(nose);
  const shMidZ = ((lShoulder.z ?? 0) + (rShoulder.z ?? 0)) / 2;
  const noseZ = (nose?.z ?? 0);
  const isFacingAway = noseVis < 0.35 || (noseZ > shMidZ + 0.05);

  // Compute angle in degrees: atan2(Z, X)
  let rawRad = Math.atan2(torsoZ, torsoX);
  let rawDeg = (rawRad * 180) / Math.PI;

  if (rawDeg < 0) {
    rawDeg += 360;
  }

  // Cross-check with facial direction to resolve ambiguities
  if (isFacingAway && (rawDeg < 90 || rawDeg > 270)) {
    rawDeg = (rawDeg + 180) % 360;
  } else if (!isFacingAway && rawDeg >= 120 && rawDeg <= 240 && noseVis > 0.55) {
    rawDeg = (rawDeg + 180) % 360;
  }

  const angleDegrees = Math.round(rawDeg);

  // Categorize nearest step angle (multiples of 45°)
  const stepAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
  let nearestStepAngle = 0;
  let minDiff = 360;

  for (const s of stepAngles) {
    const d = Math.abs(angleDegrees - s);
    if (d < minDiff) {
      minDiff = d;
      nearestStepAngle = s === 360 ? 360 : s;
    }
  }

  const isFront = angleDegrees <= 25 || angleDegrees >= 335;
  const isLeftProfile = angleDegrees >= 65 && angleDegrees <= 115;
  const isBack = angleDegrees >= 155 && angleDegrees <= 205;
  const isRightProfile = angleDegrees >= 245 && angleDegrees <= 295;

  let label = 'Rotating...';
  if (isFront) label = angleDegrees > 300 ? 'Front Finish (360°)' : 'Front (0°)';
  else if (angleDegrees > 25 && angleDegrees < 65) label = 'Front-Left (45°)';
  else if (isLeftProfile) label = 'Left Profile (90°)';
  else if (angleDegrees > 115 && angleDegrees < 155) label = 'Back-Left (135°)';
  else if (isBack) label = 'Back (180°)';
  else if (angleDegrees > 205 && angleDegrees < 245) label = 'Back-Right (225°)';
  else if (isRightProfile) label = 'Right Profile (270°)';
  else if (angleDegrees > 295 && angleDegrees < 335) label = 'Front-Right (315°)';

  const confidence = Math.min(95.0, Math.round(((getVis(lShoulder) + getVis(rShoulder) + getVis(lHip) + getVis(rHip) + getVis(nose)) / 5) * 100));

  return {
    angleDegrees,
    label,
    nearestStepAngle,
    isFront,
    isLeftProfile,
    isBack,
    isRightProfile,
    isStable: minDiff <= 22,
    fullBodyTracked,
    confidence
  };
}
