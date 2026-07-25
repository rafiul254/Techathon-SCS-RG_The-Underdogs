import React from 'react';
import { Zone } from '../types';
import { Zap, Volume2, Lightbulb, Wind, Lock, Radio, Check, X, Terminal } from 'lucide-react';

interface ZoneActuatorControlProps {
  zones: Zone[];
  onTriggerActuator: (zoneId: string, actuatorKey: string, newState: boolean) => void;
}

export const ZoneActuatorControl: React.FC<ZoneActuatorControlProps> = ({
  zones,
  onTriggerActuator,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-950/80 border border-amber-800 rounded-lg text-amber-300">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Zone Hardware Actuator Remote Control
            </h2>
            <p className="text-xs text-slate-400">
              Bi-directional hardware command interface for Buzzers, Strobe LEDs, Exhaust Relays & Lockouts
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-cyan-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          Edge Nodes: Active
        </span>
      </div>

      {/* Actuator Control Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zones.map((zone) => {
          const { actuators } = zone;

          return (
            <div
              key={zone.id}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm"
            >
              {/* Zone Title */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{zone.name}</h3>
                  <p className="text-xs text-slate-400">
                    {zone.code} • {zone.building}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                    zone.currentState === 'CRITICAL'
                      ? 'bg-red-950 text-red-300 border-red-700'
                      : zone.currentState === 'WARNING'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}
                >
                  {zone.currentState} ({zone.currentRiskScore.totalScore.toFixed(1)})
                </span>
              </div>

              {/* Actuator Controls Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Alarm Buzzer */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2
                      className={`w-4 h-4 ${
                        actuators.buzzer ? 'text-red-400 animate-pulse' : 'text-slate-500'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Piezo Buzzer</div>
                      <div className="text-[10px] text-slate-500">85dB Sounder</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onTriggerActuator(zone.id, 'buzzer', !actuators.buzzer)}
                    className={`px-3 py-1 rounded font-bold transition-colors ${
                      actuators.buzzer
                        ? 'bg-red-700 text-white shadow animate-pulse'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {actuators.buzzer ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Strobe LED */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lightbulb
                      className={`w-4 h-4 ${
                        actuators.strobeLed ? 'text-amber-400 animate-bounce' : 'text-slate-500'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Strobe LED</div>
                      <div className="text-[10px] text-slate-500">Flashing Visual</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onTriggerActuator(zone.id, 'strobeLed', !actuators.strobeLed)}
                    className={`px-3 py-1 rounded font-bold transition-colors ${
                      actuators.strobeLed
                        ? 'bg-amber-700 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {actuators.strobeLed ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Ventilation Relay */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wind
                      className={`w-4 h-4 ${
                        actuators.ventilationRelay ? 'text-cyan-400 animate-spin' : 'text-slate-500'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Exhaust Fan</div>
                      <div className="text-[10px] text-slate-500">Gas Purge Relay</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onTriggerActuator(zone.id, 'ventilationRelay', !actuators.ventilationRelay)}
                    className={`px-3 py-1 rounded font-bold transition-colors ${
                      actuators.ventilationRelay
                        ? 'bg-cyan-700 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {actuators.ventilationRelay ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Sprinkler Lockout */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock
                      className={`w-4 h-4 ${
                        actuators.sprinklerLockout ? 'text-purple-400' : 'text-slate-500'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Valve Lockout</div>
                      <div className="text-[10px] text-slate-500">Chemical Safety</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onTriggerActuator(zone.id, 'sprinklerLockout', !actuators.sprinklerLockout)}
                    className={`px-3 py-1 rounded font-bold transition-colors ${
                      actuators.sprinklerLockout
                        ? 'bg-purple-700 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {actuators.sprinklerLockout ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* Status Footer */}
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                <span>Last command: {actuators.lastCommandTimestamp || 'Nominal'}</span>
                {actuators.autoTriggered && (
                  <span className="text-amber-400 font-semibold">Auto-Triggered by Risk Formula</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
