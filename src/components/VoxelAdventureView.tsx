import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Settings, 
  HelpCircle, 
  Play, 
  RefreshCw, 
  Shield, 
  Activity, 
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
  Sliders, 
  AlertCircle,
  Clock,
  BatteryCharging
} from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';

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
  type: 'grass' | 'tree' | 'flower' | 'stone' | 'water' | 'lava' | 'iron' | 'coal' | 'gold' | 'diamond' | 'emerald';
  health: number;
  maxHealth: number;
  broken?: boolean;
}

interface Item {
  id: string;
  name: string;
  category: 'Spitzhaken' | 'Rüstung' | 'Jetpack' | 'Miner';
  description: string;
  price: number;
  power: number;
  levelRequired: number;
  icon?: string;
  imageColor?: string;
}

export const VoxelAdventureView: React.FC<VoxelAdventureViewProps> = ({
  user,
  myProfile,
  db,
  onClose,
  triggerToast,
  userProfiles
}) => {
  // Game state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState<'game' | 'inventory' | 'shop' | 'teams'>('game');
  
  // Game Stats
  const [coins, setCoins] = useState<number>(myProfile?.coins || 1000);
  const [xp, setXp] = useState<number>(myProfile?.xp || 0);
  const [blocksMined, setBlocksMined] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(100);
  const [health, setHealth] = useState<number>(10);
  
  // Inventory and Equipments
  const [ownedItems, setOwnedItems] = useState<string[]>(['wooden_pickaxe']);
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState<number>(0);
  const [equippedPickaxe, setEquippedPickaxe] = useState<any>({
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    power: 1,
    category: 'Spitzhaken'
  });

  const [hotbar, setHotbar] = useState<(any | null)[]>([
    { id: 'wooden_pickaxe', name: 'Wooden Pickaxe', power: 1 },
    null,
    null,
    null,
    null
  ]);

  // Player position & movement
  const playerRef = useRef({
    x: 400,
    y: 300,
    speed: 4,
    width: 24,
    height: 32,
    direction: 'down',
    isMoving: false,
    frame: 0
  });

  // World grid
  const [worldSize] = useState({ width: 2400, height: 1800 });
  const tileSize = 48;
  const [tiles, setTiles] = useState<Tile[]>([]);
  
  // Virtual joystick or movement keys pressed state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Logs & Notification simulation
  const [logs, setLogs] = useState<string[]>([]);
  const [trainingTask, setTrainingTask] = useState<string>(
    'Training: Finde Eisenerz (silber/braun) mit WASD-Tasten und baue es ab, indem du gedrückt hältst.'
  );

  // Time & Weather simulations
  const [gameTime, setGameTime] = useState<{ hour: 9, minute: 30 }>({ hour: 9, minute: 30 });
  const [windSpeed, setWindSpeed] = useState<number>(8);
  const [temperature, setTemperature] = useState<number>(12);

  // Team Simulator State
  const [teamName, setTeamName] = useState('');
  const [teamMotto, setTeamMotto] = useState('');
  const [teamsList, setTeamsList] = useState<any[]>([
    { name: 'Redstone Legion', motto: 'Automating victory' },
    { name: 'Diamond Rushers', motto: 'Mine deep or go home' }
  ]);
  const [activeTeam, setActiveTeam] = useState<any>(null);

  // Shop Items matching spiel2.mp4 exactly!
  const shopItems: Item[] = [
    { id: 'wooden_pickaxe', name: 'Wooden Pickaxe', category: 'Spitzhaken', description: 'Power: 1. Allows you to mine some basic resources.', price: 50, power: 1, levelRequired: 1, imageColor: '#8a5c32' },
    { id: 'iron_pickaxe', name: 'Iron Pickaxe', category: 'Spitzhaken', description: 'Power: 2. Mine more advanced resources like Gold.', price: 100, power: 2, levelRequired: 1, imageColor: '#d1d1d1' },
    { id: 'golden_pickaxe', name: 'Golden Pickaxe', category: 'Spitzhaken', description: 'Power: 3. Mines extremely fast, can extract Diamonds.', price: 1000, power: 3, levelRequired: 2, imageColor: '#fcb103' },
    { id: 'diamond_pickaxe', name: 'Diamond Pickaxe', category: 'Spitzhaken', description: 'Power: 5. Mines anything quickly. Cannot be broken.', price: 5000, power: 5, levelRequired: 5, imageColor: '#03fcfc' },
    { id: 'drill', name: 'Mining Drill', category: 'Spitzhaken', description: 'Power: 8. Heavy machinery. Consumes lots of energy.', price: 10000, power: 8, levelRequired: 10, imageColor: '#f55d42' },
    { id: 'diamond_drill', name: 'Diamond Drill', category: 'Spitzhaken', description: 'Power: 12. Superior mining machine tool.', price: 50000, power: 12, levelRequired: 15, imageColor: '#0ef0c2' },
    { id: 'nano_armor', name: 'Nano Armor', category: 'Rüstung', description: 'Provides 40% reduction of damage from lava/monsters.', price: 500000, power: 0, levelRequired: 20, imageColor: '#02ba40' },
    { id: 'quantum_armor', name: 'Quantum Armor', category: 'Rüstung', description: 'The absolute state-of-the-art protecting shield.', price: 1000000, power: 0, levelRequired: 30, imageColor: '#9d00ff' },
    { id: 'jetpack', name: 'Heli-Jetpack', category: 'Jetpack', description: 'Allows you to hover above fields and lava without taking risk.', price: 5000000, power: 0, levelRequired: 40, imageColor: '#ff007c' }
  ];

  // Helper for adding game feedback
  const addLog = (message: string) => {
    setLogs(prev => [message, ...prev.slice(0, 30)]);
  };

  // Synchronise coins with global context & profile state
  useEffect(() => {
    if (myProfile?.coins !== undefined) {
      setCoins(myProfile.coins);
    }
    if (myProfile?.xp !== undefined) {
      setXp(myProfile.xp);
    }
  }, [myProfile]);

  // Sound Synth Helper for Retro sound effects
  const playRetroSound = (type: 'hit' | 'mine' | 'buy' | 'hurt' | 'levelUp') => {
    try {
      const isMuted = localStorage.getItem('isMuted') === 'true';
      if (isMuted) return;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.11);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'mine') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.16);
      } else if (type === 'buy') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.08);
        osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.26);
      } else if (type === 'hurt') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(20, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.23);
      } else if (type === 'levelUp') {
        osc.type = 'sine';
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
        });
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      // Ignored if sound is blocked/fails
    }
  };

  // Generate World procedural map 
  useEffect(() => {
    const generatedTiles: Tile[] = [];
    const seedX = Math.random() * 100;
    const seedY = Math.random() * 100;

    for (let x = 0; x < worldSize.width; x += tileSize) {
      for (let y = 0; y < worldSize.height; y += tileSize) {
        
        // Simple procedural biome layout using deterministic waves
        const noiseVal = Math.sin(x * 0.003 + seedX) * Math.cos(y * 0.003 + seedY);
        let type: Tile['type'] = 'grass';
        let health = 10;
        let maxHealth = 10;

        if (noiseVal < -0.4) {
          // Lake reservoirs
          type = 'water';
          health = 9999;
          maxHealth = 9999;
        } else if (noiseVal < -0.2) {
          // Rich Stone structures 
          type = 'stone';
          health = 6;
          maxHealth = 6;
        } else if (noiseVal > 0.42 && Math.random() > 0.4) {
          // Lava structures
          type = 'lava';
          health = 9999;
          maxHealth = 9999;
        } else {
          // Scattered resource ores
          const oreRoll = Math.random();
          if (oreRoll > 0.992) {
            type = 'emerald'; health = 15; maxHealth = 15;
          } else if (oreRoll > 0.985) {
            type = 'diamond'; health = 12; maxHealth = 12;
          } else if (oreRoll > 0.965) {
            type = 'gold'; health = 8; maxHealth = 8;
          } else if (oreRoll > 0.935) {
            type = 'iron'; health = 5; maxHealth = 5;
          } else if (oreRoll > 0.895) {
            type = 'coal'; health = 4; maxHealth = 4;
          } else if (oreRoll > 0.85) {
            type = 'tree'; health = 3; maxHealth = 3;
          } else if (oreRoll > 0.8) {
            type = 'flower'; health = 1; maxHealth = 1;
          }
        }

        // Keep player spawn point clear of high obstacle assets
        if (x > 300 && x < 500 && y > 200 && y < 400) {
          type = 'grass';
        }

        generatedTiles.push({ x, y, type, health, maxHealth });
      }
    }
    setTiles(generatedTiles);
    
    // Set up default status log
    addLog('§6[Mines] Willkommen in der 2D Voxelwelt! Steuere mit WASD/Pfeiltasten.');
    addLog('§7Tippe auf Items in der offenen Welt zum Interagieren.');
  }, []);

  // Sync keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      
      // Numbers for hotbar selection
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const slotIdx = parseInt(e.key) - 1;
        setSelectedHotbarIndex(slotIdx);
        const itemInSlot = hotbar[slotIdx];
        if (itemInSlot) {
          setEquippedPickaxe(itemInSlot);
          addLog(`§eAusgerüstet: ${itemInSlot.name} (Power: ${itemInSlot.power})`);
        } else {
          setEquippedPickaxe(null);
        }
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
  }, [hotbar]);

  // Environmental damage, day-cycle & updates loop
  useEffect(() => {
    let lastTime = 0;
    let animFrame: number;

    const gameLoop = (timestamp: number) => {
      const player = playerRef.current;
      
      // Dynamic Day/Night Weather Update
      setGameTime(prev => {
        let mins = prev.minute + 1;
        let hrs = prev.hour;
        if (mins >= 60) {
          mins = 0;
          hrs = (hrs + 1) % 24;
          // Slowly randomize wind and temp 
          setWindSpeed(Math.max(2, Math.min(25, Math.floor(8 + Math.random() * 4 - 2))));
          setTemperature(Math.max(-5, Math.min(38, Math.floor(12 + Math.random() * 3 - 1))));
        }
        return { hour: hrs as any, minute: mins as any };
      });

      // Simple player movement inside the simulated coordinates
      let dx = 0;
      let dy = 0;

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
        dy = -player.speed;
        player.direction = 'up';
      } else if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
        dy = player.speed;
        player.direction = 'down';
      }

      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
        dx = -player.speed;
        player.direction = 'left';
      } else if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
        dx = player.speed;
        player.direction = 'right';
      }

      if (dx !== 0 || dy !== 0) {
        player.isMoving = true;
        player.frame = Math.floor(timestamp / 150) % 4;

        const nextX = player.x + dx;
        const nextY = player.y + dy;

        // Collision Checks
        let collides = false;
        
        // Boundaries index check
        if (nextX < 0 || nextX + player.width > worldSize.width || nextY < 0 || nextY + player.height > worldSize.height) {
          collides = true;
        }

        // Collide with resource block logic or obstacles
        const playerCenterX = nextX + player.width / 2;
        const playerCenterY = nextY + player.height / 2;
        
        tiles.forEach(tile => {
          if (tile.broken || tile.type === 'grass' || tile.type === 'flower') return;

          // Check if coordinates overlap with solid block tiles (except water/lava which are triggers, not walls!)
          if (tile.type !== 'water' && tile.type !== 'lava') {
            const pad = 2; // small threshold padding
            if (nextX + player.width - pad > tile.x && 
                nextX + pad < tile.x + tileSize && 
                nextY + player.height - pad > tile.y && 
                nextY + pad < tile.y + tileSize) {
              collides = true;
            }
          } else if (tile.type === 'lava') {
            // Lava Hazard damage tick
            if (nextX + player.width > tile.x && nextX < tile.x + tileSize && nextY + player.height > tile.y && nextY < tile.y + tileSize) {
              if (Math.random() > 0.98) {
                // Apply damage
                setHealth(prev => {
                  const deal = prev - 1;
                  if (deal <= 0) {
                    addLog('§4💀 Du bist im geschmolzenem Lava-Pool verbrannt! Teleportiert zum Spawn!');
                    player.x = 400;
                    player.y = 300;
                    playRetroSound('hurt');
                    return 10;
                  } else {
                    addLog('§c🔥 Autsch! Du brennst in der Lava!');
                    playRetroSound('hurt');
                    return deal;
                  }
                });
              }
            }
          }
        });

        if (!collides) {
          player.x = nextX;
          player.y = nextY;
        }
      } else {
        player.isMoving = false;
        player.frame = 0;
      }

      // Draw the beautiful 2D Minecraft World Frame using Canvas primitives
      renderCanvas();

      animFrame = requestAnimationFrame(gameLoop);
    };

    if (activeTab === 'game' && isPlaying) {
      animFrame = requestAnimationFrame(gameLoop);
    }

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [tiles, activeTab, isPlaying]);

  // High-performance procedural pixel painter functions
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Viewport camera system centering on player coordinates
    const player = playerRef.current;
    const viewWidth = canvas.width;
    const viewHeight = canvas.height;

    const camX = Math.max(0, Math.min(worldSize.width - viewWidth, player.x - viewWidth / 2));
    const camY = Math.max(0, Math.min(worldSize.height - viewHeight, player.y - viewHeight / 2));

    // 1. Draw Environment tiles in viewport
    tiles.forEach(tile => {
      // Frustum culling inside viewport boundaries
      if (tile.x + tileSize < camX || tile.x > camX + viewWidth || tile.y + tileSize < camY || tile.y > camY + viewHeight) {
        return;
      }

      // Procedural pixel-art block draw pattern
      if (tile.broken) {
        // Redraw underlying dirt block representing mined space
        drawPixelBlock(ctx, tile.x - camX, tile.y - camY, 'mided');
        return;
      }

      drawPixelBlock(ctx, tile.x - camX, tile.y - camY, tile.type, tile.health, tile.maxHealth);
    });

    // 2. Draw other virtual players around map
    userProfiles.slice(0, 3).forEach((prof, idx) => {
      if (prof.userId === user?.uid) return; // ignore self
      // Set distinct virtual coordinates to simulate dynamic multi-users (mobs or clan players)
      const virtualX = 450 + (idx * 150) + Math.sin(Date.now() / 2000 + idx) * 32;
      const virtualY = 320 + (idx * 110) + Math.cos(Date.now() / 2000 + idx) * 32;
      
      if (virtualX + player.width > camX && virtualX < camX + viewWidth && virtualY + player.height > camY && virtualY < camY + viewHeight) {
        // Render simple player skin head
        ctx.fillStyle = '#3a87ad';
        ctx.fillRect(virtualX - camX, virtualY - camY + 8, player.width, player.height - 8);
        ctx.fillStyle = '#ffccaa'; // Head
        ctx.fillRect(virtualX - camX + 4, virtualY - camY, 16, 16);
        ctx.fillStyle = '#fff'; // Tags background
        ctx.font = '10px monospace';
        ctx.fillStyle = '#4cfc35';
        ctx.fillText(prof.displayName || 'Spieler', virtualX - camX - 10, virtualY - camY - 8);
      }
    });

    // 3. Draw player avatar & model
    const pX = player.x - camX;
    const pY = player.y - camY;

    // Body block
    ctx.fillStyle = '#2d54a8'; // Blue shirt
    ctx.fillRect(pX, pY + 12, player.width, player.height - 12);
    
    // Pants
    ctx.fillStyle = '#5c4033'; // Brown pants
    ctx.fillRect(pX + 2, pY + player.height - 4, player.width - 4, 4);

    // Face / skin block head representation (or texture image if loaded gracefully)
    ctx.fillStyle = '#ffdbb5';
    ctx.fillRect(pX + 4, pY, 16, 16);
    
    // Hair
    ctx.fillStyle = '#4c2e00';
    ctx.fillRect(pX + 4, pY, 16, 4);

    // Eyes
    ctx.fillStyle = '#0a23bf';
    ctx.fillRect(pX + 6, pY + 6, 2, 2);
    ctx.fillRect(pX + 12, pY + 6, 2, 2);

    // Draw pickaxe tool in hands if mining
    if (keysPressed.current[' '] || keysPressed.current['l'] || keysPressed.current['z']) {
      // Swing Animation 
      ctx.fillStyle = equippedPickaxe?.imageColor || '#8a5c32';
      ctx.fillRect(pX + 14, pY + 8, 12, 4); 
    }

    // Name tag
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    
    const displayTag = `${myProfile?.displayName || user?.displayName || 'Steve'}`;
    ctx.fillText(displayTag, pX + player.width / 2, pY - 8);

    // Add visual glowing effect around their head representing clan features
    if (myProfile?.activeGlow && myProfile.activeGlow !== 'none') {
      ctx.strokeStyle = myProfile.activeGlow === 'rainbow' ? 'magenta' : myProfile.activeGlow;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pX - 2, pY - 2, player.width + 4, player.height + 4);
    }
  };

  // Helper code to paint procedurally beautiful individual blocks
  const drawPixelBlock = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    type: string, 
    health?: number, 
    maxHealth?: number
  ) => {
    // 8x8 virtual pixel mapping inside 48px tile
    const pSize = tileSize / 8;
    
    if (type === 'grass') {
      ctx.fillStyle = '#55a630'; // Base Grass
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#2b9348'; // dark patches
      ctx.fillRect(x + pSize * 2, y + pSize * 3, pSize * 2, pSize);
      ctx.fillRect(x + pSize * 5, y + pSize * 5, pSize, pSize * 2);
      ctx.fillStyle = '#80b918'; // lighter highlights
      ctx.fillRect(x + pSize * 1, y + pSize * 1, pSize, pSize);
      ctx.fillRect(x + pSize * 6, y + pSize * 2, pSize * 2, pSize);
    } else if (type === 'stone') {
      ctx.fillStyle = '#7c7c7c'; // Base Stone
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#5c5c5c'; // shadow
      ctx.fillRect(x, y + tileSize - pSize, tileSize, pSize);
      ctx.fillRect(x + tileSize - pSize, y, pSize, tileSize);
      ctx.fillStyle = '#9c9c9c'; // highlight
      ctx.fillRect(x + pSize, y + pSize, pSize * 2, pSize);
    } else if (type === 'coal') {
      ctx.fillStyle = '#7c7c7c'; // stone base
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#222222'; // coal spots
      ctx.fillRect(x + pSize * 2, y + pSize * 2, pSize * 2, pSize * 2);
      ctx.fillRect(x + pSize * 5, y + pSize * 4, pSize * 2, pSize);
    } else if (type === 'iron') {
      ctx.fillStyle = '#7c7c7c'; // stone base
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#d49b65'; // iron ore
      ctx.fillRect(x + pSize * 2, y + pSize * 2, pSize * 2, pSize);
      ctx.fillRect(x + pSize * 5, y + pSize * 5, pSize, pSize);
    } else if (type === 'gold') {
      ctx.fillStyle = '#7c7c7c'; // stone base
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#fcca03'; // gold shiny
      ctx.fillRect(x + pSize * 3, y + pSize * 1, pSize * 2, pSize * 2);
      ctx.fillRect(x + pSize * 1, y + pSize * 5, pSize, pSize);
    } else if (type === 'diamond') {
      ctx.fillStyle = '#7c7c7c'; // stone base
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#04f3ff'; // glowing diamond cyan
      ctx.fillRect(x + pSize * 2, y + pSize * 2, pSize * 2, pSize * 2);
      ctx.fillRect(x + pSize * 5, y + pSize * 5, pSize, pSize);
    } else if (type === 'emerald') {
      ctx.fillStyle = '#7c7c7c'; // stone base
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#06c231'; // emerald green
      ctx.fillRect(x + pSize * 3, y + pSize * 3, pSize * 2, pSize * 2);
    } else if (type === 'water') {
      ctx.fillStyle = 'rgba(23, 107, 224, 0.75)'; // Water pool
      ctx.fillRect(x, y, tileSize, tileSize);
    } else if (type === 'lava') {
      // Pulsing procedural lava animations
      const wave = Math.sin(Date.now() / 400) * 10;
      ctx.fillStyle = `rgb(${225 + wave}, ${50 + wave * 2}, 10)`;
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#ff6a00';
      ctx.fillRect(x + pSize * 2, y + pSize * 3, pSize * 2, pSize);
    } else if (type === 'tree') {
      ctx.fillStyle = '#3a5a40'; // Tree leaves
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#5c4033'; // center log trunk
      ctx.fillRect(x + tileSize/2 - pSize, y + tileSize - pSize * 3, pSize * 2, pSize * 3);
    } else if (type === 'flower') {
      ctx.fillStyle = '#55a630'; // grass backdrop
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#ff4d6d'; // rose petal color
      ctx.fillRect(x + tileSize/2 - pSize, y + tileSize/2 - pSize, pSize * 2, pSize * 2);
    } else if (type === 'mided') {
      // Dark ground left-overs
      ctx.fillStyle = '#402a1b';
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#22150c';
      ctx.fillRect(x + pSize, y + pSize, pSize * 6, pSize * 6);
    }

    // 4. Paint CRACK overlay indicating structural durability decay if damaged
    if (health !== undefined && maxHealth !== undefined && health < maxHealth) {
      const crackRatio = health / maxHealth;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (crackRatio < 0.75) {
        ctx.moveTo(x + pSize, y + pSize); ctx.lineTo(x + tileSize - pSize, y + tileSize - pSize);
      }
      if (crackRatio < 0.5) {
        ctx.moveTo(x + tileSize - pSize, y + pSize); ctx.lineTo(x + pSize, y + tileSize - pSize);
      }
      if (crackRatio < 0.25) {
        ctx.moveTo(x + tileSize/2, y + pSize); ctx.lineTo(x + tileSize/2, y + tileSize - pSize);
      }
      ctx.stroke();
    }
  };

  // Mining Action triggered when clicking the canvas directly!
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const player = playerRef.current;
    const viewWidth = canvas.width;
    const viewHeight = canvas.height;

    // Map viewport coordinates back to actual absolute world coords
    const camX = Math.max(0, Math.min(worldSize.width - viewWidth, player.x - viewWidth / 2));
    const camY = Math.max(0, Math.min(worldSize.height - viewHeight, player.y - viewHeight / 2));

    const worldClickX = clickX + camX;
    const worldClickY = clickY + camY;

    // 1. Identify which exact voxel coordinate was clicked
    const targetTileIndex = tiles.findIndex(tile => {
      return worldClickX >= tile.x && 
             worldClickX < tile.x + tileSize && 
             worldClickY >= tile.y && 
             worldClickY < tile.y + tileSize;
    });

    if (targetTileIndex === -1) return;
    const tile = tiles[targetTileIndex];

    if (tile.broken || tile.type === 'grass' || tile.type === 'water') return;

    // Check distance range from player (cannot mine blocks too far away, matching spiel2.mp4 exact physics!)
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const tileCenterX = tile.x + tileSize / 2;
    const tileCenterY = tile.y + tileSize / 2;

    const dist = Math.sqrt(Math.pow(playerCenterX - tileCenterX, 2) + Math.pow(playerCenterY - tileCenterY, 2));
    
    // Check range ceiling
    if (dist > 150) {
      addLog('§4⚠️ Zu weit entfernt zum Abbbauen! Geh näher ran.');
      return;
    }

    // Tools requirement safety checks - matching chat warns from video frame:
    // "Wooden pickaxe is not suitable for extraction: diamond"
    const toolPower = equippedPickaxe?.power || 0;
    
    if (tile.type === 'diamond' && toolPower < 3) {
      addLog(`§6⚠️ Wooden pickaxe is not suitable for extraction: diamond`);
      addLog('§4Dein aktuelles Tool ist zu schwach für Diamanterz! Kaufe eine Goldene/Diamant-Spitzhacke.');
      playRetroSound('hurt');
      return;
    }

    if (tile.type === 'emerald' && toolPower < 5) {
      addLog(`§6⚠️ Iron pickaxe or wooden pickaxe is not suitable for extraction: emerald`);
      addLog('§4Dein aktuelles Tool ist zu schwach für Smaragde! Du benötigst mindestens eine Diamant-Spitzhacke!');
      playRetroSound('hurt');
      return;
    }

    if (tile.type === 'gold' && toolPower < 2) {
      addLog(`§6⚠️ Wooden pickaxe is not suitable for extraction: gold`);
      addLog('§4Du benötigst mindestens eine Eisen-Spitzhacke für Golderz!');
      playRetroSound('hurt');
      return;
    }

    // Energy drain checks
    if (energy < 2) {
      addLog('§4⚡ Unzureichende Energie! Lasse deinen Energiekern im HUD aufladen.');
      playRetroSound('hurt');
      return;
    }

    // Consume Energy for hit
    setEnergy(prev => Math.max(0, prev - 2));

    // Deal damage to tile based on pickaxe power level
    const nextHealth = Math.max(0, tile.health - toolPower);
    playRetroSound('hit');

    const updatedTiles = [...tiles];
    updatedTiles[targetTileIndex] = { ...tile, health: nextHealth };

    if (nextHealth <= 0) {
      // Mined successfully! Break tile!
      updatedTiles[targetTileIndex].broken = true;
      playRetroSound('mine');
      setBlocksMined(p => p + 1);

      // Reward calculations & synchronization with actual user profile database!
      let coinsReward = 5;
      let xpReward = 10;
      let successMsg = '';

      switch (tile.type) {
        case 'coal': coinsReward = 15; xpReward = 20; successMsg = '§aKohle abgebaut!'; break;
        case 'iron': coinsReward = 45; xpReward = 60; successMsg = '§eEisenerz abgebaut! +45 Coins'; break;
        case 'gold': coinsReward = 120; xpReward = 150; successMsg = '§6Golderz abgebaut! +120 Coins'; break;
        case 'diamond': coinsReward = 500; xpReward = 450; successMsg = '§bDiamanterz abgebaut! +500 Coins 🔥'; break;
        case 'emerald': coinsReward = 1200; xpReward = 1000; successMsg = '§2Smaragderz abgebaut! +1200 Coins! UNSCHLAGBAR 👑'; break;
        case 'tree': coinsReward = 10; xpReward = 15; successMsg = 'Holz gefällt!'; break;
        case 'flower': coinsReward = 2; xpReward = 5; successMsg = 'Blume gesammelt'; break;
        default: coinsReward = 5; xpReward = 8; successMsg = 'Stein zerschlagen'; break;
      }

      addLog(`${successMsg} (+${coinsReward} 🪙 / +${xpReward} XP)`);

      // Increment stats and sync with Firebase real-time!
      setCoins(p => p + coinsReward);
      setXp(p => p + xpReward);

      // Simple quest progression
      if (tile.type === 'iron' && trainingTask.includes('Eisenerz')) {
        setTrainingTask('Herausforderung: Reist du tiefer um Diamanten? Kaufe Upgrades im Shop!');
        triggerToast('quest', '🎮 SPIEL-QUEST ABGESCHLOSSEN', 'Du hast das erste Eisenerz abgebaut!', { amount: 100 });
      }

      // Sync safely to Firebase Firestore
      if (user) {
        const docRef = doc(db, 'user_profiles', user.uid);
        updateDoc(docRef, {
          coins: increment(coinsReward),
          xp: increment(xpReward)
        }).catch(err => console.error("Firebase world sync failed", err));
      }
    }

    setTiles(updatedTiles);
  };

  // Recharging values
  useEffect(() => {
    const rechargeInterval = setInterval(() => {
      setEnergy(prev => Math.min(100, prev + 4));
      setHealth(prev => Math.min(10, prev + 1));
    }, 3000);
    return () => clearInterval(rechargeInterval);
  }, []);

  // Purchase dynamic store assets
  const buyItems = (item: Item) => {
    if (coins < item.price) {
      triggerToast('xp', '❌ COINS REICHEN NICHT', `Du benötigst ${item.price} Coins für dieses Item.`);
      playRetroSound('hurt');
      return;
    }

    // Deduct coins & update owned items
    const nextCoins = coins - item.price;
    setCoins(nextCoins);
    setOwnedItems(prev => [...prev, item.id]);
    playRetroSound('buy');

    // Automatically slot if pickaxe
    if (item.category === 'Spitzhaken') {
      const emptySlot = hotbar.findIndex(s => s === null);
      if (emptySlot !== -1) {
        const nextHotbar = [...hotbar];
        nextHotbar[emptySlot] = { id: item.id, name: item.name, power: item.power };
        setHotbar(nextHotbar);
      }
      triggerToast('quest', '🛒 ITEM GEKAUFT', `${item.name} erfolgreich erworben und im Inventar hinterlegt!`);
    } else {
      triggerToast('quest', '🛒 AUSRÜSTUNG GEKAUFT', `${item.name} schützt dich jetzt im Kampf und in Lava-Zonen!`);
    }

    // Sync purchase with real Firestore User DB
    if (user) {
      const docRef = doc(db, 'user_profiles', user.uid);
      updateDoc(docRef, {
        coins: nextCoins
      }).catch(err => console.error("Deduct coins failed", err));
    }
  };

  // Skip Training trigger
  const skipTraining = () => {
    setTrainingTask('Abenteuer läuft: Erkunde die offene 2D Pixel-Karte!');
    triggerToast('xp', '⚡ TRAINING ÜBERSPRUNGEN', 'Du bist nun auf dich allein gestellt.');
  };

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !teamMotto.trim()) return;

    const newTeam = { name: teamName.trim(), motto: teamMotto.trim() };
    setTeamsList(prev => [...prev, newTeam]);
    setActiveTeam(newTeam);
    addLog(`§eDu hast das Team [${newTeam.name}] gegründet!`);
    setTeamName('');
    setTeamMotto('');
    triggerToast('level', '🛡️ CLAN TEAM GRÜNDUNG', `Erfolgreich erstellt: ${newTeam.name}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#07090e] border border-white/5 relative overflow-hidden custom-scrollbar">
      
      {/* Top HUD Panel mirroring spiel2.mp4 exactly */}
      <div className="p-4 bg-black/80 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 z-20 font-mono text-xs text-white">
        {/* Left Side: Top players scoreboard overlay list matching spiel2.mp4 */}
        <div className="flex items-center gap-4 bg-neutral-950/80 px-4 py-2 rounded-xl border border-white/5">
          <Trophy size={14} className="text-mc-gold animate-bounce" />
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-500 font-extrabold uppercase">Top Players</span>
            <div className="flex items-center gap-3">
              <span className="text-mc-gold font-bold">1. Join11Lennon <span className="text-neutral-400">$2.8K</span> 🇮🇱</span>
              <span className="text-neutral-500">|</span>
              <span className="text-white font-bold">2. RiggedyRekt <span className="text-neutral-400 font-normal">(${(coins || 0).toLocaleString()})</span> 🇩🇪</span>
            </div>
          </div>
        </div>

        {/* Mid: Weather stats */}
        <div className="flex items-center gap-5">
          {/* Hour & clock */}
          <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-lg border border-white/5">
            <Clock size={12} className="text-mc-gold" />
            <span>{String(gameTime.hour).padStart(2, '0')}:{String(gameTime.minute).padStart(2, '0')} AM</span>
          </div>

          {/* Wind Speed status */}
          <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-lg border border-white/5">
            <Wind size={12} className="text-sky-400" />
            <span>{windSpeed} m/s</span>
          </div>

          {/* Temperature status */}
          <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-lg border border-white/5">
            <Thermometer size={12} className="text-orange-400" />
            <span>{temperature}°C</span>
          </div>
        </div>

        {/* Right Side: Simple training box */}
        <div className="bg-green-950/20 border border-green-500/20 px-4 py-2 rounded-xl max-w-sm flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] text-green-400 font-extrabold uppercase mb-0.5 animate-pulse">AKTIVITÄT</p>
            <p className="text-[10px] text-neutral-300 font-bold leading-normal truncate">{trainingTask}</p>
          </div>
          <button 
            onClick={skipTraining}
            className="px-2 py-1 bg-green-500 text-black rounded text-[9px] font-black hover:bg-green-400 transition-colors"
          >
            SKIP
          </button>
        </div>
      </div>

      {/* Interactive Navigation System for Panels */}
      <div className="p-3 bg-neutral-950 border-b border-white/5 flex gap-2 relative z-20">
        <button
          onClick={() => setActiveTab('game')}
          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border flex items-center justify-center gap-2 ${
            activeTab === 'game'
              ? 'bg-mc-gold/25 border-mc-gold text-mc-gold shadow-[0_0_15px_rgba(255,170,0,0.15)]'
              : 'bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Play size={12} fill="currentColor" />
          Spiel-Feld
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border flex items-center justify-center gap-2 ${
            activeTab === 'shop'
              ? 'bg-mc-gold/25 border-mc-gold text-mc-gold shadow-[0_0_15px_rgba(255,170,0,0.15)]'
              : 'bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShoppingBag size={12} />
          Minecraft Shop ( spiel2.mp4 )
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border flex items-center justify-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-mc-gold/25 border-mc-gold text-mc-gold shadow-[0_0_15px_rgba(255,170,0,0.15)]'
              : 'bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers size={12} />
          Inventar & Ausrüstung
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border flex items-center justify-center gap-2 ${
            activeTab === 'teams'
              ? 'bg-mc-gold/25 border-mc-gold text-mc-gold shadow-[0_0_15px_rgba(255,170,0,0.15)]'
              : 'bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users size={12} />
          Team gründen
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'game' && (
          <motion.div 
            key="voxel-adventure-gameplay"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col md:flex-row relative outline-none min-h-0"
          >
            {/* The Actual Canvas Render */}
            <div className="flex-1 bg-[#151515] flex flex-col justify-center items-center relative overflow-hidden p-2">
              <canvas 
                ref={canvasRef} 
                width={700} 
                height={460}
                onClick={handleCanvasClick}
                className="max-w-full block bg-black/50 rounded-2xl border-2 border-neutral-800 shadow-2xl cursor-crosshair hover:border-mc-gold transition-colors"
                title="Spielfeld: Tippe auf einen Block in der Nähe zum Abbauen!"
              />

              {/* Dynamic Movement Tips */}
              <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none md:block hidden">
                <p className="text-[10px] text-neutral-500 font-mono">
                  Bewege dich mit <kbd className="bg-neutral-800 text-white border border-neutral-700 px-1 py-0.5 rounded text-[8px] font-bold">W</kbd> <kbd className="bg-neutral-800 text-white border border-neutral-700 px-1 py-0.5 rounded text-[8px] font-bold">A</kbd> <kbd className="bg-neutral-800 text-white border border-neutral-700 px-1 py-0.5 rounded text-[8px] font-bold">S</kbd> <kbd className="bg-neutral-800 text-white border border-neutral-700 px-1 py-0.5 rounded text-[8px] font-bold">D</kbd> oder den Pfeiltasten. <strong className="text-mc-gold">Klicke/Tappe direkte Erze an</strong>, um sie mit deiner hotbar-aktiven Spitzhacke zu minen!
                </p>
              </div>

              {/* Touch controllers for smartphone fallback screens */}
              <div className="absolute bottom-4 right-4 flex flex-col items-center gap-1 pointer-events-auto md:hidden z-20">
                <button 
                  onTouchStart={() => { keysPressed.current['w'] = true; }}
                  onTouchEnd={() => { keysPressed.current['w'] = false; }}
                  className="w-10 h-10 bg-black/80 border border-neutral-700 text-white flex items-center justify-center rounded-xl text-sm font-black active:scale-95"
                >
                  ▲
                </button>
                <div className="flex gap-1">
                  <button 
                    onTouchStart={() => { keysPressed.current['a'] = true; }}
                    onTouchEnd={() => { keysPressed.current['a'] = false; }}
                    className="w-10 h-10 bg-black/80 border border-neutral-700 text-white flex items-center justify-center rounded-xl text-sm font-black active:scale-95"
                  >
                    ◀
                  </button>
                  <button 
                    onTouchStart={() => { keysPressed.current['s'] = true; }}
                    onTouchEnd={() => { keysPressed.current['s'] = false; }}
                    className="w-10 h-10 bg-black/80 border border-neutral-700 text-white flex items-center justify-center rounded-xl text-sm font-black active:scale-95"
                  >
                    ▼
                  </button>
                  <button 
                    onTouchStart={() => { keysPressed.current['d'] = true; }}
                    onTouchEnd={() => { keysPressed.current['d'] = false; }}
                    className="w-10 h-10 bg-black/80 border border-neutral-700 text-white flex items-center justify-center rounded-xl text-sm font-black active:scale-95"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar with log messages and user progress indicators */}
            <div className="w-full md:w-80 bg-neutral-950/90 border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-between shrink-0 p-5 font-mono text-xs text-white">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Activity size={14} className="text-mc-gold animate-pulse" />
                  <span className="font-extrabold uppercase text-[10px]">Spieler Status</span>
                </div>

                <div className="space-y-2.5">
                  {/* Energy core */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>⚡ Energiekern</span>
                      <span className="text-mc-gold">{energy}%</span>
                    </div>
                    <div className="h-2 bg-neutral-900 border border-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-mc-gold transition-all duration-300" style={{ width: `${energy}%` }} />
                    </div>
                  </div>

                  {/* Health hearts system */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>❤️ Vitalität</span>
                      <span>{health}/10</span>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <Heart 
                          key={`heart-${i}`} 
                          size={12} 
                          className={i < health ? 'text-mc-red fill-mc-red animate-pulse' : 'text-neutral-800'} 
                        />
                      ))}
                    </div>
                  </div>

                  {/* Active Tool equipped status display */}
                  <div className="pt-2 flex justify-between items-center text-[11px] bg-white/5 p-2 rounded-lg border border-white/5">
                    <span className="text-neutral-400 font-bold uppercase text-[9px]">Tool aktiv:</span>
                    <span className="text-mc-gold font-extrabold tracking-wide uppercase italic">
                      {equippedPickaxe ? equippedPickaxe.name : 'Kein Tool'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat action logbox matching spiel2.mp4 exact overlay printouts */}
              <div className="flex-1 min-h-[140px] max-h-[220px] bg-black/40 border border-white/5 rounded-xl p-3 my-4 overflow-y-auto font-mono text-[10px] leading-relaxed select-none">
                <p className="text-neutral-500 border-b border-white/5 pb-1 mb-1 font-extrabold uppercase text-[8px] tracking-[0.2em]">Game Chat Logs</p>
                {logs.length === 0 ? (
                  <p className="text-neutral-600 italic">No logs generated yet...</p>
                ) : (
                  logs.map((logMsg, lIdx) => (
                    <p 
                      key={`game-log-${lIdx}`} 
                      className={`mb-1 truncate ${
                        logMsg.includes('§4') ? 'text-rose-500 font-bold' :
                        logMsg.includes('§a') ? 'text-green-400 font-bold' :
                        logMsg.includes('§6') ? 'text-mc-gold font-bold' :
                        logMsg.includes('§e') ? 'text-yellow-400 font-bold' :
                        logMsg.includes('§b') ? 'text-cyan-400 font-bold font-mono' :
                        'text-neutral-400 font-medium'
                      }`}
                    >
                      {logMsg.replace(/§[4-9a-fklmnor]/g, '')}
                    </p>
                  ))
                )}
              </div>

              {/* Dynamic Coins/XP indicators syncing with main Firestore databases */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                <div className="bg-[#0f1420] border border-white/5 p-2 rounded-xl text-center">
                  <span className="text-[8px] text-neutral-500 uppercase font-black block tracking-widest mb-0.5">Mines-Guthaben</span>
                  <span className="text-mc-gold font-black text-sm italic">{coins.toLocaleString()} 🪙</span>
                </div>
                <div className="bg-[#0f1420] border border-white/5 p-2 rounded-xl text-center">
                  <span className="text-[8px] text-neutral-500 uppercase font-black block tracking-widest mb-0.5">Zentrums-XP</span>
                  <span className="text-green-400 font-black text-sm font-mono block truncate">{xp.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SHOP SCREEN: Mirroring shop view layout cards from spiel2.mp4 perfectly */}
        {activeTab === 'shop' && (
          <motion.div 
            key="voxel-adventure-shop"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <ShoppingBag size={18} className="text-mc-gold animate-pulse" />
                  Minecraft Shop (spiel2.mp4)
                </h3>
                <p className="text-neutral-500 text-xs">Schalte stärkere Spitzhaken, Bohrer, Rüstungsteile oder Nano-Säbel frei, um seltene Erze abzubauen!</p>
              </div>
              <div className="bg-[#121926] px-4 py-2 border border-mc-gold/20 rounded-2xl flex items-center gap-2 font-mono">
                <span className="text-[10px] text-neutral-500 font-bold uppercase">Dein Guthaben:</span>
                <span className="text-sm font-black text-mc-gold animate-pulse">{coins.toLocaleString()} Coins 🪙</span>
              </div>
            </div>

            {/* Shop Grid List replicating spiel2.mp4 visuals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shopItems.map(item => {
                const isOwned = ownedItems.includes(item.id);
                return (
                  <div 
                    key={item.id}
                    className={`bg-neutral-950/40 border rounded-3xl p-5 flex flex-col justify-between transition-all group overflow-hidden relative ${
                      isOwned 
                        ? 'border-green-500/20 bg-green-950/5' 
                        : 'border-white/5 hover:border-mc-gold/40'
                    }`}
                  >
                    {/* Item category badge */}
                    <span className="absolute top-4 right-4 text-[8px] bg-white/5 border border-white/10 text-neutral-400 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest">
                      {item.category}
                    </span>

                    <div className="space-y-4">
                      {/* Pickaxe/Armor block icon placeholder drawn like 2D retro */}
                      <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-center relative overflow-hidden shrink-0">
                        <div 
                          className="w-10 h-10 rounded-lg shadow-inner flex items-center justify-center font-black text-xl italic" 
                          style={{ backgroundColor: `${item.imageColor}20`, color: item.imageColor }}
                        >
                          ⛏️
                        </div>
                      </div>

                      <div>
                        <h4 className="text-white font-black text-sm uppercase tracking-wide flex items-center gap-1.5 leading-none">
                          {item.name}
                          {isOwned && <span className="text-[9px] text-green-400 lowercase font-mono">(besessen)</span>}
                        </h4>
                        <p className="text-neutral-400 text-[11px] leading-relaxed mt-2">{item.description}</p>
                      </div>

                      {/* Performance values matching table logs from spiel2.mp4 shop pages */}
                      <div className="pt-3 border-t border-white/5 flex justify-between items-center font-mono text-[10px]">
                        <span className="text-neutral-500 font-bold">STÄRKE / EFFEKT:</span>
                        <span className="text-mc-gold font-extrabold flex items-center gap-1">
                          +{item.power} Abbau-Power
                        </span>
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-white/5 flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-neutral-500 font-bold uppercase">Preis</span>
                        <span className="text-mc-gold font-extrabold text-sm italic">{item.price.toLocaleString()} Coins</span>
                      </div>

                      <button
                        onClick={() => buyItems(item)}
                        disabled={isOwned}
                        className={`py-2 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all min-w-[90px] ${
                          isOwned 
                            ? 'bg-neutral-900 text-neutral-500 border border-white/5 cursor-not-allowed'
                            : 'bg-[#ffaa00] text-black hover:bg-[#ffbb22] font-black hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isOwned ? 'Verkauft' : 'Kaufen'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* INVENTORY & SLOTS ASSIGNMENTS SCREEN: Replicating inventory overlay grid list */}
        {activeTab === 'inventory' && (
          <motion.div 
            key="voxel-adventure-inventory"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Layers size={18} className="text-sky-400 animate-pulse" />
                  Mein Rucksack & Inventar-Zuweisung
                </h3>
                <p className="text-neutral-500 text-xs">Ordne deine Items den 5 Hotbar-Slots zu, um sie im Spielfeld über die Zahlentasten (1-5) oder Touch-Eingaben auszurüsten!</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Inventargitter-Grid */}
              <div className="md:col-span-7 bg-[#080d16]/30 border border-white/5 rounded-3xl p-6 space-y-4">
                <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sliders size={14} className="text-sky-400" />
                  Rucksack-Inhalt ({ownedItems.length} Items)
                </h4>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {ownedItems.map((itemId, idx) => {
                    const shopItemRef = shopItems.find(i => i.id === itemId);
                    if (!shopItemRef) return null;

                    return (
                      <button
                        key={`inventory-item-${itemId}-${idx}`}
                        className="aspect-square rounded-2xl bg-black/60 border border-neutral-800 hover:border-sky-400 p-2 flex flex-col justify-center items-center gap-1.5 transition-all group active:scale-95 relative"
                        onClick={() => {
                          // Drag item or direct assign to next empty slot inside hotbar
                          const emptySlotIdx = hotbar.findIndex(s => s === null);
                          if (emptySlotIdx !== -1) {
                            const nextHotbar = [...hotbar];
                            nextHotbar[emptySlotIdx] = { id: shopItemRef.id, name: shopItemRef.name, power: shopItemRef.power, imageColor: shopItemRef.imageColor };
                            setHotbar(nextHotbar);
                            addLog(`§a${shopItemRef.name} wurde Hotbar Slot ${emptySlotIdx+1} zugewiesen!`);
                          } else {
                            triggerToast('xp', '❌ HOTBAR VOLL', 'Bitte entferne erst ein Item aus deiner Hotbar, um Platz zu schaffen.');
                          }
                        }}
                        title={`Klick zum Ausrüsten auf freien Hotbar Slot`}
                      >
                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center font-black text-lg select-none group-hover:scale-110 transition-transform">
                          ⛏️
                        </div>
                        <span className="text-[8px] font-bold text-center text-neutral-400 block truncate w-full group-hover:text-white transition-colors">
                          {shopItemRef.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hotbar-Belegung */}
              <div className="md:col-span-5 bg-[#080d16]/30 border border-white/5 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Sliders size={14} className="text-mc-gold" />
                    Aktive Schnellzugriff-Hotbar (Slots 1 bis 5)
                  </h4>
                  <p className="text-neutral-500 text-[10px] leading-relaxed">
                    Spielfeld-Hotbars weisen den physischen Zahlentasten deines PC-Keyboards die Werkzeuge zu. Klicke ein Hotbar Slot Item zum un-staken (entfernen)!
                  </p>
                </div>

                {/* Hotbar Slots Draw matches spiel2.mp4 design */}
                <div className="space-y-3 pt-4">
                  {hotbar.map((slotItem, sIdx) => (
                    <div 
                      key={`hotbar-assign-slot-${sIdx}`}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                        selectedHotbarIndex === sIdx
                          ? 'bg-mc-gold/10 border-mc-gold shadow-[0_0_15px_rgba(255,170,0,0.1)]'
                          : 'bg-black/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-neutral-900 border border-white/5 text-[10px] font-mono text-center flex items-center justify-center font-black text-neutral-400">
                          {sIdx + 1}
                        </span>
                        {slotItem ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white/5 flex items-center justify-center rounded">⛏️</div>
                            <span className="text-xs font-black text-white">{slotItem.name}</span>
                            <span className="text-[10px] font-mono text-neutral-500">(Power +{slotItem.power})</span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-neutral-600 italic">-- Leer --</span>
                        )}
                      </div>

                      {slotItem && (
                        <button
                          onClick={() => {
                            const nextHotbar = [...hotbar];
                            nextHotbar[sIdx] = null;
                            setHotbar(nextHotbar);
                            // Reset equipped pickaxe if unequipped the current one
                            if (equippedPickaxe?.id === slotItem.id) {
                              setEquippedPickaxe(null);
                            }
                            addLog(`§7Item aus Hotbar Slot ${sIdx+1} entfernt.`);
                          }}
                          className="px-2 py-1 bg-red-950/40 border border-red-500/30 rounded text-[9px] font-black text-red-400 hover:bg-red-500 hover:text-black transition-all"
                        >
                          UNSTAKE
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TEAM MANAGER: matching create team popup from spiel2.mp4 directly */}
        {activeTab === 'teams' && (
          <motion.div 
            key="voxel-adventure-teams"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Users size={18} className="text-mc-gold animate-pulse" />
                  Clan Teamgründer-Zentrum ( spiel2.mp4 )
                </h3>
                <p className="text-neutral-500 text-xs">Schließe Allianzen mit Mitspielern des Minecraft Clans, um Territorien, Grundstücke und Ressourcen gemeinsam zu verwalten.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Formular to create a team exactly styled matching spill2.mp4 Popup overlay */}
              <div className="md:col-span-7 bg-[#0b0f19] border-2 border-mc-gold/20 p-6 rounded-[2rem] space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-mc-gold via-yellow-500 to-amber-500" />
                
                <div className="space-y-1.5 pb-2 border-b border-white/5">
                  <h4 className="text-white font-extrabold text-sm uppercase tracking-wider">Bündnis oder Team erstellen</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    If a teammate leaves the game or disc., his blocks will go to another teammate, if the new owner's limits are not exceeded. ( spiel2.mp4 )
                  </p>
                </div>

                <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-neutral-400">Team-Name ( Allianz )</label>
                    <input 
                      type="text" 
                      placeholder="z.B. Nether_Warriors"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full bg-black border border-neutral-800 hover:border-mc-gold rounded-xl px-4 py-3 text-xs outline-none text-white font-bold transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-neutral-400">Team-Motto oder Clan-Beschreibung</label>
                    <input 
                      type="text" 
                      placeholder="z.B. Gemeinsam bis an das Bedrock-Ende"
                      value={teamMotto}
                      onChange={(e) => setTeamMotto(e.target.value)}
                      className="w-full bg-black border border-neutral-800 hover:border-mc-gold rounded-xl px-4 py-3 text-xs outline-none text-white font-bold transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-mc-gold text-black hover:bg-yellow-400 font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                  >
                    BÜNDNIS GRÜNDEN
                  </button>
                </form>
              </div>

              {/* List of active teams */}
              <div className="md:col-span-5 bg-neutral-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
                <h4 className="text-white font-extrabold text-xs uppercase tracking-wider border-b border-white/5 pb-2">Active Other Alliances</h4>

                <div className="space-y-3">
                  {teamsList.map((team, tIdx) => (
                    <div 
                      key={`active-team-list-${tIdx}`}
                      className="p-3.5 rounded-2xl bg-black border border-neutral-800 hover:border-mc-gold transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-extrabold text-white text-xs">{team.name}</h5>
                          <p className="text-[10px] text-neutral-400 italic mt-0.5">"{team.motto}"</p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTeam(team);
                            addLog(`§eDu bist der Allianz [${team.name}] beigetreten!`);
                            triggerToast('quest', '🛡️ ALLIANZ BEIGETRETEN', `Willkommen im Team ${team.name}`);
                          }}
                          className="py-1 px-3 bg-neutral-900 hover:bg-mc-gold hover:text-black rounded text-[9px] font-black text-neutral-400 transition-colors"
                        >
                          JOIN
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
