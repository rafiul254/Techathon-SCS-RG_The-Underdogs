import React, { useState } from 'react';
import { Zone, ZoneState, SensorType } from '../types';
import { Flame, Wind, Droplets, Users, ShieldAlert, CheckCircle2, AlertTriangle, Zap, Radio, SlidersHorizontal, Settings2 } from 'lucide-react';

interface LiveZoneMapProps {
  zones: Zone[];
  onSelectZone: (zone: Zone) => void;
  onTriggerActuator: (zoneId: string, actuatorKey: string, newState: boolean) => void;
  onInjectAnomaly: (zoneId: string, sensorType: SensorType, rawValue: number) => void;
}

export const LiveZoneMap: React.FC<LiveZoneMapProps> = ({
  zones,
  onSelectZone,
  onTriggerActuator,
  onInjectAnomaly,
}) => {
  const [filterState, setFilterState] = useState<'ALL' | ZoneState>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredZones = zones.filter((z) => {
    const matchesState = filterState === 'ALL' || z.currentState === filterState;
    const matchesSearch =
      z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.building.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

  const getStateStyle = (state: ZoneState) => {
    switch (state) {
      case 'CRITICAL':
        return {
          cardBg: 'bg-red-950/40 border-red-700/80 shadow-red-950/50 shadow-lg animate-pulse-subtle',
          badgeBg: 'bg-red-900/80 text-red-200 border-red-700',
          indicator: 'bg-red-500 animate-ping',
          icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
        };
      case 'WARNING':
        return {
          cardBg: 'bg-amber-950/30 border-amber-700/60 shadow-amber-950/30 shadow-md',
          badgeBg: 'bg-amber-900/80 text-amber-200 border-amber-700',
          indicator: 'bg-amber-400',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        };
      default:
        return {
          cardBg: 'bg-slate-900/90 border-slate-800 shadow-slate-950/40 hover:border-slate-700',
          badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
          indicator: 'bg-emerald-400',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span>Campus Safety Grid - Live Zone Monitor</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time sensor risk score fusion & lab environment status
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search lab or zone code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />

          {/* Filter Pills */}
          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg text-xs space-x-1">
            {(['ALL', 'CRITICAL', 'WARNING', 'SAFE'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterState === st
                    ? st === 'CRITICAL'
                      ? 'bg-red-900/90 text-red-200'
                      : st === 'WARNING'
                      ? 'bg-amber-900/90 text-amber-200'
                      : st === 'SAFE'
                      ? 'bg-emerald-900/90 text-emerald-200'
                      : 'bg-cyan-900/90 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredZones.map((zone) => {
          const style = getStateStyle(zone.currentState);
          const fireSensor = zone.sensors.find((s) => s.type === 'fire');
          const gasSensor = zone.sensors.find((s) => s.type === 'gas');
          const waterSensor = zone.sensors.find((s) => s.type === 'water');
          const pirSensor = zone.sensors.find((s) => s.type === 'pir');

          return (
            <div
              key={zone.id}
              className={`border rounded-xl p-4 transition-all duration-200 flex flex-col justify-between ${style.cardBg}`}
            >
              <div>
                {/* Zone Card Top Bar */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.indicator}`} />
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                        <span>{zone.name}</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {zone.code} • {zone.building} ({zone.floor})
                      </p>
                    </div>
                  </div>

                  {/* Risk Score Pill */}
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center space-x-1.5 ${style.badgeBg}`}>
                    {style.icon}
                    <span>{zone.currentRiskScore.totalScore.toFixed(1)} Score</span>
                  </div>
                </div>

                {/* Sensor Metric Grid */}
                <div className="grid grid-cols-2 gap-2 my-3 text-xs bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                  {/* Fire/Thermal */}
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Flame className={`w-4 h-4 ${(fireSensor?.currentNormalizedValue || 0) > 40 ? 'text-red-400 animate-bounce' : 'text-slate-500'}`} />
                    <div className="truncate">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Fire / Thermal</div>
                      <div className="font-semibold text-slate-200">
                        {fireSensor?.currentRawValue || 0} {fireSensor?.unit} ({zone.currentRiskScore.fireScore.toFixed(1)} pts)
                      </div>
                    </div>
                  </div>

                  {/* Gas */}
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Wind className={`w-4 h-4 ${(gasSensor?.currentNormalizedValue || 0) > 40 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                    <div className="truncate">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Gas Level</div>
                      <div className="font-semibold text-slate-200">
                        {gasSensor?.currentRawValue || 0} {gasSensor?.unit} ({zone.currentRiskScore.gasScore.toFixed(1)} pts)
                      </div>
                    </div>
                  </div>

                  {/* Water Leak */}
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Droplets className={`w-4 h-4 ${(waterSensor?.currentNormalizedValue || 0) > 40 ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div className="truncate">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Liquid / Water</div>
                      <div className="font-semibold text-slate-200">
                        {waterSensor?.currentRawValue || 0} {waterSensor?.unit} ({zone.currentRiskScore.waterScore.toFixed(1)} pts)
                      </div>
                    </div>
                  </div>

                  {/* Occupancy PIR */}
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Users className="w-4 h-4 text-purple-400" />
                    <div className="truncate">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Occupancy</div>
                      <div className="font-semibold text-slate-200">
                        {zone.occupantCount} Persons ({zone.currentRiskScore.occupancyScore.toFixed(1)} pts)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Score Progress Bar Breakdown */}
                <div className="space-y-1 my-2">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Fusion Formula Weights: F(0.4) + G(0.3) + W(0.2) + O(0.1)</span>
                    <span className="font-bold text-slate-300">{zone.currentState}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                    <div style={{ width: `${(zone.currentRiskScore.fireScore / 100) * 100}%` }} className="bg-red-500 h-full" title="Fire score" />
                    <div style={{ width: `${(zone.currentRiskScore.gasScore / 100) * 100}%` }} className="bg-amber-500 h-full" title="Gas score" />
                    <div style={{ width: `${(zone.currentRiskScore.waterScore / 100) * 100}%` }} className="bg-cyan-500 h-full" title="Water score" />
                    <div style={{ width: `${(zone.currentRiskScore.occupancyScore / 100) * 100}%` }} className="bg-purple-500 h-full" title="Occupancy score" />
                  </div>
                </div>

                {/* Actuator Quick Controls */}
                <div className="mt-3 bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Actuators:</span>
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {/* Buzzer */}
                    <button
                      onClick={() => onTriggerActuator(zone.id, 'buzzer', !zone.actuators.buzzer)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                        zone.actuators.buzzer
                          ? 'bg-red-900/90 text-red-200 border-red-700 animate-pulse'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Toggle Buzzer Alarm"
                    >
                      Buzzer {zone.actuators.buzzer ? 'ON' : 'OFF'}
                    </button>

                    {/* Strobe LED */}
                    <button
                      onClick={() => onTriggerActuator(zone.id, 'strobeLed', !zone.actuators.strobeLed)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                        zone.actuators.strobeLed
                          ? 'bg-amber-900/90 text-amber-200 border-amber-700'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Toggle Strobe LED Light"
                    >
                      LED {zone.actuators.strobeLed ? 'ON' : 'OFF'}
                    </button>

                    {/* Vent Relay */}
                    <button
                      onClick={() => onTriggerActuator(zone.id, 'ventilationRelay', !zone.actuators.ventilationRelay)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                        zone.actuators.ventilationRelay
                          ? 'bg-cyan-900/90 text-cyan-200 border-cyan-700'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Toggle Exhaust Fan Relay"
                    >
                      Fan {zone.actuators.ventilationRelay ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Updated {zone.lastUpdated}</span>
                
                <div className="flex space-x-2">
                  {/* Quick Anomaly Spike */}
                  <button
                    onClick={() => onInjectAnomaly(zone.id, 'gas', 950)}
                    className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[11px] font-medium transition-colors"
                  >
                    Simulate Gas Leak
                  </button>

                  <button
                    onClick={() => onSelectZone(zone)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center space-x-1"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Inspect Node</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
