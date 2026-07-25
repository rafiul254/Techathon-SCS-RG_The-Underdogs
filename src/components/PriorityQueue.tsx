import React from 'react';
import { Zone, Incident, User } from '../types';
import { ShieldAlert, AlertTriangle, ArrowUpRight, CheckCircle, Clock, Zap, Users, Shield, Wind, Flame, Droplets } from 'lucide-react';

interface PriorityQueueProps {
  rankedZones: Zone[];
  incidents: Incident[];
  currentUser: User;
  onAcknowledgeIncident: (incidentId: string, notes: string) => void;
  onTriggerActuator: (zoneId: string, actuatorKey: string, newState: boolean) => void;
  onSelectZone: (zone: Zone) => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  rankedZones,
  incidents,
  currentUser,
  onAcknowledgeIncident,
  onTriggerActuator,
  onSelectZone,
}) => {
  // Filter for critical & warning zones only for priority response
  const urgentZones = rankedZones.filter((z) => z.currentState !== 'SAFE');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
            <h2 className="text-base font-bold text-slate-100">
              Live Priority Ranking Engine (Urgency Queue)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Automated ranking based on Risk Fusion Score + PIR Occupancy Density + Hazard Escalation Velocity
          </p>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-950 border border-slate-800 text-cyan-400">
          {urgentZones.length} Zones Requiring Attention
        </span>
      </div>

      {urgentZones.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-semibold text-slate-200">Grid Status Safe - No Priority Incidents</p>
          <p className="text-xs text-slate-500 mt-1">All monitored campus zones are operating within nominal thresholds.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {urgentZones.map((zone, index) => {
            const activeIncident = incidents.find(
              (i) => i.zoneId === zone.id && i.status !== 'resolved'
            );

            const isCritical = zone.currentState === 'CRITICAL';
            const fireSensor = zone.sensors.find((s) => s.type === 'fire');
            const gasSensor = zone.sensors.find((s) => s.type === 'gas');
            const waterSensor = zone.sensors.find((s) => s.type === 'water');

            // Find primary risk contributor
            const scores = [
              { type: 'Gas Concentration', val: zone.currentRiskScore.gasScore, icon: <Wind className="w-4 h-4 text-amber-400" /> },
              { type: 'Thermal / Flame Spike', val: zone.currentRiskScore.fireScore, icon: <Flame className="w-4 h-4 text-red-400" /> },
              { type: 'Liquid Leakage', val: zone.currentRiskScore.waterScore, icon: <Droplets className="w-4 h-4 text-cyan-400" /> },
            ];
            scores.sort((a, b) => b.val - a.val);
            const primaryDriver = scores[0];

            return (
              <div
                key={zone.id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  isCritical
                    ? 'bg-red-950/40 border-red-800/90 shadow-red-950/40 shadow-lg'
                    : 'bg-amber-950/30 border-amber-800/80'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  
                  {/* Rank Badge & Zone Details */}
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border shadow-inner ${
                        isCritical
                          ? 'bg-red-900 text-red-100 border-red-700'
                          : 'bg-amber-900 text-amber-100 border-amber-700'
                      }`}
                    >
                      #{index + 1}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-100">{zone.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono border border-slate-800">
                          {zone.code}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                            isCritical ? 'bg-red-900 text-red-200 animate-pulse' : 'bg-amber-900 text-amber-200'
                          }`}
                        >
                          {zone.currentState}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-0.5">
                        {zone.location} • {zone.building}
                      </p>

                      {/* Primary Driver & Occupancy Info */}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-slate-300 flex-wrap gap-y-1">
                        <div className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
                          {primaryDriver.icon}
                          <span>Primary Driver: <strong className="text-slate-100">{primaryDriver.type}</strong></span>
                        </div>

                        <div className="flex items-center space-x-1 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 text-purple-300">
                          <Users className="w-3.5 h-3.5" />
                          <span>PIR Density: <strong className="text-purple-200">{zone.occupantCount} Personnel</strong></span>
                        </div>

                        <div className="flex items-center space-x-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Response SLA: <strong className="text-cyan-300">&lt; 3 mins</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score & Incident Status */}
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Risk Fusion Score</div>
                    <div className={`text-2xl font-extrabold ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                      {zone.currentRiskScore.totalScore.toFixed(1)} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                    </div>

                    {activeIncident ? (
                      <div className="mt-1">
                        {activeIncident.status === 'acknowledged' ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                            <CheckCircle className="w-3 h-3" />
                            <span>Ack by {activeIncident.acknowledgedBy?.name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-red-300 bg-red-950 border border-red-700 px-2 py-0.5 rounded animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>UNACKNOWLEDGED</span>
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                </div>

                {/* Response Action Bar */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  
                  {/* Actuator Quick Toggles */}
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 font-medium text-[11px]">Emergency Actuators:</span>
                    
                    <button
                      onClick={() => onTriggerActuator(zone.id, 'ventilationRelay', !zone.actuators.ventilationRelay)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors flex items-center space-x-1 ${
                        zone.actuators.ventilationRelay
                          ? 'bg-cyan-900/90 text-cyan-200 border-cyan-700'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>Exhaust Fan {zone.actuators.ventilationRelay ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      onClick={() => onTriggerActuator(zone.id, 'buzzer', !zone.actuators.buzzer)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors flex items-center space-x-1 ${
                        zone.actuators.buzzer
                          ? 'bg-red-900/90 text-red-200 border-red-700 animate-pulse'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span>Buzzer {zone.actuators.buzzer ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>

                  {/* Incident Acknowledgment or Inspect */}
                  <div className="flex items-center space-x-2">
                    {activeIncident && activeIncident.status === 'active' && (
                      <button
                        onClick={() =>
                          onAcknowledgeIncident(
                            activeIncident.id,
                            `Acknowledged by ${currentUser.name} (${currentUser.role}). Dispatched immediate response protocol.`
                          )
                        }
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs shadow-md transition-colors flex items-center space-x-1.5"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Acknowledge Incident</span>
                      </button>
                    )}

                    <button
                      onClick={() => onSelectZone(zone)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs border border-slate-700 transition-colors flex items-center space-x-1"
                    >
                      <span>Open Deep Inspection</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
