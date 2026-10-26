import React, { useState } from 'react';
import { BodyMeasurements, MeasurementUnit, MensTailoringKey } from '../types';
import { formatLength } from '../utils/unitConverter';

interface BodyLandmarkVisualizerProps {
  measurements: BodyMeasurements;
  unit: MeasurementUnit;
  snapshotUrl?: string;
  selectedMeasurementKey?: string | null;
  onSelectKey?: (key: MensTailoringKey) => void;
}

export const BodyLandmarkVisualizer: React.FC<BodyLandmarkVisualizerProps> = ({
  measurements,
  unit,
  snapshotUrl,
  selectedMeasurementKey,
  onSelectKey
}) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const activeKey = selectedMeasurementKey || hoveredKey;
  const mt = measurements.mensTailoring?.items;

  const getVal = (key: MensTailoringKey, fallbackVal: number): string => {
    if (mt && mt[key]) {
      return formatLength(mt[key].valueCm, unit);
    }
    return formatLength(fallbackVal, unit);
  };

  // The 12 Tailoring Measurement Positions on 300x500 Men's Silhouette
  const landmarks: Record<
    MensTailoringKey,
    { x: number; y: number; label: string; value: string; lineType: 'width' | 'circ' | 'path' }
  > = {
    neckline: {
      x: 150,
      y: 90,
      label: '1. Neckline',
      value: getVal('neckline', measurements.neck),
      lineType: 'circ',
    },
    chest: {
      x: 150,
      y: 145,
      label: '2. Chest',
      value: getVal('chest', measurements.chest),
      lineType: 'circ',
    },
    shoulder: {
      x: 150,
      y: 118,
      label: '3. Shoulder',
      value: getVal('shoulder', measurements.shoulder),
      lineType: 'width',
    },
    sleeve: {
      x: 232,
      y: 185,
      label: '4. Sleeve',
      value: getVal('sleeve', measurements.sleeveLength),
      lineType: 'path',
    },
    bicep: {
      x: 216,
      y: 155,
      label: '5. Bicep',
      value: getVal('bicep', measurements.bicep),
      lineType: 'circ',
    },
    wrist: {
      x: 252,
      y: 255,
      label: '6. Wrist',
      value: getVal('wrist', measurements.wrist),
      lineType: 'circ',
    },
    belly: {
      x: 150,
      y: 200,
      label: '7. Belly',
      value: getVal('belly', measurements.stomach || 88),
      lineType: 'circ',
    },
    hip: {
      x: 150,
      y: 260,
      label: '8. Hip',
      value: getVal('hip', measurements.hip),
      lineType: 'circ',
    },
    jacketLength: {
      x: 120,
      y: 220,
      label: '9. Jacket Length',
      value: getVal('jacketLength', measurements.shirtLength || 74.5),
      lineType: 'path',
    },
    pantOutseam: {
      x: 82,
      y: 335,
      label: '10. Pant Outseam',
      value: getVal('pantOutseam', measurements.outseam || 104),
      lineType: 'path',
    },
    thigh: {
      x: 182,
      y: 310,
      label: '11. Thigh',
      value: getVal('thigh', measurements.thigh),
      lineType: 'circ',
    },
    waist: {
      x: 150,
      y: 230,
      label: '12. Waist',
      value: getVal('waist', measurements.waist),
      lineType: 'circ',
    },
  };

  return (
    <div className="relative bg-slate-900 rounded-2xl p-4 overflow-hidden border border-slate-800 shadow-lg flex flex-col items-center justify-center min-h-[500px]">
      
      {/* Background Image or Canvas Silhouette */}
      <div className="relative w-full max-w-[340px] h-[480px] flex items-center justify-center">
        {snapshotUrl ? (
          <img
            src={snapshotUrl}
            alt="Male Tailoring Biometric Capture"
            className="w-full h-full object-cover object-center rounded-xl opacity-75"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-xl flex items-center justify-center opacity-85 border border-slate-800">
            <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
              Men's Tailoring Wireframe
            </span>
          </div>
        )}

        {/* Interactive SVG Skeleton Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-auto"
          viewBox="0 0 300 500"
          fill="none"
        >
          {/* Anatomical Contour Guide Lines */}
          <line x1="150" y1="35" x2="150" y2="265" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
          
          {/* Shoulder width line */}
          <line x1="78" y1="118" x2="222" y2="118" stroke="#38bdf8" strokeWidth={activeKey === 'shoulder' ? 3 : 1.5} opacity={activeKey === 'shoulder' ? 1 : 0.6} />
          
          {/* Chest circumference tape indicator */}
          <ellipse cx="150" cy="145" rx="55" ry="12" stroke="#34d399" strokeWidth={activeKey === 'chest' ? 3 : 1.5} opacity={activeKey === 'chest' ? 1 : 0.6} fill="none" />
          
          {/* Belly tape indicator */}
          <ellipse cx="150" cy="200" rx="50" ry="11" stroke="#f59e0b" strokeWidth={activeKey === 'belly' ? 3 : 1.5} opacity={activeKey === 'belly' ? 1 : 0.6} fill="none" />
          
          {/* Waist tape indicator */}
          <ellipse cx="150" cy="230" rx="46" ry="10" stroke="#38bdf8" strokeWidth={activeKey === 'waist' ? 3 : 1.5} opacity={activeKey === 'waist' ? 1 : 0.6} fill="none" />
          
          {/* Hip tape indicator */}
          <ellipse cx="150" cy="260" rx="56" ry="12" stroke="#a78bfa" strokeWidth={activeKey === 'hip' ? 3 : 1.5} opacity={activeKey === 'hip' ? 1 : 0.6} fill="none" />

          {/* Sleeve Path (Shoulder to Wrist) */}
          <polyline points="222,118 216,180 252,255" stroke="#60a5fa" strokeWidth={activeKey === 'sleeve' ? 3 : 1.5} strokeDasharray="4 2" opacity={activeKey === 'sleeve' ? 1 : 0.6} fill="none" />

          {/* Jacket Length (Shoulder to Hem) */}
          <line x1="120" y1="118" x2="120" y2="265" stroke="#fbbf24" strokeWidth={activeKey === 'jacketLength' ? 3 : 1.5} strokeDasharray="3 3" opacity={activeKey === 'jacketLength' ? 1 : 0.6} />

          {/* Pant Outseam (Waistband to Ankle) */}
          <line x1="94" y1="230" x2="82" y2="440" stroke="#ec4899" strokeWidth={activeKey === 'pantOutseam' ? 3 : 1.5} strokeDasharray="3 3" opacity={activeKey === 'pantOutseam' ? 1 : 0.6} />

          {/* The 12 Interactive Keypoints */}
          {(Object.keys(landmarks) as MensTailoringKey[]).map((key) => {
            const point = landmarks[key];
            const isSelected = activeKey === key;
            return (
              <g
                key={key}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => onSelectKey && onSelectKey(key)}
              >
                {/* Ping ring on active */}
                {isSelected && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="12"
                    fill="#3b82f6"
                    fillOpacity="0.35"
                    className="animate-ping"
                  />
                )}

                {/* Main Node Point */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? '6' : '4'}
                  fill={isSelected ? '#60a5fa' : '#38bdf8'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="transition-all duration-200"
                />

                {/* Label Box */}
                <g className={`transition-all duration-200 ${isSelected ? 'opacity-100 scale-105' : 'opacity-80'}`}>
                  <rect
                    x={point.x - 42}
                    y={point.y - 24}
                    width="84"
                    height="18"
                    rx="4"
                    fill="#0f172a"
                    fillOpacity="0.92"
                    stroke={isSelected ? '#3b82f6' : '#334155'}
                    strokeWidth="1"
                  />
                  <text
                    x={point.x}
                    y={point.y - 12}
                    fill={isSelected ? '#60a5fa' : '#e2e8f0'}
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {point.label}: {point.value}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 text-center text-slate-400 text-xs flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Click any tailoring point to inspect definition & measurement path</span>
      </div>

    </div>
  );
};
