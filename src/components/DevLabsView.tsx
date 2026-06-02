import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  addDoc, 
  collection, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  X, 
  Cpu, 
  Smartphone, 
  Play, 
  RefreshCw, 
  Zap, 
  Send, 
  Layers, 
  Sliders, 
  Activity, 
  MessageSquare, 
  Bell, 
  Check, 
  Sparkles, 
  BarChart2,
  Terminal,
  Grid,
  Settings,
  HelpCircle
} from 'lucide-react';

interface DevLabsViewProps {
  user: any;
  myProfile: any;
  db: any;
  chatMessages: any[];
  onClose: () => void;
  triggerToast: (type: 'quest' | 'xp' | 'level', title: string, description: string, options?: any) => void;
}

export const DevLabsView: React.FC<DevLabsViewProps> = ({
  user,
  myProfile,
  db,
  chatMessages,
  onClose,
  triggerToast
}) => {
  const [activeTab, setActiveTab] = useState<'rust' | 'flutter'>('rust');

  // ==========================================
  // RUST WASM VOXEL GENERATOR STATE & LOGIC
  // ==========================================
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [chunkSize, setChunkSize] = useState<8 | 12 | 16>(12);
  const [biome, setBiome] = useState<'plains' | 'nether' | 'ocean' | 'desert'>('plains');
  const [noiseFrequency, setNoiseFrequency] = useState<number>(3);
  const [wasmPerformanceMultiplier, setWasmPerformanceMultiplier] = useState<number>(24); // Simulates Rust vs JS
  const [isGenerating, setIsGenerating] = useState(false);
  const [telemetry, setTelemetry] = useState({
    calcTimePr: 0.08, // ms
    totalTimeMs: 0.12, // ms
    jsEquivalentMs: 2.88, // ms
    blocksCount: 1728,
    ramAllocation: 2.4, // MB
    wasmMemoryUsage: 16.2, // MB (Simulated WebAssembly linear memory offset)
    wasmCallsCount: 0
  });

  // Simple 3D projection parameters
  const [rotationAngle, setRotationAngle] = useState(45); // in degrees
  const [zoom, setZoom] = useState(1.1);

  // Generate 3D Noise heights
  const generateVoxelData = useMemo(() => {
    const size = chunkSize;
    const blocks: { x: number; y: number; z: number; type: string }[] = [];
    
    // Perlin-like deterministic sine/cosine noise
    const seedValue = biome === 'plains' ? 1.2 : biome === 'nether' ? 2.5 : biome === 'ocean' ? 0.7 : 1.8;
    
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        // Calculate dynamic height based on sine/cosine wave mechanics simulating Perlin Noise
        const nx = x / size * noiseFrequency;
        const nz = z / size * noiseFrequency;
        let heightFactor = Math.sin(nx * seedValue) * Math.cos(nz * seedValue * 1.5) + Math.cos(nx * 0.5) * Math.sin(nz * seedValue);
        
        // Map of coordinates to height
        let h = Math.floor(((heightFactor + 2) / 4) * (size - 1)) + 1;
        if (biome === 'ocean') {
          h = Math.max(2, h - 1);
        }
        
        for (let y = 0; y < size; y++) {
          if (y <= h) {
            let blockType = 'stone';
            if (biome === 'plains') {
              if (y === h) blockType = 'grass';
              else if (y > h - 2) blockType = 'dirt';
            } else if (biome === 'nether') {
              if (y === h && Math.random() > 0.7) blockType = 'lava';
              else blockType = 'netherrack';
            } else if (biome === 'ocean') {
              if (y <= 3) blockType = 'sand';
              else blockType = 'water';
            } else if (biome === 'desert') {
              if (y === h) blockType = 'sand';
              else if (y > h - 2) blockType = 'sandstone';
            }
            blocks.push({ x, y, z, type: blockType });
          } else {
            // Fill partial ocean water layer
            if (biome === 'ocean' && y <= 4) {
              blocks.push({ x, y, z, type: 'water' });
            }
          }
        }
      }
    }
    return blocks;
  }, [chunkSize, biome, noiseFrequency]);

  // Paint 3D blocks onto high-performance 2D Canvas using Isometric Painter's Algorithm
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Start simulation timer (representing WebAssembly compiled binary execution speed)
    const startCalculations = performance.now();
    
    // Perform simulated binary function execution
    let simulatedWasmCalls = generateVoxelData.length * 3; 
    
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Isometric settings
    const size = chunkSize;
    const blockWidth = 24 * zoom;
    const blockHeight = 12 * zoom;
    const verticalStep = 14 * zoom;
    
    // Center point in canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + (size * blockHeight / 4);

    // Helpers to define block colors (Material Shading)
    const getBlockColors = (type: string) => {
      switch (type) {
        case 'grass':
          return { top: '#52bd3a', left: '#368c24', right: '#296b1b' };
        case 'dirt':
          return { top: '#866043', left: '#61442e', right: '#4c3524' };
        case 'stone':
          return { top: '#8a8a8a', left: '#666666', right: '#4f4f4f' };
        case 'netherrack':
          return { top: '#732121', left: '#541515', right: '#3b0e0e' };
        case 'lava':
          return { top: '#ff6200', left: '#d94100', right: '#b32400' };
        case 'sand':
          return { top: '#e3c681', left: '#bda362', right: '#9e8549' };
        case 'sandstone':
          return { top: '#bfa061', left: '#9c7f46', right: '#826835' };
        case 'water':
          return { top: 'rgba(31,117,214,0.65)', left: 'rgba(18,87,166,0.7)', right: 'rgba(12,65,128,0.75)' };
        default:
          return { top: '#dddddd', left: '#aaaaaa', right: '#777777' };
      }
    };

    // Draw cube polygons
    const drawCube = (x3d: number, y3d: number, z3d: number, type: string) => {
      // Rotation transformation logic
      const rad = (rotationAngle * Math.PI) / 180;
      
      // Center relative 3D coords
      const transX = x3d - size / 2;
      const transZ = z3d - size / 2;
      
      // Rotated isometric coordinate projection pipeline
      const rotX = transX * Math.cos(rad) - transZ * Math.sin(rad);
      const rotZ = transX * Math.sin(rad) + transZ * Math.cos(rad);
      
      const screenX = centerX + (rotX - rotZ) * (blockWidth / 2);
      const screenY = centerY + (rotX + rotZ) * (blockHeight / 2) - y3d * verticalStep;

      const colors = getBlockColors(type);

      // 1. Draw Left Face
      ctx.fillStyle = colors.left;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX - blockWidth / 2, screenY - blockHeight / 2);
      ctx.lineTo(screenX - blockWidth / 2, screenY + blockHeight / 2 - blockHeight / 2 - verticalStep);
      ctx.lineTo(screenX, screenY - verticalStep);
      ctx.closePath();
      ctx.fill();

      // 2. Draw Right Face
      ctx.fillStyle = colors.right;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + blockWidth / 2, screenY - blockHeight / 2);
      ctx.lineTo(screenX + blockWidth / 2, screenY + blockHeight / 2 - blockHeight / 2 - verticalStep);
      ctx.lineTo(screenX, screenY - verticalStep);
      ctx.closePath();
      ctx.fill();

      // 3. Draw Top Face
      ctx.fillStyle = colors.top;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - verticalStep);
      ctx.lineTo(screenX - blockWidth / 2, screenY - blockHeight / 2 - verticalStep);
      ctx.lineTo(screenX, screenY - blockHeight - verticalStep);
      ctx.lineTo(screenX + blockWidth / 2, screenY - blockHeight / 2 - verticalStep);
      ctx.closePath();
      ctx.fill();
    };

    // Painter's algorithm sorted rendering implementation (Depth ordering)
    // To solve isometric overlaps properly, render blocks from back to front:
    // back depth is x=0, z=0, up to x=size-1, z=size-1. Height y goes bottom up (y=0 to size-1).
    const rotatedOrder = [...generateVoxelData].sort((a, b) => {
      const rad = (rotationAngle * Math.PI) / 180;
      const rotZa = (a.x - size/2) * Math.sin(rad) + (a.z - size/2) * Math.cos(rad);
      const rotZb = (b.x - size/2) * Math.sin(rad) + (b.z - size/2) * Math.cos(rad);
      
      // Secondary depth is height
      if (Math.abs(rotZa - rotZb) < 0.01) {
        return a.y - b.y;
      }
      return rotZa - rotZb;
    });

    rotatedOrder.forEach(voxel => {
      drawCube(voxel.x, voxel.y, voxel.z, voxel.type);
    });

    // Capture speed profile
    const endCalculations = performance.now();
    const rawTime = endCalculations - startCalculations;
    
    // Simulate real compiled WebAssembly execution vs interpreted JavaScript
    const calculatedWasmMs = Math.max(0.04, rawTime / wasmPerformanceMultiplier);
    const simulatedJsMs = Math.max(1.8, rawTime * 1.5);
    
    setTelemetry({
      calcTimePr: parseFloat((calculatedWasmMs * 0.6).toFixed(3)),
      totalTimeMs: parseFloat(calculatedWasmMs.toFixed(2)),
      jsEquivalentMs: parseFloat(simulatedJsMs.toFixed(2)),
      blocksCount: generateVoxelData.length,
      ramAllocation: parseFloat(((generateVoxelData.length * 32) / 1024 / 1024).toFixed(3)),
      wasmMemoryUsage: parseFloat((16.0 + (size * size * size / 1024) * 0.1).toFixed(1)),
      wasmCallsCount: simulatedWasmCalls
    });
  }, [generateVoxelData, chunkSize, rotationAngle, zoom, biome, noiseFrequency, wasmPerformanceMultiplier]);

  const handleTestCompile = () => {
    setIsGenerating(true);
    triggerToast('quest', '🦀 WASM COMPILE STATUS', 'Compiling Rust source code to wasm32 binary and hot-loading memory buffers...', { amount: 100 });
    setTimeout(() => {
      setIsGenerating(false);
      triggerToast('xp', '⚡ SPEED REPORT', `WASM initialized! Generation finished with 98% execution overhead savings.`, { amount: 25 });
    }, 1500);
  };

  // ==========================================
  // DART / FLUTTER DEVICE SIMULATOR STATE
  // ==========================================
  const [flutterTheme, setFlutterTheme] = useState<'cyan' | 'purple' | 'gold'>('cyan');
  const [mobileActiveTab, setMobileActiveTab] = useState<'dashboard' | 'chat' | 'systems'>('dashboard');
  const [mobileMessageInput, setMobileMessageInput] = useState('');
  const [hotReloadAnim, setHotReloadAnim] = useState(false);
  const [simulatedNotifications, setSimulatedNotifications] = useState<{ id: string; text: string; sender: string }[]>([]);

  // Send message directly from Simulated Flutter App interface to the real Firebase Chat channel
  const handleMobileSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileMessageInput.trim() || !user) return;

    const msgToSend = mobileMessageInput.trim();
    setMobileMessageInput('');

    try {
      const tempId = 'temp-flutter-' + Date.now() + '-' + Math.random().toString(36).substring(7);
      
      // We will post to Firebase so that the app's real global chat receives this message too!
      await addDoc(collection(db, 'chat_messages'), {
        text: `📱 [Flutter Client] ${msgToSend}`,
        userId: user.uid,
        displayName: (myProfile?.displayName || user.displayName || 'Flutter-User').substring(0, 64),
        role: (myProfile?.role || 'Member').substring(0, 64),
        purchasedRank: myProfile?.purchasedRank || "",
        createdAt: serverTimestamp(),
        tempId: tempId,
        channel: 'allgemein'
      });

      triggerMobileNotification("Flutter-App Sync", "Nachricht erfolgreich im Firebase Chat synchronisiert! 📡 ✅");
    } catch (err) {
      console.error("Flutter companion message sync failed", err);
    }
  };

  // Hot reload Flutter state instantly
  const triggerHotReload = () => {
    setHotReloadAnim(true);
    setTimeout(() => {
      setHotReloadAnim(false);
      triggerToast('quest', '🎯 FLUTTER HOT RELOAD', '✓ Live Hot Reload finished in 38ms. State preserved!');
    }, 800);
  };

  const triggerMobileNotification = (sender: string, text: string) => {
    const id = `notif-${Date.now()}`;
    setSimulatedNotifications(prev => [...prev, { id, text, sender }]);
    setTimeout(() => {
      setSimulatedNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  // Live Firebase synchronizer to simulated mobile interface - when new messages arrive from other users, 
  // they show as animated push alerts at the top of the smartphone screen!
  const prevMessagesLength = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length > prevMessagesLength.current) {
      const newestMsg = chatMessages[chatMessages.length - 1];
      // Only notify if sent by someone else to simulate a real notification experience!
      if (newestMsg && newestMsg.userId !== user?.uid) {
        triggerMobileNotification(
          newestMsg.displayName || "Online Spieler",
          newestMsg.text.replace(/§[4-9a-fklmnor]/g, '') // strip Minecraft color symbols
        );
      }
    }
    prevMessagesLength.current = chatMessages.length;
  }, [chatMessages, user]);

  return (
    <motion.div
      key="devlabs-modal-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-6 select-none"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-neutral-950/40 to-purple-950/20 pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ y: 30, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, scale: 0.95 }}
        className="w-full max-w-6xl h-[90vh] md:h-[820px] bg-[#07090e] border-2 border-cyan-500/30 rounded-[2.5rem] flex flex-col shadow-[0_0_80px_rgba(34,211,238,0.15)] relative overflow-hidden"
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-60" />

        {/* Modal Header */}
        <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-[#080c14]/80 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-950/50 border border-cyan-500/40 rounded-xl text-cyan-400">
                <Cpu size={24} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase italic flex items-center gap-2">
                  Entwickler-Zentrum 
                  <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono font-black italic rounded px-2.5 py-0.5 tracking-normal normal-case not-italic">
                    BETA Labs
                  </span>
                </h2>
                <p className="text-neutral-500 text-xs font-medium">Füge neue Programmiersprachen und Plattformen zu deinem Minecraft Clan Dashboard hinzu</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-3 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-2xl border border-white/5 transition-all active:scale-95"
              title="Schließen"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TAB TOGGLES */}
        <div className="px-6 md:px-8 border-b border-white/5 bg-[#080d15]/50 flex shrink-0 z-10">
          <button
            onClick={() => setActiveTab('rust')}
            className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2.5 ${
              activeTab === 'rust'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Terminal size={14} />
            🦀 Rust (WebAssembly Engine)
          </button>
          <button
            onClick={() => setActiveTab('flutter')}
            className={`py-4 px-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2.5 ${
              activeTab === 'flutter'
                ? 'border-purple-400 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Smartphone size={14} />
            🎯 Dart & Flutter Companion App
          </button>
        </div>

        {/* LAB WORKSPACE */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0 bg-[#04060a]/90">
          <AnimatePresence mode="wait">
            {activeTab === 'rust' ? (
              <motion.div
                key="rust-lab-workspace"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0"
              >
                {/* LEFT COLUMN: Canvas HUD & Projection rendering */}
                <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
                  <div className="flex-1 min-h-[320px] md:min-h-[420px] bg-black/90 border border-cyan-500/20 rounded-3xl relative overflow-hidden flex flex-col justify-center items-center shadow-[inset_0_0_40px_rgba(6,182,212,0.05)]">
                    <canvas 
                      ref={canvasRef} 
                      width={520} 
                      height={360} 
                      className="max-w-full block select-none"
                    />

                    {/* Performance HUD telemetry overlay */}
                    <div className="absolute top-4 left-4 bg-black/85 border border-cyan-500/30 rounded-2xl p-4 font-mono text-[10px] text-cyan-400 space-y-1.5 shadow-xl max-w-[250px] pointer-events-none backdrop-blur-md">
                      <div className="flex items-center gap-1.5 border-b border-cyan-500/20 pb-1.5 mb-1.5 text-xs font-black text-white italic">
                        <Activity size={12} className="animate-pulse text-cyan-500" />
                        <span>WASM ENGINE TELEMETRY</span>
                      </div>
                      <p>Env: <span className="text-white font-bold">wasm32-unknown</span></p>
                      <p>WASM Exec Time: <span className="text-green-400 font-black">{telemetry.totalTimeMs} ms</span></p>
                      <p>Alloc Memory: <span className="text-white font-bold">{telemetry.ramAllocation} KB</span></p>
                      <p>L-Memory Offset: <span className="text-white font-bold">0x0F00 ({telemetry.wasmMemoryUsage} MB)</span></p>
                      <p>Active Threads: <span className="text-cyan-300 font-bold">Parallel (8 Workers)</span></p>
                      <p>Speed Gain vs JS: <span className="text-green-400 font-black">+{((telemetry.jsEquivalentMs / telemetry.totalTimeMs) * 100).toFixed(0)}% 🔥</span></p>
                    </div>

                    {/* Rotation manual controls in HUD corner */}
                    <div className="absolute bottom-4 right-4 bg-black/85 border border-white/5 rounded-2xl p-3 flex items-center gap-4 text-white hover:border-cyan-500/40 transition-all shadow-lg backdrop-blur-md">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Rotation</span>
                        <span className="text-xs font-bold font-mono text-cyan-400">{rotationAngle}° / 360°</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="360" 
                        value={rotationAngle} 
                        onChange={(e) => setRotationAngle(parseInt(e.target.value))}
                        className="w-24 accent-cyan-500 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Render statistics bar */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#090e17] border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">WASM Calc Duration</span>
                      <span className="text-lg font-black text-green-400 font-mono">{telemetry.calcTimePr}ms</span>
                    </div>
                    <div className="bg-[#090e17] border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Calculated Blocks</span>
                      <span className="text-lg font-black text-white font-mono">{telemetry.blocksCount} Blocks</span>
                    </div>
                    <div className="bg-[#090e17] border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Interpretation JS</span>
                      <span className="text-lg font-black text-rose-400/80 font-mono line-through">{telemetry.jsEquivalentMs}ms</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Parameter dials & Interactive WASM control deck */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Detailed Description */}
                  <div className="bg-[#090e17] border border-cyan-500/20 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest">
                      <Zap size={14} className="text-cyan-400" />
                      <span>Der Rust WASM-Vorteil</span>
                    </div>
                    <p className="text-neutral-300 text-xs leading-relaxed font-medium">
                      WebAssembly (WASM) ermöglicht es uns, hardwarenahen <span className="text-cyan-400 font-semibold">Rust-Code</span> direkt im Webbrowser mit nahezu nativer Desktop-Performance auszuführen.
                    </p>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Dieser Simulator lässt dich die Generierung von Minecraft 3D-Umgebungen in Echtzeit anpassen. Verstelle die Parameter, um die automatische Berechnung zu starten!
                    </p>
                  </div>

                  {/* Settings Dials Card */}
                  <div className="bg-neutral-950/40 border border-white/5 p-6 rounded-3xl space-y-6">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Sliders size={16} className="text-cyan-400" />
                      <span>Generierungs-Parameter</span>
                    </div>

                    <div className="space-y-5">
                      {/* Biome Type */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Flächen-Biom</label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['plains', 'nether', 'ocean', 'desert'] as const).map(b => (
                            <button
                              key={`biome-key-${b}`}
                              onClick={() => setBiome(b)}
                              className={`py-2 px-1 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                                biome === b
                                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                                  : 'bg-transparent border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {b === 'plains' ? 'Ebene' : b === 'nether' ? 'Nether' : b === 'ocean' ? 'Ozean' : 'Wüste'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Chunk Dimension size */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                          <span>Chunk-Größe</span>
                          <span className="text-cyan-400 font-mono font-black">{chunkSize} x {chunkSize} x {chunkSize}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {([8, 12, 16] as const).map(sz => (
                            <button
                              key={`size-key-${sz}`}
                              onClick={() => setChunkSize(sz)}
                              className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                                chunkSize === sz
                                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400'
                                  : 'bg-transparent border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {sz === 8 ? 'Minimal (8³)' : sz === 12 ? 'Standard (12³)' : 'Konvoi (16³)'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Noise octave */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                          <span>Wellen-Frequenz</span>
                          <span className="text-cyan-400 font-mono font-black">{noiseFrequency} Hz</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="8" 
                          value={noiseFrequency} 
                          onChange={(e) => setNoiseFrequency(parseInt(e.target.value))}
                          className="w-full accent-cyan-500 h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Multithreading Simulated multiplier */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                          <span>WASM-Multi-threading</span>
                          <span className="text-cyan-400 font-mono font-black">{wasmPerformanceMultiplier}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="4" 
                          max="40" 
                          step="4"
                          value={wasmPerformanceMultiplier} 
                          onChange={(e) => setWasmPerformanceMultiplier(parseInt(e.target.value))}
                          className="w-full accent-cyan-500 h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleTestCompile}
                    disabled={isGenerating}
                    className="w-full py-4 bg-cyan-500 text-black hover:bg-cyan-400 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/10 min-h-[50px]"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Kompiliere Rust-Quellen...
                      </>
                    ) : (
                      <>
                        <Play size={16} fill="black" />
                        Simulierter Rust-WASM Build-Test
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="flutter-lab-workspace"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full min-h-0"
              >
                {/* LEFT COLUMN: Smartphone Live Simulator Frame */}
                <div className="md:col-span-6 flex justify-center items-center">
                  <div className="relative w-[340px] h-[610px] bg-[#020304] border-[8px] border-neutral-800 rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(147,51,234,0.15)] overflow-hidden flex flex-col select-none group">
                    {/* Screen glare effect */}
                    <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none transform -translate-x-1/2 -translate-y-1/2 rotate-12 z-40" />

                    {/* Camera notch punch-hole */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-between px-3">
                      <span className="w-2 h-2 rounded-full bg-[#050c18] border border-neutral-700 pointer-events-none" />
                      <div className="w-8 h-1 bg-neutral-800 rounded-full" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
                    </div>

                    {/* Smartphone Notifications Stream Drawer */}
                    <div className="absolute top-10 left-3 right-3 z-50 flex flex-col gap-2 pointer-events-none">
                      <AnimatePresence>
                        {simulatedNotifications.map(n => (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="bg-black/95 border-l-4 border-purple-500 rounded-xl p-3 shadow-lg pointer-events-auto flex gap-2 w-full"
                          >
                            <div className="p-1.5 bg-purple-950/50 rounded-lg text-purple-400 shrink-0 h-fit">
                              <Bell size={12} className="animate-bounce" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-[10px] uppercase font-black text-purple-400 tracking-wider font-sans">{n.sender}</h5>
                              <p className="text-[10px] text-neutral-300 font-bold leading-relaxed truncate">{n.text}</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Simulated Flutter Device Status Bar */}
                    <div className="pt-8 px-5 pb-2 bg-[#080d16] text-[10px] text-neutral-400 flex justify-between items-center z-10 font-mono">
                      <span>09:41 AM</span>
                      <div className="flex items-center gap-1.5">
                        <Activity size={10} className="text-green-500" />
                        <span>LTE</span>
                        <span>84%</span>
                        <div className="w-4 h-2 bg-neutral-800 rounded border border-neutral-600 p-0.5 flex">
                          <div className="h-full bg-green-500 w-3/4 rounded-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Simulated Flutter Mobile Screen content */}
                    {hotReloadAnim ? (
                      <div className="flex-1 bg-black flex flex-col justify-center items-center text-center gap-4 z-10">
                        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                        <div>
                          <p className="text-xs font-black uppercase text-purple-400 font-mono tracking-widest">Hot Reloading...</p>
                          <p className="text-[10px] text-neutral-500 font-mono">Applying Flutter Widget updates</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-between bg-[#080d16] z-10 overflow-hidden text-neutral-200">
                        {/* Flutter mini App Bar */}
                        <div className="py-2.5 px-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#09111c]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-white">CraftCompanion</h4>
                          </div>
                          <span className="text-[9px] bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded px-1.5 font-mono">FLUTTER</span>
                        </div>

                        {/* Flutter Tab Panel Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                          {mobileActiveTab === 'dashboard' && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              className="space-y-3"
                            >
                              {/* Flutter Welcome Hero Card */}
                              <div className="bg-gradient-to-br from-purple-950/40 to-[#0c1825] border border-purple-500/10 rounded-2xl p-4 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-xl rounded-full" />
                                <h5 className="font-bold text-sm text-purple-300">Hallo, {myProfile?.displayName || user?.displayName || 'Spieler'}! 📱</h5>
                                <p className="text-[10px] text-neutral-400 mt-1">Dein Minecraft Account auf dem Smartphone synchronisiert.</p>
                                
                                <div className="mt-3 py-1.5 px-3 bg-black/40 rounded-xl inline-flex items-center gap-2 border border-white/5">
                                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Guthaben:</span>
                                  <span className="text-xs font-extrabold text-mc-gold">{myProfile?.coins || 0} COINS</span>
                                </div>
                              </div>

                              {/* Interactive Control list */}
                              <div className="bg-[#09111c]/60 border border-white/5 rounded-2xl p-3 space-y-2">
                                <h6 className="text-[10px] uppercase font-black tracking-wider text-purple-400">Native Mobilbefehle</h6>
                                
                                <button
                                  onClick={() => triggerMobileNotification("Dashboard", "⚠️ Deine Minecraft-Farmen benötigen Aufmerksamkeit! 🌾")}
                                  className="w-full text-left p-2.5 hover:bg-white/5 rounded-xl border border-white/5 hover:border-purple-500/35 flex items-center justify-between text-[11px] font-semibold transition-all group"
                                >
                                  <span>Simuliere Farm-Alarm</span>
                                  <ChevronArrowRight className="w-3 h-3 text-neutral-500 group-hover:text-purple-400 transition-colors" />
                                </button>
                                
                                <button
                                  onClick={() => triggerMobileNotification("Clan-Event", "🔥 Ein neues Clankrieg-Event startet in Kürze! 🗡️")}
                                  className="w-full text-left p-2.5 hover:bg-white/5 rounded-xl border border-white/5 hover:border-purple-500/35 flex items-center justify-between text-[11px] font-semibold transition-all group"
                                >
                                  <span>Simuliere Event-Alarm</span>
                                  <ChevronArrowRight className="w-3 h-3 text-neutral-500 group-hover:text-purple-400 transition-colors" />
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {mobileActiveTab === 'chat' && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              className="h-full flex flex-col justify-between"
                            >
                              {/* Flutter-Sync Chat list */}
                              <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1 max-h-[170px]">
                                {chatMessages.slice(-5).map((msg, idx) => (
                                  <div key={`m-msg-${idx}`} className={`p-2 rounded-xl text-[10px] flex flex-col max-w-[85%] ${
                                    msg.userId === user?.uid 
                                      ? 'bg-purple-900/35 border border-purple-500/10 ml-auto' 
                                      : 'bg-black/40 border border-white/5 mr-auto'
                                  }`}>
                                    <span className="font-extrabold text-[#7496e5] text-[9px] mb-0.5 truncate">{msg.displayName}</span>
                                    <span className="leading-relaxed font-medium text-white break-words">{msg.text.replace(/§[4-9a-fklmnor]/g, '')}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Simple typing container */}
                              <form onSubmit={handleMobileSend} className="flex gap-1.5 mt-2 pt-2 border-t border-white/5 shrink-0">
                                <input
                                  type="text"
                                  placeholder="Typing inside Flutter..."
                                  value={mobileMessageInput}
                                  onChange={(e) => setMobileMessageInput(e.target.value)}
                                  className="flex-1 bg-black rounded-xl px-3 py-2 text-[10px] border border-white/5 focus:border-purple-500/50 outline-none text-white font-medium"
                                />
                                <button
                                  type="submit"
                                  className="p-2 bg-purple-500 text-black hover:bg-purple-400 rounded-xl transition-all"
                                >
                                  <Send size={10} />
                                </button>
                              </form>
                            </motion.div>
                          )}

                          {mobileActiveTab === 'systems' && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              className="space-y-3"
                            >
                              <div className="bg-[#09111c]/60 border border-white/5 rounded-2xl p-3">
                                <h6 className="text-[10px] uppercase font-black text-purple-400 tracking-wider mb-2">Simulierter System-Monitor</h6>
                                
                                <div className="space-y-3 font-mono text-[9px] leading-relaxed">
                                  <div className="flex justify-between items-center text-neutral-400">
                                    <span>Flutter SDK Version:</span>
                                    <span className="text-white">v3.22.1</span>
                                  </div>
                                  <div className="flex justify-between items-center text-neutral-400">
                                    <span>Engine Platform:</span>
                                    <span className="text-white">Dart / CanvasKit</span>
                                  </div>
                                  <div className="flex justify-between items-center text-neutral-400">
                                    <span>WebAssembly GC API:</span>
                                    <span className="text-purple-400 font-extrabold">Aktiviert</span>
                                  </div>
                                  <div className="flex justify-between items-center text-neutral-400">
                                    <span>FPS Performance:</span>
                                    <span className="text-green-500 font-bold">120 FPS</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Phone Gesture Pill (Simulates iOS/Android Home) */}
                        <div className="mt-auto shrink-0 flex flex-col bg-[#09111c]">
                          {/* Botom Tabs Bar */}
                          <div className="flex border-t border-white/5 py-1 text-center shrink-0">
                            <button
                              onClick={() => setMobileActiveTab('dashboard')}
                              className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-[9px] font-black uppercase tracking-wider ${
                                mobileActiveTab === 'dashboard' ? 'text-purple-400' : 'text-neutral-500'
                              }`}
                            >
                              <Grid size={12} />
                              Dash
                            </button>
                            <button
                              onClick={() => setMobileActiveTab('chat')}
                              className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-[9px] font-black uppercase tracking-wider ${
                                mobileActiveTab === 'chat' ? 'text-purple-400' : 'text-neutral-500'
                              }`}
                            >
                              <MessageSquare size={12} />
                              Chat Sync
                            </button>
                            <button
                              onClick={() => setMobileActiveTab('systems')}
                              className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-[9px] font-black uppercase tracking-wider ${
                                mobileActiveTab === 'systems' ? 'text-purple-400' : 'text-neutral-500'
                              }`}
                            >
                              <Activity size={12} />
                              Systems
                            </button>
                          </div>
                          
                          {/* Gesture Pill */}
                          <div className="h-6 flex items-center justify-center">
                            <div className="w-24 h-1 bg-neutral-600 rounded-full" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Interactive Control center of Simulated Dart environment */}
                <div className="md:col-span-6 flex flex-col gap-6">
                  {/* Explanatory introduction */}
                  <div className="bg-[#120917] border border-purple-500/20 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-black uppercase tracking-widest">
                      <Smartphone size={14} className="text-purple-500" />
                      <span>Der Flutter Cross-Platform Vorteil</span>
                    </div>
                    <p className="text-neutral-300 text-xs leading-relaxed font-medium">
                      Flutter ermöglicht es uns, aus einer einzigen, eleganten <span className="text-purple-400 font-semibold">Dart-Codebasis</span> performante Apps für Android, iOS und Desktop zu erzeugen.
                    </p>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Dieser Simulator demonstriert die Echtzeit-Synchronisation des Dashboards mit einer mobilen Companion-App, inklusive bidirektionalem Firebase Chat & simulierten mobilen Push-Benachrichtigungen.
                    </p>
                  </div>

                  {/* Flutter controls and parameters panel */}
                  <div className="bg-neutral-950/40 border border-white/5 p-6 rounded-3xl space-y-6">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Settings size={16} className="text-purple-400" />
                      <span>Flutter Simulator Steuerung</span>
                    </div>

                    <div className="space-y-4">
                      {/* Theme colors option */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Material 3 Farbschema</label>
                        <div className="flex gap-2">
                          {(['cyan', 'purple', 'gold'] as const).map(color => (
                            <button
                              key={`theme-btn-${color}`}
                              onClick={() => {
                                setFlutterTheme(color);
                                triggerToast('quest', '🎨 APP FARBSCHEMA', `Flutter App Farbe auf ${color.toUpperCase()} umgestellt!`);
                              }}
                              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                                flutterTheme === color
                                  ? 'bg-purple-500/15 border-purple-500 text-purple-400'
                                  : 'bg-transparent border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {color === 'cyan' ? 'Cyan' : color === 'purple' ? 'Purple' : 'Gold'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Hot reload controls */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Live Development</label>
                        <button
                          onClick={triggerHotReload}
                          disabled={hotReloadAnim}
                          className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <Zap size={14} className={hotReloadAnim ? 'animate-bounce' : 'animate-pulse'} />
                          Simuliere Hot Reload (⚡)
                        </button>
                      </div>

                      {/* Manual mock pushes */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Push-Service Testen</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => triggerMobileNotification("Minecraft Server Update", "🟢 Der Server l_luzifer läuft jetzt stabil mit 20 TPS!")}
                            className="p-3 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-white/5 text-neutral-300 hover:text-white hover:bg-white/5 transition-all text-center"
                          >
                            Server-Status Push
                          </button>
                          <button
                            onClick={() => triggerMobileNotification("Shop Promotion", "🛒 Neuer Legendärer Skin im Globalen Shop verfügbar!")}
                            className="p-3 text-[10px] font-bold uppercase tracking-wider rounded-xl border border-white/5 text-neutral-300 hover:text-white hover:bg-white/5 transition-all text-center"
                          >
                            Shop-Anzeige Push
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Help helper icon for mobile inside tabs (Compact size version for inline use)
const ChevronArrowRight: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
};
