import fs from 'fs';

const content = fs.readFileSync('src/components/ClashArenaView.tsx', 'utf-8');

const engineStart = content.indexOf('const BattleEngine = ({ deck, cardLevels, onEnd, gameResult, onExit }: any) => {');
const engineCode = \`const BattleEngine = ({ deck, cardLevels, onEnd, gameResult, onExit }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State
  const [elixir, setElixir] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(180); // 3 mins
  const [suddenDeath, setSuddenDeath] = useState(false);
  
  // Hand Engine
  const [hand, setHand] = useState<Card[]>([]);
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const rotationQueue = useRef<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Entities 
  const troopsRef = useRef<Troop[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const spellsRef = useRef<SpellEffect[]>([]);
  const floatTextsRef = useRef<{x:number, y:number, text:string, life:number, maxLife:number, color:string}[]>([]);
  
  const towersRef = useRef<Tower[]>([
    { id: 'p_king', side: 'player', type: 'king', x: 200, y: 550, hp: 4000, maxHp: 4000, damage: 100, range: 7, hitSpeed: 1.0, lastAttackTime: 0, isDead: false, isActive: false },
    { id: 'p_prin_l', side: 'player', type: 'princess', x: 70, y: 450, hp: 2500, maxHp: 2500, damage: 110, range: 7.5, hitSpeed: 0.8, lastAttackTime: 0, isDead: false, isActive: true },
    { id: 'p_prin_r', side: 'player', type: 'princess', x: 330, y: 450, hp: 2500, maxHp: 2500, damage: 110, range: 7.5, hitSpeed: 0.8, lastAttackTime: 0, isDead: false, isActive: true },
    { id: 'e_king', side: 'enemy', type: 'king', x: 200, y: 50, hp: 4000, maxHp: 4000, damage: 100, range: 7, hitSpeed: 1.0, lastAttackTime: 0, isDead: false, isActive: false },
    { id: 'e_prin_l', side: 'enemy', type: 'princess', x: 70, y: 150, hp: 2500, maxHp: 2500, damage: 110, range: 7.5, hitSpeed: 0.8, lastAttackTime: 0, isDead: false, isActive: true },
    { id: 'e_prin_r', side: 'enemy', type: 'princess', x: 330, y: 150, hp: 2500, maxHp: 2500, damage: 110, range: 7.5, hitSpeed: 0.8, lastAttackTime: 0, isDead: false, isActive: true },
  ]);

  const lastTimeRef = useRef<number>(0);
  const animFrameId = useRef<number>(0);
  const [doubleElixir, setDoubleElixir] = useState(false);

  // Load Deck
  useEffect(() => {
    const activeCards = CARDS_POOL.filter(c => deck.includes(c.id));
    const shuffled = [...activeCards].sort(() => 0.5 - Math.random());
    setHand(shuffled.slice(0, 4));
    setNextCard(shuffled[4] || CARDS_POOL[0]);
    rotationQueue.current = shuffled.slice(5).concat(shuffled.length < 8 ? [] : []);
  }, [deck]);

  // Main Game Loop (Delta-Time based)
  useEffect(() => {
    const PxPerTile = 20;

    const spawnText = (x:number, y:number, text:string, color:string) => {
       floatTextsRef.current.push({x, y, text, life: 1, maxLife: 1, color});
    };

    const damageEntity = (target: any, dmg: number) => {
      if (target.isDead) return;
      
      // Overkill Shield mechanic
      if (target.shieldHp && target.shieldHp > 0) {
         if (target.shieldHp >= dmg) {
            target.shieldHp -= dmg;
         } else {
            // Shield breaks, absorbing ALL excess damage in this hit
            target.shieldHp = 0;
            spawnText(target.x, target.y - 10, "Schutz gebrochen!", "#94a3b8");
         }
         return;
      }

      target.hp -= dmg;
      if (target.hp <= 0) {
        target.hp = 0;
        target.isDead = true;

        if (target.type === 'king' || target.type === 'princess') {
           // Tower destroyed
           if (target.type === 'king') {
             onEnd(target.side === 'enemy' ? 'victory' : 'defeat');
           } else {
             // Activate king
             const k = towersRef.current.find(t => t.side === target.side && t.type === 'king');
             if (k) k.isActive = true;
           }
        } else if (target.onDeath) {
           // Death abilities (e.g. bomb drop)
           if (target.onDeath === 'bomb') {
              projectilesRef.current.push({
                 id: Math.random().toString(), type: 'bomb',
                 x: target.x, y: target.y, startX: target.x, startY: target.y, targetX: target.x, targetY: target.y,
                 side: target.side, damage: 1000, speed: 0, startTime: Date.now(), travelTime: 3, splashRadius: 3 * PxPerTile
              });
           }
        }
      }
    };

    const loop = (time: number) => {
       if (!lastTimeRef.current) lastTimeRef.current = time;
       const dt = (time - lastTimeRef.current) / 1000;
       lastTimeRef.current = time;

       if (gameResult) return; // Halt simulation if game over

       // Elixir Regen
       setElixir(prev => {
          const rate = doubleElixir ? (1/1.4) : (1/2.8);
          return Math.min(10, prev + (rate * dt));
       });

       const troops = troopsRef.current;
       const towers = towersRef.current;
       const projs = projectilesRef.current;
       const spells = spellsRef.current;

       // 1. Spells Logic (DoT / Freeze)
       for (let i = spells.length - 1; i >= 0; i--) {
          const sp = spells[i];
          sp.duration -= dt;
          if (sp.duration <= 0) { spells.splice(i, 1); continue; }
          
          if (sp.type === 'poison') {
              // Apply DoT
              const affected = [...troops, ...towers].filter(t => !t.isDead && Math.hypot(t.x - sp.x, t.y - sp.y) <= sp.radius * PxPerTile);
              affected.forEach(t => {
                 if (t.side !== sp.side) damageEntity(t, 20 * dt); // Poison tick
              });
          }
       }

       // 2. Troop AI & Movement
       for (let i=0; i<troops.length; i++) {
          const t = troops[i];
          if (t.hp <= 0) continue;

          // Find target logic
          if (!t.targetId || t.state === 'idle') {
             let bestDist = Infinity;
             let bestTarget: any = null;

             const candidates = t.targetType === 'buildings' ? towers : [...towers, ...troops];
             candidates.forEach(cand => {
                if (cand.side === t.side || cand.isDead) return;
                if (!cand.isActive && cand.type === 'king') return; // King inactive
                if (t.playType === 'troop' && !t.targetsFlying && cand.isFlying) return; // Cannot target flying

                const dist = Math.hypot(cand.x - t.x, cand.y - t.y);
                if (dist < bestDist && (t.targetType === 'buildings' || dist <= t.sightRadius * PxPerTile * 2)) {
                   bestDist = dist;
                   bestTarget = cand;
                }
             });

             if (bestTarget) {
                t.targetId = bestTarget.id;
                t.state = 'moving';
             }
          }

          // Move towards target / Bridges
          if (t.targetId && t.state === 'moving') {
             const target = [...troops, ...towers].find(x => x.id === t.targetId && !x.isDead);
             if (!target) {
                t.targetId = null;
                t.state = 'idle';
                continue;
             }

             // Check if within attack range
             const dist = Math.hypot(target.x - t.x, target.y - t.y);
             if (dist <= t.range * PxPerTile) {
                t.state = 'attacking';
             } else {
                // Movement logic (Include bridge pathing)
                let tx = target.x;
                let ty = target.y;

                if (!t.isFlying) {
                   // Bridge check: If troop is on one side and target on other, must go to nearest bridge
                   const onPlayerSide = t.y > 300;
                   const targetOnPlayerSide = target.y > 300;
                   if (onPlayerSide !== targetOnPlayerSide) {
                      const b1x = 85; const b2x = 315;
                      const d1 = Math.abs(t.x - b1x);
                      const d2 = Math.abs(t.x - b2x);
                      tx = d1 < d2 ? b1x : b2x;
                      ty = onPlayerSide ? 280 : 320; 
                   }
                }

                // Move
                const moveDist = t.speed * dt;
                const angle = Math.atan2(ty - t.y, tx - t.x);
                t.x += Math.cos(angle) * moveDist;
                t.y += Math.sin(angle) * moveDist;
             }
          }

          // Attacking
          if (t.state === 'attacking' && t.targetId) {
             const target = [...troops, ...towers].find(x => x.id === t.targetId && !x.isDead);
             if (!target || Math.hypot(target.x - t.x, target.y - t.y) > t.range * PxPerTile * 1.5) {
                t.state = 'idle';
             } else {
                t.lastAttackTime += dt;
                if (t.lastAttackTime >= t.hitSpeed) {
                   t.lastAttackTime = 0;
                   
                   // Is Ranged?
                   if (t.range > 2) {
                      projs.push({
                         id: Math.random().toString(), type: 'arrow',
                         x: t.x, y: t.y, startX: t.x, startY: t.y, targetX: target.x, targetY: target.y, targetId: target.id,
                         side: t.side, damage: t.damage, speed: 300, startTime: time, travelTime: Math.hypot(target.x-t.x, target.y-t.y)/300
                      });
                   } else {
                      // Melee Instant
                      damageEntity(target, t.damage);
                   }
                }
             }
          }
       }

       // 3. Separation (Boids Hitbox) for ground troops
       for (let i=0; i<troops.length; i++) {
          const t1 = troops[i];
          if (t1.isFlying || t1.hp <= 0) continue;
          for (let j=i+1; j<troops.length; j++) {
             const t2 = troops[j];
             if (t2.isFlying || t2.hp <= 0) continue;

             const dx = t2.x - t1.x;
             const dy = t2.y - t1.y;
             const dist = Math.hypot(dx, dy);
             const minDist = 15; // Hitbox radius

             if (dist < minDist && dist > 0) {
                const overlap = minDist - dist;
                const forceX = (dx / dist) * overlap * 0.5;
                const forceY = (dy / dist) * overlap * 0.5;
                
                // Mass pushing logic
                const ratio1 = t2.mass / (t1.mass + t2.mass);
                const ratio2 = t1.mass / (t1.mass + t2.mass);
                
                t1.x -= forceX * ratio1; t1.y -= forceY * ratio1;
                t2.x += forceX * ratio2; t2.y += forceY * ratio2;
             }
          }
       }

       // Clear dead troops
       troopsRef.current = troopsRef.current.filter(t => t.hp > 0);

       // 4. Projectiles
       for (let i = projs.length - 1; i >= 0; i--) {
          const p = projs[i];
          const elapsed = (time - p.startTime) / 1000;
          
          if (elapsed >= p.travelTime) {
             // Impact
             if (p.splashRadius) {
                // AoE Damage
                const affected = [...troops, ...towers].filter(t => !t.isDead && t.side !== p.side && Math.hypot(t.x - p.targetX, t.y - p.targetY) <= p.splashRadius! * PxPerTile);
                affected.forEach(t => damageEntity(t, p.damage));
             } else if (p.targetId) {
                // Single Target
                const tar = [...troops, ...towers].find(t => t.id === p.targetId && !t.isDead);
                if (tar) damageEntity(tar, p.damage);
             }
             projs.splice(i, 1);
          } else {
             // Move linearly
             const prog = Math.min(1, elapsed / p.travelTime);
             p.x = p.startX + (p.targetX - p.startX) * prog;
             p.y = p.startY + (p.targetY - p.startY) * prog;
          }
       }

       render(dt);
       animFrameId.current = requestAnimationFrame(loop);
    };

    // Draw Function
    const render = (dt: number) => {
       const canvas = canvasRef.current;
       if (!canvas) return;
       const ctx = canvas.getContext('2d');
       if (!ctx) return;

       ctx.clearRect(0, 0, 400, 600);

       // Board Base
       ctx.fillStyle = '#4ade80';
       ctx.fillRect(0,0,400,600);

       // Checkered grass
       ctx.fillStyle = 'rgba(0,0,0,0.05)';
       for(let x=0; x<400; x+=20) {
         for(let y=0; y<600; y+=20) {
            if((x/20 + y/20)%2===0) ctx.fillRect(x,y,20,20);
         }
       }

       // River
       ctx.fillStyle = '#3b82f6';
       ctx.fillRect(0, 280, 400, 40);

       // Bridges
       ctx.fillStyle = '#78350f';
       ctx.fillRect(60, 275, 50, 50);
       ctx.fillRect(290, 275, 50, 50);

       // Spawn Zones (Player visual)
       if (selectedCardId) {
          ctx.fillStyle = 'rgba(59,130,246,0.2)';
          ctx.fillRect(0, 320, 400, 280);
       }

       // Draw Spells
       spellsRef.current.forEach(sp => {
          if (sp.type === 'poison') {
              ctx.fillStyle = 'rgba(217,119,6,0.4)';
              ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.radius*20, 0, Math.PI*2); ctx.fill();
          } else if (sp.type === 'freeze') {
              ctx.fillStyle = 'rgba(125,211,252,0.4)';
              ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.radius*20, 0, Math.PI*2); ctx.fill();
          }
       });

       // Draw Towers
       towersRef.current.forEach(t => {
          if (t.isDead) {
             ctx.fillStyle = '#4b5563';
             ctx.beginPath(); ctx.arc(t.x, t.y, 25, 0, Math.PI*2); ctx.fill();
             return;
          }
          ctx.fillStyle = t.side === 'player' ? '#2563eb' : '#dc2626';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.type==='king'?30:20, 0, Math.PI*2); ctx.fill();
          
          ctx.fillStyle = '#22c55e';
          const hpW = 40 * (t.hp / t.maxHp);
          ctx.fillRect(t.x - 20, t.y - 35, hpW, 4);
       });

       // Draw Troops
       troopsRef.current.forEach(t => {
          ctx.save();
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath(); ctx.arc(t.x, t.y + (t.isFlying?20:0), 10, 0, Math.PI*2); ctx.fill();

          // Body
          ctx.fillStyle = t.side === 'player' ? '#3b82f6' : '#ef4444';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.mass * 2 + 5, 0, Math.PI*2); ctx.fill();

          // Image (if possible, simple rect fallback for perf here)
          ctx.fillStyle = t.color || '#fff';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.mass * 2 + 3, 0, Math.PI*2); ctx.fill();

          // Health
          ctx.fillStyle = '#ef4444'; ctx.fillRect(t.x-10, t.y-20, 20, 3);
          ctx.fillStyle = '#22c55e'; ctx.fillRect(t.x-10, t.y-20, 20 * (t.hp/t.maxHp), 3);
          
          // Shield
          if (t.shieldHp && t.maxShield) {
              ctx.fillStyle = '#a8a29e'; ctx.fillRect(t.x-10, t.y-24, 20 * (t.shieldHp/t.maxShield), 2);
          }
          ctx.restore();
       });

       // Draw Projs
       projectilesRef.current.forEach(p => {
          ctx.fillStyle = p.type === 'arrow' ? '#fff' : p.type === 'bomb' ? '#111' : '#f97316';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.type==='arrow'?3:8, 0, Math.PI*2); ctx.fill();
       });

       // Texts
       for (let i = floatTextsRef.current.length - 1; i >= 0; i--) {
          const txt = floatTextsRef.current[i];
          txt.life -= dt;
          txt.y -= 20 * dt;
          if (txt.life <= 0) { floatTextsRef.current.splice(i,1); continue; }
          
          ctx.fillStyle = txt.color;
          ctx.globalAlpha = txt.life / txt.maxLife;
          ctx.font = '12px bold Arial'; ctx.fillText(txt.text, txt.x - 10, txt.y);
          ctx.globalAlpha = 1;
       }
    };

    animFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId.current);
  }, [gameResult, doubleElixir]);

  // AI Loop
  useEffect(() => {
    const aiInterval = setInterval(() => {
       if (gameResult) return;
       // Primitive AI: spawn random unit on enemy side if enough 'fake' elixir
       const cards = CARDS_POOL.filter(c => c.playType === 'troop' || c.playType === 'building');
       const card = cards[Math.floor(Math.random()*cards.length)];
       const rx = 50 + Math.random() * 300;
       const ry = 50 + Math.random() * 150;
       spawnUnit(card, rx, ry, 'enemy');
    }, 4500);
    return () => clearInterval(aiInterval);
  }, [gameResult]);

  // Timer Tick
  useEffect(() => {
    const timer = setInterval(() => {
       setSecondsLeft(s => {
          if (s <= 60 && !doubleElixir) setDoubleElixir(true);
          if (s <= 1) onEnd('draw');
          return s - 1;
       });
    }, 1000);
    return () => clearInterval(timer);
  }, [doubleElixir]);

  const spawnUnit = (card: Card, cx: number, cy: number, side: 'player'|'enemy') => {
      // Validate deploy zone for player
      if (side === 'player' && card.playType !== 'spell' && cy < 320) {
         // Check if pocket is available (princess tower down)
         const towers = towersRef.current.filter(t => t.side === 'enemy' && t.type === 'princess');
         let allowed = false;
         if (towers.length < 2) allowed = true; // Primitive check
         if (!allowed) return false;
      }

      if (card.playType === 'spell') {
         if (card.spellType === 'damage') {
             projectilesRef.current.push({
                id: Math.random().toString(), type: 'spell_fireball',
                x: cx, y: 600, startX: cx, startY: 600, targetX: cx, targetY: cy,
                side: side, damage: card.damage || 200, speed: 0, startTime: Date.now(), travelTime: 1.5, splashRadius: card.radius
             });
         } else if (card.spellType === 'poison' || card.spellType === 'freeze') {
             spellsRef.current.push({
                id: Math.random().toString(), type: card.spellType,
                x: cx, y: cy, radius: card.radius || 3, side: side, startTime: Date.now(), duration: (card.duration || 4000) / 1000
             });
         }
         return true;
      }

      const count = card.count || 1;
      for (let i=0; i<count; i++) {
         const ox = (Math.random() - 0.5) * 30;
         const oy = (Math.random() - 0.5) * 30;
         troopsRef.current.push({
            id: Math.random().toString(),
            cardId: card.id,
            name: card.name,
            side: side,
            x: cx + ox, y: cy + oy,
            hp: card.hp || 100, maxHp: card.hp || 100,
            shieldHp: card.shieldHp || 0, maxShield: card.shieldHp || 0,
            damage: card.damage || 50,
            hitSpeed: card.hitSpeed || 1.0,
            speed: card.speed || 50,
            range: card.range || 1,
            sightRadius: card.sightRadius || 5.5,
            mass: card.mass || 3,
            playType: card.playType,
            targetType: card.targetType || 'any',
            isFlying: card.isFlying || false,
            targetsFlying: card.targetsFlying || false,
            state: 'idle', targetId: null, lastAttackTime: 0, path: null,
            image: card.image, color: side === 'player' ? '#3b82f6' : '#ef4444',
            chargeDuration: card.chargeDuration, dashRange: card.dashRange, onDeath: card.onDeath
         });
      }
      return true;
  };

  const handleCanvasClick = (e: any) => {
    if (!selectedCardId || gameResult) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Scale coords
    const scaleX = 400 / rect.width;
    const scaleY = 600 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const c = hand.find(h => h.id === selectedCardId);
    if (!c || elixir < c.cost) return;

    const success = spawnUnit(c, x, y, 'player');
    if (success) {
       setElixir(prev => prev - c.cost);
       
       const newHand = hand.filter(h => h.id !== selectedCardId);
       if (nextCard) newHand.push(nextCard);
       setHand(newHand);

       rotationQueue.current.push(c);
       const n = rotationQueue.current.shift();
       if (n) setNextCard(n);
       
       setSelectedCardId(null);
    }
  };
\`;

content = content.replace(/const BattleEngine.*?(return \(.*?}\);.*?};)/s, engineCode + '\n\n  return (\n    <div className="flex-1 flex flex-col relative w-full overflow-hidden bg-black">\n      {/* UI Overlay */}\n      <div className="absolute top-0 inset-x-0 z-30 flex justify-between p-2 pointer-events-none">\n        <div className="bg-black/60 px-3 py-1 rounded-full text-white font-bold text-xs ring-1 ring-white/10 shadow-lg">\n          Zeit: {Math.floor(secondsLeft/60)}:{(secondsLeft%60).toString().padStart(2,\\'0\\')}\n          {doubleElixir && <span className="text-fuchsia-400 ml-2 uppercase animate-pulse">2x Elixier!</span>}\n        </div>\n      </div>\n\n      {gameResult && (\n        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm">\n          <h2 className={\`text-5xl font-black italic uppercase drop-shadow-xl \${gameResult === \\'victory\\' ? \\'text-yellow-400\\' : \\'text-red-500\\'}\`}>\n             {gameResult === \\'draw\\' ? \\'Unentschieden\\' : gameResult === \\'victory\\' ? \\'SIEG!\\' : \\'NIEDERLAGE\\'}\n          </h2>\n          <button onClick={onExit} className="mt-8 bg-gradient-to-b from-blue-500 to-blue-700 px-12 py-4 rounded-2xl text-white font-black text-xl uppercase tracking-widest shadow-[0_5px_15px_rgba(59,130,246,0.6)] transform hover:scale-105 transition">Weiter</button>\n        </div>\n      )}\n\n      {/* Canvas Wrapper */}\n      <div className="flex-1 w-full relative flex items-center justify-center bg-[#1b3310] perspective-1200 cursor-crosshair">\n        <canvas \n          ref={canvasRef} \n          width={400} \n          height={600} \n          onClick={handleCanvasClick}\n          className="w-full max-w-[400px] h-full object-contain bg-[#34621c] touch-none shadow-2xl"\n          style={{ transform: \\'rotateX(20deg) scale(1.05)\\', transformStyle: \\'preserve-3d\\' }}\n        />\n      </div>\n\n      {/* Deck & Elixir Bar Footer */}\n      <div className="w-full bg-[#121c10] border-t-2 border-neutral-700 p-3 pb-5 relative z-40">\n        <div className="h-5 w-full bg-black/80 rounded-full mb-3 overflow-hidden border border-fuchsia-950/80 relative shadow-inner isolate">\n          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-600 to-purple-500 transition-all duration-[200ms] ease-linear" style={{ width: \`\${(elixir/10)*100}%\` }} />\n          <div className="absolute inset-0 flex items-center px-3 text-white font-black text-sm drop-shadow"><Droplet size={14} className="mr-1 text-fuchsia-300"/>{Math.floor(elixir)}</div>\n        </div>\n        \n        <div className="flex gap-2 w-full justify-center items-end select-none">\n          <div className="w-12 opacity-80 flex flex-col items-center">\n            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">Nächste</span>\n            {nextCard && <div className="aspect-[3/4.2] w-full rounded-lg overflow-hidden border border-neutral-600"><img src={nextCard.image} className="w-full h-full object-cover grayscale-[30%]" /></div>}\n          </div>\n          \n          <div className="w-px h-16 bg-neutral-800 mx-1" />\n          \n          {hand.map(card => {\n             const affordable = elixir >= card.cost;\n             const active = selectedCardId === card.id;\n             return (\n               <button \n                 key={card.id + Math.random()} \n                 onClick={() => { if(affordable || active) setSelectedCardId(active ? null : card.id); }}\n                 className={\`flex-1 aspect-[3/4.2] max-w-[80px] rounded-xl border-2 overflow-hidden relative transition-all duration-200 ease-out \${active ? \\'border-yellow-400 scale-110 -translate-y-6 shadow-[0_15px_30px_rgba(234,179,8,0.4)] z-50\\' : affordable ? \\'border-neutral-500 hover:border-blue-400 z-10\\' : \\'border-neutral-800 grayscale-[60%] opacity-60\\'}\`}\n               >\n                 <img src={card.image} className="w-full h-full object-cover" />\n                 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 pt-4 text-center"><span className="text-white font-black text-[9px] uppercase leading-none truncate block">{card.name}</span></div>\n                 <div className="absolute top-1 left-1 bg-fuchsia-600 border border-fuchsia-300 text-white text-[10px] font-black rounded px-1.5 drop-shadow">{card.cost}</div>\n                 {!affordable && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}\n               </button>\n             )\n          })}\n        </div>\n      </div>\n    </div>\n  );\n};\n`;

fs.writeFileSync('src/components/ClashArenaView.tsx', content);
console.log('BattleEngine overwritten successfully.');
