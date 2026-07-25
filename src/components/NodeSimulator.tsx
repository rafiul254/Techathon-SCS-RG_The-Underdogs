import React, { useState, useEffect, useRef } from 'react';
import { Zone, SensorType } from '../types';
import {
  Cpu,
  Flame,
  Wind,
  Droplets,
  Users,
  Send,
  RefreshCw,
  Terminal,
  Copy,
  Check,
  Radio,
  Code2,
  Server,
  Play,
  Square,
  Zap,
  Activity,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Network,
  Globe,
  Clock,
  Database,
  Layers,
} from 'lucide-react';

interface NodeSimulatorProps {
  zones: Zone[];
  onRefreshData?: () => void;
}

export const NodeSimulator: React.FC<NodeSimulatorProps> = ({ zones, onRefreshData }) => {
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id || 'z-1');
  const [fireVal, setFireVal] = useState(22);
  const [gasVal, setGasVal] = useState(45);
  const [waterVal, setWaterVal] = useState(8);
  const [occVal, setOccVal] = useState(4);
  const [apiResponseLog, setApiResponseLog] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [codeTab, setCodeTab] = useState<'curl' | 'python' | 'esp32' | 'node'>('curl');
  const [copied, setCopied] = useState(false);

  // Automated Simulation Streamer State
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [simIntervalMs, setSimIntervalMs] = useState(2000);
  const [simIncludeFluctuations, setSimIncludeFluctuations] = useState(true);
  const [packetsSentCount, setPacketsSentCount] = useState(0);
  const [packetsFailedCount, setPacketsFailedCount] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const autoSimRef = useRef<NodeJS.Timeout | null>(null);

  // Network Simulation State
  const [networkMode, setNetworkMode] = useState<'http' | 'websocket'>('http');
  const [simulatedLatencyMs, setSimulatedLatencyMs] = useState(0);
  const [packetLossRate, setPacketLossRate] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unstable'>('connected');
  const [connectionHistory, setConnectionHistory] = useState<{time: string, status: string, latency: number}[]>([]);

  // Authentication State
  const [useAuth, setUseAuth] = useState(false);
  const [jwtToken, setJwtToken] = useState('');
  const [authUser, setAuthUser] = useState('admin_dr_chen');

  // Batch Testing State
  const [batchMode, setBatchMode] = useState(false);
  const [selectedZonesForBatch, setSelectedZonesForBatch] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<{zoneId: string, success: boolean, latency: number}[]>([]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const apiEndpoint = `${baseUrl}/api/v1/sensor-data`;

  // Handle Real HTTP POST API call to server with network simulation
  const handleSendPayload = async (customZoneId?: string, customReadings?: { type: SensorType; rawValue: number }[]) => {
    setIsSending(true);
    const targetId = customZoneId || selectedZone.id;
    const targetZone = zones.find((z) => z.id === targetId || z.code === targetId) || selectedZone;

    const payload = {
      zoneId: targetZone.id,
      readings: customReadings || [
        { type: 'fire' as SensorType, rawValue: fireVal },
        { type: 'gas' as SensorType, rawValue: gasVal },
        { type: 'water' as SensorType, rawValue: waterVal },
        { type: 'pir' as SensorType, rawValue: occVal },
      ],
    };

    // Simulate packet loss
    if (Math.random() < packetLossRate / 100) {
      setPacketsFailedCount((prev) => prev + 1);
      setApiResponseLog(JSON.stringify({ 
        error: 'SIMULATED PACKET LOSS', 
        message: 'Network packet dropped (simulated)',
        packetLossRate: `${packetLossRate}%`
      }, null, 2));
      updateConnectionHistory('packet_loss', 0);
      setIsSending(false);
      return;
    }

    // Simulate network latency
    if (simulatedLatencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, simulatedLatencyMs));
    }

    const startTime = performance.now();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (useAuth && jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const res = await fetch('/api/v1/sensor-data', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const endTime = performance.now();
      const actualLatency = Math.round(endTime - startTime);

      setLastLatencyMs(actualLatency);
      setPacketsSentCount((prev) => prev + 1);
      setApiResponseLog(JSON.stringify(data, null, 2));
      updateConnectionHistory('success', actualLatency);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setPacketsFailedCount((prev) => prev + 1);
      setApiResponseLog(JSON.stringify({ error: err.message || 'Failed to connect to API' }, null, 2));
      updateConnectionHistory('error', 0);
    } finally {
      setIsSending(false);
    }
  };

  // Update connection history for monitoring
  const updateConnectionHistory = (status: string, latency: number) => {
    const now = new Date().toLocaleTimeString();
    setConnectionHistory(prev => {
      const newHistory = [{ time: now, status, latency }, ...prev].slice(0, 20);
      
      // Update connection status based on recent history
      const recentFailures = newHistory.slice(0, 5).filter(h => h.status !== 'success').length;
      if (recentFailures >= 3) {
        setConnectionStatus('disconnected');
      } else if (recentFailures >= 1) {
        setConnectionStatus('unstable');
      } else {
        setConnectionStatus('connected');
      }
      
      return newHistory;
    });
  };

  // Generate JWT token for simulation
  const generateJwtToken = () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
      user: authUser, 
      role: authUser.includes('admin') ? 'Admin' : 'Security Staff',
      exp: Date.now() + 3600000 
    }));
    const signature = btoa('simulated_signature_' + Math.random());
    setJwtToken(`${header}.${payload}.${signature}`);
  };

  // Batch multi-zone testing
  const handleBatchTest = async () => {
    if (selectedZonesForBatch.length === 0) return;
    
    setBatchMode(true);
    setBatchResults([]);
    
    for (let i = 0; i < selectedZonesForBatch.length; i++) {
      const zoneId = selectedZonesForBatch[i];
      const zone = zones.find(z => z.id === zoneId);
      if (!zone) continue;
      
      setBatchProgress(Math.round(((i + 1) / selectedZonesForBatch.length) * 100));
      
      const startTime = performance.now();
      try {
        const fireSensor = zone.sensors.find(s => s.type === 'fire');
        const gasSensor = zone.sensors.find(s => s.type === 'gas');
        const waterSensor = zone.sensors.find(s => s.type === 'water');
        const pirSensor = zone.sensors.find(s => s.type === 'pir');
        
        await handleSendPayload(zoneId, [
          { type: 'fire', rawValue: fireSensor?.currentRawValue || 25 + Math.random() * 10 },
          { type: 'gas', rawValue: gasSensor?.currentRawValue || 50 + Math.random() * 20 },
          { type: 'water', rawValue: waterSensor?.currentRawValue || 10 + Math.random() * 5 },
          { type: 'pir', rawValue: pirSensor?.currentRawValue || 3 + Math.floor(Math.random() * 5) },
        ]);
        
        const endTime = performance.now();
        setBatchResults(prev => [...prev, { zoneId, success: true, latency: Math.round(endTime - startTime) }]);
      } catch (err) {
        setBatchResults(prev => [...prev, { zoneId, success: false, latency: 0 }]);
      }
      
      // Small delay between zones
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setBatchMode(false);
    setBatchProgress(0);
  };

  // Automated Background Multi-Node Streamer Effect
  useEffect(() => {
    if (!isAutoSimulating) {
      if (autoSimRef.current) clearInterval(autoSimRef.current);
      return;
    }

    autoSimRef.current = setInterval(async () => {
      // Pick random zone or cycle through all zones
      const targetZone = zones[Math.floor(Math.random() * zones.length)];
      if (!targetZone) return;

      const fireSensor = targetZone.sensors.find((s) => s.type === 'fire');
      const gasSensor = targetZone.sensors.find((s) => s.type === 'gas');
      const waterSensor = targetZone.sensors.find((s) => s.type === 'water');
      const pirSensor = targetZone.sensors.find((s) => s.type === 'pir');

      const baseFire = fireSensor ? fireSensor.currentRawValue : 22;
      const baseGas = gasSensor ? gasSensor.currentRawValue : 40;
      const baseWater = waterSensor ? waterSensor.currentRawValue : 5;
      const baseOcc = pirSensor ? pirSensor.currentRawValue : 3;

      const noise = simIncludeFluctuations ? (Math.random() - 0.48) * 4 : 0;

      const newFire = Math.max(0, Math.round(baseFire + noise));
      const newGas = Math.max(0, Math.round(baseGas + noise * 5));
      const newWater = Math.max(0, Math.round(baseWater + noise));
      const newOcc = Math.max(0, Math.round(baseOcc + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0)));

      await handleSendPayload(targetZone.id, [
        { type: 'fire', rawValue: newFire },
        { type: 'gas', rawValue: newGas },
        { type: 'water', rawValue: newWater },
        { type: 'pir', rawValue: newOcc },
      ]);
    }, simIntervalMs);

    return () => {
      if (autoSimRef.current) clearInterval(autoSimRef.current);
    };
  }, [isAutoSimulating, simIntervalMs, simIncludeFluctuations, zones]);

  // Reset Server to Clean 0 Baseline for Real Sensors
  const handleResetToZero = async () => {
    try {
      const res = await fetch('/api/v1/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'zero' }),
      });
      const data = await res.json();
      setApiResponseLog(JSON.stringify(data, null, 2));
      setFireVal(0);
      setGasVal(0);
      setWaterVal(0);
      setOccVal(0);
      setPacketsSentCount(0);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setApiResponseLog(JSON.stringify({ error: 'Failed to reset server data' }, null, 2));
    }
  };

  // Immediate Scenario Preset Trigger
  const handleTriggerPreset = async (presetType: 'gas_leak' | 'thermal_spike' | 'pipe_burst' | 'mass_crowd' | 'ambient_safe') => {
    let targetId = selectedZone.id;
    let rFire = 22;
    let rGas = 40;
    let rWater = 5;
    let rOcc = 3;

    if (presetType === 'gas_leak') {
      const chemZone = zones.find((z) => z.code === 'CHEM-204') || selectedZone;
      targetId = chemZone.id;
      rGas = 950;
      rFire = 38;
      rWater = 10;
      rOcc = 8;
      setGasVal(950);
      setFireVal(38);
    } else if (presetType === 'thermal_spike') {
      const physZone = zones.find((z) => z.code === 'PHYS-102') || selectedZone;
      targetId = physZone.id;
      rFire = 125;
      rGas = 420;
      rWater = 0;
      rOcc = 2;
      setFireVal(125);
      setGasVal(420);
    } else if (presetType === 'pipe_burst') {
      const bioZone = zones.find((z) => z.code === 'BIO-301') || selectedZone;
      targetId = bioZone.id;
      rWater = 92;
      rGas = 35;
      rFire = 21;
      rOcc = 4;
      setWaterVal(92);
    } else if (presetType === 'mass_crowd') {
      const csZone = zones.find((z) => z.code === 'CS-101') || selectedZone;
      targetId = csZone.id;
      rOcc = 28;
      rGas = 320;
      rFire = 28;
      rWater = 2;
      setOccVal(28);
    } else if (presetType === 'ambient_safe') {
      await handleResetToZero();
      return;
    }

    await handleSendPayload(targetId, [
      { type: 'fire', rawValue: rFire },
      { type: 'gas', rawValue: rGas },
      { type: 'water', rawValue: rWater },
      { type: 'pir', rawValue: rOcc },
    ]);
  };

  // Code snippets generator
  const getCodeSnippet = () => {
    const zoneCode = selectedZone?.code || 'CHEM-204';
    if (codeTab === 'curl') {
      return `curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "zoneId": "${zoneCode}",
    "readings": [
      { "type": "fire", "rawValue": ${fireVal} },
      { "type": "gas", "rawValue": ${gasVal} },
      { "type": "water", "rawValue": ${waterVal} },
      { "type": "pir", "rawValue": ${occVal} }
    ]
  }'`;
    } else if (codeTab === 'python') {
      return `import requests

# Send real physical sensor data to SCS-RG API
url = "${apiEndpoint}"
payload = {
    "zoneId": "${zoneCode}",
    "readings": [
        {"type": "fire", "rawValue": ${fireVal}},
        {"type": "gas", "rawValue": ${gasVal}},
        {"type": "water", "rawValue": ${waterVal}},
        {"type": "pir", "rawValue": ${occVal}}
    ]
}

response = requests.post(url, json=payload)
print("Status Code:", response.status_code)
print("Server Response:", response.json())`;
    } else if (codeTab === 'esp32') {
      return `// ESP32 Arduino C++ Code for Real Sensor Stream
#include <WiFi.h>
#include <HTTPClient.h>

const char* serverUrl = "${apiEndpoint}";

void sendRealSensorReadings(float tempC, int gasPpm, float waterLvl, int motionCount) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String json = "{\\"zoneId\\":\\"${zoneCode}\\",\\"readings\\":[";
  json += "{\\"type\\":\\"fire\\",\\"rawValue\\":" + String(tempC) + "},";
  json += "{\\"type\\":\\"gas\\",\\"rawValue\\":" + String(gasPpm) + "},";
  json += "{\\"type\\":\\"water\\",\\"rawValue\\":" + String(waterLvl) + "},";
  json += "{\\"type\\":\\"pir\\",\\"rawValue\\":" + String(motionCount) + "}]}";

  int httpCode = http.POST(json);
  Serial.println("HTTP Code: " + String(httpCode));
  http.end();
}`;
    } else {
      return `// Node.js / Browser Fetch Integration
await fetch('${apiEndpoint}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    zoneId: '${zoneCode}',
    readings: [
      { type: 'fire', rawValue: ${fireVal} },
      { type: 'gas', rawValue: ${gasVal} },
      { type: 'water', rawValue: ${waterVal} },
      { type: 'pir', rawValue: ${occVal} }
    ]
  })
});`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Connection Status & Network Configuration Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg border transition-all ${
              connectionStatus === 'connected' ? 'bg-emerald-950 text-emerald-400 border-emerald-700' :
              connectionStatus === 'unstable' ? 'bg-amber-950 text-amber-400 border-amber-700' :
              'bg-rose-950 text-rose-400 border-rose-700'
            }`}>
              {connectionStatus === 'connected' ? <Wifi className="w-5 h-5" /> :
               connectionStatus === 'unstable' ? <Wifi className="w-5 h-5" /> :
               <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Connection Status</div>
              <div className={`text-[10px] font-mono uppercase ${
                connectionStatus === 'connected' ? 'text-emerald-400' :
                connectionStatus === 'unstable' ? 'text-amber-400' :
                'text-rose-400'
              }`}>
                {connectionStatus}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
            <span>Success: <strong className="text-emerald-400">{packetsSentCount}</strong></span>
            <span>|</span>
            <span>Failed: <strong className="text-rose-400">{packetsFailedCount}</strong></span>
            <span>|</span>
            <span>Rate: <strong className="text-cyan-400">{packetsSentCount > 0 ? ((packetsFailedCount / (packetsSentCount + packetsFailedCount)) * 100).toFixed(1) : 0}%</strong></span>
          </div>
        </div>

        {/* Network Configuration */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <Globe className="w-4 h-4 text-cyan-400" />
            <select
              value={networkMode}
              onChange={(e) => setNetworkMode(e.target.value as 'http' | 'websocket')}
              className="bg-transparent text-slate-200 font-medium focus:outline-none"
            >
              <option value="http">HTTP REST</option>
              <option value="websocket">WebSocket (Sim)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <input
              type="number"
              value={simulatedLatencyMs}
              onChange={(e) => setSimulatedLatencyMs(Number(e.target.value))}
              placeholder="Latency (ms)"
              className="w-20 bg-transparent text-slate-200 font-mono focus:outline-none"
              min="0"
              max="5000"
            />
            <span className="text-slate-500">ms</span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <Network className="w-4 h-4 text-rose-400" />
            <input
              type="number"
              value={packetLossRate}
              onChange={(e) => setPacketLossRate(Number(e.target.value))}
              placeholder="Loss %"
              className="w-16 bg-transparent text-slate-200 font-mono focus:outline-none"
              min="0"
              max="100"
            />
            <span className="text-slate-500">% loss</span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
            {useAuth ? <Lock className="w-4 h-4 text-emerald-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
            <button
              onClick={() => setUseAuth(!useAuth)}
              className={`text-xs font-medium ${useAuth ? 'text-emerald-400' : 'text-slate-400'}`}
            >
              {useAuth ? 'Auth Enabled' : 'Auth Disabled'}
            </button>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <Database className="w-4 h-4 text-purple-400" />
            <button
              onClick={() => setConnectionHistory([])}
              className="text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Clear History
            </button>
          </div>
        </div>

        {/* Authentication Panel */}
        {useAuth && (
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>JWT Authentication Simulation</span>
              </span>
              <button
                onClick={generateJwtToken}
                className="px-2 py-1 bg-emerald-900/50 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 rounded text-[10px] font-semibold"
              >
                Generate New Token
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={authUser}
                onChange={(e) => setAuthUser(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="admin_dr_chen">Dr. Elena Chen (Admin)</option>
                <option value="sec_chief_marcus">Marcus Vance (Security Staff)</option>
                <option value="sec_officer_sarah">Sarah Connor (Security Staff)</option>
              </select>
              <input
                type="text"
                value={jwtToken}
                readOnly
                placeholder="Click 'Generate New Token' to create JWT"
                className="bg-slate-900 border border-slate-800 rounded p-1.5 text-[10px] text-slate-400 font-mono focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Top Controller Bar: Live Ingestion & Automated Multi-Node Streamer Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-cyan-900/60 shadow-inner">
          
          <div className="flex items-center space-x-3">
            <div
              className={`p-3 rounded-xl border transition-all ${
                isAutoSimulating
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700 animate-pulse'
                  : 'bg-slate-900 text-cyan-400 border-slate-800'
              }`}
            >
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-slate-100 uppercase tracking-wider">
                  Live Campus IoT Network Simulator
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isAutoSimulating
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isAutoSimulating ? 'STREAMING ACTIVE' : 'MANUAL INGESTION READY'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                API Endpoint: <strong className="text-cyan-300 select-all">{apiEndpoint}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Automated Streamer Toggle */}
            <button
              onClick={() => setIsAutoSimulating(!isAutoSimulating)}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all shadow-md ${
                isAutoSimulating
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
              }`}
            >
              {isAutoSimulating ? (
                <>
                  <Square className="w-4 h-4 fill-white" />
                  <span>Pause Background Streamer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Automated Multi-Node Streamer</span>
                </>
              )}
            </button>

            <button
              onClick={handleResetToZero}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset All Sensors to 0</span>
            </button>
          </div>
        </div>

        {/* Live Streaming Controller Settings & Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              Packet Interval
            </span>
            <select
              value={simIntervalMs}
              onChange={(e) => setSimIntervalMs(Number(e.target.value))}
              disabled={isAutoSimulating}
              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-cyan-300 font-mono focus:outline-none disabled:opacity-50"
            >
              <option value={1000}>1.0s (Fast Stream)</option>
              <option value={2000}>2.0s (Normal Stream)</option>
              <option value={5000}>5.0s (Low Power)</option>
            </select>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Sensor Fluctuations</span>
            <label className="flex items-center space-x-2 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={simIncludeFluctuations}
                onChange={(e) => setSimIncludeFluctuations(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
              />
              <span className="text-slate-200 font-medium">Add Thermal/Gas Noise</span>
            </label>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Packets Ingested
            </span>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              {packetsSentCount} <span className="text-[10px] font-normal text-slate-500">/ {packetsFailedCount} failed</span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              API Response Latency
            </span>
            <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">
              {lastLatencyMs !== null ? `${lastLatencyMs} ms` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Multi-Zone Testing Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold uppercase text-purple-400 flex items-center space-x-1.5">
            <Layers className="w-4 h-4" />
            <span>Batch Multi-Zone Testing</span>
          </h3>
          <span className="text-[10px] text-slate-500">
            Test multiple zones simultaneously
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Select Zones for Batch Test:</label>
            <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
              {zones.map(zone => (
                <label key={zone.id} className="flex items-center space-x-2 text-xs p-1.5 rounded hover:bg-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedZonesForBatch.includes(zone.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedZonesForBatch([...selectedZonesForBatch, zone.id]);
                      } else {
                        setSelectedZonesForBatch(selectedZonesForBatch.filter(id => id !== zone.id));
                      }
                    }}
                    className="rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-0"
                  />
                  <span className="text-slate-300">{zone.name} ({zone.code})</span>
                  <span className={`ml-auto font-mono ${
                    zone.currentState === 'CRITICAL' ? 'text-rose-400' :
                    zone.currentState === 'WARNING' ? 'text-amber-400' :
                    'text-emerald-400'
                  }`}>
                    {zone.currentState}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Batch Test Results:</label>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 min-h-24 max-h-32 overflow-y-auto">
              {batchMode ? (
                <div className="text-center py-4">
                  <div className="text-xs text-cyan-400 font-bold mb-1">Testing in progress...</div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div 
                      className="bg-cyan-500 h-2 rounded-full transition-all" 
                      style={{ width: `${batchProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{batchProgress}% complete</div>
                </div>
              ) : batchResults.length > 0 ? (
                <div className="space-y-1">
                  {batchResults.map((result, idx) => {
                    const zone = zones.find(z => z.id === result.zoneId);
                    return (
                      <div key={idx} className="flex items-center justify-between text-[10px] p-1 rounded bg-slate-900">
                        <span className="text-slate-300">{zone?.code || result.zoneId}</span>
                        <div className="flex items-center space-x-2">
                          <span className={result.success ? 'text-emerald-400' : 'text-rose-400'}>
                            {result.success ? '✓' : '✗'}
                          </span>
                          <span className="text-slate-500 font-mono">{result.latency}ms</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 text-center py-4">
                  No batch test results yet
                </div>
              )}
            </div>
            <button
              onClick={handleBatchTest}
              disabled={batchMode || selectedZonesForBatch.length === 0}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Run Batch Test ({selectedZonesForBatch.length} zones)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Hazard Scenarios Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold uppercase text-amber-400 flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>1-Click Multi-Hazard Emergency Scenario Injectors</span>
          </h3>
          <span className="text-[10px] text-slate-500">
            Triggers Real Fusion Rules & Actuator Relays
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Gas Leak */}
          <button
            onClick={() => handleTriggerPreset('gas_leak')}
            className="p-3 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/80 text-amber-200 rounded-xl font-semibold text-left transition-all hover:scale-[1.02] shadow-md flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-300">☣️ Gas Leak Spike</span>
              <Wind className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-[11px] text-amber-300/80">
              CHEM-204: 950 PPM Combustible Gas Spike
            </p>
            <span className="text-[10px] bg-amber-900/80 text-amber-200 px-2 py-0.5 rounded font-mono w-fit">
              Triggers Air Exhaust Relay
            </span>
          </button>

          {/* Thermal Spike */}
          <button
            onClick={() => handleTriggerPreset('thermal_spike')}
            className="p-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-200 rounded-xl font-semibold text-left transition-all hover:scale-[1.02] shadow-md flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-rose-300">💥 Thermal Runaway</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-[11px] text-rose-300/80">
              PHYS-102: 125°C Thermal Sensor Spike
            </p>
            <span className="text-[10px] bg-rose-900/80 text-rose-200 px-2 py-0.5 rounded font-mono w-fit">
              Triggers Strobe & Buzzer
            </span>
          </button>

          {/* Pipe Burst */}
          <button
            onClick={() => handleTriggerPreset('pipe_burst')}
            className="p-3 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/80 text-cyan-200 rounded-xl font-semibold text-left transition-all hover:scale-[1.02] shadow-md flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-cyan-300">🌊 Liquid Overflow</span>
              <Droplets className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-[11px] text-cyan-300/80">
              BIO-301: 92% Flood Level Breach
            </p>
            <span className="text-[10px] bg-cyan-900/80 text-cyan-200 px-2 py-0.5 rounded font-mono w-fit">
              Triggers Flood Alert
            </span>
          </button>

          {/* Mass Crowd */}
          <button
            onClick={() => handleTriggerPreset('mass_crowd')}
            className="p-3 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/80 text-purple-200 rounded-xl font-semibold text-left transition-all hover:scale-[1.02] shadow-md flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-purple-300">👥 Mass Overcrowd</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-[11px] text-purple-300/80">
              CS-101: 28 Occupants Capacity Risk
            </p>
            <span className="text-[10px] bg-purple-900/80 text-purple-200 px-2 py-0.5 rounded font-mono w-fit">
              Triggers Evac Warning
            </span>
          </button>

          {/* Ambient Safe */}
          <button
            onClick={() => handleTriggerPreset('ambient_safe')}
            className="p-3 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/80 text-emerald-200 rounded-xl font-semibold text-left transition-all hover:scale-[1.02] shadow-md flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-300">🛡️ Safe Ambient</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-emerald-300/80">
              Reset All Nodes to 0 / Safe Baseline
            </p>
            <span className="text-[10px] bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded font-mono w-fit">
              Normal Operations
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Direct API Payload Tester */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase text-cyan-400 flex items-center space-x-1.5">
              <Server className="w-4 h-4" />
              <span>Direct Node Sensor Payload Tester</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              POST /api/v1/sensor-data
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Target Zone Edge Node:
            </label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.code}) — Status: {z.currentState} ({z.currentRiskScore.totalScore.toFixed(1)} pts)
                </option>
              ))}
            </select>
          </div>

          {/* Sliders */}
          <div className="space-y-3.5 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs">
            {/* Fire */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center space-x-1 font-semibold">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>Thermal Sensor (°C):</span>
                </span>
                <strong className="text-red-400 font-mono text-sm">{fireVal} °C</strong>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                value={fireVal}
                onChange={(e) => setFireVal(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            {/* Gas */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center space-x-1 font-semibold">
                  <Wind className="w-3.5 h-3.5 text-amber-400" />
                  <span>Combustible Gas (PPM):</span>
                </span>
                <strong className="text-amber-400 font-mono text-sm">{gasVal} PPM</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                value={gasVal}
                onChange={(e) => setGasVal(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Water */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center space-x-1 font-semibold">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Liquid Level (%):</span>
                </span>
                <strong className="text-cyan-400 font-mono text-sm">{waterVal} %</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={waterVal}
                onChange={(e) => setWaterVal(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* PIR */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="flex items-center space-x-1 font-semibold">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>PIR Occupancy (Persons):</span>
                </span>
                <strong className="text-purple-400 font-mono text-sm">{occVal} Persons</strong>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={occVal}
                onChange={(e) => setOccVal(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleSendPayload()}
              disabled={isSending}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center space-x-2 text-xs mt-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Transmitting to Server...' : 'POST Sensor Packet to Live Server'}</span>
            </button>
          </div>
        </div>

        {/* Right: Copyable Hardware/Client Code & API Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase text-slate-300 flex items-center space-x-1.5">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Physical Hardware & API Code Snippets</span>
              </h3>

              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Code Tabs */}
            <div className="flex items-center space-x-1 mt-2.5 text-[11px] font-bold">
              {(['curl', 'python', 'esp32', 'node'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCodeTab(tab)}
                  className={`px-3 py-1 rounded-t-lg border-t border-x uppercase tracking-wider ${
                    codeTab === tab
                      ? 'bg-slate-950 text-cyan-400 border-slate-800'
                      : 'bg-slate-900 text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  {tab === 'esp32' ? 'ESP32 / Arduino' : tab}
                </button>
              ))}
            </div>

            <pre className="bg-slate-950 p-3.5 rounded-b-xl rounded-tr-xl border border-slate-800 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-52 select-all">
              {getCodeSnippet()}
            </pre>
          </div>

          {/* Response Console Log */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1 text-cyan-400 font-bold">
                <Terminal className="w-3.5 h-3.5" />
                <span>Live API Response Log</span>
              </span>
              <span className="text-[10px] text-slate-500">POST /api/v1/sensor-data</span>
            </div>

            <pre className="text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-[11px] max-h-36 overflow-y-auto">
              {apiResponseLog || `// Waiting for incoming sensor packets...\n// Click "Start Automated Multi-Node Streamer" or trigger a scenario above.`}
            </pre>
          </div>

          {/* Connection History Monitor */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-400 text-[11px]">
              <span className="flex items-center space-x-1 text-purple-400 font-bold">
                <Activity className="w-3.5 h-3.5" />
                <span>Connection History Monitor</span>
              </span>
              <span className="text-[10px] text-slate-500">Last 20 requests</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 max-h-32 overflow-y-auto">
              {connectionHistory.length > 0 ? (
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left pb-1">Time</th>
                      <th className="text-left pb-1">Status</th>
                      <th className="text-right pb-1">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connectionHistory.map((entry, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50">
                        <td className="py-1 text-slate-400">{entry.time}</td>
                        <td className={`py-1 ${
                          entry.status === 'success' ? 'text-emerald-400' :
                          entry.status === 'packet_loss' ? 'text-amber-400' :
                          'text-rose-400'
                        }`}>
                          {entry.status}
                        </td>
                        <td className="py-1 text-right text-slate-300">{entry.latency}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-[10px] text-slate-500 text-center py-4">
                  No connection history yet
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
