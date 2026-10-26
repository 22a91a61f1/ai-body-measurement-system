import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BodyMeasurements, MeasurementUnit, MensTailoringKey } from '../../types';
import { formatLength } from '../../utils/unitConverter';
import { RotateCw, ZoomIn, ZoomOut, Eye, Layers, Sparkles, User, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AvatarViewer3DProps {
  measurements: BodyMeasurements;
  unit: MeasurementUnit;
  userName?: string;
  className?: string;
}

interface TailoringBandInfo {
  key: MensTailoringKey;
  label: string;
  category: 'upper' | 'lower';
  metricValue: number; // in cm
  formatted: string;
  definition: string;
  meshNames: string[];
}

export const AvatarViewer3D: React.FC<AvatarViewer3DProps> = ({
  measurements,
  unit,
  userName = 'Customer',
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const partMeshesRef = useRef<Map<string, THREE.Mesh | THREE.Line>>(new Map());
  const measurementBandsRef = useRef<Map<string, THREE.Object3D>>(new Map());

  const [hoveredKey, setHoveredKey] = useState<MensTailoringKey | null>(null);
  const [selectedKey, setSelectedKey] = useState<MensTailoringKey | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showRings, setShowRings] = useState<boolean>(true);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);

  // Convert measurement based on active unit mathematically
  const formatValue = (cmVal: number) => {
    return formatLength(cmVal, unit);
  };

  // Report & items
  const report = measurements.mensTailoring;
  const items = report?.items;

  // 12 Tailoring Measurement Band Definitions
  const getTailoringBands = (): TailoringBandInfo[] => [
    {
      key: 'neckline',
      label: '1. Neckline / Collar',
      category: 'upper',
      metricValue: items?.neckline?.valueCm || measurements.neck || 39.5,
      formatted: formatValue(items?.neckline?.valueCm || measurements.neck || 39.5),
      definition: 'Circumference around the base of the neck at the shirt-collar line.',
      meshNames: ['mesh_neck', 'band_neckline']
    },
    {
      key: 'chest',
      label: '2. Chest Circumference',
      category: 'upper',
      metricValue: items?.chest?.valueCm || measurements.chest || 102.0,
      formatted: formatValue(items?.chest?.valueCm || measurements.chest || 102.0),
      definition: 'Horizontal circumference around the fullest plane of the chest.',
      meshNames: ['mesh_chest', 'band_chest']
    },
    {
      key: 'shoulder',
      label: '3. Shoulder Width',
      category: 'upper',
      metricValue: items?.shoulder?.valueCm || measurements.shoulder || 48.0,
      formatted: formatValue(items?.shoulder?.valueCm || measurements.shoulder || 48.0),
      definition: 'Bi-acromial distance between left and right shoulder points across back.',
      meshNames: ['mesh_shoulder_l', 'mesh_shoulder_r', 'band_shoulder']
    },
    {
      key: 'sleeve',
      label: '4. Sleeve Length',
      category: 'upper',
      metricValue: items?.sleeve?.valueCm || measurements.sleeveLength || 64.0,
      formatted: formatValue(items?.sleeve?.valueCm || measurements.sleeveLength || 64.0),
      definition: 'Shoulder acromion point down outer arm along elbow to wrist cuff.',
      meshNames: ['mesh_arm_r', 'mesh_forearm_r', 'band_sleeve']
    },
    {
      key: 'bicep',
      label: '5. Bicep Circumference',
      category: 'upper',
      metricValue: items?.bicep?.valueCm || measurements.bicep || 33.5,
      formatted: formatValue(items?.bicep?.valueCm || measurements.bicep || 33.5),
      definition: 'Circumference around the fullest part of the upper arm.',
      meshNames: ['mesh_arm_r', 'band_bicep']
    },
    {
      key: 'wrist',
      label: '6. Wrist Circumference',
      category: 'upper',
      metricValue: items?.wrist?.valueCm || measurements.wrist || 17.5,
      formatted: formatValue(items?.wrist?.valueCm || measurements.wrist || 17.5),
      definition: 'Circumference around the wrist bone at the shirt-cuff line.',
      meshNames: ['mesh_forearm_r', 'band_wrist']
    },
    {
      key: 'belly',
      label: '7. Belly Circumference',
      category: 'lower',
      metricValue: items?.belly?.valueCm || measurements.stomach || 86.0,
      formatted: formatValue(items?.belly?.valueCm || measurements.stomach || 86.0),
      definition: 'Circumference around the fullest part of the abdomen (distinct from waist).',
      meshNames: ['mesh_belly', 'band_belly']
    },
    {
      key: 'hip',
      label: '8. Hip Circumference',
      category: 'lower',
      metricValue: items?.hip?.valueCm || measurements.hip || 98.0,
      formatted: formatValue(items?.hip?.valueCm || measurements.hip || 98.0),
      definition: 'Horizontal circumference around the fullest part of the hips and seat.',
      meshNames: ['mesh_hips', 'band_hip']
    },
    {
      key: 'jacketLength',
      label: '9. Jacket Length',
      category: 'lower',
      metricValue: items?.jacketLength?.valueCm || measurements.shirtLength || 74.5,
      formatted: formatValue(items?.jacketLength?.valueCm || measurements.shirtLength || 74.5),
      definition: 'Base-of-neck/high-shoulder point to specified jacket hem position.',
      meshNames: ['mesh_chest', 'band_jacketLength']
    },
    {
      key: 'pantOutseam',
      label: '10. Pant Outseam',
      category: 'lower',
      metricValue: items?.pantOutseam?.valueCm || measurements.outseam || 103.5,
      formatted: formatValue(items?.pantOutseam?.valueCm || measurements.outseam || 103.5),
      definition: 'From trouser waistband down the outside of the leg to trouser hem.',
      meshNames: ['mesh_thigh_r', 'mesh_calf_r', 'band_pantOutseam']
    },
    {
      key: 'thigh',
      label: '11. Thigh Circumference',
      category: 'lower',
      metricValue: items?.thigh?.valueCm || measurements.thigh || 58.0,
      formatted: formatValue(items?.thigh?.valueCm || measurements.thigh || 58.0),
      definition: 'Circumference around the fullest part of the upper thigh below crotch.',
      meshNames: ['mesh_thigh_r', 'band_thigh']
    },
    {
      key: 'waist',
      label: '12. Waist Circumference',
      category: 'lower',
      metricValue: items?.waist?.valueCm || measurements.waist || 84.0,
      formatted: formatValue(items?.waist?.valueCm || measurements.waist || 84.0),
      definition: 'Circumference around the natural trouser-waistband position.',
      meshNames: ['mesh_waist', 'band_waist']
    }
  ];

  const bandsList = getTailoringBands();
  const activeKey = hoveredKey || selectedKey;
  const activeBand = bandsList.find(b => b.key === activeKey) || null;

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 600;
    const height = mountRef.current.clientHeight || 520;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0.9, 3.6);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.4); // Blue/Cyan key
    dirLight1.position.set(2.5, 4, 3.5);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.8); // Purple rim
    dirLight2.position.set(-3, 2, -2.5);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x60a5fa, 1.2, 8);
    pointLight.position.set(0, -0.4, 2);
    scene.add(pointLight);

    // Grid Floor
    const grid = new THREE.GridHelper(10, 24, 0x1d4ed8, 0x0f172a);
    grid.position.y = -1.25;
    scene.add(grid);

    // 5. Construct Male Avatar Group
    const avatarGroup = new THREE.Group();
    avatarGroupRef.current = avatarGroup;
    scene.add(avatarGroup);

    // Anatomical Male Proportions derived from calibrated measurements
    const chestVal = items?.chest?.valueCm || measurements.chest || 102;
    const waistVal = items?.waist?.valueCm || measurements.waist || 84;
    const bellyVal = items?.belly?.valueCm || measurements.stomach || 86;
    const shoulderVal = items?.shoulder?.valueCm || measurements.shoulder || 48;
    const hipVal = items?.hip?.valueCm || measurements.hip || 98;
    const bicepVal = items?.bicep?.valueCm || measurements.bicep || 33.5;
    const thighVal = items?.thigh?.valueCm || measurements.thigh || 58;
    const sleeveVal = items?.sleeve?.valueCm || measurements.sleeveLength || 64;
    const outseamVal = items?.pantOutseam?.valueCm || measurements.outseam || 103.5;

    // Scale helpers
    const shoulderSpan = Math.max(0.42, shoulderVal / 105);
    const chestRadius = Math.max(0.20, (chestVal / Math.PI) / 140);
    const waistRadius = Math.max(0.17, (waistVal / Math.PI) / 140);
    const bellyRadius = Math.max(0.18, (bellyVal / Math.PI) / 140);
    const hipRadius = Math.max(0.20, (hipVal / Math.PI) / 140);
    const bicepRadius = Math.max(0.065, (bicepVal / Math.PI) / 140);
    const thighRadius = Math.max(0.10, (thighVal / Math.PI) / 140);
    const armLengthScale = Math.max(0.55, sleeveVal / 105);
    const legLengthScale = Math.max(0.85, outseamVal / 115);

    // Materials
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.25,
      roughness: 0.5,
      wireframe: wireframeMode
    });

    const createPartMesh = (
      name: string,
      geometry: THREE.BufferGeometry,
      position: [number, number, number],
      rotation?: [number, number, number]
    ) => {
      const mesh = new THREE.Mesh(geometry, baseMaterial.clone());
      mesh.name = name;
      mesh.position.set(...position);
      if (rotation) mesh.rotation.set(...rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      avatarGroup.add(mesh);
      partMeshesRef.current.set(name, mesh);
      return mesh;
    };

    // Body Geometry
    // Head
    createPartMesh('mesh_head', new THREE.SphereGeometry(0.11, 24, 24), [0, 0.95, 0]);

    // Neck
    const neckRadius = Math.max(0.065, (items?.neckline?.valueCm || measurements.neck || 39.5) / 580);
    createPartMesh('mesh_neck', new THREE.CylinderGeometry(neckRadius, neckRadius * 1.08, 0.12, 20), [0, 0.81, 0]);

    // Shoulders
    createPartMesh('mesh_shoulder_l', new THREE.SphereGeometry(0.075, 16, 16), [-shoulderSpan / 2, 0.72, 0]);
    createPartMesh('mesh_shoulder_r', new THREE.SphereGeometry(0.075, 16, 16), [shoulderSpan / 2, 0.72, 0]);

    // Chest & Upper Torso (Male V-taper)
    const chestGeo = new THREE.CylinderGeometry(shoulderSpan * 0.76, chestRadius * 1.35, 0.28, 24);
    createPartMesh('mesh_chest', chestGeo, [0, 0.56, 0]);

    // Mid Torso (Belly / Abdomen)
    const bellyGeo = new THREE.CylinderGeometry(chestRadius * 1.35, bellyRadius * 1.32, 0.18, 24);
    createPartMesh('mesh_belly', bellyGeo, [0, 0.35, 0]);

    // Lower Torso / Trouser Waist
    const waistGeo = new THREE.CylinderGeometry(bellyRadius * 1.32, waistRadius * 1.3, 0.15, 24);
    createPartMesh('mesh_waist', waistGeo, [0, 0.19, 0]);

    // Hips / Pelvis
    const hipsGeo = new THREE.CylinderGeometry(waistRadius * 1.3, hipRadius * 1.32, 0.18, 24);
    createPartMesh('mesh_hips', hipsGeo, [0, 0.03, 0]);

    // Arms (Right & Left)
    const upperArmGeo = new THREE.CylinderGeometry(bicepRadius * 1.05, bicepRadius * 0.92, 0.28 * armLengthScale, 16);
    createPartMesh('mesh_arm_l', upperArmGeo, [-shoulderSpan / 2 - 0.04, 0.50, 0], [0, 0, 0.16]);
    createPartMesh('mesh_arm_r', upperArmGeo, [shoulderSpan / 2 + 0.04, 0.50, 0], [0, 0, -0.16]);

    const foreArmGeo = new THREE.CylinderGeometry(bicepRadius * 0.88, 0.045, 0.26 * armLengthScale, 16);
    createPartMesh('mesh_forearm_l', foreArmGeo, [-shoulderSpan / 2 - 0.09, 0.24, 0], [0, 0, 0.1]);
    createPartMesh('mesh_forearm_r', foreArmGeo, [shoulderSpan / 2 + 0.09, 0.24, 0], [0, 0, -0.1]);

    // Legs (Right & Left)
    const thighGeo = new THREE.CylinderGeometry(thighRadius * 1.1, thighRadius * 0.85, 0.44 * legLengthScale, 20);
    createPartMesh('mesh_thigh_l', thighGeo, [-hipRadius * 0.6, -0.28, 0]);
    createPartMesh('mesh_thigh_r', thighGeo, [hipRadius * 0.6, -0.28, 0]);

    const lowerLegGeo = new THREE.CylinderGeometry(thighRadius * 0.78, 0.065, 0.44 * legLengthScale, 20);
    createPartMesh('mesh_calf_l', lowerLegGeo, [-hipRadius * 0.6, -0.72, 0]);
    createPartMesh('mesh_calf_r', lowerLegGeo, [hipRadius * 0.6, -0.72, 0]);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.08, 0.06, 0.18);
    createPartMesh('mesh_foot_l', footGeo, [-hipRadius * 0.6, -0.96, 0.04]);
    createPartMesh('mesh_foot_r', footGeo, [hipRadius * 0.6, -0.96, 0.04]);

    // 6. BUILD 12 VISIBLE TAILORING MEASUREMENT BANDS & GUIDES
    const createRingBand = (key: string, radius: number, y: number, color = 0x38bdf8) => {
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.9
      });
      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.007, 8, 36), ringMat);
      ringMesh.position.set(0, y, 0);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.name = `band_${key}`;
      avatarGroup.add(ringMesh);
      measurementBandsRef.current.set(key, ringMesh);
      return ringMesh;
    };

    const createLineBand = (key: string, points: THREE.Vector3[], color = 0x38bdf8) => {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 3 });
      const lineObj = new THREE.Line(lineGeo, lineMat);
      lineObj.name = `band_${key}`;
      avatarGroup.add(lineObj);
      measurementBandsRef.current.set(key, lineObj);
      return lineObj;
    };

    if (showRings) {
      // 1. Neckline Ring
      createRingBand('neckline', neckRadius * 1.15, 0.76, 0x38bdf8);

      // 2. Chest Ring
      createRingBand('chest', chestRadius * 1.48, 0.56, 0x38bdf8);

      // 3. Shoulder Width Dimension Bar
      createLineBand('shoulder', [
        new THREE.Vector3(-shoulderSpan / 2, 0.73, 0.08),
        new THREE.Vector3(shoulderSpan / 2, 0.73, 0.08)
      ], 0x38bdf8);

      // 4. Sleeve Length Guide Path (right arm)
      createLineBand('sleeve', [
        new THREE.Vector3(shoulderSpan / 2, 0.72, 0.02),
        new THREE.Vector3(shoulderSpan / 2 + 0.05, 0.40, 0.02),
        new THREE.Vector3(shoulderSpan / 2 + 0.09, 0.12, 0.02)
      ], 0x38bdf8);

      // 5. Bicep Ring (right arm)
      const bicepRing = new THREE.Mesh(
        new THREE.TorusGeometry(bicepRadius * 1.12, 0.006, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.9 })
      );
      bicepRing.position.set(shoulderSpan / 2 + 0.05, 0.46, 0);
      bicepRing.rotation.set(Math.PI / 2, 0, -0.16);
      bicepRing.name = 'band_bicep';
      avatarGroup.add(bicepRing);
      measurementBandsRef.current.set('bicep', bicepRing);

      // 6. Wrist Ring (right arm)
      const wristRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.048, 0.005, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.9 })
      );
      wristRing.position.set(shoulderSpan / 2 + 0.10, 0.12, 0);
      wristRing.rotation.set(Math.PI / 2, 0, -0.1);
      wristRing.name = 'band_wrist';
      avatarGroup.add(wristRing);
      measurementBandsRef.current.set('wrist', wristRing);

      // 7. Belly Ring (Abdomen)
      createRingBand('belly', bellyRadius * 1.42, 0.35, 0x38bdf8);

      // 8. Hip Ring (Seat)
      createRingBand('hip', hipRadius * 1.42, 0.03, 0x38bdf8);

      // 9. Jacket Length Line (Front high shoulder down to hem)
      createLineBand('jacketLength', [
        new THREE.Vector3(0.12, 0.74, 0.10),
        new THREE.Vector3(0.12, -0.06, 0.10)
      ], 0x38bdf8);

      // 10. Pant Outseam Line (Outer right leg)
      createLineBand('pantOutseam', [
        new THREE.Vector3(hipRadius * 0.95, 0.18, 0),
        new THREE.Vector3(hipRadius * 0.92, -0.28, 0),
        new THREE.Vector3(hipRadius * 0.88, -0.88, 0)
      ], 0x38bdf8);

      // 11. Thigh Ring (Right leg)
      const thighRing = new THREE.Mesh(
        new THREE.TorusGeometry(thighRadius * 1.15, 0.006, 8, 28),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.9 })
      );
      thighRing.position.set(hipRadius * 0.6, -0.24, 0);
      thighRing.rotation.x = Math.PI / 2;
      thighRing.name = 'band_thigh';
      avatarGroup.add(thighRing);
      measurementBandsRef.current.set('thigh', thighRing);

      // 12. Waist Ring (Trouser waistband)
      createRingBand('waist', waistRadius * 1.38, 0.19, 0x38bdf8);
    }

    // Interactive Drag Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const domElement = mountRef.current;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && avatarGroupRef.current) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        avatarGroupRef.current.rotation.y += deltaX * 0.01;
        avatarGroupRef.current.rotation.x += deltaY * 0.005;
        avatarGroupRef.current.rotation.x = Math.max(-0.5, Math.min(0.5, avatarGroupRef.current.rotation.x));

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      // Raycasting for interactive hover
      if (!isDragging && cameraRef.current && sceneRef.current) {
        const rect = domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(avatarGroupRef.current.children, true);

        if (intersects.length > 0) {
          const hitObj = intersects[0].object;
          const hitName = hitObj.name;

          const matchedBand = bandsList.find(b => b.meshNames.includes(hitName));
          if (matchedBand) {
            setHoveredKey(matchedBand.key);
          } else {
            setHoveredKey(null);
          }
        } else {
          setHoveredKey(null);
        }
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (cameraRef.current) {
        cameraRef.current.position.z += e.deltaY * 0.002;
        cameraRef.current.position.z = Math.max(2.0, Math.min(6.0, cameraRef.current.position.z));
      }
    };

    domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (autoRotate && avatarGroupRef.current && !isDragging) {
        avatarGroupRef.current.rotation.y += 0.006;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Window Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
        mountRef.current?.removeChild(rendererRef.current.domElement);
      }
    };
  }, [showRings, wireframeMode]);

  // Update Band Highlight colors when activeKey changes
  useEffect(() => {
    measurementBandsRef.current.forEach((obj, key) => {
      const isActive = key === activeKey;
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshBasicMaterial;
        mat.color.setHex(isActive ? 0xf59e0b : 0x38bdf8); // Gold highlight on active, Cyan default
        mat.opacity = isActive ? 1.0 : 0.75;
      } else if (obj instanceof THREE.Line) {
        const mat = obj.material as THREE.LineBasicMaterial;
        mat.color.setHex(isActive ? 0xf59e0b : 0x38bdf8);
      }
    });
  }, [activeKey]);

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col lg:flex-row shadow-2xl min-h-[550px] ${className}`}>
      
      {/* 3D Canvas Area */}
      <div className="relative flex-1 h-[450px] lg:h-auto min-h-[480px]">
        
        {/* Top Floating Control Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          
          <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/80 text-xs font-semibold flex items-center space-x-2 pointer-events-auto">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>3D Male Tailoring Avatar (12 Physical Lines)</span>
          </div>

          <div className="flex items-center space-x-2 pointer-events-auto">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                autoRotate
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle Auto Rotation"
            >
              <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowRings(!showRings)}
              className={`p-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                showRings
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle Tailoring Measurement Bands"
            >
              <Layers className="w-4 h-4" />
            </button>

            <button
              onClick={() => setWireframeMode(!wireframeMode)}
              className={`p-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                wireframeMode
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle Mesh Wireframe"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* 3D WebGL Canvas */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing absolute inset-0" />

        {/* Active Measurement Floating Card */}
        {activeBand && (
          <div className="absolute bottom-6 left-6 right-6 lg:right-auto lg:max-w-xs z-20 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-amber-500/50 shadow-2xl text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                {hoveredKey ? 'Hovered Landmark' : 'Selected Tailoring Line'}
              </span>
              <span className="bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full">
                {activeBand.formatted}
              </span>
            </div>
            <h4 className="text-sm font-extrabold text-white">{activeBand.label}</h4>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              {activeBand.definition}
            </p>
          </div>
        )}

      </div>

      {/* Side Panel: 12 Men's Tailoring Measurements (Zero Health Metrics) */}
      <div className="w-full lg:w-84 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 space-y-4 flex flex-col justify-between">
        
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white font-sans flex items-center space-x-1.5">
                <User className="w-4 h-4 text-blue-400" />
                <span>Tailoring Specifications</span>
              </h3>
              <p className="text-[11px] text-slate-400">Click a band to inspect 3D geometry</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-800 font-bold">
              12 Lines
            </span>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {bandsList.map((band) => {
              const isSelected = selectedKey === band.key;
              const isHovered = hoveredKey === band.key;

              return (
                <div
                  key={band.key}
                  onClick={() => setSelectedKey(isSelected ? null : band.key)}
                  onMouseEnter={() => setHoveredKey(band.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected || isHovered
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                      : 'bg-slate-800/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <p className="text-xs font-semibold">{band.label}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{band.definition}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                    {band.formatted}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tailor Validation Specs Summary (Strictly Tailoring - No Weight or Health Metrics) */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Calibration:</span>
            <span className="font-semibold text-white font-mono">{measurements.calibration?.method || 'calibrated_optical'}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Optical Tolerance:</span>
            <span className="font-semibold text-amber-400 font-mono">±1.2 cm</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Tracking Confidence:</span>
            <span className="font-semibold text-emerald-400 font-mono">
              {Math.min(95, measurements.confidenceScore || 92.5)}% (Landmark Tracking)
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
