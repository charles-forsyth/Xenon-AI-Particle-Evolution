import React, { useEffect, useRef, useCallback } from 'react';
import { Particle, Species, EcosystemConfig, Vector2 } from '../types';
import { SIMULATION_CONFIG } from '../constants';

interface SimulationCanvasProps {
  ecosystem: EcosystemConfig;
  isRunning: boolean;
  onStatsUpdate: (stats: { count: number; fps: number }) => void;
}

// Vector helper functions
const vecAdd = (v1: Vector2, v2: Vector2) => ({ x: v1.x + v2.x, y: v1.y + v2.y });
const vecSub = (v1: Vector2, v2: Vector2) => ({ x: v1.x - v2.x, y: v1.y - v2.y });
const vecMult = (v: Vector2, n: number) => ({ x: v.x * n, y: v.y * n });
const vecDiv = (v: Vector2, n: number) => ({ x: v.x / n, y: v.y / n });
const vecMag = (v: Vector2) => Math.hypot(v.x, v.y);
const vecNormalize = (v: Vector2) => {
  const m = vecMag(v);
  return m === 0 ? { x: 0, y: 0 } : vecDiv(v, m);
};
const vecLimit = (v: Vector2, max: number) => {
  const m = vecMag(v);
  return m > max ? vecMult(vecDiv(v, m), max) : v;
};

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ ecosystem, isRunning, onStatsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<Vector2>({ x: -1000, y: -1000 });
  const statsRef = useRef({ lastTime: 0, frames: 0 });

  // Helper: Create a single particle
  const createParticle = useCallback((width: number, height: number, speciesOverride?: Species, generation: number = 1): Particle => {
    const speciesList = ecosystem.species;
    const species = speciesOverride || speciesList[Math.floor(Math.random() * speciesList.length)];
    
    // Scale stats based on generation
    const genMultiplier = Math.pow(SIMULATION_CONFIG.GEN_MULTIPLIER, generation - 1);
    const baseRadius = Math.random() * (species.sizeRange[1] - species.sizeRange[0]) + species.sizeRange[0];
    const radius = Math.min(baseRadius * genMultiplier, 40); // Hard cap size

    return {
      id: Math.random(),
      x: Math.random() * (width - 100) + 50,
      y: Math.random() * (height - 100) + 50,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius,
      speciesId: species.id,
      energy: 80 * genMultiplier, 
      maxEnergy: 120 * genMultiplier,
      generation,
      age: 0,
    };
  }, [ecosystem]);

  // Initialize system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width = window.innerWidth;
    const height = canvas.height = window.innerHeight;

    // If starting fresh or species totally changed
    if (particlesRef.current.length === 0) {
        const initialParticles: Particle[] = [];
        for (let i = 0; i < SIMULATION_CONFIG.PARTICLE_COUNT; i++) {
          initialParticles.push(createParticle(width, height));
        }
        particlesRef.current = initialParticles;
    } else {
        // Migration logic: Assign new species to existing particles
        particlesRef.current = particlesRef.current.map(p => {
            const speciesExists = ecosystem.species.find(s => s.id === p.speciesId);
            if (speciesExists) return p;
            
            // Morph into a new random species from the new set
            const newSpecies = ecosystem.species[Math.floor(Math.random() * ecosystem.species.length)];
            return {
                ...p,
                speciesId: newSpecies.id,
                radius: (newSpecies.sizeRange[0] + newSpecies.sizeRange[1]) / 2,
                generation: 1, // Reset generation on species change
                maxEnergy: 120,
            };
        });
    }
  }, [ecosystem, createParticle]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Physics Loop
  const update = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;

    // FPS Calc
    const now = performance.now();
    const delta = now - statsRef.current.lastTime;
    if (delta >= 1000) {
        onStatsUpdate({ 
            count: particlesRef.current.length, 
            fps: Math.round((statsRef.current.frames * 1000) / delta) 
        });
        statsRef.current.frames = 0;
        statsRef.current.lastTime = now;
    }
    statsRef.current.frames++;

    // Clear & Trails
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)'; 
    ctx.fillRect(0, 0, width, height);

    const particles = particlesRef.current;
    const speciesMap = new Map<string, Species>(
      ecosystem.species.map(s => [s.id, s] as [string, Species])
    );

    const newParticles: Particle[] = [];

    // --- PHYSICS LOOP ---
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      
      // Skip dead particles immediately
      if (p1.energy <= 0) continue;

      const s1 = speciesMap.get(p1.speciesId);
      if (!s1) continue;

      // Generation Multiplier (affects capabilities)
      const genMult = Math.pow(SIMULATION_CONFIG.GEN_MULTIPLIER, p1.generation - 1);

      // Steering Accumulators
      let separation = { x: 0, y: 0 };
      let alignment = { x: 0, y: 0 };
      let cohesion = { x: 0, y: 0 };
      let hunt = { x: 0, y: 0 };
      let flee = { x: 0, y: 0 };
      let countNeighbors = 0;

      // 1. Mouse Interaction
      const dxm = p1.x - mouseRef.current.x;
      const dym = p1.y - mouseRef.current.y;
      const distM = Math.hypot(dxm, dym);
      if (distM < 250) {
          const force = (250 - distM) / 250;
          const repulse = vecMult(vecNormalize({x: dxm, y: dym}), force * 2.0); 
          p1.vx += repulse.x;
          p1.vy += repulse.y;
      }

      // 2. Particle Interactions
      for (let j = 0; j < particles.length; j++) {
        if (i === j) continue;
        const p2 = particles[j];
        
        if (p2.energy <= 0) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        
        // 2a. Collision Actions
        if (dist < p1.radius + p2.radius) {
            const overlap = (p1.radius + p2.radius) - dist;
            const sufficientOverlap = overlap > (p2.radius * SIMULATION_CONFIG.EATING_THRESHOLD);
            
            // --- MERGING / MATING LOGIC ---
            if (
                p1.speciesId === p2.speciesId && 
                p1.energy > SIMULATION_CONFIG.MATING_THRESHOLD && 
                p2.energy > SIMULATION_CONFIG.MATING_THRESHOLD &&
                overlap > 0 // Just need to touch
            ) {
                // Chance to merge to prevent instant mass merging
                if (Math.random() < 0.1) {
                    const newGen = Math.min(Math.max(p1.generation, p2.generation) + 1, SIMULATION_CONFIG.MAX_GENERATION);
                    const child = createParticle(width, height, s1, newGen);
                    
                    // Position at midpoint
                    child.x = (p1.x + p2.x) / 2;
                    child.y = (p1.y + p2.y) / 2;
                    // Blend velocities + slight explosion
                    child.vx = (p1.vx + p2.vx) / 2 + (Math.random() - 0.5);
                    child.vy = (p1.vy + p2.vy) / 2 + (Math.random() - 0.5);
                    // Pool energy minus cost
                    child.energy = Math.min(child.maxEnergy, (p1.energy + p2.energy) * 0.6);

                    newParticles.push(child);

                    // Consume parents
                    p1.energy = -100;
                    p2.energy = -100;
                    continue;
                }
            }

            // --- EATING LOGIC ---
            const p1Bigger = p1.radius > p2.radius * 1.1; 
            const isAggressive = s1.behavior === 'AGGRESSIVE' || s1.aggression > 0.6;

            if (p1Bigger && isAggressive && p1.speciesId !== p2.speciesId && sufficientOverlap) {
                p1.energy = Math.min(p1.energy + SIMULATION_CONFIG.EATING_ENERGY_GAIN, p1.maxEnergy);
                p1.radius = Math.min(p1.radius + 0.2, s1.sizeRange[1] * 1.5 * genMult);
                p2.energy = -100; // Mark for death
                continue;
            }
        }

        // 2b. Sensing
        if (dist < s1.sensorRadius && dist > 0) {
            const s2 = speciesMap.get(p2.speciesId);
            if (!s2) continue;

            const toNeighbor = { x: dx, y: dy };
            const fromNeighbor = { x: -dx, y: -dy };
            
            if (p1.speciesId === p2.speciesId) {
                if (dist < (p1.radius + p2.radius) * 3) {
                    separation = vecAdd(separation, vecDiv(vecNormalize(fromNeighbor), dist));
                }
                alignment = vecAdd(alignment, { x: p2.vx, y: p2.vy });
                cohesion = vecAdd(cohesion, { x: p2.x, y: p2.y });
                countNeighbors++;
            } else {
                const iCanEatYou = p1.radius > p2.radius && s1.aggression > s2.aggression;
                const youCanEatMe = p2.radius > p1.radius && s2.aggression > s1.aggression;

                if (iCanEatYou) {
                    hunt = vecAdd(hunt, vecNormalize(toNeighbor));
                } else if (youCanEatMe) {
                    flee = vecAdd(flee, vecDiv(vecNormalize(fromNeighbor), dist * 0.5));
                } else {
                    if (dist < s1.sensorRadius * 0.5) {
                         separation = vecAdd(separation, vecDiv(vecNormalize(fromNeighbor), dist));
                    }
                }
            }
        }
      }

      // 3. Steering Logic
      let accel = { x: 0, y: 0 };
      // Evolved particles are faster
      const effectiveMaxSpeed = s1.maxSpeed * (1 + (p1.generation - 1) * 0.1);

      if (countNeighbors > 0) {
          const sepForce = vecLimit(vecMult(vecNormalize(separation), effectiveMaxSpeed), 0.2);
          const aliAvg = vecDiv(alignment, countNeighbors);
          const aliForce = vecLimit(vecSub(vecMult(vecNormalize(aliAvg), effectiveMaxSpeed), {x:p1.vx, y:p1.vy}), 0.1);
          const cohAvg = vecDiv(cohesion, countNeighbors);
          const cohDir = vecSub(cohAvg, {x:p1.x, y:p1.y});
          const cohForce = vecLimit(vecSub(vecMult(vecNormalize(cohDir), effectiveMaxSpeed), {x:p1.vx, y:p1.vy}), 0.1);

          let wSep = 1.5, wAli = 1.0, wCoh = 1.0;
          if (s1.behavior === 'SWARM') { wSep=1.0; wAli=1.2; wCoh=1.5; }
          if (s1.behavior === 'CHAOTIC') { wSep=2.0; wAli=0.2; wCoh=0.0; }
          if (s1.behavior === 'PASSIVE') { wSep=1.2; wAli=0.8; wCoh=1.2; }

          accel = vecAdd(accel, vecMult(sepForce, wSep));
          accel = vecAdd(accel, vecMult(aliForce, wAli));
          accel = vecAdd(accel, vecMult(cohForce, wCoh));
      }

      if (vecMag(hunt) > 0) {
          const huntSteer = vecLimit(vecSub(vecMult(vecNormalize(hunt), effectiveMaxSpeed), {x:p1.vx, y:p1.vy}), 0.3);
          accel = vecAdd(accel, vecMult(huntSteer, 2.0 * s1.aggression));
      }
      if (vecMag(flee) > 0) {
          const fleeSteer = vecLimit(vecSub(vecMult(vecNormalize(flee), effectiveMaxSpeed * 1.5), {x:p1.vx, y:p1.vy}), 0.5);
          accel = vecAdd(accel, vecMult(fleeSteer, 4.0));
      }

      // 4. Wall Avoidance
      const margin = 50;
      const turnFactor = 0.5;
      if (p1.x < margin) accel.x += turnFactor;
      if (p1.x > width - margin) accel.x -= turnFactor;
      if (p1.y < margin) accel.y += turnFactor;
      if (p1.y > height - margin) accel.y -= turnFactor;

      // 5. Wandering
      const wander = { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.2 };
      accel = vecAdd(accel, wander);

      // 6. Biological Updates
      // Higher generations are more efficient (burn less energy)
      const efficiency = 1 - ((p1.generation - 1) * 0.1);
      p1.energy -= SIMULATION_CONFIG.ENERGY_DECAY * efficiency; 
      
      // Reproduction (Cloning - Standard)
      // Evolved particles don't clone easily, they prefer merging, but can clone if energy super high
      const reproductionCost = SIMULATION_CONFIG.REPRODUCTION_COST * genMult;
      if (p1.energy > reproductionCost && Math.random() < 0.005) {
         p1.energy -= 40 * genMult;
         // Child is same generation
         const child = createParticle(width, height, s1, p1.generation);
         child.x = p1.x;
         child.y = p1.y;
         child.vx = -p1.vx; 
         child.vy = -p1.vy;
         child.energy = 50 * genMult;
         newParticles.push(child);
      }

      // Aging
      p1.age += 1;
      const lifeVariance = (p1.id * 997) % 1000; 
      if (p1.age > SIMULATION_CONFIG.MAX_AGE + lifeVariance) {
          p1.energy = -100;
      }

      // Apply Physics
      p1.vx += accel.x;
      p1.vy += accel.y;
      const speed = Math.hypot(p1.vx, p1.vy);
      const maxSpeed = vecMag(flee) > 0 ? effectiveMaxSpeed * 1.5 : effectiveMaxSpeed;
      if (speed > maxSpeed) {
          p1.vx = (p1.vx / speed) * maxSpeed;
          p1.vy = (p1.vy / speed) * maxSpeed;
      }
      p1.x += p1.vx;
      p1.y += p1.vy;

      if (p1.x < 0 || p1.x > width) { p1.vx *= -1; p1.x = Math.max(0, Math.min(width, p1.x)); }
      if (p1.y < 0 || p1.y > height) { p1.vy *= -1; p1.y = Math.max(0, Math.min(height, p1.y)); }

      p1.vx *= SIMULATION_CONFIG.FRICTION;
      p1.vy *= SIMULATION_CONFIG.FRICTION;
    }

    // Filter dead and add new births
    const survivors = particles.filter(p => p.energy > 0);
    particlesRef.current = [...survivors, ...newParticles];
    
    // Minimal Respawn if extinction threatens
    const minPop = SIMULATION_CONFIG.PARTICLE_COUNT * 0.5;
    if (particlesRef.current.length < minPop) {
         for(let k=0; k<2; k++) particlesRef.current.push(createParticle(width, height));
    }
    // Cap max population to prevent lag
    if (particlesRef.current.length > 250) {
        particlesRef.current = particlesRef.current.slice(0, 250);
    }

    // Drawing
    particlesRef.current.forEach(p => {
        const s = speciesMap.get(p.speciesId);
        if(!s) return;

        // Visual Vitality
        const energyRatio = Math.max(0.3, Math.min(1, p.energy / 100));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowBlur = 15 * energyRatio;
        ctx.shadowColor = s.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // --- Generation Indicators (Rings) ---
        if (p.generation > 1) {
            ctx.lineWidth = 2;
            // Gold/White rings for evolved status
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * p.generation})`; 
            ctx.stroke();
            
            // Extra ring for very high level
            if (p.generation >= 3) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 215, 0, 0.6)`; // Gold
                ctx.stroke();
            }
        }
        
        // Hunger Visual Indicator
        if (p.energy < 40) {
             const pulse = (Math.sin(time * 0.015) + 1) * 0.5; 
             ctx.lineWidth = 2;
             ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + pulse * 0.6})`; 
             ctx.stroke();
        }

        ctx.closePath();

        // Eye
        ctx.fillStyle = `rgba(255,255,255,${0.7 * energyRatio})`;
        const lookX = p.vx * 2;
        const lookY = p.vy * 2;
        ctx.beginPath();
        ctx.arc(p.x + lookX, p.y + lookY, p.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    });

    if (isRunning) {
        requestRef.current = requestAnimationFrame(update);
    }
  }, [ecosystem, isRunning, onStatsUpdate, createParticle]);

  // Start/Stop loop
  useEffect(() => {
    if (isRunning) {
        requestRef.current = requestAnimationFrame((t) => update(t));
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, update]);

  // Mouse handlers
  const handleMouseMove = (e: React.MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
};