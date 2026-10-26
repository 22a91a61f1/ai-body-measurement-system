import React from 'react';
import { X, ExternalLink, Scissors, BookOpen, CheckCircle2 } from 'lucide-react';
import { MENS_TAILORING_SPECS } from '../services/measurementEngine';
import { MensTailoringKey } from '../types';

interface TailoringReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedKey?: MensTailoringKey | null;
}

export const TailoringReferenceModal: React.FC<TailoringReferenceModalProps> = ({
  isOpen,
  onClose,
  selectedKey
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
              <Scissors className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-sans">
                Master Tailor Photographic Guide
              </h2>
              <p className="text-xs text-slate-500">
                Official 12 anatomical measurement reference positions for bespoke menswear
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Official Reference Photo Grid */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-center">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">
              Standard Photographic Reference Protocol
            </h3>
            <div className="max-w-2xl mx-auto rounded-xl overflow-hidden shadow-lg border border-slate-800 bg-white">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-25_at_7.12.34_PM_a0800b64.jpeg"
                alt="Men's Tailoring 12 Measurement Standards"
                className="w-full h-auto object-contain max-h-[500px] mx-auto"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Illustrates exact tape placement for all 12 tailoring circumferences and linear spans.
            </p>
          </div>

          {/* Definitions Grid */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Tailoring Definitions & Anatomical Rules</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(Object.keys(MENS_TAILORING_SPECS) as MensTailoringKey[]).map((key, idx) => {
                const spec = MENS_TAILORING_SPECS[key];
                const isHighlighted = selectedKey === key;
                return (
                  <div
                    key={key}
                    className={`p-4 rounded-2xl border transition-all ${
                      isHighlighted
                        ? 'bg-blue-50/80 border-blue-500 shadow-sm'
                        : 'bg-slate-50/60 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">
                        {idx + 1}. {spec.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        spec.category === 'upper'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {spec.category === 'upper' ? 'Upper Body' : 'Torso & Lower'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {spec.definition}
                    </p>
                    <div className="mt-2 text-[11px] text-slate-500 bg-white/80 p-2 rounded-xl border border-slate-200/60">
                      <span className="font-semibold text-slate-700">Tailoring standard: </span>
                      {spec.tailoringConvention}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Complies with Savile Row & International Master Tailors Guild measurement specifications.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
