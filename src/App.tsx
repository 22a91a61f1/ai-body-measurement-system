import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { LiveCamera } from './components/LiveCamera';
import { ResultsPage } from './components/ResultsPage';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { getScanHistory, saveScanRecord, deleteScanRecord, updateScanRecord } from './services/database';
import { BodyMeasurements, MeasurementUnit, ScanRecord, SystemSettings, CapturedAngleFrame } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'camera' | 'results' | 'history' | 'settings'>('dashboard');
  const [unit, setUnit] = useState<MeasurementUnit>('metric');
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [referenceHeightCm, setReferenceHeightCm] = useState<number>(180);

  // Latest Scan Results State
  const [currentMeasurements, setCurrentMeasurements] = useState<BodyMeasurements | null>(null);
  const [currentSnapshotUrl, setCurrentSnapshotUrl] = useState<string | undefined>(undefined);
  const [currentCapturedFrames, setCurrentCapturedFrames] = useState<CapturedAngleFrame[]>([]);
  const [currentCustomerName, setCurrentCustomerName] = useState<string>('');
  const [currentCustomerId, setCurrentCustomerId] = useState<string>('');

  // Extract unique existing customers from scan history
  const existingCustomers = React.useMemo(() => {
    const map = new Map<string, string>();
    scans.forEach(s => {
      const name = s.name || s.userName;
      if (name && name !== 'Name not provided' && !name.includes('Alexander')) {
        const id = s.userId || s.id;
        if (!map.has(name)) {
          map.set(name, id);
        }
      }
    });
    return Array.from(map.entries()).map(([name, id]) => ({ id, name }));
  }, [scans]);

  // Load history from Supabase / database on mount
  const reloadHistory = async () => {
    try {
      const records = await getScanHistory();
      setScans(records);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    reloadHistory();
  }, []);

  // System Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    unit: 'metric',
    darkMode: false,
    precisionMode: 'high_precision',
    autoSaveHistory: true,
    camera: {
      deviceId: 'default',
      resolution: '1080p',
      frameRate: 60,
      countdownTimer: 3,
      showGuideOverlay: true,
      autoCaptureOnPose: false,
    }
  });

  // Keep settings unit in sync with global unit
  useEffect(() => {
    setSettings(prev => ({ ...prev, unit }));
  }, [unit]);

  // Handle Capture Completion from Live Camera
  const handleCaptureComplete = async ({
    imageBase64,
    measurements,
    capturedFrames = [],
    customerName,
    customerId
  }: {
    imageBase64: string;
    measurements: BodyMeasurements;
    capturedFrames?: CapturedAngleFrame[];
    customerName?: string;
    customerId?: string;
  }) => {
    setCurrentMeasurements(measurements);
    setCurrentSnapshotUrl(imageBase64);
    setCurrentCapturedFrames(capturedFrames);
    if (customerName) {
      setCurrentCustomerName(customerName);
    }
    if (customerId) {
      setCurrentCustomerId(customerId);
    }
    setActiveTab('results');
  };

  // Handle Save New Scan Record manually from results page
  const handleSaveScan = async (newScan: ScanRecord) => {
    try {
      const saved = await saveScanRecord(newScan);
      setScans(prev => [saved, ...prev.filter(s => s.id !== saved.id)]);
    } catch (err) {
      console.error('Manual save error:', err);
    }
  };

  // Handle Update Record from History page detail view
  const handleUpdateRecord = async (id: string, updates: Partial<ScanRecord>) => {
    try {
      const updated = await updateScanRecord(id, updates);
      setScans(prev => prev.map(s => s.id === id ? updated : s));
    } catch (err) {
      console.error('Update record error:', err);
    }
  };

  // Handle Delete Scan Record
  const handleDeleteScan = async (id: string) => {
    try {
      const remaining = await deleteScanRecord(id);
      setScans(remaining);
    } catch (err) {
      console.error('Delete scan error:', err);
    }
  };

  // Handle View Historical Scan Record
  const handleViewScan = (scan: ScanRecord) => {
    if (scan.measurements) {
      setCurrentMeasurements(scan.measurements);
    }
    setCurrentCustomerName(scan.name || scan.userName || '');
    setCurrentCustomerId(scan.userId || scan.id || '');
    setCurrentSnapshotUrl(scan.snapshot_url || scan.snapshotUrl);
    setCurrentCapturedFrames(scan.angleFrames || []);
    setActiveTab('results');
  };

  // Handle Settings Update
  const handleUpdateSettings = (newPartial: Partial<SystemSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newPartial
    }));
    if (newPartial.unit) {
      setUnit(newPartial.unit);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans ${
      settings.darkMode
        ? 'bg-slate-950 text-slate-100'
        : 'bg-slate-50/70 text-slate-900'
    }`}>
      
      {/* Top Header Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unit={unit}
        setUnit={setUnit}
        hasScanToView={Boolean(currentMeasurements)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {activeTab === 'dashboard' && (
          <Dashboard
            scans={scans}
            unit={unit}
            onStartScan={() => setActiveTab('camera')}
            onViewScan={handleViewScan}
            onDeleteScan={handleDeleteScan}
          />
        )}

        {activeTab === 'camera' && (
          <LiveCamera
            onCaptureComplete={handleCaptureComplete}
            cameraSettings={settings.camera}
            referenceHeightCm={referenceHeightCm}
            initialCustomerName={currentCustomerName}
            initialCustomerId={currentCustomerId}
            existingCustomers={existingCustomers}
          />
        )}

        {activeTab === 'results' && currentMeasurements && (
          <ResultsPage
            measurements={currentMeasurements}
            snapshotUrl={currentSnapshotUrl}
            capturedFrames={currentCapturedFrames}
            customerName={currentCustomerName}
            customerId={currentCustomerId}
            unit={unit}
            onUnitChange={setUnit}
            onSaveScan={handleSaveScan}
            onRetake={() => setActiveTab('camera')}
            onViewHistory={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPage
            scans={scans}
            unit={unit}
            onDeleteScan={handleDeleteScan}
            onUpdateScan={handleUpdateRecord}
            onRefreshHistory={reloadHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            referenceHeightCm={referenceHeightCm}
            setReferenceHeightCm={setReferenceHeightCm}
          />
        )}

      </main>

    </div>
  );
}
