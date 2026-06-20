import fs from 'fs';

const ClashEngineContent = `
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Shield, 
  Swords, 
  X, 
  Droplet, 
  Crown, 
  Settings, 
  Play,
  Box,
  FastForward,
  Info
} from 'lucide-react';
import { Card, CARDS_POOL, Chest } from '../data/cards';

export interface ClashArenaProps {
  onClose: () => void;
  user: any;
  myProfile: any;
}

// ----------------------------------------------------------------------
// DATA TYPES
// ----------------------------------------------------------------------
interface Troop {
  id: string;
  cardId: string;
  name: string;
  side: 'player' | 'enemy';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  shieldHp?: number;
  maxShield?: number;
  damage: number;
  hitSpeed: number; // in sec
  speed: number;
  range: number;
  sightRadius: number;
  mass: number;
  playType: 'troop' | 'building' | 'spell';
  targetType: 'any' | 'buildings' | 'ground' | 'air';
  isFlying: boolean;
  targetsFlying: boolean;
  
  // States
  state: 'moving' | 'attacking' | 'idle' | 'charging' | 'dashing';
  targetId: string | null;
  lastAttackTime: number;
  path: {x: number, y: number}[] | null;
  
  // Abilities
  chargeDuration?: number;
  chargeStart?: number;
  dashRange?: number;
  onDeath?: string;
  count?: number;

  // Building props
  lifetime?: number;
  spawnInterval?: number;
  lastSpawnTime?: number;
  spawnId?: string;

  // Visual
  image: string;
  color: string;
}

interface Projectile {
  id: string;
  type: 'arrow' | 'fireball' | 'spell_fireball' | 'spell_barrel' | 'bomb';
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetId?: string | null;
  side: 'player' | 'enemy';
  damage: number;
  speed: number; // pixels per sec
  startTime: number;
  travelTime: number;
  splashRadius?: number;
  arcHeight?: number;
}

interface SpellEffect {
  id: string;
  type: 'poison' | 'freeze';
  x: number;
  y: number;
  radius: number;
  side: 'player' | 'enemy';
  startTime: number;
  duration: number;
  damagePerSec?: number;
}

interface Tower {
  id: string;
  side: 'player' | 'enemy';
  type: 'king' | 'princess';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  hitSpeed: number;
  lastAttackTime: number;
  isDead: boolean;
  isActive: boolean; // King tower is inactive until dmg or princess falls
}

// ----------------------------------------------------------------------
// MAIN VIEW COMPONENT
// ----------------------------------------------------------------------
export const ClashArenaView: React.FC<ClashArenaProps> = ({ onClose, user, myProfile }) => {
  const [currentScreen, setCurrentScreen] = useState<'menu'|'deck'>('menu');
  
  // Economy & Meta
  const [gold, setGold] = useState(1000);
  const [gems, setGems] = useState(100);
  const [trophies, setTrophies] = useState(0);
  const [chests, setChests] = useState<(Chest|null)[]>([null, null, null, null]);
  const [cardLevels, setCardLevels] = useState<Record<string, {level: number, copies: number}>>({});

  // Deck
  const [userDeck, setUserDeck] = useState<string[]>([]);
  // Initialize default deck
  useEffect(() => {
    const defaultDeck = CARDS_POOL.slice(0, 8).map(c => c.id);
    setUserDeck(defaultDeck);
  }, []);

  // Match State
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<'victory' | 'defeat' | 'draw' | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg h-[95vh] bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-neutral-700/50">
        
        {/* Header (Hidden in battle) */}
        {!isPlaying && (
          <div className="w-full bg-gradient-to-b from-blue-900 to-blue-950 border-b border-blue-800 p-3 sm:p-4 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center border-2 border-blue-400 shadow-inner">
                  <Crown size={24} className="text-yellow-400 drop-shadow" />
               </div>
               <div>
                 <h2 className="text-white font-black text-sm sm:text-base leading-tight">Spieler {user?.displayName || ''}</h2>
                 <div className="flex gap-2 text-xs font-bold mt-0.5">
                   <div className="bg-yellow-600/30 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-600/50 flex items-center gap-1">
                     <Trophy size={10} /> {trophies}
                   </div>
                   <div className="bg-orange-600/30 text-orange-400 px-1.5 py-0.5 rounded border border-orange-600/50 flex items-center gap-1">
                     🪙 {gold}
                   </div>
                 </div>
               </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-lg flex items-center justify-center transition">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Menu Screen */}
        {!isPlaying && currentScreen === 'menu' && (
          <MenuScreen 
             onPlay={() => setIsPlaying(true)} 
             onDeck={() => setCurrentScreen('deck')}
             userDeck={userDeck}
             chests={chests}
             trophies={trophies}
          />
        )}

        {/* Deck Builder Screen */}
        {!isPlaying && currentScreen === 'deck' && (
          <DeckScreen 
             onBack={() => setCurrentScreen('menu')}
             userDeck={userDeck}
             setUserDeck={setUserDeck}
             cardLevels={cardLevels}
             gold={gold}
             setGold={setGold}
          />
        )}

        {/* Battle Applet */}
        {isPlaying && (
          <BattleEngine 
            deck={userDeck}
            cardLevels={cardLevels}
            onEnd={(result) => {
              setGameResult(result);
              if (result === 'victory') {
                setTrophies(t => t + 30);
                setGold(g => g + 50);
              } else if (result === 'defeat') {
                setTrophies(t => Math.max(0, t - 20));
              }
            }}
            gameResult={gameResult}
            onExit={() => {
              setGameResult(null);
              setIsPlaying(false);
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

// ----------------------------------------------------------------------
// MENU SCREEN
// ----------------------------------------------------------------------
const MenuScreen = ({ onPlay, onDeck, userDeck, chests, trophies }: any) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-black/60" />
      
      <div className="relative z-10 w-full text-center mt-6">
        <span className="text-yellow-400 font-bold tracking-widest uppercase bg-black/40 px-4 py-1 rounded-full border border-yellow-500/30 shadow-lg text-sm">
          Arena {Math.floor(trophies / 300) + 1}
        </span>
        <h1 className="text-5xl font-black text-white italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] mt-2" style={{ WebkitTextStroke: '1px black' }}>
          SCHLACHT
        </h1>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onPlay}
        className="relative z-10 w-48 h-20 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-3xl font-black text-3xl text-white shadow-[0_15px_30px_rgba(234,179,8,0.4),0_0_0_5px_#fef08a_inset,0_10px_0_#9a3412] uppercase tracking-wider flex items-center justify-center transform active:translate-y-2 active:shadow-[0_5px_15px_rgba(234,179,8,0.4),0_0_0_5px_#fef08a_inset,0_0px_0_#9a3412]"
        style={{ WebkitTextStroke: '1.5px #7c2d12' }}
      >
        KAMPF
      </motion.button>

      {/* Chests & Deck Quick View */}
      <div className="relative z-10 w-full w-full flex flex-col gap-4">
        {/* Chests Row */}
        <div className="flex gap-2 w-full justify-center">
          {chests.map((chest: any, i: number) => (
             <div key={i} className="flex-1 max-w-[80px] aspect-square bg-black/50 border-2 border-neutral-700 rounded-xl flex flex-col items-center justify-center shadow-inner">
               {chest ? (
                 <Box className="text-yellow-500 drop-shadow w-8 h-8" />
               ) : (
                 <span className="text-neutral-500 text-xs font-bold uppercase">Leer</span>
               )}
             </div>
          ))}
        </div>

        {/* Deck Preview */}
        <div className="w-full bg-black/60 p-3 rounded-2xl border-t border-white/10 backdrop-blur-md">
           <div className="flex justify-between items-end mb-2">
             <h3 className="text-gray-300 font-bold uppercase text-xs">Aktuelles Deck ({userDeck.length}/8)</h3>
             <button onClick={onDeck} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded shadow">
               BEARBEITEN
             </button>
           </div>
           <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
             {userDeck.map((id: string) => {
               const card = CARDS_POOL.find(c => c.id === id);
               if (!card) return null;
               return (
                 <div key={id} className="aspect-[3/4] bg-neutral-800 rounded-lg border border-neutral-700 overflow-hidden relative grayscale-[20%]">
                   <img src={card.image} className="w-full h-full object-cover" />
                 </div>
               );
             })}
           </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// DECK BUILDER SCREEN
// ----------------------------------------------------------------------
const DeckScreen = ({ onBack, userDeck, setUserDeck, cardLevels, gold, setGold }: any) => {
  return (
    <div className="flex-1 flex flex-col bg-slate-900 relative">
       {/* Background gradient */}
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-900 to-black pointer-events-none" />
       
       <div className="relative z-10 p-3 sm:p-4 flex flex-col h-full">
         <div className="flex items-center justify-between mb-4">
           <button onClick={onBack} className="bg-neutral-800 p-2 rounded-xl text-white shadow"><X size={20}/></button>
           <h2 className="text-xl font-black text-white italic drop-shadow" style={{ WebkitTextStroke: '1px black' }}>DECK</h2>
           <div className="w-10"></div>
         </div>

         {/* Chosen Deck */}
         <div className="grid grid-cols-4 gap-2 bg-black/40 p-2 rounded-xl mb-4 shrink-0 shadow-inner">
           {Array.from({length: 8}).map((_, idx) => {
             const id = userDeck[idx];
             const card = id ? CARDS_POOL.find(c => c.id === id) : null;
             return (
               <div key={idx} className="aspect-[3/4.2] bg-black/60 rounded-lg border border-neutral-700 flex items-center justify-center relative overflow-hidden">
                 {card ? (
                   <>
                     <img src={card.image} className="w-full h-full object-cover" />
                     <button onClick={() => setUserDeck((p: any) => p.filter((x:any) => x !== id))} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                       <X className="text-white" size={24} />
                     </button>
                   </>
                 ) : (
                   <span className="text-neutral-600 font-bold">?</span>
                 )}
               </div>
             );
           })}
         </div>

         {/* Collection Collection */}
         <div className="flex-1 overflow-y-auto">
           <h3 className="text-neutral-400 font-bold text-xs uppercase mb-2">Sammlung ({CARDS_POOL.length})</h3>
           <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pb-10">
             {CARDS_POOL.map(card => {
               const isSelected = userDeck.includes(card.id);
               // Rarity styling
               let rCol = 'border-neutral-500';
               if (card.rarity === 'Rare') rCol = 'border-orange-400';
               if (card.rarity === 'Epic') rCol = 'border-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]';
               if (card.rarity === 'Legendary') rCol = 'border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-pulse';

               return (
                 <div 
                   key={card.id} 
                   onClick={() => {
                     if (!isSelected && userDeck.length < 8) setUserDeck((p:any) => [...p, card.id]);
                   }}
                   className={\`aspect-[3/4.2] rounded-lg relative overflow-hidden transition cursor-pointer \${isSelected ? 'opacity-50 grayscale border-2 border-yellow-500' : \`border-2 \${rCol}\`}\`}
                 >
                   <img src={card.image} className="w-full h-full object-cover" />
                   <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent h-1/2" />
                   <div className="absolute bottom-1 inset-x-1 text-center text-white text-[9px] font-black uppercase truncate drop-shadow-md">
                     {card.name}
                   </div>
                   <div className="absolute top-1 left-1 bg-fuchsia-600 text-white text-[8px] font-black px-1.5 rounded" style={{ WebkitTextStroke: '0.5px black'}}>
                     {card.cost}
                   </div>
                 </div>
               )
             })}
           </div>
         </div>

       </div>
    </div>
  );
};


// ----------------------------------------------------------------------
// BATTLE ENGINE
// ----------------------------------------------------------------------
const BattleEngine = ({ deck, cardLevels, onEnd, gameResult, onExit }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elixir, setElixir] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(180); // 3 mins
  const [suddenDeath, setSuddenDeath] = useState(false);
  
  // Hand Engine
  const [hand, setHand] = useState<Card[]>([]);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const rotationQueue = useRef<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    // Fill Deck
    const activeCards = CARDS_POOL.filter(c => deck.includes(c.id));
    const shuffled = [...activeCards].sort(() => 0.5 - Math.random());
    setHand(shuffled.slice(0, 4));
    setNextCard(shuffled[4]);
    rotationQueue.current = shuffled.slice(5);
  }, []);

  const playCard = (cardId: string, x: number, y: number) => {
    // Implement spawn logic here
    const c = hand.find(c => c.id === cardId);
    if (!c || elixir < c.cost) return;

    setElixir(e => e - c.cost);
    
    // Cycle hand
    const newHand = hand.filter(h => h.id !== cardId);
    if (nextCard) newHand.push(nextCard);
    setHand(newHand);

    rotationQueue.current.push(c);
    const n = rotationQueue.current.shift();
    if (n) setNextCard(n);
    
    setSelectedCardId(null);
  };

  return (
    <div className="flex-1 flex flex-col relative w-full overflow-hidden bg-black">
      {/* UI Overlay */}
      <div className="absolute top-0 inset-x-0 z-30 flex justify-between p-2 pointer-events-none">
        <div className="bg-black/60 px-3 py-1 rounded-full text-white font-bold text-xs">
          Time: {Math.floor(secondsLeft/60)}:{(secondsLeft%60).toString().padStart(2,'0')}
        </div>
      </div>

      {gameResult && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6">
          <h2 className={\`text-4xl font-black italic uppercase \${gameResult === 'victory' ? 'text-yellow-400' : 'text-red-500'}\`}>
             {gameResult}
          </h2>
          <button onClick={onExit} className="mt-8 bg-blue-600 px-8 py-3 rounded-xl text-white font-black uppercase tracking-widest shadow">Weiter</button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 w-full relative flex items-center justify-center bg-[#1b3310]">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={600} 
          className="w-full max-w-[400px] h-full object-contain bg-[#34621c] touch-none"
        />
      </div>

      {/* Hand & Elixir */}
      <div className="w-full bg-[#121c10] border-t-2 border-neutral-700/60 p-3 relative z-40">
        <div className="h-4 w-full bg-black/80 rounded-full mb-3 overflow-hidden border border-fuchsia-950 relative">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-600 to-purple-500 transition-all duration-300" style={{ width: \`\${(elixir/10)*100}%\` }} />
          <div className="absolute inset-0 flex items-center px-3 text-white font-black text-xs drop-shadow">{Math.floor(elixir)}</div>
        </div>
        
        <div className="flex gap-2 w-full justify-center items-end">
          <div className="w-10 opacity-70 flex flex-col items-center">
            <span className="text-[8px] text-gray-400 font-bold uppercase">Nächste</span>
            {nextCard && <img src={nextCard.image} className="w-full aspect-[3/4] object-cover rounded shadow" />}
          </div>
          
          <div className="w-px h-12 bg-neutral-800" />
          
          {hand.map(card => {
             const affordable = elixir >= card.cost;
             const active = selectedCardId === card.id;
             return (
               <button 
                 key={card.id + Math.random()} 
                 onClick={() => setSelectedCardId(active ? null : card.id)}
                 className={\`flex-1 aspect-[3/4.2] max-w-[70px] rounded-lg border-2 overflow-hidden relative transition-all \${active ? 'border-yellow-400 scale-110 -translate-y-4' : affordable ? 'border-neutral-500' : 'border-neutral-800 grayscale opacity-60'}\`}
               >
                 <img src={card.image} className="w-full h-full object-cover" />
                 <div className="absolute top-1 left-1 bg-fuchsia-600 text-white text-[10px] font-black rounded px-1.5">{card.cost}</div>
               </button>
             )
          })}
        </div>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/components/ClashArenaView.tsx', ClashEngineContent);
console.log('ClashArenaView replaced successfully.');
