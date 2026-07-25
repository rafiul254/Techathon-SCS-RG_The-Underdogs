import React, { useState, useEffect } from 'react';
import {
  Zone,
  Incident,
  User,
  RiskFusionWeights,
  RiskThresholds,
  SensorType,
} from './types';
import {
  INITIAL_ZONES,
  INITIAL_INCIDENTS,
  INITIAL_USERS,
} from './data/initialData';
import {
  calculateRiskScore,
  rankZonesByPriority,
  computeMLPrediction,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS,
} from './utils/riskCalculator';

import { Header } from './components/Header';
import { LiveZoneMap } from './components/LiveZoneMap';
import { PriorityQueue } from './components/PriorityQueue';
import { IncidentManager } from './components/IncidentManager';
import { SensorAnalytics } from './components/SensorAnalytics';
import { PredictedRiskPanel } from './components/PredictedRiskPanel';
import { ZoneActuatorControl } from './components/ZoneActuatorControl';
import { NodeSimulator } from './components/NodeSimulator';
import { AdminSettings } from './components/AdminSettings';
import { ApiDocsModal } from './components/ApiDocsModal';
import { AudioAlarm } from './components/AudioAlarm';
import { ErrorBoundary } from './components/ErrorBoundary';

import {
  LayoutGrid,
  ShieldAlert,
  FileText,
  Activity,
  Brain,
  Zap,
  Cpu,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [weights, setWeights] = useState<RiskFusionWeights>(DEFAULT_WEIGHTS);
  const [thresholds, setThresholds] = useState<RiskThresholds>(DEFAULT_THRESHOLDS);
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<
    'map' | 'priority' | 'incidents' | 'analytics' | 'ml' | 'actuators' | 'simulator' | 'admin'
  >('map');

  const [selectedZoneForAnalyticsId, setSelectedZoneForAnalyticsId] = useState<string>('z-1');
  const [isSimulating, setIsSimulating] = useState(true);
  const [audioMuted, setAudioMuted] = useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);

  // Fetch live sensor data from Express backend server
  const fetchLiveData = async () => {
    try {
      const [zonesRes, incsRes] = await Promise.all([
        fetch('/api/v1/zones'),
        fetch('/api/v1/incidents'),
      ]);
      
      if (!zonesRes.ok || !incsRes.ok) {
        throw new Error('Failed to fetch data from server');
      }
      
      const zJson = await zonesRes.json();
      const iJson = await incsRes.json();
      
      if (zJson.data) setZones(zJson.data);
      if (iJson.data) setIncidents(iJson.data);
      
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch live data:', err);
      setError('Unable to connect to server. Using cached data.');
      setIsLoading(false);
    }
  };

  // Poll live real sensor stream from server
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 1500);
    return () => clearInterval(interval);
  }, []);

  // Inject anomaly spike into a specific zone sensor via Real REST API
  const handleInjectAnomaly = async (zoneId: string, sensorType: SensorType, rawValue: number) => {
    try {
      await fetch('/api/v1/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zoneId,
          readings: [{ type: sensorType, rawValue }],
        }),
      });
      fetchLiveData();
    } catch (err) {
      console.error('Failed to post sensor reading', err);
    }
  };

  // Actuator Trigger Handler via Real REST API
  const handleTriggerActuator = async (zoneId: string, actuatorKey: string, newState: boolean) => {
    try {
      await fetch('/api/v1/actuators/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, actuator: actuatorKey, state: newState }),
      });
      fetchLiveData();
    } catch (err) {
      console.error('Failed to trigger actuator', err);
    }
  };

  // Acknowledge Incident Handler via Real REST API
  const handleAcknowledgeIncident = async (incidentId: string, notes: string) => {
    try {
      await fetch('/api/v1/incidents/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, user: currentUser, notes }),
      });
      fetchLiveData();
    } catch (err) {
      console.error('Failed to acknowledge incident', err);
    }
  };

  // Resolve Incident Handler via Real REST API
  const handleResolveIncident = async (incidentId: string, notes: string) => {
    try {
      await fetch('/api/v1/incidents/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, notes }),
      });
      fetchLiveData();
    } catch (err) {
      console.error('Failed to resolve incident', err);
    }
  };

  // Reset all zones to clean baseline via Real REST API
  const handleResetAllZones = async () => {
    try {
      await fetch('/api/v1/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'zero' }),
      });
      fetchLiveData();
    } catch (err) {
      console.error('Failed to reset zones', err);
    }
  };

  // Quick Inject Test Anomaly on first non-critical zone
  const handleQuickInjectSpike = () => {
    const target = zones.find((z) => z.currentState !== 'CRITICAL') || zones[0];
    handleInjectAnomaly(target.id, 'gas', 950);
  };

  const rankedZones = rankZonesByPriority(zones);
  const criticalCount = zones.filter((z) => z.currentState === 'CRITICAL').length;
  const warningCount = zones.filter((z) => z.currentState === 'WARNING').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Header Bar */}
      <Header
        currentUser={currentUser}
        users={INITIAL_USERS}
        onUserSwitch={setCurrentUser}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating(!isSimulating)}
        criticalCount={criticalCount}
        warningCount={warningCount}
        audioMuted={audioMuted}
        onToggleAudioMute={() => setAudioMuted(!audioMuted)}
        onOpenApiDocs={() => setIsApiDocsOpen(true)}
        onQuickInjectSpike={handleQuickInjectSpike}
      />

      {/* Primary Navigation Tabs */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 sticky top-14 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-1 overflow-x-auto py-2 text-xs">
          
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Live Grid Map</span>
          </button>

          <button
            onClick={() => setActiveTab('priority')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'priority'
                ? 'bg-red-950 text-red-300 border border-red-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Priority Queue ({criticalCount + warningCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'incidents'
                ? 'bg-amber-950 text-amber-300 border border-amber-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Incident Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Sensor Charts</span>
          </button>

          <button
            onClick={() => setActiveTab('ml')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'ml'
                ? 'bg-purple-950 text-purple-300 border border-purple-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Brain className="w-4 h-4 text-purple-400" />
            <span>ML Risk Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('actuators')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'actuators'
                ? 'bg-amber-950 text-amber-300 border border-amber-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Zone Actuators</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-blue-950 text-blue-300 border border-blue-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Edge Node Simulator</span>
          </button>

          {currentUser.role === 'Admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-slate-800 text-slate-100 border border-slate-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4 text-slate-300" />
              <span>Admin Config</span>
            </button>
          )}

        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <ErrorBoundary>
          {activeTab === 'map' && (
            <LiveZoneMap
              zones={zones}
              onSelectZone={(z) => {
                setSelectedZoneForAnalyticsId(z.id);
                setActiveTab('analytics');
              }}
              onTriggerActuator={handleTriggerActuator}
              onInjectAnomaly={handleInjectAnomaly}
            />
          )}

        {activeTab === 'priority' && (
          <PriorityQueue
            rankedZones={rankedZones}
            incidents={incidents}
            currentUser={currentUser}
            onAcknowledgeIncident={handleAcknowledgeIncident}
            onTriggerActuator={handleTriggerActuator}
            onSelectZone={(z) => {
              setSelectedZoneForAnalyticsId(z.id);
              setActiveTab('analytics');
            }}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentManager
            incidents={incidents}
            currentUser={currentUser}
            onAcknowledgeIncident={handleAcknowledgeIncident}
            onResolveIncident={handleResolveIncident}
          />
        )}

        {activeTab === 'analytics' && (
          <SensorAnalytics
            zones={zones}
            selectedZoneId={selectedZoneForAnalyticsId}
            onSelectZoneId={setSelectedZoneForAnalyticsId}
          />
        )}

        {activeTab === 'ml' && (
          <PredictedRiskPanel
            zones={zones}
            onSelectZone={(z) => {
              setSelectedZoneForAnalyticsId(z.id);
              setActiveTab('analytics');
            }}
          />
        )}

        {activeTab === 'actuators' && (
          <ZoneActuatorControl
            zones={zones}
            onTriggerActuator={handleTriggerActuator}
          />
        )}

        {activeTab === 'simulator' && (
          <NodeSimulator
            zones={zones}
            onRefreshData={fetchLiveData}
          />
        )}

        {activeTab === 'admin' && currentUser.role === 'Admin' && (
          <AdminSettings
            weights={weights}
            thresholds={thresholds}
            users={INITIAL_USERS}
            currentUser={currentUser}
            onUpdateWeights={async (newW) => {
              try {
                await fetch('/api/v1/config/weights', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ weights: newW }),
                });
                fetchLiveData();
              } catch (err) {
                console.error('Failed to update weights', err);
              }
            }}
            onUpdateThresholds={async (newT) => {
              try {
                await fetch('/api/v1/config/thresholds', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ thresholds: newT }),
                });
                fetchLiveData();
              } catch (err) {
                console.error('Failed to update thresholds', err);
              }
            }}
            onResetDefaults={() => {
              setWeights(DEFAULT_WEIGHTS);
              setThresholds(DEFAULT_THRESHOLDS);
              fetchLiveData();
            }}
          />
        )}
        </ErrorBoundary>
      </main>

      {/* Audio Emergency Alarm Generator */}
      <AudioAlarm
        hasCriticalZone={criticalCount > 0}
        isMuted={audioMuted}
        onToggleMute={() => setAudioMuted(!audioMuted)}
      />

      {/* REST API Docs Modal */}
      <ApiDocsModal
        isOpen={isApiDocsOpen}
        onClose={() => setIsApiDocsOpen(false)}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-slate-300 text-lg">Initializing RoboFusion SCS-RG...</p>
            <p className="text-slate-500 text-sm mt-2">Connecting to sensor grid</p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500/95 backdrop-blur-sm text-white px-4 py-3 z-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="hover:bg-amber-600 px-3 py-1 rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Footer Status Bar */}
      <footer className="bg-slate-900/80 border-t border-slate-800/80 text-slate-400 text-xs py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>RoboFusion SCS-RG</strong> • Multi-Hazard Smart Campus Safety & Response Grid System
          </div>
          <div className="flex items-center space-x-4">
            <span>Formula: W_fire(0.4) + W_gas(0.3) + W_water(0.2) + W_occ(0.1)</span>
            <span>WebSocket / MQTT HTTP Grid Sync: <strong className="text-emerald-400">Connected</strong></span>
          </div>
        </div>
      </footer>

    </div>
  );
}
