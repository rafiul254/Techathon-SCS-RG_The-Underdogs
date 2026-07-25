import React from 'react';
import { User, UserRole } from '../types';
import { Shield, ShieldAlert, Cpu, Bell, BellOff, Code, RefreshCw, Radio } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  users: User[];
  onUserSwitch: (user: User) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  criticalCount: number;
  warningCount: number;
  audioMuted: boolean;
  onToggleAudioMute: () => void;
  onOpenApiDocs: () => void;
  onQuickInjectSpike: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  users,
  onUserSwitch,
  isSimulating,
  onToggleSimulation,
  criticalCount,
  warningCount,
  audioMuted,
  onToggleAudioMute,
  onOpenApiDocs,
  onQuickInjectSpike,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand & System Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-md text-white flex items-center justify-center">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                RoboFusion <span className="text-cyan-400 font-extrabold">SCS-RG</span>
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
                v2.4 Live Grid
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-Hazard Smart Campus Safety & Response Grid
            </p>
          </div>
        </div>

        {/* Live Grid Status Badges */}
        <div className="flex items-center space-x-3 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isSimulating ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium">{isSimulating ? 'Live IoT Stream' : 'Stream Paused'}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded font-bold text-xs ${criticalCount > 0 ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              {criticalCount} Critical
            </span>
            <span className={`px-2 py-0.5 rounded font-bold text-xs ${warningCount > 0 ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-400'}`}>
              {warningCount} Warning
            </span>
          </div>
        </div>

        {/* System Controls & Switcher */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          
          {/* Quick Simulation Trigger */}
          <button
            onClick={onQuickInjectSpike}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-semibold transition-colors"
            title="Inject test sensor anomaly"
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Anomaly</span>
          </button>

          {/* Toggle Live IoT Stream */}
          <button
            onClick={onToggleSimulation}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isSimulating
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-emerald-900/60 text-emerald-300 border-emerald-700 hover:bg-emerald-800/80'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Pause IoT' : 'Resume IoT'}</span>
          </button>

          {/* Mute Audio Alarm */}
          <button
            onClick={onToggleAudioMute}
            className={`p-1.5 rounded-lg text-xs border transition-colors ${
              audioMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                : 'bg-amber-950/80 text-amber-300 border-amber-700 animate-pulse'
            }`}
            title={audioMuted ? 'Audio alarms muted' : 'Audio alarms active'}
          >
            {audioMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>

          {/* API Inspector Button */}
          <button
            onClick={onOpenApiDocs}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Code className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">REST API Docs</span>
          </button>

          {/* Role Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <Shield className="w-3.5 h-3.5 text-cyan-400 ml-1 mr-1.5" />
            <select
              value={currentUser.id}
              onChange={(e) => {
                const u = users.find((usr) => usr.id === e.target.value);
                if (u) onUserSwitch(u);
              }}
              className="bg-transparent text-slate-200 text-xs border-none focus:ring-0 font-medium cursor-pointer outline-none pr-1"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>
    </header>
  );
};
