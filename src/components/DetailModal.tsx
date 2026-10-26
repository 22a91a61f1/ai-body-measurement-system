import React from 'react';
import { ScanRecord, MeasurementUnit } from '../types';
import { formatLength } from '../utils/unitConverter';
import { X, User, Calendar, ShieldCheck, Download, Ruler } from 'lucide-react';

interface DetailModalProps {
  scan: ScanRecord | null;
  unit: MeasurementUnit;
  onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ scan, unit, onClose }) => {
  if (!scan) return null;

  const m = scan.measurements;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold font-mono">
              {scan.userId.slice(-4)}
            </div>
            <div>
              <h3 className="font-bold text-lg font-sans text-white">{scan.userName}</h3>
              <p className="text-xs text-slate-400">ID: {scan.userId} • {new Date(scan.date).toLocaleDateString()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
          
          {/* Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Shoulder</span>
              <p className="text-sm font-bold text-slate-900">{formatLength(m.shoulder, unit)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Chest</span>
              <p className="text-sm font-bold text-slate-900">{formatLength(m.chest, unit)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Waist</span>
              <p className="text-sm font-bold text-slate-900">{formatLength(m.waist, unit)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Landmark Confidence</span>
              <p className="text-sm font-bold text-emerald-600">{m.confidenceScore}%</p>
            </div>
          </div>

          {/* Complete Measurements Grid */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
              Key Anatomical Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Shoulder:</span> <strong className="float-right text-slate-900">{formatLength(m.shoulder, unit)}</strong></div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Sleeve:</span> <strong className="float-right text-slate-900">{formatLength(m.sleeveLength, unit)}</strong></div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Hip:</span> <strong className="float-right text-slate-900">{formatLength(m.hip, unit)}</strong></div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Neck:</span> <strong className="float-right text-slate-900">{formatLength(m.neck, unit)}</strong></div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Thigh:</span> <strong className="float-right text-slate-900">{formatLength(m.thigh, unit)}</strong></div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Inseam:</span> <strong className="float-right text-slate-900">{formatLength(m.inseam, unit)}</strong></div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Arm Length:</span> <strong className="float-right text-slate-900">{formatLength(m.armLength, unit)}</strong></div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Forearm:</span> <strong className="float-right text-slate-900">{formatLength(m.forearm, unit)}</strong></div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Wrist:</span> <strong className="float-right text-slate-900">{formatLength(m.wrist, unit)}</strong></div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100"><span className="text-slate-500">Landmark Conf:</span> <strong className="float-right text-emerald-600 font-bold">{m.confidenceScore}%</strong></div>
            </div>
          </div>

          {scan.notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Notes:</span>
              <p className="text-slate-800 mt-0.5">{scan.notes}</p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
