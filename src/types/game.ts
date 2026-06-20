
export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type CardType = 'troop' | 'building' | 'spell';
export type TargetType = 'any' | 'buildings' | 'ground' | 'air';
export type Speed = 'slow' | 'medium' | 'fast' | 'very_fast';

export interface Card {
  id: string;
  name: string;
  cost: number;
  image: string;
  rarity: Rarity;
  playType: CardType;
  
  // Base Stats
  hp?: number;
  damage?: number;
  hitSpeed?: number;
  speed?: number;
  range?: number;
  sightRadius?: number;
  mass?: number;
  
  // Specifics
  isFlying?: boolean;
  targetsFlying?: boolean;
  targetType?: TargetType;
  shieldHp?: number;
  count?: number; // for swarms
  
  // Spells / Buildings
  radius?: number;
  duration?: number;
  spawnInterval?: number;
  lifetime?: number;
  spawnId?: string; // what building spawns
  
  // Abilities
  chargeDuration?: number; // if charging
  dashRange?: number; // if dashing
  onDeath?: string; // e.g. 'bomb', 'split'
  spellType?: 'damage' | 'poison' | 'freeze';
}

export interface PlayerStats {
  gold: number;
  gems: number;
  trophies: number;
  chests: (Chest | null)[];
  cardLevels: Record<string, { level: number, copiesCollected: number }>;
}

export interface Chest {
  id: string;
  type: 'Silver' | 'Gold' | 'Magical';
  unlockTime: number | null; // Date.now() + duration
}
