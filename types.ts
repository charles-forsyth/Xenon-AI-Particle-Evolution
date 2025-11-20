export interface Vector2 {
  x: number;
  y: number;
}

export interface Species {
  id: string;
  name: string;
  color: string;
  description: string;
  maxSpeed: number;
  sizeRange: [number, number]; // min, max
  sensorRadius: number;
  behavior: 'AGGRESSIVE' | 'PASSIVE' | 'SWARM' | 'CHAOTIC';
  // Interaction matrix weights (-1 to 1) against other species (mapped by index usually, or simplistic generic types)
  aggression: number; // 0 to 1
  attraction: number; // -1 (repulse) to 1 (attract)
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speciesId: string;
  energy: number; // Decreases over time, refilled by eating
  maxEnergy: number; // Cap for energy
  generation: number; // Evolution level (1 = base)
  age: number;
}

export interface EcosystemConfig {
  name: string;
  description: string;
  species: Species[];
}