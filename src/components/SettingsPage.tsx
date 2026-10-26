import React from 'react';
import { SystemSettings, MeasurementUnit } from '../types';
import { Camera, Sliders, Moon, Sun, ShieldCheck, Info, Sparkles, Check, Database, Cpu } from 'lucide-react';

interface SettingsPageProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  referenceHeightCm: number;
  setReferenceHeightCm: (h: number) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  referenceHeightCm,
  setReferenceHeightCm,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 font-sans">System & Camera Configuration</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure camera parameters, measurement units, AI optical precision, and enterprise privacy compliance.
        </p>
      </div>

      {/* 1. Camera Settings */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Camera className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-900 text-base font-sans">Camera Settings</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-medium">
          
          {/* Resolution */}
          <div>
            <label className="block text-slate-700 mb-1.5 font-semibold">Video Stream Resolution</label>
            <select
              value={settings.camera.resolution}
              onChange={(e) => onUpdateSettings({
                camera: { ...settings.camera, resolution: e.target.value as any }
              })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="1080p">1080p Full HD (Recommended)</option>
              <option value="720p">720p HD (Low Bandwidth)</option>
              <option value="4k">4K Ultra HD (High Precision)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Higher resolution improves edge detection on dark clothing.</p>
          </div>

          {/* Countdown Timer */}
          <div>
            <label className="block text-slate-700 mb-1.5 font-semibold">Capture Countdown Delay</label>
            <select
              value={settings.camera.countdownTimer}
              onChange={(e) => onUpdateSettings({
                camera: { ...settings.camera, countdownTimer: Number(e.target.value) }
              })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value={0}>Instant (0 Seconds)</option>
              <option value={3}>3 Seconds Delay</option>
              <option value={5}>5 Seconds Delay (Recommended)</option>
              <option value={10}>10 Seconds Delay</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Gives subject time to assume optimal pose 2.5 meters back.</p>
          </div>

          {/* Calibration Height */}
          <div>
            <label className="block text-slate-700 mb-1.5 font-semibold">Optical Height Calibration (cm)</label>
            <input
              type="number"
              value={referenceHeightCm}
              onChange={(e) => setReferenceHeightCm(Number(e.target.value) || 180)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-slate-500 mt-1">Known standing height used for sub-millimeter scale calibration.</p>
          </div>

          {/* Guide Wireframe Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="font-semibold text-slate-800">Show Bounding Box Wireframe</span>
              <p className="text-[11px] text-slate-500">Render SVG anatomical alignment grid over live video</p>
            </div>
            <input
              type="checkbox"
              checked={settings.camera.showGuideOverlay}
              onChange={(e) => onUpdateSettings({
                camera: { ...settings.camera, showGuideOverlay: e.target.checked }
              })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>

        </div>
      </div>

      {/* 2. Measurement Units */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Sliders className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-900 text-base font-sans">Measurement Units</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div
            onClick={() => onUpdateSettings({ unit: 'metric' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              settings.unit === 'metric'
                ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">Metric System</span>
              {settings.unit === 'metric' && <Check className="w-4 h-4 text-blue-600" />}
            </div>
            <p className="text-xs text-slate-500 mt-1">Centimeters (cm) for length • Kilograms (kg) for weight</p>
          </div>

          <div
            onClick={() => onUpdateSettings({ unit: 'imperial' })}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              settings.unit === 'imperial'
                ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">Imperial System</span>
              {settings.unit === 'imperial' && <Check className="w-4 h-4 text-blue-600" />}
            </div>
            <p className="text-xs text-slate-500 mt-1">Inches (in) for length • Pounds (lbs) for weight</p>
          </div>

        </div>
      </div>

      {/* 3. Dark Mode & Appearance */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          {settings.darkMode ? <Moon className="w-5 h-5 text-blue-600" /> : <Sun className="w-5 h-5 text-blue-600" />}
          <h2 className="font-bold text-slate-900 text-base font-sans">Dark Mode & Visual Styling</h2>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="font-semibold text-slate-900 text-xs">Dark Mode Theme</span>
            <p className="text-[11px] text-slate-500">Toggle dark mode atmosphere for low-light tailor studios</p>
          </div>
          <button
            onClick={() => onUpdateSettings({ darkMode: !settings.darkMode })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.darkMode ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. About & System Architecture */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Info className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-900 text-base font-sans">About AI Body Measurement System</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
            <span className="text-slate-500 font-semibold">AI Vision Model Engine</span>
            <p className="font-bold text-slate-900">Google Gemini 3.6 Flash Vision</p>
            <p className="text-slate-500 text-[11px]">Server-side biometric tensor processing</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
            <span className="text-slate-500 font-semibold">Gender Domain Scope</span>
            <p className="font-bold text-blue-700">MALE DEMO SPECIALIZATION</p>
            <p className="text-slate-500 text-[11px]">Calibrated on male anatomical tailoring ratios</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
            <span className="text-slate-500 font-semibold">Privacy Compliance</span>
            <p className="font-bold text-emerald-700">HIPAA & GDPR Zero Retention</p>
            <p className="text-slate-500 text-[11px]">Images processed strictly in volatile memory</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
            <span className="text-slate-500 font-semibold">System Build Version</span>
            <p className="font-bold text-slate-900">v2.4.0 Enterprise Edition</p>
            <p className="text-slate-500 text-[11px]">Sub-millimeter optical biometrics</p>
          </div>
        </div>
      </div>

    </div>
  );
};
