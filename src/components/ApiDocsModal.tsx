import React, { useState } from 'react';
import { API_DOCS } from '../data/initialData';
import { Code, Terminal, Copy, Check, ExternalLink, Play } from 'lucide-react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  if (!isOpen) return null;

  const currentDoc = API_DOCS[activeTab];

  const handleCopy = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>RoboFusion OpenAPI / REST API Documentation</span>
                <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-400">
                  v1.0 HTTP Edge Ingestion
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Integration specifications for IoT hardware nodes, security dashboards & third-party services
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 font-bold p-1 rounded-lg hover:bg-slate-800 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Endpoint Selector Tabs */}
          <div className="space-y-2 border-r border-slate-800/80 pr-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Endpoints
            </span>

            {API_DOCS.map((doc, idx) => (
              <button
                key={doc.path}
                onClick={() => setActiveTab(idx)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs font-mono transition-all flex items-center justify-between ${
                  activeTab === idx
                    ? 'bg-slate-800 border-cyan-500 text-cyan-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded ${
                      doc.method === 'GET'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}
                  >
                    {doc.method}
                  </span>
                  <span className="truncate">{doc.path}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Endpoint Details */}
          <div className="md:col-span-2 space-y-4 font-mono text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-extrabold rounded ${
                      currentDoc.method === 'GET'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}
                  >
                    {currentDoc.method}
                  </span>
                  <span className="text-slate-100 font-bold">{currentDoc.path}</span>
                </div>

                <button
                  onClick={() => handleCopy(currentDoc.path, currentDoc.path)}
                  className="text-slate-400 hover:text-cyan-300 flex items-center space-x-1 text-[11px]"
                >
                  {copiedPath === currentDoc.path ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPath === currentDoc.path ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <p className="text-slate-300 text-xs font-sans">{currentDoc.description}</p>
            </div>

            {/* Request Body JSON */}
            {currentDoc.requestBody && (
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold uppercase">
                  Request Payload JSON (Schema):
                </span>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-cyan-300 text-[11px] overflow-x-auto leading-relaxed">
                  {currentDoc.requestBody}
                </pre>
              </div>
            )}

            {/* Response Example JSON */}
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] font-semibold uppercase">
                Expected 200 OK Response:
              </span>
              <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-emerald-400 text-[11px] overflow-x-auto leading-relaxed">
                {currentDoc.responseExample}
              </pre>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
