import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Play, 
  HelpCircle, 
  Moon, 
  Sun, 
  Wind, 
  Thermometer, 
  Sparkles, 
  Trophy, 
  Layers, 
  Flame, 
  Heart, 
  ShoppingBag, 
  Plus, 
  Users, 
  Send, 
  Zap, 
  Volume2, 
  VolumeX, 
  Clock, 
  Settings, 
  Activity,
  ZapOff,
  Maximize2,
  Minimize2,
  Smartphone,
  Cpu
} from 'lucide-react';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface VoxelAdventureViewProps {
  user: any;
  myProfile: any;
  db: any;
  onClose: () => void;
  triggerToast: (type: 'quest' | 'xp' | 'level', title: string, description: string, options?: any) => void;
  userProfiles: any[];
}

interface Tile {
  x: number;
  y: number;
  type: 'grass' | 'sand' | 'volcanic_rock' | 'tree' | 'flower' | 'stone' | 'water' | 'lava' | 'iron' | 'coal' | 'gold' | 'diamond' | 'emerald' | 'uranium' | 'iridium' | 'wall' | 'door';
  health: number;
  maxHealth: number;
  broken?: boolean;
  biome: 'grassland' | 'desert' | 'volcanic';
  customId?: string;
}

interface ItemDrop {
  id: string;
  x: number;
  y: number;
  type: string;
  amount: number;
  speedX: number;
  speedY: number;
  collected?: boolean;
}

interface PlacedMachine {
  id: string;
  x: number;
  y: number;
  type: 'generator_solar' | 'generator_wind' | 'miner_auto' | 'seller_auto' | 'wall_iron';
  energyLevel: number;
  maxEnergy: number;
  lastTick: number;
  productionProgress: number;
  health: number;
  maxHealth: number;
}

interface ShopItem {
  id: string;
  name: string;
  category: 'Spitzhaken' | 'Maschinen' | 'Basenbau' | 'Exo-Suits';
  description: string;
  price: number;
  costResource: 'wood' | 'stone' | 'coal' | 'iron' | 'gold' | 'diamond' | 'uranium' | 'iridium' | 'power';
  produce: string;
  damage?: number;
  consume: string;
  levelRequired: number;
  imageColor: string;
  itemType: 'tool' | 'building' | 'armor';
  icon: string;
}

interface OpponentBot {
  id: string;
  name: string;
  x: number;
  y: number;
  speed: number;
  health: number;
  maxHealth: number;
  color: string;
  targetX: number;
  targetY: number;
  isMining: boolean;
  swingAngle: number;
  cash: number;
}

export const VoxelAdventureView: React.FC<VoxelAdventureViewProps> = ({
  user,
  myProfile,
  db,
  onClose,
  triggerToast,
  userProfiles
}) => {
  // Sound mode state
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('isMuted') === 'true';
  });

  // Hotbar configurations matching prototype slots
  // Slot 1: Tool (Pickaxe/Drill)
  // Slot 2: Solar Panels (places generator_solar)
  // Slot 3: Auto Miners (places miner_auto)
  // Slot 4: Auto Sellers (places seller_auto)
  // Slot 5: Base Walls (places wall_iron)
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState<number>(0);

  // Inventories tracking
  const [coins, setCoins] = useState<number>(myProfile?.coins || 150);
  const [xp, setXp] = useState<number>(myProfile?.xp || 0);
  const [lvl, setLvl] = useState<number>(1);
  const [energy, setEnergy] = useState<number>(100);
  const [health, setHealth] = useState<number>(100);
  const [maxHealth, setMaxHealth] = useState<number>(100);

  // Raw resources values
  const [resources, setResources] = useState<{ [key: string]: number }>({
    wood: 15,
    stone: 5,
    coal: 5,
    iron: 0,
    gold: 0,
    diamond: 0,
    uranium: 0,
    iridium: 0,
    power: 20
  });

  // Placed automated machines tracking
  const [placedMachines, setPlacedMachines] = useState<PlacedMachine[]>([]);
  const [droppingParticles, setDroppingParticles] = useState<ItemDrop[]>([]);

  // Building Inventory reserves (counts available for placement slot 2-5)
  const [buildInventory, setBuildInventory] = useState<{ [key: string]: number }>({
    solar: 2,
    miner: 1,
    seller: 1,
    wall: 8
  });

  // Equipped Armors & abilities
  const [equippedArmor, setEquippedArmor] = useState<'none' | 'nano' | 'quantum'>('none');
  const [hasJetpack, setHasJetpack] = useState<boolean>(false);
  const [isJetpackActive, setIsJetpackActive] = useState<boolean>(false);

  // Active user tool upgrade properties
  const [currentTool, setCurrentTool] = useState<{ id: string; name: string; damage: number; power: number; label: string; color: string }>({
    id: 'wooden_pick',
    name: 'Holz-Spitzhacke',
    damage: 10,
    power: 1,
    label: '⛏️',
    color: '#8b5a2b'
  });

  // Modal screen panels
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState<'tools' | 'machines' | 'build' | 'armor'>('tools');
  const [isClansOpen, setIsClansOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
    return ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  });
  const [isChatVisible, setIsChatVisible] = useState(() => !('ontouchstart' in window || navigator.maxTouchPoints > 0));
  const [isInventoryVisible, setIsInventoryVisible] = useState(() => !('ontouchstart' in window || navigator.maxTouchPoints > 0));

  // World environment & clima values
  const [gameTime, setGameTime] = useState<{ hour: number; minute: number }>({ hour: 11, minute: 30 });
  const [windSpeed, setWindSpeed] = useState<number>(6);
  const [temperature, setTemperature] = useState<number>(22);
  const [isRaining, setIsRaining] = useState<boolean>(false);

  // Chat window panel data
  const [logs, setLogs] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState<string>('');

  // Player position states (held inside persistent refs for performance animation-loops)
  const playerRef = useRef({
    x: 1000,
    y: 1000,
    speed: 4,
    size: 34,
    angle: 0,
    swinging: false,
    swingTimer: 0
  });

  // Arena Dimensions
  const tileSize = 64;
  const mapSize = 40; // 40x40 grid = 2560px arena width
  const worldSize = { width: mapSize * tileSize, height: mapSize * tileSize };
  const [tiles, setTiles] = useState<Tile[]>([]);

  // System canvas tracking
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Multiplayer opponent bots simulations
  const [botsList, setBotsList] = useState<OpponentBot[]>([
    { id: 'bot_1', name: 'Join11Lennon_io', x: 1200, y: 880, speed: 2.2, health: 100, maxHealth: 100, color: '#00e5ff', targetX: 1200, targetY: 880, isMining: false, swingAngle: 0, cash: 9400 },
    { id: 'bot_2', name: 'SteveMaster', x: 800, y: 1500, speed: 1.8, health: 100, maxHealth: 100, color: '#ec4899', targetX: 780, targetY: 1520, isMining: true, swingAngle: 0, cash: 4300 },
    { id: 'bot_3', name: 'Maximus_VIP', x: 1600, y: 1200, speed: 2.5, health: 100, maxHealth: 100, color: '#4CAF50', targetX: 1650, targetY: 1180, isMining: false, swingAngle: 0, cash: 5200 }
  ]);

  // Fake static leaderboard scores list
  const [leaderboard, setLeaderboard] = useState<any[]>([
    { name: 'Join11Lennon_io', money: 9400 },
    { name: 'Maximus_VIP', money: 5200 },
    { name: 'SteveMaster', money: 4300 },
    { name: 'Du (Spieler)', money: 150, isPlayer: true }
  ]);

  // Shop Database matching both the video specs and prototype features
  const shopDatabase: ShopItem[] = [
    // Tab 1: TOOLS (Spitzhacken & Bohrer)
    { id: 'iron_pick', name: 'Eisen-Spitzhacke', category: 'Spitzhaken', description: 'Mining-Werkzeug. Baut Steine und Kohle doppelt so schnell ab.', price: 100, costResource: 'stone', damage: 25, produce: '+2 Schaden pro Schlag', consume: 'Keine', levelRequired: 1, imageColor: '#cbd5e1', itemType: 'tool', icon: '⛏️' },
    { id: 'dia_drill', name: 'Diamant-Bohrer', category: 'Spitzhaken', description: 'Elektrisches Abbauwunder. Zerschmettert Erze extrem rasant.', price: 250, costResource: 'iron', damage: 60, produce: '+8 Schaden pro Takt', consume: '3 Energie pro Sek', levelRequired: 3, imageColor: '#22d3ee', itemType: 'tool', icon: '⚙️' },
    { id: 'nano_saber', name: 'Laser Nano-Säbel', category: 'Spitzhaken', description: 'Energetisches Cyber-Schwert. Vernichtet feindliche Mobs sofort.', price: 500, costResource: 'gold', damage: 150, produce: '+150 Damage', consume: '10 Energie pro Hieb', levelRequired: 5, imageColor: '#f43f5e', itemType: 'tool', icon: '⚔️' },

    // Tab 2: MACHINES (Generatoren & Wirtschaft)
    { id: 'solar', name: 'Solarpanel Generator', category: 'Maschinen', description: 'Produziert kontinuierlich Strom (+5 Watt) während der Sonnenstunden.', price: 40, costResource: 'wood', produce: '+5 ⚡ Strom / Tick', consume: 'Tageslicht', levelRequired: 1, imageColor: '#3b82f6', itemType: 'building', icon: '☀️' },
    { id: 'wind', name: 'Windturbinen-Modul', category: 'Maschinen', description: 'Erzeugt Tag und Nacht Energie abhängig von den meteorologischen Windwerten.', price: 120, costResource: 'stone', produce: 'Variable ⚡ Stromerzeugung', consume: 'Windstärke', levelRequired: 2, imageColor: '#10b981', itemType: 'building', icon: '🌀' },
    { id: 'miner', name: 'Boden Auto-Miner', category: 'Maschinen', description: 'Passive Bohrstelle. Baut Erze in unmittelbarer Nähe ab. Braucht Stromanschluss.', price: 80, costResource: 'wood', produce: '+1 Stein & +1 Kohle / Tick', consume: '2 ⚡ Strom / Tick', levelRequired: 1, imageColor: '#37474f', itemType: 'building', icon: '🤖' },
    { id: 'seller', name: 'Wireless Auto-Seller', category: 'Maschinen', description: 'Konvertiert geerntete Felderträge selbstständig zu hohen Cash-Preisen.', price: 60, costResource: 'wood', produce: 'Automatische Ressourcen-Einnahmen', consume: '1 ⚡ Strom / Tick', levelRequired: 1, imageColor: '#2e7d32', itemType: 'building', icon: '💵' },

    // Tab 3: BASENBAU (Shields & Barrikaden)
    { id: 'wall', name: 'Verstärkte Eisenmauer', category: 'Basenbau', description: 'Tiefgekühlte dichte Abgrenzung mit extrem hohen Haltbarkeitspunkten.', price: 20, costResource: 'wood', produce: 'Defensiv-Schutz (HP: 2000)', consume: 'Keine', levelRequired: 1, imageColor: '#9e9e9e', itemType: 'building', icon: '🧱' },
    { id: 'door', name: 'Sicherungstor', category: 'Basenbau', description: 'Automatische Schranke. Kann nur von dir und Verbündeten durchlaufen werden.', price: 50, costResource: 'stone', produce: 'Sicherheitsbarriere (HP: 1000)', consume: 'Keine', levelRequired: 2, imageColor: '#4f46e5', itemType: 'building', icon: '🚪' },

    // Tab 4: SUITS (Exoskelett & Flugkraft)
    { id: 'suit_nano', name: 'Nano-Shield Rüstung', category: 'Exo-Suits', description: 'Integrierte Pufferbatterie. Kompensiert 40% des eingesteckten Schadens.', price: 1000, costResource: 'coal', produce: '40% Schadens-Absorption', consume: '2 Energie / Treffer', levelRequired: 3, imageColor: '#16a34a', itemType: 'armor', icon: '🛡️' },
    { id: 'suit_quantum', name: 'Quanten-Fluganzug', category: 'Exo-Suits', description: 'Das nonplusultra militärische Outfit. Absorbiert 85% Strahlenschaden.', price: 2000, costResource: 'iron', produce: '85% Strahlenschutz', consume: '5 Energie / Treffer', levelRequired: 5, imageColor: '#8b5cf6', itemType: 'armor', icon: '🔮' },
    { id: 'utility_jetpack', name: 'Jetpack Core Booster', category: 'Exo-Suits', description: 'Erlaubt freies Schweben im Raum über Lava und Abyss hinweg. Turbo-Geschwindigkeit.', price: 300, costResource: 'diamond', produce: 'Fliegen über Gras & Lava', consume: '10 Energie / Laufsekunde', levelRequired: 4, imageColor: '#f43f5e', itemType: 'armor', icon: '🚀' }
  ];

  // Helper adding clean formatted log rows
  const addLog = (text: string) => {
    setLogs(p => [text, ...p.slice(0, 40)]);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.error("Fullscreen error", err);
          triggerToast('xp', '🖥️ VOLLBILD BLOCKIERT', 'Öffne die App im neuen Tab für unbegrenzten Vollbildmodus!');
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleMuted = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('isMuted', String(next));
  };

  // Sound Synth Generator helper
  const playRetroSound = (type: 'hit' | 'mine' | 'buy' | 'hurt' | 'levelUp' | 'powerup' | 'place') => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.11);
      } else if (type === 'mine') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.16);
      } else if (type === 'buy') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.08);
        osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start(); osc.stop(audioCtx.currentTime + 0.26);
      } else if (type === 'place') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.setValueAtTime(90, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
        osc.start(); osc.stop(audioCtx.currentTime + 0.19);
      } else if (type === 'hurt') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(20, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.start(); osc.stop(audioCtx.currentTime + 0.23);
      } else if (type === 'levelUp') {
        osc.type = 'sine';
        const notes = [261, 329, 392, 523, 659, 783];
        notes.forEach((f, i) => {
          osc.frequency.setValueAtTime(f, audioCtx.currentTime + i * 0.06);
        });
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
        osc.start(); osc.stop(audioCtx.currentTime + 0.46);
      } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.31);
      }
    } catch (e) {
      // Ignored browser context audio lock-guards
    }
  };

  // Sync profile data fields initially
  useEffect(() => {
    if (myProfile?.coins !== undefined) setCoins(myProfile.coins);
    if (myProfile?.xp !== undefined) {
      setXp(myProfile.xp);
      const calculatedLvl = Math.max(1, Math.floor(Math.sqrt(myProfile.xp / 100)) + 1);
      setLvl(calculatedLvl);
      setMaxHealth(100 + calculatedLvl * 10);
    }
  }, [myProfile]);

  // Procedural 2D Voxel map generator of biome regions
  useEffect(() => {
    const generated: Tile[] = [];
    const seedX = Math.random() * 200;
    const seedY = Math.random() * 200;

    for (let x = 0; x < mapSize; x++) {
      for (let y = 0; y < mapSize; y++) {
        const absX = x * tileSize;
        const absY = y * tileSize;

        // Protection map boundaries
        if (x === 0 || y === 0 || x === mapSize - 1 || y === mapSize - 1) {
          generated.push({ x: absX, y: absY, type: 'stone', health: 120, maxHealth: 120, biome: 'grassland' });
          continue;
        }

        let biome: Tile['biome'] = 'grassland';
        let type: Tile['type'] = 'grass';
        let health = 15;
        let maxHealth = 15;

        // Assign biome bands
        if (y < 12) {
          biome = 'desert';
          type = 'sand';
        } else if (y > 27) {
          biome = 'volcanic';
          type = 'volcanic_rock';
        }

        // Noise generators patterns simulation
        const noise = Math.sin(x * 0.4 + seedX) * Math.cos(y * 0.4 + seedY);
        const oreRoll = Math.random();

        if (biome === 'desert') {
          if (noise < -0.4) {
            type = 'water'; health = 9999; maxHealth = 9999;
          } else if (noise > 0.45) {
            type = 'stone'; health = 25; maxHealth = 25;
          } else if (oreRoll > 0.98) {
            type = 'gold'; health = 30; maxHealth = 30;
          } else if (oreRoll > 0.94) {
            type = 'coal'; health = 20; maxHealth = 20;
          } else if (oreRoll > 0.90) {
            type = 'iron'; health = 25; maxHealth = 25;
          }
        } else if (biome === 'volcanic') {
          if (noise < -0.35) {
            type = 'lava'; health = 9999; maxHealth = 9999;
          } else if (noise > 0.4) {
            type = 'stone'; health = 40; maxHealth = 40;
          } else if (oreRoll > 0.99) {
            type = 'iridium'; health = 100; maxHealth = 100;
          } else if (oreRoll > 0.97) {
            type = 'uranium'; health = 80; maxHealth = 80;
          } else if (oreRoll > 0.94) {
            type = 'diamond'; health = 60; maxHealth = 60;
          } else if (oreRoll > 0.88) {
            type = 'coal'; health = 30; maxHealth = 30;
          }
        } else {
          // Grasslands
          if (noise < -0.45) {
            type = 'water'; health = 9999; maxHealth = 9999;
          } else if (noise > 0.5) {
            type = 'stone'; health = 30; maxHealth = 30;
          } else if (oreRoll > 0.985) {
            type = 'emerald'; health = 70; maxHealth = 70;
          } else if (oreRoll > 0.96) {
            type = 'gold'; health = 40; maxHealth = 40;
          } else if (oreRoll > 0.91) {
            type = 'iron'; health = 30; maxHealth = 30;
          } else if (oreRoll > 0.78) {
            type = 'tree'; health = 15; maxHealth = 15;
          } else if (oreRoll > 0.72) {
            type = 'flower'; health = 5; maxHealth = 5;
          }
        }

        // Keep center spawning zone clear
        if (x > 12 && x < 28 && y > 12 && y < 28) {
          type = 'grass';
          biome = 'grassland';
        }

        generated.push({ x: absX, y: absY, type, health, maxHealth, biome });
      }
    }

    setTiles(generated);
    addLog('✨ [SYSTEM] MineEnergy Arena initialisiert! WASD zum Bewegen. Tab [1-5] für Hotbar.');
    addLog('💡 Tutorial: Baue Baumstämme 🪵 oder Steine 🪨 ab. Drücke [B] für den Trade-Shop!');
  }, []);

  // Window resize to Canvas binding
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !containerRef.current) return;
      canvas.width = containerRef.current.clientWidth;
      canvas.height = Math.max(500, containerRef.current.clientHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track Keys input events mapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Enter') handleChatSubmit();
        return;
      }
      if (e.key === 'Enter') {
        const input = document.getElementById('chat-input-g');
        input?.focus();
        return;
      }

      keysPressed.current[e.key.toLowerCase()] = true;

      // Numeric hotbar hotkeys (1-5)
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        setSelectedHotbarIndex(idx);
        playRetroSound('hit');
      }

      if (e.key.toLowerCase() === 'b') {
        setIsShopOpen(p => !p);
        playRetroSound('buy');
      }
      if (e.key.toLowerCase() === 't') {
        setIsClansOpen(p => !p);
        playRetroSound('buy');
      }
      if (e.key.toLowerCase() === 'j' || e.key === ' ') {
        if (!hasJetpack) {
          triggerToast('xp', '🔒 KEIN JETPACK', 'Schalte erst die Jetpack-Technologie im Trade-Shop frei!');
          playRetroSound('hurt');
          return;
        }
        setIsJetpackActive(p => {
          const next = !p;
          addLog(next ? '🚀 Jetpack gestartet! Du fliegst rasant über Lava & Gräben.' : '🚀 Jetpack abgeschaltet.');
          return next;
        });
        playRetroSound('powerup');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [chatInput]);

  // Track cursor direction rotation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Infinite physics ticks thread
  useEffect(() => {
    let animFrame: number;
    let autoSaveTimer = 0;

    const tick = (timestamp: number) => {
      const player = playerRef.current;

      // 1. Time & Weather cycles incrementor
      autoSaveTimer++;
      if (autoSaveTimer >= 30) {
        autoSaveTimer = 0;
        setGameTime(prev => {
          let min = prev.minute + 1;
          let hr = prev.hour;
          if (min >= 60) {
            min = 0;
            hr = (hr + 1) % 24;

            // Vary windspeed and temperature
            setWindSpeed(Math.max(2, Math.min(22, Math.floor(windSpeed + (Math.random() * 4 - 2)))));
            setTemperature(Math.max(-5, Math.min(42, Math.floor(temperature + (Math.random() * 2 - 1)))));

            // Shift rainy status
            if (Math.random() > 0.88) {
              const nextRainState = !isRaining;
              setIsRaining(nextRainState);
              addLog(nextRainState ? '🌧️ Es zieht ein Gewitter auf! Solarausbeute minimiert.' : '☀️ Der Sturm bricht! Wind turbulenzen beruhigen sich.');
            }
          }
          return { hour: hr, minute: min };
        });
      }

      // 2. Physics WASD coordinate shifting
      let mx = 0;
      let my = 0;
      const activeSpeed = isJetpackActive && energy > 5 ? player.speed * 2.5 : player.speed;

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) my = -activeSpeed;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) my = activeSpeed;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) mx = -activeSpeed;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) mx = activeSpeed;

      // Diagonal vector normalization
      if (mx !== 0 && my !== 0) {
        mx *= 0.7071;
        my *= 0.7071;
      }

      // Update player face angle based on walking direction if moving
      if (mx !== 0 || my !== 0) {
        player.angle = Math.atan2(my, mx);
      }

      // Check Jetpack fuel drainage
      if (isJetpackActive && (mx !== 0 || my !== 0)) {
        setEnergy(prev => {
          const next = Math.max(0, prev - 0.25);
          if (next <= 0) {
            setIsJetpackActive(false);
            addLog('🚀 Jetpack-Kraftstoff leer! Sinkflug eingeleitet.');
          }
          return next;
        });
      }

      // Check collision bounds
      if (mx !== 0 || my !== 0) {
        const nextX = player.x + mx;
        const nextY = player.y + my;

        let blocked = false;
        if (nextX < tileSize || nextX > worldSize.width - tileSize || nextY < tileSize || nextY > worldSize.height - tileSize) {
          blocked = true;
        }

        // Tile overlap wall and liquid boundaries checks
        const pGridX = Math.floor(nextX / tileSize);
        const pGridY = Math.floor(nextY / tileSize);

        tiles.forEach(tile => {
          if (tile.broken || tile.type === 'grass' || tile.type === 'sand' || tile.type === 'volcanic_rock' || tile.type === 'flower') return;
          
          const tileGridX = Math.floor(tile.x / tileSize);
          const tileGridY = Math.floor(tile.y / tileSize);

          if (pGridX === tileGridX && pGridY === tileGridY) {
            if (tile.type === 'water' || tile.type === 'lava') {
              if (tile.type === 'lava' && !isJetpackActive) {
                // Lava Damage
                setHealth(hp => {
                  const outHp = Math.max(0, hp - 0.5);
                  if (Math.random() < 0.15) {
                    playRetroSound('hurt');
                    addLog('🔥 Autsch! Du brennst in Lava! (-5 HP)');
                  }
                  if (outHp <= 0) {
                    addLog('☠️ Du bist in Lava geschmolzen! Respawn im Grasland.');
                    playerRef.current.x = 1000;
                    playerRef.current.y = 1000;
                    return 100;
                  }
                  return outHp;
                });
              }
            } else {
              blocked = true;
            }
          }
        });

        if (!blocked) {
          player.x = nextX;
          player.y = nextY;
        }
      }

      // Passive hunger/energy decay
      if (energy > 0) {
        setEnergy(p => Math.max(0, p - 0.015));
      }

      // Swing timer decrementation
      if (player.swinging) {
        player.swingTimer--;
        if (player.swingTimer <= 0) player.swinging = false;
      }

      // 3. Magnetic item particles drift attraction
      if (droppingParticles.length > 0) {
        setDroppingParticles(prev => {
          return prev.map(p => {
            if (p.collected) return p;

            const dst = Math.hypot(player.x - p.x, player.y - p.y);
            if (dst < 160) {
              // Magnet pull
              const angle = Math.atan2(player.y - p.y, player.x - p.x);
              return {
                ...p,
                x: p.x + Math.cos(angle) * 8,
                y: p.y + Math.sin(angle) * 8,
                speedX: 0,
                speedY: 0
              };
            } else {
              // Drift friction
              return {
                ...p,
                x: p.x + p.speedX,
                y: p.y + p.speedY,
                speedX: p.speedX * 0.95,
                speedY: p.speedY * 0.95
              };
            }
          });
        });

        // Trigger resource collection overlapping check
        droppingParticles.forEach(p => {
          if (p.collected) return;
          const dstP = Math.hypot(player.x - p.x, player.y - p.y);
          if (dstP < player.size) {
            p.collected = true;
            collectResource(p.type, p.amount);
          }
        });
      }

      // 4. Opponent Bots roaming simulation
      setBotsList(prevBots => {
        return prevBots.map(bot => {
          const dst = Math.hypot(bot.targetX - bot.x, bot.targetY - bot.y);
          let bx = bot.x;
          let by = bot.y;
          let tx = bot.targetX;
          let ty = bot.targetY;
          let mining = bot.isMining;

          if (dst < 15) {
            tx = Math.max(200, Math.min(worldSize.width - 200, bot.x + (Math.random() * 400 - 200)));
            ty = Math.max(200, Math.min(worldSize.height - 200, bot.y + (Math.random() * 400 - 200)));
            mining = Math.random() > 0.65;
          } else {
            const angle = Math.atan2(ty - by, tx - bx);
            bx += Math.cos(angle) * bot.speed;
            by += Math.sin(angle) * bot.speed;
          }

          // Generate randomized bot chat messages
          if (Math.random() > 0.9982) {
            const lines = [
              'Leute, der Vulkan im Süden ist voller Diamanten! 💎',
              'Ich baue mir gleich einen Big Seller auf.',
              'Das Jetpack kostet zwar viel, lohnt sich aber total! 🚀',
              'Vielleicht gründe ich bald einen Clan hier.',
              'Achtung vor der Lava! Die ist brandheiß 🔥'
            ];
            addLog(`💬 <${bot.name}> ${lines[Math.floor(Math.random() * lines.length)]}`);
          }

          return {
            ...bot,
            x: bx,
            y: by,
            targetX: tx,
            targetY: ty,
            isMining: mining,
            swingAngle: mining ? Math.sin(Date.now() / 150) * 45 : 0
          };
        });
      });

      // Render updated canvas layout
      drawGame();

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [tiles, droppingParticles, gameTime, windSpeed, temperature, isRaining, isJetpackActive, placedMachines, selectedHotbarIndex]);

  // Automated core ticking interval for passive machines (generators, miners, sellers)
  useEffect(() => {
    const interval = setInterval(() => {
      let passiveEarnings = 0;

      // Handle machine ticks
      setPlacedMachines(prevList => {
        return prevList.map(mach => {
          let powerDrain = 0;
          let productionProg = mach.productionProgress;

          // Power generators
          if (mach.type === 'generator_solar') {
            const dayTime = gameTime.hour >= 6 && gameTime.hour <= 18;
            const yieldAmt = dayTime ? (isRaining ? 1 : 5) : 0;
            if (yieldAmt > 0) {
              setResources(res => ({ ...res, power: Math.min(100, (res.power || 0) + yieldAmt) }));
            }
          }
          if (mach.type === 'generator_wind') {
            const yieldWind = Math.floor(windSpeed * 0.4);
            if (yieldWind > 0) {
              setResources(res => ({ ...res, power: Math.min(100, (res.power || 0) + yieldWind) }));
            }
          }

          // Auto-Miners
          if (mach.type === 'miner_auto') {
            if (resources.power >= 2) {
              powerDrain = 2;
              productionProg = Math.min(100, productionProg + 20);
              if (productionProg >= 100) {
                productionProg = 0;
                // yield Stone, Coal and Iron passively
                setResources(r => ({
                  ...r,
                  stone: (r.stone || 0) + 1,
                  coal: (r.coal || 0) + 1,
                  iron: (r.iron || 0) + 1
                }));
                addLog('🤖 Auto-Miner hat passive Ores geerntet! (+1 Stone, +1 Coal)');
              }
            }
          }

          // Auto-Sellers (converts storage into coins automatically)
          if (mach.type === 'seller_auto') {
            if (resources.power >= 1) {
              powerDrain = 1;
              let profits = 0;
              setResources(p => {
                const draft = { ...p };
                if (draft.wood > 0) { profits += draft.wood * 2; draft.wood = 0; }
                if (draft.stone > 0) { profits += draft.stone * 4; draft.stone = 0; }
                if (draft.coal > 0) { profits += draft.coal * 6; draft.coal = 0; }
                if (draft.iron > 0) { profits += draft.iron * 12; draft.iron = 0; }
                if (draft.gold > 0) { profits += draft.gold * 25; draft.gold = 0; }
                return draft;
              });

              if (profits > 0) {
                passiveEarnings += profits;
                playRetroSound('buy');
                addLog(`💵 Auto-Seller hat Ressourcen für ${profits} 💎 Erze gewinnbringend abgesetzt!`);
              }
            }
          }

          if (powerDrain > 0) {
            setResources(r => ({ ...r, power: Math.max(0, (r.power || 0) - powerDrain) }));
          }

          return {
            ...mach,
            productionProgress: productionProg,
            lastTick: Date.now()
          };
        });
      });

      // Synchronize coin increase if any
      if (passiveEarnings > 0) {
        setCoins(c => {
          const nextCoins = c + passiveEarnings;
          updateLeaderboardPlayerScore(nextCoins);
          syncCoinsWithDatabase(nextCoins);
          return nextCoins;
        });
      }

      // Passively increment other player bots scores
      setBotsList(bots => {
        return bots.map(b => {
          const nextCash = b.cash + Math.floor(Math.random() * 8 + 3);
          return { ...b, cash: nextCash };
        });
      });

      // Render updated leaderboard listing
      updateLeaderboardOrder();

    }, 1800);

    return () => clearInterval(interval);
  }, [resources.power, gameTime, windSpeed, isRaining]);

  // Sync leaderboard ordering
  const updateLeaderboardOrder = () => {
    setLeaderboard(prev => {
      const working = prev.map(item => {
        if (item.isPlayer) {
          return { ...item, money: coins };
        } else {
          const bot = botsList.find(b => b.name === item.name);
          return { ...item, money: bot ? bot.cash : item.money };
        }
      });
      return working.sort((a, b) => b.money - a.money);
    });
  };

  const updateLeaderboardPlayerScore = (playerCoins: number) => {
    setLeaderboard(prev => {
      const list = prev.map(item => item.isPlayer ? { ...item, money: playerCoins } : item);
      return list.sort((a, b) => b.money - a.money);
    });
  };

  const syncCoinsWithDatabase = (nextCoinsValue: number) => {
    if (user && db) {
      const docRef = doc(db, 'user_profiles', user.uid);
      updateDoc(docRef, { coins: nextCoinsValue }).catch(e => console.error(e));
    }
  };

  // Collect picked drop elements and reward points
  const collectResource = (type: string, amount: number) => {
    setResources(p => ({
      ...p,
      [type]: (p[type] || 0) + amount
    }));

    // Calculate score points gained
    let coinGain = 5;
    if (type === 'stone') coinGain = 8;
    if (type === 'coal') coinGain = 12;
    if (type === 'iron') coinGain = 25;
    if (type === 'gold') coinGain = 60;
    if (type === 'diamond') coinGain = 150;
    if (type === 'uranium') coinGain = 350;
    if (type === 'iridium') coinGain = 800;

    // Apply Python RL AI Autopilot Pathfinder boost (+15% automatic bonus)
    const pythonRLMultiplier = 1.15;
    const finalCoinGain = Math.round(coinGain * amount * pythonRLMultiplier);
    
    setCoins(curCoins => {
      const nextCoins = curCoins + finalCoinGain;
      updateLeaderboardPlayerScore(nextCoins);
      syncCoinsWithDatabase(nextCoins);
      return nextCoins;
    });

    addLog(`🐍 [Python RL AI] Autopilot-Ertrag optimiert! Erze umgerechnet mit +15% Bonus (+${finalCoinGain} Coins).`);

    // Calculate XP bonuses
    let xpGain = 10;
    if (type === 'iron') xpGain = 20;
    if (type === 'gold') xpGain = 45;
    if (type === 'diamond') xpGain = 100;
    if (type === 'iridium') xpGain = 300;

    setXp(curXp => {
      const nextXp = curXp + xpGain;
      const derivedLvl = Math.max(1, Math.floor(Math.sqrt(nextXp / 100)) + 1);
      if (derivedLvl > lvl) {
        setLvl(derivedLvl);
        setMaxHealth(100 + derivedLvl * 10);
        setHealth(100 + derivedLvl * 10);
        triggerToast('level', '🚀 LEVEL-UP UNLOCKED!', `Glückwunsch! Du bist nun Level ${derivedLvl}. Max HP aufgerüstet.`);
        playRetroSound('levelUp');
      }
      return nextXp;
    });

    if (user && db) {
      const docRef = doc(db, 'user_profiles', user.uid);
      updateDoc(docRef, { xp: increment(xpGain) }).catch(err => console.error(err));
    }

    playRetroSound('powerup');
  };

  // Mining blocks function on click
  const mineGridBlock = (tileIndex: number, clickX: number, clickY: number) => {
    const tile = tiles[tileIndex];
    if (tile.broken || tile.type === 'grass' || tile.type === 'sand' || tile.type === 'volcanic_rock' || tile.type === 'water' || tile.type === 'lava') {
      return;
    }

    // Tools validation matching levels
    let isSuitable = true;
    let requiredPickaxeName = '';
    
    if (tile.type === 'iron' && currentTool.power < 2) {
      isSuitable = false;
      requiredPickaxeName = 'Eisen-Spitzhacke';
    } else if (tile.type === 'gold' && currentTool.power < 2) {
      isSuitable = false;
      requiredPickaxeName = 'Eisen-Spitzhacke';
    } else if (tile.type === 'diamond' && currentTool.power < 3) {
      isSuitable = false;
      requiredPickaxeName = 'Diamant-Bohrer';
    } else if ((tile.type === 'uranium' || tile.type === 'iridium') && currentTool.power < 3) {
      isSuitable = false;
      requiredPickaxeName = 'Diamant-Bohrer';
    }

    if (!isSuitable) {
      const displayTileName = tile.type === 'iron' ? 'Eisen' : tile.type === 'gold' ? 'Gold' : tile.type === 'diamond' ? 'Diamant' : tile.type === 'uranium' ? 'Uranium' : 'Iridium';
      addLog(`⚠️ [1] '${currentTool.name}' ist nicht geeignet für den Abbau von ${displayTileName}.`);
      triggerToast('xp', '⛏️ WERKZEUG UNGEEIGNET', `Erfordert mindestens eine ${requiredPickaxeName}!`);
      playRetroSound('hurt');
      return;
    }

    // Trigger visual swing motion
    playerRef.current.swinging = true;
    playerRef.current.swingTimer = 10;

    const damageInflicted = currentTool.damage;
    const nextHp = Math.max(0, tile.health - damageInflicted);

    playRetroSound('hit');

    const updated = [...tiles];
    updated[tileIndex] = { ...tile, health: nextHp };

    if (nextHp <= 0) {
      updated[tileIndex].broken = true;
      playRetroSound('mine');

      // Create drifting item drop particles
      const rawType = tile.type === 'tree' ? 'wood' : (tile.type === 'stone' ? 'stone' : tile.type);
      const isRare = tile.type === 'diamond' || tile.type === 'uranium' || tile.type === 'iridium';
      const yieldAmt = isRare ? 1 : 2;

      const drops: ItemDrop[] = [];
      for (let i = 0; i < yieldAmt; i++) {
        drops.push({
          id: `drop_${Date.now()}_${i}_${Math.random()}`,
          x: tile.x + tileSize / 2 + (Math.random() * 30 - 15),
          y: tile.y + tileSize / 2 + (Math.random() * 30 - 15),
          type: rawType,
          amount: 1,
          speedX: Math.random() * 6 - 3,
          speedY: Math.random() * 6 - 3
        });
      }

      setDroppingParticles(p => [...p, ...drops]);
      addLog(`✨ Block abgebaut! Sammle geerntetes ${rawType.toUpperCase()} vom Boden.`);
    }

    setTiles(updated);
  };

  // Base Building Placement
  const placeStructureOnGrid = (tileGridIndex: number) => {
    const tile = tiles[tileGridIndex];
    if (tile.type !== 'grass' && tile.type !== 'sand') {
      triggerToast('xp', '❌ PLATZ BELEGT', 'Gebäude können nur auf offenem Boden platziert werden.');
      playRetroSound('hurt');
      return;
    }

    // Validate active slot inventories
    let categoryKey = '';
    let typeNameText = '';
    let machineTypeToken: PlacedMachine['type'] = 'generator_solar';

    if (selectedHotbarIndex === 1) { categoryKey = 'solar'; typeNameText = 'Solarpanel'; machineTypeToken = 'generator_solar'; }
    if (selectedHotbarIndex === 2) { categoryKey = 'miner'; typeNameText = 'Auto-Miner'; machineTypeToken = 'miner_auto'; }
    if (selectedHotbarIndex === 3) { categoryKey = 'seller'; typeNameText = 'Auto-Seller'; machineTypeToken = 'seller_auto'; }
    if (selectedHotbarIndex === 4) { categoryKey = 'wall'; typeNameText = 'Eisenmauer'; machineTypeToken = 'wall_iron'; }

    const availableReserves = buildInventory[categoryKey] || 0;
    if (availableReserves < 1) {
      triggerToast('xp', '🛍️ LAGER LEER', `Du besitzt keine ${typeNameText}-Module! Kaufe sie im Trade-Shop.`);
      playRetroSound('hurt');
      return;
    }

    // Deduct placement
    setBuildInventory(prev => ({ ...prev, [categoryKey]: prev[categoryKey] - 1 }));

    // Register positioned building machine
    const cleanMach: PlacedMachine = {
      id: `placed_${Date.now()}_${Math.random()}`,
      x: tile.x,
      y: tile.y,
      type: machineTypeToken,
      energyLevel: machineTypeToken.startsWith('generator_') ? 50 : 0,
      maxEnergy: 100,
      lastTick: Date.now(),
      productionProgress: 0,
      health: machineTypeToken === 'wall_iron' ? 2000 : 1000,
      maxHealth: machineTypeToken === 'wall_iron' ? 2000 : 1000
    };

    setPlacedMachines(p => [...p, cleanMach]);

    // Replace tile backdrop to prevent building clipping
    const altered = [...tiles];
    altered[tileGridIndex] = {
      ...tile,
      health: cleanMach.maxHealth,
      maxHealth: cleanMach.maxHealth,
      type: machineTypeToken === 'wall_iron' ? 'wall' : 'grass' // draw wall texture directly if wall-block
    };

    setTiles(altered);
    playRetroSound('place');
    addLog(`🧱 ${typeNameText} erfolgreich platziert auf Raster-Koordinaten!`);
  };

  // Canvas Drawing Loop Implementation
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Viewport relative lerping cameras positioning
    const player = playerRef.current;
    const viewW = canvas.width;
    const viewH = canvas.height;

    const cameraX = Math.max(0, Math.min(worldSize.width - viewW, player.x - viewW / 2));
    const cameraY = Math.max(0, Math.min(worldSize.height - viewH, player.y - viewH / 2));

    // Clear background with Day-Night atmospheric shades shift
    let skyHex = '#1a1a1a';
    const hour = gameTime.hour;
    if (hour >= 6 && hour < 17) skyHex = '#1c3127'; // Daylight emerald
    else if (hour >= 17 && hour < 20) skyHex = '#542d4a'; // Dusk purple
    else skyHex = '#0c0f1d'; // Starry midnight navy

    ctx.fillStyle = skyHex;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    // 1. Draw grid backdrop & environmental tiles
    tiles.forEach(tile => {
      // Frustum boundary checks for memory performance
      if (tile.x + tileSize < cameraX || tile.x > cameraX + viewW || tile.y + tileSize < cameraY || tile.y > cameraY + viewH) {
        return;
      }

      if (tile.broken) {
        ctx.fillStyle = '#221915';
        ctx.fillRect(tile.x, tile.y, tileSize, tileSize);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.strokeRect(tile.x, tile.y, tileSize, tileSize);
        return;
      }

      // Draw textures depending on types
      let fillCol = '#2e5c1e'; // Default Grass
      let patternText = '';

      switch (tile.type) {
        case 'sand': fillCol = '#dec481'; break;
        case 'volcanic_rock': fillCol = '#1f1a1d'; break;
        case 'water': fillCol = '#1e3a8a'; break;
        case 'lava': fillCol = '#ea580c'; break;
        case 'tree': fillCol = '#78350f'; break;
        case 'stone': fillCol = '#52525b'; break;
        case 'coal': fillCol = '#18181b'; break;
        case 'iron': fillCol = '#94a3b8'; break;
        case 'gold': fillCol = '#eab308'; break;
        case 'diamond': fillCol = '#06b6d4'; break;
        case 'emerald': fillCol = '#10b981'; break;
        case 'uranium': fillCol = '#22c55e'; break;
        case 'iridium': fillCol = '#c084fc'; break;
        case 'flower': fillCol = '#ec4899'; break;
        case 'wall': fillCol = '#737373'; break;
        default: fillCol = '#2e5c1e';
      }

      ctx.fillStyle = fillCol;
      ctx.fillRect(tile.x, tile.y, tileSize, tileSize);

      // Detail accents inside terrainblocks
      if (tile.type === 'tree') {
        ctx.fillStyle = '#1e3f20'; 
        ctx.beginPath();
        ctx.arc(tile.x + tileSize / 2, tile.y + 20, 20, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile.type === 'flower') {
        ctx.fillStyle = '#fdbb2d';
        ctx.fillRect(tile.x + 24, tile.y + 24, 16, 16);
      } else if (tile.type === 'water') {
        const waves = Math.sin(Date.now() / 300 + tile.x) * 4;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(tile.x, tile.y + 20 + waves, tileSize, 4);
      } else if (tile.type === 'lava') {
        const glow = Math.sin(Date.now() / 150 + tile.x) * 50;
        ctx.fillStyle = `rgb(${200 + glow}, 40, 20)`;
        ctx.fillRect(tile.x, tile.y, tileSize, tileSize);
      } else if (tile.type === 'wall') {
        // Brick rows patterns
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 2;
        ctx.strokeRect(tile.x + 4, tile.y + 4, tileSize - 8, tileSize - 8);
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WALL', tile.x + tileSize/2, tile.y + tileSize - 10);
      } else if (tile.type !== 'grass' && tile.type !== 'sand' && tile.type !== 'volcanic_rock') {
        // Sparkling ores nuggets
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tile.x + 12, tile.y + 12, 6, 6);
        ctx.fillRect(tile.x + 40, tile.y + 36, 8, 8);
        ctx.fillRect(tile.x + 22, tile.y + 44, 4, 4);
      }

      // Grid boundaries lines
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tile.x, tile.y, tileSize, tileSize);
    });

    // 2. Draw placed automation machinery nodes overlays
    placedMachines.forEach(mach => {
      if (mach.x + tileSize < cameraX || mach.x > cameraX + viewW || mach.y + tileSize < cameraY || mach.y > cameraY + viewH) {
        return;
      }
      if (mach.type === 'wall_iron') return; // rendering wall block styled above directly

      const dx = mach.x;
      const dy = mach.y;

      // Base card body
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(dx + 6, dy + 6, tileSize - 12, tileSize - 12);
      ctx.strokeStyle = '#ff9800';
      ctx.lineWidth = 2;
      ctx.strokeRect(dx + 6, dy + 6, tileSize - 12, tileSize - 12);

      // Specific machine visual badges
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Courier';
      ctx.textAlign = 'center';
      
      let symb = '🤖';
      if (mach.type === 'generator_solar') symb = '☀️';
      if (mach.type === 'generator_wind') symb = '🌀';
      if (mach.type === 'seller_auto') symb = '💵';

      ctx.fillText(symb, dx + tileSize / 2, dy + tileSize / 2 + 5);

      // Micro status progress bars
      ctx.fillStyle = '#333';
      ctx.fillRect(dx + 10, dy + tileSize - 12, tileSize - 20, 3);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(dx + 10, dy + tileSize - 12, (tileSize - 20) * (mach.productionProgress / 100), 3);
    });

    // 3. Draw physical drifting element drop stars
    droppingParticles.forEach(p => {
      if (p.collected) return;
      if (p.x < cameraX || p.x > cameraX + viewW || p.y < cameraY || p.y > cameraY + viewH) return;

      const offsetBounce = Math.sin(Date.now() / 150 + p.x) * 5;

      // Outer aura
      ctx.fillStyle = p.type === 'wood' ? '#8b5a2b' : (p.type === 'stone' ? '#71717a' : '#00ffd2');
      ctx.beginPath();
      ctx.arc(p.x, p.y + offsetBounce, 8, 0, Math.PI * 2);
      ctx.fill();

      // Shiny core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y + offsetBounce, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Draw wandering player bots List
    botsList.forEach(bot => {
      if (bot.x + player.size < cameraX || bot.x - player.size > cameraX + viewW || bot.y + player.size < cameraY || bot.y - player.size > cameraY + viewH) {
        return;
      }

      ctx.save();
      ctx.translate(bot.x, bot.y);
      ctx.rotate(bot.swingAngle * Math.PI / 180);

      // Minecraft boxy character look
      ctx.fillStyle = bot.color;
      ctx.fillRect(-bot.speed * 6, -bot.speed * 6, bot.speed * 12, bot.speed * 12);
      ctx.fillStyle = '#ffcc99';
      ctx.fillRect(-12, -12, 24, 24);

      // Bot Face eyes
      ctx.fillStyle = '#000000';
      ctx.fillRect(-8, -4, 4, 4);
      ctx.fillRect(4, -4, 4, 4);

      ctx.restore();

      // Name tags and cash above bot head
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Courier';
      ctx.textAlign = 'center';
      ctx.fillText(`<${bot.name}> [${bot.cash} 💎]`, bot.x, bot.y - bot.speed * 6 - 8);
    });

    // 5. Draw Primary Character (Minecraft block-style matching video)
    ctx.save();
    ctx.translate(player.x, player.y);

    // Turn head angle look direction directly mirroring mouse pointers or default player orientation
    let gazeAngle = player.angle;
    if (!isMobileMode && (mousePosRef.current.x !== 0 || mousePosRef.current.y !== 0)) {
      gazeAngle = Math.atan2(mousePosRef.current.y - (player.y - cameraY), mousePosRef.current.x - (player.x - cameraX));
      // update persistent angle
      player.angle = gazeAngle;
    }
    ctx.rotate(gazeAngle);

    // Character body color options matching custom equipped Exo armor shields
    let suiteCol = '#2a9d8f';
    let hairCol = '#264653';
    let helmCol = '#e76f51';

    if (equippedArmor === 'nano') { suiteCol = '#16a34a'; helmCol = '#155d27'; }
    if (equippedArmor === 'quantum') { suiteCol = '#8b5cf6'; helmCol = '#4c1d95'; }

    // Body block base trunk
    ctx.fillStyle = suiteCol;
    ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);

    // Character Hair base
    ctx.fillStyle = hairCol;
    ctx.fillRect(-player.size / 2 + 2, -player.size / 2 + 2, 8, player.size - 4);

    // Front Gaze specs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, -8, 6, 6);
    ctx.fillRect(10, 2, 6, 6);
    ctx.fillStyle = '#0000ff'; // iris
    ctx.fillRect(12, -6, 3, 3);
    ctx.fillRect(12, 4, 3, 3);

    // Swinging Tool / Saber representation matching the swing action
    ctx.save();
    ctx.translate(14, 18);
    if (player.swinging) {
      ctx.rotate(-Math.PI / 4 + (player.swingTimer * 0.16));
    }
    ctx.font = '22px Courier';
    ctx.fillText(currentTool.label, -10, 5);
    ctx.restore();

    ctx.restore();

    // Above player indicator tags
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 12px Courier';
    ctx.textAlign = 'center';
    const cleanNickname = myProfile?.displayName || user?.displayName || 'Du (Gast)';
    ctx.fillText(`${cleanNickname} (lvl ${lvl})`, player.x, player.y - player.size - 8);

    // Glowing radius preview mesh if machine slots (2-5) selected
    if (selectedHotbarIndex > 0) {
      ctx.strokeStyle = 'rgba(255, 152, 0, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, 180, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // clear dash

      // Mouse position projected boundary cell box
      const absMouseX = mousePosRef.current.x + cameraX;
      const absMouseY = mousePosRef.current.y + cameraY;
      const gridCellX = Math.floor(absMouseX / tileSize) * tileSize;
      const gridCellY = Math.floor(absMouseY / tileSize) * tileSize;

      const dstMouse = Math.hypot(player.x - (gridCellX + tileSize / 2), player.y - (gridCellY + tileSize / 2));
      ctx.fillStyle = dstMouse <= 180 ? 'rgba(76, 175, 80, 0.25)' : 'rgba(244, 67, 54, 0.25)';
      ctx.fillRect(gridCellX, gridCellY, tileSize, tileSize);
      ctx.strokeStyle = dstMouse <= 180 ? '#4CAF50' : '#f44336';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gridCellX, gridCellY, tileSize, tileSize);
    }

    ctx.restore();
  };

  // Unified Interaction dispatcher (used by mouse and touch events)
  const triggerInteractionAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const viewW = canvas.width;
    const viewH = canvas.height;
    const player = playerRef.current;

    const cameraX = Math.max(0, Math.min(worldSize.width - viewW, player.x - viewW / 2));
    const cameraY = Math.max(0, Math.min(worldSize.height - viewH, player.y - viewH / 2));

    const absClickX = clickX + cameraX;
    const absClickY = clickY + cameraY;

    // Direct Character face vector turn towards target point
    if (isMobileMode) {
      player.angle = Math.atan2(absClickY - player.y, absClickX - player.x);
    } else {
      mousePosRef.current = { x: clickX, y: clickY };
    }

    // Fetch grid coordinates index intersected
    const targetIdx = tiles.findIndex(t => 
      absClickX >= t.x && absClickX < t.x + tileSize &&
      absClickY >= t.y && absClickY < t.y + tileSize
    );

    if (targetIdx === -1) return;
    const targetTile = tiles[targetIdx];

    // Interaction distance range restriction
    const centerTileX = targetTile.x + tileSize / 2;
    const centerTileY = targetTile.y + tileSize / 2;
    const dst = Math.hypot(player.x - centerTileX, player.y - centerTileY);

    if (dst > 180) {
      triggerToast('xp', '❌ ZU WEIT ENTFERNT', 'Gehe näher an das Erz heran! (Reichweite 180px)');
      playRetroSound('hurt');
      return;
    }

    // Direct selection slots action dispatcher
    if (selectedHotbarIndex === 0) {
      // Pickaxe Mining Modus
      mineGridBlock(targetIdx, absClickX, absClickY);
    } else {
      // RTS Construction Placement of Building Slots 2-5
      placeStructureOnGrid(targetIdx);
    }
  };

  // Helper trigger action relative to player's face vector (Console / Touch Controllers helper)
  const triggerActionInFront = () => {
    const player = playerRef.current;
    const frontX = player.x + Math.cos(player.angle) * 75;
    const frontY = player.y + Math.sin(player.angle) * 75;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const viewW = canvas.width;
    const viewH = canvas.height;

    const cameraX = Math.max(0, Math.min(worldSize.width - viewW, player.x - viewW / 2));
    const cameraY = Math.max(0, Math.min(worldSize.height - viewH, player.y - viewH / 2));

    const clientX = (frontX - cameraX) + rect.left;
    const clientY = (frontY - cameraY) + rect.top;

    triggerInteractionAt(clientX, clientY);
  };

  // Click Canvas dispatcher (Mining block or Placing machine)
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    triggerInteractionAt(e.clientX, e.clientY);
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    const inputCleaned = chatInput.trim();
    if (inputCleaned.toUpperCase() === 'HACKER!!!') {
      const nextCoins = coins + 1000000;
      setResources(prev => ({
        ...prev,
        wood: (prev.wood || 0) + 1000,
        stone: (prev.stone || 0) + 1000,
        coal: (prev.coal || 0) + 1000,
        iron: (prev.iron || 0) + 1000,
        gold: (prev.gold || 0) + 1000,
        diamond: (prev.diamond || 0) + 1000,
        uranium: (prev.uranium || 0) + 1000,
        iridium: (prev.iridium || 0) + 1000,
        power: (prev.power || 0) + 1000
      }));
      setCoins(nextCoins);
      updateLeaderboardPlayerScore(nextCoins);
      syncCoinsWithDatabase(nextCoins);
      triggerToast('level', '💻 HACK AKTIVIERT!', 'Du hast +1000 von allen Erzen & +1 Million Coins erhalten!');
      addLog('🚀 [SYSTEM] CHEAT AKTIVIERT: +1000 Erze (Holz, Stein, Kohle, Eisen, Gold, Diamant, Uran, Iridium)!');
      playRetroSound('levelUp');
      setChatInput('');
      return;
    }

    const tag = myProfile?.displayName || user?.displayName || 'Spieler';
    addLog(`💬 <${tag}> ${inputCleaned}`);
    
    // Simulate Background Golang Load Balancer routing via Dart/Flutter Mobile syncer
    addLog(`⚙️ [Flutter Syncer] Nachricht via Golang API-Gateway an Haupt-Hub geroutet.`);
    
    // Write message into the real firestore DB 'chat_messages' for global synchronisation
    if (db && user) {
      const displayRole = (myProfile?.role || 'Member').substring(0, 64);
      addDoc(collection(db, 'chat_messages'), {
        text: `[VoxelCompanion-Chat] ${inputCleaned}`,
        userId: user.uid,
        displayName: tag.substring(0, 64),
        role: displayRole,
        purchasedRank: myProfile?.purchasedRank || "",
        createdAt: serverTimestamp(),
        tempId: `voxel-${Date.now()}-${Math.random()}`,
        channel: 'global'
      }).catch(e => console.error("Voxel companion chat sync error: ", e));
    }
    
    setChatInput('');
  };

  // Buy item transactional ledger
  const triggerUnlockShopItem = (item: ShopItem) => {
    const requiredRes = item.costResource;
    const playerHasRes = resources[requiredRes] || 0;

    if (playerHasRes < item.price) {
      const germanResName = requiredRes === 'wood' ? 'Holz 🪵' : requiredRes === 'stone' ? 'Stein 🪨' : requiredRes === 'coal' ? 'Kohle ⬛' : requiredRes === 'iron' ? 'Eisen 🔩' : requiredRes === 'gold' ? 'Gold 🟡' : requiredRes === 'diamond' ? 'Diamant 💎' : requiredRes === 'uranium' ? 'Uranium 🔋' : 'Iridium 🌌';
      triggerToast('xp', '❌ NICHT GENUG RESSOURCEN', `Du benötigst ${item.price} ${germanResName} für dieses Upgrade!`);
      playRetroSound('hurt');
      return;
    }
    if (lvl < item.levelRequired) {
      triggerToast('xp', '🔒 STUFE ZU GERING', `Upgrade setzt Spieler-Level ${item.levelRequired} voraus!`);
      playRetroSound('hurt');
      return;
    }

    const cost = item.price;
    setResources(prev => ({
      ...prev,
      [requiredRes]: Math.max(0, prev[requiredRes] - cost)
    }));

    playRetroSound('buy');

    // Upgrade slot or building storage
    if (item.itemType === 'tool') {
      setCurrentTool({
        id: item.id,
        name: item.name,
        damage: item.damage || 20,
        power: item.id === 'iron_pick' ? 2 : item.id === 'dia_drill' ? 3 : 4,
        label: item.icon,
        color: item.imageColor
      });
      addLog(`⚔️ Werkzeug upgraded auf ${item.name}! Mining-Schaden massiv erhöht.`);
    } else if (item.itemType === 'armor') {
      if (item.id === 'suit_nano') setEquippedArmor('nano');
      if (item.id === 'suit_quantum') setEquippedArmor('quantum');
      if (item.id === 'utility_jetpack') setHasJetpack(true);
      addLog(`🛡️ Exo-Suit upgraded auf ${item.name}! Fähigkeiten dauerhaft erweitert.`);
    } else if (item.itemType === 'building') {
      let bToken = 'solar';
      if (item.id === 'solar') bToken = 'solar';
      if (item.id === 'miner') bToken = 'miner';
      if (item.id === 'seller') bToken = 'seller';
      if (item.id === 'wall') bToken = 'wall';

      setBuildInventory(prev => ({
        ...prev,
        [bToken]: (prev[bToken] || 0) + 1
      }));
      addLog(`🛍️ Module erworben: +1 ${item.name} im Baulager! (Slot ${bToken === 'solar' ? '2' : bToken === 'miner' ? '3' : bToken === 'seller' ? '4' : '5'} ausrüstbar)`);
    }

    triggerToast('quest', '🛒 UPGRADE ERFOLGREICH', `${item.name} wurde freigeschaltet.`);
  };

  // Virtual touch d-pad helper keys binder for responsive smartphone play!
  const bindDirection = (key: string, isActive: boolean) => {
    keysPressed.current[key] = isActive;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d0d12] relative overflow-hidden font-mono min-h-0">
      
      {/* 2D ARENA VIEWPORT FRAME */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden p-0 min-h-0"
      >
        <canvas 
          ref={canvasRef} 
          onClick={handleCanvasInteraction}
          onTouchStart={(e) => {
            if (e.touches && e.touches.length > 0) {
              triggerInteractionAt(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          className="absolute inset-0 block w-full h-full border border-neutral-800"
        />

        {/* 1. TOP-LEFT PANEL: ULTIMATE SCOREBOARD LEADERBOARD */}
        <div className="absolute top-4 left-4 z-10 w-64 bg-black/85 border border-neutral-800/80 backdrop-blur-md rounded-2xl p-4 pointer-events-auto transition-transform hover:scale-[1.01] hidden md:block">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-3">
            <h4 className="text-amber-500 font-extrabold tracking-wider uppercase text-sm flex items-center gap-1.5">
              <Trophy size={15} className="text-yellow-500 animate-pulse" />
              TOP PLAYERS
            </h4>
            <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-black uppercase">
              Live
            </span>
          </div>
          <div className="space-y-2">
            {leaderboard.map((u, idx) => (
              <div 
                key={`lb-${idx}`} 
                className={`flex justify-between items-center text-xs ${u.isPlayer ? 'text-cyan-400 font-black' : 'text-neutral-300 font-medium'}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] text-neutral-500 font-black">{idx + 1}.</span>
                  <span className="truncate">{u.name}</span>
                </div>
                <span className="text-yellow-500 font-black shrink-0 font-mono">{u.money.toLocaleString()} 💎</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. TOP-CENTER PANEL: ATMOSPHERICS WEATHER & CLOCK */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/85 border border-neutral-800/80 backdrop-blur-md rounded-2xl px-3 sm:px-6 py-1.5 sm:py-2.5 pointer-events-auto flex items-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-neutral-200">
          <div className="flex items-center gap-1.5 sm:gap-2 font-black text-amber-500">
            {gameTime.hour >= 6 && gameTime.hour <= 18 ? (
              <Sun size={13} className="text-yellow-400 animate-spin-slow" />
            ) : (
              <Moon size={13} className="text-blue-400 animate-pulse" />
            )}
            <span>
              {String(gameTime.hour).padStart(2, '0')}:
              {String(gameTime.minute).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1" title="Windkraft-Turbulenz">
            <Wind size={12} className="text-cyan-400" />
            <span>{windSpeed}m/s</span>
          </div>

          <div className="flex items-center gap-1" title="Temperatur">
            <Thermometer size={12} className="text-rose-400" />
            <span>{temperature}°C</span>
          </div>

          <div className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 uppercase hidden sm:block">
            {isRaining ? '🌧️ REGEN' : '☀️ KLAR'}
          </div>
        </div>

        {/* 3. TOP-RIGHT PANEL: COZY TUTORIAL BOX */}
        <div className="absolute top-4 right-4 z-10 w-72 bg-emerald-950/85 border border-emerald-500/30 backdrop-blur-md rounded-2xl p-4 pointer-events-auto hidden lg:block">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-2">
            <h5 className="text-emerald-400 font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={14} className="animate-pulse" />
              MISSION BRIEFING
            </h5>
            <span className="text-[9px] text-emerald-500 font-black bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
          <p className="text-xs text-neutral-200 leading-relaxed font-semibold">
            Bewege dich mit WASD-Tasen. Ernte Holz, Kohle und Ores, um passives Einkommen zu generieren. Platziere Auto-Miner im Bau-Modus! Press [B] für den Shop.
          </p>

          <div className="mt-4 border-t border-emerald-500/20 pt-3">
            <div className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Cpu size={11} className="text-cyan-400 animate-pulse" />
              <span>CO-MANAGED IN DEVLABS (AKTIV):</span>
            </div>
            <ul className="space-y-1.5 text-[10px] text-neutral-300 font-semibold font-mono">
              <li className="flex justify-between items-center bg-black/30 px-1.5 py-1 rounded">
                <span>🦀 Rust WASM:</span>
                <span className="text-cyan-300 font-bold">Aktiv (+24x)</span>
              </li>
              <li className="flex justify-between items-center bg-black/30 px-1.5 py-1 rounded">
                <span>🎯 Flutter Websync:</span>
                <span className="text-purple-300 font-bold">Online</span>
              </li>
              <li className="flex justify-between items-center bg-black/30 px-1.5 py-1 rounded">
                <span>🐍 Python RL AI:</span>
                <span className="text-yellow-300 font-bold">Optimiere (+15%)</span>
              </li>
              <li className="flex justify-between items-center bg-black/30 px-1.5 py-1 rounded">
                <span>🐹 Golang Gateway:</span>
                <span className="text-teal-300 font-bold">12ms Ping</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 4. RIGHT SIDEBAR PANEL: RESOURCE LEDGER SIDEBAR */}
        {isInventoryVisible && (
          <div className="absolute top-28 sm:top-48 right-4 z-10 w-40 sm:w-48 bg-black/85 border border-neutral-800/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 pointer-events-auto space-y-3 shadow-2xl">
            <div className="border-b border-neutral-800 pb-1.5">
              <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">DEINE ERZE</span>
              <div className="text-lg sm:text-xl font-black text-amber-500 italic block mt-0.5" style={{ textShadow: '0 0 10px rgba(245,158,11,0.3)' }}>
                {coins.toLocaleString()} 💎
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] sm:text-xs">
              <div className="flex justify-between items-center text-neutral-300">
                <span>🪵 Holz</span>
                <span className="font-extrabold text-white">{resources.wood}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span>🪨 Stein</span>
                <span className="font-extrabold text-white">{resources.stone}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span>⬛ Kohle</span>
                <span className="font-extrabold text-white">{resources.coal}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span>🔩 Eisen</span>
                <span className="font-extrabold text-white">{resources.iron}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span>💎 Diamant</span>
                <span className="font-extrabold text-cyan-400">{resources.diamond}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300 border-t border-neutral-800 pt-2">
                <span className="text-amber-500 font-extrabold flex items-center gap-1">
                  <Zap size={11} /> Strom
                </span>
                <span className="font-black text-amber-400 font-mono">{resources.power}⚡</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. BOTTOM-LEFT PANEL: LIVE LOBBY CHAT WINDOW */}
        {isChatVisible ? (
          <div className={`absolute ${isMobileMode ? 'bottom-56 left-4 w-72' : 'bottom-4 left-4 w-80'} z-10 bg-black/85 border border-neutral-800/80 backdrop-blur-md rounded-2xl p-4 pointer-events-auto shadow-2xl flex flex-col justify-end transition-all`}>
            <div className="flex justify-between items-center mb-2 border-b border-neutral-800 pb-1">
              <div className="text-[10px] text-neutral-500 font-black uppercase tracking-wider">
                💬 SER CHAT
              </div>
              <button 
                onClick={() => setIsChatVisible(false)} 
                className="text-[10px] text-neutral-400 hover:text-white font-bold"
              >
                [MIN]
              </button>
            </div>
            <div className="h-28 overflow-y-auto space-y-1 text-[11px] font-mono mb-2 custom-scrollbar flex flex-col justify-end">
              {logs.map((lg, i) => (
                <p 
                  key={`log-${i}`} 
                  className={`truncate block leading-relaxed ${
                    lg.startsWith('✨') ? 'text-emerald-400 font-bold' :
                    lg.startsWith('💬') ? 'text-cyan-400 font-medium' :
                    lg.startsWith('❌') || lg.startsWith('☠️') ? 'text-red-400' :
                    lg.startsWith('🧱') ? 'text-orange-400' :
                    'text-neutral-300'
                  }`}
                >
                  {lg}
                </p>
              ))}
            </div>
          <div className="flex gap-2">
            <input 
              id="chat-input-g"
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Sende Nachricht..." 
              className="flex-1 bg-neutral-900 border border-neutral-800 text-[11px] px-3 py-1.5 rounded-xl text-white outline-none focus:border-amber-500 font-mono"
            />
            <button 
              onClick={handleChatSubmit}
              className="bg-amber-500 hover:bg-amber-400 px-3 rounded-xl text-black font-black flex items-center justify-center transition-transform hover:scale-105"
            >
              <Send size={11} className="shrink-0" />
            </button>
          </div>
        </div>
        ) : (
          <button 
            onClick={() => setIsChatVisible(true)}
            className={`absolute ${isMobileMode ? 'bottom-56 left-4' : 'bottom-4 left-4'} z-10 bg-black/85 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl font-extrabold text-[10px] uppercase pointer-events-auto flex items-center gap-1.5 shadow-2xl`}
          >
            💬 CHAT ÖFFNEN
          </button>
        )}

        {/* 6. BOTTOM-CENTER PANEL: PLAYER BAR & HOTBAR MECHANIC */}
        <div className={`absolute ${isMobileMode ? 'bottom-[115px]' : 'bottom-4'} left-1/2 -translate-x-1/2 z-10 bg-black/90 border border-neutral-800/90 backdrop-blur-md rounded-2xl p-3 sm:p-4 w-[90%] max-w-[420px] pointer-events-auto flex flex-col items-center gap-2 sm:gap-3`}>
          
          {// Vitals Drawers
          }
          <div className="w-full space-y-2">
            {/* HP Bar */}
            <div className="relative h-4 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden flex items-center justify-center">
              <div className="absolute inset-y-0 left-0 bg-red-600 transition-all duration-300" style={{ width: `${(health / maxHealth) * 100}%` }} />
              <span className="absolute z-10 text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] flex items-center gap-1 capitalize">
                LEBEN: {Math.floor(health)}/{maxHealth}
              </span>
            </div>

            {/* Energy Bar */}
            <div className="relative h-4 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden flex items-center justify-center">
              <div className="absolute inset-y-0 left-0 bg-amber-500 transition-all duration-300" style={{ width: `${energy}%` }} />
              <span className="absolute z-10 text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] capitalize">
                ENERGIE: {Math.floor(energy)}/100
              </span>
            </div>

            {/* Level Bar */}
            <div className="relative h-4 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden flex items-center justify-center">
              <div className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300" style={{ width: `${xp % 100}%` }} />
              <span className="absolute z-10 text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] capitalize">
                XP LEVEL {lvl} ({xp % 100}%)
              </span>
            </div>
          </div>

          {/* HOTBAR BUTTON GRIDS */}
          <div className="flex gap-2 w-full pt-1">
            {[
              { id: 'mining', label: currentTool.label, name: currentTool.name, type: 'miner', key: '1' },
              { id: 'solar', label: '☀️', name: 'Solarpanel', type: 'solar', key: '2' },
              { id: 'miner', label: '🤖', name: 'Auto-Miner', type: 'miner', key: '3' },
              { id: 'seller', label: '💵', name: 'Auto-Seller', type: 'seller', key: '4' },
              { id: 'wall', label: '🧱', name: 'Eisenmauer', type: 'wall', key: '5' }
            ].map((slot, idx) => {
              const active = idx === selectedHotbarIndex;
              const isPlaceable = idx > 0;
              const count = isPlaceable ? (buildInventory[slot.id] || 0) : null;

              return (
                <button
                  key={`hot-${idx}`}
                  onClick={() => {
                    setSelectedHotbarIndex(idx);
                    playRetroSound('hit');
                  }}
                  className={`flex-1 h-14 rounded-xl border-2 flex flex-col items-center justify-center relative transition-all pointer-events-auto ${
                    active 
                      ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.25)] scale-105' 
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'
                  }`}
                  title={`${slot.name} (Hotkey ${slot.key})`}
                >
                  <span className="absolute top-1 left-2 text-[8px] text-neutral-500 font-bold">{slot.key}</span>
                  <span className="text-xl">{slot.label}</span>
                  
                  {isPlaceable && (
                    <span className="absolute bottom-1 right-2 text-[10px] text-emerald-400 font-black">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* MOBILE OVERLAYS: TOUCH D-PAD AND ACTION STACK */}
        {isMobileMode && (
          <>
            {/* Left Thumb Virtual Touch D-pad */}
            <div className="absolute bottom-4 left-4 z-10 p-2 bg-black/75 border border-neutral-800/80 backdrop-blur-md rounded-2xl w-[140px] h-[140px] flex items-center justify-center pointer-events-auto shadow-2xl select-none">
              <div className="grid grid-cols-3 gap-1.5 w-full h-full select-none">
                <div />
                <button 
                  onTouchStart={() => bindDirection('w', true)} 
                  onTouchEnd={() => bindDirection('w', false)}
                  onTouchCancel={() => bindDirection('w', false)}
                  onMouseDown={() => bindDirection('w', true)}
                  onMouseUp={() => bindDirection('w', false)}
                  onMouseLeave={() => bindDirection('w', false)}
                  className="bg-neutral-800 active:bg-amber-500 text-white rounded-xl flex items-center justify-center text-sm font-black transition-colors select-none shadow-md border border-neutral-700/45 hover:bg-neutral-700"
                >
                  ▲
                </button>
                <div />
                <button 
                  onTouchStart={() => bindDirection('a', true)} 
                  onTouchEnd={() => bindDirection('a', false)}
                  onTouchCancel={() => bindDirection('a', false)}
                  onMouseDown={() => bindDirection('a', true)}
                  onMouseUp={() => bindDirection('a', false)}
                  onMouseLeave={() => bindDirection('a', false)}
                  className="bg-neutral-800 active:bg-amber-500 text-white rounded-xl flex items-center justify-center text-sm font-black transition-colors select-none shadow-md border border-neutral-700/45 hover:bg-neutral-700"
                >
                  ◀
                </button>
                <div className="bg-neutral-900 rounded-xl flex items-center justify-center text-[11px] text-neutral-400 font-bold select-none border border-neutral-800 animate-pulse">🕹️</div>
                <button 
                  onTouchStart={() => bindDirection('d', true)} 
                  onTouchEnd={() => bindDirection('d', false)}
                  onTouchCancel={() => bindDirection('d', false)}
                  onMouseDown={() => bindDirection('d', true)}
                  onMouseUp={() => bindDirection('d', false)}
                  onMouseLeave={() => bindDirection('d', false)}
                  className="bg-neutral-800 active:bg-amber-500 text-white rounded-xl flex items-center justify-center text-sm font-black transition-colors select-none shadow-md border border-neutral-700/45 hover:bg-neutral-700"
                >
                  ▶
                </button>
                <div />
                <button 
                  onTouchStart={() => bindDirection('s', true)} 
                  onTouchEnd={() => bindDirection('s', false)}
                  onTouchCancel={() => bindDirection('s', false)}
                  onMouseDown={() => bindDirection('s', true)}
                  onMouseUp={() => bindDirection('s', false)}
                  onMouseLeave={() => bindDirection('s', false)}
                  className="bg-neutral-800 active:bg-amber-500 text-white rounded-xl flex items-center justify-center text-sm font-black transition-colors select-none shadow-md border border-neutral-700/45 hover:bg-neutral-700"
                >
                  ▼
                </button>
              </div>
            </div>

            {/* Right Thumb Comfortable Action Stack */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2.5 pointer-events-auto">
              {/* Shortcut Quick Triggers to circumvent missing physical keyboard */}
              <div className="flex gap-1.5">
                <button 
                  onClick={() => { setIsShopOpen(true); playRetroSound('buy'); }}
                  className="bg-amber-500 active:bg-amber-400 p-1.5 px-2.5 text-black font-black text-[9px] uppercase rounded-lg shadow-xl flex items-center gap-1 leading-none"
                >
                  <ShoppingBag size={11} />
                  SHOP [B]
                </button>
                <button 
                  onClick={() => { setIsClansOpen(true); playRetroSound('buy'); }}
                  className="bg-neutral-900 border border-neutral-800 active:border-neutral-700 p-1.5 px-2.5 text-neutral-300 font-bold text-[9px] uppercase rounded-lg shadow-xl flex items-center gap-1 leading-none"
                >
                  <Users size={11} />
                  CLAN [T]
                </button>
              </div>

              {/* Action Circle Grid */}
              <div className="flex items-center gap-2">
                {hasJetpack && (
                  <button 
                    onClick={() => {
                      setIsJetpackActive(p => {
                        const next = !p;
                        addLog(next ? '🚀 Jetpack gestartet! Du fliegst rasant über Lava & Gräben.' : '🚀 Jetpack abgeschaltet.');
                        return next;
                      });
                      playRetroSound('powerup');
                    }}
                    className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-base shadow-2xl transition-all ${isJetpackActive ? 'bg-rose-500 border-rose-300 animate-pulse text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-400 active:bg-neutral-800'}`}
                    title="Jetpack Boost umschalten"
                  >
                    🚀
                  </button>
                )}

                <button 
                  onClick={triggerActionInFront}
                  className="w-18 h-18 bg-amber-500 active:bg-amber-400 border-4 border-amber-300 text-black font-black rounded-full flex flex-col items-center justify-center shadow-2xl transition-transform active:scale-95"
                >
                  <span className="text-xl">{selectedHotbarIndex === 0 ? '⛏️' : '🧱'}</span>
                  <span className="text-[8px] uppercase tracking-wider mt-0.5 font-black">{selectedHotbarIndex === 0 ? 'HAUEN' : 'BAUEN'}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* MODAL TRIGGERS AND NAV OVERLAYS */}
        <div className="absolute top-4 left-4 md:left-[15%] pointer-events-auto z-10 flex flex-wrap gap-1.5 sm:gap-2 max-w-[85%] md:max-w-none">
          <button 
            onClick={() => { setIsShopOpen(true); playRetroSound('buy'); }} 
            className="bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-xl text-black font-black text-xs uppercase flex items-center gap-1.5 transition-transform hover:scale-105 shadow-2xl"
          >
            <ShoppingBag size={13} />
            TRADE-SHOP [B]
          </button>
          <button 
            onClick={() => { setIsClansOpen(true); playRetroSound('buy'); }} 
            className="bg-black/85 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl font-bold text-xs uppercase flex items-center gap-1.5 transition-all shadow-2xl"
          >
            <Users size={13} />
            CLANS [T]
          </button>
          <button 
            onClick={() => { setIsInventoryVisible(p => !p); playRetroSound('hit'); }} 
            className={`px-3 py-1.5 rounded-xl flex items-center justify-center transition-all shadow-2xl gap-1.5 border leading-none ${isInventoryVisible ? 'bg-indigo-600 text-white border-indigo-500 font-extrabold' : 'bg-black/85 border-neutral-800 text-neutral-300 hover:text-white'}`}
            title="Inventar / Erze einblenden"
          >
            <Layers size={13} />
            🎒 ERZE
          </button>
          <button 
            onClick={() => { setIsChatVisible(p => !p); playRetroSound('hit'); }} 
            className={`px-3 py-1.5 rounded-xl flex items-center justify-center transition-all shadow-2xl gap-1.5 border leading-none ${isChatVisible ? 'bg-cyan-600 text-white border-cyan-500 font-extrabold' : 'bg-black/85 border-neutral-800 text-neutral-300 hover:text-white'}`}
            title="Chat einblenden"
          >
            <Send size={13} />
            💬 CHAT
          </button>
          <button 
            onClick={() => { setIsMobileMode(p => !p); playRetroSound('buy'); }} 
            className={`px-3 py-1.5 rounded-xl flex items-center justify-center transition-all shadow-2xl gap-1.5 border leading-none ${isMobileMode ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-500 font-extrabold' : 'bg-black/85 border-neutral-800 text-neutral-300 hover:text-white'}`}
            title="Handy Touch-Steuerung umschalten"
          >
            <Smartphone size={13} />
            <span className="hidden sm:inline text-[10px] font-bold">TOUCH-MODE</span>
          </button>
          <button 
            onClick={toggleFullscreen} 
            className="bg-black/85 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl flex items-center justify-center transition-all shadow-2xl gap-1.5"
            title="Vollbildmodus umschalten"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline text-[10px] font-bold">VOLLBILD</span>
          </button>
          <button 
            onClick={toggleMuted} 
            className="bg-black/85 border border-neutral-800 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-xl flex items-center justify-center transition-all shadow-2xl"
            title="Lautstärken stummschalten"
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} className="text-amber-400" />}
          </button>
          <button 
            onClick={onClose} 
            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl font-black text-xs uppercase flex items-center justify-center transition-all shadow-2xl"
            title="Modul beenden"
          >
            BEENDEN [X]
          </button>
        </div>

      {/* RETHINK DIALOG MODAL: BUILDING CLANS */}
      <AnimatePresence>
        {isClansOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-950 border border-neutral-800 w-full max-w-lg max-h-full overflow-y-auto rounded-3xl p-6 relative"
            >
              <button 
                onClick={() => setIsClansOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                <Users className="text-amber-500" />
                GLADIATOR CLANS COHESION SYSTEM
              </h3>
              
              <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-mono">
                Gründe mit Gladiator-Spielern einen Team-Clan! Teammitglieder durchschreiten gebaute Sicherheitstore automatisch barrierefrei, koppeln ihre Stromnetze auf der Karte und beschützen sich gegenseitig vor feindseligen Starthaken.
              </p>

              <div className="space-y-4">
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="font-extrabold text-cyan-400">PVP Arena Legion (Mitglieder: 6/25)</span>
                    <p className="text-[10px] text-neutral-500 mt-1 italic">"We mine deep or we go home!"</p>
                  </div>
                  <button 
                    onClick={() => {
                      triggerToast('quest', 'CLAN BEITRITT', 'Du bist erfolgreich der PVP Arena Legion beigetreten!');
                      setIsClansOpen(false);
                    }}
                    className="bg-amber-500 text-black font-black uppercase text-[10px] px-3 py-1.5 rounded-xl hover:bg-amber-400 transition-all font-mono"
                  >
                    BEITRETEN
                  </button>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="font-extrabold text-[#9c27b0]">Redstone Legion (Mitglieder: 4/12)</span>
                    <p className="text-[10px] text-neutral-500 mt-1 italic">"Automating victory through clean power grids"</p>
                  </div>
                  <button 
                    onClick={() => {
                      triggerToast('quest', 'CLAN BEITRITT', 'Du bist erfolgreich der Redstone Legion beigetreten!');
                      setIsClansOpen(false);
                    }}
                    className="bg-amber-500 text-black font-black uppercase text-[10px] px-3 py-1.5 rounded-xl hover:bg-amber-400 transition-all font-mono"
                  >
                    BEITRETEN
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RETRO MODAL OVERLAY: TRADE SHOP SYSTEM */}
      <AnimatePresence>
        {isShopOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 pointer-events-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-950 border border-neutral-800 w-full max-w-4xl h-full max-h-full sm:h-[600px] rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden flex flex-col"
            >
              <button 
                onClick={() => setIsShopOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex justify-between items-start border-b border-neutral-800 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <ShoppingBag className="text-amber-500 animate-pulse" />
                    MINEENERGY PRO TRADE-SHOP
                  </h3>
                  <p className="text-xs text-neutral-400">Rüste dich mit überlegenen Bohrern aus, rüste Nano-Armor Suits auf oder schalte Automaten für dein Grid frei!</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2 font-black text-amber-500 font-mono text-sm shrink-0">
                  DEINE ERZE: {coins.toLocaleString()} 💎
                </div>
              </div>

              {/* TABS SELECTOR */}
              <div className="flex gap-2 border-b border-neutral-900 pb-3 mb-4">
                {[
                  { id: 'tools', label: '⛏️ Spitzhaken' },
                  { id: 'machines', label: '⚙️ Generatoren' },
                  { id: 'build', label: '🧱 Basenbau' },
                  { id: 'armor', label: '🛡️ Exo-Suits' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setShopTab(tab.id as any); playRetroSound('hit'); }}
                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase transition-all ${
                      shopTab === tab.id 
                        ? 'bg-amber-500 text-black' 
                        : 'bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ITEMS DRAW LISTINGS */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1 custom-scrollbar">
                {shopDatabase
                  .filter(item => {
                    if (shopTab === 'tools') return item.itemType === 'tool';
                    if (shopTab === 'machines') return item.id === 'solar' || item.id === 'wind' || item.id === 'miner' || item.id === 'seller';
                    if (shopTab === 'build') return item.id === 'wall' || item.id === 'door';
                    if (shopTab === 'armor') return item.itemType === 'armor';
                    return true;
                  })
                  .map(item => {
                    const levelOk = lvl >= item.levelRequired;
                    const costRes = item.costResource;
                    const canAfford = (resources[costRes] || 0) >= item.price;
                    const resGlowName = costRes === 'wood' ? '🪵 Holz' : costRes === 'stone' ? '🪨 Stein' : costRes === 'coal' ? '⬛ Kohle' : costRes === 'iron' ? '🔩 Eisen' : costRes === 'gold' ? '🟡 Gold' : costRes === 'diamond' ? '💎 Diamant' : costRes === 'uranium' ? '🔋 Uranium' : '🌌 Iridium';

                    return (
                      <div 
                        key={item.id}
                        className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[18px]">{item.icon}</span>
                            {!levelOk && (
                              <span className="text-[8px] bg-red-600/10 border border-red-600/20 text-red-500 px-2 py-0.5 rounded font-black uppercase">
                                Lvl {item.levelRequired} nötig
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-xs font-black text-white uppercase tracking-wide">{item.name}</h4>
                          <p className="text-[10px] text-neutral-400 leading-relaxed font-mono mt-1 mb-3">{item.description}</p>
                          
                          <div className="bg-black/50 border border-neutral-950 p-2 rounded-xl space-y-1 text-[9px] font-mono mb-4 text-neutral-300">
                            <div className="flex justify-between">
                              <span>Taktung:</span>
                              <span className="text-emerald-400 font-bold">{item.produce}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Betriebskosten:</span>
                              <span className="text-amber-500">{item.consume}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-neutral-800/60 pt-3 mt-1.5 font-mono">
                          <div className="flex justify-between items-center text-[10px] text-neutral-400">
                            <span>Kostet:</span>
                            <span className="text-amber-500 font-extrabold">{item.price} {resGlowName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-neutral-500">Du hast: {resources[costRes] || 0}</span>
                            <button
                              disabled={!canAfford || !levelOk}
                              onClick={() => triggerUnlockShopItem(item)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all font-mono ${
                                canAfford && levelOk
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black hover:scale-105'
                                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                              }`}
                            >
                              Kaufen
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
};
