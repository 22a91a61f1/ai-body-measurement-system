import React, { useState, useEffect } from 'react';
import { TailorMeasurement } from '../types';
import { getAllTailorMeasurements, deleteTailorMeasurement } from '../services/measurementService';
import { Search, Calendar, User, Hash, Eye, Edit3, Trash2, Scissors, Plus, RefreshCw, FileSpreadsheet, ArrowRight, ShieldCheck, Database } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseService';

interface TailorHistoryPageProps {
  onSelectRecord: (record: TailorMeasurement) => void;
  onEditRecord: (record: TailorMeasurement) => void;
  onCreateNew: () => void;
}

export const TailorHistoryPage: React.FC<TailorHistoryPageProps> = ({
  onSelectRecord,
  onEditRecord,
  onCreateNew
}) => {
  const [records, setRecords] = useState<TailorMeasurement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchName, setSearchName] = useState<string>('');
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchRecordId, setSearchRecordId] = useState<string>('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getAllTailorMeasurements();
      setRecords(data);
    } catch (e) {
      console.error('Error loading tailor records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, customerName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete measurement record for ${customerName}?`)) {
      return;
    }
    await deleteTailorMeasurement(id);
    loadHistory();
  };

  // Filter logic for Customer Name, Measurement Date, Record ID
  const filteredRecords = records.filter(r => {
    const matchesName = !searchName.trim() || r.name.toLowerCase().includes(searchName.toLowerCase().trim());
    const matchesRecordId = !searchRecordId.trim() || (r.id && r.id.toLowerCase().includes(searchRecordId.toLowerCase().trim()));
    const matchesDate = !searchDate || (r.measurement_date && r.measurement_date.startsWith(searchDate));

    return matchesName && matchesRecordId && matchesDate;
  });

  const exportAllCSV = () => {
    if (filteredRecords.length === 0) return;
    const keys = Object.keys(filteredRecords[0]).filter(k => k !== 'snapshot_url');
    const headers = keys.join(',');
    const rows = filteredRecords.map(r => keys.map(k => `"${(r as any)[k] ?? ''}"`).join(','));
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tailor_database_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-slate-900 text-white shadow-md">
              <Scissors className="w-6 h-6 text-amber-400" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-sans">Tailor Customer Database</h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Supabase Table: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">tailor_measurements</code>
                  {isSupabaseConfigured ? ' (Live Supabase)' : ' (Local Storage DB Sync)'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportAllCSV}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onCreateNew}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Measurement</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Customer Name, Measurement Date, Record ID */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>Search & Filter Database</span>
          </span>
          <button
            onClick={loadHistory}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Customer Name Search */}
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Filter by Customer Name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-900 border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Record ID Search */}
          <div className="relative">
            <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchRecordId}
              onChange={(e) => setSearchRecordId(e.target.value)}
              placeholder="Filter by Record UUID / ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-900 border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Measurement Date Search */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-semibold text-slate-900 border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

        </div>
      </div>

      {/* Customer Database Records Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs font-semibold">Loading customer tailor measurements...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <User className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700">No Tailor Measurement Records Found</p>
              <p className="text-xs text-slate-400">
                {records.length === 0
                  ? 'Click "New Measurement" or perform a 360° AI Body Scan to create your first customer record.'
                  : 'No customer records matched your search filters.'}
              </p>
            </div>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Record</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Measurement Date</th>
                  <th className="px-6 py-4">Chest / Waist / Hip</th>
                  <th className="px-6 py-4">Shoulder / Sleeve</th>
                  <th className="px-6 py-4">Inseam / Outseam</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.map((r) => (
                  <tr
                    key={r.id || Math.random().toString()}
                    onClick={() => onSelectRecord(r)}
                    className="hover:bg-blue-50/40 transition-all cursor-pointer group"
                  >
                    <td className="px-6 py-4 text-slate-900 font-bold">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase shrink-0">
                          {r.name.slice(0, 2)}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {r.name}
                          </span>
                          <span className="block text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                            ID: {r.id || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      <span className="font-mono text-xs">
                        {r.measurement_date ? new Date(r.measurement_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Recent'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-800 font-mono">
                      <span>{r.chest} / {r.waist} / {r.hip} cm</span>
                    </td>

                    <td className="px-6 py-4 text-slate-800 font-mono">
                      <span>{r.shoulder_width} / {r.sleeve_length} cm</span>
                    </td>

                    <td className="px-6 py-4 text-slate-800 font-mono">
                      <span>{r.inseam} / {r.outseam} cm</span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRecord(r);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-100/60 transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRecord(r);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-100/60 transition-all"
                          title="Edit Record"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleDelete(e, r.id!, r.name)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-100/60 transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
