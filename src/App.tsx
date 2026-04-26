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
  ShieldCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  getDocs
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
  PVP: 'PVP-REALM-CODE',
  SURVIVAL: 'SURVIVAL-REALM-CODE'
};

const DISCORD_URL = 'https://discord.gg/your-invite';

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

export default function App() {
  const [copied, setCopied] = useState<string | null>(null);
  const [user, setUser] = useState<User| null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pvpStatus, setPvpStatus] = useState<ServerStatus>({ online: true, playerCount: 0, maxPlayers: 10 });
  const [survivalStatus, setSurvivalStatus] = useState<ServerStatus>({ online: true, playerCount: 0, maxPlayers: 10 });
  const [showAdmin, setShowAdmin] = useState(false);
  const [discordData, setDiscordData] = useState<{ online_count: number; members: any[] } | null>(null);

  // Constants
  const DISCORD_GUILD_ID = 'YOUR_DISCORD_SERVER_ID'; // Ersetze dies durch deine Discord Server ID

  // Fetch Discord Status
  useEffect(() => {
    const fetchDiscord = async () => {
      if (DISCORD_GUILD_ID === 'YOUR_DISCORD_SERVER_ID') return;
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
    return onAuthStateChanged(auth, (u) => setUser(u));
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

    return () => {
      unsubscribePlayers();
      unsubscribePvp();
      unsubscribeSurvival();
    };
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => signOut(auth);

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
  const totalOnline = players.length;

  return (
    <div className="min-h-screen relative overflow-hidden pixel-grid">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-mc-green/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-mc-gold/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-neutral-800/50 bg-black/50 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mc-green rounded-lg flex items-center justify-center">
              <Gamepad2 className="text-black" size={24} />
            </div>
            <span className="font-extrabold text-xl tracking-tight hidden sm:block">MC HUB</span>
          </div>
          <div className="flex items-center gap-4">
            {!user ? (
              <button 
                onClick={login}
                className="mc-button mc-button-secondary py-2 text-sm"
              >
                <LogIn size={18} />
                Admin Login
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAdmin(!showAdmin)}
                  className={`p-2 rounded-lg transition-colors ${showAdmin ? 'bg-mc-green/20 text-mc-green' : 'bg-neutral-800 text-neutral-400'}`}
                  title="Simulation Panel"
                >
                  <ShieldCheck size={20} />
                </button>
                <button 
                  onClick={logout}
                  className="mc-button mc-button-secondary py-2 text-sm border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
            <a 
              href={DISCORD_URL} 
              target="_blank" 
              rel="noreferrer"
              className="mc-button mc-button-primary py-2 text-sm hidden md:flex"
            >
              <MessageCircle size={18} />
              Discord
            </a>
          </div>
        </div>
      </nav>

      {/* Simulation/Admin Panel */}
      <AnimatePresence>
        {showAdmin && user && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 bg-mc-green/5 border-b border-mc-green/20 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap gap-6 items-center">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-mc-green uppercase tracking-wider">Live Simulation</span>
                <p className="text-neutral-400 text-xs text-wrap max-w-xs">Simuliere echte Spielerdaten für dein Dashboard. Diese Daten werden in Firestore gespeichert.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => addRandomPlayer('pvp')} className="mc-button bg-red-500/20 text-red-400 text-xs py-2 h-10">
                  <UserPlus size={14} /> PVP Spieler +1
                </button>
                <button onClick={() => addRandomPlayer('survival')} className="mc-button bg-mc-green/20 text-mc-green text-xs py-2 h-10">
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-mc-green rounded-full border border-green-500/20 text-sm font-medium mb-6">
              <Zap size={14} />
              <span>Community Dashboard V2.1 - Echte Daten</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
              Dein Realm. <br />
              <span className="text-mc-green">Deine Regeln.</span>
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
                {totalOnline > 0 && <span className="w-2 h-2 rounded-full bg-mc-green animate-pulse" />}
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
                <span className={`text-2xl font-bold uppercase ${pvpStatus.online || survivalStatus.online ? 'text-mc-green' : 'text-red-500'}`}>
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

        {/* Realm Codes Section */}
        <section id="codes" className="mb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Realm Zugangscodes</h2>
              <p className="text-neutral-400">Direkter Zugang für geprüfte Community-Mitglieder.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                          <div className="w-2 h-2 rounded-full bg-mc-green shadow-sm shadow-green-500/50" />
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
              <div className="absolute inset-0 bg-gradient-to-br from-mc-green/10 to-transparent pointer-events-none" />
              <div className="mc-card h-full flex flex-col justify-between border-mc-green/20">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="p-3 bg-mc-green/20 text-mc-green rounded-xl">
                      <Trees size={32} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-mc-green uppercase tracking-widest mb-1">Live Status</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-mc-green/10 text-mc-green px-3 py-1 rounded-full border border-mc-green/20">
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
                          <div className="w-2 h-2 rounded-full bg-mc-green shadow-sm shadow-green-500/50" />
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
                <div className="w-1 bg-mc-green h-auto rounded-full" />
                <div>
                  <h4 className="font-bold mb-1">Sicherheit</h4>
                  <p className="text-neutral-400 text-sm">Griefing wird nicht toleriert. Alle Aktionen werden geloggt. Bei Verstößen erfolgt ein sofortiger Ausschluss aus allen Realms.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mc-card border-purple-500/10 bg-purple-500/[0.02]">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageCircle className="text-purple-500" size={20} />
              Support & Community
            </h3>
            <p className="text-neutral-400 text-sm mb-6 text-wrap">
              Probleme beim Beitreten? Unser Support-Team im Discord hilft dir gerne weiter. Dort erfährst du auch als Erster von neuen Projekten.
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-mc-green text-black px-6 py-3 rounded-xl font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 size={20} />
            Erfolgreich kopiert!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
