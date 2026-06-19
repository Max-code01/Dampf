import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Play,
  Swords,
  Droplet,
  Shield,
  Crown,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Heart,
  Flame
} from 'lucide-react';

interface ClashArenaProps {
  onClose: () => void;
  user: any;
  myProfile: any;
}

// Sound Synthesizer Class using standard Web Audio API
class ClashSynth {
  ctx: AudioContext | null = null;
  muted: boolean = false;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playSpawn() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playMelee() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.setValueAtTime(100, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playRanged() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playExplosion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    // Noise generation
    const bufferSize = this.ctx.sampleRate * 0.2; // 0.2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  playFanfare(victory: boolean) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = victory ? [261.63, 329.63, 392.00, 523.25] : [220.00, 196.00, 164.81, 130.81];
    const delays = [0, 0.15, 0.3, 0.45];

    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = victory ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delays[index]);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime + delays[index]);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + delays[index] + 0.35);

      osc.start(this.ctx.currentTime + delays[index]);
      osc.stop(this.ctx.currentTime + delays[index] + 0.35);
    });
  }
}

const synthInstance = new ClashSynth();

interface Card {
  id: string;
  name: string;
  cost: number;
  image: string;
  hp: number;
  damage: number;
  range: number;
  speed: number;
  type: 'ground' | 'flying';
  attackType: 'melee' | 'ranged' | 'splash' | 'heal';
  attackSpeed: number; // in ms
  color: string;
  playType?: 'troop' | 'spell' | 'building';
  targetBuildingOnly?: boolean;
  radius?: number; // for spells and splash
}

const CARDS_POOL: Card[] = [
  { id: 'knight', name: 'Ritter', cost: 3, image: '/images/clash_knight.jpg', hp: 950, damage: 105, range: 25, speed: 1.4, type: 'ground', attackType: 'melee', attackSpeed: 1200, color: '#3b82f6', playType: 'troop' },
  { id: 'goblin', name: 'Kobold', cost: 2, image: '/images/clash_goblin.jpg', hp: 400, damage: 55, range: 20, speed: 2.3, type: 'ground', attackType: 'melee', attackSpeed: 950, color: '#10b981', playType: 'troop' },
  { id: 'wizard', name: 'Magier', cost: 5, image: '/images/clash_wizard.jpg', hp: 550, damage: 150, range: 130, speed: 1.1, type: 'ground', attackType: 'ranged', attackSpeed: 1600, color: '#eab308', playType: 'troop' },
  { id: 'dragon', name: 'Dragon', cost: 4, image: '/images/clash_dragon.jpg', hp: 750, damage: 95, range: 110, speed: 1.7, type: 'flying', attackType: 'splash', attackSpeed: 1450, color: '#ec4899', playType: 'troop' },
  { id: 'pekka', name: 'P.E.K.K.A.', cost: 7, image: '/images/clash_pekka.jpg', hp: 2100, damage: 380, range: 30, speed: 0.8, type: 'ground', attackType: 'melee', attackSpeed: 1800, color: '#a855f7', playType: 'troop' },
  
  // New user-provided cards
  { id: 'spear_goblins', name: 'Speerkobolde', cost: 2, image: '/images/spear_goblins.png', hp: 300, damage: 45, range: 100, speed: 1.8, type: 'ground', attackType: 'ranged', attackSpeed: 1200, color: '#84cc16', playType: 'troop' },
  { id: 'battle_healer', name: 'Kampfheilerin', cost: 4, image: '/images/battle_healer.png', hp: 1200, damage: 85, range: 25, speed: 1.2, type: 'ground', attackType: 'heal', attackSpeed: 1500, color: '#fcd34d', playType: 'troop' },
  { id: 'tesla', name: 'Tesla', cost: 4, image: '/images/tesla.png', hp: 950, damage: 190, range: 110, speed: 0, type: 'ground', attackType: 'ranged', attackSpeed: 800, color: '#0ea5e9', playType: 'building' },
  { id: 'baby_dragon', name: 'Baby Drache', cost: 4, image: '/images/baby_dragon.png', hp: 900, damage: 100, range: 75, speed: 1.5, type: 'flying', attackType: 'splash', attackSpeed: 1500, color: '#2dd4bf', playType: 'troop' },
  { id: 'barbarian_barrel', name: 'Barbarenfass', cost: 2, image: '/images/barb_barrel.png', hp: 0, damage: 200, range: 0, speed: 0, type: 'ground', attackType: 'splash', attackSpeed: 0, color: '#d97706', playType: 'spell', radius: 45 },
  { id: 'dark_prince', name: 'Dunkler Prinz', cost: 4, image: '/images/dark_prince.png', hp: 1050, damage: 160, range: 35, speed: 1.6, type: 'ground', attackType: 'splash', attackSpeed: 1300, color: '#334155', playType: 'troop' },
  { id: 'electro_dragon', name: 'Elektrodrache', cost: 5, image: '/images/electro_dragon.png', hp: 850, damage: 110, range: 85, speed: 1.1, type: 'flying', attackType: 'ranged', attackSpeed: 2100, color: '#60a5fa', playType: 'troop' },
  { id: 'electro_giant', name: 'Elektro-Riese', cost: 7, image: '/images/electro_giant.png', hp: 3200, damage: 140, range: 30, speed: 0.7, type: 'ground', attackType: 'melee', attackSpeed: 2100, color: '#8b5cf6', playType: 'troop' },
  { id: 'fireball', name: 'Feuerball', cost: 4, image: '/images/fireball.png', hp: 0, damage: 450, range: 0, speed: 0, type: 'flying', attackType: 'splash', attackSpeed: 0, color: '#ef4444', playType: 'spell', radius: 65 },
  { id: 'fire_spirit', name: 'Feuergeist', cost: 1, image: '/images/fire_spirit.png', hp: 200, damage: 180, range: 35, speed: 2.5, type: 'ground', attackType: 'splash', attackSpeed: 500, color: '#f97316', playType: 'troop' },
  { id: 'princess', name: 'Prinzessin', cost: 3, image: '/images/princess.png', hp: 216, damage: 140, range: 90, speed: 1.2, type: 'ground', attackType: 'splash', attackSpeed: 3000, color: '#f87171', playType: 'troop' },
  { id: 'wall_breakers', name: 'Mauerbrecher', cost: 2, image: '/images/wall_breakers.png', hp: 250, damage: 325, range: 20, speed: 2.5, type: 'ground', attackType: 'melee', attackSpeed: 1000, color: '#64748b', playType: 'troop', targetBuildingOnly: true },
  { id: 'witch', name: 'Hexe', cost: 5, image: '/images/witch.png', hp: 700, damage: 111, range: 50, speed: 1.2, type: 'ground', attackType: 'splash', attackSpeed: 1100, color: '#a855f7', playType: 'troop' },
  { id: 'x_bow', name: 'X-Bogen', cost: 6, image: '/images/x_bow.png', hp: 1000, damage: 26, range: 115, speed: 0, type: 'ground', attackType: 'ranged', attackSpeed: 250, color: '#9ca3af', playType: 'building' },
  { id: 'giant_snowball', name: 'Riesenschneeball', cost: 2, image: '/images/giant_snowball.png', hp: 0, damage: 159, range: 0, speed: 0, type: 'flying', attackType: 'splash', attackSpeed: 0, color: '#bae6fd', playType: 'spell', radius: 45 },
  { id: 'goblin_drill', name: 'Koboldbohrer', cost: 4, image: '/images/goblin_drill.png', hp: 900, damage: 0, range: 0, speed: 0, type: 'ground', attackType: 'melee', attackSpeed: 2000, color: '#16a34a', playType: 'building' },
  { id: 'goblin_giant', name: 'Koboldriese', cost: 6, image: '/images/goblin_giant.png', hp: 2500, damage: 146, range: 25, speed: 1.2, type: 'ground', attackType: 'melee', attackSpeed: 1700, color: '#4ade80', playType: 'troop', targetBuildingOnly: true },
  { id: 'hog_rider', name: 'Schweinereiter', cost: 4, image: '/images/hog_rider.png', hp: 1400, damage: 260, range: 20, speed: 2.0, type: 'ground', attackType: 'melee', attackSpeed: 1600, color: '#b45309', playType: 'troop', targetBuildingOnly: true },
  { id: 'hunter', name: 'Jäger', cost: 4, image: '/images/hunter.png', hp: 700, damage: 69, range: 40, speed: 1.3, type: 'ground', attackType: 'ranged', attackSpeed: 2200, color: '#525252', playType: 'troop' },
  { id: 'mini_pekka', name: 'Mini P.E.K.K.A', cost: 4, image: '/images/mini_pekka.png', hp: 1129, damage: 598, range: 20, speed: 1.6, type: 'ground', attackType: 'melee', attackSpeed: 1800, color: '#3b82f6', playType: 'troop' }
];

interface Troop {
  id: string;
  name: string;
  side: 'player' | 'enemy';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  type: 'ground' | 'flying';
  attackType: 'melee' | 'ranged' | 'splash' | 'heal';
  attackSpeed: number;
  lastAttackTime: number;
  cardId: string;
  color: string;
  playType?: 'troop' | 'spell' | 'building';
  targetBuildingOnly?: boolean;
}

interface Tower {
  id: 'player_king' | 'player_left' | 'player_right' | 'enemy_king' | 'enemy_left' | 'enemy_right';
  side: 'player' | 'enemy';
  type: 'king' | 'princess';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  range: number;
  lastAttackTime: number;
  isDead: boolean;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  type: 'arrow' | 'fireball' | 'flame' | 'spell_fireball' | 'spell_barrel' | 'heal_aura';
  side: 'player' | 'enemy';
  targetTroopId?: string;
  targetTowerId?: string;
  radius?: number;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number; // scales from 0 to 1
}

export const ClashArenaView: React.FC<ClashArenaProps> = ({ onClose, user, myProfile }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [gameResult, setGameResult] = useState<'victory' | 'defeat' | null>(null);
  const [elixir, setElixir] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(90); // 1:30 mins match
  const [playerCrowns, setPlayerCrowns] = useState(0);
  const [enemyCrowns, setEnemyCrowns] = useState(0);
  const [doubleElixir, setDoubleElixir] = useState(false);

  // Deck State
  const [deck, setDeck] = useState<Card[]>([]);
  const [nextCard, setNextCard] = useState<Card>(CARDS_POOL[0]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Game Arena Entities
  const troopsRef = useRef<Troop[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // DOM Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Visual Image Elements Loader cache
  const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => {
    // Prime images
    CARDS_POOL.forEach(card => {
      const img = new Image();
      img.src = card.image;
      imagesRef.current[card.id] = img;
    });
  }, []);

  // Initialize the game
  const initGame = () => {
    // Setup Deck
    const shuffled = [...CARDS_POOL].sort(() => 0.5 - Math.random());
    const initialDeck = shuffled.slice(0, 4);
    const nextSlot = shuffled[4];
    setDeck(initialDeck);
    setNextCard(nextSlot);
    setSelectedCardId(null);

    setElixir(5);
    setSecondsLeft(90);
    setPlayerCrowns(0);
    setEnemyCrowns(0);
    setDoubleElixir(false);
    setGameResult(null);

    // Setup Towers (Coordinates on a virtual scale of 400x600)
    towersRef.current = [
      // Enemeis
      { id: 'enemy_king', side: 'enemy', type: 'king', x: 200, y: 70, hp: 3000, maxHp: 3000, range: 170, lastAttackTime: 0, isDead: false },
      { id: 'enemy_left', side: 'enemy', type: 'princess', x: 85, y: 140, hp: 1800, maxHp: 1800, range: 180, lastAttackTime: 0, isDead: false },
      { id: 'enemy_right', side: 'enemy', type: 'princess', x: 315, y: 140, hp: 1800, maxHp: 1800, range: 180, lastAttackTime: 0, isDead: false },
      // Player
      { id: 'player_king', side: 'player', type: 'king', x: 200, y: 530, hp: 3000, maxHp: 3000, range: 170, lastAttackTime: 0, isDead: false },
      { id: 'player_left', side: 'player', type: 'princess', x: 85, y: 460, hp: 1800, maxHp: 1800, range: 180, lastAttackTime: 0, isDead: false },
      { id: 'player_right', side: 'player', type: 'princess', x: 315, y: 460, hp: 1800, maxHp: 1800, range: 180, lastAttackTime: 0, isDead: false },
    ];

    troopsRef.current = [];
    projectilesRef.current = [];
    floatingTextsRef.current = [];

    setIsPlaying(true);
  };

  // Elixir + Time Game loops
  useEffect(() => {
    if (!isPlaying || gameResult) return;

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          endMatch();
          return 0;
        }
        if (prev === 31) {
          setDoubleElixir(true);
        }
        return prev - 1;
      });
    }, 1000);

    const elixirRate = doubleElixir ? 0.6 : 0.35;
    const elixirTimer = setInterval(() => {
      setElixir(prev => Math.min(prev + elixirRate, 10));
    }, 1000);

    // Enemy Deployment Loop (AI)
    const aiTimer = setInterval(() => {
      spawnEnemyAI();
    }, 5500);

    return () => {
      clearInterval(timer);
      clearInterval(elixirTimer);
      clearInterval(aiTimer);
    };
  }, [isPlaying, gameResult, doubleElixir]);

  // Audio mute sync
  useEffect(() => {
    synthInstance.muted = isMuted;
  }, [isMuted]);

  // Ends match and calculates crowns
  const endMatch = () => {
    let finalP = 0;
    let finalE = 0;
    towersRef.current.forEach(t => {
      if (t.isDead) {
        if (t.side === 'enemy') finalP++;
        if (t.side === 'player') finalE++;
      }
    });

    if (finalP > finalE) {
      setGameResult('victory');
      synthInstance.playFanfare(true);
    } else if (finalE > finalP) {
      setGameResult('defeat');
      synthInstance.playFanfare(false);
    } else {
      // Draw breaker or random victory for game satisfaction
      const coin = Math.random() > 0.5;
      setGameResult(coin ? 'victory' : 'defeat');
      synthInstance.playFanfare(coin);
    }
  };

  // Immediate game loss/victory trigger
  const triggerSuddenDeath = (winningSide: 'player' | 'enemy') => {
    if (winningSide === 'player') {
      setPlayerCrowns(3);
      setGameResult('victory');
      synthInstance.playFanfare(true);
    } else {
      setEnemyCrowns(3);
      setGameResult('defeat');
      synthInstance.playFanfare(false);
    }
  };

  // Enemy Spawns
  const spawnEnemyAI = () => {
    if (gameResult) return;
    const cards = CARDS_POOL;
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    
    // Pick lane (left princess or right princess or center king)
    const aliveTowers = towersRef.current.filter(t => t.side === 'enemy' && !t.isDead);
    if (aliveTowers.length === 0) return;

    const baseTower = aliveTowers[Math.floor(Math.random() * aliveTowers.length)];
    const xOffset = (Math.random() - 0.5) * 40;
    
    if (randomCard.playType === 'spell') {
      const playerTroops = troopsRef.current.filter(t => t.side === 'player');
      let targetX = 200;
      let targetY = 460;
      if (playerTroops.length > 0) {
        const randT = playerTroops[Math.floor(Math.random() * playerTroops.length)];
        targetX = randT.x;
        targetY = randT.y;
      }
      projectilesRef.current.push({
        id: Math.random().toString(),
        x: 200, y: 70, // Enemy King origin
        targetX, targetY,
        speed: 2.5,
        damage: randomCard.damage,
        type: randomCard.id === 'fireball' ? 'spell_fireball' : 'spell_barrel',
        side: 'enemy',
        radius: randomCard.radius || 40
      });
      return;
    }
    
    troopsRef.current.push({
      id: Math.random().toString(),
      name: randomCard.name,
      side: 'enemy',
      x: baseTower.x + xOffset,
      y: baseTower.y + 30,
      hp: randomCard.hp * 0.9, // Enemy balanced slightly lower
      maxHp: randomCard.hp * 0.9,
      damage: randomCard.damage,
      range: randomCard.range,
      speed: randomCard.speed,
      type: randomCard.type,
      attackType: randomCard.attackType,
      attackSpeed: randomCard.attackSpeed,
      lastAttackTime: 0,
      cardId: randomCard.id,
      color: randomCard.color,
      playType: randomCard.playType,
      targetBuildingOnly: randomCard.targetBuildingOnly
    });
  };

  // Spawns troop for player
  const spawnPlayerTroop = (card: Card, x: number, y: number) => {
    if (elixir < card.cost) return;

    setElixir(prev => prev - card.cost);
    synthInstance.playSpawn();

    if (card.playType === 'spell') {
      projectilesRef.current.push({
        id: Math.random().toString(),
        x: 200, y: 530, // Player King origin
        targetX: x, targetY: y,
        speed: 2.5,
        damage: card.damage,
        type: card.id === 'fireball' ? 'spell_fireball' : 'spell_barrel',
        side: 'player',
        radius: card.radius || 40
      });
    } else {
      troopsRef.current.push({
        id: Math.random().toString(),
        name: card.name,
        side: 'player',
        x: x,
        y: y,
        hp: card.hp,
        maxHp: card.hp,
        damage: card.damage,
        range: card.range,
        speed: card.speed,
        type: card.type,
        attackType: card.attackType,
        attackSpeed: card.attackSpeed,
        lastAttackTime: 0,
        cardId: card.id,
        color: card.color,
        playType: card.playType,
        targetBuildingOnly: card.targetBuildingOnly
      });
    }

    // Spawn Cloud particle or floating text
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x: x,
      y: y - 20,
      text: card.name,
      color: '#60a5fa',
      life: 1.0
    });

    // Cycle Deck
    const nextHand = deck.map(c => c.id === card.id ? nextCard : c);
    setDeck(nextHand);

    // Pick a new next card
    let newNext = CARDS_POOL[Math.floor(Math.random() * CARDS_POOL.length)];
    while (nextHand.some(c => c.id === newNext.id)) {
      newNext = CARDS_POOL[Math.floor(Math.random() * CARDS_POOL.length)];
    }
    setNextCard(newNext);
    setSelectedCardId(null);
  };

  // Main Canvas Loop
  useEffect(() => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      updatePhysics(dt, time);
      drawArena(ctx, canvas);

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isPlaying, selectedCardId]);

  // Calculation formulas for closest target / direction
  const updatePhysics = (dt: number, currentTime: number) => {
    const troops = troopsRef.current;
    const towers = towersRef.current;
    const projectiles = projectilesRef.current;
    const floating = floatingTextsRef.current;

    // 1. Process Floating Text
    for (let i = floating.length - 1; i >= 0; i--) {
      floating[i].y -= dt * 35;
      floating[i].life -= dt * 1.5;
      if (floating[i].life <= 0) {
        floating.splice(i, 1);
      }
    }

    // 2. Process Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        // Impact
        synthInstance.playExplosion();
        
        // Handle Area of Effect Spells/Splash
        const isAoE = p.type === 'spell_fireball' || p.type === 'spell_barrel' || p.type === 'heal_aura' || (!p.targetTroopId && !p.targetTowerId);
        
        if (isAoE) {
          const radius = p.radius || 35;
          if (p.type === 'heal_aura') {
             // Heal friendly troops
             troops.forEach(t => {
                if (t.side === p.side && Math.hypot(t.x - p.x, t.y - p.y) <= radius) {
                   t.hp += p.damage;
                   if (t.hp > t.maxHp) t.hp = t.maxHp;
                   floatingTextsRef.current.push({ id: Math.random().toString(), x: t.x, y: t.y - 15, text: `+${p.damage}`, color: '#22c55e', life: 0.9 });
                }
             });
          } else {
             // Damage enemies
             troops.forEach(t => {
                if (t.side !== p.side && Math.hypot(t.x - p.x, t.y - p.y) <= radius) {
                   t.hp -= p.damage;
                   spawnDamageText(t.x, t.y, p.damage, t.side);
                }
             });
             towers.forEach(tw => {
                if (tw.side !== p.side && !tw.isDead && Math.hypot(tw.x - p.x, tw.y - p.y) <= radius) {
                   const twDmg = Math.floor(p.damage * 0.4); // Tower damage reduced for spells
                   tw.hp -= twDmg;
                   spawnDamageText(tw.x, tw.y, twDmg, tw.side);
                }
             });
          }
        } else {
          // Normal single target
          if (p.targetTroopId) {
            const t = troops.find(tr => tr.id === p.targetTroopId);
            if (t) {
              t.hp -= p.damage;
              spawnDamageText(t.x, t.y, p.damage, t.side);
            }
          } else if (p.targetTowerId) {
            const tw = towers.find(tow => tow.id === p.targetTowerId);
            if (tw && !tw.isDead) {
              tw.hp -= p.damage;
              spawnDamageText(tw.x, tw.y, p.damage, tw.side);
            }
          }
        }
        projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * p.speed * dt * 250;
        p.y += (dy / dist) * p.speed * dt * 250;
      }
    }

    // 3. Process Troops Behavior & Movement
    troops.forEach(t => {
      if (t.hp <= 0) return;

      // Buildings decay mechanic (Tesla)
      if (t.playType === 'building') {
         t.hp -= t.maxHp * 0.05 * dt; // Loses 5% max HP per second
         if (t.hp <= 0) return;
      }

      // Find Closest Enemy
      let closestTarget: { x: number, y: number, isTroop: boolean, refId: string } | null = null;
      let minDist = Infinity;

      // Scan opposing troops if allowed
      if (!t.targetBuildingOnly) {
        troops.forEach(enemy => {
          if (enemy.side !== t.side && enemy.hp > 0 && enemy.playType !== 'building') {
            const d = Math.hypot(enemy.x - t.x, enemy.y - t.y);
            if (d < minDist) {
              minDist = d;
              closestTarget = { x: enemy.x, y: enemy.y, isTroop: true, refId: enemy.id };
            }
          }
        });
      }

      // Scan opposing towers
      towers.forEach(tow => {
        if (tow.side !== t.side && !tow.isDead) {
          const d = Math.hypot(tow.x - t.x, tow.y - t.y);
          if (d < minDist) {
            minDist = d;
            closestTarget = { x: tow.x, y: tow.y, isTroop: false, refId: tow.id };
          }
        }
      });

      // Scan opposing buildings
      troops.forEach(enemy => {
        if (enemy.side !== t.side && enemy.hp > 0 && enemy.playType === 'building') {
          const d = Math.hypot(enemy.x - t.x, enemy.y - t.y);
          if (d < minDist) {
            minDist = d;
            closestTarget = { x: enemy.x, y: enemy.y, isTroop: true, refId: enemy.id };
          }
        }
      });

      if (!closestTarget) return;

      // Combat Check
      if (minDist <= t.range) {
        // Inside attack range -> ATTACK!
        if (currentTime - t.lastAttackTime >= t.attackSpeed) {
          t.lastAttackTime = currentTime;
          
          if (t.attackType === 'melee' || t.attackType === 'heal') {
            synthInstance.playMelee();

            // Self-destruct mechanic (Fire Spirit)
            if (t.cardId === 'fire_spirit') {
               t.hp = 0; // kill self
               projectiles.push({
                 id: Math.random().toString(),
                 x: t.x, y: t.y, targetX: t.x, targetY: t.y,
                 speed: 99, damage: t.damage, type: 'flame', side: t.side, radius: 45
               });
               return; // skip standard melee hit
            }
            
            // Heal mechanic (Battle Healer)
            if (t.attackType === 'heal') {
               projectiles.push({
                 id: Math.random().toString(),
                 x: t.x, y: t.y, targetX: t.x, targetY: t.y,
                 speed: 99, damage: 45, type: 'heal_aura', side: t.side, radius: 60
               });
            }

            // Deal direct damage
            if (closestTarget.isTroop) {
              const enemy = troops.find(tr => tr.id === closestTarget!.refId);
              if (enemy) {
                enemy.hp -= t.damage;
                spawnDamageText(enemy.x, enemy.y, t.damage, enemy.side);
                
                // Electro Giant mini-stun zap response if he is attacked? Actually, this is when HE attacks.
                if (t.cardId === 'electro_giant') {
                   enemy.lastAttackTime += 600; // stun delay 0.6s
                }
              }
            } else {
              const tow = towers.find(tw => tw.id === closestTarget!.refId);
              if (tow) {
                tow.hp -= t.damage;
                spawnDamageText(tow.x, tow.y, t.damage, tow.side);
              }
            }
          } else {
            // Ranged projectile
            synthInstance.playRanged();
            projectiles.push({
              id: Math.random().toString(),
              x: t.x,
              y: t.y,
              targetX: closestTarget.x,
              targetY: closestTarget.y,
              speed: 2.0,
              damage: t.damage,
              type: t.attackType === 'splash' ? 'flame' : 'fireball',
              side: t.side,
              radius: t.attackType === 'splash' ? 35 : undefined,
              targetTroopId: t.attackType === 'splash' ? undefined : (closestTarget.isTroop ? closestTarget.refId : undefined),
              targetTowerId: t.attackType === 'splash' ? undefined : (!closestTarget.isTroop ? closestTarget.refId : undefined)
            });
            
            // Electro Dragon stun mechanic on ranged attack
            if (t.cardId === 'electro_dragon' || t.cardId === 'tesla') {
               if (closestTarget.isTroop) {
                 const enemy = troops.find(tr => tr.id === closestTarget!.refId);
                 if (enemy) enemy.lastAttackTime += 500; // stun delay 0.5s
               }
            }
          }
        }
      } else {
        // Movement Logic
        if (t.speed > 0) {
          let steerX = closestTarget.x;
          let steerY = closestTarget.y;

          if (t.type === 'ground') {
            const isPlayerSide = t.y > 320;
            const targetIsOnOtherSide = (isPlayerSide && closestTarget.y < 280) || (!isPlayerSide && closestTarget.y > 320);

            if (targetIsOnOtherSide) {
              const leftBridgeX = 85;
              const rightBridgeX = 315;
              const bridgeY = 300;

              const bridgeX = t.x < 200 ? leftBridgeX : rightBridgeX;

              const isAtBridgeZone = Math.abs(t.y - bridgeY) < 15;
              if (!isAtBridgeZone) {
                steerX = bridgeX;
                steerY = bridgeY;
              }
            }
          }

          const angle = Math.atan2(steerY - t.y, steerX - t.x);
          t.x += Math.cos(angle) * t.speed * dt * 55;
          t.y += Math.sin(angle) * t.speed * dt * 55;
        }
      }
    });

    // 4. Princess/King Tower Shooting Defenses
    towers.forEach(tow => {
      if (tow.isDead) return;

      // Scan closest alive opposing troop
      let closestTroop: Troop | null = null;
      let minDist = Infinity;

      troops.forEach(enemy => {
        if (enemy.side !== tow.side && enemy.hp > 0) {
          const d = Math.hypot(enemy.x - tow.x, enemy.y - tow.y);
          if (d < minDist) {
            minDist = d;
            closestTroop = enemy;
          }
        }
      });

      if (closestTroop && minDist <= tow.range) {
        if (currentTime - tow.lastAttackTime >= 1000) { // towers shoot every 1 second
          tow.lastAttackTime = currentTime;
          synthInstance.playRanged();
          projectiles.push({
            id: Math.random().toString(),
            x: tow.x,
            y: tow.y - 12,
            targetX: closestTroop.x,
            targetY: closestTroop.y,
            speed: 2.2,
            damage: tow.type === 'king' ? 85 : 70,
            type: 'arrow',
            side: tow.side,
            targetTroopId: closestTroop.id
          });
        }
      }
    });

    // 5. Check Troop Death & Clean up
    for (let i = troops.length - 1; i >= 0; i--) {
      if (troops[i].hp <= 0) {
        troops.splice(i, 1);
      }
    }

    // 6. Check Tower Death & Scoring Crowns
    let updateScore = false;
    towers.forEach(tow => {
      if (!tow.isDead && tow.hp <= 0) {
        tow.isDead = true;
        updateScore = true;

        // Splendid explosion particle effect
        floatingTextsRef.current.push({
          id: Math.random().toString(),
          x: tow.x,
          y: tow.y,
          text: tow.type === 'king' ? 'TURM ZERSTÖRT! 👑' : 'KRONENTURM ENTWURZELT!',
          color: '#ef4444',
          life: 2.2
        });

        if (tow.type === 'king') {
          // Instant game end
          triggerSuddenDeath(tow.side === 'enemy' ? 'player' : 'enemy');
        }
      }
    });

    if (updateScore) {
      let pC = 0;
      let eC = 0;
      towers.forEach(t => {
        if (t.isDead) {
          if (t.side === 'enemy') pC++;
          if (t.side === 'player') eC++;
        }
      });
      setPlayerCrowns(pC);
      setEnemyCrowns(eC);
    }
  };

  // Damage Texts helper
  const spawnDamageText = (x: number, y: number, dmg: number, side: 'player' | 'enemy') => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x: x + (Math.random() - 0.5) * 20,
      y: y - 10,
      text: `-${dmg}`,
      color: side === 'player' ? '#fca5a5' : '#fed7aa',
      life: 0.9
    });
  };

  // Graphic Rendering Logic
  const drawArena = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const W = 400;
    const H = 600;

    // Clear Canvas
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    
    // Draw background turf / grass pattern
    ctx.fillStyle = '#4ade80'; // Lush active grass
    ctx.fillRect(0, 0, W, H);

    // Grid lines for depth
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
       ctx.beginPath();
       ctx.moveTo(x, 0);
       ctx.lineTo(x, H);
       ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
       ctx.beginPath();
       ctx.moveTo(0, y);
       ctx.lineTo(W, y);
       ctx.stroke();
    }

    // 1. Draw River Center (y=280..320)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 280, W, 40);

    // River banks details
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 276, W, 4);
    ctx.fillRect(0, 320, W, 4);

    // Flowing Water Lines
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 295);
    ctx.lineTo(120, 295);
    ctx.moveTo(180, 305);
    ctx.lineTo(260, 305);
    ctx.moveTo(300, 292);
    ctx.lineTo(370, 292);
    ctx.stroke();

    // 2. Draw Bridges
    const drawBridge = (bx: number) => {
      // wood shadows
      ctx.fillStyle = '#451a03';
      ctx.fillRect(bx - 25, 275, 50, 50);
      // logs texture
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx - 22, 278, 44, 44);
      // rope bounds
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx - 24, 275, 4, 50);
      ctx.fillRect(bx + 20, 275, 4, 50);
    };
    drawBridge(85);
    drawBridge(315);

    // Spawn Safe Zone Indicator (only below river for Player spawn, and not too close to bridge)
    if (selectedCardId) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.fillRect(10, 325, W - 20, H - 325 - 40);
      
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(10, 325, W - 20, H - 325 - 40);
      ctx.setLineDash([]);
    }

    // 3. Draw Towers
    towersRef.current.forEach(t => {
      if (t.isDead) {
        // Draw ruined debris
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.type === 'king' ? 24 : 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4b5563';
        ctx.stroke();
        return;
      }

      // Draw active beautiful tower base
      const isPlayer = t.side === 'player';
      const r = t.type === 'king' ? 28 : 18;

      ctx.fillStyle = isPlayer ? '#1e3a8a' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner platform
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(t.x, t.y, r - 4, 0, Math.PI * 2);
      ctx.fill();

      // Crown / Top Decors
      ctx.fillStyle = isPlayer ? '#2563eb' : '#dc2626';
      ctx.fillRect(t.x - 10, t.y - 12, 20, 2);

      // Draw Crown Icon or Royal Shield flag
      ctx.fillStyle = '#eab308'; // royal gold
      ctx.beginPath();
      ctx.moveTo(t.x - 6, t.y - 4);
      ctx.lineTo(t.x - 4, t.y + 4);
      ctx.lineTo(t.x + 4, t.y + 4);
      ctx.lineTo(t.x + 6, t.y - 4);
      ctx.lineTo(t.x, t.y);
      ctx.fill();

      // Tower HP percentage Bar
      const pct = t.hp / t.maxHp;
      ctx.fillStyle = '#374151';
      ctx.fillRect(t.x - 20, t.y + r + 6, 40, 6);
      ctx.fillStyle = isPlayer ? '#10b981' : '#ef4444';
      ctx.fillRect(t.x - 20, t.y + r + 6, 40 * pct, 6);
    });

    // 4. Draw Projectiles
    projectilesRef.current.forEach(p => {
      // Visual style based on type
      let color = '#ec4899';
      let rad = 7;
      if (p.type === 'arrow') { color = '#1e293b'; rad = 3; }
      else if (p.type === 'spell_fireball' || p.type === 'fireball') { color = '#f97316'; rad = 8; }
      else if (p.type === 'spell_barrel') { color = '#d97706'; rad = 10; }
      else if (p.type === 'flame') { color = '#facc15'; rad = 6; }
      else if (p.type === 'heal_aura') { color = '#4ade80'; rad = 15; }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();

      // Tails / accents
      if (p.type === 'spell_fireball' || p.type === 'fireball') {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y + 3, rad / 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spell_barrel') {
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // 5. Draw Active Battle Troops with circular clipped real profiles!
    troopsRef.current.forEach(t => {
      const isPlayer = t.side === 'player';
      const size = t.name === 'P.E.K.K.A.' ? 17 : 13;

      ctx.save();
      
      // Draw outer circle accent shadow
      ctx.fillStyle = isPlayer ? '#2563eb' : '#dc2626';
      ctx.beginPath();
      ctx.arc(t.x, t.y, size + 2, 0, Math.PI * 2);
      ctx.fill();

      // Attempt clip drawing of pre-loaded assets
      const loadedImg = imagesRef.current[t.cardId];
      if (loadedImg && loadedImg.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(loadedImg, t.x - size, t.y - size, size * 2, size * 2);
        ctx.restore();
      } else {
        // Fallback flat color with initials
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'black 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.name.substring(0, 2), t.x, t.y);
      }

      ctx.restore();

      // Flight shadow indicator or visual accents
      if (t.type === 'flying') {
        // tiny wings on sides
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(t.x - size - 2, t.y);
        ctx.lineTo(t.x - size - 8, t.y - 6);
        ctx.moveTo(t.x + size + 2, t.y);
        ctx.lineTo(t.x + size + 8, t.y - 6);
        ctx.stroke();
      }

      // Live HP indicators above head
      const pct = t.hp / t.maxHp;
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(t.x - 14, t.y - size - 8, 28, 4);

      ctx.fillStyle = isPlayer ? '#10b981' : '#f43f5e';
      ctx.fillRect(t.x - 14, t.y - size - 8, 28 * Math.max(0, pct), 4);
    });

    // 6. Draw floating score metrics
    floatingTextsRef.current.forEach(txt => {
       ctx.fillStyle = txt.color;
       ctx.font = '900 13px system-ui';
       ctx.textAlign = 'center';
       ctx.fillText(txt.text, txt.x, txt.y);
    });

    ctx.restore();
  };

  // Convert click coordinates relative code
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedCardId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate scaling ratio
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 400;
    const clickY = ((e.clientY - rect.top) / rect.height) * 600;

    // Rules logic: target valid spawn zones
    // Spells can be cast anywhere.
    // Troops must be on player territory (y > 320) unless a tower is down (rule skipped for simplicity)
    const activeCard = CARDS_POOL.find(c => c.id === selectedCardId);
    if (!activeCard) return;

    if (activeCard.playType === 'spell' || (clickY > 320 && clickY < 580)) {
      spawnPlayerTroop(activeCard, clickX, clickY);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg h-[92vh] bg-gradient-to-b from-[#1b2519] to-[#0d160c] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.25)] flex flex-col items-center border border-emerald-900/30">
        
        {/* Top Header - Crown Scores & System Metrics */}
        <div className="w-full bg-[#1c2c1a] border-b border-emerald-950 px-4 py-3 flex items-center justify-between shadow-md z-15">
           <div className="flex items-center gap-2">
              <span className="text-mc-gold font-black tracking-wide text-sm bg-black/40 px-2.5 py-1.5 rounded-lg border border-yellow-600 flex items-center gap-1">
                 Arena 1 👑
              </span>
           </div>

           {/* Core Score Counter */}
           <div className="flex items-center gap-4 bg-black/50 px-4 py-1 rounded-full border border-neutral-700/50">
             <div className="flex items-center gap-1.5">
               <Crown className="text-blue-500" size={17} fill="#3b82f6" />
               <span className="text-white font-black text-lg">{playerCrowns}</span>
             </div>
             <span className="text-neutral-500 font-bold text-xs">V/S</span>
             <div className="flex items-center gap-1.5">
               <span className="text-white font-black text-lg">{enemyCrowns}</span>
               <Crown className="text-red-500" size={17} fill="#ef4444" />
             </div>
           </div>

           <div className="flex items-center gap-2">
              {/* Sound Button */}
              <button 
                onClick={() => setIsMuted(prev => !prev)}
                className="bg-black/55 text-neutral-300 p-2 rounded-lg hover:text-white transition"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              
              <button 
                onClick={onClose}
                className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-lg transition"
              >
                <X size={16} />
              </button>
           </div>
        </div>

        {/* Tactical Battlefield Sandbox */}
        <div 
          ref={containerRef}
          className="relative flex-1 w-full bg-[#34621c] overflow-hidden select-none cursor-crosshair"
        >
          <canvas 
            ref={canvasRef}
            width={400}
            height={600}
            onClick={handleCanvasClick}
            className="w-full h-full block touch-none"
          />

          {/* Prompt Overlay to start or finish match */}
          {!isPlaying && !gameResult && (
            <div className="absolute inset-0 bg-black/75 z-20 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
               <Crown className="text-yellow-400 mb-2 drop-shadow-lg" size={64} fill="currentColor" />
               <h3 className="text-mc-gold text-2xl font-black uppercase tracking-widest text-yellow-400">Tactical Clash Royale</h3>
               <p className="text-neutral-300 text-xs mt-2 max-w-xs mb-6">
                 Bringe deine Einheiten geschickt ein, verteidige deine eigene Basis und starte zerstörerische Offensiven!
               </p>
               <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={initGame}
                  className="bg-gradient-to-b from-yellow-400 to-yellow-600 text-yellow-950 font-black text-xl px-12 py-4 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.5),_0_0_0_4px_#ca8a04_inset] border-2 border-yellow-200"
               >
                 SPIEL STARTEN ⚔️
               </motion.button>
            </div>
          )}

          {/* End Match Verdict */}
          {gameResult && (
            <div className="absolute inset-0 bg-black/85 z-25 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
               <motion.div
                 initial={{ scale: 0.5, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="flex flex-col items-center"
               >
                 {gameResult === 'victory' ? (
                   <>
                     <Trophy className="text-yellow-400 w-20 h-20 mb-4 animate-bounce" />
                     <h2 className="text-yellow-400 text-4xl font-extrabold uppercase tracking-wide">SIEG! 👑</h2>
                     <p className="text-white text-sm font-bold mt-2">Drei-Kronen-Erfolg erzielt!</p>
                   </>
                 ) : (
                   <>
                     <Shield className="text-red-500 w-20 h-20 mb-4 animate-pulse" />
                     <h2 className="text-red-500 text-4xl font-extrabold uppercase tracking-wide">NIEDERLAGE</h2>
                     <p className="text-neutral-400 text-sm mt-2">Nächstes Mal eroberst du den Turm!</p>
                   </>
                 )}

                 <div className="flex gap-4 mt-8">
                   <button
                     onClick={initGame}
                     className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow"
                   >
                     <RotateCcw size={16} /> REVANCHE
                   </button>
                   <button
                     onClick={onClose}
                     className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 px-6 rounded-xl"
                   >
                     SCHLIESSEN
                   </button>
                 </div>
               </motion.div>
            </div>
          )}

          {/* Real-time Game HUD (Timer and Double Elixir alert) */}
          {isPlaying && !gameResult && (
            <div className="absolute bottom-4 right-4 pointer-events-none flex flex-col items-end gap-1">
               <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                  <span className="text-white font-mono text-sm font-bold">
                    {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
                  </span>
               </div>
               
               {doubleElixir && (
                 <motion.span 
                   animate={{ scale: [1, 1.1, 1] }}
                   transition={{ repeat: Infinity, duration: 1 }}
                   className="bg-purple-600 text-white font-black text-[10px] px-2 py-0.5 rounded border border-purple-400 uppercase tracking-widest block"
                 >
                   2x Elixier active! 🔥
                 </motion.span>
               )}
            </div>
          )}
        </div>

        {/* Card Deck Footer Overlay */}
        <div className="w-full bg-[#121c10] border-t-2 border-emerald-900/60 p-3 pt-4 flex flex-col relative z-20 box-border rounded-b-2xl">
          {/* Elixir Management Bar */}
          <div className="h-6 w-full bg-black/75 rounded-full mb-3 overflow-hidden border border-purple-950 relative shadow-inner">
             <div 
               className="h-full bg-gradient-to-r from-fuchsia-600/90 to-purple-600 transition-all duration-[800ms] ease-out"
               style={{ width: `${(elixir / 10) * 100}%` }}
             />
             <div className="absolute inset-0 flex items-center justify-between px-3">
                 <div className="flex items-center gap-1">
                   <Droplet className="text-fuchsia-400 fill-fuchsia-400 drop-shadow animate-pulse" size={15} />
                   <span className="text-fuchsia-100 font-black text-sm">{Math.floor(elixir)}</span>
                 </div>
                 <span className="text-purple-400 font-bold text-[10px] uppercase tracking-widest">Elixier</span>
             </div>
          </div>
          
          {/* Deck Choices */}
          <div className="flex gap-2 w-full max-w-md mx-auto items-end select-none">
            {deck.map((card) => {
              const affordable = elixir >= card.cost;
              const isSelected = selectedCardId === card.id;

              return (
                <motion.button 
                  key={card.id}
                  disabled={!isPlaying || gameResult !== null}
                  onClick={() => setSelectedCardId(isSelected ? null : card.id)}
                  whileHover={{ y: affordable ? -12 : 0 }}
                  className={`flex-1 aspect-[3/4.2] rounded-xl border-2 overflow-hidden relative shadow-lg cursor-pointer flex flex-col transition-all ${
                    isSelected 
                      ? 'border-yellow-400 ring-2 ring-yellow-400 -translate-y-5 shadow-[0_15px_25px_rgba(234,179,8,0.25)] scale-105'
                      : affordable 
                        ? 'border-neutral-700 hover:border-blue-400 bg-neutral-900' 
                        : 'border-neutral-800 bg-neutral-950 opacity-60'
                  }`}
                >
                  {/* Card Visual Artwork */}
                  <div className="flex-1 w-full relative bg-neutral-900 border-b border-neutral-800 pointer-events-none">
                     <img 
                       src={card.image} 
                       alt={card.name} 
                       referrerPolicy="no-referrer"
                       className="w-full h-full object-cover"
                     />
                     
                     {/* HP & DMG Stats */}
                     <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                       <span className="text-[7px] font-black bg-black/60 text-white px-1 py-0.2 rounded border border-white/5 flex items-center gap-0.5">
                         <Heart size={6} className="text-red-500 fill-red-500" /> {card.hp}
                       </span>
                       <span className="text-[7px] font-black bg-black/60 text-white px-1 py-0.2 rounded border border-white/5 flex items-center gap-0.5">
                         <Swords size={6} className="text-blue-400" /> {card.damage}
                       </span>
                     </div>
                  </div>

                  {/* Card Footer Info */}
                  <div className="py-1 bg-neutral-950 flex flex-col items-center leading-none">
                    <span className="text-[8px] font-black truncate uppercase text-neutral-200 py-0.5">{card.name}</span>
                  </div>

                  {/* Elixir Bubbles */}
                  <div className={`absolute -top-1 -left-1 flex items-center justify-center rounded-full w-6 h-6 border-2 border-neutral-950 z-10 shadow ${
                     affordable ? 'bg-fuchsia-600' : 'bg-neutral-800'
                  }`}>
                     <span className="text-[10px] font-black text-white">{card.cost}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
          
          {/* Queue Slot */}
          <div className="absolute bottom-3 left-3 w-12 aspect-[3/4] bg-neutral-950 rounded-lg border border-emerald-950 flex flex-col items-center justify-between py-1.5 opacity-80 backdrop-blur-md">
             <span className="text-[8px] text-neutral-400 font-extrabold uppercase tracking-wider leading-none">NÄCHSTE</span>
             <div className="w-8 h-8 rounded-full border border-neutral-800 overflow-hidden bg-neutral-900">
               <img 
                 src={nextCard.image} 
                 alt="Next item" 
                 referrerPolicy="no-referrer"
                 className="w-full h-full object-cover"
               />
             </div>
             <span className="text-[9px] font-black text-fuchsia-400">{nextCard.cost} 💧</span>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
