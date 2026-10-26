import React from 'react';
import { Camera, LayoutDashboard, History, Settings, Sparkles, Ruler, FileText, ArrowRight, Scissors } from 'lucide-react';
import { MeasurementUnit } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'camera' | 'results' | 'history' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'camera' | 'results' | 'history' | 'settings') => void;
  unit: MeasurementUnit;
  setUnit: (unit: MeasurementUnit) => void;
  hasScanToView: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  unit,
  setUnit,
  hasScanToView
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Title */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-all duration-200">
              <Scissors className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight font-sans">
                  Men's Tailoring AI System
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                  MEN'S BESPOKE ONLY
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">13 Canonical Men's Tailoring Dimensions</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('camera')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'camera'
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Live Camera</span>
            </button>

            {hasScanToView && (
              <button
                onClick={() => setActiveTab('results')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'results'
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Results</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center space-x-3">
            {/* Unit Toggle Switch */}
            <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center">
              <button
                onClick={() => setUnit('metric')}
                className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                  unit === 'metric'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                CM
              </button>
              <button
                onClick={() => setUnit('imperial')}
                className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                  unit === 'imperial'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Inches
              </button>
            </div>

            {/* Quick Start CTA */}
            <button
              onClick={() => setActiveTab('camera')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Start Scan</span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden border-t border-slate-200/60 bg-white/95 px-2 py-1.5 flex justify-around">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] ${
            activeTab === 'dashboard' ? 'text-blue-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] ${
            activeTab === 'camera' ? 'text-blue-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <Camera className="w-4 h-4 mb-0.5" />
          Live Scan
        </button>
        {hasScanToView && (
          <button
            onClick={() => setActiveTab('results')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] ${
              activeTab === 'results' ? 'text-blue-600 font-semibold' : 'text-slate-500'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            Results
          </button>
        )}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] ${
            activeTab === 'history' ? 'text-blue-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <History className="w-4 h-4 mb-0.5" />
          History
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[11px] ${
            activeTab === 'settings' ? 'text-blue-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <Settings className="w-4 h-4 mb-0.5" />
          Settings
        </button>
      </div>
    </header>
  );
};
