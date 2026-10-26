import React, { useState, useEffect } from 'react';
import { X, Edit3, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { MensTailoringKey, MeasurementUnit, TailoringMeasurementItem } from '../types';
import { MENS_TAILORING_SPECS } from '../services/measurementEngine';
import { cmToInches, inchesToCm } from '../utils/unitConverter';

interface ManualCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurementItem: TailoringMeasurementItem | null;
  unit: MeasurementUnit;
  onSaveCorrection: (key: MensTailoringKey, valueCm: number, note?: string, isTapeVerified?: boolean) => void;
  onResetToEstimated?: (key: MensTailoringKey) => void;
}

export const ManualCorrectionModal: React.FC<ManualCorrectionModalProps> = ({
  isOpen,
  onClose,
  measurementItem,
  unit,
  onSaveCorrection,
  onResetToEstimated,
}) => {
  if (!isOpen || !measurementItem) return null;

  const spec = MENS_TAILORING_SPECS[measurementItem.key];
  const initialValue = unit === 'imperial'
    ? cmToInches(measurementItem.valueCm)
    : measurementItem.valueCm;

  const [inputVal, setInputVal] = useState<number>(initialValue);
  const [isTapeVerified, setIsTapeVerified] = useState<boolean>(measurementItem.status === 'verified_tape');
  const [note, setNote] = useState<string>(measurementItem.manualNote || 'Physical master tailor tape verified');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const val = unit === 'imperial'
      ? cmToInches(measurementItem.valueCm)
      : measurementItem.valueCm;
    setInputVal(val);
    setIsTapeVerified(measurementItem.status === 'verified_tape');
    setNote(measurementItem.manualNote || 'Physical master tailor tape verified');
    setErrorMsg(null);
  }, [measurementItem, unit]);

  const handleSave = () => {
    const numeric = Number(inputVal);
    if (isNaN(numeric) || numeric <= 0) {
      setErrorMsg('Please enter a valid positive measurement number.');
      return;
    }

    const valueInCm = unit === 'imperial' ? inchesToCm(numeric) : numeric;

    // Check realistic range
    if (valueInCm < spec.min * 0.7 || valueInCm > spec.max * 1.3) {
      setErrorMsg(
        `Value of ${valueInCm.toFixed(1)} cm (${numeric} ${unit === 'imperial' ? 'in' : 'cm'}) is outside standard adult male tailoring bounds (${spec.min} - ${spec.max} cm).`
      );
      return;
    }

    onSaveCorrection(measurementItem.key, Number(valueInCm.toFixed(1)), note.trim(), isTapeVerified);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
              <Edit3 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-sans">
                Edit / Correct Measurement
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {spec.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs text-purple-900">
            <p className="font-semibold mb-0.5">Anatomical Tailoring Rule:</p>
            <p className="text-[11px] text-purple-800 leading-relaxed">{spec.definition}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Measurement Value ({unit === 'imperial' ? 'Inches' : 'Centimeters'})
            </label>
            <div className="relative">
              <input
                type="number"
                step={unit === 'imperial' ? '0.01' : '0.1'}
                value={inputVal}
                onChange={(e) => {
                  setInputVal(parseFloat(e.target.value) || 0);
                  setErrorMsg(null);
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                {unit === 'imperial' ? 'INCHES' : 'CM'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono">
              <span>Realistic range: {unit === 'imperial' ? `${cmToInches(spec.min)} - ${cmToInches(spec.max)} in` : `${spec.min} - ${spec.max} cm`}</span>
              <span className="text-purple-700 font-bold">Tolerance: ±{unit === 'imperial' ? `${(spec.toleranceCm / 2.54).toFixed(2)} in` : `${spec.toleranceCm} cm`}</span>
            </div>
          </div>

          {/* Master Tape Ground Truth Option */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isTapeVerified}
                onChange={(e) => setIsTapeVerified(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-purple-900">
                Certified Master Tailor Tape Ground-Truth
              </span>
            </label>
            <p className="text-[11px] text-purple-700 pl-6 leading-relaxed">
              Tagging this value as a certified physical tape measurement marks its status as <strong>Tape Verified</strong>. It will be protected from overwrite and used to evaluate optical scan MAE and accuracy.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Verification Note / Master Tailor Source
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Measured by master tailor with tape"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span>Status after saving: </span>
            <span className="font-bold text-purple-700 font-mono">
              {isTapeVerified ? 'VERIFIED TAPE (GROUND TRUTH)' : 'MANUALLY ENTERED'}
            </span>
            <span> • Preserved in centimeters.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {measurementItem.isManual && onResetToEstimated ? (
            <button
              onClick={() => {
                onResetToEstimated(measurementItem.key);
                onClose();
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to AI estimate</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Correction</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
