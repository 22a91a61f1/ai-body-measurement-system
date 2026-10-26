import React, { useState } from 'react';
import { TailorMeasurement, MeasurementUnit } from '../types';
import { 
  Printer, FileSpreadsheet, ArrowLeft, Edit3, Trash2, Calendar, User, 
  ArrowUpRight, ArrowDownRight, Minus, GitCompare, RefreshCw, AlertTriangle
} from 'lucide-react';
import { deleteScanRecord } from '../services/database';

interface TailorDetailViewProps {
  record: TailorMeasurement;
  allCustomerRecords?: TailorMeasurement[];
  onBack: () => void;
  onEdit: (record: TailorMeasurement) => void;
  onDeleted: () => void;
}

export const TailorDetailView: React.FC<TailorDetailViewProps> = ({
  record,
  allCustomerRecords = [],
  onBack,
  onEdit,
  onDeleted
}) => {
  const [compareRecordId, setCompareRecordId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [unit, setUnit] = useState<MeasurementUnit>('metric');

  // Find record to compare with
  const compareRecord = allCustomerRecords.find(r => r.id === compareRecordId);

  // Helper format value based on unit
  const formatVal = (cmVal: number) => {
    if (unit === 'imperial') {
      return (cmVal / 2.54).toFixed(2);
    }
    return cmVal.toFixed(1);
  };

  const unitLabel = unit === 'imperial' ? 'in' : 'cm';

  const handleDelete = async () => {
    if (!record.id) return;
    setIsDeleting(true);
    try {
      await deleteScanRecord(record.id);
      setShowDeleteConfirm(false);
      onDeleted();
    } catch (err) {
      console.error('Delete error in TailorDetailView:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export CSV with exactly the 12 Men's Tailoring measurements
  const exportCSV = () => {
    const headers = [
      'Record_ID',
      'Customer_Name',
      'Measurement_Date',
      'Unit',
      '1_Neckline_cm',
      '2_Chest_cm',
      '3_Shoulder_Width_cm',
      '4_Sleeve_Length_cm',
      '5_Bicep_cm',
      '6_Wrist_cm',
      '7_Belly_cm',
      '8_Hip_cm',
      '9_Jacket_Length_cm',
      '10_Pant_Outseam_cm',
      '11_Thigh_cm',
      '12_Waist_cm',
      'Notes'
    ].join(',');

    const values = [
      `"${record.id || ''}"`,
      `"${record.name || 'Name not provided'}"`,
      `"${record.measurement_date || ''}"`,
      `"cm"`,
      `"${record.neck || ''}"`,
      `"${record.chest || ''}"`,
      `"${record.shoulder_width || ''}"`,
      `"${record.sleeve_length || ''}"`,
      `"${record.bicep || ''}"`,
      `"${record.wrist || ''}"`,
      `"${record.stomach || ''}"`,
      `"${record.hip || ''}"`,
      `"${record.shirt_length || ''}"`,
      `"${record.outseam || ''}"`,
      `"${record.thigh || ''}"`,
      `"${record.waist || ''}"`,
      `"${(record.notes || '').replace(/"/g, '""')}"`
    ].join(',');

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${values}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tailoring_spec_${(record.name || 'customer').replace(/\s+/g, '_')}_${record.id || 'id'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  // Helper render comparison difference
  const renderValueAndDiff = (key: keyof TailorMeasurement, label: string) => {
    const rawCurr = Number((record as any)[key]) || 0;
    const rawPrev = compareRecord ? (Number((compareRecord as any)[key]) || 0) : null;
    
    const currVal = rawCurr > 0 ? formatVal(rawCurr) : '—';
    const prevVal = rawPrev !== null && rawPrev > 0 ? formatVal(rawPrev) : null;
    
    const diff = (rawPrev !== null && rawCurr > 0 && rawPrev > 0)
      ? (unit === 'imperial' ? (rawCurr - rawPrev) / 2.54 : rawCurr - rawPrev)
      : null;

    return (
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
        <div className="flex items-baseline justify-between">
          <span className="text-base font-extrabold text-slate-900 font-mono">
            {currVal} <span className="text-xs font-normal text-slate-500">{unitLabel}</span>
          </span>

          {diff !== null && (
            <div className={`text-xs font-bold font-mono flex items-center space-x-0.5 ${
              diff > 0 ? 'text-amber-600' : diff < 0 ? 'text-blue-600' : 'text-slate-400'
            }`}>
              {diff > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              ) : diff < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Minus className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}</span>
            </div>
          )}
        </div>

        {compareRecord && prevVal !== null && (
          <span className="text-[10px] text-slate-400 font-mono block">
            Previous: {prevVal} {unitLabel}
          </span>
        )}
      </div>
    );
  };

  const otherRecords = allCustomerRecords.filter(r => r.id !== record.id);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-sans flex items-center space-x-2">
              <span>{record.name || 'Name not provided'}</span>
            </h2>
            <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{record.measurement_date ? new Date(record.measurement_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Recent'}</span>
              </span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px]">ID: {record.id || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Unit Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setUnit('metric')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                unit === 'metric' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CM
            </button>
            <button
              onClick={() => setUnit('imperial')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                unit === 'imperial' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inches
            </button>
          </div>

          <button
            onClick={() => onEdit(record)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Record</span>
          </button>

          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            onClick={exportPDF}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print PDF</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Tailoring Record</h3>
                <p className="text-xs text-slate-500 font-mono">Record ID: {record.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the tailoring measurement record for{' '}
              <strong className="text-slate-900">{record.name || 'this customer'}</strong>?
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer flex items-center space-x-1.5"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Selector Dropdown */}
      {otherRecords.length > 0 && (
        <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-blue-900 font-semibold">
            <GitCompare className="w-4 h-4 text-blue-600" />
            <span>Compare with Previous Scan:</span>
          </div>
          <select
            value={compareRecordId}
            onChange={(e) => setCompareRecordId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-blue-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">-- Select Scan Date to Compare --</option>
            {otherRecords.map(r => (
              <option key={r.id} value={r.id}>
                {r.measurement_date ? new Date(r.measurement_date).toLocaleDateString() : 'Previous Scan'} (Chest: {r.chest}cm, Waist: {r.waist}cm)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Overview Tailoring Banner */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm uppercase tracking-wider">
          <User className="w-4 h-4 text-blue-600" />
          <span>Tailoring Profile & Fit Summary</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {renderValueAndDiff('chest', 'Chest Circumference')}
          {renderValueAndDiff('waist', 'Waist Circumference')}
          {renderValueAndDiff('stomach', 'Belly Circumference')}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tailor Notes</span>
            <p className="text-xs font-semibold text-slate-800 line-clamp-2">{record.notes || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Strictly 12 Men's Tailoring Measurements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Group A - Upper Body (6 Measurements) */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              A. Upper Body (6 Measurements)
            </h3>
            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {unitLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderValueAndDiff('neck', '1. Neckline / Collar')}
            {renderValueAndDiff('chest', '2. Chest Circumference')}
            {renderValueAndDiff('shoulder_width', '3. Shoulder Width')}
            {renderValueAndDiff('sleeve_length', '4. Sleeve Length')}
            {renderValueAndDiff('bicep', '5. Bicep Circumference')}
            {renderValueAndDiff('wrist', '6. Wrist Circumference')}
          </div>
        </div>

        {/* Right Column: Group B - Torso & Lower Body (6 Measurements) */}
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              B. Torso and Lower Body (6 Measurements)
            </h3>
            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {unitLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderValueAndDiff('stomach', '7. Belly Circumference')}
            {renderValueAndDiff('hip', '8. Hip Circumference')}
            {renderValueAndDiff('shirt_length', '9. Jacket Length')}
            {renderValueAndDiff('outseam', '10. Pant Outseam')}
            {renderValueAndDiff('thigh', '11. Thigh Circumference')}
            {renderValueAndDiff('waist', '12. Waist Circumference')}
          </div>
        </div>

      </div>

    </div>
  );
};
