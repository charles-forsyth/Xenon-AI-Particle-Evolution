import React, { useState, useCallback } from 'react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ControlPanel } from './components/ControlPanel';
import { EcosystemConfig } from './types';
import { INITIAL_ECOSYSTEM } from './constants';
import { generateNextEvolution } from './services/geminiService';

function App() {
  const [ecosystem, setEcosystem] = useState<EcosystemConfig>(INITIAL_ECOSYSTEM);
  const [isRunning, setIsRunning] = useState(true);
  const [isEvolving, setIsEvolving] = useState(false);
  const [stats, setStats] = useState({ count: 0, fps: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => setIsRunning(prev => !prev);

  const handleEvolve = useCallback(async () => {
    setIsEvolving(true);
    setError(null);
    try {
      const newEcosystem = await generateNextEvolution(ecosystem.name);
      
      // Validate data roughly before applying
      if (!newEcosystem || !newEcosystem.species || newEcosystem.species.length === 0) {
        throw new Error("Invalid evolution data received.");
      }
      
      setEcosystem(newEcosystem);
    } catch (err) {
      console.error(err);
      setError("Failed to evolve. The simulation remains unchanged.");
      // Auto-dismiss error after 3s
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsEvolving(false);
    }
  }, [ecosystem.name]);

  const updateStats = useCallback((newStats: { count: number; fps: number }) => {
    setStats(newStats);
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-900 text-white overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Canvas Background */}
      <SimulationCanvas 
        ecosystem={ecosystem}
        isRunning={isRunning}
        onStatsUpdate={updateStats}
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
      
      {/* Title / Corner Info */}
      <div className="absolute bottom-6 left-6 pointer-events-none z-10 max-w-md opacity-80">
         <h2 className="text-2xl font-bold text-white/90 tracking-tight mb-1">Evolution Engine</h2>
         <p className="text-sm text-slate-400">
            Powered by Gemini 2.5 Flash. Move your cursor to repel particles.
         </p>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur text-white px-6 py-2 rounded-full shadow-xl z-50 animate-bounce">
          {error}
        </div>
      )}

      {/* Controls */}
      <ControlPanel 
        ecosystem={ecosystem}
        isRunning={isRunning}
        stats={stats}
        onToggle={handleToggle}
        onEvolve={handleEvolve}
        isEvolving={isEvolving}
      />
    </div>
  );
}

export default App;
