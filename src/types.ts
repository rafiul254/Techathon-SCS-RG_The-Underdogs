export type ZoneState = 'SAFE' | 'WARNING' | 'CRITICAL';

export type UserRole = 'Admin' | 'Security Staff';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  badgeId: string;
}

export type SensorType = 'fire' | 'gas' | 'water' | 'pir';

export interface Sensor {
  id: string;
  zoneId: string;
  type: SensorType;
  name: string;
  unit: string;
  minValue: number;
  maxValue: number;
  currentRawValue: number;
  currentNormalizedValue: number; // 0 to 100
  history: { timestamp: string; rawValue: number; normalizedValue: number }[];
}

export interface RiskScoreBreakdown {
  fireScore: number;       // W_fire * S_fire
  gasScore: number;        // W_gas * S_gas
  waterScore: number;      // W_water * S_water
  occupancyScore: number;  // W_occ * S_occ
  totalScore: number;      // Sum of above
  state: ZoneState;
}

export interface RiskFusionWeights {
  W_fire: number;   // default 0.4
  W_gas: number;    // default 0.3
  W_water: number;  // default 0.2
  W_occ: number;    // default 0.1
}

export interface RiskThresholds {
  safeUpperLimit: number;    // default < 30
  warningUpperLimit: number; // default < 60
}

export interface ActuatorState {
  buzzer: boolean;
  strobeLed: boolean;
  ventilationRelay: boolean;
  sprinklerLockout: boolean;
  lastCommandTimestamp?: string;
  autoTriggered?: boolean;
}

export interface MLPrediction {
  predictedScore30Min: number;
  probabilityCritical: number; // 0 to 1 (or 0-100%)
  trendDirection: 'rising' | 'stable' | 'falling';
  primaryRiskFactor: string;
  confidence: number; // percentage
  recommendedAction: string;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  location: string;
  building: string;
  floor: string;
  occupantCount: number;
  currentState: ZoneState;
  currentRiskScore: RiskScoreBreakdown;
  actuators: ActuatorState;
  mlPrediction: MLPrediction;
  sensors: Sensor[];
  lastUpdated: string;
}

export interface Incident {
  id: string;
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  triggerReason: string;
  maxRiskScore: number;
  acknowledgedBy?: {
    userId: string;
    username: string;
    name: string;
    role: UserRole;
  };
  acknowledgedAt?: string;
  resolutionNotes?: string;
  actionsTaken?: string[];
}

export interface SensorDataPayload {
  zone_id: string;
  node_token: string;
  timestamp: string;
  readings: {
    sensor_type: SensorType;
    raw_value: number;
    unit: string;
  }[];
}

export interface ApiEndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestBody?: string;
  responseExample: string;
}
