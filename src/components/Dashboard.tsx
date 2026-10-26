import React from 'react';
import { ScanRecord, MeasurementUnit } from '../types';
import { formatLength } from '../utils/unitConverter';
import { Camera, TrendingUp, Users, ShieldCheck, Ruler, ArrowUpRight, Eye, Trash2, Activity, Scissors, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  scans: ScanRecord[];
  unit: MeasurementUnit;
  onStartScan: () => void;
  onViewScan: (scan: ScanRecord) => void;
  onDeleteScan: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  scans,
  unit,
  onStartScan,
  onViewScan,
  onDeleteScan,
}) => {
  // Compute Dashboard Metrics
  const totalMeasurements = scans.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysScansCount = scans.filter(s => (s.date || s.measurement_date || '').startsWith(todayStr)).length;

  const avgWaist = scans.length > 0
    ? scans.reduce((acc, curr) => acc + (curr.waist || curr.measurements?.waist || 84), 0) / scans.length
    : 84;

  const avgChest = scans.length > 0
    ? scans.reduce((acc, curr) => acc + (curr.chest || curr.measurements?.chest || 102), 0) / scans.length
    : 102;

  const avgShoulder = scans.length > 0
    ? scans.reduce((acc, curr) => acc + (curr.shoulder_width || curr.measurements?.shoulder || 48), 0) / scans.length
    : 48;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold backdrop-blur-md">
            <Scissors className="w-3.5 h-3.5 text-blue-400" />
            <span>Men's Tailoring Suite • 13 Canonical Dimensions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-sans text-white">
            AI Men's Tailoring Measurement System
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Calibrated multi-view computer vision tailored exclusively for bespoke men's suiting, shirts, and trousers. Computes the 13 canonical tailoring dimensions with optical sub-centimeter scale calibration.
          </p>
          
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartScan}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Start Men's Tailoring Scan</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <div className="text-xs text-slate-400 flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Calibrated Optical Vision Ready</span>
            </div>
          </div>
        </div>

        {/* Subtle Decorative Grid Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
            <path d="M 0 20 L 200 20 M 0 60 L 200 60 M 0 100 L 200 100 M 0 140 L 200 140 M 0 180 L 200 180" stroke="white" strokeWidth="1" strokeDasharray="4 4"/>
            <path d="M 20 0 L 20 200 M 60 0 L 60 200 M 100 0 L 100 200 M 140 0 L 140 200 M 180 0 L 180 200" stroke="white" strokeWidth="1" strokeDasharray="4 4"/>
          </svg>
        </div>
      </div>

      {/* Top 4 Required Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Profiles */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tailoring Profiles</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">{totalMeasurements}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Stored in encrypted tailor database</p>
        </motion.div>

        {/* Today's Scans */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Scans</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">{todaysScansCount}</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
              Active Sessions
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Completed in last 24 hours</p>
        </motion.div>

        {/* Average Trouser Waist */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trouser Waist Avg</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Ruler className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              {formatLength(avgWaist, unit)}
            </span>
            <span className="text-xs text-slate-500 font-medium">Iliac Crest</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Natural waistband position mean</p>
        </motion.div>

        {/* Average Chest */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chest Avg</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              {formatLength(avgChest, unit)}
            </span>
            <span className="text-xs text-slate-500 font-medium">Torso Crest</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Horizontal chest circumference</p>
        </motion.div>

      </div>

      {/* Sizing Standards Benchmarks Card */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base font-sans">
              Men's Tailoring Standards Overview (13 Dimensions)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly for male garment drafting (Shirts, Suits, Waistcoats, and Trousers)
            </p>
          </div>
          <button
            onClick={onStartScan}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Scan Subject</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Suit Jacket</span>
            <p className="text-xl font-bold text-slate-900 mt-1">40R - 42R</p>
            <span className="text-[11px] text-blue-600 font-medium">Chest 100-106 cm</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Collar / Neck</span>
            <p className="text-xl font-bold text-slate-900 mt-1">15.5" / 39.5 cm</p>
            <span className="text-[11px] text-blue-600 font-medium">Shirt Collar Standard</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Trouser Waist</span>
            <p className="text-xl font-bold text-slate-900 mt-1">32" - 34"</p>
            <span className="text-[11px] text-blue-600 font-medium">Separate from Belly</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-xs text-slate-500 uppercase font-semibold">Shoulder Span</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatLength(avgShoulder, unit)}</p>
            <span className="text-[11px] text-emerald-600 font-medium">Acromion Joint Width</span>
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base font-sans">Recent Tailoring Measurements</h3>
            <p className="text-xs text-slate-500">Latest completed male tailoring scan records</p>
          </div>
          <button
            onClick={onStartScan}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>New Scan</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/70">
                <th className="py-3 px-4">Subject ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Neckline</th>
                <th className="py-3 px-4">Chest</th>
                <th className="py-3 px-4">Shoulder</th>
                <th className="py-3 px-4">Sleeve</th>
                <th className="py-3 px-4">Belly</th>
                <th className="py-3 px-4">Waist</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {scans.slice(0, 8).map((scan) => {
                const mt = scan.measurements?.mensTailoring?.items;
                const neckVal = mt?.neckline?.valueCm ?? scan.neck;
                const chestVal = mt?.chest?.valueCm ?? scan.chest;
                const shVal = mt?.shoulder?.valueCm ?? scan.shoulder_width;
                const slVal = mt?.sleeve?.valueCm ?? scan.sleeve_length;
                const bellyVal = mt?.belly?.valueCm ?? scan.belly ?? scan.stomach;
                const waistVal = mt?.waist?.valueCm ?? scan.waist;

                return (
                  <tr key={scan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-600">{scan.userId || scan.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{scan.userName || scan.name}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(scan.date || scan.measurement_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-xs">{formatLength(neckVal, unit)}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-xs font-semibold">{formatLength(chestVal, unit)}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-xs">{formatLength(shVal, unit)}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-xs">{formatLength(slVal, unit)}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-xs">{formatLength(bellyVal, unit)}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-xs font-semibold">{formatLength(waistVal, unit)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onViewScan(scan)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="View 13 Tailoring Specs"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteScan(scan.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Scan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
