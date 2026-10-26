import React, { useState, useEffect } from 'react';
import { TailorMeasurement } from '../types';
import { validateTailorMeasurement } from '../utils/validation';
import { saveTailorMeasurement } from '../services/measurementService';
import { isSupabaseConfigured } from '../services/supabaseService';
import { Save, Download, Printer, Check, AlertCircle, RefreshCw, Scissors, User, Database, FileSpreadsheet } from 'lucide-react';

interface TailorMeasurementFormProps {
  initialData?: TailorMeasurement;
  onSaved?: (savedRecord: TailorMeasurement) => void;
  onViewHistory?: () => void;
}

export const TailorMeasurementForm: React.FC<TailorMeasurementFormProps> = ({
  initialData,
  onSaved,
  onViewHistory
}) => {
  const [formData, setFormData] = useState<Partial<TailorMeasurement>>(() => ({
    name: initialData?.name || '',
    height_cm: 180,
    weight_kg: 76,
    bmi: 23.5,
    neck: 39.5,
    shoulder_width: 48,
    across_back: 43.2,
    across_front: 41.3,
    chest: 102,
    upper_chest: 95.9,
    waist: 84,
    stomach: 85.7,
    seat: 98,
    hip: 98,
    armhole: 46.9,
    bicep: 33.7,
    elbow: 30.2,
    forearm: 28,
    wrist: 17.5,
    arm_length: 65,
    sleeve_length: 64,
    half_sleeve_length: 26.9,
    shoulder_to_elbow: 33.9,
    shoulder_to_wrist: 64,
    back_length: 73.8,
    front_length: 75.6,
    shirt_length: 76.5,
    neck_to_waist: 45.0,
    waist_to_floor: 106.2,
    inseam: 81,
    outseam: 103.7,
    thigh: 58,
    mid_thigh: 51.0,
    knee: 40.0,
    calf: 38,
    notes: 'Master tailor custom fitting specifications',
    ...initialData
  }));

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFieldChange = (field: keyof TailorMeasurement, value: string) => {
    setSaveError(null);
    setSaveSuccess(false);

    if (field === 'name' || field === 'notes' || field === 'snapshot_url') {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    } else {
      const numVal = value === '' ? '' : parseFloat(value);
      setFormData(prev => ({ ...prev, [field]: numVal }));
      if (errors[field]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const validation = validateTailorMeasurement(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setSaveError('Please correct the validation errors in the form before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const recordToSave = formData as TailorMeasurement;
      const saved = await saveTailorMeasurement(recordToSave);
      setSaveSuccess(true);
      setIsSaving(false);
      if (onSaved) onSaved(saved);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('Failed to save tailor measurement:', err);
      setSaveError(err.message || 'Failed to write record to database.');
      setIsSaving(false);
    }
  };

  const exportCSV = () => {
    const keys = Object.keys(formData).filter(k => k !== 'snapshot_url');
    const headers = keys.join(',');
    const values = keys.map(k => `"${(formData as any)[k] ?? ''}"`).join(',');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${values}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tailor_measurement_${formData.name?.replace(/\s+/g, '_') || 'customer'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  // Helper render input field
  const renderField = (
    key: keyof TailorMeasurement,
    label: string,
    unitText: string = 'cm',
    step: string = '0.1'
  ) => {
    const hasErr = Boolean(errors[key]);
    const val = formData[key] ?? '';

    return (
      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-700 font-sans flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-slate-500 font-mono font-normal">({unitText})</span>
        </label>
        <div className="relative rounded-xl shadow-xs">
          <input
            type="number"
            step={step}
            value={val}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-900 border transition-all focus:outline-none focus:ring-2 ${
              hasErr
                ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-500/20'
                : 'border-slate-200 bg-slate-50/80 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
        </div>
        {hasErr && (
          <p className="text-[10px] text-rose-600 font-semibold flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{errors[key]}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      
      {/* Header & Global Action Toolbar */}
      <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-slate-900 text-white shadow-md">
              <Scissors className="w-6 h-6 text-amber-400" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-sans flex items-center space-x-2">
                <span>Bespoke Tailor Measurement Form</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Supabase Table: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">tailor_measurements</code>
                  {isSupabaseConfigured ? ' (Connected)' : ' (Local Storage DB Sync)'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved to Supabase DB!</span>
              </>
            ) : isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save to Supabase DB</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={exportPDF}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Export PDF / Print</span>
          </button>

          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <User className="w-4 h-4 text-amber-400" />
              <span>Tailor Database History</span>
            </button>
          )}
        </div>
      </div>

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Customer Profile Banner */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Specification Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">
              Customer Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g. Marcus Vance"
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-900 border transition-all focus:outline-none focus:ring-2 ${
                errors.name
                  ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-500/20'
                  : 'border-slate-200 bg-slate-50/80 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {errors.name && (
              <p className="text-[10px] text-rose-600 font-semibold flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">Tailor Notes / Garment Instructions</label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="e.g. Double breasted suit jacket, 2-inch sleeve hem allowance"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-900 border border-slate-200 bg-slate-50/80 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Responsive Two-Column Layout for 38 Anatomical Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Torso, Neck, Chest, Waist, Stomach, Hips */}
        <div className="space-y-6">
          
          {/* Section 1: Neck, Torso & Chest */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-sans">
                1. Neck, Shoulders & Chest
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderField('neck', 'Neck')}
              {renderField('shoulder_width', 'Shoulder Width')}
              {renderField('across_back', 'Across Back')}
              {renderField('across_front', 'Across Front')}
              {renderField('chest', 'Chest')}
              {renderField('upper_chest', 'Upper Chest')}
            </div>
          </div>

          {/* Section 2: Waist, Stomach, Seat & Hips */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-sans">
                2. Waist, Stomach & Hips
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
              {renderField('waist', 'Waist')}
              {renderField('stomach', 'Stomach')}
              {renderField('seat', 'Seat')}
              {renderField('hip', 'Hip')}
            </div>
          </div>

          {/* Section 3: Jacket & Shirt Lengths */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-sans">
                3. Jacket & Shirt Lengths
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
              {renderField('back_length', 'Back Length')}
              {renderField('front_length', 'Front Length')}
              {renderField('shirt_length', 'Shirt Length')}
              {renderField('neck_to_waist', 'Neck to Waist')}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Arms, Sleeves, Trousers & Legs */}
        <div className="space-y-6">
          
          {/* Section 4: Arms & Sleeves */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-sans">
                4. Arms & Sleeves
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderField('armhole', 'Armhole')}
              {renderField('bicep', 'Bicep')}
              {renderField('elbow', 'Elbow')}
              {renderField('forearm', 'Forearm')}
              {renderField('wrist', 'Wrist')}
              {renderField('arm_length', 'Arm Length')}
              {renderField('sleeve_length', 'Sleeve Length')}
              {renderField('half_sleeve_length', 'Half Sleeve')}
              {renderField('shoulder_to_elbow', 'Shoulder to Elbow')}
              {renderField('shoulder_to_wrist', 'Shoulder to Wrist')}
            </div>
          </div>

          {/* Section 5: Legs & Trousers */}
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-sans">
                5. Trousers & Lower Body
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {renderField('waist_to_floor', 'Waist to Floor')}
              {renderField('inseam', 'Inseam')}
              {renderField('outseam', 'Outseam')}
              {renderField('thigh', 'Thigh')}
              {renderField('mid_thigh', 'Mid Thigh')}
              {renderField('knee', 'Knee')}
              {renderField('calf', 'Calf')}
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Save Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold font-sans text-white">Save Verified Tailor Specifications</p>
          <p className="text-xs text-slate-400">All numeric fields are validated for positive values prior to database write.</p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-3 rounded-xl text-xs font-extrabold bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Saved to Supabase DB!</span>
            </>
          ) : isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Record</span>
            </>
          )}
        </button>
      </div>

    </form>
  );
};
