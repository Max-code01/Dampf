import fs from 'fs';

const c = fs.readFileSync('src/components/ClashArenaView.tsx', 'utf-8');

const sIdx = c.indexOf('const BattleEngine =');

const replacement = \`const BattleEngine = ({ deck, cardLevels, onEnd, gameResult, onExit }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State
  const [elixir, setElixir] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(180); // 3 mins
  const [doubleElixir, setDoubleElixir] = useState(false);
  
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
    { id: 'p_king', side: 'player', type: 'king', x: 200, y: 560, hp: 4000, maxHp: 4000, damage: 100, range: 7, hitSpeed: 1.0, lastAttackTime: 0, isDead: false, isActive: false },
    { id: 'p_prin_l', side: 'player', type: 'princess', x: 70, y: 460, hp: 2500, maxHp: 2500, damage: 110, range: 7.5, hitSpeed: 0.8, lastAttackTime: 0, isDead: false, isActive: true },
    { id: 'p_prin_r', side: 'player', type: 'princess', x: 330, y: 460, hp: 2500, maxHp: 2500, damage: 110, range: 7.5, hitSpeed: 0.8, lastAttackTime: 0, isDead: false, isActive: true },
    { id: 'e_king', side: 'enemy', type: 'king', x: 200, y: 40, hp: 4000, maxHp: 4000, damage: 100, range: 7, hitSpeed: 1.0, lastAttackTime: 0, isDead: false, isActive: false },
    { id: 'e_prin_l', side: 'enemy', type: 'princess', x: 70, y: 140, hp: 2500, maxHp: 2500, damage: 110, range: 7.5, hitSpeed: 0.8, lastAttackTime: 0, isDead: false, isActive: true },
    { id: 'e_prin_r', side: 'enemy', type: 'princess', x: 330, y: 140, hp: 2500, maxHp: 2500, damage: 110, range: 7.5, hitSpeed: 0.8, lastAttackTime: 0, isDead: false, isActive: true },
  ]);

  const lastTimeRef = useRef<number>(0);
  const animFrameId = useRef<number>(0);

  // Load Deck
  useEffect(() => {
    const activeCards = CARDS_POOL.filter(c => deck.includes(c.id));
    const shuffled = [...activeCards].sort(() => 0.5 - Math.random());
    setHand(shuffled.slice(0, 4));
    setNextCard(shuffled[4] || CARDS_POOL[0]);
    rotationQueue.current = shuffled.slice(5).concat(shuffled.length < 8 ? [] : []);
  }, [deck]);

  const spawnUnit = (card: Card, cx: number, cy: number, side: 'player'|'enemy') => {
      // Zone Validation 
      if (side === 'player' && card.playType !== 'spell' && cy < 300) {
         const towers = towersRef.current.filter(t => t.side === 'enemy' && t.type === 'princess' && t.isDead);
         let inPocket = false;
         if (towers.find(t => t.id === 'e_prin_l') && cx < 140 && cy > 200) inPocket = true;
         if (towers.find(t => t.id === 'e_prin_r') && cx > 260 && cy > 200) inPocket = true;
         if (!inPocket) return false;
      }

      const applyLevels = (val: number | undefined) => {
         if (!val) return 0;
         const lvl = side === 'player' && cardLevels[card.id] ? cardLevels[card.id].level : 1;
         return val * Math.pow(1.1, lvl - 1);
      };

      if (card.playType === 'spell') {
         if (card.spellType === 'damage') {
             projectilesRef.current.push({
                id: Math.random().toString(), type: 'spell_fireball',
                x: cx, y: side === 'player' ? 600 : 0, startX: cx, startY: side === 'player' ? 600 : 0, targetX: cx, targetY: cy,
                side, damage: applyLevels(card.damage), speed: 0, startTime: Date.now(), travelTime: 1.5, splashRadius: card.radius
             });
         } else if (card.spellType === 'poison' || card.spellType === 'freeze') {
             spellsRef.current.push({
                id: Math.random().toString(), type: card.spellType,
                x: cx, y: cy, radius: card.radius || 3, side, startTime: Date.now(), duration: (card.duration || 4000) / 1000
             });
         }
         return true;
      }

      const count = card.count || 1;
      for (let i=0; i<count; i++) {
         const ox = count > 1 ? (Math.random() - 0.5) * 40 : 0;
         const oy = count > 1 ? (Math.random() - 0.5) * 40 : 0;
         troopsRef.current.push({
            id: Math.random().toString(), cardId: card.id, name: card.name, side,
            x: cx + ox, y: cy + oy,
            hp: applyLevels(card.hp), maxHp: applyLevels(card.hp),
            shieldHp: applyLevels(card.shieldHp), maxShield: applyLevels(card.shieldHp),
            damage: applyLevels(card.damage),
            hitSpeed: card.hitSpeed || 1.0, speed: card.speed || 50,
            range: card.range || 1, sightRadius: card.sightRadius || 5.5, mass: card.mass || 3,
            playType: card.playType, targetType: card.targetType || 'any',
            isFlying: card.isFlying || false, targetsFlying: card.targetsFlying || false,
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
    const x = (e.clientX - rect.left) * (400 / rect.width);
    const y = (e.clientY - rect.top) * (600 / rect.height);

    const c = hand.find(h => h.id === selectedCardId);
    if (!c || elixir < c.cost) return;

    if (spawnUnit(c, x, y, 'player')) {
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

  // Main Loop
  useEffect(() => {
    const PxPerTile = 20;

    const spawnText = (x:number, y:number, text:string, color:string) => {
       floatTextsRef.current.push({x, y, text, life: 1, maxLife: 1, color});
    };

    const damageEntity = (target: any, dmg: number) => {
      if (target.isDead) return;
      if (target.shieldHp && target.shieldHp > 0) {
         if (target.shieldHp >= dmg) target.shieldHp -= dmg;
         else { target.shieldHp = 0; spawnText(target.x, target.y - 10, "Schild kaputt!", "#cbd5e1"); }
         return;
      }
      target.hp -= dmg;
      if (target.hp <= 0) {
        target.hp = 0; target.isDead = true;
        if (target.type === 'king') onEnd(target.side === 'enemy' ? 'victory' : 'defeat');
        else if (target.type === 'princess') {
           const k = towersRef.current.find(t => t.side === target.side && t.type === 'king');
           if (k) k.isActive = true;
        }
      }
    };

    const loop = (time: number) => {
       if (!lastTimeRef.current) lastTimeRef.current = time;
       const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05); // cap at 50ms to prevent massive jumps
       lastTimeRef.current = time;

       if (gameResult) return;

       setElixir(prev => Math.min(10, prev + ((doubleElixir ? (1/1.4) : (1/2.8)) * dt)));

       const troops = troopsRef.current;
       const towers = towersRef.current;
       const projs = projectilesRef.current;
       const spells = spellsRef.current;

       // 1. Spells Logic
       for (let i = spells.length - 1; i >= 0; i--) {
          const sp = spells[i];
          sp.duration -= dt;
          if (sp.duration <= 0) { spells.splice(i, 1); continue; }
          
          if (sp.type === 'poison') {
              const affected = [...troops, ...towers].filter(t => !t.isDead && Math.hypot(t.x - sp.x, t.y - sp.y) <= sp.radius * PxPerTile);
              affected.forEach(t => { if(t.side !== sp.side) damageEntity(t, 20 * dt); });
          }
       }

       // 2. Troop AI & Movement
       for (let i=0; i<troops.length; i++) {
          const t = troops[i];
          if (t.hp <= 0) continue;

          // Freeze check
          const isFrozen = spells.some(s => s.type === 'freeze' && s.side !== t.side && Math.hypot(s.x-t.x, s.y-t.y) <= s.radius*PxPerTile);
          if (isFrozen) { t.lastAttackTime = 0; continue; } // Stun logic resets windup

          if (!t.targetId || t.state === 'idle') {
             let bestDist = Infinity;
             let bestTarget: any = null;
             const candidates = t.targetType === 'buildings' ? towers : [...towers, ...troops];
             candidates.forEach(cand => {
                if (cand.side === t.side || cand.isDead) return;
                if (!cand.isActive && cand.type === 'king') return;
                if (t.playType === 'troop' && !t.targetsFlying && cand.isFlying) return;

                const dist = Math.hypot(cand.x - t.x, cand.y - t.y);
                if (dist < bestDist && (t.targetType === 'buildings' || dist <= t.sightRadius * PxPerTile * 1.5)) {
                   bestDist = dist; bestTarget = cand;
                }
             });
             if (bestTarget) { t.targetId = bestTarget.id; t.state = 'moving'; }
          }

          if (t.targetId && t.state === 'moving') {
             const target = [...troops, ...towers].find(x => x.id === t.targetId && !x.isDead);
             if (!target) { t.targetId = null; t.state = 'idle'; continue; }

             const dist = Math.hypot(target.x - t.x, target.y - t.y);
             if (dist <= t.range * PxPerTile) {
                t.state = 'attacking';
             } else {
                let tx = target.x; let ty = target.y;
                if (!t.isFlying) {
                   const onPlayerSide = t.y > 300;
                   const targetOnPlayerSide = target.y > 300;
                   if (onPlayerSide !== targetOnPlayerSide) {
                      const b1x = 80; const b2x = 320;
                      tx = Math.abs(t.x - b1x) < Math.abs(t.x - b2x) ? b1x : b2x;
                      ty = onPlayerSide ? 280 : 320; 
                   }
                }
                const moveDist = t.speed * dt;
                const angle = Math.atan2(ty - t.y, tx - t.x);
                t.x += Math.cos(angle) * moveDist;
                t.y += Math.sin(angle) * moveDist;
             }
          }

          if (t.state === 'attacking' && t.targetId) {
             const target = [...troops, ...towers].find(x => x.id === t.targetId && !x.isDead);
             if (!target || Math.hypot(target.x - t.x, target.y - t.y) > t.range * PxPerTile * 1.5) {
                t.state = 'idle';
             } else {
                t.lastAttackTime += dt;
                if (t.lastAttackTime >= t.hitSpeed) {
                   t.lastAttackTime = 0;
                   if (t.range > 2.5) {
                      projs.push({
                         id: Math.random().toString(), type: 'arrow',
                         x: t.x, y: t.y, startX: t.x, startY: t.y, targetX: target.x, targetY: target.y, targetId: target.id,
                         side: t.side, damage: t.damage, speed: 400, startTime: time, travelTime: Math.hypot(target.x-t.x, target.y-t.y)/400
                      });
                   } else {
                      damageEntity(target, t.damage);
                   }
                }
             }
          }
       }

       // 3. Collision (Ground Only)
       for (let i=0; i<troops.length; i++) {
          const t1 = troops[i];
          if (t1.isFlying || t1.hp <= 0) continue;
          for (let j=i+1; j<troops.length; j++) {
             const t2 = troops[j];
             if (t2.isFlying || t2.hp <= 0) continue;
             const dx = t2.x - t1.x; const dy = t2.y - t1.y;
             const dist = Math.hypot(dx, dy);
             const minDist = (t1.mass + t2.mass) * 1.2;
             if (dist < minDist && dist > 0) {
                const overlap = minDist - dist;
                const forceX = (dx / dist) * overlap * 0.5;
                const forceY = (dy / dist) * overlap * 0.5;
                const r1 = t2.mass / (t1.mass + t2.mass);
                const r2 = t1.mass / (t1.mass + t2.mass);
                t1.x -= forceX * r1; t1.y -= forceY * r1;
                t2.x += forceX * r2; t2.y += forceY * r2;
             }
          }
       }

       troopsRef.current = troopsRef.current.filter(t => t.hp > 0);

       // 4. Projectiles
       for (let i = projs.length - 1; i >= 0; i--) {
          const p = projs[i];
          const elapsed = (time - p.startTime) / 1000;
          if (elapsed >= p.travelTime) {
             if (p.splashRadius) {
                const affected = [...troops, ...towers].filter(t => !t.isDead && t.side !== p.side && Math.hypot(t.x - p.targetX, t.y - p.targetY) <= p.splashRadius! * PxPerTile);
                affected.forEach(t => damageEntity(t, p.damage));
             } else if (p.targetId) {
                const tar = [...troops, ...towers].find(t => t.id === p.targetId && !t.isDead);
                if (tar) damageEntity(tar, p.damage);
             }
             projs.splice(i, 1);
          } else {
             const prog = Math.min(1, elapsed / p.travelTime);
             p.x = p.startX + (p.targetX - p.startX) * prog;
             p.y = p.startY + (p.targetY - p.startY) * prog;
          }
       }

       // 5. Towers Attack (Always Active Kings/Princesses)
       towers.forEach(t => {
           if (t.isDead || !t.isActive) return;
           const isFrozen = spells.some(s => s.type === 'freeze' && s.side !== t.side && Math.hypot(s.x-t.x, s.y-t.y) <= s.radius*PxPerTile);
           if (isFrozen) return;

           let bestTarget: any = null;
           let bestDist = t.range * PxPerTile;
           troops.forEach(tr => {
               if (tr.side === t.side || tr.isDead) return;
               const d = Math.hypot(tr.x - t.x, tr.y - t.y);
               if (d < bestDist) { bestDist = d; bestTarget = tr; }
           });

           if (bestTarget) {
               t.lastAttackTime += dt;
               if (t.lastAttackTime >= t.hitSpeed) {
                   t.lastAttackTime = 0;
                   projs.push({
                      id: Math.random().toString(), type: 'arrow',
                      x: t.x, y: t.y, startX: t.x, startY: t.y, targetX: bestTarget.x, targetY: bestTarget.y, targetId: bestTarget.id,
                      side: t.side, damage: t.damage, speed: 400, startTime: time, travelTime: bestDist/400
                   });
               }
           } else {
               t.lastAttackTime = 0;
           }
       });

       render();
       animFrameId.current = requestAnimationFrame(loop);
    };

    const render = () => {
       const canvas = canvasRef.current;
       if (!canvas) return;
       const ctx = canvas.getContext('2d');
       if (!ctx) return;
       ctx.clearRect(0, 0, 400, 600);

       // Field
       ctx.fillStyle = '#4ade80'; ctx.fillRect(0,0,400,600);
       ctx.fillStyle = 'rgba(0,0,0,0.05)';
       for(let x=0; x<400; x+=20) for(let y=0; y<600; y+=20) if((x/20 + y/20)%2===0) ctx.fillRect(x,y,20,20);
       
       // River & Bridges
       ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, 280, 400, 40);
       ctx.fillStyle = '#78350f'; ctx.fillRect(55, 275, 50, 50); ctx.fillRect(295, 275, 50, 50);

       // Zones
       if (selectedCardId) {
          ctx.fillStyle = 'rgba(59,130,246,0.15)';
          ctx.fillRect(0, 300, 400, 300);
       }

       // Spells
       spellsRef.current.forEach(sp => {
          ctx.fillStyle = sp.type === 'poison' ? 'rgba(217,119,6,0.4)' : 'rgba(125,211,252,0.4)';
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.radius*20, 0, Math.PI*2); ctx.fill();
       });

       // Towers
       towersRef.current.forEach(t => {
          if (t.isDead) { ctx.fillStyle = '#4b5563'; ctx.beginPath(); ctx.arc(t.x, t.y, 25, 0, Math.PI*2); ctx.fill(); return; }
          ctx.fillStyle = t.side === 'player' ? '#2563eb' : '#dc2626';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.type==='king'?30:20, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#22c55e'; ctx.fillRect(t.x-20, t.y-(t.type==='king'?35:25), 40*(t.hp/t.maxHp), 4);
       });

       // Troops
       troopsRef.current.forEach(t => {
          ctx.save();
          if (t.isFlying) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(t.x, t.y+30, 8, 0, Math.PI*2); ctx.fill(); }
          
          ctx.fillStyle = t.side === 'player' ? '#3b82f6' : '#ef4444';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.mass * 1.5 + 6, 0, Math.PI*2); ctx.fill();
          
          ctx.fillStyle = t.color || '#fff';
          ctx.beginPath(); ctx.arc(t.x, t.y, t.mass * 1.5 + 4, 0, Math.PI*2); ctx.fill();

          ctx.fillStyle = '#ef4444'; ctx.fillRect(t.x-10, t.y-18, 20, 3);
          ctx.fillStyle = '#22c55e'; ctx.fillRect(t.x-10, t.y-18, 20*(t.hp/t.maxHp), 3);
          if (t.maxShield) { ctx.fillStyle = '#a8a29e'; ctx.fillRect(t.x-10, t.y-22, 20*(t.shieldHp!/t.maxShield), 2); }
          ctx.restore();
       });

       // Projs
       projectilesRef.current.forEach(p => {
          ctx.fillStyle = p.type === 'arrow' ? '#fff' : p.type === 'bomb' ? '#111' : '#f97316';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.type==='arrow'?3:8, 0, Math.PI*2); ctx.fill();
       });

       // Texts
       for (let i = floatTextsRef.current.length - 1; i >= 0; i--) {
          const txt = floatTextsRef.current[i];
          ctx.fillStyle = txt.color; ctx.globalAlpha = txt.life / txt.maxLife;
          ctx.font = '14px bold Arial'; ctx.fillText(txt.text, txt.x - 15, txt.y);
          ctx.globalAlpha = 1;
       }
    };

    animFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId.current);
  }, [gameResult, doubleElixir]);

  // AI & Timer
  useEffect(() => {
    const aiInterval = setInterval(() => {
       if (gameResult) return;
       const cards = CARDS_POOL.filter(c => c.playType !== 'spell');
       const card = cards[Math.floor(Math.random()*cards.length)];
       spawnUnit(card, 50 + Math.random() * 300, 50 + Math.random() * 150, 'enemy');
    }, 4000);

    const timer = setInterval(() => {
       if (gameResult) return;
       setSecondsLeft(s => {
          if (s <= 60 && !doubleElixir) setDoubleElixir(true);
          if (s <= 1) { onEnd('draw'); return 0; }
          return s - 1;
       });
    }, 1000);
    return () => { clearInterval(aiInterval); clearInterval(timer); };
  }, [gameResult, doubleElixir]);

  return (
    <div className="flex-1 flex flex-col relative w-full overflow-hidden bg-black">
      <div className="absolute top-0 inset-x-0 z-30 flex justify-between p-2 pointer-events-none">
        <div className="bg-black/60 px-3 py-1 rounded-full text-white font-bold text-xs shadow-lg">
          Zeit: {Math.floor(secondsLeft/60)}:{(secondsLeft%60).toString().padStart(2,'0')}
          {doubleElixir && <span className="text-fuchsia-400 ml-2 animate-pulse">2x Elixier</span>}
        </div>
      </div>

      {gameResult && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur">
          <h2 className={\`text-5xl font-black italic uppercase drop-shadow-xl \${gameResult === 'victory' ? 'text-yellow-400' : 'text-red-500'}\`}>
             {gameResult === 'draw' ? 'Unentschieden' : gameResult === 'victory' ? 'SIEG!' : 'NIEDERLAGE'}
          </h2>
          <button onClick={onExit} className="mt-8 bg-blue-600 px-10 py-4 rounded-xl text-white font-black uppercase tracking-widest shadow-xl">Weiter</button>
        </div>
      )}

      <div className="flex-1 w-full relative flex items-center justify-center bg-[#1b3310] perspective-1200 cursor-crosshair overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={600} 
          onClick={handleCanvasClick}
          className="w-full max-w-[400px] h-full bg-[#34621c] touch-none shadow-2xl"
        />
      </div>

      {/* Hand Footer */}
      <div className="w-full bg-[#121c10] border-t-2 border-neutral-700/60 p-3 pt-4 relative z-40">
        <div className="h-5 w-full bg-black/80 rounded-full mb-3 overflow-hidden border border-fuchsia-950 relative shadow-inner">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-600 to-purple-500 transition-all duration-[200ms] ease-linear" style={{ width: \`\${(elixir/10)*100}%\` }} />
          <div className="absolute inset-0 flex items-center px-3 text-white font-black text-sm drop-shadow">{Math.floor(elixir)}</div>
        </div>
        
        <div className="flex gap-2 w-full justify-center items-end select-none">
          <div className="w-12 opacity-80 flex flex-col items-center">
            <span className="text-[9px] text-gray-400 font-bold uppercase mb-1">Nächst</span>
            {nextCard && <img src={nextCard.image} className="w-full aspect-[3/4.2] object-cover rounded-lg border border-neutral-600 grayscale-[30%]" />}
          </div>
          <div className="w-px h-16 bg-neutral-800 mx-1" />
          {hand.map(card => {
             const affordable = elixir >= card.cost;
             const active = selectedCardId === card.id;
             return (
               <button 
                 key={card.id + Math.random()} 
                 onClick={() => { if(affordable || active) setSelectedCardId(active ? null : card.id); }}
                 className={\`flex-1 aspect-[3/4.2] max-w-[80px] rounded-xl border-2 overflow-hidden relative transition-all duration-200 \${active ? 'border-yellow-400 scale-110 -translate-y-4 shadow-[0_15px_30px_rgba(234,179,8,0.4)] z-50' : affordable ? 'border-neutral-500 hover:border-blue-400 z-10' : 'border-neutral-800 grayscale-[60%] opacity-60'}\`}
               >
                 <img src={card.image} className="w-full h-full object-cover" />
                 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 pt-4 text-center"><span className="text-white font-black text-[9px] uppercase leading-none block">{card.name}</span></div>
                 <div className="absolute top-1 left-1 bg-fuchsia-600 border border-fuchsia-300 text-white text-[10px] font-black rounded px-1.5 drop-shadow">{card.cost}</div>
                 {!affordable && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}
               </button>
             )
          })}
        </div>
      </div>
    </div>
  );
};
\`;

fs.writeFileSync('src/components/ClashArenaView.tsx', c.substring(0, sIdx) + replacement);
console.log('BattleEngine overwritten successfully!');
