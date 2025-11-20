import { EcosystemConfig } from './types';

export const INITIAL_ECOSYSTEM: EcosystemConfig = {
  name: "Primordial Soup",
  description: "A chaotic beginning. Distinct behaviors are emerging.",
  species: [
    {
      id: "s1",
      name: "Crimson Stalker",
      color: "#f43f5e", // Rose 500
      description: "Fast, aggressive solitary hunters.",
      maxSpeed: 3.0,
      sizeRange: [6, 9],
      sensorRadius: 130,
      behavior: "AGGRESSIVE",
      aggression: 0.8,
      attraction: -0.2,
    },
    {
      id: "s2",
      name: "Cobalt Swarm",
      color: "#3b82f6", // Blue 500
      description: "Small, highly cohesive flocking organisms.",
      maxSpeed: 2.2,
      sizeRange: [3, 5],
      sensorRadius: 80,
      behavior: "SWARM",
      aggression: 0.0,
      attraction: 1.2,
    },
    {
      id: "s3",
      name: "Emerald Drifter",
      color: "#10b981", // Emerald 500
      description: "Passive grazers that flee from danger.",
      maxSpeed: 1.5,
      sizeRange: [4, 8],
      sensorRadius: 110,
      behavior: "PASSIVE",
      aggression: 0.0,
      attraction: 0.2,
    }
  ]
};

export const SIMULATION_CONFIG = {
  PARTICLE_COUNT: 120, // Slightly reduced for performance/clarity
  FRICTION: 0.94, // Higher drag makes movement less slippery
  CANVAS_PADDING: 50,
  SPAWN_MARGIN: 100,
  ENERGY_DECAY: 0.08, // Faster hunger to limit infinite life
  EATING_THRESHOLD: 0.7, 
  REPRODUCTION_COST: 80, // Much harder to reproduce (was 50)
  EATING_ENERGY_GAIN: 30, // Less energy from eating (prevents snowballing)
  MAX_AGE: 2000, // Slightly shorter max lifespan
  
  // Evolution / Mating Config
  MATING_THRESHOLD: 90, // High energy required to merge
  GEN_MULTIPLIER: 1.25, // 25% stat boost per generation
  MAX_GENERATION: 5, // Cap to prevent game-breaking entities
};