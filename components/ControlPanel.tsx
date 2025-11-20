import React from 'react';
import { Play, Pause, Sparkles, Activity, Dna } from 'lucide-react';
import { EcosystemConfig } from '../types';

interface ControlPanelProps {
  ecosystem: EcosystemConfig;
  isRunning: boolean;
  stats: { count: number; fps: number };
  onToggle: () => void;
  onEvolve: () => void;
  isEvolving: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  ecosystem,
  isRunning,
  stats,
  onToggle,
  onEvolve,
  isEvolving
}) => {
  return (
    <div className="absolute top-4 right-4 w-80 md:w-96 flex flex-col gap-4 z-10 pointer-events-none">
      {/* Main Stats Card */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl pointer-events-auto">
        <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                XENON
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1"><Activity size={12}/> {stats.fps} FPS</span>
                <span>{stats.count} ENTITIES</span>
            </div>
        </div>
        
        <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-200">{ecosystem.name}</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ecosystem.description}</p>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={onToggle}
                className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
                    isRunning 
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
                }`}
            >
                {isRunning ? <><Pause size={16}/> Pause</> : <><Play size={16}/> Resume</>}
            </button>
            
            <button 
                onClick={onEvolve}
                disabled={isEvolving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-lg shadow-indigo-900/50"
            >
                {isEvolving ? (
                    <span className="animate-pulse">Simulating...</span>
                ) : (
                    <><Sparkles size={16}/> Evolve</>
                )}
            </button>
        </div>
      </div>

      {/* Species Legend */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-xl pointer-events-auto max-h-[40vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Dna size={12} /> Active Species
        </h3>
        <div className="space-y-3">
            {ecosystem.species.map((species) => (
                <div key={species.id} className="group">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span 
                                className="w-3 h-3 rounded-full shadow-[0_0_8px]" 
                                style={{ backgroundColor: species.color, boxShadow: `0 0 8px ${species.color}` }}
                            />
                            <span className="text-sm font-medium text-slate-200">{species.name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 bg-slate-800">
                            {species.behavior}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 pl-5 group-hover:text-slate-400 transition-colors">
                        {species.description}
                    </p>
                    {/* Mini Stat Bars */}
                    <div className="pl-5 mt-2 flex gap-1 opacity-60">
                        <div className="h-1 bg-slate-700 rounded-full w-full overflow-hidden" title="Speed">
                            <div className="h-full bg-cyan-500" style={{ width: `${(species.maxSpeed / 4) * 100}%` }}/>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full w-full overflow-hidden" title="Size">
                            <div className="h-full bg-pink-500" style={{ width: `${(species.sizeRange[1] / 15) * 100}%` }}/>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
