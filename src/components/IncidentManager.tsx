import React, { useState } from 'react';
import { Incident, User } from '../types';
import { Shield, ShieldAlert, CheckCircle2, Clock, FileText, Search, UserCheck, AlertOctagon, Download, PlusCircle } from 'lucide-react';

interface IncidentManagerProps {
  incidents: Incident[];
  currentUser: User;
  onAcknowledgeIncident: (incidentId: string, notes: string) => void;
  onResolveIncident: (incidentId: string, notes: string) => void;
}

export const IncidentManager: React.FC<IncidentManagerProps> = ({
  incidents,
  currentUser,
  onAcknowledgeIncident,
  onResolveIncident,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncidentForNotes, setSelectedIncidentForNotes] = useState<Incident | null>(null);
  const [responseNotesInput, setResponseNotesInput] = useState('');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesStatus = filterStatus === 'all' || inc.status === filterStatus;
    const matchesSearch =
      inc.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.zoneCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.triggerReason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleOpenAcknowledgeModal = (incident: Incident) => {
    setSelectedIncidentForNotes(incident);
    setResponseNotesInput(incident.resolutionNotes || 'Dispatched security team. Triggered forced ventilation purge.');
  };

  const handleConfirmAcknowledge = () => {
    if (!selectedIncidentForNotes) return;
    onAcknowledgeIncident(selectedIncidentForNotes.id, responseNotesInput);
    setSelectedIncidentForNotes(null);
  };

  const handleConfirmResolve = () => {
    if (!selectedIncidentForNotes) return;
    onResolveIncident(selectedIncidentForNotes.id, responseNotesInput);
    setSelectedIncidentForNotes(null);
  };

  const exportIncidentReportJSON = () => {
    const jsonStr = JSON.stringify(incidents, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `robofusion_incident_audit_log_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-slate-100">
              Incident Management & Audit Trail
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time hazard dispatch logs, responder acknowledgments, and resolution history
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Filter Status Buttons */}
          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg text-xs space-x-1">
            {(['all', 'active', 'acknowledged', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded font-medium capitalize transition-colors ${
                  filterStatus === st
                    ? 'bg-cyan-900 text-cyan-200 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={exportIncidentReportJSON}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Log</span>
          </button>
        </div>
      </div>

      {/* Incidents Table / List */}
      <div className="space-y-3">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 text-xs">
            No incidents matched your query.
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                inc.status === 'active'
                  ? 'bg-red-950/30 border-red-800/80 shadow-red-950/20'
                  : inc.status === 'acknowledged'
                  ? 'bg-amber-950/20 border-amber-800/60'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                
                {/* Left: Zone & Reason */}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {inc.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100">
                      {inc.zoneName} ({inc.zoneCode})
                    </h3>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                        inc.status === 'active'
                          ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                          : inc.status === 'acknowledged'
                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1.5 flex items-start space-x-1">
                    <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{inc.triggerReason}</span>
                  </p>

                  {/* Timeline & Responder Info */}
                  <div className="mt-2 text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Started: {new Date(inc.startTime).toLocaleTimeString()}</span>
                    </span>

                    {inc.acknowledgedBy && (
                      <span className="flex items-center space-x-1 text-cyan-300">
                        <UserCheck className="w-3 h-3" />
                        <span>
                          Ack by {inc.acknowledgedBy.name} ({inc.acknowledgedBy.role}) at{' '}
                          {new Date(inc.acknowledgedAt || '').toLocaleTimeString()}
                        </span>
                      </span>
                    )}

                    {inc.endTime && (
                      <span className="text-emerald-400">
                        Resolved at {new Date(inc.endTime).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {/* Resolution Notes */}
                  {inc.resolutionNotes && (
                    <div className="mt-2 bg-slate-900/80 p-2 rounded border border-slate-800 text-xs text-slate-300 italic">
                      "{inc.resolutionNotes}"
                    </div>
                  )}
                </div>

                {/* Right: Max Score & Actions */}
                <div className="text-right flex flex-col justify-between items-end space-y-2">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Peak Risk Score</div>
                    <div className="text-xl font-black text-slate-100">{inc.maxRiskScore.toFixed(1)}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {inc.status !== 'resolved' && (
                      <button
                        onClick={() => handleOpenAcknowledgeModal(inc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-md ${
                          inc.status === 'active'
                            ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                            : 'bg-cyan-800 hover:bg-cyan-700 text-white'
                        }`}
                      >
                        {inc.status === 'active' ? 'Acknowledge' : 'Update / Resolve'}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {/* Acknowledge / Response Notes Modal */}
      {selectedIncidentForNotes && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span>Security Dispatch - Incident {selectedIncidentForNotes.id}</span>
              </h3>
              <button
                onClick={() => setSelectedIncidentForNotes(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-300">
              <p>
                <strong>Zone:</strong> {selectedIncidentForNotes.zoneName} ({selectedIncidentForNotes.zoneCode})
              </p>
              <p>
                <strong>Responder:</strong> {currentUser.name} ({currentUser.role} • Badge {currentUser.badgeId})
              </p>
              
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Response Action Log & Notes:
                </label>
                <textarea
                  rows={4}
                  value={responseNotesInput}
                  onChange={(e) => setResponseNotesInput(e.target.value)}
                  placeholder="Enter response details, dispatched teams, or resolution status..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedIncidentForNotes(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirmAcknowledge}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow"
              >
                Mark Acknowledged
              </button>

              <button
                onClick={handleConfirmResolve}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
