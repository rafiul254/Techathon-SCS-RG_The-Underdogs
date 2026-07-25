import React, { useState } from 'react';
import { RiskFusionWeights, RiskThresholds, User, UserRole } from '../types';
import { Sliders, Shield, Users, Save, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AdminSettingsProps {
  weights: RiskFusionWeights;
  thresholds: RiskThresholds;
  users: User[];
  currentUser: User;
  onUpdateWeights: (newWeights: RiskFusionWeights) => void;
  onUpdateThresholds: (newThresholds: RiskThresholds) => void;
  onResetDefaults: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  weights,
  thresholds,
  users,
  currentUser,
  onUpdateWeights,
  onUpdateThresholds,
  onResetDefaults,
}) => {
  const [wFire, setWFire] = useState(weights.W_fire);
  const [wGas, setWGas] = useState(weights.W_gas);
  const [wWater, setWWater] = useState(weights.W_water);
  const [wOcc, setWOcc] = useState(weights.W_occ);

  const [safeLimit, setSafeLimit] = useState(thresholds.safeUpperLimit);
  const [warningLimit, setWarningLimit] = useState(thresholds.warningUpperLimit);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const sumWeights = Math.round((wFire + wGas + wWater + wOcc) * 100) / 100;

  const handleSaveWeightsAndThresholds = () => {
    onUpdateWeights({
      W_fire: wFire,
      W_gas: wGas,
      W_water: wWater,
      W_occ: wOcc,
    });
    onUpdateThresholds({
      safeUpperLimit: safeLimit,
      warningUpperLimit: warningLimit,
    });

    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Admin System Studio & RBAC Config</span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-medium">
                Admin Exclusive
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Tune Risk Fusion Formula weights, risk state thresholds, and role permissions
            </p>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-lg animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Parameters Saved & Grid Recalculated!</span>
          </div>
        )}
      </div>

      {/* Main Admin Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Risk Fusion Formula Tuning */}
        <div className="space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-slate-100">
              Risk Fusion Formula Weight Matrix
            </h3>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                Math.abs(sumWeights - 1.0) < 0.01
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}
            >
              Sum Weights: {sumWeights} / 1.0
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Formula: <code className="text-cyan-300 font-mono">Score = (W_fire * S_fire) + (W_gas * S_gas) + (W_water * S_water) + (W_occ * S_occ)</code>
          </p>

          <div className="space-y-3 text-xs">
            {/* W_fire */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>W_fire (Fire / Thermal Sensor Weight):</span>
                <strong className="text-red-400 font-mono">{wFire.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wFire}
                onChange={(e) => setWFire(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>

            {/* W_gas */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>W_gas (Gas Concentration Weight):</span>
                <strong className="text-amber-400 font-mono">{wGas.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wGas}
                onChange={(e) => setWGas(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* W_water */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>W_water (Liquid Spill Weight):</span>
                <strong className="text-cyan-400 font-mono">{wWater.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wWater}
                onChange={(e) => setWWater(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* W_occ */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>W_occ (PIR Occupancy Weight):</span>
                <strong className="text-purple-400 font-mono">{wOcc.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wOcc}
                onChange={(e) => setWOcc(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>
          </div>

          {/* Thresholds Config */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">
              Zone Risk State Threshold Boundaries:
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">SAFE Upper Score Limit:</label>
                <input
                  type="number"
                  value={safeLimit}
                  onChange={(e) => setSafeLimit(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-500">Score &lt; {safeLimit} = SAFE</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">WARNING Upper Score Limit:</label>
                <input
                  type="number"
                  value={warningLimit}
                  onChange={(e) => setWarningLimit(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-100 font-mono"
                />
                <span className="text-[10px] text-slate-500">
                  {safeLimit} &le; Score &lt; {warningLimit} = WARNING, &ge; {warningLimit} = CRITICAL
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={handleSaveWeightsAndThresholds}
              className="flex-1 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-lg text-xs shadow transition-colors flex items-center justify-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Apply & Recalculate Grid</span>
            </button>

            <button
              onClick={onResetDefaults}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>
          </div>
        </div>

        {/* Right: Role-Based Access Control (RBAC) */}
        <div className="space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Role-Based Access Control (RBAC) Registry</span>
            </h3>
            <span className="text-xs text-slate-400">JWT Authenticated Users</span>
          </div>

          <div className="space-y-3 text-xs">
            {users.map((usr) => (
              <div
                key={usr.id}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  usr.id === currentUser.id
                    ? 'bg-slate-900 border-cyan-800'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="font-bold text-slate-100 flex items-center space-x-2">
                    <span>{usr.name}</span>
                    {usr.id === currentUser.id && (
                      <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
                        Active User
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                    @{usr.username} • Badge: {usr.badgeId}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2 py-1 rounded font-bold text-xs border ${
                      usr.role === 'Admin'
                        ? 'bg-purple-950 text-purple-200 border-purple-800'
                        : 'bg-blue-950 text-blue-200 border-blue-800'
                    }`}
                  >
                    {usr.role}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-bold text-slate-200 flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>RBAC Permissions Summary:</span>
            </div>
            <p>• <strong>Admin:</strong> Edit weights, thresholds, reset system parameters, manage RBAC.</p>
            <p>• <strong>Security Staff:</strong> Acknowledge incidents, trigger zone actuators, log response notes.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
