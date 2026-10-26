import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Ruler,
  Award,
  BarChart3,
  Check,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Percent
} from 'lucide-react';
import { MensTailoringKey, MeasurementUnit, TailoringMeasurementItem } from '../types';
import {
  TAILOR_BENCHMARK_PROFILES,
  evaluateMeasurementsAgainstGroundTruth,
  ValidationEvaluationResult
} from '../data/tailorBenchmarks';
import { MENS_TAILORING_SPECS } from '../services/measurementEngine';
import { cmToInches, inchesToCm, formatLength } from '../utils/unitConverter';

interface TailorAccuracyBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMeasurements: Record<MensTailoringKey, TailoringMeasurementItem>;
  unit: MeasurementUnit;
  onApplyTapeVerification: (
    tapeValues: Record<MensTailoringKey, number>,
    evalResult: ValidationEvaluationResult,
    sourceNote: string
  ) => void;
}

export const TailorAccuracyBenchmarkModal: React.FC<TailorAccuracyBenchmarkModalProps> = ({
  isOpen,
  onClose,
  currentMeasurements,
  unit,
  onApplyTapeVerification,
}) => {
  if (!isOpen) return null;

  const keys: MensTailoringKey[] = [
    'neckline',
    'chest',
    'shoulder',
    'sleeve',
    'bicep',
    'wrist',
    'belly',
    'hip',
    'jacketLength',
    'pantOutseam',
    'thigh',
    'waist',
  ];

  // Initialize input values from current tape or scan values
  const [tapeInputs, setTapeInputs] = useState<Record<MensTailoringKey, number>>(() => {
    const init: any = {};
    keys.forEach((k) => {
      init[k] = currentMeasurements[k]?.tapeVerifiedCm ?? currentMeasurements[k]?.valueCm ?? MENS_TAILORING_SPECS[k].defaultCm;
    });
    return init;
  });

  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('');
  const [sourceNote, setSourceNote] = useState<string>('Professional Master Tailor Tape Measurement');
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'custom_tape' | 'report'>('benchmarks');

  // Compute live scan values dictionary
  const scanValues: Record<MensTailoringKey, number> = {} as any;
  keys.forEach((k) => {
    scanValues[k] = currentMeasurements[k]?.valueCm ?? 0;
  });

  // Calculate live evaluation against active tape inputs
  const evaluation: ValidationEvaluationResult = evaluateMeasurementsAgainstGroundTruth(
    scanValues,
    tapeInputs
  );

  const handleSelectBenchmark = (benchId: string) => {
    const bench = TAILOR_BENCHMARK_PROFILES.find((b) => b.id === benchId);
    if (!bench) return;
    setSelectedBenchmarkId(benchId);
    setTapeInputs({ ...bench.groundTruthCm });
    setSourceNote(`Ground-Truth Reference: ${bench.profileName}`);
  };

  const handleInputChange = (k: MensTailoringKey, displayVal: number) => {
    const valInCm = unit === 'imperial' ? inchesToCm(displayVal) : displayVal;
    setTapeInputs((prev) => ({
      ...prev,
      [k]: Number(valInCm.toFixed(1)),
    }));
  };

  const handleApply = () => {
    onApplyTapeVerification(tapeInputs, evaluation, sourceNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full my-8 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-blue-600/30 text-blue-400 border border-blue-400/40">
              <Award className="w-5 h-5 text-blue-300" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg font-sans text-white">
                  Empirical Measurement Accuracy & Tailor Benchmark Audit
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  GROUND-TRUTH VALIDATION
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Independent validation against master tailor tape measurements • Mean Absolute Error (MAE) & Signed Bias audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-200 px-6 pt-3 pb-2 bg-slate-50/70 shrink-0">
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'benchmarks'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Load Savile Row Benchmark</span>
          </button>

          <button
            onClick={() => setActiveTab('custom_tape')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'custom_tape'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>2. Master Tailor Tape Entry</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'report'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>3. Accuracy Audit Report ({evaluation.overallAccuracyPercentage}%)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs flex-1">
          
          {/* TAB 1: Benchmark Profiles */}
          {activeTab === 'benchmarks' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950">
                <p className="font-bold text-sm mb-1">Select a Standard Tailor Ground-Truth Benchmark Profile</p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  These verified profiles represent master tailor tape measurements from bespoke sizing standards. 
                  Loading a profile evaluates your optical scan against verified physical ground truth to calculate Mean Absolute Error (MAE) and signed bias.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TAILOR_BENCHMARK_PROFILES.map((bench) => {
                  const isSelected = selectedBenchmarkId === bench.id;
                  const benchEval = evaluateMeasurementsAgainstGroundTruth(scanValues, bench.groundTruthCm);
                  return (
                    <div
                      key={bench.id}
                      onClick={() => handleSelectBenchmark(bench.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">
                            {bench.id}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">{bench.profileName}</h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Reference Height: {bench.heightCm} cm</p>
                        </div>
                        {isSelected ? (
                          <span className="p-1 rounded-full bg-blue-600 text-white">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Select
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {bench.notes}
                      </p>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between font-mono text-[11px]">
                        <span className="text-slate-600">
                          Scan MAE: <strong className="text-slate-900">{benchEval.maeCm} cm</strong>
                        </span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {benchEval.overallAccuracyPercentage}% Accuracy
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Custom Tape Entry */}
          {activeTab === 'custom_tape' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start space-x-3">
                <Ruler className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">Certified Master Tailor Tape Entry</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Enter the exact physical tape measurements taken by a professional tailor. 
                    These values become the certified ground-truth reference: they are tagged as <strong className="font-semibold">Tape Verified</strong> and are never overwritten by automated estimates.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Verification Source / Tailor Name
                </label>
                <input
                  type="text"
                  value={sourceNote}
                  onChange={(e) => setSourceNote(e.target.value)}
                  placeholder="e.g. Master Tailor James Vance, Certified Tape"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {keys.map((k) => {
                  const spec = MENS_TAILORING_SPECS[k];
                  const currentTapeVal = tapeInputs[k] || spec.defaultCm;
                  const displayTapeVal = unit === 'imperial' ? cmToInches(currentTapeVal) : currentTapeVal;
                  const scanVal = scanValues[k] || 0;
                  const displayScanVal = unit === 'imperial' ? cmToInches(scanVal) : scanVal;
                  const delta = Math.abs(currentTapeVal - scanVal);
                  const isWithinTol = delta <= spec.toleranceCm;

                  return (
                    <div key={k} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{spec.label}</span>
                        <span className="text-[10px] font-mono text-slate-400">±{spec.toleranceCm}cm</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Tape Value</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={displayTapeVal}
                              onChange={(e) => handleInputChange(k, parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 font-bold">
                              {unit === 'imperial' ? 'in' : 'cm'}
                            </span>
                          </div>
                        </div>

                        <div className="w-24 text-right">
                          <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Scan Est.</span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {displayScanVal} {unit === 'imperial' ? 'in' : 'cm'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                        <span className="text-slate-500">Delta: {delta.toFixed(1)}cm</span>
                        {isWithinTol ? (
                          <span className="text-emerald-700 font-bold flex items-center space-x-0.5">
                            <Check className="w-3 h-3" />
                            <span>Within Tol.</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold flex items-center space-x-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Exceeds Tol.</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Empirical Report & MAE Audit */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              
              {/* Executive Accuracy Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-emerald-700 font-semibold text-[11px] block">Validated Accuracy</span>
                  <p className="text-2xl font-extrabold text-emerald-900 font-mono mt-0.5">
                    {evaluation.overallAccuracyPercentage}%
                  </p>
                  <span className="text-[10px] text-emerald-700 mt-1 block">Empirical ground truth</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                  <span className="text-blue-700 font-semibold text-[11px] block">Mean Absolute Error (MAE)</span>
                  <p className="text-2xl font-extrabold text-blue-900 font-mono mt-0.5">
                    {evaluation.maeCm} <span className="text-sm font-normal text-blue-700">cm</span>
                  </p>
                  <span className="text-[10px] text-blue-700 mt-1 block">Average absolute error</span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                  <span className="text-indigo-700 font-semibold text-[11px] block">Signed Bias</span>
                  <p className="text-2xl font-extrabold text-indigo-900 font-mono mt-0.5">
                    {evaluation.signedBiasCm > 0 ? `+${evaluation.signedBiasCm}` : evaluation.signedBiasCm}{' '}
                    <span className="text-sm font-normal text-indigo-700">cm</span>
                  </p>
                  <span className="text-[10px] text-indigo-700 mt-1 block">Systematic deviation</span>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                  <span className="text-purple-700 font-semibold text-[11px] block">Tailoring Tolerance Pass Rate</span>
                  <p className="text-2xl font-extrabold text-purple-900 font-mono mt-0.5">
                    {evaluation.passToleranceRate}%
                  </p>
                  <span className="text-[10px] text-purple-700 mt-1 block">Within bespoke tolerances</span>
                </div>
              </div>

              {/* Detailed Per-Metric Breakdown Table */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold text-[11px] border-b border-slate-200 uppercase tracking-wider font-mono">
                      <th className="py-2.5 px-4">Measurement</th>
                      <th className="py-2.5 px-3">Optical Scan</th>
                      <th className="py-2.5 px-3">Master Tape</th>
                      <th className="py-2.5 px-3">Abs Error</th>
                      <th className="py-2.5 px-3">Signed Bias</th>
                      <th className="py-2.5 px-3">Tolerance</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {keys.map((k) => {
                      const err = evaluation.metricErrors[k];
                      const spec = MENS_TAILORING_SPECS[k];
                      return (
                        <tr key={k} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                            {spec.label}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{formatLength(err.scanValueCm, unit)}</td>
                          <td className="py-2.5 px-3 font-semibold text-blue-700">{formatLength(err.groundTruthCm, unit)}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{err.absoluteErrorCm} cm</td>
                          <td className={`py-2.5 px-3 ${err.signedErrorCm > 0 ? 'text-amber-600' : err.signedErrorCm < 0 ? 'text-blue-600' : 'text-slate-500'}`}>
                            {err.signedErrorCm > 0 ? `+${err.signedErrorCm}` : err.signedErrorCm} cm
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">±{err.toleranceCm} cm</td>
                          <td className="py-2.5 px-4 text-right">
                            {err.withinTolerance ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Passed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Needs Tape</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            <span>Overall Validated Accuracy: </span>
            <strong className="text-emerald-700 font-bold">{evaluation.overallAccuracyPercentage}%</strong>
            <span> (MAE: {evaluation.maeCm} cm)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Verified Tape Measurements</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
