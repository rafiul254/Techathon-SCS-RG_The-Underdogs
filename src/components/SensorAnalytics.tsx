import React, { useState } from 'react';
import { Zone } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Activity, Flame, Wind, Droplets, Users, BarChart3, LineChart as LineChartIcon } from 'lucide-react';

interface SensorAnalyticsProps {
  zones: Zone[];
  selectedZoneId?: string;
  onSelectZoneId: (id: string) => void;
}

export const SensorAnalytics: React.FC<SensorAnalyticsProps> = ({
  zones,
  selectedZoneId,
  onSelectZoneId,
}) => {
  const activeZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  // Format historical trend data for Recharts
  const times = ['10m ago', '8m ago', '6m ago', '4m ago', '2m ago', 'Just now'];
  
  const lineChartData = times.map((t, idx) => {
    const fireNorm = activeZone.sensors.find((s) => s.type === 'fire')?.history[idx]?.normalizedValue || 0;
    const gasNorm = activeZone.sensors.find((s) => s.type === 'gas')?.history[idx]?.normalizedValue || 0;
    const waterNorm = activeZone.sensors.find((s) => s.type === 'water')?.history[idx]?.normalizedValue || 0;
    const pirNorm = activeZone.sensors.find((s) => s.type === 'pir')?.history[idx]?.normalizedValue || 0;

    // Calculate historical risk score trajectory
    const totalRiskScore = Math.min(100, fireNorm * 0.4 + gasNorm * 0.3 + waterNorm * 0.2 + pirNorm * 0.1);

    return {
      time: t,
      Fire: fireNorm,
      Gas: gasNorm,
      Water: waterNorm,
      Occupancy: pirNorm,
      TotalRiskScore: Math.round(totalRiskScore * 10) / 10,
    };
  });

  // Cross-zone risk score bar data
  const zoneBarData = zones.map((z) => ({
    name: z.code,
    fullName: z.name,
    score: z.currentRiskScore.totalScore,
    state: z.currentState,
  }));

  const getBarColor = (state: string) => {
    if (state === 'CRITICAL') return '#ef4444';
    if (state === 'WARNING') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
      {/* Header & Zone Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">
              Sensor Trajectory Analytics & Risk Score History
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Multi-sensor normalization trends and Risk Fusion formula trajectory over time
          </p>
        </div>

        {/* Zone Selector Pills */}
        <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-lg text-xs overflow-x-auto max-w-full space-x-1">
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => onSelectZoneId(z.id)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeZone.id === z.id
                  ? 'bg-cyan-900 text-cyan-200 font-bold border border-cyan-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {z.code}
            </button>
          ))}
        </div>
      </div>

      {/* Main Historical Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-200">
            <LineChartIcon className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-sm">{activeZone.name} ({activeZone.code}) - Sensor History</span>
          </div>
          <div className="text-slate-400">
            Current Risk Score: <strong className="text-cyan-300">{activeZone.currentRiskScore.totalScore.toFixed(1)}</strong>
          </div>
        </div>

        <div className="h-64 w-full bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              
              <Line type="monotone" dataKey="TotalRiskScore" name="Risk Fusion Score" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Fire" name="Thermal / Fire Norm" stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Gas" name="Gas PPM Norm" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Water" name="Liquid Spill Norm" stroke="#06b6d4" strokeDasharray="3 3" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Occupancy" name="PIR Density Norm" stroke="#a855f7" strokeDasharray="3 3" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cross-Zone Comparison Bar Chart */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center space-x-2 text-slate-200 text-xs">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-sm">Cross-Zone Campus Risk Score Matrix</span>
        </div>

        <div className="h-48 w-full bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                formatter={(val: any) => [`${val} / 100`, 'Risk Score']}
              />
              <Bar dataKey="score" name="Risk Score" radius={[6, 6, 0, 0]}>
                {zoneBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.state)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
