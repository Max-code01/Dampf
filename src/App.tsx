import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, 
  Swords, 
  Trees, 
  Users, 
  MessageCircle, 
  Copy, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Info,
  Activity,
  Zap,
  LogIn,
  LogOut,
  UserPlus,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  Globe,
  Circle
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './firebase-lib';

const REALM_CODES = {
  PVP: 'w3PHnwq-5_kcfoE',
  SURVIVAL: 'JwMPYn9KpsVnRFo'
};

const DISCORD_URL = 'https://discord.gg/bdc79dqh';

interface Player {
  id: string;
  username: string;
  server: 'pvp' | 'survival';
  lastSeen: string;
}

interface ServerStatus {
  online: boolean;
  playerCount: number;
  maxPlayers: number;
}

interface UserProfile {
  userId: string;
  displayName: string;
  minecraftUsername: string;
  isOnline: boolean;
  currentServer: 'none' | 'pvp' | 'survival';
  customSkin?: string;
  updatedAt: any;
}

export default function App() {
  const [copied, setCopied] = useState<string | null>(null);
  const [user, setUser] = useState<User| null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tempSkin, setTempSkin] = useState<string | null>(null);
  const [pixelGrid, setPixelGrid] = useState<string[]>(Array(64).fill('#000000'));
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [pvpStatus, setPvpStatus] = useState<ServerStatus>({ online: true, playerCount: 0, maxPlayers: 10 });
  const [survivalStatus, setSurvivalStatus] = useState<ServerStatus>({ online: true, playerCount: 0, maxPlayers: 10 });
  const [showAdmin, setShowAdmin] = useState(false);
  const [discordData, setDiscordData] = useState<{ online_count: number; members: any[] } | null>(null);

  // Constants
  const DISCORD_GUILD_ID = '1451980583969230882'; // Aktualisierte Server ID

  // Fetch Discord Status
  useEffect(() => {
    const fetchDiscord = async () => {
      try {
        const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`);
        const data = await res.json();
        setDiscordData({
          online_count: data.presence_count,
          members: data.members || []
        });
      } catch (e) {
        console.error("Discord Widget not enabled or ID wrong", e);
      }
    };

    fetchDiscord();
    const interval = setInterval(fetchDiscord, 30000); // Alle 30 Sek aktualisieren
    return () => clearInterval(interval);
  }, [DISCORD_GUILD_ID]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email === 'max.schule13@gmail.com');
    });
  }, []);

  // Firebase Listeners
  useEffect(() => {
    // Listen to players
    const unsubscribePlayers = onSnapshot(collection(db, 'online_players'), (snapshot) => {
      const playerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      setPlayers(playerList);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'online_players'));

    // Listen to pvp status
    const unsubscribePvp = onSnapshot(doc(db, 'server_status', 'pvp'), (snapshot) => {
      if (snapshot.exists()) setPvpStatus(snapshot.data() as ServerStatus);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'server_status/pvp'));

    // Listen to survival status
    const unsubscribeSurvival = onSnapshot(doc(db, 'server_status', 'survival'), (snapshot) => {
      if (snapshot.exists()) setSurvivalStatus(snapshot.data() as ServerStatus);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'server_status/survival'));

    // Listen to user profiles
    const q = query(collection(db, 'user_profiles'), orderBy('updatedAt', 'desc'));
    const unsubscribeProfiles = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUserProfiles(profiles);
      
      if (user) {
        const myProf = profiles.find(p => p.userId === user.uid);
        if (myProf) setMyProfile(myProf);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'user_profiles'));

    return () => {
      unsubscribePlayers();
      unsubscribePvp();
      unsubscribeSurvival();
      unsubscribeProfiles();
    };
  }, [user]);

  // Update my profile when user object changes
  useEffect(() => {
    if (user) {
      const found = userProfiles.find(p => p.userId === user.uid);
      if (found) {
        setMyProfile(found);
        if (found.customSkin) setTempSkin(found.customSkin);
      }
    } else {
      setMyProfile(null);
    }
  }, [user, userProfiles]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => signOut(auth);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempSkin(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePixelClick = (index: number) => {
    const newGrid = [...pixelGrid];
    newGrid[index] = brushColor;
    setPixelGrid(newGrid);
    
    // Generate base64 from canvas
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      newGrid.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(i % 8, Math.floor(i / 8), 1, 1);
      });
      setTempSkin(canvas.toDataURL());
    }
  };

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('displayName') as string;
    const minecraftUsername = formData.get('minecraftUsername') as string;
    const isOnline = formData.get('isOnline') === 'on';
    const currentServer = formData.get('currentServer') as 'none' | 'pvp' | 'survival';

    try {
      await setDoc(doc(db, 'user_profiles', user.uid), {
        userId: user.uid,
        displayName,
        minecraftUsername,
        isOnline,
        currentServer,
        customSkin: tempSkin || null,
        updatedAt: serverTimestamp()
      });
      setShowProfileModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_profiles/${user.uid}`);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Simulation Helpers
  const addRandomPlayer = async (server: 'pvp' | 'survival') => {
    if (!user) return;
    const usernames = ['Steve', 'Alex', 'Herobrine', 'Dinnerbone', 'Notch', 'Grumm', 'Dream', 'Techno'];
    const username = usernames[Math.floor(Math.random() * usernames.length)] + Math.floor(Math.random() * 100);
    const playerId = username.toLowerCase();
    
    try {
      await setDoc(doc(db, 'online_players', playerId), {
        username,
        server,
        lastSeen: new Date().toISOString()
      });
      // Update count locally for faster UI, though the listener will overwrite it
      const status = server === 'pvp' ? pvpStatus : survivalStatus;
      await setDoc(doc(db, 'server_status', server), {
        ...status,
        playerCount: status.playerCount + 1
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `online_players/${playerId}`);
    }
  };

  const clearPlayers = async () => {
    if (!user) return;
    try {
      const snapshot = await getDocs(collection(db, 'online_players'));
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, 'online_players', d.id));
      }
      await setDoc(doc(db, 'server_status', 'pvp'), { ...pvpStatus, playerCount: 0 });
      await setDoc(doc(db, 'server_status', 'survival'), { ...survivalStatus, playerCount: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'online_players');
    }
  };

  const pvpPlayers = players.filter(p => p.server === 'pvp');
  const survivalPlayers = players.filter(p => p.server === 'survival');
  
  // Combined online players from both manual list and user profiles
  const combinedOnline = [
    ...players.map(p => ({
      username: p.username,
      server: p.server,
      type: 'manual'
    })),
    ...userProfiles
      .filter(p => p.isOnline)
      .map(p => ({
        username: p.minecraftUsername,
        server: p.currentServer,
        displayName: p.displayName,
        type: 'profile'
      }))
  ].filter((player, index, self) => 
    index === self.findIndex((t) => t.username.toLowerCase() === player.username.toLowerCase())
  );

  const totalOnline = combinedOnline.length;

  return (
    <div className="min-h-screen relative overflow-hidden pixel-grid">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-mc-red/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-mc-gold/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-neutral-800/50 bg-black/50 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mc-red rounded-lg flex items-center justify-center">
              <Gamepad2 className="text-white" size={24} />
            </div>
            <span className="font-extrabold text-xl tracking-tight hidden sm:block">MC HUB</span>
          </div>
          <div className="flex items-center gap-4">
            {!user ? (
              <button 
                onClick={login}
                className="mc-button mc-button-primary py-2 text-sm"
              >
                <LogIn size={18} />
                Anmelden
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="mc-button mc-button-secondary py-2 text-sm hidden sm:flex"
                >
                  <UserIcon size={18} />
                  Profil
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => setShowAdmin(!showAdmin)}
                    className={`p-2 rounded-lg transition-colors ${showAdmin ? 'bg-mc-red/20 text-mc-red' : 'bg-neutral-800 text-neutral-400'}`}
                    title="Simulation Panel"
                  >
                    <ShieldCheck size={20} />
                  </button>
                )}
                <button 
                  onClick={logout}
                  className="mc-button border-red-500/20 text-red-400 hover:bg-red-500/10 p-2 rounded-lg"
                  title="Abmelden"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
            <a 
              href={DISCORD_URL} 
              target="_blank" 
              rel="noreferrer"
              className="mc-button mc-button-secondary py-2 text-sm hidden md:flex"
            >
              <MessageCircle size={18} />
              Discord
            </a>
          </div>
        </div>
      </nav>

      {/* Simulation/Admin Panel */}
      <AnimatePresence>
        {showAdmin && isAdmin && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 bg-mc-red/5 border-b border-mc-red/20 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap gap-6 items-center">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-mc-red uppercase tracking-wider">Live Simulation</span>
                <p className="text-neutral-400 text-xs text-wrap max-w-xs">Simuliere echte Spielerdaten für dein Dashboard. Diese Daten werden in Firestore gespeichert.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => addRandomPlayer('pvp')} className="mc-button bg-red-500/20 text-red-400 text-xs py-2 h-10">
                  <UserPlus size={14} /> PVP Spieler +1
                </button>
                <button onClick={() => addRandomPlayer('survival')} className="mc-button bg-mc-red/20 text-mc-red text-xs py-2 h-10">
                  <UserPlus size={14} /> Survival Spieler +1
                </button>
                <button onClick={clearPlayers} className="mc-button bg-neutral-800 text-neutral-400 text-xs py-2 h-10">
                  <Trash2 size={14} /> Alle Leeren
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-24">
        {/* Hero Section */}
        <div className="max-w-3xl mb-20 text-center mx-auto md:text-left md:mx-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-mc-red rounded-full border border-red-500/20 text-sm font-medium mb-6">
              <Zap size={14} />
              <span>Community Dashboard V2.1 - Echte Daten</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
              Dein Realm. <br />
              <span className="text-mc-red">Deine Regeln.</span>
            </h1>
            <p className="text-neutral-400 text-lg md:text-xl mb-10 max-w-xl text-wrap">
              Echtzeit-Synchronisation mit deiner Firestore Datenbank. Schau dir an, wer gerade online ist.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <button 
                onClick={() => document.getElementById('codes')?.scrollIntoView({ behavior: 'smooth' })}
                className="mc-button mc-button-primary"
              >
                Codes abrufen
                <ChevronRight size={20} />
              </button>
              <a 
                href={DISCORD_URL} 
                target="_blank" 
                rel="noreferrer"
                className="mc-button mc-button-secondary"
              >
                Discord Server
                <ExternalLink size={20} />
              </a>
            </div>
          </motion.div>
        </div>

        {/* Live Status Cards (Summary) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mc-card flex items-center gap-4 border-blue-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users size={24} />
            </div>
            <div>
              <p className="text-neutral-400 text-sm">Spieler Online</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{totalOnline}</span>
                {totalOnline > 0 && <span className="w-2 h-2 rounded-full bg-mc-red animate-pulse" />}
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mc-card flex items-center gap-4 border-mc-gold/10"
          >
            <div className="w-12 h-12 rounded-xl bg-mc-gold/10 flex items-center justify-center text-mc-gold">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-neutral-400 text-sm">Gesamt-Status</p>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold uppercase ${pvpStatus.online || survivalStatus.online ? 'text-mc-red' : 'text-red-500'}`}>
                  {pvpStatus.online || survivalStatus.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mc-card flex items-center gap-4 border-purple-500/10"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <MessageCircle size={24} />
            </div>
            <div>
              <p className="text-neutral-400 text-sm">Discord Online</p>
              <span className="text-2xl font-bold">{discordData?.online_count || '...'}</span>
            </div>
          </motion.div>
        </section>

        {/* Global Online Players Summary */}
        <section className="mb-12">
          <div className="mc-card p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-mc-gold/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-mc-gold/[0.02] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Circle className="text-mc-red fill-mc-red animate-pulse" size={12} />
                <h2 className="text-2xl font-bold">Wer ist gerade online?</h2>
              </div>
              <p className="text-neutral-500 text-sm">Aktuell sind {totalOnline} Spieler in der Community aktiv.</p>
            </div>
            
            <div className="flex -space-x-4">
              {combinedOnline.map((p, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative group"
                >
                  <img 
                    src={p.type === 'profile' ? (userProfiles.find(prof => prof.userId === p.username)?.customSkin || `https://mc-heads.net/avatar/${p.username}`) : `https://mc-heads.net/avatar/${p.username}`} 
                    alt={p.username}
                    className="w-14 h-14 rounded-lg border-2 border-mc-gold bg-neutral-900 pixelated relative z-10 transition-transform group-hover:scale-110 group-hover:z-20 cursor-help object-cover"
                    title={`${p.username} ${p.server !== 'none' ? `auf ${p.server}` : ''}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none border border-neutral-800">
                    {p.username}
                  </div>
                </motion.div>
              ))}
              {combinedOnline.length === 0 && (
                <div className="text-neutral-500 font-medium italic">Gerade keiner online...</div>
              )}
            </div>
          </div>
        </section>

        {/* Realm Codes Section */}
        <section id="codes" className="mb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Realm Zugangscodes</h2>
              <p className="text-neutral-400">Direkter Zugang für geprüfte Community-Mitglieder.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />
              <div className="mc-card h-full flex flex-col justify-between border-red-500/20">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="p-3 bg-red-500/20 text-red-400 rounded-xl">
                      <Swords size={32} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Live Status</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/20">
                          {pvpPlayers.length} / {pvpStatus.maxPlayers} Online
                        </span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">PvP Arena</h3>
                  <p className="text-neutral-400 mb-6 leading-relaxed">
                    Der offizielle Realm für unsere PvP-Turniere. Kämpfe gegen andere, verbessere deine Skills und dominiere.
                  </p>
                  
                  {/* Player List */}
                  <div className="mb-8 min-h-[40px]">
                    <p className="text-[10px] uppercase font-bold text-neutral-500 mb-2 tracking-widest">Aktive Spieler</p>
                    <div className="flex flex-wrap gap-2">
                      {pvpPlayers.length > 0 ? pvpPlayers.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded-lg border border-neutral-800 text-xs">
                          <div className="w-2 h-2 rounded-full bg-mc-red shadow-sm shadow-red-500/50" />
                          {p.username}
                        </div>
                      )) : (
                        <span className="text-xs text-neutral-600 italic">Warte auf Spieler...</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div 
                  onClick={() => copyToClipboard(REALM_CODES.PVP, 'pvp')}
                  className="mt-auto bg-black/40 border border-neutral-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-colors group/code"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Realm Code</span>
                    <span className="font-mono text-xl text-mc-gold group-hover/code:text-white transition-colors">
                      {REALM_CODES.PVP}
                    </span>
                  </div>
                  <div className="p-2 text-neutral-500">
                    {copied === 'pvp' ? <CheckCircle2 className="text-mc-green" /> : <Copy size={20} />}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-mc-red/10 to-transparent pointer-events-none" />
              <div className="mc-card h-full flex flex-col justify-between border-mc-red/20">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="p-3 bg-mc-red/20 text-mc-red rounded-xl">
                      <Trees size={32} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-mc-red uppercase tracking-widest mb-1">Live Status</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-mc-red/10 text-mc-red px-3 py-1 rounded-full border border-mc-red/20">
                          {survivalPlayers.length} / {survivalStatus.maxPlayers} Online
                        </span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Survival World</h3>
                  <p className="text-neutral-400 mb-6 leading-relaxed text-wrap">
                    Entspanntes Vanilla-Survival. Erforsche, baue gemeinsam und genieße die Welt.
                  </p>

                   {/* Player List */}
                   <div className="mb-8 min-h-[40px]">
                    <p className="text-[10px] uppercase font-bold text-neutral-500 mb-2 tracking-widest">Aktive Spieler</p>
                    <div className="flex flex-wrap gap-2">
                      {survivalPlayers.length > 0 ? survivalPlayers.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded-lg border border-neutral-800 text-xs">
                          <div className="w-2 h-2 rounded-full bg-mc-red shadow-sm shadow-red-500/50" />
                          {p.username}
                        </div>
                      )) : (
                        <span className="text-xs text-neutral-600 italic">Warte auf Spieler...</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div 
                  onClick={() => copyToClipboard(REALM_CODES.SURVIVAL, 'survival')}
                  className="mt-auto bg-black/40 border border-neutral-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-colors group/code"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Realm Code</span>
                    <span className="font-mono text-xl text-mc-gold group-hover/code:text-white transition-colors">
                      {REALM_CODES.SURVIVAL}
                    </span>
                  </div>
                  <div className="p-2 text-neutral-500">
                    {copied === 'survival' ? <CheckCircle2 className="text-mc-green" /> : <Copy size={20} />}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Community Players List */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <Globe className="text-mc-gold" size={28} />
              <h2 className="text-3xl font-bold">Community Status</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {userProfiles.map((p) => (
                <motion.div 
                  key={p.userId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mc-card p-4 flex flex-col items-center text-center border-neutral-800/50 hover:border-mc-red/30 transition-colors group"
                >
                  <div className="relative mb-4">
                    <img 
                      src={p.customSkin || `https://mc-heads.net/avatar/${p.minecraftUsername || 'steve'}`} 
                      alt={p.displayName}
                      className="w-16 h-16 rounded-lg bg-neutral-900 pixelated border-2 border-neutral-800 group-hover:border-mc-red/50 transition-colors object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${p.isOnline ? 'bg-green-500' : 'bg-neutral-600'}`} />
                  </div>
                  <h4 className="font-bold text-sm truncate w-full mb-1">{p.displayName}</h4>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{p.isOnline ? 'Online' : 'Offline'}</p>
                    {p.isOnline && p.currentServer && p.currentServer !== 'none' && (
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${p.currentServer === 'pvp' ? 'bg-red-500/20 text-red-400' : 'bg-mc-red/20 text-mc-red'}`}>
                        {p.currentServer}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              {!user && (
                <div 
                  onClick={login}
                  className="mc-card p-4 flex flex-col items-center justify-center text-center border-dashed border-neutral-800 hover:border-mc-gold/50 cursor-pointer transition-colors"
                >
                  <div className="w-16 h-16 rounded-lg bg-neutral-900 flex items-center justify-center border-2 border-dashed border-neutral-800 text-neutral-600 mb-2">
                    <UserPlus size={24} />
                  </div>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Hier eintragen</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Server Rules Section */}
        <section className="mb-24 py-12 border-t border-neutral-800/50">
          <div className="flex items-center gap-3 mb-10">
            <ShieldCheck className="text-mc-red" size={32} />
            <h2 className="text-3xl font-bold">Server Rules</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="mc-card border-red-500/10 bg-red-500/[0.01]">
              <div className="flex items-center gap-3 mb-6">
                <Swords className="text-red-400" size={24} />
                <h3 className="text-xl font-bold">PvP Arena Rules</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  Keine künstlichen Verzögerungen oder "Lag-Switching".
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  Respektvoller Umgang im Chat nach einem Kampf (GG!).
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  Kein Teaming in Solo-Modi.
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  Nutzung von Exploits führt zum sofortigen Bann.
                </li>
              </ul>
            </div>

            <div className="mc-card border-mc-red/10 bg-mc-red/[0.01]">
              <div className="flex items-center gap-3 mb-6">
                <Trees className="text-mc-red" size={24} />
                <h3 className="text-xl font-bold">Survival World Rules</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mc-red shrink-0" />
                  Kein Griefing oder Zerstören fremder Bauwerke.
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mc-red shrink-0" />
                  Kein Stehlen aus Kisten – fragt vorher um Erlaubnis.
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mc-red shrink-0" />
                  Haltet die Welt sauber (keine schwebenden Baumkronen).
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mc-red shrink-0" />
                  Große Projekte bitte vorher im Discord anmelden.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Information & Rules */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 py-12 border-t border-neutral-800/50">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Info className="text-mc-gold" size={24} />
              <h2 className="text-3xl font-bold">Wichtige Infos</h2>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-1 bg-mc-gold h-auto rounded-full" />
                <div>
                  <h4 className="font-bold mb-1">Echtzeit-Synchronisation</h4>
                  <p className="text-neutral-400 text-sm">Die Online-Anzeige synchronisiert sich automatisch mit unserer Firestore-Cloud. So weißt du immer, ob deine Freunde online sind.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1 bg-mc-red h-auto rounded-full" />
                <div>
                  <h4 className="font-bold mb-1">Sicherheit</h4>
                  <p className="text-neutral-400 text-sm">Griefing wird nicht toleriert. Alle Aktionen werden geloggt. Bei Verstößen erfolgt ein sofortiger Ausschluss aus allen Realms.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mc-card border-purple-500/10 bg-purple-500/[0.02]">
            <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="text-purple-500" size={20} />
                Discord Community
              </div>
              <span className="text-xs font-mono bg-purple-500/20 text-purple-400 px-2 py-1 rounded-lg">
                {discordData?.online_count || 0} Online
              </span>
            </h3>
            
            {/* Discord Online List */}
            <div className="mb-6 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {discordData?.members && discordData.members.length > 0 ? (
                discordData.members.slice(0, 15).map((member) => (
                  <div key={member.id} className="flex items-center gap-3 text-sm">
                    <div className="relative">
                      <img src={member.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-black rounded-full" />
                    </div>
                    <span className="text-neutral-300 truncate">{member.username}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 italic">Widget noch nicht aktiviert oder ID falsch.</p>
              )}
            </div>

            <p className="text-neutral-400 text-sm mb-6 text-wrap">
              Probleme beim Beitreten? Unser Support-Team im Discord hilft dir gerne weiter.
            </p>
            <a 
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="mc-button bg-purple-600 hover:bg-purple-500 text-white w-full"
            >
              Discord beitreten
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-neutral-800/50 py-12 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-30">
            <Gamepad2 size={24} />
            <span className="font-bold tracking-tight">MC COMMUNITY HUB &copy; 2026</span>
          </div>
          <div className="flex gap-8 text-sm text-neutral-500">
            <a href="#" className="hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Imprint</a>
          </div>
        </div>
      </footer>

      {/* Copy Notification */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-mc-red text-white px-6 py-3 rounded-xl font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 size={20} />
            Erfolgreich kopiert!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <UserIcon className="text-mc-red" />
                  Dein Spieler-Profil
                </h3>
                
                <form onSubmit={saveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Display Name</label>
                        <input 
                          name="displayName"
                          defaultValue={myProfile?.displayName || user?.displayName || ''}
                          placeholder="Wie willst du genannt werden?"
                          required
                          className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-red outline-none transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Minecraft Username</label>
                        <input 
                          name="minecraftUsername"
                          defaultValue={myProfile?.minecraftUsername || ''}
                          placeholder="Dein In-Game Name"
                          required
                          className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-red outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Aktueller Server</label>
                        <select 
                          name="currentServer"
                          defaultValue={myProfile?.currentServer || 'none'}
                          className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-red outline-none transition-colors appearance-none"
                        >
                          <option value="none">Keiner / Menü</option>
                          <option value="pvp">PvP Arena</option>
                          <option value="survival">Survival World</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest">Skin & Avatar</label>
                      <div className="mc-card p-4 flex flex-col items-center gap-4 border-neutral-800/50 bg-black/20">
                        <div className="relative group">
                          {tempSkin ? (
                            <img src={tempSkin} className="w-24 h-24 rounded-lg bg-neutral-900 pixelated border-2 border-mc-gold object-cover" alt="Preview" />
                          ) : (
                            <div className="w-24 h-24 rounded-lg bg-neutral-900 border-2 border-dashed border-neutral-800 flex items-center justify-center text-neutral-600">
                              <UserIcon size={32} />
                            </div>
                          )}
                          <button 
                            type="button" 
                            onClick={() => setTempSkin(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <label className="mc-button mc-button-secondary py-2 text-[10px] cursor-pointer text-center">
                            Upload
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                          </label>
                          <button type="button" onClick={() => setTempSkin(null)} className="mc-button border-neutral-800 py-2 text-[10px]">
                            MC Head
                          </button>
                        </div>

                        <div className="w-full">
                          <p className="text-[10px] font-bold text-neutral-600 mb-2 text-center uppercase tracking-tighter">Oder zeichnen (8x8)</p>
                          <div className="grid grid-cols-8 gap-0.5 aspect-square w-full max-w-[160px] mx-auto border border-neutral-800 bg-black/40">
                            {pixelGrid.map((color, i) => (
                              <div 
                                key={i} 
                                onClick={() => handlePixelClick(i)}
                                style={{ backgroundColor: color }}
                                className="w-full h-full cursor-crosshair hover:opacity-80 transition-opacity"
                              />
                            ))}
                          </div>
                          <div className="mt-3 flex justify-center gap-2">
                            {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'].map(c => (
                              <button 
                                key={c}
                                type="button"
                                onClick={() => setBrushColor(c)}
                                style={{ backgroundColor: c }}
                                className={`w-4 h-4 rounded-full border border-white/20 ${brushColor === c ? 'ring-2 ring-mc-red ring-offset-2 ring-offset-black' : ''}`}
                              />
                            ))}
                            <input 
                              type="color" 
                              value={brushColor} 
                              onChange={(e) => setBrushColor(e.target.value)}
                              className="w-4 h-4 rounded-full bg-transparent border-none p-0 overflow-hidden cursor-pointer" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/40 border border-neutral-800 rounded-xl">
                    <span className="text-sm font-medium">Bist du gerade online?</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="isOnline"
                        defaultChecked={myProfile?.isOnline || false}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mc-red"></div>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 px-6 py-4 rounded-xl font-bold bg-neutral-800 hover:bg-neutral-700 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-4 rounded-xl font-bold bg-mc-red text-white hover:bg-red-500 transition-all shadow-lg shadow-red-500/20"
                    >
                      Speichern
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
