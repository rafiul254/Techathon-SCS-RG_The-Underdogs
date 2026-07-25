import React from 'react';
import { Zone } from '../types';
import { Brain, TrendingUp, TrendingDown, Minus, AlertCircle, ShieldCheck, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

interface PredictedRiskPanelProps {
  zones: Zone[];
  onSelectZone: (zone: Zone) => void;
}

export const PredictedRiskPanel: React.FC<PredictedRiskPanelProps> = ({ zones, onSelectZone }) => {
  // Sort zones by predicted probability of critical state descending
  const sortedByPrediction = [...zones].sort(
    (a, b) => b.mlPrediction.probabilityCritical - a.mlPrediction.probabilityCritical
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-purple-950/80 border border-purple-800 rounded-lg text-purple-300">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>ML Predictive Risk Engine</span>
              <span className="text-[10px] font-semibold bg-purple-900/60 text-purple-300 border border-purple-700 px-2 py-0.5 rounded-full flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Logistic Regression / Random Forest</span>
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              30-minute predictive hazard escalation modeling using multi-sensor delta velocities
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedByPrediction.map((zone) => {
          const { mlPrediction } = zone;
          const isHighRisk = mlPrediction.probabilityCritical > 0.6;
          const isMediumRisk = mlPrediction.probabilityCritical > 0.3;

          return (
            <div
              key={zone.id}
              onClick={() => onSelectZone(zone)}
              className="bg-slate-950/70 border border-slate-800 hover:border-purple-800/80 rounded-xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-lg hover:shadow-purple-950/20 group"
            >
              <div>
                {/* Top Row: Zone info & Trend Icon */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                      {zone.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                      {zone.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-1 text-xs">
                    {mlPrediction.trendDirection === 'rising' ? (
                      <span className="flex items-center space-x-1 text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded font-bold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Rising</span>
                      </span>
                    ) : mlPrediction.trendDirection === 'falling' ? (
                      <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Falling</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-bold">
                        <Minus className="w-3.5 h-3.5" />
                        <span>Stable</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Prediction Score & Probability Gauge */}
                <div className="my-3 bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">30-Min Forecast Score</div>
                    <div className="text-2xl font-black text-slate-100">
                      {mlPrediction.predictedScore30Min}{' '}
                      <span className="text-xs text-slate-500 font-normal">pts</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 font-medium">Critical Probability</div>
                    <div
                      className={`text-xl font-extrabold ${
                        isHighRisk ? 'text-red-400 animate-pulse' : isMediumRisk ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {Math.round(mlPrediction.probabilityCritical * 100)}%
                    </div>
                  </div>
                </div>

                {/* Probability Bar */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Model Confidence: {mlPrediction.confidence}%</span>
                    <span>Primary Factor</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${mlPrediction.probabilityCritical * 100}%` }}
                      className={`h-full transition-all duration-500 ${
                        isHighRisk ? 'bg-red-500' : isMediumRisk ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Primary Risk Driver & Recommendation */}
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">
                      Leading Risk Feature:
                    </span>
                    <span className="font-semibold text-purple-200 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
                      <span>{mlPrediction.primaryRiskFactor}</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 italic bg-purple-950/20 p-2 rounded border border-purple-900/40">
                    "{mlPrediction.recommendedAction}"
                  </p>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-purple-400 font-medium group-hover:text-purple-300">
                <span>View ML Weights & Analytics</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
