import { initDB } from './src/database/db.js';

await initDB();
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { INITIAL_ZONES, INITIAL_INCIDENTS, INITIAL_USERS } from './src/data/initialData';
import { calculateRiskScore, computeMLPrediction, DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS } from './src/utils/riskCalculator';
import { Zone, Incident, SensorType, RiskFusionWeights, RiskThresholds } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');
const NODE_ENV = 'development';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database interface
interface Database {
  zones: Zone[];
  incidents: Incident[];
  weights: RiskFusionWeights;
  thresholds: RiskThresholds;
  users: any[];
  metadata: {
    version: string;
    lastUpdated: string | null;
    description: string;
  };
}

// Load database from JSON file
function loadDatabase(): Database {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const db = JSON.parse(data);
      console.log('Database loaded from file');
      // Update metadata
      db.metadata.lastUpdated = new Date().toISOString();
      return db;
    } else {
      console.log('Database file not found, creating new one');
      // Initialize with default data
      const initialDB: Database = {
        zones: JSON.parse(JSON.stringify(INITIAL_ZONES)),
        incidents: JSON.parse(JSON.stringify(INITIAL_INCIDENTS)),
        weights: { ...DEFAULT_WEIGHTS },
        thresholds: { ...DEFAULT_THRESHOLDS },
        users: INITIAL_USERS,
        metadata: {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          description: 'RoboFusion SCS-RG JSON Database'
        }
      };
      saveDatabase(initialDB);
      return initialDB;
    }
  } catch (error) {
    console.error('Error loading database:', error);
    // Return empty database on error
    return {
      zones: [],
      incidents: [],
      weights: { ...DEFAULT_WEIGHTS },
      thresholds: { ...DEFAULT_THRESHOLDS },
      users: INITIAL_USERS,
      metadata: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        description: 'RoboFusion SCS-RG JSON Database'
      }
    };
  }
}

// Save database to JSON file
function saveDatabase(db: Database): void {
  try {
    db.metadata.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// In-Memory Database State (loaded from JSON)
let zonesDB: Zone[] = [];
let incidentsDB: Incident[] = [];
let weightsDB: RiskFusionWeights = { ...DEFAULT_WEIGHTS };
let thresholdsDB: RiskThresholds = { ...DEFAULT_THRESHOLDS };

// Initialize database on startup
const db = loadDatabase();
zonesDB = db.zones.length > 0 ? db.zones : JSON.parse(JSON.stringify(INITIAL_ZONES));
incidentsDB = db.incidents;
weightsDB = db.weights;
thresholdsDB = db.thresholds;
console.log('Database initialized successfully');

// Helper to recalculate zone risk
function updateZoneState(zone: Zone): Zone {
  const riskBreakdown = calculateRiskScore(zone.sensors, weightsDB, thresholdsDB);
  const mlPred = computeMLPrediction(zone.sensors, riskBreakdown.totalScore, zone.occupantCount);

  let updatedActuators = { ...zone.actuators };
  let newIncidentCreated: Incident | null = null;

  if (riskBreakdown.state === 'CRITICAL' && !zone.actuators.buzzer) {
    updatedActuators = {
      ...updatedActuators,
      buzzer: true,
      strobeLed: true,
      ventilationRelay: true,
      autoTriggered: true,
      lastCommandTimestamp: new Date().toLocaleTimeString(),
    };
  }

  // Auto-generate incident if entering critical state and no active incident exists
  if (riskBreakdown.state === 'CRITICAL') {
    const existingActive = incidentsDB.find(
      (inc) => inc.zoneId === zone.id && inc.status !== 'resolved'
    );

    if (!existingActive) {
      newIncidentCreated = {
        id: `inc-${Math.floor(1000 + Math.random() * 9000)}`,
        zoneId: zone.id,
        zoneName: zone.name,
        zoneCode: zone.code,
        startTime: new Date().toISOString(),
        status: 'active',
        triggerReason: `Real sensor telemetry breached critical threshold (${riskBreakdown.totalScore.toFixed(1)} pts)`,
        maxRiskScore: riskBreakdown.totalScore,
      };
      incidentsDB = [newIncidentCreated, ...incidentsDB];
    }
  }

  return {
    ...zone,
    currentState: riskBreakdown.state,
    currentRiskScore: riskBreakdown,
    actuators: updatedActuators,
    mlPrediction: mlPred,
    lastUpdated: new Date().toLocaleTimeString(),
  };
}

// REST API ROUTES
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'online',
    mode: 'Real Physical Sensor Telemetry Engine',
    uptime: process.uptime(),
    zonesCount: zonesDB.length,
    activeIncidents: incidentsDB.filter((i) => i.status !== 'resolved').length,
  });
});

// GET all zones with real sensor readings
app.get('/api/v1/zones', (_req, res) => {
  res.json({
    success: true,
    data: zonesDB,
    timestamp: new Date().toISOString(),
  });
});

// GET single zone
app.get('/api/v1/zones/:id', (req, res) => {
  const zone = zonesDB.find((z) => z.id === req.params.id || z.code.toLowerCase() === req.params.id.toLowerCase());
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }
  res.json({ success: true, data: zone });
});

// GET incidents
app.get('/api/v1/incidents', (_req, res) => {
  res.json({ success: true, data: incidentsDB });
});

// GET weights and thresholds
app.get('/api/v1/config', (_req, res) => {
  res.json({
    success: true,
    data: {
      weights: weightsDB,
      thresholds: thresholdsDB,
    },
  });
});

// POST update weights
app.post('/api/v1/config/weights', (req, res) => {
  const { weights } = req.body;
  if (!weights) {
    return res.status(400).json({ success: false, error: 'Missing weights data' });
  }

  // Validate weights
  const requiredWeights = ['W_fire', 'W_gas', 'W_water', 'W_occ'];
  for (const key of requiredWeights) {
    if (typeof weights[key] !== 'number' || weights[key] < 0 || weights[key] > 1) {
      return res.status(400).json({
        success: false,
        error: `Invalid weight value for ${key}. Must be a number between 0 and 1.`
      });
    }
  }

  const weightValues = Object.values(weights) as number[];
  const sum = weightValues.reduce((acc: number, val: number) => acc + val, 0);
  if (Math.abs(sum - 1.0) > 0.01) {
   	return res.status(400).json({
      success: false,
      error: `Weights must sum to 1.0. Current sum: ${sum.toFixed(2)}`
    });
  }

  weightsDB = weights as RiskFusionWeights;

  // Recalculate all zone risk scores with new weights
  zonesDB = zonesDB.map(zone => updateZoneState(zone));

  // Save to JSON database
  saveDatabase({
    zones: zonesDB,
    incidents: incidentsDB,
    weights: weightsDB,
    thresholds: thresholdsDB,
    users: INITIAL_USERS,
    metadata: {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      description: 'RoboFusion SCS-RG JSON Database'
    }
  });

  res.json({ success: true, weights: weightsDB });
});

// POST update thresholds
app.post('/api/v1/config/thresholds', (req, res) => {
  const { thresholds } = req.body;
  if (!thresholds) {
    return res.status(400).json({ success: false, error: 'Missing thresholds data' });
  }

  // Validate thresholds
  if (typeof thresholds.safeUpperLimit !== 'number' || thresholds.safeUpperLimit < 0 || thresholds.safeUpperLimit > 100) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid safeUpperLimit. Must be a number between 0 and 100.' 
    });
  }

  if (typeof thresholds.warningUpperLimit !== 'number' || thresholds.warningUpperLimit < 0 || thresholds.warningUpperLimit > 100) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid warningUpperLimit. Must be a number between 0 and 100.' 
    });
  }

  if (thresholds.safeUpperLimit >= thresholds.warningUpperLimit) {
    return res.status(400).json({ 
      success: false, 
      error: 'safeUpperLimit must be less than warningUpperLimit.' 
    });
  }

  thresholdsDB = thresholds as RiskThresholds;

  // Recalculate all zone risk scores with new thresholds
  zonesDB = zonesDB.map(zone => updateZoneState(zone));

  // Save to JSON database
  saveDatabase({
    zones: zonesDB,
    incidents: incidentsDB,
    weights: weightsDB,
    thresholds: thresholdsDB,
    users: INITIAL_USERS,
    metadata: {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      description: 'RoboFusion SCS-RG JSON Database'
    }
  });

  res.json({ success: true, thresholds: thresholdsDB });
});

// POST Real Sensor Data Telemetry Packet (supports ESP32, Python, cURL, IoT Edge Gateways)
app.post('/api/v1/sensor-data', (req, res) => {
  const { zone_id, zoneId, code, readings, sensor_type, sensorType, raw_value, rawValue, normalizedValue } = req.body;

  const targetZoneId = zoneId || zone_id || code;
  if (!targetZoneId) {
    return res.status(400).json({
      success: false,
      error: 'Missing zone identification (specify zoneId, zone_id, or code e.g. "z-1" or "CHEM-204")',
    });
  }

  let zoneIndex = zonesDB.findIndex(
    (z) => z.id === targetZoneId || z.code.toLowerCase() === targetZoneId.toLowerCase()
  );

  if (zoneIndex === -1) {
    return res.status(404).json({
      success: false,
      error: `Zone '${targetZoneId}' not found. Available zones: ${zonesDB.map((z) => `${z.id} (${z.code})`).join(', ')}`,
    });
  }

  let targetZone = zonesDB[zoneIndex];

  // Parse readings: support array or single reading payload
  const incomingReadings: { type: SensorType; rawValue: number; normalizedValue?: number }[] = [];
  const validSensorTypes: SensorType[] = ['fire', 'gas', 'water', 'pir'];

  if (Array.isArray(readings)) {
    readings.forEach((r) => {
      const type = (r.sensor_type || r.type || r.sensorType) as SensorType;
      const raw = Number(r.raw_value ?? r.rawValue ?? 0);
      const norm = r.normalizedValue !== undefined ? Number(r.normalizedValue) : undefined;
      
      // Validate sensor type
      if (!type || !validSensorTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid sensor type: ${type}. Valid types: ${validSensorTypes.join(', ')}`,
        });
      }
      
      // Validate raw value
      if (isNaN(raw) || raw < 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid raw value for sensor ${type}: ${raw}. Must be a non-negative number.`,
        });
      }
      
      if (type) incomingReadings.push({ type, rawValue: raw, normalizedValue: norm });
    });
  } else if (sensor_type || sensorType) {
    const type = (sensor_type || sensorType) as SensorType;
    const raw = Number(raw_value ?? rawValue ?? 0);
    const norm = normalizedValue !== undefined ? Number(normalizedValue) : undefined;
    
    // Validate sensor type
    if (!type || !validSensorTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid sensor type: ${type}. Valid types: ${validSensorTypes.join(', ')}`,
      });
    }
    
    // Validate raw value
    if (isNaN(raw) || raw < 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid raw value for sensor ${type}: ${raw}. Must be a non-negative number.`,
      });
    }
    
    incomingReadings.push({ type, rawValue: raw, normalizedValue: norm });
  } else {
    return res.status(400).json({
      success: false,
      error: 'Invalid payload format. Provide "readings": [{ "type": "gas", "rawValue": 450 }] or "sensorType": "gas", "rawValue": 450',
    });
  }

  if (incomingReadings.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid sensor readings provided.',
    });
  }

  // Apply new real sensor readings to target zone
  const updatedSensors = targetZone.sensors.map((sensor) => {
    const match = incomingReadings.find((r) => r.type === sensor.type);
    if (!match) return sensor;

    const raw = match.rawValue;
    // Calculate normalized value (0-100) if not explicitly provided
    let norm = match.normalizedValue;
    if (norm === undefined) {
      const range = sensor.maxValue - sensor.minValue;
      norm = range > 0 ? Math.min(100, Math.max(0, ((raw - sensor.minValue) / range) * 100)) : 0;
    }
    norm = Math.round(norm * 10) / 10;

    const newHistory = [
      ...sensor.history.slice(1),
      {
        timestamp: new Date().toLocaleTimeString(),
        rawValue: raw,
        normalizedValue: norm,
      },
    ];

    return {
      ...sensor,
      currentRawValue: raw,
      currentNormalizedValue: norm,
      history: newHistory,
    };
  });

  targetZone.sensors = updatedSensors;
  zonesDB[zoneIndex] = updateZoneState(targetZone);
  
  // Save to JSON database
  saveDatabase({
    zones: zonesDB,
    incidents: incidentsDB,
    weights: weightsDB,
    thresholds: thresholdsDB,
    users: INITIAL_USERS,
    metadata: {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      description: 'RoboFusion SCS-RG JSON Database'
    }
  });

  return res.json({
    success: true,
    message: `Received real telemetry for ${targetZone.name} (${targetZone.code})`,
    zone: zonesDB[zoneIndex],
    receivedReadings: incomingReadings,
  });
});

// POST Acknowledge Incident
app.post('/api/v1/incidents/acknowledge', (req, res) => {
  const { incidentId, user, notes } = req.body;
  
  // Validate incidentId
  if (!incidentId || typeof incidentId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid or missing incidentId' });
  }
  
  const incident = incidentsDB.find((i) => i.id === incidentId);
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }

  if (incident.status === 'resolved') {
    return res.status(400).json({ success: false, error: 'Cannot acknowledge a resolved incident' });
  }

  incident.status = 'acknowledged';
  incident.acknowledgedBy = user || INITIAL_USERS[0];
  incident.acknowledgedAt = new Date().toISOString();
  if (notes && typeof notes === 'string') incident.resolutionNotes = notes;

  // Save to JSON database
  saveDatabase({
    zones: zonesDB,
    incidents: incidentsDB,
    weights: weightsDB,
    thresholds: thresholdsDB,
    users: INITIAL_USERS,
    metadata: {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      description: 'RoboFusion SCS-RG JSON Database'
    }
  });

  res.json({ success: true, incident });
});

// POST Resolve Incident
app.post('/api/v1/incidents/resolve', (req, res) => {
  const { incidentId, notes } = req.body;
  
  // Validate incidentId
  if (!incidentId || typeof incidentId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid or missing incidentId' });
  }
  
  const incident = incidentsDB.find((i) => i.id === incidentId);
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }

  if (incident.status === 'resolved') {
    return res.status(400).json({ success: false, error: 'Incident is already resolved' });
  }

  incident.status = 'resolved';
  incident.endTime = new Date().toISOString();
  if (notes && typeof notes === 'string') incident.resolutionNotes = notes;

  // Save to JSON database
  saveDatabase({
    zones: zonesDB,
    incidents: incidentsDB,
    weights: weightsDB,
    thresholds: thresholdsDB,
    users: INITIAL_USERS,
    metadata: {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      description: 'RoboFusion SCS-RG JSON Database'
    }
  });

  res.json({ success: true, incident });
});

// POST Actuators Manual Override
app.post('/api/v1/actuators/control', (req, res) => {
  const { zoneId, actuator, state } = req.body;
  
  // Validate inputs
  if (!zoneId || typeof zoneId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid or missing zoneId' });
  }
  
  if (!actuator || typeof actuator !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid or missing actuator' });
  }
  
  if (typeof state !== 'boolean') {
    return res.status(400).json({ success: false, error: 'Invalid state value. Must be boolean.' });
  }
  
  const validActuators = ['buzzer', 'strobeLed', 'ventilationRelay', 'sprinklerLockout'];
  if (!validActuators.includes(actuator)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid actuator: ${actuator}. Valid actuators: ${validActuators.join(', ')}` 
    });
  }
  
  const zoneIndex = zonesDB.findIndex((z) => z.id === zoneId);
  if (zoneIndex === -1) {
    return res.status(404).json({ success: false, error: 'Zone not found' });
  }

  zonesDB[zoneIndex].actuators = {
    ...zonesDB[zoneIndex].actuators,
    [actuator]: state,
    lastCommandTimestamp: new Date().toLocaleTimeString(),
  };

  // Save to JSON database
  saveDatabase({
    zones: zonesDB,
    incidents: incidentsDB,
    weights: weightsDB,
    thresholds: thresholdsDB,
    users: INITIAL_USERS,
    metadata: {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      description: 'RoboFusion SCS-RG JSON Database'
    }
  });

  res.json({ success: true, actuators: zonesDB[zoneIndex].actuators });
});

// POST Reset Database to Clean Initial Sensors Baseline (0 / Baseline values)
app.post('/api/v1/reset-data', (req, res) => {
  const { mode } = req.body; // 'zero' or 'default'

  zonesDB = INITIAL_ZONES.map((zone) => ({
    ...zone,
    currentState: 'SAFE',
    lastUpdated: new Date().toLocaleTimeString(),
    currentRiskScore: {
      fireScore: 0,
      gasScore: 0,
      waterScore: 0,
      occupancyScore: 0,
      totalScore: 0,
      state: 'SAFE',
    },
    actuators: {
      buzzer: false,
      strobeLed: false,
      ventilationRelay: false,
      sprinklerLockout: false,
      autoTriggered: false,
      lastCommandTimestamp: 'Standby',
    },
    sensors: zone.sensors.map((s) => ({
      ...s,
      currentRawValue: mode === 'zero' ? 0 : s.minValue,
      currentNormalizedValue: mode === 'zero' ? 0 : 0,
      history: [
        { timestamp: '10m ago', rawValue: 0, normalizedValue: 0 },
        { timestamp: '5m ago', rawValue: 0, normalizedValue: 0 },
        { timestamp: 'Just now', rawValue: 0, normalizedValue: 0 },
      ],
    })),
  }));

  incidentsDB = [];

  // Save to JSON database
  saveDatabase({
    zones: zonesDB,
    incidents: incidentsDB,
    weights: weightsDB,
    thresholds: thresholdsDB,
    users: INITIAL_USERS,
    metadata: {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      description: 'RoboFusion SCS-RG JSON Database'
    }
  });

  res.json({
    success: true,
    message: 'System reset to clean 0 baseline. Ready for real hardware sensor streaming.',
    zones: zonesDB,
  });
});

// Error Handling Middleware (must be after all routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      details: NODE_ENV === 'development' ? err.message : undefined
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request body too large',
      details: NODE_ENV === 'development' ? err.message : undefined
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// START API SERVER
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Server running on http://0.0.0.0:${PORT}`);
  console.log(`API Health Check: http://localhost:${PORT}/api/v1/health`);
});
