import React, { useState, useEffect } from 'react';
import { ScanRecord, MeasurementUnit, ExtendedMeasurements } from '../types';
import { formatLength } from '../utils/unitConverter';
import { 
  Search, Trash2, Download, History, ArrowUpDown, Calendar, Edit3, Save, X, 
  FileText, Check, Database, RefreshCw, User, AlertTriangle, ShieldCheck,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown,
  Scissors
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseService';

interface HistoryPageProps {
  scans: ScanRecord[];
  unit: MeasurementUnit;
  onDeleteScan: (id: string) => void;
  onUpdateScan: (id: string, updates: Partial<ScanRecord>) => Promise<void>;
  onRefreshHistory?: () => void;
}

interface ColumnConfig {
  key: keyof ScanRecord;
  label: string;
  unitStr: string;
}

// Exactly the 12 Canonical Men's Tailoring Measurements (Unit is the 13th display specification)
const MEASUREMENT_COLUMNS: ColumnConfig[] = [
  { key: 'neck', label: '1. Neckline', unitStr: 'cm' },
  { key: 'chest', label: '2. Chest', unitStr: 'cm' },
  { key: 'shoulder_width', label: '3. Shoulder Width', unitStr: 'cm' },
  { key: 'sleeve_length', label: '4. Sleeve Length', unitStr: 'cm' },
  { key: 'bicep', label: '5. Bicep', unitStr: 'cm' },
  { key: 'wrist', label: '6. Wrist', unitStr: 'cm' },
  { key: 'stomach', label: '7. Belly', unitStr: 'cm' },
  { key: 'hip', label: '8. Hip', unitStr: 'cm' },
  { key: 'shirt_length', label: '9. Jacket Length', unitStr: 'cm' },
  { key: 'outseam', label: '10. Pant Outseam', unitStr: 'cm' },
  { key: 'thigh', label: '11. Thigh', unitStr: 'cm' },
  { key: 'waist', label: '12. Waist', unitStr: 'cm' },
];

export const HistoryPage: React.FC<HistoryPageProps> = ({
  scans,
  unit,
  onDeleteScan,
  onUpdateScan,
  onRefreshHistory
}) => {
  // Search state
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const [searchId, setSearchId] = useState<string>('');
  const [searchDate, setSearchDate] = useState<string>('');

  // Sort state
  const [sortField, setSortField] = useState<keyof ScanRecord>('measurement_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Selected Record & Detail Modal
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<ScanRecord>>({});
  const [editMeasurements, setEditMeasurements] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingScan, setDeletingScan] = useState<ScanRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Inline Customer Name Edit
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineNameVal, setInlineNameVal] = useState<string>('');

  // Toggle sorting on column header click
  const handleSort = (field: keyof ScanRecord) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Reset to page 1 on filter or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch, searchName, searchId, searchDate, sortField, sortOrder, pageSize]);

  // Filter & Search Scans
  const filteredAndSortedScans = scans
    .filter((scan) => {
      const nameStr = (scan.name || scan.userName || 'Name not provided').toLowerCase();
      const idStr = (scan.id || '').toLowerCase();
      const dateStr = (scan.measurement_date || scan.date || '').toLowerCase();

      // Global search term
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase().trim();
        const matchesGlobal = nameStr.includes(q) || idStr.includes(q) || dateStr.includes(q);
        if (!matchesGlobal) return false;
      }

      // Column-specific search terms
      const nameMatch = !searchName.trim() || nameStr.includes(searchName.toLowerCase().trim());
      const idMatch = !searchId.trim() || idStr.includes(searchId.toLowerCase().trim());
      
      let dateMatch = true;
      if (searchDate) {
        dateMatch = dateStr.slice(0, 10) === searchDate;
      }

      return nameMatch && idMatch && dateMatch;
    })
    .sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'measurement_date') {
        valA = new Date(a.measurement_date || a.date || a.timestamp || 0).getTime();
        valB = new Date(b.measurement_date || b.date || b.timestamp || 0).getTime();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      const numA = typeof valA === 'number' ? valA : 0;
      const numB = typeof valB === 'number' ? valB : 0;

      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

  // Pagination calculations
  const totalRecords = filteredAndSortedScans.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedScans = filteredAndSortedScans.slice(startIndex, startIndex + pageSize);

  // Helper format length according to unit
  const formatVal = (cmVal: number | undefined) => {
    if (typeof cmVal !== 'number' || isNaN(cmVal) || cmVal <= 0) return '—';
    return formatLength(cmVal, unit);
  };

  // Export All Filtered Records as CSV (Strictly 12 Men's Tailoring Measurements)
  const exportAllCSV = () => {
    if (filteredAndSortedScans.length === 0) return;
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

    const rows = filteredAndSortedScans.map(s => [
      `"${s.id}"`,
      `"${s.name || s.userName || 'Name not provided'}"`,
      `"${s.measurement_date || s.date || ''}"`,
      `"cm"`,
      `"${s.neck || ''}"`,
      `"${s.chest || ''}"`,
      `"${s.shoulder_width || ''}"`,
      `"${s.sleeve_length || ''}"`,
      `"${s.bicep || ''}"`,
      `"${s.wrist || ''}"`,
      `"${s.stomach || ''}"`,
      `"${s.hip || ''}"`,
      `"${s.shirt_length || ''}"`,
      `"${s.outseam || ''}"`,
      `"${s.thigh || ''}"`,
      `"${s.waist || ''}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mens_tailoring_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Single Record as CSV
  const exportSingleCSV = (scan: ScanRecord) => {
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

    const row = [
      `"${scan.id}"`,
      `"${scan.name || scan.userName || 'Name not provided'}"`,
      `"${scan.measurement_date || scan.date || ''}"`,
      `"cm"`,
      `"${scan.neck || ''}"`,
      `"${scan.chest || ''}"`,
      `"${scan.shoulder_width || ''}"`,
      `"${scan.sleeve_length || ''}"`,
      `"${scan.bicep || ''}"`,
      `"${scan.wrist || ''}"`,
      `"${scan.stomach || ''}"`,
      `"${scan.hip || ''}"`,
      `"${scan.shirt_length || ''}"`,
      `"${scan.outseam || ''}"`,
      `"${scan.thigh || ''}"`,
      `"${scan.waist || ''}"`,
      `"${(scan.notes || '').replace(/"/g, '""')}"`
    ].join(',');

    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${row}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tailoring_record_${scan.id}_${(scan.name || 'customer').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Single Record as PDF (Strictly 12 Men's Tailoring Measurements)
  const exportSinglePDF = (scan: ScanRecord) => {
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) return;

    const dateFormatted = scan.measurement_date ? new Date(scan.measurement_date).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'N/A';
    const customerName = scan.name || scan.userName || 'Name not provided';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Men's Tailoring Specification - ${customerName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
            .logo { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.02em; }
            .badge { background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }
            .meta { margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
            .meta-item label { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
            .meta-item span { font-size: 14px; font-weight: 700; color: #0f172a; }
            .section-title { font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
            .card .label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .card .val { font-size: 16px; font-weight: 800; color: #0f172a; font-family: monospace; margin-top: 2px; }
            .notice { margin-top: 24px; padding: 12px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; font-size: 11px; color: #92400e; }
            .footer { margin-top: 36px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">Men's Bespoke Tailoring Specification</div>
              <div style="font-size: 12px; color: #64748b;">13 Canonical Metrics • Strictly Men's Sizing</div>
            </div>
            <span class="badge">CANONICAL SPECIFICATION</span>
          </div>

          <div class="meta">
            <div class="meta-item"><label>Customer Name</label><span>${customerName}</span></div>
            <div class="meta-item"><label>Record ID</label><span style="font-family: monospace;">${scan.id}</span></div>
            <div class="meta-item"><label>Measurement Date</label><span>${dateFormatted}</span></div>
          </div>

          <div class="section-title">A. Upper Body (6 Measurements)</div>
          <div class="grid">
            <div class="card"><div class="label">1. Neckline / Collar</div><div class="val">${scan.neck || 0} cm</div></div>
            <div class="card"><div class="label">2. Chest Circumference</div><div class="val">${scan.chest || 0} cm</div></div>
            <div class="card"><div class="label">3. Shoulder Width</div><div class="val">${scan.shoulder_width || 0} cm</div></div>
            <div class="card"><div class="label">4. Sleeve Length</div><div class="val">${scan.sleeve_length || 0} cm</div></div>
            <div class="card"><div class="label">5. Bicep Circumference</div><div class="val">${scan.bicep || 0} cm</div></div>
            <div class="card"><div class="label">6. Wrist Circumference</div><div class="val">${scan.wrist || 0} cm</div></div>
          </div>

          <div class="section-title">B. Torso and Lower Body (6 Measurements)</div>
          <div class="grid">
            <div class="card"><div class="label">7. Belly Circumference</div><div class="val">${scan.stomach || 0} cm</div></div>
            <div class="card"><div class="label">8. Hip Circumference</div><div class="val">${scan.hip || 0} cm</div></div>
            <div class="card"><div class="label">9. Jacket Length</div><div class="val">${scan.shirt_length || 0} cm</div></div>
            <div class="card"><div class="label">10. Pant Outseam</div><div class="val">${scan.outseam || 0} cm</div></div>
            <div class="card"><div class="label">11. Thigh Circumference</div><div class="val">${scan.thigh || 0} cm</div></div>
            <div class="card"><div class="label">12. Waist Circumference</div><div class="val">${scan.waist || 0} cm</div></div>
          </div>

          ${scan.notes ? `<div class="section-title">Fitting Notes</div><p style="font-size: 12px; color: #475569;">${scan.notes}</p>` : ''}

          <div class="notice">
            <strong>Optical Measurement Protocol:</strong> Values measured using calibrated multi-view optical geometry. Tolerance ±1.2cm. Verify critical suit seams with tape.
          </div>

          <div class="footer">AI Men's Tailoring Platform • Tailor Precision Guarantee</div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Helper to initialize measurement input fields in the active unit
  const initEditInputs = (scan: ScanRecord, activeUnit: MeasurementUnit) => {
    const inputs: Record<string, string> = {};
    MEASUREMENT_COLUMNS.forEach(col => {
      const cmVal = scan[col.key];
      if (typeof cmVal === 'number' && cmVal > 0) {
        inputs[col.key] = activeUnit === 'imperial'
          ? (cmVal / 2.54).toFixed(2)
          : cmVal.toFixed(1);
      } else {
        inputs[col.key] = '';
      }
    });
    setEditMeasurements(inputs);
  };

  // Re-sync edit input values when user switches units
  useEffect(() => {
    if (selectedScan) {
      initEditInputs(selectedScan, unit);
    }
  }, [unit]);

  // Open Detail View Modal
  const openDetailModal = (scan: ScanRecord) => {
    setSelectedScan(scan);
    setEditForm({ ...scan });
    initEditInputs(scan, unit);
    setIsEditing(false);
    setSaveSuccessMsg(null);
  };

  // Start Editing Record
  const handleStartEditing = () => {
    if (!selectedScan) return;
    setEditForm({ ...selectedScan });
    initEditInputs(selectedScan, unit);
    setIsEditing(true);
  };

  // Save Edits to Supabase & Local History
  const handleSaveEdits = async () => {
    if (!selectedScan || !selectedScan.id) return;
    setIsSaving(true);
    try {
      const sanitizedName = (editForm.name || editForm.userName || '').trim() || 'Name not provided';
      const updatesToSave: any = {
        ...editForm,
        name: sanitizedName,
        userName: sanitizedName
      };

      // Convert entered measurements back to canonical centimeters
      MEASUREMENT_COLUMNS.forEach(col => {
        const rawVal = editMeasurements[col.key];
        if (rawVal !== undefined && rawVal !== '') {
          const parsed = parseFloat(rawVal);
          if (!isNaN(parsed) && parsed > 0) {
            updatesToSave[col.key] = unit === 'imperial'
              ? Number((parsed * 2.54).toFixed(1))
              : Number(parsed.toFixed(1));
          }
        }
      });

      await onUpdateScan(selectedScan.id, updatesToSave);
      const updatedScan = { ...selectedScan, ...updatesToSave } as ScanRecord;
      setSelectedScan(updatedScan);
      initEditInputs(updatedScan, unit);
      setIsEditing(false);
      setSaveSuccessMsg('Measurement record updated successfully!');
      setToast({ message: `Customer record for ${sanitizedName} updated.`, type: 'success' });
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setToast(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to update record:', err);
      setToast({ message: 'Failed to save measurement updates. Please try again.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Input Change during Edit Mode (stored in current active unit)
  const handleNumChange = (field: keyof ExtendedMeasurements, val: string) => {
    setEditMeasurements(prev => ({
      ...prev,
      [field]: val
    }));
  };

  // Handle Quick Inline Name Edit
  const handleSaveInlineName = async (scanId: string) => {
    const newName = inlineNameVal.trim() || 'Name not provided';
    try {
      await onUpdateScan(scanId, { name: newName, userName: newName });
      setToast({ message: `Customer name updated to "${newName}"`, type: 'success' });
      setInlineEditingId(null);
      setInlineNameVal('');
      setTimeout(() => setToast(null), 3500);
    } catch (err) {
      setToast({ message: 'Failed to update customer name.', type: 'error' });
    }
  };

  // Execute Confirmed Deletion
  const handleExecuteDelete = async () => {
    if (!deletingScan || !deletingScan.id) return;
    const targetId = deletingScan.id;
    const targetName = deletingScan.name || deletingScan.userName || 'Customer';
    setIsDeleting(true);
    try {
      await onDeleteScan(targetId);
      if (selectedScan?.id === targetId) {
        setSelectedScan(null);
      }
      setDeletingScan(null);
      setToast({
        message: `Measurement record for ${targetName} (${targetId}) deleted permanently.`,
        type: 'success'
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error('Deletion error:', err);
      setToast({ message: `Failed to delete record ${targetId}. Please try again.`, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Render header sort icon
  const renderSortIcon = (field: keyof ScanRecord) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />;
    }
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600 ml-1 shrink-0" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600 ml-1 shrink-0" />;
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-lg transition-all animate-fadeIn ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
            : 'bg-rose-50 text-rose-900 border-rose-300'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <History className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-slate-900 font-sans">Men's Tailoring Measurement History</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  12 Physical Metrics
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Database: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">tailor_measurements</code>
                  {isSupabaseConfigured ? ' (Supabase Connected)' : ' (Local Storage Sync)'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onRefreshHistory && (
            <button
              onClick={onRefreshHistory}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={exportAllCSV}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Tailoring CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        
        {/* Global Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, record ID, or date..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
          
          {/* Filter by Customer Name */}
          <div className="relative">
            <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter by Record ID */}
          <div className="relative">
            <Scissors className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by Record ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Filter by Date */}
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

        </div>
      </div>

      {/* Main Measurements Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {filteredAndSortedScans.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No tailoring measurement records found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {scans.length === 0
                ? 'Your measurement history is currently empty. Run a 360° body scan to record tailoring data.'
                : 'No records match your active search filters. Try clearing search criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse text-xs">
              
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px] select-none">
                <tr>
                  
                  {/* Sticky Frozen Col 1: Record ID */}
                  <th 
                    onClick={() => handleSort('id')}
                    className="sticky left-0 z-40 bg-slate-100 hover:bg-slate-200/80 cursor-pointer py-3.5 px-3 min-w-[110px] w-[110px] border-r border-slate-200 shadow-[1px_0_0_0_#cbd5e1] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span>Record ID</span>
                      {renderSortIcon('id')}
                    </div>
                  </th>

                  {/* Sticky Frozen Col 2: Customer Name */}
                  <th 
                    onClick={() => handleSort('name')}
                    className="sticky left-[110px] z-40 bg-slate-100 hover:bg-slate-200/80 cursor-pointer py-3.5 px-3 min-w-[160px] w-[160px] border-r border-slate-200 shadow-[1px_0_0_0_#cbd5e1] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span>Customer Name</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>

                  {/* Sticky Frozen Col 3: Measurement Date */}
                  <th 
                    onClick={() => handleSort('measurement_date')}
                    className="sticky left-[270px] z-40 bg-slate-100 hover:bg-slate-200/80 cursor-pointer py-3.5 px-3 min-w-[130px] w-[130px] border-r border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span>Date</span>
                      {renderSortIcon('measurement_date')}
                    </div>
                  </th>

                  {/* Exactly 12 Men's Tailoring Measurement Columns */}
                  {MEASUREMENT_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="py-3.5 px-3 min-w-[110px] whitespace-nowrap text-center bg-slate-100 hover:bg-slate-200/80 cursor-pointer border-r border-slate-200/60 transition-colors group"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>{col.label} ({unit === 'imperial' ? 'in' : 'cm'})</span>
                        {renderSortIcon(col.key)}
                      </div>
                    </th>
                  ))}

                  {/* Sticky Fixed Right Col: Actions */}
                  <th className="sticky right-0 z-40 bg-slate-100 py-3.5 px-3 min-w-[130px] w-[130px] text-right border-l border-slate-200 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium bg-white">
                {paginatedScans.map((scan) => {
                  const customerName = scan.name || scan.userName || '';
                  const hasName = Boolean(customerName && customerName !== 'Name not provided');

                  return (
                    <tr
                      key={scan.id}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      
                      {/* Sticky Cell 1: ID */}
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50/90 py-3 px-3 min-w-[110px] w-[110px] font-mono text-[11px] font-bold text-slate-800 border-r border-slate-100 shadow-[1px_0_0_0_#e2e8f0] truncate">
                        {scan.id}
                      </td>

                      {/* Sticky Cell 2: Customer Name */}
                      <td className="sticky left-[110px] z-20 bg-white group-hover:bg-blue-50/90 py-3 px-3 min-w-[160px] w-[160px] text-xs border-r border-slate-100 shadow-[1px_0_0_0_#e2e8f0]">
                        {inlineEditingId === scan.id ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={inlineNameVal}
                              onChange={(e) => setInlineNameVal(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-blue-400 rounded-md focus:outline-none"
                              placeholder="Customer name..."
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveInlineName(scan.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInlineEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group/name">
                            <span className={hasName ? 'font-bold text-slate-900 truncate' : 'text-amber-600 italic font-semibold'}>
                              {hasName ? customerName : 'Name not provided'}
                            </span>
                            <button
                              onClick={() => {
                                setInlineEditingId(scan.id);
                                setInlineNameVal(hasName ? customerName : '');
                              }}
                              className="opacity-0 group-hover/name:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-opacity ml-1"
                              title="Edit customer name"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Sticky Cell 3: Measurement Date */}
                      <td className="sticky left-[270px] z-20 bg-white group-hover:bg-blue-50/90 py-3 px-3 min-w-[130px] w-[130px] font-mono text-[11px] text-slate-600 border-r border-slate-100 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] truncate">
                        {scan.measurement_date || scan.date ? new Date(scan.measurement_date || scan.date || '').toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Recent'}
                      </td>

                      {/* Exactly 12 Men's Tailoring Measurements */}
                      {MEASUREMENT_COLUMNS.map((col) => {
                        const val = scan[col.key];
                        const numVal = typeof val === 'number' ? val : 0;
                        return (
                          <td
                            key={col.key}
                            className="py-3 px-3 min-w-[110px] text-center font-mono text-xs text-slate-800 border-r border-slate-100/60 whitespace-nowrap"
                          >
                            {numVal > 0 ? formatVal(numVal) : '—'}
                          </td>
                        );
                      })}

                      {/* Sticky Cell Actions */}
                      <td className="sticky right-0 z-20 bg-white group-hover:bg-blue-50/90 py-3 px-3 min-w-[130px] w-[130px] text-right border-l border-slate-100 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-end space-x-1.5">
                          
                          {/* Edit / View Modal Button */}
                          <button
                            onClick={() => openDetailModal(scan)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-100/70 transition-all cursor-pointer"
                            title="View / Edit All Measurements"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Export PDF */}
                          <button
                            onClick={() => exportSinglePDF(scan)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-100/70 transition-all cursor-pointer"
                            title="Export PDF Report"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Export CSV */}
                          <button
                            onClick={() => exportSingleCSV(scan)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-100/70 transition-all cursor-pointer"
                            title="Export CSV Record"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Record Button */}
                          <button
                            onClick={() => setDeletingScan(scan)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-100/70 transition-all cursor-pointer"
                            title="Delete Measurement Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredAndSortedScans.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700">
            
            {/* Rows Per Page Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-500 text-[11px] ml-2 font-mono">
                Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalRecords)} of {totalRecords} records
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-1">
              
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>

            </div>

          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {deletingScan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Tailoring Record</h3>
                <p className="text-xs text-slate-500 font-mono">Record ID: {deletingScan.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the tailoring measurement record for{' '}
              <strong className="text-slate-900">{deletingScan.name || deletingScan.userName || 'this customer'}</strong>?
              This action cannot be undone and removes the record from both database and local storage.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingScan(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Edit Modal View when clicking Edit */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">
                    {isEditing ? 'Edit Tailoring Record' : (selectedScan.name || selectedScan.userName || 'Name not provided')}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Record ID: {selectedScan.id} • {selectedScan.measurement_date ? new Date(selectedScan.measurement_date).toLocaleDateString() : 'Recent'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => exportSinglePDF(selectedScan)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all flex items-center space-x-1.5 cursor-pointer"
                      title="Export as PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">Export PDF</span>
                    </button>

                    <button
                      onClick={() => exportSingleCSV(selectedScan)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all flex items-center space-x-1.5 cursor-pointer"
                      title="Export as CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </button>

                    <button
                      onClick={handleStartEditing}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Record</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSaveEdits}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Changes</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedScan(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Success Notification Bar */}
            {saveSuccessMsg && (
              <div className="bg-emerald-500 text-white text-xs font-bold px-6 py-2 flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Modal Body: Strictly 12 Men's Tailoring Measurements */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              
              {/* Customer Profile Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Customer Real Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value, userName: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl font-bold text-slate-900 border border-slate-300 bg-white"
                      placeholder="Enter customer name..."
                    />
                  ) : (
                    <p className="font-bold text-slate-900 text-sm">
                      {selectedScan.name || selectedScan.userName || 'Name not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Measurement Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={(editForm.measurement_date || '').slice(0, 10)}
                      onChange={(e) => setEditForm(prev => ({ ...prev, measurement_date: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl font-bold text-slate-900 border border-slate-300 bg-white font-mono"
                    />
                  ) : (
                    <p className="font-mono text-slate-700">
                      {selectedScan.measurement_date ? new Date(selectedScan.measurement_date).toLocaleDateString() : 'N/A'}
                    </p>
                  )}
                </div>
              </div>

              {/* A. Upper Body (6 Measurements) */}
              <div>
                <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider border-b border-blue-100 pb-1 mb-3 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>A. Upper Body (6 Tailoring Metrics)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <MeasurementField label="1. Neckline / Collar" field="neck" isEditing={isEditing} valueCm={selectedScan.neck} editVal={editMeasurements.neck ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="2. Chest Circumference" field="chest" isEditing={isEditing} valueCm={selectedScan.chest} editVal={editMeasurements.chest ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="3. Shoulder Width" field="shoulder_width" isEditing={isEditing} valueCm={selectedScan.shoulder_width} editVal={editMeasurements.shoulder_width ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="4. Sleeve Length" field="sleeve_length" isEditing={isEditing} valueCm={selectedScan.sleeve_length} editVal={editMeasurements.sleeve_length ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="5. Bicep Circumference" field="bicep" isEditing={isEditing} valueCm={selectedScan.bicep} editVal={editMeasurements.bicep ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="6. Wrist Circumference" field="wrist" isEditing={isEditing} valueCm={selectedScan.wrist} editVal={editMeasurements.wrist ?? ''} unit={unit} onChange={handleNumChange} />
                </div>
              </div>

              {/* B. Torso & Lower Body (6 Measurements) */}
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-3">
                  B. Torso and Lower Body (6 Tailoring Metrics)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <MeasurementField label="7. Belly Circumference" field="stomach" isEditing={isEditing} valueCm={selectedScan.stomach} editVal={editMeasurements.stomach ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="8. Hip Circumference" field="hip" isEditing={isEditing} valueCm={selectedScan.hip} editVal={editMeasurements.hip ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="9. Jacket Length" field="shirt_length" isEditing={isEditing} valueCm={selectedScan.shirt_length} editVal={editMeasurements.shirt_length ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="10. Pant Outseam" field="outseam" isEditing={isEditing} valueCm={selectedScan.outseam} editVal={editMeasurements.outseam ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="11. Thigh Circumference" field="thigh" isEditing={isEditing} valueCm={selectedScan.thigh} editVal={editMeasurements.thigh ?? ''} unit={unit} onChange={handleNumChange} />
                  <MeasurementField label="12. Waist Circumference" field="waist" isEditing={isEditing} valueCm={selectedScan.waist} editVal={editMeasurements.waist ?? ''} unit={unit} onChange={handleNumChange} />
                </div>
              </div>

              {/* Fitting Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tailor Notes</label>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-900 border border-slate-300 bg-white"
                  />
                ) : (
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                    {selectedScan.notes || 'No tailoring notes provided.'}
                  </p>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setDeletingScan(selectedScan);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Record</span>
              </button>

              <button
                onClick={() => setSelectedScan(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

// Sub-component for individual measurement fields in modal
const MeasurementField: React.FC<{
  label: string;
  field: keyof ExtendedMeasurements;
  isEditing: boolean;
  valueCm?: number;
  editVal: string;
  unit: MeasurementUnit;
  onChange: (field: keyof ExtendedMeasurements, val: string) => void;
}> = ({ label, field, isEditing, valueCm = 0, editVal, unit, onChange }) => {
  return (
    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1 truncate">
        {label}
      </label>
      {isEditing ? (
        <div className="relative">
          <input
            type="number"
            step={unit === 'imperial' ? '0.01' : '0.1'}
            value={editVal}
            onChange={(e) => onChange(field, e.target.value)}
            className="w-full pr-7 px-2 py-1 rounded-xl text-xs font-mono font-bold text-slate-900 border border-slate-300 bg-white focus:border-blue-500 focus:outline-none"
          />
          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold font-mono">
            {unit === 'imperial' ? 'in' : 'cm'}
          </span>
        </div>
      ) : (
        <div className="font-mono text-sm font-extrabold text-slate-900">
          {valueCm > 0 ? formatLength(valueCm, unit) : '—'}
        </div>
      )}
    </div>
  );
};
