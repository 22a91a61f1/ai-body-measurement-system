import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Play,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  RotateCw,
  Volume2,
  ShieldCheck,
  Sparkles,
  Info,
  AlertTriangle,
  Terminal,
  Gauge,
  Video,
  Eye,
  Sliders,
  Maximize2,
  Check,
  Ruler,
  FileText,
  Tag,
  Scissors,
  BookOpen,
  CheckSquare,
  User,
  Compass
} from 'lucide-react';
import { BodyMeasurements, CameraSettings, CapturedAngleFrame, CalibrationData } from '../types';
import {
  PoseDetectorService,
  drawPoseOverlay,
  detectBodyOrientation,
  DetectedBodyOrientation
} from '../services/poseDetection';
import { reconstruct3DBodyMeasurements, SCAN_ANGLE_STEPS } from '../services/reconstruction3D';
import { TailoringReferenceModal } from './TailoringReferenceModal';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';

interface LiveCamera360Props {
  onScanComplete: (result: {
    imageBase64: string;
    measurements: BodyMeasurements;
    capturedFrames: CapturedAngleFrame[];
    customerName?: string;
    customerId?: string;
  }) => void;
  cameraSettings: CameraSettings;
  referenceHeightCm: number;
  initialCustomerName?: string;
  initialCustomerId?: string;
  existingCustomers?: Array<{ id: string; name: string }>;
}

export type DetectorStatusStep =
  | 'Camera Offline'
  | 'Connecting Camera...'
  | 'Camera Ready'
  | 'Detecting Person...'
  | 'Person Detected'
  | 'Full Body Visible'
  | 'Ready to Scan'
  | 'No person detected in the webcam';

export const LiveCamera360: React.FC<LiveCamera360Props> = ({
  onScanComplete,
  cameraSettings,
  referenceHeightCm,
  initialCustomerName = '',
  initialCustomerId = '',
  existingCustomers = []
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseDetectorRef = useRef<PoseDetectorService | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Landmarks & Performance Tracking Refs
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const lastSeenLandmarksTimestampRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(performance.now());

  // Customer Identity State (Enforced Before Camera / 3D Scan)
  const [customerName, setCustomerName] = useState<string>(initialCustomerName || '');
  const [customerId, setCustomerId] = useState<string>(
    initialCustomerId || `CUST-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedExistingId, setSelectedExistingId] = useState<string>('');

  // Orientation and Distance Tracking State
  const [currentOrientation, setCurrentOrientation] = useState<DetectedBodyOrientation | null>(null);
  const [distanceStatus, setDistanceStatus] = useState<'optimal' | 'too_far' | 'too_close' | 'unknown'>('unknown');
  const [distanceWarning, setDistanceWarning] = useState<string | null>(null);

  const handleSelectExisting = (id: string) => {
    setSelectedExistingId(id);
    if (id === 'NEW') {
      setCustomerName('');
      setCustomerId(`CUST-${Math.floor(10000 + Math.random() * 90000)}`);
      setNameError(null);
    } else {
      const found = existingCustomers.find((c) => c.id === id);
      if (found) {
        setCustomerName(found.name);
        setCustomerId(found.id);
        setNameError(null);
      }
    }
  };

  // Camera & Stream State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [fps, setFps] = useState<number>(0);

  // Requirement 3: Camera Calibration State (Option A: A4 Paper, Option B: Marker, Option C: Known Height)
  const [calibrationMethod, setCalibrationMethod] = useState<'a4_paper' | 'aruco_marker' | 'user_height'>('a4_paper');
  const [userHeightCmInput, setUserHeightCmInput] = useState<number>(referenceHeightCm || 180);
  const [paperHeightPx, setPaperHeightPx] = useState<number>(120);
  const [markerWidthPx, setMarkerWidthPx] = useState<number>(65);
  const [calibrationConfirmed, setCalibrationConfirmed] = useState<boolean>(true);

  // Pose & Skeleton Detection State
  const [isDetectorReady, setIsDetectorReady] = useState<boolean>(false);
  const [detectorStatus, setDetectorStatus] = useState<DetectorStatusStep>('Camera Offline');
  const [landmarksCount, setLandmarksCount] = useState<number>(0);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(true);
  const [lightingStatus, setLightingStatus] = useState<'optimal' | 'low_contrast' | 'overexposed'>('optimal');
  const [stabilityJitterMm, setStabilityJitterMm] = useState<number>(1.2);
  const prevLandmarksRef = useRef<NormalizedLandmark[] | null>(null);

  // Body Visibility Checklist State
  const [bodyPartVisibility, setBodyPartVisibility] = useState({
    head: false,
    neck: false,
    shoulders: false,
    elbows: false,
    wrists: false,
    chest: false,
    waist: false,
    hips: false,
    knees: false,
    feet: false,
  });

  // 360° Scanning States
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [rotationProgress, setRotationProgress] = useState<number>(0);
  const [capturedFrames, setCapturedFrames] = useState<CapturedAngleFrame[]>([]);
  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState<boolean>(true);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [showPreparationGuide, setShowPreparationGuide] = useState<boolean>(true);
  const [currentInstruction, setCurrentInstruction] = useState<string>(
    'Review preparation rules, select your calibration method, start camera, and step back for scanning.'
  );

  // Compute active scale factor (cm per pixel)
  const getActiveCalibration = (): CalibrationData => {
    let scale = 0.243; // baseline cm/px
    if (calibrationMethod === 'a4_paper') {
      scale = 29.7 / Math.max(10, paperHeightPx);
    } else if (calibrationMethod === 'aruco_marker') {
      scale = 15.0 / Math.max(5, markerWidthPx);
    } else if (calibrationMethod === 'user_height') {
      if (latestLandmarksRef.current && latestLandmarksRef.current.length >= 33) {
        const landmarks = latestLandmarksRef.current;
        const nose = landmarks[0];
        const lSh = landmarks[11];
        const rSh = landmarks[12];
        const lAnkle = landmarks[27];
        const rAnkle = landmarks[28];
        const lFoot = landmarks[31];
        const rFoot = landmarks[32];

        const shoulderMidY = (lSh.y + rSh.y) / 2;
        const noseToShoulder = Math.abs(shoulderMidY - nose.y);
        const headTopY = Math.max(-0.05, nose.y - 1.15 * noseToShoulder);
        const footBottomY = Math.max(lFoot?.y ?? lAnkle.y, rFoot?.y ?? rAnkle.y, lAnkle.y, rAnkle.y) + 0.02;
        const bodyPx = Math.max(100, (footBottomY - headTopY) * (videoResolution.height || 720));
        scale = userHeightCmInput / bodyPx;
      } else {
        scale = userHeightCmInput / Math.max(100, (videoResolution.height || 720) * 0.75);
      }
    }

    return {
      method: calibrationMethod,
      pixelToCmScale: scale,
      calibrationConfirmed: calibrationConfirmed,
      userSpecifiedHeightCm: userHeightCmInput,
      paperPixels: paperHeightPx,
      markerPixels: markerWidthPx
    };
  };

  // Voice Guidance Helper
  const speakInstruction = useCallback((text: string) => {
    if (!voiceGuideEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // ignore SpeechSynthesis errors
    }
  }, [voiceGuideEnabled]);

  // Initialize MediaPipe Pose Service
  useEffect(() => {
    let detector = new PoseDetectorService();
    poseDetectorRef.current = detector;

    detector
      .initialize()
      .then(() => {
        setIsDetectorReady(true);
        console.log('PoseDetectorService ready for video frames.');
      })
      .catch((err) => {
        console.error('Pose detector init error:', err);
      });

    return () => {
      detector.close();
      poseDetectorRef.current = null;
    };
  }, []);

  // Draw clean silhouette guide contour
  const drawSilhouetteGuideOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);

    const cx = width / 2;
    const headY = height * 0.14;
    const shoulderY = height * 0.28;
    const hipY = height * 0.52;
    const feetY = height * 0.88;

    // Head Oval Guide
    ctx.beginPath();
    ctx.ellipse(cx, headY, width * 0.06, height * 0.07, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Shoulder & Torso Contour
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.18, shoulderY);
    ctx.lineTo(cx + width * 0.18, shoulderY);
    ctx.lineTo(cx + width * 0.13, hipY);
    ctx.lineTo(cx - width * 0.13, hipY);
    ctx.closePath();
    ctx.stroke();

    // Legs Contour
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.08, hipY);
    ctx.lineTo(cx - width * 0.09, feetY);
    ctx.moveTo(cx + width * 0.08, hipY);
    ctx.lineTo(cx + width * 0.09, feetY);
    ctx.stroke();

    ctx.restore();
  };

  // Evaluate Landmarks & Body Visibility
  const evaluateLandmarksAndVisibility = (landmarks: NormalizedLandmark[] | null) => {
    const now = Date.now();

    if (!landmarks || landmarks.length < 33) {
      setLandmarksCount(0);
      latestLandmarksRef.current = null;

      const timeSinceLastDetection = now - lastSeenLandmarksTimestampRef.current;

      if (timeSinceLastDetection > 3000) {
        setDetectorStatus('No person detected in the webcam');
        setCurrentInstruction('No person detected in the webcam. Please stand in front of the camera.');
      } else {
        setDetectorStatus('Detecting Person...');
      }

      setBodyPartVisibility({
        head: false,
        neck: false,
        shoulders: false,
        elbows: false,
        wrists: false,
        chest: false,
        waist: false,
        hips: false,
        knees: false,
        feet: false,
      });
      return;
    }

    lastSeenLandmarksTimestampRef.current = now;
    latestLandmarksRef.current = landmarks;
    setLandmarksCount(landmarks.length);

    const getVis = (idx: number) => {
      const pt = landmarks[idx];
      return pt && pt.visibility !== undefined ? pt.visibility > 0.45 : false;
    };

    const head = getVis(0);
    const shoulders = getVis(11) && getVis(12);
    const elbows = getVis(13) && getVis(14);
    const wrists = getVis(15) && getVis(16);
    const hips = getVis(23) && getVis(24);
    const knees = getVis(25) && getVis(26);
    const feet = getVis(27) && getVis(28);

    setBodyPartVisibility({
      head,
      neck: head && shoulders,
      shoulders,
      elbows,
      wrists,
      chest: shoulders && hips,
      waist: shoulders && hips,
      hips,
      knees,
      feet,
    });

    const fullBody = head && shoulders && hips && knees;

    // Real-time Orientation & Distance Check
    const orient = detectBodyOrientation(landmarks);
    setCurrentOrientation(orient);

    const nose = landmarks[0];
    const lSh = landmarks[11];
    const rSh = landmarks[12];
    const lFoot = landmarks[31];
    const rFoot = landmarks[32];
    const lAnkle = landmarks[27];
    const rAnkle = landmarks[28];
    const shMidY = (lSh.y + rSh.y) / 2;
    const noseToSh = Math.abs(shMidY - nose.y);
    const headTopY = Math.max(-0.05, nose.y - 1.15 * noseToSh);
    const footBottomY = Math.max(lFoot?.y ?? lAnkle.y, rFoot?.y ?? rAnkle.y, lAnkle.y, rAnkle.y);
    const bodySpan = footBottomY - headTopY;

    if (bodySpan < 0.38) {
      setDistanceStatus('too_far');
      setDistanceWarning('Standing too far away. Move closer (2.0m - 2.5m) so your body occupies 50%-80% of the screen for sub-centimeter tailoring accuracy.');
    } else if (bodySpan > 0.94) {
      setDistanceStatus('too_close');
      setDistanceWarning('Standing too close to camera. Please step back so your entire body from head to feet is inside the frame.');
    } else {
      setDistanceStatus('optimal');
      setDistanceWarning(null);
    }

    if (fullBody) {
      setDetectorStatus('Full Body Visible');
      if (!isScanningActive) {
        setCurrentInstruction('Full body visible & calibrated! Click "START 3D SCAN" to begin 360° capture.');
      }
    } else {
      setDetectorStatus('Person Detected');
      if (!isScanningActive) {
        setCurrentInstruction('Person detected. Please step back until your head, torso, and knees are visible.');
      }
    }
  };

  // Process Each Live Video Frame
  const processVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended || video.readyState < 4) {
      animFrameIdRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      setVideoResolution({ width, height });
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animFrameIdRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    // Measure FPS
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastFpsUpdateRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)));
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }

    ctx.clearRect(0, 0, width, height);

    // Draw silhouette guide overlay
    drawSilhouetteGuideOverlay(ctx, width, height);

    // Check lighting contrast every 30 frames
    if (frameCountRef.current % 30 === 0) {
      try {
        const sampleW = Math.floor(width * 0.4);
        const sampleH = Math.floor(height * 0.4);
        const imgData = ctx.getImageData(Math.floor(width * 0.3), Math.floor(height * 0.3), sampleW, sampleH);
        const d = imgData.data;
        let lumSum = 0;
        let count = 0;
        for (let i = 0; i < d.length; i += 32) {
          lumSum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          count++;
        }
        const avgLum = lumSum / (count || 1);
        if (avgLum < 45) {
          setLightingStatus('low_contrast');
        } else if (avgLum > 225) {
          setLightingStatus('overexposed');
        } else {
          setLightingStatus('optimal');
        }
      } catch (e) {
        // ignore cross-origin canvas security if any
      }
    }

    // Detect pose using MediaPipe
    if (poseDetectorRef.current && isDetectorReady) {
      const landmarks = poseDetectorRef.current.detectPose(video, now);
      evaluateLandmarksAndVisibility(landmarks);

      // Measure frame-to-frame landmark position jitter
      if (landmarks && prevLandmarksRef.current && prevLandmarksRef.current.length >= 33) {
        const activeCal = getActiveCalibration();
        const prev = prevLandmarksRef.current;
        const dx = Math.abs(landmarks[11].x - prev[11].x) + Math.abs(landmarks[12].x - prev[12].x);
        const dy = Math.abs(landmarks[11].y - prev[11].y) + Math.abs(landmarks[12].y - prev[12].y);
        const jitterPx = (dx + dy) * width;
        const currentScale = activeCal.pixelToCmScale || 0.24;
        const measuredJitterMm = Math.min(12, Math.max(0.5, Math.round(jitterPx * currentScale * 10 * 10) / 10));
        setStabilityJitterMm(measuredJitterMm);
      }
      prevLandmarksRef.current = landmarks;

      if (landmarks && showWireframe) {
        drawPoseOverlay(ctx, landmarks, width, height);
      }
    }

    animFrameIdRef.current = requestAnimationFrame(processVideoFrame);
  }, [isDetectorReady, showWireframe, isScanningActive, calibrationMethod, paperHeightPx, markerWidthPx, userHeightCmInput, calibrationConfirmed]);

  // Start Webcam Stream
  const startCamera = async () => {
    // Requirement 1: Customer Name must be entered before opening the camera
    if (!customerName.trim()) {
      setNameError('Customer Name is required before opening the camera or starting a 3D scan.');
      const el = document.getElementById('customer-name-field');
      if (el) el.focus();
      return;
    }
    setNameError(null);

    setIsCameraStarting(true);
    setCameraError(null);
    setDetectorStatus('Connecting Camera...');

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      setIsCameraStarting(false);
      setDetectorStatus('Camera Ready');
      setCurrentInstruction('Webcam stream connected. Please step back so your full body is framed.');
    } catch (err: any) {
      console.error('Webcam start error:', err);
      setIsCameraStarting(false);
      setIsCameraActive(false);
      setDetectorStatus('Camera Offline');
      const errText = 'Could not connect to camera. Please check camera permissions in your browser.';
      setCameraError(errText);
      speakInstruction(errText);
    }
  };

  // Stop Webcam Stream
  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setDetectorStatus('Camera Offline');
    setLandmarksCount(0);
    latestLandmarksRef.current = null;
  };

  useEffect(() => {
    if (isCameraActive) {
      animFrameIdRef.current = requestAnimationFrame(processVideoFrame);
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isCameraActive, processVideoFrame]);

  // Verify Conditions before scanning
  const verifyPreScanConditions = (): { valid: boolean; reason?: string } => {
    if (!customerName.trim()) {
      return { valid: false, reason: 'Customer Name is required. Please enter a valid customer name before starting the scan.' };
    }

    if (!isCameraActive) {
      return { valid: false, reason: 'Webcam is offline. Please click "Start Camera" first.' };
    }

    if (!calibrationConfirmed) {
      return { valid: false, reason: 'Camera calibration is required. Please confirm your calibration settings.' };
    }

    if (!latestLandmarksRef.current || landmarksCount === 0) {
      return { valid: false, reason: 'Unable to detect full body. Please stand farther back with your entire body visible.' };
    }

    const b = bodyPartVisibility;
    const isFullBodyTracked = b.head && b.shoulders && b.hips && b.knees;
    if (!isFullBodyTracked) {
      return { valid: false, reason: 'Unable to detect full body. Please stand farther back with your entire body visible.' };
    }

    if (distanceStatus === 'too_far') {
      return { valid: false, reason: 'Standing too far from camera. Please move closer (recommended 2.0m - 2.5m) so your body occupies 50%-80% of the screen.' };
    }

    return { valid: true };
  };

  // Automated 360° Scan Workflow
  const start3DScanWorkflow = async () => {
    setScanError(null);

    // Requirement 1: Strictly enforce customer name before starting 3D scan
    if (!customerName.trim()) {
      setNameError('Customer Name is required before starting the 3D scan.');
      setScanError('Please enter a customer name above before starting the scan.');
      const el = document.getElementById('customer-name-field');
      if (el) el.focus();
      return;
    }
    setNameError(null);

    if (!isCameraActive) {
      await startCamera();
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    const verification = verifyPreScanConditions();
    if (!verification.valid) {
      const errMsg = verification.reason || 'Unable to detect full body. Please stand farther back with your entire body visible.';
      setScanError(errMsg);
      speakInstruction(errMsg);
      return;
    }

    setIsScanningActive(true);
    setRotationProgress(0);
    setScanStepIndex(0);
    setCapturedFrames([]);

    const steps = SCAN_ANGLE_STEPS;
    const totalSteps = steps.length;
    const captured: CapturedAngleFrame[] = [];

    try {
      for (let i = 0; i < totalSteps; i++) {
        const step = steps[i];
        setScanStepIndex(i);
        const prog = Math.round(((i + 1) / totalSteps) * 100);
        setRotationProgress(prog);

        const msg = `Step ${i + 1}/${totalSteps}: Please rotate to face ${step.label}.`;
        setCurrentInstruction(msg);
        speakInstruction(`Turn to ${step.label}`);

        // Wait until body landmarks are detected AND orientation aligns with target
        let validFrameLandmarks: NormalizedLandmark[] | null = null;
        let matchedOrient: DetectedBodyOrientation | null = null;
        let attempts = 0;
        const maxAttempts = 120; // up to 12s per angle
        let stableCount = 0;

        while (attempts < maxAttempts) {
          const currentLms = latestLandmarksRef.current;
          if (currentLms && Array.isArray(currentLms) && currentLms.length >= 33) {
            const requiredIndices = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26];
            const allJointsVisible = requiredIndices.every((idx) => {
              const pt = currentLms[idx];
              return pt && (pt.visibility === undefined || pt.visibility >= 0.28);
            });

            if (allJointsVisible) {
              const orient = detectBodyOrientation(currentLms);
              if (orient) {
                const diff = Math.min(
                  Math.abs(orient.angleDegrees - step.angle),
                  Math.abs((orient.angleDegrees + 360) - step.angle),
                  Math.abs(orient.angleDegrees - (step.angle + 360))
                );

                // Check if user has turned to target angle or closest step
                if (diff <= 35 || orient.nearestStepAngle === step.angle) {
                  stableCount++;
                  // Require 2 consecutive frames for motion blur suppression
                  if (stableCount >= 2) {
                    validFrameLandmarks = [...currentLms];
                    matchedOrient = orient;
                    break;
                  }
                } else {
                  stableCount = 0;
                  if (attempts > 20 && attempts % 15 === 0) {
                    setCurrentInstruction(`Currently facing ${orient.label} (${orient.angleDegrees}°). Please rotate to ${step.label}.`);
                  }
                }
              }
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        // Fallback to latest valid landmarks if timeout reached with full body tracked
        if (!validFrameLandmarks && latestLandmarksRef.current && latestLandmarksRef.current.length >= 33) {
          validFrameLandmarks = [...latestLandmarksRef.current];
          matchedOrient = detectBodyOrientation(validFrameLandmarks);
        }

        if (!validFrameLandmarks || validFrameLandmarks.length < 33) {
          throw new Error(`Unable to detect full body at ${step.label}. Please stand so your entire body from head to feet is visible.`);
        }

        const video = videoRef.current;
        if (!video || video.paused || video.ended || video.readyState < 4) {
          throw new Error('Webcam feed was disconnected during 360° scan.');
        }

        // Capture real frame from video element
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = video.videoWidth || 1280;
        frameCanvas.height = video.videoHeight || 720;
        const frameCtx = frameCanvas.getContext('2d');
        if (!frameCtx) {
          throw new Error('Failed to create canvas context for frame capture.');
        }

        frameCtx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
        const realWebcamSnapshotBase64 = frameCanvas.toDataURL('image/jpeg', 0.85);

        if (!realWebcamSnapshotBase64 || realWebcamSnapshotBase64.length < 100) {
          throw new Error('Failed to capture frame from webcam stream.');
        }

        captured.push({
          angle: step.angle,
          label: step.label,
          snapshotUrl: realWebcamSnapshotBase64,
          landmarks: validFrameLandmarks,
          detectedAngle: matchedOrient?.angleDegrees ?? step.angle,
          actualOrientation: matchedOrient?.label ?? step.label,
          isKeyAngle: [0, 90, 180, 270, 360].includes(step.angle)
        });

        setCapturedFrames([...captured]);
      }

      setCurrentInstruction('360° Webcam Scan Complete! Reconstructing 3D body measurements...');
      speakInstruction('Scan complete! Processing your measurements.');

      await new Promise((resolve) => setTimeout(resolve, 600));

      // Requirement 6: Stop camera and release hardware video stream resources immediately!
      stopCamera();

      const activeCal = getActiveCalibration();
      const { measurements } = reconstruct3DBodyMeasurements(
        captured,
        activeCal,
        videoResolution,
        {
          stabilityJitterMm,
          lightingCondition: lightingStatus
        }
      );

      setIsScanningActive(false);

      onScanComplete({
        imageBase64: captured[0].snapshotUrl,
        measurements,
        capturedFrames: captured,
        customerName: customerName.trim(),
        customerId: customerId.trim()
      });
    } catch (err: any) {
      console.error('Scan error:', err);
      setIsScanningActive(false);
      const errorText = err.message || 'Unable to detect full body. Please stand farther back with your entire body visible.';
      setScanError(errorText);
      speakInstruction(errorText);
    }
  };

  const currentStep = SCAN_ANGLE_STEPS[scanStepIndex];

  // Helper for Status Badge Color
  const getStatusBadgeStyle = (status: DetectorStatusStep) => {
    switch (status) {
      case 'Ready to Scan':
      case 'Full Body Visible':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'Person Detected':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'Detecting Person...':
      case 'Camera Ready':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'No person detected in the webcam':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const activeCal = getActiveCalibration();

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner & Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Scissors className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-sans">
              Men's Tailoring 360° AI Biometric Scanner
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>13 Tailoring Dimensions</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Calibrated optical computer vision • Strictly for male tailoring • MediaPipe Pose & multi-view geometry
          </p>
        </div>

        {/* Live Toolbar */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tailor Photo Guide</span>
          </button>

          <button
            onClick={() => setVoiceGuideEnabled(!voiceGuideEnabled)}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              voiceGuideEnabled
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle Voice Guidance"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowWireframe(!showWireframe)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1 cursor-pointer ${
              showWireframe
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showWireframe ? 'Skeleton: ON' : 'Skeleton: OFF'}</span>
          </button>

          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1 cursor-pointer ${
              showDebugPanel
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Telemetry</span>
          </button>
        </div>
      </div>

      {/* Requirement 1: Step 1 - Customer Profile Identity (Required Before Camera or Scan) */}
      <div className={`p-6 rounded-3xl border shadow-xs transition-all ${
        nameError ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400/30' : 'bg-white/95 border-slate-200/80'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <span className={`p-2.5 rounded-2xl shrink-0 ${
              nameError ? 'bg-rose-100 text-rose-700' : 'bg-blue-600 text-white shadow-xs'
            }`}>
              <User className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-slate-900 font-sans">
                  Step 1: Customer Identity & Session Setup
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  REQUIRED BEFORE SCAN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every measurement session is strictly bound to this customer. Enter a real customer name or select an existing client profile.
              </p>
            </div>
          </div>

          {existingCustomers && existingCustomers.length > 0 && (
            <div className="flex items-center space-x-2 shrink-0">
              <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Existing Customer:</label>
              <select
                value={selectedExistingId}
                onChange={(e) => handleSelectExisting(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              >
                <option value="">-- Select Client Profile --</option>
                {existingCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
                <option value="NEW">+ Enter New Customer</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Customer Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="customer-name-field"
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (e.target.value.trim()) setNameError(null);
                }}
                placeholder="Enter customer's real full name (e.g. Marcus Vance, David Sterling)"
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-900 border transition-all focus:outline-none focus:ring-2 ${
                  nameError
                    ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-500/20'
                    : 'border-slate-200 bg-slate-50/80 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20'
                }`}
              />
            </div>
            {nameError && (
              <p className="text-xs text-rose-600 font-semibold flex items-center space-x-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{nameError}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Customer ID
            </label>
            <input
              type="text"
              value={customerId}
              readOnly
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Step 2: Clear Preparation Screen */}
      {showPreparationGuide && (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30">
                <CheckSquare className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-white font-sans uppercase tracking-wider">
                  Step 2: Men's Tailoring Scan Preparation Rules
                </h3>
                <p className="text-[11px] text-slate-400">
                  Follow these 7 tailoring standards before camera calibration and capture
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-blue-300 border border-white/10 flex items-center space-x-1 transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>View Photographic Standards</span>
              </button>
              <button
                onClick={() => setShowPreparationGuide(false)}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300 font-mono">1</span>
                <span>Fitted Clothing</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Wear fitted clothing (t-shirt/dress shirt & fitted trousers) that does not obscure natural body contours.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300 font-mono">2</span>
                <span>Natural Posture</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Stand naturally upright with feet positioned shoulder-width apart as guided on screen.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300 font-mono">3</span>
                <span>Arms in A-Pose</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Keep arms slightly away from the torso (15-20° A-pose) so armpits, waist, and hips are clearly delineated.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300 font-mono">4</span>
                <span>Full Body Framing</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Step back ~2.0m until head, shoulders, torso, and legs are completely framed inside viewport.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300 font-mono">5</span>
                <span>Even Lighting</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Use even ambient front lighting and stand against a clean, plain background without harsh backlights.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300 font-mono">6</span>
                <span>Clear Silhouette</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Remove bulky coats, bags, or objects that obscure your neck, waistline, and leg silhouettes.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300 font-mono">7</span>
                <span>Fixed Camera</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Keep the camera stationary on a desk or tripod. Do not move or tilt camera during calibration or capture.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-white mb-1">Tailor Photo Reference</p>
                <p className="text-[11px] text-blue-200">
                  Review the official 12 male tailoring measurement lines.
                </p>
              </div>
              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="mt-2 w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Inspect 12 Lines
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 3: Camera Calibration Setup Section */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-blue-400">
            <Ruler className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-white">Camera Calibration Setup</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800 flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scale: {activeCal.pixelToCmScale.toFixed(4)} cm/px</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option A (Preferred): A4 Paper */}
          <button
            type="button"
            onClick={() => {
              setCalibrationMethod('a4_paper');
              setCalibrationConfirmed(true);
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              calibrationMethod === 'a4_paper'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <FileText className={`w-4 h-4 ${calibrationMethod === 'a4_paper' ? 'text-blue-400' : 'text-slate-500'}`} />
              <span className="font-bold text-xs font-sans">Option A (Preferred)</span>
            </div>
            <p className="font-bold text-sm text-white">A4 Paper Calibration</p>
            <p className="text-[11px] text-slate-400 mt-1">Stand next to a standard A4 sheet (21 × 29.7 cm).</p>
          </button>

          {/* Option B: ArUco / AprilTag Marker */}
          <button
            type="button"
            onClick={() => {
              setCalibrationMethod('aruco_marker');
              setCalibrationConfirmed(true);
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              calibrationMethod === 'aruco_marker'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <Tag className={`w-4 h-4 ${calibrationMethod === 'aruco_marker' ? 'text-blue-400' : 'text-slate-500'}`} />
              <span className="font-bold text-xs font-sans">Option B</span>
            </div>
            <p className="font-bold text-sm text-white">ArUco / AprilTag Marker</p>
            <p className="text-[11px] text-slate-400 mt-1">Hold or place a 15×15 cm square calibration marker.</p>
          </button>

          {/* Option C: Exact User Height */}
          <div
            onClick={() => {
              setCalibrationMethod('user_height');
              setCalibrationConfirmed(true);
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              calibrationMethod === 'user_height'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <Ruler className={`w-4 h-4 ${calibrationMethod === 'user_height' ? 'text-blue-400' : 'text-slate-500'}`} />
              <span className="font-bold text-xs font-sans">Option C</span>
            </div>
            <p className="font-bold text-sm text-white">Exact Height Reference</p>
            <div className="mt-2 flex items-center space-x-2">
              <input
                type="number"
                value={userHeightCmInput}
                onChange={(e) => setUserHeightCmInput(Number(e.target.value) || 180)}
                className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs font-mono text-slate-300">cm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live On-Screen Guidance Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-lg border border-slate-800 flex items-center space-x-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">Live Guidance</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold border ${getStatusBadgeStyle(detectorStatus)}`}>
              {detectorStatus}
            </span>
          </div>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{currentInstruction}</p>
        </div>
      </div>

      {/* Camera Error Message Alert */}
      {cameraError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start space-x-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-rose-900 text-sm">Webcam Access Issue</span>
            <p className="text-rose-800">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Requirement 7 & 9: Scan Requirement Warning / Low Confidence Alert */}
      {scanError && (
        <div className="p-5 rounded-2xl bg-rose-950/90 border border-rose-800 text-rose-100 text-xs flex items-start space-x-3 shadow-xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <span className="font-bold text-rose-200 text-sm block">360° Scan Quality / Confidence Alert</span>
            <p className="text-rose-200 font-medium">{scanError}</p>
            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={start3DScanWorkflow}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition-all cursor-pointer"
              >
                Retake 360° Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Scanner Viewport Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Large Camera Feed Viewport */}
        <div className="lg:col-span-8 bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative min-h-[500px] sm:min-h-[580px] flex flex-col justify-center items-center">
          
          {/* Real Webcam Stream Element */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover absolute inset-0 ${!isCameraActive ? 'hidden' : 'block'}`}
          />

          {/* Standby Camera Disabled View */}
          {!isCameraActive && (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4 z-10">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                <CameraOff className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-lg font-bold text-slate-200 font-sans">Webcam Stream Offline</h3>
                <p className="text-xs text-slate-400">
                  Click "Start Camera" below to grant camera access and activate continuous MediaPipe Pose detection.
                </p>
              </div>
              <button
                onClick={startCamera}
                disabled={isCameraStarting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer"
              >
                {isCameraStarting ? 'Opening Camera...' : 'Start Camera Feed'}
              </button>
            </div>
          )}

          {/* Live Overlay Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover absolute inset-0 pointer-events-none z-10"
          />

          {/* HUD Landmark & Orientation Badges */}
          {isCameraActive && (
            <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 max-w-[70%]">
              <div className="flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-mono text-white shadow-lg">
                <Activity className={`w-3.5 h-3.5 ${landmarksCount > 0 ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                <span>Landmarks: {landmarksCount} / 33</span>
              </div>

              {/* Real-time Facing Orientation Badge */}
              <div className="flex items-center space-x-1.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-500/40 text-xs font-mono text-blue-300 shadow-lg">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>Facing: {currentOrientation?.label ?? 'Detecting...'} ({currentOrientation?.angleDegrees ?? 0}°)</span>
              </div>
            </div>
          )}

          {/* Customer Identity Tag on Viewport */}
          {isCameraActive && customerName && (
            <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-sans text-slate-200 shadow-lg">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-bold text-white truncate max-w-[140px]">{customerName}</span>
              <span className="text-[10px] text-slate-400 font-mono">({customerId})</span>
            </div>
          )}

          {/* Distance and Resolution Alert Banner */}
          {isCameraActive && distanceWarning && !isScanningActive && (
            <div className="absolute top-16 left-4 right-4 z-20 bg-amber-950/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-600/80 text-amber-200 text-xs flex items-center space-x-2.5 shadow-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold">{distanceWarning}</span>
            </div>
          )}

          {/* Circular Progress Overlay during 360 Scan */}
          {isScanningActive && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-30 text-white p-6 space-y-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="62"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-slate-800"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="62"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-blue-500 transition-all duration-500 ease-out"
                    fill="transparent"
                    strokeDasharray={389.5}
                    strokeDashoffset={389.5 - (389.5 * rotationProgress) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold font-mono text-white">{rotationProgress}%</span>
                  <span className="text-[10px] text-blue-300 font-semibold tracking-wider uppercase">360° Scan</span>
                </div>
              </div>

              <div className="text-center space-y-2 max-w-sm">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600/30 text-blue-300 border border-blue-500/50">
                    Target: {currentStep?.label}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 flex items-center space-x-1">
                    <Compass className="w-3 h-3" />
                    <span>Live: {currentOrientation?.label ?? 'Rotating...'} ({currentOrientation?.angleDegrees ?? 0}°)</span>
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mt-1 animate-pulse">{currentStep?.instruction}</p>
              </div>
            </div>
          )}

          {/* Bottom Toolbar */}
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center space-x-2">
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  disabled={isCameraStarting}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Camera</span>
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              )}
            </div>

            {/* START 3D SCAN BUTTON */}
            <button
              onClick={start3DScanWorkflow}
              disabled={isScanningActive}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isScanningActive ? 'animate-spin' : ''}`} />
              <span>START 3D SCAN</span>
            </button>

            <div className="text-xs text-slate-400 flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isCameraActive ? `${fps} FPS` : 'Camera Standby'}</span>
            </div>
          </div>

        </div>

        {/* Side Panel: Angle Thumbnails, Tracked Landmarks, & Telemetry Panel */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Telemetry Debug Panel */}
          {showDebugPanel && (
            <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <Terminal className="w-4 h-4" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">Calibration Telemetry</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full">
                  Live Telemetry
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-sans">Calibration Method</span>
                  <span className="font-bold text-blue-400 truncate block uppercase">{calibrationMethod}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-sans">Scale Factor</span>
                  <span className="font-bold text-emerald-400 block">{activeCal.pixelToCmScale.toFixed(4)} cm/px</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-sans">Camera Stream</span>
                  <span className={`font-bold truncate block ${isCameraActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isCameraActive ? `${videoResolution.width}x${videoResolution.height}` : 'Offline'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-sans">Pose Landmarks</span>
                  <span className={`font-bold block ${landmarksCount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {landmarksCount} / 33
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Captured Webcam Angle Frames */}
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900">
                <RotateCw className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Webcam Captured Angles</h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {capturedFrames.length} / 9 Frames
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-[190px] overflow-y-auto pr-1">
              {SCAN_ANGLE_STEPS.map((step) => {
                const captured = capturedFrames.find((f) => f.angle === step.angle);
                return (
                  <div
                    key={step.angle}
                    className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                      captured
                        ? 'bg-blue-50/80 border-blue-400 text-blue-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    {captured && captured.snapshotUrl ? (
                      <img
                        src={captured.snapshotUrl}
                        alt={step.label}
                        className="w-full h-11 rounded-lg object-cover mb-1 border border-blue-200"
                      />
                    ) : (
                      <div className="w-full h-11 rounded-lg bg-slate-200/60 flex items-center justify-center text-[10px] font-mono text-slate-500 mb-1">
                        {step.angle}°
                      </div>
                    )}
                    <span className="text-[9px] font-bold truncate w-full">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tracked Body Landmarks Checklist */}
          <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Live Joint Tracking</h3>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  landmarksCount > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'
                }`}
              >
                {landmarksCount > 0 ? `${landmarksCount} Landmarks` : 'Searching...'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              {[
                { name: 'Head', active: bodyPartVisibility.head },
                { name: 'Neck', active: bodyPartVisibility.neck },
                { name: 'Shoulders', active: bodyPartVisibility.shoulders },
                { name: 'Elbows', active: bodyPartVisibility.elbows },
                { name: 'Wrists', active: bodyPartVisibility.wrists },
                { name: 'Chest', active: bodyPartVisibility.chest },
                { name: 'Waist', active: bodyPartVisibility.waist },
                { name: 'Hips', active: bodyPartVisibility.hips },
                { name: 'Knees', active: bodyPartVisibility.knees },
              ].map((part) => (
                <div
                  key={part.name}
                  className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                    part.active
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="font-semibold text-[11px]">{part.name}</span>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${part.active ? 'text-emerald-600' : 'text-slate-300'}`} />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Master Tailor Photographic Reference Modal */}
      <TailoringReferenceModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

    </div>
  );
};
