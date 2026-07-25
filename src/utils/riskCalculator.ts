import {
  RiskScoreBreakdown,
  RiskFusionWeights,
  RiskThresholds,
  ZoneState,
  Sensor,
  MLPrediction,
  Zone,
} from '../types';

export const DEFAULT_WEIGHTS: RiskFusionWeights = {
  W_fire: 0.4,
  W_gas: 0.3,
  W_water: 0.2,
  W_occ: 0.1,
};

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  safeUpperLimit: 30,
  warningUpperLimit: 60,
};

/**
 * Calculates Risk Fusion score based on formula:
 * Score = (W_fire * S_fire) + (W_gas * S_gas) + (W_water * S_water) + (W_occ * S_occ)
 */
export function calculateRiskScore(
  sensors: Sensor[],
  weights: RiskFusionWeights = DEFAULT_WEIGHTS,
  thresholds: RiskThresholds = DEFAULT_THRESHOLDS
): RiskScoreBreakdown {
  const getNorm = (type: Sensor['type']) => {
    const s = sensors.find((s) => s.type === type);
    return s ? s.currentNormalizedValue : 0;
  };

  const fireNorm = getNorm('fire');
  const gasNorm = getNorm('gas');
  const waterNorm = getNorm('water');
  const occNorm = getNorm('pir');

  const fireScore = weights.W_fire * fireNorm;
  const gasScore = weights.W_gas * gasNorm;
  const waterScore = weights.W_water * waterNorm;
  const occupancyScore = weights.W_occ * occNorm;

  const totalScore = Math.min(100, Math.max(0, fireScore + gasScore + waterScore + occupancyScore));

  let state: ZoneState = 'SAFE';
  if (totalScore >= thresholds.warningUpperLimit) {
    state = 'CRITICAL';
  } else if (totalScore >= thresholds.safeUpperLimit) {
    state = 'WARNING';
  }

  return {
    fireScore,
    gasScore,
    waterScore,
    occupancyScore,
    totalScore: Math.round(totalScore * 10) / 10,
    state,
  };
}

/**
 * Priority Ranking Engine
 * Ranks zones by risk level & emergency urgency for rapid response
 */
export function rankZonesByPriority(zones: Zone[]): Zone[] {
  return [...zones].sort((a, b) => {
    const stateOrder = { CRITICAL: 3, WARNING: 2, SAFE: 1 };
    const stateDiff = stateOrder[b.currentState] - stateOrder[a.currentState];
    if (stateDiff !== 0) return stateDiff;

    // Higher risk score first
    const scoreDiff = b.currentRiskScore.totalScore - a.currentRiskScore.totalScore;
    if (Math.abs(scoreDiff) > 0.1) return scoreDiff;

    // If equal score, prioritize higher occupancy count
    return b.occupantCount - a.occupantCount;
  });
}

/**
 * Machine Learning Risk Predictor (Simulates Logistic Regression / Random Forest model)
 * Evaluates historical sensor trajectories to compute predicted risk score in 15-30 min
 */
export function computeMLPrediction(
  sensors: Sensor[],
  currentRiskScore: number,
  occupants: number
): MLPrediction {
  const fireSensor = sensors.find((s) => s.type === 'fire');
  const gasSensor = sensors.find((s) => s.type === 'gas');
  const waterSensor = sensors.find((s) => s.type === 'water');

  // Compute delta rate of change over history
  const getRateOfChange = (sensor?: Sensor) => {
    if (!sensor || sensor.history.length < 2) return 0;
    const len = sensor.history.length;
    const recent = sensor.history[len - 1].normalizedValue;
    const prev = sensor.history[Math.max(0, len - 3)].normalizedValue;
    return recent - prev;
  };

  const fireRate = getRateOfChange(fireSensor);
  const gasRate = getRateOfChange(gasSensor);
  const waterRate = getRateOfChange(waterSensor);

  // Feature vector weights for ML simulation
  const fireContrib = fireSensor ? fireSensor.currentNormalizedValue * 0.45 + fireRate * 1.8 : 0;
  const gasContrib = gasSensor ? gasSensor.currentNormalizedValue * 0.35 + gasRate * 1.5 : 0;
  const waterContrib = waterSensor ? waterSensor.currentNormalizedValue * 0.2 + waterRate * 1.1 : 0;
  const occContrib = occupants > 0 ? Math.min(20, occupants * 1.2) : 0;

  // Logistic Sigmoid conversion
  const z = (fireContrib + gasContrib + waterContrib + occContrib - 40) / 15;
  const probability = 1 / (1 + Math.exp(-z));

  const predictedScore = Math.min(
    100,
    Math.max(0, Math.round(currentRiskScore + fireRate * 0.5 + gasRate * 0.4 + waterRate * 0.3))
  );

  let trendDirection: 'rising' | 'stable' | 'falling' = 'stable';
  if (fireRate + gasRate + waterRate > 2) trendDirection = 'rising';
  else if (fireRate + gasRate + waterRate < -2) trendDirection = 'falling';

  // Identify primary risk factor
  let primaryFactor = 'Stable Ambient';
  const factors = [
    { name: 'Thermal / Smoke Spike', val: fireContrib },
    { name: 'Combustible / Toxic Gas Accumulation', val: gasContrib },
    { name: 'Liquid Leakage / Overflow', val: waterContrib },
    { name: 'High Occupancy Density', val: occContrib },
  ];
  factors.sort((a, b) => b.val - a.val);
  if (factors[0].val > 10) primaryFactor = factors[0].name;

  let recommendedAction = 'Maintain standard automated monitoring.';
  if (probability > 0.75) {
    recommendedAction = 'URGENT: Pre-deploy response team & verify ventilation actuators.';
  } else if (probability > 0.4) {
    recommendedAction = 'ADVISORY: Monitor sensor trajectory & inspect zone node calibrations.';
  }

  return {
    predictedScore30Min: predictedScore,
    probabilityCritical: Math.round(probability * 100) / 100,
    trendDirection,
    primaryRiskFactor: primaryFactor,
    confidence: Math.round((0.88 + (probability > 0.5 ? 0.08 : 0.02)) * 100),
    recommendedAction,
  };
}
