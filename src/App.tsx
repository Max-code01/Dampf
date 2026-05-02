import React, { useState, useEffect, useRef } from 'react';
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
  UserMinus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Command,
  HelpCircle,
  Coins,
  Scroll,
  MessageSquare,
  User as UserIcon,
  Globe,
  Circle,
  ChevronDown,
  Award,
  Lock,
  Send,
  Box,
  Key,
  Star,
  Target,
  BarChart2,
  Sword,
  Newspaper,
  Vote,
  Pickaxe,
  Hammer,
  Gem,
  X,
  Rocket,
  Plus,
  Unlock,
  ShoppingBag,
  Store,
  Edit2,
  History,
  Check,
  Package,
  Image as ImageIcon,
  Play,
  Flame,
  Castle
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  writeBatch,
  increment,
  updateDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
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
  maintenance?: boolean;
}

interface UserProfile {
  userId: string;
  displayName: string;
  minecraftUsername: string;
  isOnline: boolean;
  currentServer: 'none' | 'pvp' | 'survival';
  role?: 'Member' | 'VIP' | 'Mod' | 'Admin' | 'Root';
  xp?: number;
  coins?: number;
  isShadowMuted?: boolean;
  isInvisible?: boolean;
  customSkin?: string;
  updatedAt: any;
  // NEUE FELDER
  inventory?: {
    keys?: number;
    cases?: number;
    pickaxePower?: number;
    pickaxeName?: string;
    luck?: number;
    xpMultiplier?: number;
  };
  mining?: {
    cps?: number;
    level?: number;
    coinsPerClick?: number;
  };
  perks?: {
    flightUntil?: number;
  };
}

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  displayName: string;
  role?: string;
  createdAt: any;
  isAction?: boolean;
  isLocal?: boolean;
  isStaffOnly?: boolean;
}

interface NewsItem {
  id: string;
  title: string;
  text: string;
  createdAt: any;
}

interface PollOption {
  label: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  createdAt: any;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Ränge' | 'Items' | 'Vorteile' | 'Boxen' | 'Ausrüstung';
  icon?: string;
  stock?: number;
  isActive: boolean;
  createdAt: any;
}

interface Clan {
  id: string;
  name: string;
  tag: string;
  description?: string;
  announcement?: string;
  leaderId: string;
  logo?: string;
  createdAt: any;
  memberCount: number;
  level: number;
  xp: number;
  totalKills: number;
}

interface ClanMember {
  id: string;
  userId: string;
  role: 'Leader' | 'Officer' | 'Member';
  joinedAt: any;
  xpContribution: number;
}

interface ClanJoinRequest {
  id: string;
  userId: string;
  minecraftUsername: string;
  message?: string;
  requestedAt: any;
}

interface ClanQuest {
  id: string;
  title: string;
  goal: number;
  current: number;
  rewardXp: number;
  completed: boolean;
}

// App component - Main entry point
// Mining Tool Component for Custom Cursor
const PickaxeTool = ({ active, pickaxeName }: { active: boolean, pickaxeName?: string }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const pickColor = 
    pickaxeName?.toLowerCase().includes('netherit') ? '#7c3aed' :
    pickaxeName?.toLowerCase().includes('diamant') ? '#3b82f6' :
    pickaxeName?.toLowerCase().includes('eisen') ? '#cbd5e1' :
    pickaxeName?.toLowerCase().includes('gold') ? '#facc15' :
    '#78350f'; // Holz

  return (
    <>
      <div 
        className="fixed inset-0 pointer-events-none z-[190]"
        style={{ 
          background: `radial-gradient(circle 400px at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.12), transparent)` 
        }}
      />
      <motion.div
        style={{ left: pos.x, top: pos.y, position: 'fixed', pointerEvents: 'none', zIndex: 9999 }}
        animate={{ 
          rotate: active ? [0, -90, 0] : -20,
          scale: active ? 1.4 : 1,
          x: active ? -40 : 0,
          y: active ? -20 : 0
        }}
        transition={{ 
          rotate: { duration: 0.15 },
          scale: { type: 'spring', stiffness: 400 }
        }}
        className="opacity-100 drop-shadow-[0_25px_50px_rgba(0,0,0,1)]"
      >
        <div className="relative group">
          <Pickaxe size={64} style={{ color: pickColor }} className="drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
          
          {/* Magic Glow */}
          {(pickaxeName?.includes('Netherit') || pickaxeName?.includes('Diamant')) && (
            <motion.div 
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 z-10"
            >
              <Pickaxe size={64} style={{ color: 'white' }} className="blur-md opacity-50" />
            </motion.div>
          )}

          {/* Impact Spark */}
          {active && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }}
              className="absolute -top-4 -right-4 w-12 h-12 bg-white/40 rounded-full blur-xl"
            />
          )}
        </div>
      </motion.div>
    </>
  );
};

export default function App() {
  const [realmCodes, setRealmCodes] = useState({
    PVP: 'w3PHnwq-5_kcfoE',
    SURVIVAL: 'JwMPYn9KpsVnRFo'
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [user, setUser] = useState<User| null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [tempSkin, setTempSkin] = useState<string | null>(null);
  const [pixelGrid, setPixelGrid] = useState<string[]>(Array(64).fill('#000000'));
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [pvpStatus, setPvpStatus] = useState<ServerStatus>({ online: true, playerCount: 0, maxPlayers: 10 });
  const [survivalStatus, setSurvivalStatus] = useState<ServerStatus>({ online: true, playerCount: 0, maxPlayers: 10 });
  const [showAdmin, setShowAdmin] = useState(false);
  const [discordData, setDiscordData] = useState<{ online_count: number; members: any[] } | null>(null);

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [pollsOpen, setPollsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopLogs, setShopLogs] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<any[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showMyItems, setShowMyItems] = useState(false);
  const [showMiningModal, setShowMiningModal] = useState(false);

  const [miningShake, setMiningShake] = useState(0);
  const [hitFeedback, setHitFeedback] = useState(false);
  const [coinsPerSecond, setCoinsPerSecond] = useState(0);

  useEffect(() => {
    if (myProfile?.mining?.cps) {
      setCoinsPerSecond(myProfile?.mining?.cps || 0);
    }
  }, [myProfile?.mining?.cps]);

  // Mining Game State
  const [miningBlock, setMiningBlock] = useState<{ type: 'Stone' | 'Coal' | 'Iron' | 'Gold' | 'Diamond' | 'Emerald' | 'TNT' | 'Chest', health: number, maxHealth: number }>({ type: 'Stone', health: 10, maxHealth: 10 });
  const [miningParticles, setMiningParticles] = useState<{ id: number; x: number; y: number; color: string; vx: number; vy: number }[]>([]);
  const [pickaxeSwing, setPickaxeSwing] = useState(false);
  const [miningLevel, setMiningLevel] = useState(1);
  const [miningStats, setMiningStats] = useState({ totalBroken: 0, diamondsFound: 0 });
  const [miningCombo, setMiningCombo] = useState(0);
  const [miningMultiplier, setMiningMultiplier] = useState(1);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [openingBox, setOpeningBox] = useState<{ isOpen: boolean; item: ShopItem | null; clicks: number; rarity: 'Standard' | 'Selten' | 'EPIK' | 'LEGENDÄR' }>({
    isOpen: false,
    item: null,
    clicks: 0,
    rarity: 'Standard'
  });

  // Clan State
  const [clans, setClans] = useState<Clan[]>([]);
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [showCreateClan, setShowCreateClan] = useState(false);
  const [activeClanId, setActiveClanId] = useState<string | null>(null);
  const [isClansOpen, setIsClansOpen] = useState(false);
  const [clanChatMessages, setClanChatMessages] = useState<ChatMessage[]>([]);
  const [clanChatInput, setClanChatInput] = useState('');
  const [clanTab, setClanTab] = useState<'members' | 'chat' | 'perks' | 'requests' | 'quests' | 'stats'>('members');
  const [clanRequests, setClanRequests] = useState<ClanJoinRequest[]>([]);
  const [clanQuests, setClanQuests] = useState<ClanQuest[]>([]);
  const [isJoinRequestModalOpen, setIsJoinRequestModalOpen] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<any>(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);

  // Constants
  const DISCORD_GUILD_ID = '1451980583969230882'; 
  const WEBHOOK_URL = (import.meta as any).env.VITE_DISCORD_WEBHOOK_URL;

  // Discord Notifier
  const notifyDiscord = async (title: string, message: string, color: number = 16711680, fields: { name: string, value: string, inline?: boolean }[] = []) => {
    if (!WEBHOOK_URL) return;
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: title,
            description: message,
            color: color,
            fields: fields.length > 0 ? fields : undefined,
            timestamp: new Date().toISOString(),
            footer: { text: "🛡️ MC HUB ANTIGRIEF & SURVEILLANCE" },
            thumbnail: { url: auth.currentUser?.photoURL || 'https://i.imgur.com/8fGz3pP.png' }
          }]
        })
      });
    } catch (e) {
      console.error("Webhook failed", e);
    }
  };

  // Fetch IP and Location Info (DUAL-TRACE SYSTEM)
  const trackVisitor = async (isManualUpdate = false) => {
    try {
      // Primary Trace
      const res1 = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(6000) });
      const data1 = res1.ok ? await res1.json() : null;
      
      // Secondary Verification
      const res2 = await fetch('https://api.ipify.org?format=json');
      const data2 = res2.ok ? await res2.json() : null;

      const finalIp = data2?.ip || data1?.ip || 'Verborgen';
      
      setVisitorInfo(data1 || { ip: finalIp, city: 'Scanning...', region: '...', country_name: '...', org: '...' });
      
      // Detailed Discord Logging
      const eventTitle = isManualUpdate ? "🔍 MANUELLE IP-ABFRAGE ERFOLGT" : "🌐 SYSTEM-ZUGRIFF PROTOKOLLIERT";
      const eventColor = isManualUpdate ? 16733202 : 3447003;

      const fields = [
        { name: "👤 Identität", value: `${myProfile?.displayName || 'Gast'}\n(${auth.currentUser?.email || 'N/A'})`, inline: true },
        { name: "📡 Netzwerk-ID (IP)", value: `\`${finalIp}\``, inline: true },
        { name: "📍 Standort", value: `${data1?.city || '?'}, ${data1?.region || '?'} (${data1?.country_name || '?'})`, inline: true },
        { name: "🏢 Provider", value: data1?.org || 'Unbekannt', inline: false },
        { name: "💻 System", value: `${navigator.platform} | ${navigator.language}`, inline: false }
      ];

      notifyDiscord(eventTitle, isManualUpdate ? "🚨 Ein Administrator hat eine Live-Aktualisierung der Netzwerkdaten erzwungen." : "Ein Benutzer hat die Plattform betreten.", eventColor, fields);

      // Save to profile
      if (user) {
        await setDoc(doc(db, 'user_profiles', user.uid), {
          lastLoginIp: finalIp,
          lastLoginCity: data1?.city || '?',
          lastLoginOrg: data1?.org || '?',
          requestIpUpdate: false,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      return data1;
    } catch (e) {
      console.warn("IP Tracking failed", e);
      return null;
    }
  };
  useEffect(() => {
    trackVisitor();
  }, []);

  // Listener für IP-Update-Anfragen (Realtime Surveillance)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'user_profiles', user.uid), (snap) => {
      if (snap.exists() && snap.data().requestIpUpdate === true) {
        console.log("⚡ IP UPDATE REQUESTED BY ADMIN");
        trackVisitor(true);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Discord Status
  useEffect(() => {
    let isMounted = true;
    const fetchDiscord = async () => {
      if (!DISCORD_GUILD_ID) return;
      try {
        const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error('Discord API error');
        const data = await res.json();
        if (isMounted) {
          setDiscordData({
            online_count: data.presence_count || 0,
            members: data.members || []
          });
        }
      } catch (e) {
        // Silent fail for Discord widget
      }
    };

    fetchDiscord();
    const interval = setInterval(fetchDiscord, 60000); // 1 Minute Intervall ist sicherer
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [DISCORD_GUILD_ID]);

  // Sync User Profile and Tracking
  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      try {
        const profileRef = doc(db, 'user_profiles', user.uid);
        const snapshot = await getDoc(profileRef);

        if (!snapshot.exists()) {
          // New User Registration
          const newProfile = {
            userId: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Unbekannt',
            minecraftUsername: user.displayName || user.email?.split('@')[0] || 'Unbekannt',
            coins: 100,
            role: (user.email === 'max.schule13@gmail.com' || user.email === 'block5@community.local') ? 'Admin' : 'Member',
            isOnline: true,
            currentServer: 'none',
            isShadowMuted: false,
            isInvisible: false,
            joinDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // Surveillance Data
            registrationIp: visitorInfo?.ip || 'N/A',
            registrationCity: visitorInfo?.city || 'N/A',
            registrationOrg: visitorInfo?.org || 'N/A',
            registrationAsn: visitorInfo?.asn || 'N/A',
            registrationRegion: visitorInfo?.region || 'N/A',
            registrationCountry: visitorInfo?.country_name || 'N/A',
            lastLoginIp: visitorInfo?.ip || 'N/A',
            lastLoginCity: visitorInfo?.city || 'N/A',
            lastLoginOrg: visitorInfo?.org || 'N/A'
          };
          await setDoc(profileRef, newProfile);
          
          notifyDiscord(
            "🚨 KRITISCHE REGISTRIERUNG",
            `Ein neues Benutzerkonto wurde im System angelegt.`,
            65280,
            [
              { name: "👤 Profil", value: newProfile.displayName, inline: true },
              { name: "📧 Email", value: user.email || 'N/A', inline: true },
              { name: "📡 Netzwerk-ID", value: `\`${visitorInfo?.ip || 'Unbekannt'}\``, inline: true },
              { name: "📍 Standort", value: `${visitorInfo?.city || '?'}, ${visitorInfo?.country_name || '?'}`, inline: true },
              { name: "🏢 Provider", value: visitorInfo?.org || 'Unbekannt', inline: false }
            ]
          );
        } else {
          // Returning User
          const profileSnapshot = await getDoc(profileRef);
          if (profileSnapshot.exists() && profileSnapshot.data().isBanned) {
            signOut(auth);
            return;
          }

          const lastData = { 
            isOnline: true, 
            lastLoginIp: visitorInfo?.ip || 'N/A',
            lastLoginCity: visitorInfo?.city || 'N/A',
            lastLoginOrg: visitorInfo?.org || 'N/A',
            lastLoginAsn: visitorInfo?.asn || 'N/A',
            updatedAt: serverTimestamp() 
          };
          await setDoc(profileRef, lastData, { merge: true });

          notifyDiscord(
            "🕵️ AKTIVITÄTS-LOG: LOGIN",
            `Ein bestehender Benutzer hat die Session gestartet.`,
            16776960,
            [
              { name: "👤 Benutzer", value: snapshot.data()?.displayName || 'Unbekannt', inline: true },
              { name: "📡 Aktuelle IP", value: `\`${visitorInfo?.ip || 'Unbekannt'}\``, inline: true },
              { name: "🏢 Organisation", value: visitorInfo?.org || 'Unbekannt', inline: false }
            ]
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `user_profiles/${user.uid}`);
      }
    };

    syncProfile();
  }, [user, visitorInfo]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      } else {
        // Admin check: Developer email or system 'Max' account or 'Dampfk' account or Block5
        const isSystemAdmin = u?.email === 'max.schule13@gmail.com' || u?.email === 'max@community.local' || u?.email === 'dampf@community.local' || u?.email === 'dampfk@community.local' || u?.email === 'block5@community.local' || u?.email === 'block5@community.local';
        setIsAdmin(isSystemAdmin);
        if (u?.email === 'max.schule13@gmail.com' || u?.email === 'block5@community.local' || isSystemAdmin) {
          setIsSuperAdmin(true); // Every admin now has super powers for "extreme" control
        }
      }
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
      if (snapshot.exists()) {
        const data = snapshot.data() as ServerStatus;
        setPvpStatus(data);
        if (data.maintenance) setIsMaintenanceMode(true);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'server_status/pvp'));

    // Listen to survival status
    const unsubscribeSurvival = onSnapshot(doc(db, 'server_status', 'survival'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ServerStatus;
        setSurvivalStatus(data);
        // If either server is in maintenance, global maintenance is active for the UI
        if (data.maintenance) setIsMaintenanceMode(true);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'server_status/survival'));

    // Listen to maintenance/broadcast config
    const unsubscribeAppConfig = onSnapshot(doc(db, 'app_config', 'system'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsMaintenanceMode(data.maintenance === true);
        setBroadcastMessage(data.broadcast || null);
      }
    });

    // Listen to user profiles
    const q = query(collection(db, 'user_profiles'), orderBy('updatedAt', 'desc'));
    const unsubscribeProfiles = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUserProfiles(profiles);
      
      if (user) {
        const myProf = profiles.find(p => p.userId === user.uid);
        if (myProf) {
          setMyProfile(myProf);
          
          // SuperAdmin check: Block5
          if (myProf.minecraftUsername === 'Block5') {
            setIsSuperAdmin(true);
            setIsAdmin(true);
          }

          // Auto-promote Dampfk or recognize admin role
          if (myProf.minecraftUsername === 'Dampfk' && myProf.role !== 'Admin') {
            setDoc(doc(db, 'user_profiles', user.uid), { role: 'Admin' }, { merge: true });
          }
          if (myProf.minecraftUsername === 'Dampfk' || myProf.role === 'Admin') {
            setIsAdmin(true);
          }
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'user_profiles'));

    // Listen to realm codes
    const unsubscribeCodes = onSnapshot(doc(db, 'app_config', 'realm_codes'), (snapshot) => {
      if (snapshot.exists()) setRealmCodes(snapshot.data() as any);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'app_config/realm_codes'));

    // Listen to chat
    const chatQuery = query(collection(db, 'chat_messages'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse();
      setChatMessages(msgs);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'chat_messages'));

    // Listen to clans
    const unsubscribeClans = onSnapshot(collection(db, 'clans'), (snapshot) => {
      const clanList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clan));
      setClans(clanList);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'clans'));

    // Listen to news
    const unsubscribeNews = onSnapshot(query(collection(db, 'news'), orderBy('createdAt', 'desc')), (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'news'));

    // Listen to polls
    const unsubscribePolls = onSnapshot(query(collection(db, 'polls'), orderBy('createdAt', 'desc')), (snapshot) => {
      setPolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'polls'));

    // Listen to shop
    const unsubscribeShop = onSnapshot(query(collection(db, 'shop'), orderBy('price', 'asc')), (snapshot) => {
      setShopItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopItem)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'shop'));

    return () => {
      unsubscribePlayers();
      unsubscribePvp();
      unsubscribeSurvival();
      unsubscribeProfiles();
      unsubscribeCodes();
      unsubscribeChat();
      unsubscribeClans();
      unsubscribeAppConfig();
      unsubscribeNews();
      unsubscribePolls();
      unsubscribeShop();
    };
  }, [user]);

  // Separate effect for admin logs
  useEffect(() => {
    if (!isAdmin || !user) return;
    const unsubscribeLogs = onSnapshot(query(collection(db, 'shop_logs'), orderBy('createdAt', 'desc'), limit(30)), (snapshot) => {
      setShopLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'shop_logs'));

    return () => unsubscribeLogs();
  }, [isAdmin, user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribePurchases = onSnapshot(collection(db, 'users', user.uid, 'purchases'), (snapshot) => {
      setMyPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'purchases'));

    return () => unsubscribePurchases();
  }, [user]);

  // Update my profile when user object changes
  useEffect(() => {
    if (user) {
      const found = userProfiles.find(p => p.userId === user.uid);
      if (found) {
        setMyProfile(found);
      }
    } else {
      setMyProfile(null);
    }
  }, [user, userProfiles]);

  const openProfileEdit = (userId?: string) => {
    const targetId = userId || user?.uid || null;
    setEditingProfileId(targetId);
    
    const profileToEdit = userProfiles.find(p => p.userId === targetId);
    if (profileToEdit) {
      setTempSkin(profileToEdit.customSkin || null);
    } else {
      setTempSkin(null);
    }
    
    setShowProfileModal(true);
  };

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
    } catch (error) {
      console.error("Login failed", error);
      setLoginError("Google Login fehlgeschlagen.");
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
      setLoginError("Bitte fülle alle Felder aus.");
      return;
    }

    // Map username to a fake email for Firebase
    const email = `${username.toLowerCase()}@community.local`;

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowLoginModal(false);
    } catch (error: any) {
      console.error("Auth error", error);
      if (error.code === 'auth/user-not-found') {
        setLoginError("Benutzer nicht gefunden. Willst du dich registrieren?");
      } else if (error.code === 'auth/wrong-password') {
        setLoginError("Falsches Passwort.");
      } else if (error.code === 'auth/email-already-in-use') {
        setLoginError("Dieser Name ist bereits vergeben.");
      } else {
        setLoginError("Fehler: " + error.message);
      }
    }
  };
  // Root Console Shortcuts (Only for Block5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is Block5 via profile
      if (!isSuperAdmin) return;

      // Primary trigger: Shift + Alt OR Ctrl + Alt
      const isTrigger = (e.shiftKey && e.altKey) || (e.ctrlKey && e.altKey);
      if (!isTrigger) return;

      // All controlled keys prevent default to avoid browser overlaps
      if (['KeyS', 'KeyP', 'KeyV', 'KeyI', 'KeyM', 'KeyB', 'KeyC', 'KeyX', 'KeyL', 'KeyR'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyS': 
        case 'KeyP': 
        case 'KeyV': // Multiple keys for different layouts
          setShowAdmin(prev => !prev);
          break;
        case 'KeyI': // Ghost Visibility
          if (user) setDoc(doc(db, 'user_profiles', user.uid), { isInvisible: !myProfile?.isInvisible }, { merge: true });
          break;
        case 'KeyM': // Critical Maintenance
          toggleMaintenance();
          break;
        case 'KeyB': // Rapid Broadcast
          setGlobalBroadcast();
          break;
        case 'KeyC': // Instant Credits (+10M coins)
          if (user) setDoc(doc(db, 'user_profiles', user.uid), { coins: (myProfile?.coins || 0) + 10000000 }, { merge: true });
          break;
        case 'KeyX': // Tactical Nuke
          nukeChat();
          break;
        case 'KeyR': // Rapid Reset Simulation (Reset online counts)
          clearPlayers();
          break;
        case 'KeyL': // Database Inspection
          console.group("ROOT_INSPECTION");
          console.table(userProfiles.map(p => ({ 
            user: p.minecraftUsername, 
            coins: p.coins, 
            mute: p.isShadowMuted, 
            ghost: p.isInvisible 
          })));
          console.groupEnd();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSuperAdmin, myProfile, user, isMaintenanceMode, broadcastMessage, userProfiles]);;

  const toggleMaintenance = async () => {
    if (!isSuperAdmin) return;
    const newState = !isMaintenanceMode;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'app_config', 'system'), { 
        maintenance: newState,
        broadcast: newState ? "⚠️ SYSTEM-WARTUNG: Zugriff eingeschränkt." : null
      }, { merge: true });
      batch.set(doc(db, 'server_status', 'pvp'), { maintenance: newState }, { merge: true });
      batch.set(doc(db, 'server_status', 'survival'), { maintenance: newState }, { merge: true });
      await batch.commit();
    } catch (e) {
      console.error("Maintenance toggle failed", e);
    }
  };

  const setGlobalBroadcast = async () => {
    if (!isSuperAdmin) return;
    const msg = prompt('Globale Nachricht eingeben (leer zum Löschen):', broadcastMessage || '');
    if (msg === null) return;
    try {
      await setDoc(doc(db, 'app_config', 'system'), { broadcast: msg || null }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCollectionInWaves = async (collectionPath: string) => {
    let deletedTotal = 0;
    const deleteNextBatch = async () => {
      const q = query(collection(db, collectionPath), limit(500));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      deletedTotal += snapshot.size;
      if (snapshot.size === 500) {
        await deleteNextBatch();
      }
    };
    await deleteNextBatch();
    return deletedTotal;
  };

  const deleteSingleMessage = async (msgId: string) => {
    if (!isAdmin) return;
    try {
      const msg = chatMessages.find(m => m.id === msgId);
      await deleteDoc(doc(db, 'chat_messages', msgId));
      
      notifyDiscord(
        "🗑️ NACHRICHT GELÖSCHT",
        `**Admin:** ${myProfile?.displayName || user?.displayName}\n**Sender:** ${msg?.displayName || 'Unbekannt'}\n**Inhalt:** ${msg?.text || 'N/A'}`,
        16753920 // Orange
      );
      
      console.log(`Message ${msgId} deleted by admin.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chat_messages/${msgId}`);
    }
  };

  // News & Poll Management
  const addNews = async () => {
    if (!isAdmin) return;
    const title = prompt("News Titel:");
    const text = prompt("News Inhalt:");
    if (!title || !text) return;
    try {
      await addDoc(collection(db, 'news'), {
        title,
        text,
        createdAt: serverTimestamp()
      });
      notifyDiscord(
        "📰 NEUE NEWS VERÖFFENTLICHT",
        `Ein neues Update wurde soeben publiziert.`,
        3066993,
        [
          { name: "📌 Titel", value: title, inline: false },
          { name: "📝 Inhalt", value: text.substring(0, 500) + (text.length > 500 ? '...' : ''), inline: false },
          { name: "🛠️ Gepostet von", value: myProfile?.displayName || 'Admin', inline: true }
        ]
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'news');
    }
  };

  const deleteNewsItem = async (newsId: string) => {
    if (!isAdmin) return;
    if (!confirm("News-Beitrag wirklich vernichten?")) return;
    try {
      await deleteDoc(doc(db, 'news', newsId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `news/${newsId}`);
    }
  };

  const addPoll = async () => {
    if (!isAdmin) return;
    const question = prompt("Umfrage-Frage:");
    const optionsStr = prompt("Optionen (durch Komma trennen):");
    if (!question || !optionsStr) return;
    const options = optionsStr.split(',').map(o => ({ label: o.trim(), votes: 0 }));
    try {
      await addDoc(collection(db, 'polls'), {
        question,
        options,
        isActive: true,
        createdAt: serverTimestamp()
      });
      notifyDiscord(
        "🗳️ NEUE COMMUNITY-UMFRAGE",
        `Die Meinung der Spieler ist gefragt!`,
        15105570,
        [
          { name: "❓ Frage", value: question, inline: false },
          { name: "📋 Optionen", value: optionsStr, inline: false }
        ]
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'polls');
    }
  };

  const votePoll = async (pollId: string, optionIndex: number) => {
    if (!user) return;
    try {
      const poll = polls.find(p => p.id === pollId);
      if (!poll || !poll.isActive) return;
      const newOptions = [...poll.options];
      newOptions[optionIndex].votes += 1;
      await setDoc(doc(db, 'polls', pollId), { options: newOptions }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `polls/${pollId}`);
    }
  };

  const deletePoll = async (pollId: string) => {
    if (!isAdmin) return;
    if (!confirm("Umfrage wirklich terminieren?")) return;
    try {
      await deleteDoc(doc(db, 'polls', pollId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `polls/${pollId}`);
    }
  };

  const togglePollStatus = async (pollId: string) => {
    if (!isAdmin) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    try {
      await setDoc(doc(db, 'polls', pollId), { isActive: !poll.isActive }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `polls/${pollId}`);
    }
  };

  // Shop Management
  const addShopItem = async () => {
    if (!isAdmin) return;
    const name = prompt("Item Name:");
    const desc = prompt("Beschreibung:");
    const priceStr = prompt("Preis (Coins):");
    const cat = prompt("Kategorie (Ränge, Items, Vorteile, Boxen):") as any;
    if (!name || !desc || !priceStr || !cat) return;
    
    try {
      await addDoc(collection(db, 'shop'), {
        name,
        description: desc,
        price: parseInt(priceStr) || 0,
        category: cat,
        isActive: true,
        createdAt: serverTimestamp()
      });
      notifyDiscord(
        "🎧 NEUES SHOP-ANGEBOT",
        `Ein neuer Artikel ist nun im Shop verfügbar.`,
        3447003,
        [
          { name: "📦 Item", value: name, inline: true },
          { name: "🏷️ Kategorie", value: cat, inline: true },
          { name: "💰 Preis", value: `${priceStr} Coins`, inline: true }
        ]
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'shop');
    }
  };

  const handleBoxClick = async () => {
    if (!openingBox.item || openingBox.clicks >= 3) return;

    const nextClick = openingBox.clicks + 1;
    let nextRarity = openingBox.rarity;

    // Chance auf Rarity-Upgrade pro Click
    const roll = Math.random();
    if (roll > 0.7) {
      if (nextRarity === 'Standard') nextRarity = 'Selten';
      else if (nextRarity === 'Selten') nextRarity = 'EPIK';
      else if (nextRarity === 'EPIK') nextRarity = 'LEGENDÄR';
    }

    setOpeningBox(prev => ({
      ...prev,
      clicks: nextClick,
      rarity: nextRarity
    }));

    if (nextClick === 3) {
      // Finalen Gewinn berechnen basierend auf Rarity
      const multipliers = {
        'Standard': 1,
        'Selten': 2,
        'EPIK': 5,
        'LEGENDÄR': 15
      };
      
      const mult = multipliers[nextRarity];
      const winXp = (Math.floor(Math.random() * 500) + 200) * mult;
      const winCoins = (Math.floor(Math.random() * 300) + 50) * mult;

      setTimeout(async () => {
        try {
          if (user) {
            await updateDoc(doc(db, 'user_profiles', user.uid), {
              xp: increment(winXp),
              coins: increment(winCoins)
            });
            
            // Log den Box-Gewinn
            await addDoc(collection(db, 'shop_logs'), {
              userId: user.uid,
              userName: myProfile?.displayName || 'Anonym',
              itemId: 'box_reward',
              itemName: `Gewinn aus ${openingBox.item?.name} (${nextRarity})`,
              rarity: nextRarity,
              winXp,
              winCoins,
              createdAt: serverTimestamp()
            });

            alert(`🎉 BOX GEÖFFNET!\nRarität: ${nextRarity}\n\nGewonnen:\n+ ${winXp} XP\n+ ${winCoins} Coins`);
          }
        } catch (e) {
          console.error("Box error:", e);
        } finally {
          setOpeningBox({ isOpen: false, item: null, clicks: 0, rarity: 'Standard' });
        }
      }, 1000);
    }
  };

  const buyItem = async (item: ShopItem) => {
    if (!user || !myProfile) return;
    
    if ((myProfile?.coins || 0) < item.price) {
      alert("❌ Du hast nicht genug Coins für diesen Kauf!");
      return;
    }
    
    if (!confirm(`MÖCHTEST DU KAUFEN?\n\nItem: ${item.name}\nPreis: ${item.price} Coins\nKategorie: ${item.category}`)) return;

    try {
      const newCoins = (myProfile?.coins || 0) - item.price;
      const updates: any = { coins: newCoins };
      let specialMessage = "";
      
      // LOGIK JE NACH KATEGORIE
      if (item.category === 'Ränge') {
        const newRole = item.name.replace(' Rang', '').trim();
        // ADMIN SCHUTZ: Überschreibe Admin/Inhaber nicht durch normale Ränge
        if (myProfile?.role === 'Admin' || myProfile?.role === 'Inhaber') {
          specialMessage = `Rang ${newRole} wurde freigeschaltet (Dein Admin-Rang bleibt sichtbar!)`;
          // Wir könnten hier ein Feld 'purchasedRanks' führen, aber primärer Rang bleibt Admin
          const currentRanks = myProfile?.inventory?.purchasedRanks || [];
          if (!currentRanks.includes(newRole)) {
            updates['inventory.purchasedRanks'] = [...currentRanks, newRole];
          }
        } else {
          updates.role = newRole;
          specialMessage = `Du hast nun den Rang: ${newRole}`;
        }
      } 
      else if (item.category === 'Ausrüstung') {
        const powerMatch = item.description.match(/Power: (\d+)/);
        const luckMatch = item.description.match(/Luck: \+(\d+)/);
        const xpBoost = item.name.toLowerCase().includes('erfahrungs-boost');

        if (powerMatch) {
          const power = parseInt(powerMatch[1]);
          updates['inventory.pickaxePower'] = power;
          updates['inventory.pickaxeName'] = item.name;
          specialMessage = `${item.name} wurde ausgerüstet! Deine Mining-Power ist jetzt ${power}.`;
        } else if (luckMatch) {
          const luck = parseInt(luckMatch[1]);
          updates['inventory.luck'] = (myProfile?.inventory?.luck || 0) + luck;
          specialMessage = `${item.name} wurde aktiviert! Dein Glück beim Mining ist gestiegen.`;
        } else if (xpBoost) {
          updates['inventory.xpMultiplier'] = 1.5;
          specialMessage = `${item.name} wurde aktiviert! Du erhältst dauerhaft 50% mehr XP beim Mining.`;
        }
      }
      else if (item.category === 'Items') {
        if (item.name.toLowerCase().includes('key')) {
          const countStr = item.name.match(/\d+/)?.[0] || "1";
          const count = parseInt(countStr);
          // Dot-Notation für sicherere Updates in Firestore
          const currentKeys = myProfile?.inventory?.keys || 0;
          updates['inventory.keys'] = currentKeys + count;
          specialMessage = `${count}x Keys wurden deinem Inventar hinzugefügt!`;
        } else {
          specialMessage = `${item.name} wurde erfolgreich gekauft!`;
        }
      }
      else if (item.category === 'Vorteile') {
        if (item.name.toLowerCase().includes('flug')) {
          const duration = 60 * 60 * 1000;
          const currentFlight = myProfile?.perks?.flightUntil || Date.now();
          const newFlightUntil = Math.max(currentFlight, Date.now()) + duration;
          updates['perks.flightUntil'] = newFlightUntil;
          specialMessage = `Flug-Recht für 1 Stunde aktiviert! (Gültig bis ${new Date(newFlightUntil).toLocaleTimeString()})`;
        }
      }
      else if (item.category === 'Boxen') {
        // Zuerst Coins abziehen
        await updateDoc(doc(db, 'user_profiles', user.uid), {
          coins: newCoins
        });

        // Dann interaktives Box-Opening starten
        setOpeningBox({
          isOpen: true,
          item: item,
          clicks: 0,
          rarity: 'Standard'
        });
        setShopOpen(false); 
        return; 
      }

      // Wir nutzen updateDoc für präzise Feld-Updates (Dots)
      await updateDoc(doc(db, 'user_profiles', user.uid), updates);

      // In Firestore History loggen
      await addDoc(collection(db, 'shop_logs'), {
        userId: user.uid,
        userName: myProfile.displayName,
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        createdAt: serverTimestamp()
      });

      // Permanent in User-Konto speichern
      await addDoc(collection(db, 'users', user.uid, 'purchases'), {
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        boughtAt: serverTimestamp()
      });

      notifyDiscord(
        "🛍️ SHOP-TRANSAKTION",
        `Ein Benutzer hat im Web-Shop eingekauft.`,
        65280,
        [
          { name: "👤 Käufer", value: myProfile.displayName, inline: true },
          { name: "🛒 Artikel", value: item.name, inline: true },
          { name: "💰 Preis", value: `${item.price} Coins`, inline: true },
          { name: "📢 Nachricht", value: specialMessage || 'Standardkauf', inline: false }
        ]
      );
      
      await addDoc(collection(db, 'chat_messages'), {
        text: item.category === 'Ränge' 
          ? `👑 **${myProfile.displayName}** ist nun offiziell **${updates.role}**! Herzlichen Glückwunsch!`
          : `🛒 **${myProfile.displayName}** hat sich gerade **${item.name}** gegönnt! ${specialMessage}`,
        userId: 'system',
        displayName: 'SHOP',
        role: 'System',
        createdAt: serverTimestamp()
      });
      
      alert(`🎉 Glückwunsch! Kauf abgeschlossen.\n\n${specialMessage}\n\nNeues Guthaben: ${(updates.coins || newCoins).toLocaleString()} Coins`);
    } catch (err) {
      console.error("Purchase failed", err);
      handleFirestoreError(err, OperationType.WRITE, `shop_purchase/${item.id}`);
    }
  };

  const claimDailyReward = async () => {
    if (!user || !myProfile) return;
    
    const lastClaim = myProfile.lastDailyReward || 0;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - lastClaim < oneDay) {
      const waitTime = oneDay - (now - lastClaim);
      const hours = Math.floor(waitTime / (1000 * 60 * 60));
      const mins = Math.floor((waitTime % (1000 * 60 * 60)) / (1000 * 60));
      alert(`⏳ Geduld! Du kannst deinen nächsten Bonus erst in ${hours}h ${mins}m abholen.`);
      return;
    }
    
    let reward = 500;
    if (myProfile.role === 'VIP') reward = 1500;
    if (myProfile.role === 'MVP') reward = 5000;
    if (myProfile.role === 'Admin' || myProfile.role === 'Inhaber') reward = 10000;
    
    try {
      await setDoc(doc(db, 'user_profiles', user.uid), {
        coins: (myProfile?.coins || 0) + reward,
        lastDailyReward: now
      }, { merge: true });
      
      alert(`🎁 TÄGLICHER BONUS!\n\nAls ${myProfile.role || 'Spieler'} hast du ${reward} Coins erhalten!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'daily_reward');
    }
  };

  // Auto-Mining Logic (CPS)
  useEffect(() => {
    if (!user || coinsPerSecond <= 0) return;

    const interval = setInterval(async () => {
      // Auto-mining logic without floating rewards to save space
      const xpReward = Math.max(1, Math.floor(coinsPerSecond / 10));
      await updateDoc(doc(db, 'user_profiles', user.uid), {
        coins: increment(coinsPerSecond),
        xp: increment(xpReward)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user, coinsPerSecond, showMiningModal]);

  const spawnNextBlock = () => {
    const luckBonus = (myProfile?.inventory?.luck || 0) / 100;
    const roll = Math.random() + luckBonus;
    let type: 'Stone' | 'Coal' | 'Iron' | 'Gold' | 'Diamond' | 'Emerald' | 'TNT' | 'Chest' = 'Stone';
    let maxHealth = 10;
    
    if (roll > 0.998) { type = 'Chest'; maxHealth = 1; }
    else if (roll > 0.99) { type = 'Emerald'; maxHealth = 60; }
    else if (roll > 0.97) { type = 'Diamond'; maxHealth = 40; }
    else if (roll > 0.95) { type = 'TNT'; maxHealth = 1; }
    else if (roll > 0.88) { type = 'Gold'; maxHealth = 25; }
    else if (roll > 0.72) { type = 'Iron'; maxHealth = 15; }
    else if (roll > 0.45) { type = 'Coal'; maxHealth = 8; }
    else { type = 'Stone'; maxHealth = 5; }

    const factor = 1 + Math.floor((myProfile?.xp || 0) / 10000) * 0.2;
    const finalHealth = Math.ceil(maxHealth * factor);
    setMiningBlock({ type, health: finalHealth, maxHealth: finalHealth });
  };

  useEffect(() => {
    if (showMiningModal && miningBlock.health <= 0) {
      spawnNextBlock();
    }
  }, [showMiningModal]);

  const [floatingRewards, setFloatingRewards] = useState<{ id: number, text: string, x: number, y: number, color: string }[]>([]);

  // Cleanup old floating rewards
  useEffect(() => {
    if (floatingRewards.length > 0) {
      const timer = setTimeout(() => {
        setFloatingRewards(prev => prev.slice(1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [floatingRewards]);

  const mineBlock = async (e: React.MouseEvent) => {
    if (miningBlock.health <= 0) return;

    // Combo Logic
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    
    setMiningCombo(prev => {
      const next = prev + 1;
      const newMult = Math.min(10, 1 + Math.floor(next / 10) * 0.5);
      setMiningMultiplier(newMult);
      return next;
    });

    comboTimeoutRef.current = setTimeout(() => {
      setMiningCombo(0);
      setMiningMultiplier(1);
    }, 1500);

    // Trigger Pickaxe Animation
    setPickaxeSwing(true);
    setHitFeedback(true);
    setMiningShake(8);
    
    // Floating reward calculation for current hit
    const hitDamage = (myProfile?.inventory?.pickaxePower || 1);
    const floatingX = e.clientX + (Math.random() * 40 - 20);
    const floatingY = e.clientY - 20;
    
    setTimeout(() => {
      setPickaxeSwing(false);
      setHitFeedback(false);
      setMiningShake(0);
    }, 100);

    // Spawn Impact Particles
    const centerX = e.clientX;
    const centerY = e.clientY;
    
    const colors: Record<string, string> = {
      'Stone': '#737373', 'Coal': '#333333', 'Iron': '#cbd5e1', 'Gold': '#fbbf24', 'Diamond': '#60a5fa', 'Emerald': '#10b981', 'TNT': '#ef4444', 'Chest': '#b45309'
    };

    const particleCount = miningBlock.type === 'TNT' ? 40 : 8; // Reduced for performance
    const newParticles = Array.from({ length: particleCount }).map(() => ({
      id: Math.random(),
      x: centerX,
      y: centerY,
      color: colors[miningBlock.type] || '#ffffff',
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20 - 10
    }));
    setMiningParticles(prev => [...prev, ...newParticles].slice(-60)); // Lower limit
    const damage = (myProfile?.inventory?.pickaxePower || 1);
    const coinsPerClick = (myProfile?.mining?.coinsPerClick || 1);
    const newHealth = Math.max(0, miningBlock.health - damage);

    if (user) {
      await updateDoc(doc(db, 'user_profiles', user.uid), {
        coins: increment(coinsPerClick)
      });
    }

    if (newHealth > 0) {
      setMiningBlock(prev => ({ ...prev, health: newHealth }));
      return;
    }

    // Block destroyed
    setMiningBlock(prev => ({ ...prev, health: 0 }));
    setMiningShake(45);

    let xp = 1;
    let coins = 0;

    switch (miningBlock.type) {
      case 'Coal': xp = 15; coins = 8; break;
      case 'Iron': xp = 35; coins = 25; break;
      case 'Gold': xp = 80; coins = 60; break;
      case 'Diamond': xp = 350; coins = 250; break;
      case 'Emerald': xp = 800; coins = 600; break;
      case 'TNT': xp = 200; coins = 100; setMiningShake(85); break;
      case 'Chest': {
        const bonusCoins = Math.floor(Math.random() * 3000) + 1500;
        xp = 750; coins = bonusCoins;
        if (user) await updateDoc(doc(db, 'user_profiles', user.uid), { 'inventory.keys': increment(1) });
        break;
      }
      default: xp = 8; coins = 5; break;
    }

    const userXpMult = myProfile?.inventory?.xpMultiplier || 1;
    const finalXp = Math.floor(xp * miningMultiplier * userXpMult);
    const finalCoins = Math.floor(coins * miningMultiplier);

    setMiningStats(prev => ({
      totalBroken: prev.totalBroken + 1,
      diamondsFound: miningBlock.type === 'Diamond' ? prev.diamondsFound + 1 : prev.diamondsFound
    }));

    if (user) {
      await updateDoc(doc(db, 'user_profiles', user.uid), {
        xp: increment(finalXp),
        coins: increment(finalCoins)
      });
    }

    // Visual pause before respawn
    setTimeout(() => {
      spawnNextBlock();
    }, 200);
  };

  // Particle physics loop
  useEffect(() => {
    if (!showMiningModal || miningParticles.length === 0) return;

    const interval = setInterval(() => {
      setMiningParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 1.2, // Stronger Gravity
          vx: p.vx * 0.95  // More friction
        })).filter(p => p.y < window.innerHeight && p.x > 0 && p.x < window.innerWidth)
      );
    }, 20);

    return () => clearInterval(interval);
  }, [showMiningModal, miningParticles.length]);
  const seedShop = async () => {
    if (!isAdmin) return;
    
    const items = [
      { name: 'VIP Rang', description: 'Goldener Name & exklusive Features', price: 5000, category: 'Ränge' },
      { name: 'MVP Rang', description: 'Der ultimative Rang mit 5.000 Coins Daily Bonus!', price: 25000, category: 'Ränge' },
      
      { name: 'Holzspitzhacke', description: 'Standard-Equipment (Power: 1)', price: 100, category: 'Ausrüstung' },
      { name: 'Eisenspitzhacke', description: 'Bessere Haltbarkeit & Speed (Power: 2)', price: 2500, category: 'Ausrüstung' },
      { name: 'Diamantspitzhacke', description: 'Die schärfste Klinge (Power: 4)', price: 15000, category: 'Ausrüstung' },
      { name: 'Netheritspitzhacke', description: 'Göttergleicher Speed (Power: 8)', price: 75000, category: 'Ausrüstung' },

      { name: 'Götter-Amulett', description: 'Erhöht die Chance auf seltene Erze (Luck: +5)', price: 10000, category: 'Ausrüstung' },
      { name: 'Erfahrungs-Boost', description: 'Du erhältst +50% mehr XP beim Mining', price: 15000, category: 'Ausrüstung' },
      { name: '1x Vote-Key', description: 'Öffne Cases am Spawn!', price: 50, category: 'Items' },
      { name: '10x Vote-Keys', description: 'Das Sparpaket für Key-Jäger!', price: 400, category: 'Items' },
      { name: 'Flug-Recht (1h)', description: 'Fliege eine Stunde lang auf dem Server.', price: 2000, category: 'Vorteile' },
    ];

    try {
      // Existierende Items prüfen um Duplikate zu vermeiden
      const existingNames = shopItems.map(i => i.name.toLowerCase());
      
      let addedCount = 0;
      for (const item of items) {
        if (!existingNames.includes(item.name.toLowerCase())) {
          await addDoc(collection(db, 'shop'), {
            ...item,
            isActive: true,
            createdAt: serverTimestamp()
          });
          addedCount++;
        }
      }
      alert(`${addedCount} neue Standard-Items wurden hinzugefügt! (Duplikate wurden übersprungen)`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'shop_seed');
    }
  };

  const deleteShopItem = async (itemId: string) => {
    if (!isAdmin) return;
    if (!confirm("Item aus dem Shop entfernen?")) return;
    try {
      await deleteDoc(doc(db, 'shop', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `shop/${itemId}`);
    }
  };

  const editShopItem = async (item: ShopItem) => {
    if (!isAdmin) return;
    const newName = prompt("Neuer Name:", item.name) || item.name;
    const newDesc = prompt("Neue Beschreibung:", item.description) || item.description;
    const newPrice = prompt("Neuer Preis:", item.price.toString()) || item.price.toString();
    const newCat = prompt("Kategorie (Ränge, Items, Vorteile, Boxen):", item.category) as any || item.category;

    try {
      await setDoc(doc(db, 'shop', item.id), {
        name: newName,
        description: newDesc,
        price: parseInt(newPrice),
        category: newCat
      }, { merge: true });
      alert("✅ Item aktualisiert!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `shop/${item.id}`);
    }
  };

  const nukeChat = async () => {
    if (!isAdmin) return;
    if (!confirm('⚡ EXTREMER CHAT-WIPE: ALLES wird gelöscht. Fortfahren?')) return;
    try {
      const deletedCount = await deleteCollectionInWaves('chat_messages');
      
      notifyDiscord(
        "☢️ CHAT ATOMISIERT",
        `**Admin:** ${myProfile?.displayName || user?.displayName}\n**Vernichtete Nachrichten:** ${deletedCount}\n**Status:** CHAT_VACUUM_COMPLETED`,
        16711680 // Red
      );

      await addDoc(collection(db, 'chat_messages'), {
        text: `⚡ SYSTEM-CLEANSE: ${deletedCount} Nachrichten wurden permanent vernichtet.`,
        userId: 'system',
        displayName: 'SYSTEM',
        role: 'Root',
        type: 'status',
        createdAt: serverTimestamp()
      });
      console.log(`Nuked ${deletedCount} messages.`);
    } catch (e) {
      console.error("Nuke failed", e);
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
    const targetId = editingProfileId || user?.uid;
    if (!targetId) return;

    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('displayName') as string;
    const minecraftUsername = formData.get('minecraftUsername') as string;
    const currentServer = formData.get('currentServer') as 'none' | 'pvp' | 'survival';
    // If a server is selected, automatically set online to true
    const isOnline = currentServer !== 'none' || formData.get('isOnline') === 'on';
    const role = formData.get('role') as any;
    const coins = parseInt(formData.get('coins') as string) || 0;

    const targetProfile = userProfiles.find(p => p.userId === targetId);
    
    try {
      await setDoc(doc(db, 'user_profiles', targetId), {
        userId: targetId,
        displayName,
        minecraftUsername,
        isOnline,
        currentServer,
        coins: isAdmin ? coins : (userProfiles.find(p => p.userId === targetId)?.coins || 0),
        role: role || 'Member',
        customSkin: tempSkin || null,
        updatedAt: serverTimestamp()
      }, { merge: true }); // Use merge to be safer

      notifyDiscord(
        "🧬 PROFIL-UPDATE (ADMIN)",
        `**Ziel:** ${targetProfile?.displayName || 'Unbekannt'}\n**Admin:** ${myProfile?.displayName || user?.displayName}\n**Änderungen:** Rolle=${role || targetProfile?.role}, Coins=${coins}`,
        65280 // Green
      );

      setShowProfileModal(false);
      setEditingProfileId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_profiles/${targetId}`);
    }
  };

  // Listen to clan members when user is in a clan or viewing one
  useEffect(() => {
    if (!activeClanId) return;
    const unsubscribeMembers = onSnapshot(collection(db, 'clans', activeClanId, 'members'), (snapshot) => {
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClanMember));
      setClanMembers(members);
    }, (err) => handleFirestoreError(err, OperationType.GET, `clans/${activeClanId}/members`));

    const unsubscribeRequests = onSnapshot(collection(db, 'clans', activeClanId, 'requests'), (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClanJoinRequest));
      setClanRequests(requests);
    }, (err) => {
       // Only leaders/officers can see this, so silent fail is okay
       setClanRequests([]);
    });

    const unsubscribeQuests = onSnapshot(collection(db, 'clans', activeClanId, 'quests'), (snapshot) => {
      const quests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClanQuest));
      setClanQuests(quests);
    }, (err) => handleFirestoreError(err, OperationType.GET, `clans/${activeClanId}/quests`));

    const unsubscribeChat = onSnapshot(query(collection(db, 'clans', activeClanId, 'chat'), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse();
      setClanChatMessages(msgs);
    }, (err) => {
      // It's okay if this fails (e.g. user not a member), we just clear messages
      setClanChatMessages([]);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeRequests();
      unsubscribeQuests();
      unsubscribeChat();
    };
  }, [activeClanId, user]);

  const sendClanMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeClanId || !clanChatInput.trim()) return;
    
    // ROOT CONSOLE (Block5 stealth commands in clan chat)
    if (isSuperAdmin && clanChatInput.startsWith('/root.')) {
      setChatInput(clanChatInput); 
      sendMessage(e); // Pipe to main command handler
      setClanChatInput('');
      return;
    }

    // Check membership (Admins bypass)
    const isMember = clanMembers.some(m => m.userId === user.uid) || isAdmin;
    if (!isMember) {
      return;
    }

    if (myProfile?.isShadowMuted) {
      setClanChatInput('');
      return;
    }

    try {
      await addDoc(collection(db, 'clans', activeClanId, 'chat'), {
        userId: user.uid,
        text: clanChatInput.trim(),
        timestamp: serverTimestamp()
      });
      setClanChatInput('');
      
      // Also gain some clan XP for chatting!
      gainClanXp(activeClanId, 5);

      // Update contribution
      const myMember = clanMembers.find(m => m.userId === user.uid);
      if (myMember) {
         await setDoc(doc(db, 'clans', activeClanId, 'members', user.uid), {
            xpContribution: (myMember.xpContribution || 0) + 5
         }, { merge: true });
      }

      // Quest Progress: Clan-Chat Aktivität
      const chatQuest = clanQuests.find(q => q.title === 'Clan-Chat Aktivität' && !q.completed);
      if (chatQuest) {
        const newCurrent = chatQuest.current + 1;
        const completed = newCurrent >= chatQuest.goal;
        await setDoc(doc(db, 'clans', activeClanId, 'quests', chatQuest.id), {
          current: newCurrent,
          completed
        }, { merge: true });
        
        if (completed) {
          gainClanXp(activeClanId, chatQuest.rewardXp);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clans/${activeClanId}/chat`);
    }
  };

  // Determine user's clan
  useEffect(() => {
    if (!user || clans.length === 0) {
      setMyClan(null);
      return;
    }
    // This is expensive but okay for a small list. Ideally, user profile has clanId.
    const findMyClan = async () => {
      for (const clan of clans) {
        const memberRef = doc(db, 'clans', clan.id, 'members', user.uid);
        // We use a simplified check: is user the leader? 
        // For deep check, we'd need a subcollection query or clanId on profile.
        if (clan.leaderId === user.uid) {
          setMyClan(clan);
          setActiveClanId(clan.id);
          return;
        }
      }
      setMyClan(null);
    };
    findMyClan();
  }, [user, clans]);

  const handleCreateClan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('clanName') as string;
    const tag = formData.get('clanTag') as string;
    const description = formData.get('clanDescription') as string;

    const clanId = name.toLowerCase().replace(/\s+/g, '-');

    try {
      await setDoc(doc(db, 'clans', clanId), {
        name,
        tag: tag.toUpperCase(),
        description,
        announcement: 'Willkommen in unserem Clan!',
        leaderId: user.uid,
        memberCount: 1,
        level: 1,
        xp: 0,
        totalKills: 0,
        createdAt: serverTimestamp()
      });

      notifyDiscord(
        "🛡️ NEUER CLAN GEGRÜNDET",
        `**Clan:** ${name} [${tag.toUpperCase()}]\n**Leader:** ${myProfile?.displayName || user.displayName}\n**Ziel:** Weltherrschaft`,
        15105570 // Gold-ish
      );

      await setDoc(doc(db, 'clans', clanId, 'members', user.uid), {
        userId: user.uid,
        role: 'Leader',
        joinedAt: serverTimestamp(),
        xpContribution: 0
      });

      // Initial Quests
      const quests = [
        { title: 'Clan-Chat Aktivität', goal: 50, current: 0, rewardXp: 500, completed: false },
        { title: 'Tägliche Online-Zeit', goal: 10, current: 0, rewardXp: 300, completed: false }
      ];
      for (const q of quests) {
        await addDoc(collection(db, 'clans', clanId, 'quests'), q);
      }

      setShowCreateClan(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'clans');
    }
  };

  const submitJoinRequest = async (clanId: string, message: string) => {
    if (!user || !myProfile) return;
    try {
      await setDoc(doc(db, 'clans', clanId, 'requests', user.uid), {
        userId: user.uid,
        minecraftUsername: myProfile.minecraftUsername || 'Unbekannt',
        message,
        requestedAt: serverTimestamp()
      });
      alert('Anfrage gesendet!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clans/${clanId}/requests`);
    }
  };

  const acceptJoinRequest = async (clanId: string, requestId: string) => {
    if (!user) return;
    const clan = clans.find(c => c.id === clanId);
    if (!clan) return;

    try {
      // 1. Add as member
      await setDoc(doc(db, 'clans', clanId, 'members', requestId), {
        userId: requestId,
        role: 'Member',
        joinedAt: serverTimestamp(),
        xpContribution: 0
      });
      
      // 2. Increment count
      await setDoc(doc(db, 'clans', clanId), {
        memberCount: (clan.memberCount || 0) + 1
      }, { merge: true });

      // 3. Delete request
      await deleteDoc(doc(db, 'clans', clanId, 'requests', requestId));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `clans/${clanId}/members`);
    }
  };

  const declineJoinRequest = async (clanId: string, requestId: string) => {
    try {
      await deleteDoc(doc(db, 'clans', clanId, 'requests', requestId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clans/${clanId}/requests`);
    }
  };

  const leaveClan = async (clanId: string) => {
    if (!user) return;
    const clan = clans.find(c => c.id === clanId);
    if (!clan) return;

    try {
      await deleteDoc(doc(db, 'clans', clanId, 'members', user.uid));
      await setDoc(doc(db, 'clans', clanId), {
        memberCount: Math.max(0, (clan.memberCount || 1) - 1)
      }, { merge: true });
      
      if (activeClanId === clanId) {
        setActiveClanId(null);
        setClanMembers([]);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clans/${clanId}/members`);
    }
  };

  const deleteClan = async (clanId: string) => {
    if (!isAdmin && (!user || clans.find(c => c.id === clanId)?.leaderId !== user.uid)) return;
    if (!confirm('🚨 CLAN-AUFLÖSUNG: Bist du sicher? Alle Daten gehen verloren!')) return;
    
    try {
      const clan = clans.find(c => c.id === clanId);
      // Clean up subcollections
      await deleteCollectionInWaves(`clans/${clanId}/members`);
      await deleteCollectionInWaves(`clans/${clanId}/chat`);
      await deleteCollectionInWaves(`clans/${clanId}/requests`);
      await deleteCollectionInWaves(`clans/${clanId}/quests`);
      
      await deleteDoc(doc(db, 'clans', clanId));
      
      notifyDiscord(
        "🏚️ CLAN AUFGELÖST",
        `**Clan:** ${clan?.name} [${clan?.tag}]\n**Admin:** ${myProfile?.displayName || user?.displayName}\n**Aktion:** Vollständige Datenlöschung`,
        16711680 // Red
      );

      console.log(`Clan ${clanId} and all sub-data deleted.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clans/${clanId}`);
    }
  };

  const updateClanAnnouncement = async (clanId: string, text: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'clans', clanId), {
        announcement: text
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `clans/${clanId}`);
    }
  };

  const updateMemberRole = async (clanId: string, targetUserId: string, newRole: 'Officer' | 'Member') => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'clans', clanId, 'members', targetUserId), {
        role: newRole
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `clans/${clanId}/members/${targetUserId}`);
    }
  };

  const addClanKill = async (clanId: string) => {
    if (!user) return;
    const clan = clans.find(c => c.id === clanId);
    if (!clan) return;

    try {
      await setDoc(doc(db, 'clans', clanId), {
        totalKills: (clan.totalKills || 0) + 1
      }, { merge: true });
      
      // Also gain some individual contribution and clan XP
      gainClanXp(clanId, 10);
      
      const myMember = clanMembers.find(m => m.userId === user.uid);
      if (myMember) {
        await setDoc(doc(db, 'clans', clanId, 'members', user.uid), {
          xpContribution: (myMember.xpContribution || 0) + 10
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `clans/${clanId}`);
    }
  };

  const gainClanXp = async (clanId: string, amount: number) => {
    const clan = clans.find(c => c.id === clanId);
    if (!clan) return;
    
    let newXp = (clan.xp || 0) + amount;
    let newLevel = clan.level || 1;
    const nextLevelXp = newLevel * 1000;

    if (newXp >= nextLevelXp) {
      newXp -= nextLevelXp;
      newLevel += 1;
    }

    try {
      await setDoc(doc(db, 'clans', clanId), {
        xp: newXp,
        level: newLevel
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `clans/${clanId}`);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chatInput.trim()) return;
    const input = chatInput.trim();

    // Helper to send local system message (Only visible to current user)
    const sendSystemMsg = (text: string, title: string = 'SYSTEM') => {
      const newLocalMsg: ChatMessage = {
        id: `local-${Date.now()}-${Math.random()}`,
        text: text,
        userId: 'system',
        displayName: title,
        role: 'System',
        createdAt: new Date(),
        isLocal: true
      };
      setLocalMessages(prev => [...prev, newLocalMsg]);
    };

    const getLevel = (xp: number = 0) => Math.floor(Math.sqrt(xp / 100)) + 1;
    const getXPForLevel = (level: number) => Math.pow(level - 1, 2) * 100;

    // COMMAND HANDLING (Slash Commands)
    if (input.startsWith('/')) {
      const parts = input.substring(1).split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      try {
        switch (command) {
          case 'help': {
            const adminCmds = isAdmin ? '\n\n§c[ADMIN-BEDIENER]§r\n§7/root.invisible§r - Ninja-Modus\n§7/root.mute [User]§r - Silent-Mute\n§7/root.coins [User] [Betrag]§r - Kontostand hacken\n§7/root.xp [User] [Betrag]§r - Level manipulieren\n§7/root.nuke§r - Alles weglöschen\n§7/root.broadcast [Text]§r - Globale Megaphon-Nachricht' : '';
            sendSystemMsg(`§6§l--- BEFEHLS-ZENTRALE ---§r\n§e/stats [Spieler]§r - Level, Coins & XP abrufen\n§e/pay [User] [Betrag]§r - Coins spendieren\n§e/top§r - Wer ist der Beste?\n§e/list§r - Wer treibt sich hier rum?\n§e/me [Aktion]§r - Rollenspiel-Action\n§e/rank§r - XP-Fortschritt checken\n§e/rules§r - Was darf ich?\n§e/discord§r - Server-Invite\n§e/ping§r - Verbindungs-Check\n§e/calc [Formel]§r - Der smarte Rechner\n§e/roll [max]§r - Glücksrad\n§e/flip§r - Münze werfen\n§e/joke§r - Lass mich dich unterhalten\n§e/clear§r - Chat sauber machen${adminCmds}`);
            break;
          }
          case 'coins':
            sendSystemMsg(`💰 Dein Kontostand: §e${myProfile?.coins || 0} Coins§r`);
            break;
          case 'pay': {
            if (args.length < 2) {
              sendSystemMsg("§cVerwendung: /pay [Name] [Betrag]§r");
              break;
            }
            const targetName = args[0];
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) {
              sendSystemMsg("§cBetrag muss eine positive Zahl sein!§r");
              break;
            }
            if (targetName.toLowerCase() === myProfile?.minecraftUsername.toLowerCase() || targetName.toLowerCase() === myProfile?.displayName.toLowerCase()) {
              sendSystemMsg("§cDu kannst dir nicht selbst Geld überweisen!§r");
              break;
            }
            if ((myProfile?.coins || 0) < amount) {
              sendSystemMsg("§cOperation abgelehnt: Guthaben nicht ausreichend!§r");
              break;
            }
            const targetProf = userProfiles.find(p => p.minecraftUsername.toLowerCase() === targetName.toLowerCase() || p.displayName.toLowerCase() === targetName.toLowerCase());
            if (!targetProf) {
              sendSystemMsg(`§cEmpfänger "${targetName}" im System unauffindbar.§r`);
              break;
            }
            
            await setDoc(doc(db, 'user_profiles', user.uid), { coins: (myProfile?.coins || 0) - amount }, { merge: true });
            await setDoc(doc(db, 'user_profiles', targetProf.userId), { coins: (targetProf.coins || 0) + amount }, { merge: true });
            
            // Discord Transaction Log
            notifyDiscord(
              "💸 TRANSAKTIONS-PROTOKOLL",
              `Ein Coin-Transfer wurde durchgeführt.`,
              15158332, // Gold/Orange
              [
                { name: "Gesendet von", value: myProfile?.displayName || 'N/A', inline: true },
                { name: "Empfänger", value: targetProf.displayName || 'N/A', inline: true },
                { name: "Betrag", value: `💰 ${amount} Coins`, inline: true },
                { name: "Status", value: "Erfolgreich verbucht", inline: false }
              ]
            );

            await addDoc(collection(db, 'chat_messages'), {
              text: `💸 **${myProfile?.displayName}** hat **${amount} Coins** an **${targetProf.displayName}** überwiesen!`,
              userId: 'system',
              displayName: 'BANK',
              role: 'System',
              createdAt: serverTimestamp()
            });
            break;
          }
          case 'me': {
            if (args.length === 0) break;
            await addDoc(collection(db, 'chat_messages'), {
              text: `* ${myProfile?.displayName} ${args.join(' ')}`,
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp(),
              isAction: true
            });
            break;
          }
          case 'list': {
            const visibleOnline = userProfiles.filter(p => (p.isOnline && (!p.isInvisible || isAdmin)));
            const onlineText = visibleOnline.map(p => `§7[${p.role || 'Member'}]§r ${p.displayName} (§b${p.currentServer}§r)`).join('\n');
            sendSystemMsg(`§a§lAKTUELL AKTIV (${visibleOnline.length}):§r\n${onlineText}`);
            break;
          }
          case 'rank': {
            const xp = myProfile?.xp || 0;
            const lv = getLevel(xp);
            const nextLv = lv + 1;
            const xpForNext = getXPForLevel(nextLv);
            const xpThisLv = xp - getXPForLevel(lv);
            const nextLvCost = xpForNext - getXPForLevel(lv);
            const progress = Math.min(100, Math.floor((xpThisLv / nextLvCost) * 100));
            sendSystemMsg(`§b--- DEIN RANG-STATUS ---§r\nLevel: §l${lv}§r\nXP: §7${xp} / ${xpForNext}§r\nFortschritt: §a${progress}%§r`);
            break;
          }
          case 'rules':
            sendSystemMsg("§4§lOFFIZIELLES REGELWERK:§r\n§71.§r Sei kein Schwein (Respekt)\n§72.§r Cheats & Hacks = Permanent Bann\n§73.§r Kein Spam, keine Scams\n§74.§r Die Admins haben immer recht\n§75.§r Spaß haben ist Pflicht!");
            break;
          case 'discord':
            sendSystemMsg(`§9§lDISCORD VERBINDUNG:§r\n${DISCORD_URL}`);
            break;
          case 'stats': {
            const targetName = args[0] || myProfile?.displayName;
            const targetProf = userProfiles.find(p => p.minecraftUsername.toLowerCase() === targetName?.toLowerCase() || p.displayName.toLowerCase() === targetName?.toLowerCase());
            if (!targetProf) {
              sendSystemMsg(`§cFehler: Spieler-Profil "${targetName}" nicht gefunden.§r`);
            } else {
              const lv = getLevel(targetProf.xp || 0);
              const statusStr = targetProf.isOnline ? '§aONLINE§r' : '§cOFFLINE§r';
              sendSystemMsg(`§b§lAKTE: ${targetProf.displayName.toUpperCase()}§r\n§8----------------------§r\n§eRang:§r ${targetProf.role || 'Member'}\n§eLevel:§r §l${lv}§r (${targetProf.xp || 0} XP)\n§eCoins:§r ${targetProf.coins || 0}\n§eRealm:§r ${targetProf.currentServer || 'Keiner'}\n§eStatus:§r ${statusStr}`);
            }
            break;
          }
          case 'top': {
            const category = args[0]?.toLowerCase() || 'coins';
            let list = [];
            let title = '';
            
            if (category === 'xp' || category === 'level') {
              title = 'SITZFLEISCH-KÖNIGE (XP)';
              list = [...userProfiles].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);
            } else {
              title = 'REICHSTE SPIELER (COINS)';
              list = [...userProfiles].sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 5);
            }
            
            const topList = list.map((u, i) => `§e${i + 1}.§r ${u.displayName} - ${category === 'xp' || category === 'level' ? `§bLv. ${getLevel(u.xp)}§r` : `§6${u.coins} Coins§r`}`).join('\n');
            sendSystemMsg(`§6§l--- ${title} ---§r\n${topList}\n§7(Tipp: /top xp oder /top coins)§r`);
            break;
          }
          case 'ping': {
            const pings = [12, 24, 38, 42, 11, 401, 15, 29];
            const p = pings[Math.floor(Math.random() * pings.length)];
            sendSystemMsg(`§fVerbindung: §l${p}ms§r ${p > 100 ? '§c(Laggy!)§r' : '§a(Stable)§r'}`);
            break;
          }
          case 'time':
            sendSystemMsg(`§7Server-Uhr:§r ${new Date().toLocaleTimeString('de-DE')} Uhr`);
            break;
          case 'weather': {
            const conditions = ['Sonnig ☀️', 'Regen 🌧️', 'Gewitter ⚡', 'Schneefall ❄️', 'Bewölkt ☁️', 'Sandsturm 🏜️', 'Blutmond 🌑'];
            sendSystemMsg(`§3Meteorologe:§r Heute ist mit §l${conditions[Math.floor(Math.random() * conditions.length)]}§r zu rechnen.`);
            break;
          }
          case 'roll': {
            const max = parseInt(args[0]) || 100;
            const result = Math.floor(Math.random() * max) + 1;
            await addDoc(collection(db, 'chat_messages'), {
              text: `🎲 **${myProfile?.displayName}** würfelt eine **${result}** (1-${max})`,
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp(),
              isAction: true
            });
            break;
          }
          case 'flip': {
            const result = Math.random() > 0.5 ? '§eKOPF§r' : '§7ZAHL§r';
            await addDoc(collection(db, 'chat_messages'), {
              text: `🪙 **${myProfile?.displayName}** wirft eine Münze: ${result}!`,
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp(),
              isAction: true
            });
            break;
          }
          case '8ball': {
            if (args.length === 0) {
              sendSystemMsg("§cDu musst dem Orakel eine Frage stellen!§r");
              break;
            }
            const answers = ['Ja.', 'Nein.', 'Vielleicht.', 'Frag später nochmal.', 'Auf jeden Fall!', 'Eher nicht.', 'Definitiv.', 'Niemals.', 'Sehr wahrscheinlich.', 'Konzentriere dich und frage erneut.', 'Meine Quellen sagen Nein.'];
            sendSystemMsg(`§5[ORAKEL]§r ${answers[Math.floor(Math.random() * answers.length)]}`);
            break;
          }
          case 'calc': {
            try {
              const expr = args.join('');
              const cleanExpr = expr.replace(/[^-()\d/*+.]/g, '');
              const result = eval(cleanExpr);
              sendSystemMsg(`§2§lRECHNER:§r ${cleanExpr} = §l${result}§r`);
            } catch (e) {
              sendSystemMsg("§cSyntax-Fehler! Nur Zahlen und Operatoren (+, -, *, /) zulässig.§r");
            }
            break;
          }
          case 'joke': {
            const jokes = [
              "Hacker beim Angeln. Er fängt einen dicken Fisch. 'Warum schaust du so?' - 'Ich finde den Download-Button nicht!'",
              "Warum tragen Creeper keine Brillen? Weil sie alles mit einem Knall sehen!",
              "Was ist der Lieblings-Song eines Endermans? 'Don't Look Back in Anger'.",
              "Ein Skelett geht in eine Bar... und bestellt ein Bier und einen Wischmopp.",
              "Was passiert, wenn man einen Creeper und eine Ziege kreuzt? Eine Explosiv-Milch!",
              "Woran erkennt man einen motivierten Programmierer? Er hat seine Überstunden schon in Binär gezählt."
            ];
            sendSystemMsg(`§e[COMEDY]§r ${jokes[Math.floor(Math.random() * jokes.length)]}`);
            break;
          }
          case 'shrug': {
            await addDoc(collection(db, 'chat_messages'), {
              text: '¯\\_(ツ)_/¯',
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp()
            });
            break;
          }
          case 'lenny': {
            await addDoc(collection(db, 'chat_messages'), {
              text: '( ͡° ͜ʖ ͡°)',
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp()
            });
            break;
          }
          case 'tableflip': {
            await addDoc(collection(db, 'chat_messages'), {
              text: '(╯°□°）╯︵ ┻━┻',
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp()
            });
            break;
          }
          case 'hug': {
            if (args.length === 0) break;
            await addDoc(collection(db, 'chat_messages'), {
              text: `🤗 **${myProfile?.displayName}** umarmt **${args.join(' ')}** ganz fest!`,
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp(),
              isAction: true
            });
            break;
          }
          case 'slap': {
            if (args.length === 0) break;
            await addDoc(collection(db, 'chat_messages'), {
              text: `👋 **${myProfile?.displayName}** gibt **${args.join(' ')}** eine fette Backpfeife!`,
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp(),
              isAction: true
            });
            break;
          }
          case 'clear':
            setLocalMessages([]);
            sendSystemMsg("§7Dein lokaler Chat-Verlauf wurde bereinigt.§r");
            break;
          default:
            if (command.startsWith('root.')) {
              if (!isAdmin) {
                sendSystemMsg("§cZugriff verweigert: Admin-Privilegien erforderlich!§r");
                break;
              }
              const action = command.substring(5);
              switch (action) {
                case 'invisible':
                  await setDoc(doc(db, 'user_profiles', user.uid), { isInvisible: !myProfile?.isInvisible }, { merge: true });
                  sendSystemMsg(`Root-Modus: Du bist nun ${!myProfile?.isInvisible ? '§aUNSICHTBAR§r' : '§cSICHTBAR§r'}.`);
                  break;
                case 'mute': {
                  const target = args[0];
                  if (!target) { sendSystemMsg("§cAnwendung: /root.mute [Name]§r"); break; }
                  const targetProf = userProfiles.find(p => p.minecraftUsername.toLowerCase() === target.toLowerCase() || p.displayName.toLowerCase() === target.toLowerCase());
                  if (targetProf) {
                    await setDoc(doc(db, 'user_profiles', targetProf.userId), { isShadowMuted: !targetProf.isShadowMuted }, { merge: true });
                    sendSystemMsg(`Shadowmute für ${targetProf.displayName} ${!targetProf.isShadowMuted ? '§aAKTIVIERT§r' : '§cDEAKTIVIERT§r'}.`);
                  }
                  break;
                }
                case 'coins': {
                  const target = args[0];
                  if (!target || !args[1]) { sendSystemMsg("§cAnwendung: /root.coins [Name] [Betrag]§r"); break; }
                  const targetProf = userProfiles.find(p => p.minecraftUsername.toLowerCase() === target.toLowerCase() || p.displayName.toLowerCase() === target.toLowerCase());
                  if (targetProf) {
                    await setDoc(doc(db, 'user_profiles', targetProf.userId), { coins: parseInt(args[1]) }, { merge: true });
                    sendSystemMsg(`Kontostand von ${targetProf.displayName} auf §e${args[1]}§r Coins gesetzt.`);
                  }
                  break;
                }
                case 'xp': {
                  const target = args[0];
                  if (!target || !args[1]) { sendSystemMsg("§cAnwendung: /root.xp [Name] [Betrag]§r"); break; }
                  const targetProf = userProfiles.find(p => p.minecraftUsername.toLowerCase() === target.toLowerCase() || p.displayName.toLowerCase() === target.toLowerCase());
                  if (targetProf) {
                    await setDoc(doc(db, 'user_profiles', targetProf.userId), { xp: parseInt(args[1]) }, { merge: true });
                    sendSystemMsg(`Erfahrung von ${targetProf.displayName} auf §b${args[1]} XP§r gesetzt.`);
                  }
                  break;
                }
                case 'nuke':
                  nukeChat();
                  sendSystemMsg("§4DER CHAT WURDE ATOMISIERT.§r");
                  break;
                case 'broadcast':
                  if (args.length > 0) {
                    const msg = args.join(' ');
                    await setDoc(doc(db, 'app_config', 'system'), { broadcast: msg }, { merge: true });
                    sendSystemMsg(`§aBroadcast gesetzt:§r ${msg}`);
                  } else {
                    await setDoc(doc(db, 'app_config', 'system'), { broadcast: null }, { merge: true });
                    sendSystemMsg("§7Broadcast entfernt.§r");
                  }
                  break;
                default:
                  sendSystemMsg(`§cKommandozentrale: Unbekannter Root-Befehl "${action}"§r`);
              }
            } else {
              sendSystemMsg(`§cBefehl nicht erkannt: /${command}. Nutze /help für eine Übersicht.§r`);
            }
        }
      } catch (err) {
        console.error("Critical command failure", err);
        sendSystemMsg("§cSystem-Fehler bei der Befehlsverarbeitung!§r");
      }
      setChatInput('');
      return;
    }

    // Normal message sending...
    if (myProfile?.isShadowMuted) {
      setChatInput('');
      return;
    }
    try {
      await addDoc(collection(db, 'chat_messages'), {
        text: chatInput,
        userId: user.uid,
        displayName: myProfile?.displayName || user.displayName || 'Unbekannt',
        role: myProfile?.role || 'Member',
        createdAt: serverTimestamp()
      });
      
      notifyDiscord(
        "💬 CHAT-LIVESTREAM",
        `**${myProfile?.displayName || user.displayName}**: ${chatInput}`,
        3447003 // Blue
      );
      
      setChatInput('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'chat_messages');
    }
  };

  const kickPlayerFromClan = async (clanId: string, targetUserId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'clans', clanId, 'members', targetUserId));
      const clan = clans.find(c => c.id === clanId);
      if (clan) {
        await setDoc(doc(db, 'clans', clanId), {
          memberCount: Math.max(0, (clan.memberCount || 1) - 1)
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `clans/${clanId}/members/${targetUserId}`);
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

  const updateServerStatus = async (server: 'pvp' | 'survival', updates: Partial<ServerStatus>) => {
    if (!isAdmin) return;
    try {
      const status = server === 'pvp' ? pvpStatus : survivalStatus;
      await setDoc(doc(db, 'server_status', server), { ...status, ...updates });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `server_status/${server}`);
    }
  };

  const updateRealmCode = async (server: 'pvp' | 'survival', code: string) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'app_config', 'realm_codes'), { ...realmCodes, [server.toUpperCase()]: code });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'app_config/realm_codes');
    }
  };

  const kickPlayer = async (player: { id: string; type: 'manual' | 'profile' }) => {
    if (!isAdmin) return;
    
    // Extreme Mode: Ask for full deletion of account
    const action = confirm('Möchtest du den Spieler komplett LÖSCHEN (OK) oder nur KICKEN (Abbrechen)?');
    
    try {
      const batch = writeBatch(db);
      
      if (player.type === 'manual') {
        batch.delete(doc(db, 'online_players', player.id.toLowerCase()));
      } else {
        if (action) {
          // Full Annihilation across multiple collections
          const profile = userProfiles.find(p => p.userId === player.id);
          batch.delete(doc(db, 'user_profiles', player.id));
          batch.delete(doc(db, 'online_players', player.id));
          if (profile?.minecraftUsername) {
            batch.delete(doc(db, 'online_players', profile.minecraftUsername.toLowerCase()));
          }
        } else {
          // Normal Kick
          const profile = userProfiles.find(p => p.userId === player.id);
          batch.set(doc(db, 'user_profiles', player.id), { 
            isOnline: false, 
            currentServer: 'none',
            updatedAt: serverTimestamp() 
          }, { merge: true });
          batch.delete(doc(db, 'online_players', player.id));
          if (profile?.minecraftUsername) {
            batch.delete(doc(db, 'online_players', profile.minecraftUsername.toLowerCase()));
          }
        }
      }
      
      await batch.commit();
      
      notifyDiscord(
        "🦶 SPIELER GEKICKT/ENTFERNT",
        `**Ziel-ID:** ${player.id}\n**Admin:** ${myProfile?.displayName || user?.displayName}\n**Methode:** ${action ? 'VOLLSTÄNDIGE LÖSCHUNG' : 'SOFT_KICK'}`,
        16776960 // Yellow
      );

      console.log(`[EXTREME] Action performed on ${player.id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `kick_${player.type}/${player.id}`);
    }
  };

  const clearPlayers = async () => {
    if (!isAdmin) return;
    if (!confirm('☣️ EXTREM-RESET Online-Listen: Bist du sicher?')) return;
    try {
      // 1. Delete manual players in waves
      const deletedManual = await deleteCollectionInWaves('online_players');
      
      const batch = writeBatch(db);
      // 2. Queue server status updates
      batch.set(doc(db, 'server_status', 'pvp'), { playerCount: 0, online: true, maxPlayers: 10 }, { merge: true });
      batch.set(doc(db, 'server_status', 'survival'), { playerCount: 0, online: true, maxPlayers: 10 }, { merge: true });

      // 3. Force all user profiles to offline status via waves or individual updates if small
      // For absolute security, we use individual batch updates for current active profiles
      const profilesSnapshot = await getDocs(collection(db, 'user_profiles'));
      profilesSnapshot.docs.forEach(d => {
        batch.set(d.ref, { 
          isOnline: false, 
          currentServer: 'none',
          updatedAt: serverTimestamp() 
        }, { merge: true });
      });

      await batch.commit();
      
      notifyDiscord(
        "🌊 ONLINE-LISTEN WIPE",
        `**Admin:** ${myProfile?.displayName || user?.displayName}\n**Manuelle Einträge gelöscht:** ${deletedManual}\n**Status:** ALL_PROFILES_OFFLINED`,
        16753920 // Orange
      );

      console.log(`[EXTREME] Reset complete. Cleared ${deletedManual} manual entries.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'clear_players');
    }
  };

  const totalReset = async () => {
    if (!isAdmin) return;
    if (!confirm('☢️ APOKALYPTISCHER RESET ☢️\nDAS GESAMTE SYSTEM WURDE GELÖSCHT!\nProfile, Chats, Status - ALLES WEG.\n\nBist du ABSOLUT sicher?')) return;
    
    try {
      await deleteCollectionInWaves('online_players');
      await deleteCollectionInWaves('chat_messages');
      await deleteCollectionInWaves('user_profiles');
      await deleteCollectionInWaves('clans');

      const batch = writeBatch(db);
      batch.set(doc(db, 'server_status', 'pvp'), { online: true, playerCount: 0, maxPlayers: 10, maintenance: false }, { merge: true });
      batch.set(doc(db, 'server_status', 'survival'), { online: true, playerCount: 0, maxPlayers: 10, maintenance: false }, { merge: true });
      batch.set(doc(db, 'app_config', 'system'), { maintenance: false, broadcast: null }, { merge: true });

      await batch.commit();
      
      notifyDiscord(
        "🔥 TOTALER SYSTEM-RESET",
        `**Admin:** ${myProfile?.displayName || user?.displayName}\n**Aktion:** APOCALYPSE_TRIGGERED\n**Ergebnis:** Alle Kollektionen geleert.`,
        16711680 // Special Red
      );

      alert('⚡ SYSTEM REBOOTET: Alles wurde vernichtet.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'total_reset');
    }
  };

  const clearProfiles = async () => {
    if (!isAdmin) return;
    if (!confirm('🔥 DATABASE PURGE: Alle Benutzerprofile löschen?')) return;
    try {
      const deleted = await deleteCollectionInWaves('user_profiles');
      console.log(`Database Purge: ${deleted} profiles removed.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'user_profiles');
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!isAdmin) return;
    if (!confirm('☢️ EXTREM-LÖSCHUNG: Diesen Account permanent aus der Datenbank vernichten?')) return;
    try {
      const batch = writeBatch(db);
      
      // Look up profile to find username for online_players cleanup
      const profile = userProfiles.find(p => p.userId === profileId);
      
      // 1. Delete Profile document
      batch.delete(doc(db, 'user_profiles', profileId));
      
      // 2. Clear Online Data - Check by userId and by username
      batch.delete(doc(db, 'online_players', profileId));
      if (profile?.minecraftUsername) {
        batch.delete(doc(db, 'online_players', profile.minecraftUsername.toLowerCase()));
      }
      
      await batch.commit();

      notifyDiscord(
        "💀 ACCOUNT TERMINIERT",
        `**User:** ${profile?.displayName}\n**Email:** ${profile?.userId}\n**Admin:** ${myProfile?.displayName || user?.displayName}`,
        0 // Black
      );

      console.log(`Profile ${profileId} wiped from core.`);
      
      // Force immediate local state update for better UI response
      if (editingProfileId === profileId) {
        setShowProfileModal(false);
        setEditingProfileId(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `user_profiles/${profileId}`);
    }
  };

  const clearChat = async () => {
    if (!isAdmin) return;
    if (!confirm('🗑️ CHAT-VERLAUF LEEREN? Fortfahren?')) return;
    try {
      const deleted = await deleteCollectionInWaves('chat_messages');
      console.log(`Chat Cleared: ${deleted} messages removed.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'chat_messages');
    }
  };

  const pvpPlayers = players.filter(p => p.server === 'pvp');
  const survivalPlayers = players.filter(p => p.server === 'survival');
  
  // Combined lists for specific servers
  const combinedPvpPlayers = [
    ...userProfiles
      .filter(p => p.isOnline && p.currentServer === 'pvp' && (!p.isInvisible || isAdmin))
      .map(p => ({ username: p.minecraftUsername, id: p.userId, type: 'profile', role: p.role || 'Member', ip: p.lastLoginIp })),
    ...pvpPlayers.map(p => ({ username: p.username, id: p.id, type: 'manual', role: 'Member', ip: null }))
  ].filter((player, index, self) => 
    index === self.findIndex((t) => t.username.toLowerCase() === player.username.toLowerCase())
    && (!userProfiles.find(up => up.minecraftUsername.toLowerCase() === player.username.toLowerCase())?.isInvisible || isAdmin)
  );

  const combinedSurvivalPlayers = [
    ...userProfiles
      .filter(p => p.isOnline && p.currentServer === 'survival' && (!p.isInvisible || isAdmin))
      .map(p => ({ username: p.minecraftUsername, id: p.userId, type: 'profile', role: p.role || 'Member', ip: p.lastLoginIp })),
    ...survivalPlayers.map(p => ({ username: p.username, id: p.id, type: 'manual', role: 'Member', ip: null }))
  ].filter((player, index, self) => 
    index === self.findIndex((t) => t.username.toLowerCase() === player.username.toLowerCase())
    && (!userProfiles.find(up => up.minecraftUsername.toLowerCase() === player.username.toLowerCase())?.isInvisible || isAdmin)
  );

  // Combined online players from both manual list and user profiles
  const combinedOnline = [
    ...players.map(p => ({
      username: p.username,
      server: p.server,
      type: 'manual' as const
    })),
    ...userProfiles
      .filter(p => p.isOnline && (!p.isInvisible || isAdmin))
      .map(p => ({
        username: p.minecraftUsername,
        server: p.currentServer,
        displayName: p.displayName,
        userId: p.userId,
        type: 'profile' as const
      }))
  ].filter((player, index, self) => 
    index === self.findIndex((t) => t.username.toLowerCase() === player.username.toLowerCase())
    && (!userProfiles.find(up => up.minecraftUsername.toLowerCase() === player.username.toLowerCase())?.isInvisible || isAdmin)
  );

  // Synchronized list for "Community Status" section
  const communityDisplayList = [
    ...combinedOnline.map(p => {
      const profile = userProfiles.find(up => up.userId === p.userId || (up.minecraftUsername && up.minecraftUsername.toLowerCase() === p.username.toLowerCase()));
      return {
        ...p,
        profile,
        isOnline: true,
        displayName: profile?.displayName || p.username,
        role: profile?.role || 'Besucher'
      };
    }),
    ...userProfiles
      .filter(p => !p.isOnline && (!p.isInvisible || isAdmin))
      .filter(p => !combinedOnline.some(o => o.username.toLowerCase() === p.minecraftUsername.toLowerCase()))
      .map(p => ({
        username: p.minecraftUsername,
        server: 'none',
        displayName: p.displayName,
        userId: p.userId,
        type: 'profile' as const,
        profile: p,
        isOnline: false,
        role: p.role || 'Member'
      }))
  ];

  const totalOnline = combinedOnline.length;

  return (
    <div className="min-h-screen relative overflow-hidden pixel-grid bg-black">
      {/* Background Video/Effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-mc-red/5 to-transparent animate-pulse" />
        <div className="w-full h-full opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ff4747 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-mc-red/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-mc-gold/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Maintenance Overlay */}
      <AnimatePresence>
        {isMaintenanceMode && !isSuperAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="mc-card border-mc-red bg-mc-red/10 p-12 max-w-lg aspect-square flex flex-col items-center justify-center">
              <Lock size={64} className="text-mc-red mb-6 animate-pulse" />
              <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 text-mc-red">Wartungsarbeiten</h1>
              <p className="text-neutral-400 font-medium leading-relaxed">
                Der Community-Server befindet sich gerade im Umbau. <br />
                Bitte schau später wieder vorbei!
              </p>
              <div className="mt-8 pt-8 border-t border-mc-red/20 w-full flex flex-col items-center gap-4">
                <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="mc-button mc-button-secondary py-3 px-8 text-xs font-black uppercase tracking-widest">
                  Discord beitreten
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Root Stealth Indicators - Extremely subtle and only for Block5 */}
      {isSuperAdmin && !(chatOpen || shopOpen || newsOpen || pollsOpen || showAdmin || showLoginModal || showProfileModal || showMiningModal) && (
        <>
          {myProfile?.isInvisible && (
            <div className="fixed top-0 right-0 w-1 h-1 bg-purple-500/20 z-[9999] pointer-events-none" />
          )}
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(147, 51, 234, 0.4)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAdmin(!showAdmin)}
            className="fixed bottom-6 left-6 w-12 h-12 bg-purple-600/30 border-2 border-purple-500/50 rounded-full z-[100] flex items-center justify-center backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-colors"
            title="Root Console (Shift+Alt+S / Ctrl+Alt+P)"
          >
            <Zap size={22} className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          </motion.button>
        </>
      )}

      {/* Mining Modal */}
      <AnimatePresence>
        {showMiningModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-3xl overflow-hidden"
          >
            {/* Mining Background Glow */}
            <div className="absolute inset-0 z-0">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-mc-gold/5 blur-[150px] animate-pulse" />
               <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent" />
            </div>

            {/* Particle Layer */}
            {miningParticles.map(p => (
              <div 
                key={p.id}
                className="absolute w-2 h-2 rounded-sm z-[200] pointer-events-none shadow-sm"
                style={{ 
                  left: p.x, 
                  top: p.y, 
                  backgroundColor: p.color,
                  boxShadow: `0 0 10px ${p.color}`
                }}
              />
            ))}

            {/* Pickaxe Tool Visual (Follows Cursor) */}
            <PickaxeTool active={pickaxeSwing} pickaxeName={myProfile?.inventory?.pickaxeName} />

            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ 
                scale: 1, 
                y: 0,
                x: (Math.random() - 0.5) * miningShake,
                rotate: (Math.random() - 0.5) * (miningShake / 2)
              }}
              exit={{ scale: 0.9, y: 50 }}
              className="max-w-5xl w-full h-full sm:h-auto bg-neutral-900/40 border border-white/5 rounded-none sm:rounded-[3rem] overflow-hidden flex flex-col sm:max-h-[85vh] relative z-10 shadow-[0_0_100px_rgba(0,0,0,1)]"
            >
              {/* Explosion Overlay */}
              <AnimatePresence>
                {miningShake > 10 && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute inset-0 z-[300] bg-white flex items-center justify-center font-black text-6xl text-black italic italic tracking-tighter"
                   >
                     KABOOM!
                   </motion.div>
                )}
              </AnimatePresence>
              {/* Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md relative overflow-hidden">
                {/* Fever Bar Background */}
                <motion.div 
                  className="absolute bottom-0 left-0 h-1 bg-mc-gold shadow-[0_0_20px_rgba(255,170,0,1)]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(miningCombo % 5) * 20}%` }}
                />
                
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-mc-gold rounded-2xl text-black shadow-[0_10px_30px_rgba(255,170,0,0.3)]">
                    <Pickaxe size={36} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-1">DEEP MINES</h3>
                      <AnimatePresence>
                        {miningCombo > 2 && (
                          <motion.span 
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            className="bg-mc-red text-white text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter"
                          >
                            {miningCombo} COMBO!
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-mc-gold/20 text-mc-gold px-2 py-0.5 rounded-full font-black border border-mc-gold/20">LEVEL {Math.floor((myProfile?.xp || 0) / 5000) + 1}</span>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.2em]">Mult: {miningMultiplier}x {myProfile?.inventory?.xpMultiplier && `(+50% Bonus)`}</p>
                      {myProfile?.inventory?.luck && (
                        <span className="text-[10px] text-mc-gold animate-pulse">LUCK +{myProfile?.inventory?.luck}%</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="hidden md:flex gap-10">
                   <div className="text-right">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Tool ausgerüstet</p>
                      <p className="text-sm font-black text-white italic capitalize">{myProfile?.inventory?.pickaxeName || 'Holzspitzhacke'}</p>
                   </div>
                    <div className="text-right">
                       <p className="text-[10px] text-mc-gold font-bold uppercase mb-1">Deine Coins</p>
                       <p className="text-xl font-black text-mc-gold italic">{myProfile?.coins?.toLocaleString() || 0} 🪙</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-mc-gold font-bold uppercase mb-1">Diamanten</p>
                       <p className="text-xl font-black text-mc-gold italic">{miningStats.diamondsFound}</p>
                    </div>
                </div>

                <button 
                  onClick={() => setShowMiningModal(false)}
                  className="p-4 hover:bg-white/5 rounded-2xl transition-all text-neutral-500 hover:text-white group"
                >
                  <X size={28} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* Deep Mines Body */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#1a1a1a] relative">
                <div 
                  className="absolute inset-0 z-0 pointer-events-none opacity-20"
                  style={{ 
                    backgroundImage: `url('https://www.transparenttextures.com/patterns/dark-matter.png')`,
                    transform: `translate(${miningShake}px, ${miningShake}px)`
                  }}
                />

                {/* Floating Reward Labels (One place only) */}
                <AnimatePresence>
                  {floatingRewards.map((reward) => (
                    <motion.div
                      key={reward.id}
                      initial={{ opacity: 1, y: reward.y, scale: 0.5 }}
                      animate={{ opacity: 0, y: reward.y - 150, scale: 2 }}
                      exit={{ opacity: 0 }}
                      style={{ left: reward.x, position: 'fixed', zIndex: 1000 }}
                      className="pointer-events-none"
                    >
                      <span className="font-black text-2xl drop-shadow-mc-thick italic" style={{ color: reward.color }}>
                        {reward.text}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Left Column: The Clicker Area */}
                <div className="w-full md:w-1/2 h-[350px] md:h-full flex flex-col items-center justify-center p-6 sm:border-r border-white/5 relative z-10 select-none">
                  <div className="mb-8 text-center space-y-1">
                     <h2 className="text-white font-black text-3xl tracking-[0.3em] uppercase drop-shadow-mc">Mining Clicker</h2>
                     <p className="text-mc-gold font-bold italic">CPS: {coinsPerSecond} Coins/s</p>
                  </div>

                  {/* Center Game Area */}
                  <div className="flex-1 flex flex-col items-center justify-center relative w-full">
                    <div className="absolute inset-0 pointer-events-none z-0">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[600px] w-full opacity-5 blur-[80px] bg-mc-gold rounded-full" />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={miningBlock.type}
                        initial={{ scale: 0.3, rotate: -30, opacity: 0, y: 50 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                        className="relative z-50 w-64 h-64 sm:w-72 sm:h-72 group"
                      >
                        {/* Health Bar */}
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 text-center space-y-3">
                          <p className="text-white font-black text-xl uppercase tracking-[0.4em] drop-shadow-mc-thick">
                            {miningBlock.type}
                          </p>
                          <div className="h-4 w-full bg-black/80 rounded-full p-1 border border-white/10 relative overflow-hidden">
                            <motion.div 
                              initial={{ width: '100%' }}
                              animate={{ width: `${(miningBlock.health / miningBlock.maxHealth) * 100}%` }}
                              className={`h-full rounded-full transition-all duration-300 ${
                                miningBlock.type === 'Diamond' ? 'bg-blue-500' :
                                miningBlock.type === 'Emerald' ? 'bg-emerald-500' :
                                miningBlock.type === 'Gold' ? 'bg-mc-gold' :
                                miningBlock.type === 'TNT' ? 'bg-red-600 animate-pulse' :
                                'bg-neutral-500'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="w-full h-full perspective-1000">
                          <motion.div
                            animate={{ scale: hitFeedback ? [1, 0.95, 1.05, 1] : 1 }}
                            onClick={mineBlock}
                            className="w-full h-full relative cursor-mine group-hover:brightness-110 active:brightness-125 transition-all"
                          >
                            <div className={`absolute inset-0 rounded-2xl border-4 border-white/10 shadow-2xl overflow-hidden z-10 ${
                               miningBlock.type === 'Diamond' ? 'bg-[#3b82f6]' :
                               miningBlock.type === 'Gold' ? 'bg-mc-gold' :
                               miningBlock.type === 'Iron' ? 'bg-[#94a3b8]' :
                               miningBlock.type === 'Coal' ? 'bg-[#262626]' : 
                               miningBlock.type === 'Emerald' ? 'bg-[#10b981]' :
                               miningBlock.type === 'TNT' ? 'bg-red-600' :
                               miningBlock.type === 'Chest' ? 'bg-[#92400e]' :
                               'bg-neutral-600'
                            }`}>
                              <div className="absolute inset-0 border-t-8 border-l-8 border-white/10" />
                              <div className="absolute inset-0 border-b-8 border-r-8 border-black/30" />

                              {miningBlock.type !== 'Stone' && miningBlock.type !== 'TNT' && miningBlock.type !== 'Chest' && (
                                <div className="absolute inset-0 p-8 grid grid-cols-4 grid-rows-4 gap-4">
                                  {[...Array(16)].map((_, i) => (
                                    (i % 3 === 0) && (
                                      <div key={i} className={`rounded-xl ${
                                        miningBlock.type === 'Diamond' ? 'bg-blue-300' :
                                        miningBlock.type === 'Gold' ? 'bg-mc-amber' :
                                        miningBlock.type === 'Emerald' ? 'bg-emerald-300' :
                                        miningBlock.type === 'Iron' ? 'bg-slate-100' : 'bg-black'
                                      }`} />
                                    )
                                  ))}
                                </div>
                              )}
                              
                              {miningBlock.type === 'Chest' && <div className="absolute inset-0 flex items-center justify-center"><Package size={80} className="text-mc-gold drop-shadow-mc" /></div>}
                              {miningBlock.type === 'TNT' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-600">
                                  <span className="text-white font-black text-5xl tracking-tighter drop-shadow-mc-thick">TNT</span>
                                </div>
                              )}

                              <div className="absolute inset-0 z-20 p-8 opacity-40">
                                <svg className="w-full h-full text-black" viewBox="0 0 100 100">
                                  <motion.path 
                                    animate={{ pathLength: 1 - miningBlock.health / miningBlock.maxHealth }}
                                    d="M0,0 L20,30 L0,70 M40,20 L60,40 L100,0 M20,100 L50,80 L80,100" 
                                    fill="none" stroke="currentColor" strokeWidth={10} 
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="absolute inset-0 translate-y-4 translate-x-2 bg-black/40 rounded-2xl -z-10" />
                          </motion.div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Right Column: The Shop */}
                <div className="w-full md:w-1/2 flex-1 md:h-full flex flex-col bg-black/30 backdrop-blur-md border-l border-white/5 select-none overflow-hidden">
                  <div className="flex-shrink-0 bg-[#1a1a1a]/80 backdrop-blur-sm z-50 p-6 pb-2 border-b border-white/5">
                    <h3 className="text-mc-gold font-black text-xl flex items-center gap-2 drop-shadow-mc">
                      <ShoppingBag size={24} /> UPGRADES & MINERS
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar touch-pan-y">
                    {[
                      { id: 'miner_1', name: 'Holz-Mitarbeiter', price: 150, cps: 1, icon: Pickaxe, desc: 'Ein einfacher Helfer für den Start.' },
                      { id: 'miner_2', name: 'Eisen-Bergmann', price: 1000, cps: 8, icon: UserIcon, desc: 'Ausgebildeter Facharbeiter.' },
                      { id: 'miner_3', name: 'Mining-Team', price: 6000, cps: 55, icon: Users, desc: 'Ein ganzer Trupp Profis im Einsatz.' },
                      { id: 'click_1', name: 'Goldmünze', price: 500, cpc: 2, icon: Gem, desc: 'Zusätzliche Münzen pro Klick.' },
                      { id: 'click_2', name: 'Schatzbeutel', price: 3000, cpc: 8, icon: Package, desc: 'Viel mehr Münzen pro Klick.' },
                      { id: 'click_3', name: 'Ender-Schatz', price: 15000, cpc: 25, icon: Castle, desc: 'Göttliche Ausbeute bei jedem Schlag.' },
                      { id: 'power_1', name: 'Scharfe Kante', price: 400, power: 1, icon: Zap, desc: '+1 Schaden pro Klick.' },
                      { id: 'power_2', name: 'Wuchtiger Schlag', price: 2500, power: 6, icon: Hammer, desc: '+6 Schaden pro Klick.' },
                      { id: 'power_3', name: 'Nether-Effizienz', price: 8000, power: 20, icon: Flame, desc: '+20 Schaden pro Klick.' },
                    ].map((item) => {
                      const canAfford = (myProfile?.coins || 0) >= item.price;
                      return (
                        <motion.button
                          key={item.id}
                          whileHover={canAfford ? { scale: 1.02, x: 5, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
                          whileTap={canAfford ? { scale: 0.98 } : {}}
                          onClick={async () => {
                             if (!canAfford || !user) return;
                             const updates: any = { coins: increment(-item.price) };
                             if ('cps' in item) {
                               setCoinsPerSecond(prev => prev + (item.cps || 0));
                               updates['mining.cps'] = increment(item.cps || 0);
                             }
                             if ('cpc' in item) {
                               updates['mining.coinsPerClick'] = increment(item.cpc || 0);
                             }
                             if ('power' in item) {
                               updates['inventory.pickaxePower'] = increment(item.power || 0);
                             }
                             await updateDoc(doc(db, 'user_profiles', user.uid), updates);
                          }}
                          className={`w-full p-4 rounded-2xl border flex items-center gap-4 text-left transition-all ${
                            canAfford 
                              ? 'bg-neutral-800/40 border-white/10 hover:border-mc-gold/50 cursor-pointer' 
                              : 'bg-neutral-900 shadow-inner border-transparent opacity-40 cursor-not-allowed grayscale'
                          }`}
                        >
                          <div className={`p-3 rounded-xl ${canAfford ? 'bg-mc-gold/20 text-mc-gold' : 'bg-neutral-700 text-neutral-500'}`}>
                            <item.icon size={28} />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-white font-black truncate text-sm">{item.name}</span>
                              <span className={`font-black text-xs whitespace-nowrap ${canAfford ? 'text-mc-gold' : 'text-neutral-500'}`}>{item.price} 🪙</span>
                            </div>
                            <p className="text-neutral-500 text-[10px] truncate">{item.desc}</p>
                            <div className="mt-1 flex items-center gap-2">
                               <span className="text-[10px] font-black text-mc-gold uppercase bg-mc-gold/10 px-2 py-0.5 rounded">
                                 {'cps' in item ? `+${item.cps} CPS` : 'cpc' in item ? `+${item.cpc} CPC` : `+${item.power} KRAFT`}
                               </span>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {openingBox.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <div className="max-w-md w-full relative">
              <motion.div
                initial={{ scale: 0.5, y: 100 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white italic tracking-tighter">CASE OPENING</h2>
                  <p className="text-mc-gold font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">
                    Klicke 3 Mal zum Öffnen! ({openingBox.clicks}/3)
                  </p>
                </div>

                <div className="relative group perspective-1000">
                  <motion.div
                    animate={{ 
                      rotateY: openingBox.clicks * 360,
                      scale: 1 + (openingBox.clicks * 0.05),
                      filter: openingBox.clicks > 0 ? `brightness(${1 + (openingBox.clicks * 0.2)})` : 'none',
                      boxShadow: openingBox.rarity === 'LEGENDÄR' ? '0 0 120px rgba(255,170,0,0.6)' : 
                                 openingBox.rarity === 'EPIK' ? '0 0 100px rgba(168,85,247,0.6)' :
                                 openingBox.rarity === 'Selten' ? '0 0 80px rgba(59,130,246,0.6)' : '0 0 50px rgba(255,255,255,0.2)'
                    }}
                    onClick={handleBoxClick}
                    className="w-56 h-56 mx-auto cursor-pointer relative group/chest select-none active:scale-95 transition-transform"
                  >
                    {/* Minecraft-Style Chest Visual */}
                    <div className="absolute inset-0 flex flex-col">
                      {/* Chest Lid */}
                      <motion.div 
                        animate={{ 
                          rotateX: openingBox.clicks === 1 ? -15 : openingBox.clicks === 2 ? -35 : openingBox.clicks === 3 ? -90 : 0 
                        }}
                        style={{ originY: 'bottom' }}
                        className={`h-2/5 w-full rounded-t-xl border-4 border-black/40 relative z-20 transition-colors duration-500 ${
                          openingBox.rarity === 'LEGENDÄR' ? 'bg-gradient-to-b from-mc-gold to-[#cc8800]' : 
                          openingBox.rarity === 'EPIK' ? 'bg-gradient-to-b from-purple-500 to-purple-800' :
                          openingBox.rarity === 'Selten' ? 'bg-gradient-to-b from-blue-500 to-blue-800' : 
                          'bg-gradient-to-b from-[#8d6e63] to-[#5d4037]'
                        }`}
                      >
                        {/* Highlights on Lid */}
                        <div className="absolute inset-1 border border-white/20 rounded-t-lg" />
                        <div className="absolute top-2 left-2 w-2 h-2 bg-white/20 rounded-full" />
                      </motion.div>

                      {/* Chest Body */}
                      <div className={`h-3/5 w-full rounded-b-xl border-4 border-t-0 border-black/40 relative z-10 transition-colors duration-500 ${
                          openingBox.rarity === 'LEGENDÄR' ? 'bg-gradient-to-b from-[#cc8800] to-[#996600]' : 
                          openingBox.rarity === 'EPIK' ? 'bg-gradient-to-b from-purple-800 to-purple-950' :
                          openingBox.rarity === 'Selten' ? 'bg-gradient-to-b from-blue-800 to-blue-950' : 
                          'bg-gradient-to-b from-[#5d4037] to-[#3e2723]'
                        }`}
                      >
                         {/* The Lock */}
                         <motion.div 
                          animate={{ 
                            y: openingBox.clicks > 0 ? -5 : 0,
                            scale: openingBox.clicks > 0 ? 1.2 : 1
                          }}
                          className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-10 bg-[#e0e0e0] border-2 border-neutral-400 rounded-sm shadow-xl flex items-center justify-center z-30"
                         >
                           <div className="w-1 h-3 bg-neutral-600 rounded-full" />
                         </motion.div>
                         
                         {/* Inner Glow when clicking */}
                         {openingBox.clicks > 0 && (
                            <div className={`absolute inset-0 opacity-40 animate-pulse ${
                              openingBox.rarity === 'LEGENDÄR' ? 'bg-yellow-400' : 
                              openingBox.rarity === 'EPIK' ? 'bg-purple-400' :
                              openingBox.rarity === 'Selten' ? 'bg-blue-400' : 'bg-white'
                            }`} />
                         )}
                      </div>
                    </div>

                    {/* Particle Effects (simplified with glows) */}
                    {openingBox.clicks >= 2 && (
                       <div className="absolute -inset-10 pointer-events-none">
                         <div className={`absolute inset-0 blur-3xl opacity-30 animate-ping ${
                            openingBox.rarity === 'LEGENDÄR' ? 'bg-mc-gold' : 
                            openingBox.rarity === 'EPIK' ? 'bg-purple-500' :
                            'bg-blue-500'
                         }`} />
                       </div>
                    )}
                  </motion.div>

                  {/* Rarity Label Overlay */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={openingBox.rarity}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mt-8"
                    >
                      <span className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl border-2 ${
                        openingBox.rarity === 'LEGENDÄR' ? 'bg-mc-gold text-black border-yellow-400' :
                        openingBox.rarity === 'EPIK' ? 'bg-purple-600 text-white border-purple-400' :
                        openingBox.rarity === 'Selten' ? 'bg-blue-600 text-white border-blue-400' :
                        'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}>
                        {openingBox.rarity}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex gap-1 justify-center">
                  {[1, 2, 3].map(i => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        openingBox.clicks >= i ? 'w-8 bg-mc-gold' : 'w-2 bg-neutral-800'
                      }`} 
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Broadcast Banner */}
      <AnimatePresence>
        {broadcastMessage && !(chatOpen || shopOpen || newsOpen || pollsOpen || showAdmin || showLoginModal || showProfileModal || openingBox.isOpen || showMiningModal) && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-0 right-0 z-[90] flex justify-center px-4 pointer-events-none"
          >
            <div className="bg-mc-gold text-black px-6 py-2 rounded-b-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 border-x border-b border-white/20 pointer-events-auto">
              <Zap size={14} className="animate-bounce" />
              {broadcastMessage}
              <Zap size={14} className="animate-bounce" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className={`relative z-10 border-b border-neutral-800/50 bg-black/50 backdrop-blur-sm sticky top-0 transition-all duration-500 ${(chatOpen || shopOpen || newsOpen || pollsOpen || showAdmin || showLoginModal || showProfileModal || openingBox.isOpen || showMiningModal) ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mc-red rounded-lg flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-white/10 animate-pulse" />
              <Gamepad2 className="text-white relative z-10" size={24} />
            </div>
            <span className="font-extrabold text-xl tracking-tight hidden sm:block">MC HUB</span>
          </div>
          <div className="flex items-center gap-4">
            {!user ? (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="mc-button mc-button-primary py-2 text-sm shadow-lg shadow-mc-red/20"
              >
                <LogIn size={18} />
                Anmelden
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => openProfileEdit()}
                  className="mc-button mc-button-secondary py-2 text-sm hidden sm:flex border-mc-gold/20"
                >
                  <UserIcon size={18} className="text-mc-gold" />
                  Mein Profil
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
            {user && (
              <button 
                onClick={() => document.getElementById('clans')?.scrollIntoView({ behavior: 'smooth' })}
                className="mc-button mc-button-secondary py-2 text-sm hidden lg:flex border-mc-gold/20"
              >
                <Users size={18} className="text-mc-gold" />
                Clans
              </button>
            )}
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
            className="relative z-10 bg-neutral-900 border-b border-neutral-800 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-mc-gold font-bold flex items-center gap-2">
                    <ShieldCheck size={18} />
                    ADMIN CONTROL CENTER
                  </h4>
                  <p className="text-neutral-500 text-xs">Diese Sektion ist nur für dich sichtbar.</p>
                </div>
                <button onClick={() => setShowAdmin(false)} className="text-neutral-500 hover:text-white">
                  <LogOut size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Root Control for Block5 */}
                {isSuperAdmin && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 space-y-4">
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-widest flex items-center gap-2">
                       <Zap size={14} /> Root Control (Only Block5)
                    </span>
                    <div className="space-y-3">
                      <button 
                        onClick={toggleMaintenance}
                        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isMaintenanceMode ? 'bg-mc-red border-white/20 text-white shadow-lg shadow-mc-red/40' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}
                      >
                        {isMaintenanceMode ? 'Wartung Beenden' : 'Wartung Starten'}
                      </button>
                      <button 
                        onClick={setGlobalBroadcast}
                        className="w-full py-3 rounded-xl bg-mc-gold text-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-mc-gold/20"
                      >
                        Broadcast Pinnen
                      </button>
                      <p className="text-[9px] text-neutral-500 italic text-center px-4">
                        Shift + Alt + S zum schnellen Öffnen/Schließen
                      </p>
                    </div>
                  </div>
                )}

                {/* PVP Controls */}
                <div className="bg-black/40 border border-neutral-800 rounded-2xl p-6 space-y-4">
                  <span className="text-[10px] uppercase font-bold text-red-400 tracking-widest">PVP Server Control</span>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <button 
                        onClick={() => updateServerStatus('pvp', { online: !pvpStatus.online })}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${pvpStatus.online ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                      >
                        {pvpStatus.online ? 'Online' : 'Offline'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase font-bold">Max. Spieler</label>
                      <input 
                        type="number"
                        defaultValue={pvpStatus.maxPlayers}
                        onBlur={(e) => updateServerStatus('pvp', { maxPlayers: parseInt(e.target.value) || 10 })}
                        className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-xs focus:border-mc-gold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase font-bold">Realm Code</label>
                      <input 
                        type="text"
                        defaultValue={realmCodes.PVP}
                        onBlur={(e) => updateRealmCode('pvp', e.target.value)}
                        className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-xs focus:border-mc-gold outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => addRandomPlayer('pvp')} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                         <UserPlus size={12} /> +1 Spieler
                      </button>
                    </div>
                  </div>
                </div>

                {/* Survival Controls */}
                <div className="bg-black/40 border border-neutral-800 rounded-2xl p-6 space-y-4">
                  <span className="text-[10px] uppercase font-bold text-mc-red tracking-widest">Survival Server Control</span>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <button 
                        onClick={() => updateServerStatus('survival', { online: !survivalStatus.online })}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${survivalStatus.online ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                      >
                        {survivalStatus.online ? 'Online' : 'Offline'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase font-bold">Max. Spieler</label>
                      <input 
                        type="number"
                        defaultValue={survivalStatus.maxPlayers}
                        onBlur={(e) => updateServerStatus('survival', { maxPlayers: parseInt(e.target.value) || 10 })}
                        className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-xs focus:border-mc-gold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase font-bold">Realm Code</label>
                      <input 
                        type="text"
                        defaultValue={realmCodes.SURVIVAL}
                        onBlur={(e) => updateRealmCode('survival', e.target.value)}
                        className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-xs focus:border-mc-gold outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => addRandomPlayer('survival')} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-xs py-2 rounded-lg flex items-center justify-center gap-1">
                         <UserPlus size={12} /> +1 Spieler
                      </button>
                    </div>
                  </div>
                </div>

                {/* Global Actions */}
                <div className="bg-black/40 border border-neutral-800 rounded-2xl p-6 space-y-4">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Global Tools</span>
                  <div className="flex flex-col gap-3">
                    <button onClick={clearPlayers} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs py-3 rounded-xl border border-red-500/20 flex items-center justify-center gap-2">
                      <Trash2 size={14} /> ONLINE-LISTEN WIPE
                    </button>
                    <button onClick={clearProfiles} className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs py-3 rounded-xl border border-orange-500/20 flex items-center justify-center gap-2">
                       <UserMinus size={14} /> DATABASE PURGE (PROFILE)
                    </button>
                    <button onClick={clearChat} className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs py-3 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2">
                       <MessageCircle size={14} /> CHAT HISTORY CLEAR
                    </button>
                    <button onClick={totalReset} className="w-full bg-white/5 hover:bg-white/10 text-white text-[10px] py-2 rounded-lg border border-white/10 flex items-center justify-center gap-2 mt-4 opacity-50 hover:opacity-100 transition-opacity">
                       <ShieldCheck size={12} /> NUCLEAR RESET
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Group - Hide when any overlay is open */}
      <AnimatePresence>
        {!(chatOpen || shopOpen || newsOpen || pollsOpen || showAdmin || showLoginModal || showProfileModal || openingBox.isOpen || showMiningModal) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-8 right-8 z-[80] flex flex-col sm:flex-row gap-3"
          >
            {/* Mining Game Button */}
            <button 
              onClick={() => { setShowMiningModal(true); setShopOpen(false); setNewsOpen(false); setPollsOpen(false); setChatOpen(false); }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${showMiningModal ? 'bg-mc-gold text-black' : 'bg-black border border-neutral-800 text-white'}`}
              title="Mining Minispiel"
            >
              <Pickaxe size={24} />
            </button>

            {/* Shop Button */}
            <button 
              onClick={() => { setShopOpen(!shopOpen); setNewsOpen(false); setPollsOpen(false); setChatOpen(false); }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${shopOpen ? 'bg-mc-gold text-black' : 'bg-black border border-neutral-800 text-white'}`}
              title="Globaler Shop"
            >
              <ShoppingBag size={24} />
            </button>

            {/* News Button */}
            <button 
              onClick={() => { setNewsOpen(!newsOpen); setPollsOpen(false); setChatOpen(false); }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${newsOpen ? 'bg-mc-red text-white' : 'bg-black border border-neutral-800 text-white'}`}
              title="News-Feed"
            >
              <Newspaper size={24} />
            </button>

            {/* Polls Button */}
            <button 
              onClick={() => { setPollsOpen(!pollsOpen); setNewsOpen(false); setChatOpen(false); }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${pollsOpen ? 'bg-mc-red text-white' : 'bg-black border border-neutral-800 text-white'}`}
              title="Umfragen"
            >
              <Vote size={24} />
            </button>

            {/* Chat Button */}
            <button 
              onClick={() => { setChatOpen(!chatOpen); setNewsOpen(false); setPollsOpen(false); setShopOpen(false); }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${chatOpen ? 'bg-mc-red text-white rotate-90' : 'bg-black border border-neutral-800 text-white'}`}
              title="Chat"
            >
              {chatOpen ? <X size={28} /> : <MessageCircle size={28} />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* News Drawer */}
      <AnimatePresence>
        {newsOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-black/95 backdrop-blur-xl z-[70] border-l border-neutral-800 shadow-2xl flex flex-col pt-20"
          >
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Newspaper className="text-mc-red" />
                  News-Feed
                </h3>
                <p className="text-neutral-500 text-xs">Aktuelle Updates & Ankündigungen</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); addNews(); }}
                    className="p-2 bg-mc-gold text-black rounded-lg hover:bg-mc-gold/80 transition-all shadow-lg active:scale-95"
                    title="News hinzufügen"
                  >
                    <Plus size={20} />
                  </button>
                )}
                <button onClick={() => setNewsOpen(false)} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {news.length === 0 ? (
                <div className="text-center py-10 opacity-30 text-xs uppercase tracking-widest">Keine News verfügbar</div>
              ) : news.map((item) => (
                <div key={item.id} className="mc-card p-4 border-neutral-800 hover:border-mc-red/30 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm text-mc-red">{item.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-500">
                        {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Gerade eben'}
                      </span>
                      {isAdmin && (
                        <button 
                          onClick={() => deleteNewsItem(item.id)}
                          className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Polls Drawer */}
      <AnimatePresence>
        {pollsOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-black/95 backdrop-blur-xl z-[70] border-l border-neutral-800 shadow-2xl flex flex-col pt-20"
          >
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Vote className="text-mc-red" />
                  Community Umfragen
                </h3>
                <p className="text-neutral-500 text-xs">Deine Meinung zählt!</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); addPoll(); }}
                    className="p-2 bg-mc-gold text-black rounded-lg hover:bg-mc-gold/80 transition-all shadow-lg active:scale-95"
                    title="Umfrage erstellen"
                  >
                    <Plus size={20} />
                  </button>
                )}
                <button onClick={() => setPollsOpen(false)} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {polls.length === 0 ? (
                <div className="text-center py-10 opacity-30 text-xs uppercase tracking-widest">Keine Umfragen verfügbar</div>
              ) : polls.map((poll) => {
                const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes, 0);
                return (
                  <div key={poll.id} className="space-y-4 relative group">
                    <div className={`p-4 rounded-xl border transition-all ${poll.isActive ? 'bg-mc-red/10 border-mc-red/20' : 'bg-neutral-900 border-neutral-800 opacity-80'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-sm">{poll.question}</h4>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button onClick={() => togglePollStatus(poll.id)} className="p-1 hover:bg-black/20 rounded">
                              {poll.isActive ? <Lock size={12} title="Beenden" /> : <Unlock size={12} title="Aktivieren" />}
                            </button>
                            <button onClick={() => deletePoll(poll.id)} className="p-1 hover:bg-black/20 rounded text-red-500">
                              <Trash2 size={12} title="Löschen" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {!poll.isActive && <p className="text-[10px] text-neutral-500 uppercase font-bold mb-2">Beendet</p>}
                      
                      <div className="space-y-2">
                        {poll.options.map((opt, idx) => (
                          <button 
                            key={idx}
                            disabled={!poll.isActive}
                            onClick={() => votePoll(poll.id, idx)}
                            className={`w-full bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-left text-xs hover:border-mc-red/50 transition-all relative overflow-hidden group ${!poll.isActive ? 'cursor-default' : ''}`}
                          >
                            <div className="relative z-10 flex justify-between">
                              <span>{opt.label}</span>
                              <span className="text-neutral-500">{totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0}%</span>
                            </div>
                            <div className="absolute inset-y-0 left-0 bg-mc-red/10 transition-all duration-500" style={{ width: `${totalVotes > 0 ? (opt.votes / totalVotes) * 100 : 0}%` }} />
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-[9px] text-neutral-500 text-right uppercase tracking-widest">{totalVotes} Stimmen insgesamt</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shop Drawer */}
      <AnimatePresence>
        {shopOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-black/95 backdrop-blur-xl z-[70] border-l border-neutral-800 shadow-2xl flex flex-col pt-20"
          >
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingBag className="text-mc-gold" />
                  Globaler Shop
                </h3>
                <p className="text-neutral-500 text-xs">Kaufe Ränge, Items und mehr mit Coins</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setShowMyItems(!showMyItems); setShowLogs(false); }}
                  className={`p-2 rounded-lg transition-all shadow-lg active:scale-95 ${showMyItems ? 'bg-mc-blue text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
                  title="Meine Käufe"
                >
                  <Package size={20} />
                </button>
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => { setShowLogs(!showLogs); setShowMyItems(false); }}
                      className={`p-2 rounded-lg transition-all shadow-lg active:scale-95 ${showLogs ? 'bg-mc-red text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
                      title="Verkauf-Logs"
                    >
                      <History size={20} />
                    </button>
                    {!showLogs && !showMyItems && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); addShopItem(); }}
                        className="p-2 bg-mc-gold text-black rounded-lg hover:bg-mc-gold/80 transition-all shadow-lg active:scale-95"
                        title="Item hinzufügen"
                      >
                        <Plus size={20} />
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setShopOpen(false)} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-mc-gold/5 border-b border-mc-gold/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-mc-gold tracking-widest">Dein Guthaben</span>
                  <span className="text-[9px] text-neutral-500 font-medium">Verfügbar für Käufe</span>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={claimDailyReward}
                    className="flex items-center gap-2 px-3 py-1.5 bg-mc-gold text-black rounded-lg font-bold text-[10px] uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-lg"
                  >
                    🎁 Daily Bonus
                  </button>
                  <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full border border-mc-gold/20 shadow-[0_0_15px_rgba(255,170,0,0.1)]">
                    <span className="text-mc-gold font-black">{myProfile?.coins?.toLocaleString() || 0}</span>
                    <Coins size={14} className="text-mc-gold" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-900 rounded-lg border border-neutral-800">
                  <Key size={10} className="text-mc-gold" />
                  <span className="text-[10px] text-white font-bold">{myProfile?.inventory?.keys || 0}</span>
                  <span className="text-[8px] text-neutral-500 uppercase font-black">Keys</span>
                </div>
                {myProfile?.perks?.flightUntil && myProfile.perks.flightUntil > Date.now() && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-mc-blue/10 rounded-lg border border-mc-blue/20 animate-pulse">
                    <Rocket size={10} className="text-mc-blue" />
                    <span className="text-[8px] text-mc-blue uppercase font-black italic">Flug Aktiv</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
              {showMyItems ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-mc-blue">Meine Sammlung</h4>
                    <Package size={14} className="text-mc-blue" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {myPurchases.map((p) => (
                      <div key={p.id} className="p-4 bg-neutral-900/40 border border-neutral-800 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-mc-blue/20 flex items-center justify-center border border-mc-blue/20">
                             <Check size={16} className="text-mc-blue" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white group-hover:text-mc-blue transition-colors">{p.itemName}</div>
                            <div className="text-[9px] text-neutral-500 uppercase tracking-tighter">{p.category}</div>
                          </div>
                        </div>
                        <div className="text-[8px] text-neutral-600 font-mono">
                          {p.boughtAt?.toDate().toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    ))}
                    {myPurchases.length === 0 && (
                      <div className="text-center py-20 opacity-20">
                        <ShoppingBag size={48} className="mx-auto mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest">Du hast noch nichts gekauft</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : showLogs && isAdmin ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-mc-red">Verkaufs-Protokoll</h4>
                    <Activity size={14} className="text-mc-red animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    {shopLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800 flex justify-between items-center group">
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-mc-gold transition-colors">{log.userName}</div>
                          <div className="text-[10px] text-neutral-500">{log.itemName}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-mc-gold">-{log.price} C</div>
                          <div className="text-[9px] text-neutral-600">
                            {log.createdAt?.toDate().toLocaleTimeString('de-DE')}
                          </div>
                        </div>
                      </div>
                    ))}
                    {shopLogs.length === 0 && (
                      <div className="text-center py-10 text-neutral-600 italic text-xs">Noch keine Verkäufe verzeichnet.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Rank Status Info */}
                  {myProfile?.role && myProfile.role !== 'Spieler' && (
                    <div className="p-4 bg-mc-gold/10 border border-mc-gold/20 rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-mc-gold/20 flex items-center justify-center shadow-[0_0_20px_rgba(255,170,0,0.2)]">
                        <Award size={24} className="text-mc-gold" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-black tracking-widest text-mc-gold">Aktivierter Rang</div>
                        <div className="text-xl font-black text-white">{myProfile.role}</div>
                        <div className="text-[9px] text-neutral-400 mt-1 italic">Vorteil: Erhöhter Daily-Bonus aktiviert!</div>
                      </div>
                    </div>
                  )}

                  {['Ränge', 'Items', 'Vorteile', 'Boxen'].map((cat) => {
                    const items = shopItems.filter(i => i.category === cat);
                    if (items.length === 0 && !isAdmin) return null;
                    
                    return (
                      <div key={cat} className="space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-mc-gold/10 rounded-lg border border-mc-gold/20">
                            {cat === 'Ränge' && <Award size={16} className="text-mc-gold" />}
                            {cat === 'Items' && <Sword size={16} className="text-mc-gold" />}
                            {cat === 'Vorteile' && <Zap size={16} className="text-mc-gold" />}
                            {cat === 'Boxen' && <Box size={16} className="text-mc-gold" />}
                          </div>
                          <h4 className="text-xs uppercase font-black text-white tracking-[0.25em]">{cat}</h4>
                          <div className="h-px flex-1 bg-gradient-to-r from-neutral-800 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          {items.map((item) => {
                            const isOwnRank = item.category === 'Ränge' && myProfile?.role === item.name.replace(' Rang', '').trim();
                            
                            return (
                              <motion.div 
                                key={item.id} 
                                whileHover={{ y: -4, scale: 1.01 }}
                                className={`mc-card p-5 border-neutral-800 hover:border-mc-gold/50 transition-all group relative overflow-hidden bg-gradient-to-br from-neutral-900/40 to-black select-none ${item.price >= 10000 ? 'border-l-4 border-l-mc-gold' : ''} ${isOwnRank ? 'opacity-70 grayscale-[0.5]' : ''}`}
                              >
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-extrabold text-base text-gray-100 group-hover:text-mc-gold transition-colors">
                                        {item.name}
                                      </h5>
                                      {item.price >= 10000 && (
                                        <span className="bg-mc-gold/20 text-mc-gold text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-mc-gold/20">PREMIUM</span>
                                      )}
                                      {isOwnRank && (
                                        <span className="bg-mc-gold text-black text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-[0_0_10px_rgba(255,170,0,0.5)]">DEIN RANG</span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-neutral-400 leading-snug max-w-[260px] font-medium italic opacity-80">
                                      {item.description}
                                    </p>
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-3 translate-x-2 group-hover:translate-x-0 transition-transform">
                                    <div className="flex items-center gap-1 group/admin">
                                      {isAdmin && (
                                        <>
                                          <button 
                                            onClick={() => editShopItem(item)}
                                            className="text-blue-500/30 hover:text-blue-400 transition-all p-1.5 bg-blue-500/5 rounded-lg border border-blue-500/0 hover:border-blue-500/20"
                                            title="Bearbeiten"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                          <button 
                                            onClick={() => deleteShopItem(item.id)}
                                            className="text-red-500/30 hover:text-red-500 transition-all p-1.5 bg-red-500/5 rounded-lg border border-red-500/0 hover:border-red-500/20"
                                            title="Löschen"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    
                                    <div className="relative group/btn">
                                      <button 
                                        onClick={() => buyItem(item)}
                                        disabled={isOwnRank || !myProfile || (myProfile?.coins || 0) < item.price}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xl active:scale-95 flex items-center gap-2 border-b-4 ${isOwnRank ? 'bg-neutral-800 text-neutral-500 border-neutral-900' : (!myProfile || (myProfile?.coins || 0) < item.price) ? 'bg-neutral-800 text-neutral-500 border-neutral-900 cursor-not-allowed opacity-50' : 'bg-mc-gold text-black border-mc-gold/40 hover:bg-white hover:border-white hover:-translate-y-0.5'}`}
                                      >
                                        {isOwnRank ? 'AKTIVIERT' : item.price.toLocaleString()} {!isOwnRank && <Coins size={12} />}
                                      </button>
                                      {myProfile && (myProfile?.coins || 0) < item.price && !isOwnRank && (
                                        <div className="absolute bottom-full right-0 mb-2 bg-mc-red text-white text-[9px] px-2 py-1 rounded shadow-lg opacity-0 group-hover/btn:opacity-100 whitespace-nowrap transition-opacity pointer-events-none font-bold uppercase tracking-widest border border-red-500">
                                          Nicht genug Coins!
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/30">
                             <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${item.price > 10000 ? 'bg-mc-gold animate-pulse' : 'bg-green-500'}`} />
                                <span className={`text-[9px] uppercase font-black tracking-[0.1em] ${item.price > 10000 ? 'text-mc-gold' : 'text-neutral-500'}`}>
                                  {item.price > 10000 ? 'Legendärer Gegenstand' : 'Verfügbar'}
                                </span>
                             </div>
                             <div className="flex items-center gap-1 opacity-20 hover:opacity-100 transition-opacity cursor-help">
                               <Info size={10} className="text-white" />
                               <span className="text-[8px] text-neutral-400 font-mono">UID:{item.id.slice(0,4)}</span>
                             </div>
                          </div>

                          {/* Glow Effects */}
                          <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 transition-all duration-700 opacity-20 pointer-events-none ${item.price >= 10000 ? 'bg-mc-gold' : 'bg-mc-blue'}`} />
                          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-mc-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                      );
                    })}
                    {items.length === 0 && isAdmin && (
                        <button 
                          onClick={seedShop}
                          className="text-center py-8 opacity-20 text-[10px] uppercase tracking-[0.3em] border-2 border-dashed border-neutral-800 rounded-2xl font-bold hover:opacity-100 hover:border-mc-gold/50 transition-all flex flex-col items-center gap-2 group"
                        >
                          <Plus className="group-hover:scale-125 transition-transform" />
                          Beispiel-Items generieren
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {shopItems.length === 0 && !isAdmin && (
                <div className="text-center py-24 opacity-30 flex flex-col items-center">
                  <div className="relative mb-6">
                    <ShoppingBag size={64} className="opacity-10 animate-pulse text-mc-gold" />
                    <X size={32} className="absolute inset-0 m-auto text-mc-red opacity-50" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.3em] font-black">Lager leer</p>
                  <p className="text-[10px] text-neutral-500 mt-2">Die Händler sind gerade auf Reisen...</p>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="p-4 border-t border-neutral-800 bg-neutral-900/30 flex items-center justify-between">
                <div className="text-[8px] uppercase font-black tracking-widest text-neutral-600">Admin-Konsole</div>
                <button 
                  onClick={async () => {
                    if (!user || !myProfile) return;
                    await setDoc(doc(db, 'user_profiles', user.uid), { coins: (myProfile?.coins || 0) + 10000 }, { merge: true });
                    alert("💸 10.000 Coins gutgeschrieben (Admin-Cheat)!");
                  }}
                  className="px-3 py-1 bg-neutral-800 hover:bg-mc-gold hover:text-black transition-all rounded text-[9px] font-bold uppercase tracking-tighter"
                >
                  +10k Coins (Test)
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-black/95 backdrop-blur-xl z-[70] border-l border-neutral-800 shadow-2xl flex flex-col pt-20"
          >
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MessageCircle className="text-mc-red" />
                  Community Chat
                </h3>
                <p className="text-neutral-500 text-xs">Schreibe mit anderen Spielern</p>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                title="Schließen"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {[...chatMessages, ...localMessages]
                .sort((a, b) => {
                  const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
                  const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
                  return timeA - timeB;
                })
                .map((msg) => (
                <div key={msg.id} className={`flex flex-col group ${msg.userId === user?.uid ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      msg.userId === 'system' ? 'text-mc-gold' : 'text-neutral-500'
                    }`}>
                      {msg.displayName}
                    </span>
                    {msg.role && msg.role !== 'Member' && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase text-white ${
                        msg.role === 'Admin' || msg.role === 'Root' ? 'bg-mc-gold' : 
                        msg.role === 'Mod' ? 'bg-mc-red' : 
                        'bg-purple-500'
                      }`}>
                        {msg.role}
                      </span>
                    )}
                    {msg.isLocal && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-black uppercase bg-neutral-800 text-neutral-400 border border-neutral-700">
                        Privat
                      </span>
                    )}
                    {isAdmin && msg.userId !== 'system' && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteSingleMessage(msg.id);
                        }}
                        className="bg-red-600/40 hover:bg-red-600 text-white rounded-lg p-1 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                        title="NACHRICHT TERMINIEREN"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm relative transition-all hover:ring-1 hover:ring-mc-red/30 whitespace-pre-wrap ${
                    msg.isAction ? 'italic text-neutral-400 bg-transparent py-1 px-0 shadow-none' :
                    msg.isLocal ? 'bg-neutral-900 border border-neutral-800 text-neutral-300 italic' :
                    msg.userId === user?.uid ? 'bg-mc-red text-white shadow-lg shadow-mc-red/10' : 'bg-neutral-800 text-neutral-200'
                  }`}>
                    {msg.text.replace(/§[a-z0-9]/g, '')}
                  </div>
                </div>
              ))}
              {chatMessages.length === 0 && localMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 text-center space-y-4">
                   <div className="p-4 bg-neutral-900 rounded-full">
                     <MessageCircle size={32} />
                   </div>
                   <p className="text-xs italic">Noch keine Nachrichten... fang an zu schreiben!</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-800 relative">
              {/* QUICK COMMAND MENU */}
              <AnimatePresence>
                {showCommandMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-6 right-6 mb-2 p-2 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 grid grid-cols-2 gap-2"
                  >
                    {[
                      { icon: HelpCircle, label: 'Hilfe', cmd: '/help' },
                      { icon: Coins, label: 'Coins', cmd: '/coins' },
                      { icon: Users, label: 'Spieler', cmd: '/list' },
                      { icon: MessageSquare, label: 'Status', cmd: '/me ' },
                      { icon: Scroll, label: 'Regeln', cmd: '/rules' },
                      { icon: Globe, label: 'Discord', cmd: '/discord' },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setChatInput(item.cmd);
                          setShowCommandMenu(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-neutral-800 rounded-xl transition-colors text-left"
                      >
                        <item.icon size={16} className="text-mc-red" />
                        <span className="text-xs font-medium text-neutral-300">{item.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {user ? (
                <form onSubmit={sendMessage} className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowCommandMenu(!showCommandMenu)}
                    className={`p-3 rounded-xl transition-all border ${showCommandMenu ? 'bg-mc-red text-white border-mc-red' : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}
                    title="Schnelle Befehle"
                  >
                    <Command size={20} />
                  </button>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Sende eine Nachricht oder /Befehl..."
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:border-mc-red outline-none transition-colors"
                  />
                  <button 
                    type="submit"
                    className="p-3 bg-mc-red rounded-xl hover:bg-mc-red/90 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </form>
              ) : (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="w-full py-3 bg-neutral-800 rounded-xl text-neutral-400 text-sm font-medium hover:bg-neutral-700 transition-colors"
                >
                  Anmelden zum Chatten
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-24 transition-all duration-500 ${(chatOpen || shopOpen || newsOpen || pollsOpen || showAdmin || showLoginModal || showProfileModal || openingBox.isOpen || showMiningModal) ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
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
              Bester <br />
              <span className="text-mc-red">Minecraft Realm.</span>
            </h1>
            <p className="text-neutral-400 text-lg md:text-xl mb-10 max-w-xl text-wrap">
              Willkommen auf dem Hub des besten Minecraft Realms. Entdecke neue Welten, nimm an Events teil und werde Teil unserer wachsenden Community.
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
                  className="relative group cursor-pointer"
                  onClick={() => isAdmin && p.type === 'profile' && openProfileEdit(p.userId)}
                >
                  <img 
                    src={p.type === 'profile' ? (userProfiles.find(prof => prof.userId === p.userId)?.customSkin || `https://mc-heads.net/avatar/${p.username}`) : `https://mc-heads.net/avatar/${p.username}`} 
                    alt={`${p.username} Minecraft Profil`}
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
                          {combinedPvpPlayers.length} / {pvpStatus.maxPlayers} Online
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
                      {combinedPvpPlayers.length > 0 ? combinedPvpPlayers.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded-lg border border-neutral-800 text-xs group/item relative overflow-hidden">
                          <div className="w-2 h-2 rounded-full bg-mc-red shadow-sm shadow-red-500/50" />
                          <span className="flex items-center gap-1.5">
                            {p.username}
                            {isAdmin && (p as any).ip && (
                              <span className="text-[9px] font-mono text-mc-red bg-red-500/10 px-1 rounded border border-red-500/20">
                                {(p as any).ip}
                              </span>
                            )}
                            {p.role && p.role !== 'Member' && (
                              <span className={`text-[8px] px-1 py-0.5 rounded-sm font-bold uppercase ${
                                p.role === 'Admin' ? 'bg-mc-gold text-black' :
                                p.role === 'Mod' ? 'bg-mc-red text-white' :
                                'bg-purple-500 text-white'
                              }`}>
                                {p.role}
                              </span>
                            )}
                          </span>
                          {isAdmin && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); kickPlayer({ id: p.id, type: p.type as any }); }}
                              className="ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity text-neutral-500 hover:text-mc-red"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      )) : (
                        <span className="text-xs text-neutral-600 italic">Warte auf Spieler...</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div 
                  onClick={() => copyToClipboard(realmCodes.PVP, 'pvp')}
                  className="mt-auto bg-black/40 border border-neutral-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-colors group/code"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Realm Code</span>
                    <span className="font-mono text-xl text-mc-gold group-hover/code:text-white transition-colors">
                      {realmCodes.PVP}
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
                          {combinedSurvivalPlayers.length} / {survivalStatus.maxPlayers} Online
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
                      {combinedSurvivalPlayers.length > 0 ? combinedSurvivalPlayers.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded-lg border border-neutral-800 text-xs group/item relative overflow-hidden">
                          <div className="w-2 h-2 rounded-full bg-mc-red shadow-sm shadow-red-500/50" />
                          <span className="flex items-center gap-1.5">
                            {p.username}
                            {isAdmin && (p as any).ip && (
                              <span className="text-[9px] font-mono text-mc-red bg-red-500/10 px-1 rounded border border-red-500/20">
                                {(p as any).ip}
                              </span>
                            )}
                            {p.role && p.role !== 'Member' && (
                              <span className={`text-[8px] px-1 py-0.5 rounded-sm font-bold uppercase ${
                                p.role === 'Admin' ? 'bg-mc-gold text-black' :
                                p.role === 'Mod' ? 'bg-mc-red text-white' :
                                'bg-purple-500 text-white'
                              }`}>
                                {p.role}
                              </span>
                            )}
                          </span>
                          {isAdmin && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); kickPlayer({ id: p.id, type: p.type as any }); }}
                              className="ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity text-neutral-500 hover:text-mc-red"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      )) : (
                        <span className="text-xs text-neutral-600 italic">Warte auf Spieler...</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div 
                  onClick={() => copyToClipboard(realmCodes.SURVIVAL, 'survival')}
                  className="mt-auto bg-black/40 border border-neutral-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-neutral-700 transition-colors group/code"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Realm Code</span>
                    <span className="font-mono text-xl text-mc-gold group-hover/code:text-white transition-colors">
                      {realmCodes.SURVIVAL}
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
              {communityDisplayList.map((p) => (
                <motion.div 
                  key={p.userId || p.username}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mc-card p-4 flex flex-col items-center text-center border-neutral-800/50 transition-colors group relative ${isAdmin ? 'hover:border-mc-gold/50 cursor-pointer' : 'hover:border-mc-red/30'}`}
                  onClick={() => {
                    if (isAdmin && p.userId) {
                      openProfileEdit(p.userId);
                    }
                  }}
                >
                  {isAdmin && p.lastLoginIp && (
                    <div className={`absolute inset-0 bg-black/95 opacity-0 group-hover:opacity-100 transition-opacity z-40 flex flex-col items-center justify-center p-2 text-center pointer-events-none border-2 ${p.isOnline ? 'border-red-600' : 'border-mc-gold/50'} rounded-xl`}>
                      <div className="flex items-center gap-1 mb-1">
                        <ShieldAlert size={10} className={p.isOnline ? 'text-red-500 animate-pulse' : 'text-mc-gold'} />
                        <p className="text-[9px] font-black text-mc-gold uppercase tracking-tighter">Live Transmission</p>
                      </div>
                      <p className="text-[14px] font-mono text-white mb-1 font-black select-all tracking-tight bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {p.lastLoginIp}
                      </p>
                      <div className="flex flex-col gap-1 w-full px-2">
                        <div className="flex items-center justify-between text-[7px] text-neutral-500 font-bold uppercase mb-1">
                          <span>{p.lastLoginCity || 'Unknown'}</span>
                          <span>{p.isOnline ? 'ACTIVE' : 'IDLE'}</span>
                        </div>
                        <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                          <motion.div 
                            animate={p.isOnline ? { x: [-20, 100] } : {}}
                            transition={p.isOnline ? { repeat: Infinity, duration: 1.5, ease: "linear" } : {}}
                            className={`h-full w-4 ${p.isOnline ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-neutral-700'}`} 
                          />
                        </div>
                        {isAdmin && p.isOnline && (
                          <button 
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!p.userId) return;
                              const btn = e.currentTarget;
                              btn.innerHTML = 'SYNC...';
                              btn.style.borderColor = '#ff0000';
                              
                              await updateDoc(doc(db, 'user_profiles', p.userId), { requestIpUpdate: true });
                              
                              notifyDiscord(
                                "📡 FERN-PING AUSGELÖST",
                                `Eine manuelle IP-Standortabfrage wurde gestartet.`,
                                16711680,
                                [
                                  { name: "🛡️ Admin", value: myProfile?.displayName || 'System', inline: true },
                                  { name: "🎯 Ziel", value: p.username || p.displayName || 'Unbekannt', inline: true },
                                  { name: "⚡ Status", value: "Signal gesendet...", inline: true }
                                ]
                              );
                              
                              setTimeout(() => { if(btn) btn.innerHTML = 'PING IP'; }, 2000);
                            }}
                            className="mt-2 pointer-events-auto bg-mc-red/20 border border-mc-red/40 text-mc-red text-[8px] font-black uppercase py-1 px-2 rounded hover:bg-mc-red hover:text-white transition-all"
                          >
                            Ping IP
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 z-20">
                    {p.role && p.role !== 'Member' && (
                      <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm ${
                        p.role === 'Admin' ? 'bg-mc-gold text-black' :
                        p.role === 'Mod' ? 'bg-mc-red text-white' :
                        p.role === 'VIP' ? 'bg-purple-500 text-white' : 
                        p.role === 'Besucher' ? 'bg-neutral-700 text-neutral-300' : ''
                      }`}>
                        {p.role}
                      </div>
                    )}
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if(p.isOnline) {
                              kickPlayer({ id: p.userId || p.username, type: p.type });
                            } else if (p.userId) {
                              deleteProfile(p.userId);
                            }
                          }}
                          className="p-1.5 bg-red-600/30 text-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-lg border border-red-500/30"
                          title={p.isOnline ? "Spieler Kicken/Entfernen" : "Account Terminieren"}
                        >
                          {p.isOnline ? <UserMinus size={14} /> : <Trash2 size={14} />}
                        </button>
                        <div className="p-1.5 bg-mc-gold/20 text-mc-gold rounded-lg border border-mc-gold/20">
                          <ShieldCheck size={14} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative mb-4">
                    <img 
                      src={p.profile?.customSkin || `https://mc-heads.net/avatar/${p.username || 'steve'}`} 
                      alt={`${p.displayName} Community Mitglied`}
                      className="w-16 h-16 rounded-lg bg-neutral-900 pixelated border-2 border-neutral-800 group-hover:border-mc-red/50 transition-colors object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${p.isOnline ? 'bg-green-500' : 'bg-neutral-600'}`} />
                  </div>
                  <h4 className="font-bold text-sm truncate w-full mb-1">{p.displayName}</h4>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{p.isOnline ? 'Online' : 'Offline'}</p>
                    {p.isOnline && p.server && p.server !== 'none' && (
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${p.server === 'pvp' ? 'bg-red-500/20 text-red-400' : 'bg-mc-red/20 text-mc-red'}`}>
                        {p.server}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              {!user && (
                <div 
                  onClick={() => setShowLoginModal(true)}
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

        {/* Clan System Section */}
        <section id="clans" className="mb-12 py-8 border-t border-neutral-800/50">
          <div 
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 cursor-pointer group"
            onClick={() => setIsClansOpen(!isClansOpen)}
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Users className={`transition-colors ${isClansOpen ? "text-mc-gold" : "text-neutral-500"}`} size={32} />
                <h2 className="text-3xl font-bold flex items-center gap-4">
                  Clan-System
                  <motion.div
                    animate={{ rotate: isClansOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <ChevronDown size={24} className="text-neutral-600 group-hover:text-white transition-colors" />
                  </motion.div>
                </h2>
              </div>
              <p className="text-neutral-400">Schließe dich mit anderen zusammen und dominiert gemeinsam.</p>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              {/* Mini Leaderboard Tags */}
              <div className="hidden md:flex items-center gap-2 bg-neutral-900/50 p-2 rounded-xl border border-neutral-800">
                <BarChart2 size={14} className="text-mc-gold ml-2" />
                <span className="text-[10px] font-black uppercase text-neutral-500 mr-2">Top Clans:</span>
                {clans
                  .sort((a,b) => (b.level||0) - (a.level||0))
                  .slice(0, 3)
                  .map((c, i) => (
                    <span key={c.id} className="text-[10px] font-bold px-2 py-1 bg-black/40 rounded border border-neutral-800">
                      <span className="text-mc-gold mr-1">#{i+1}</span> {c.tag}
                    </span>
                  ))
                }
              </div>

              {user && !myClan && isClansOpen && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowCreateClan(true); }}
                  className="mc-button mc-button-primary"
                >
                  <UserPlus size={20} />
                  Clan gründen
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {isClansOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                  {/* Clan List */}
                  <div className="lg:col-span-2 space-y-4">
                    {clans
                      .sort((a, b) => {
                        if ((b.level || 1) !== (a.level || 1)) return (b.level || 1) - (a.level || 1);
                        return (b.xp || 0) - (a.xp || 0);
                      })
                      .map(clan => (
                      <motion.div 
                        key={clan.id}
                        layout
                        className={`mc-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors cursor-pointer ${activeClanId === clan.id ? 'border-mc-gold bg-mc-gold/[0.02]' : 'border-neutral-800 hover:border-neutral-700'}`}
                        onClick={() => setActiveClanId(clan.id)}
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-neutral-900 rounded-xl border border-neutral-800 flex items-center justify-center text-2xl font-bold text-mc-red pixelated">
                            {clan.tag}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                              {clan.name}
                              <span className="text-xs font-mono bg-mc-red/10 text-mc-red px-2 py-0.5 rounded">[{clan.tag}]</span>
                              <span className="text-[10px] bg-mc-gold text-black px-1.5 rounded font-black">LVL {clan.level || 1}</span>
                            </h3>
                            <p className="text-neutral-500 text-sm italic mb-2">{clan.description || 'Keine Beschreibung'}</p>
                            <div className="flex items-center gap-4 text-[10px] text-neutral-600 uppercase font-bold tracking-widest">
                              <span className="flex items-center gap-1"><Users size={12} /> {clan.memberCount} Mitglieder</span>
                              <span className="flex items-center gap-1"><Activity size={12} /> Seit {new Date(clan.createdAt?.seconds * 1000).toLocaleDateString() || '...'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                          {user?.uid === clan.leaderId ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteClan(clan.id); }}
                              className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20"
                            >
                              <Trash2 size={20} />
                            </button>
                          ) : clanMembers.some(m => m.userId === user?.uid) ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); leaveClan(clan.id); }}
                              className="mc-button border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs py-2 px-4"
                            >
                              Verlassen
                            </button>
                          ) : clanRequests.some(r => r.userId === user?.uid) ? (
                            <button 
                              disabled
                              className="mc-button opacity-50 border-neutral-700 text-neutral-500 text-xs py-2 px-4 cursor-not-allowed"
                            >
                              Anfrage läuft
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const msg = prompt('Nachricht an den Clan-Leader:');
                                if (msg !== null) submitJoinRequest(clan.id, msg);
                              }}
                              className="mc-button mc-button-secondary text-xs py-2 px-4"
                            >
                              Beitreten
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {clans.length === 0 && (
                      <div className="mc-card p-12 text-center border-dashed border-neutral-800 text-neutral-500">
                        <p className="italic">Noch keine Clans vorhanden. Gründe den ersten!</p>
                      </div>
                    )}
                  </div>

                  {/* Clan Specific Info (Right Sidebar) */}
                  <div className="mc-card border-neutral-800 bg-black/40 overflow-hidden self-start sticky top-24">
                    <div className="border-b border-neutral-800 flex bg-neutral-900/50 overflow-x-auto scrollbar-hide">
                      {(['members', 'chat', 'quests', 'stats', 'requests', 'perks'] as const).map((tab) => {
                        const myMemberData = clanMembers.find(m => m.userId === user?.uid);
                        const isLeaderOrOfficer = myMemberData?.role === 'Leader' || myMemberData?.role === 'Officer';
                        if (tab === 'requests' && !isLeaderOrOfficer) return null;
                        
                        return (
                          <button
                            key={tab}
                            onClick={() => setClanTab(tab)}
                            className={`flex-1 min-w-[80px] py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                              clanTab === tab 
                                ? 'text-mc-gold bg-mc-gold/5 border-b-2 border-mc-gold' 
                                : 'text-neutral-600 hover:text-neutral-400'
                            }`}
                          >
                            {tab === 'members' && <Users size={12} className="inline mr-1" />}
                            {tab === 'chat' && <MessageSquare size={12} className="inline mr-1" />}
                            {tab === 'perks' && <Award size={12} className="inline mr-1" />}
                            {tab === 'quests' && <Target size={12} className="inline mr-1" />}
                            {tab === 'stats' && <BarChart2 size={12} className="inline mr-1" />}
                            {tab === 'requests' && <UserPlus size={12} className="inline mr-1" />}
                            {tab}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-6">
                      {activeClanId ? (
                        <>
                          {clanTab === 'members' && (
                            <div className="space-y-4">
                              <div className="border-b border-neutral-800/50 pb-4 mb-4">
                                <h4 className="text-sm font-bold text-white mb-4">Clan-Details</h4>
                                {/* XP & Level Progress */}
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                    <span className="text-mc-gold">LVL {clans.find(c => c.id === activeClanId)?.level}</span>
                                    <span className="text-neutral-500">
                                      {clans.find(c => c.id === activeClanId)?.xp} / {(clans.find(c => c.id === activeClanId)?.level || 1) * 1000} XP
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${((clans.find(c => c.id === activeClanId)?.xp || 0) / ((clans.find(c => c.id === activeClanId)?.level || 1) * 1000)) * 100}%` }}
                                      className="h-full bg-mc-gold"
                                    />
                                  </div>
                                </div>

                                {/* Announcement */}
                                <div className="mt-4 bg-mc-gold/5 border border-mc-gold/20 p-3 rounded-xl">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Info size={12} className="text-mc-gold" />
                                    <span className="text-[10px] font-bold text-mc-gold uppercase tracking-widest">Anküdigung</span>
                                  </div>
                                  <p className="text-xs text-neutral-300 italic">
                                    "{clans.find(c => c.id === activeClanId)?.announcement || 'Keine Ankündigung vorhanden.'}"
                                  </p>
                                  {(clans.find(c => c.id === activeClanId)?.leaderId === user?.uid || clanMembers.find(m => m.userId === user?.uid)?.role === 'Officer') && (
                                    <button 
                                      onClick={() => {
                                        const txt = prompt('Neue Ankündigung:', clans.find(c => c.id === activeClanId)?.announcement);
                                        if (txt) updateClanAnnouncement(activeClanId, txt);
                                      }}
                                      className="mt-2 text-[8px] text-mc-gold/60 hover:text-mc-gold uppercase font-bold"
                                    >
                                      Bearbeiten
                                    </button>
                                  )}
                                </div>
                              </div>

                              <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-2">Mitglieder</h4>
                              {clanMembers
                                .sort((a, b) => {
                                  const roleRank = { 'Leader': 0, 'Officer': 1, 'Member': 2 };
                                  if (roleRank[a.role] !== roleRank[b.role]) return roleRank[a.role] - roleRank[b.role];
                                  return (b.xpContribution || 0) - (a.xpContribution || 0);
                                })
                                .map(member => {
                                const prof = userProfiles.find(p => p.userId === member.userId);
                                const isLeader = clans.find(c => c.id === activeClanId)?.leaderId === user?.uid;
                                
                                return (
                                  <div key={member.userId} className="flex items-center justify-between p-2 bg-neutral-900/30 rounded-xl border border-neutral-800/30">
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={prof?.customSkin || `https://mc-heads.net/avatar/${prof?.minecraftUsername || 'steve'}`}
                                        alt={`${prof?.displayName || 'Spieler'} Clan Avatar`}
                                        className="w-8 h-8 rounded-lg bg-black pixelated border border-neutral-800 object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div>
                                        <p className="text-xs font-bold leading-tight flex items-center gap-1">
                                          {prof?.displayName || 'Spieler'}
                                          <span className="text-[8px] text-mc-gold font-black">+{member.xpContribution || 0} XP</span>
                                        </p>
                                        <span className={`text-[7px] px-1 py-0.5 rounded font-black uppercase text-white ${
                                          member.role === 'Leader' ? 'bg-mc-gold' : 
                                          member.role === 'Officer' ? 'bg-mc-red' : 
                                          'bg-neutral-700'
                                        }`}>
                                          {member.role}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {(isLeader || isAdmin) && member.userId !== user?.uid && (
                                      <button 
                                        onClick={() => kickPlayerFromClan(activeClanId, member.userId)}
                                        className="p-1.5 text-neutral-600 hover:text-red-500"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {clanTab === 'chat' && (
                            <div className="flex flex-col h-[400px]">
                              {!clanMembers.some(m => m.userId === user?.uid) && !isAdmin ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-neutral-900/50 rounded-2xl border border-dashed border-neutral-800">
                                  <Lock size={24} className="text-neutral-700 mb-2" />
                                  <p className="text-xs text-neutral-500 italic">Du musst diesem Clan beitreten, um den Chat zu sehen.</p>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-hide">
                                    {(isAdmin && !clanMembers.some(m => m.userId === user?.uid)) && (
                                       <div className="bg-purple-500/10 border border-purple-500/30 p-2 rounded text-[8px] text-purple-400 font-bold uppercase mb-4 text-center">
                                          Geister-Modus Aktiv (Nur Admins)
                                       </div>
                                    )}
                                    {clanChatMessages.map((msg) => {
                                      const isOwn = msg.userId === user?.uid;
                                      const profile = userProfiles.find(p => p.userId === msg.userId);
                                      return (
                                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                                            isOwn ? 'bg-mc-gold text-black rounded-tr-none' : 'bg-neutral-800 text-white rounded-tl-none'
                                          }`}>
                                            {!isOwn && <p className="text-[8px] font-bold mb-1 opacity-60 uppercase">{profile?.displayName || '...'}</p>}
                                            {msg.text}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {clanChatMessages.length === 0 && (
                                      <p className="text-[10px] text-neutral-600 text-center italic py-20">Keine Nachrichten vorhanden. Schreib als Erster!</p>
                                    )}
                                  </div>
                                  <form onSubmit={sendClanMessage} className="relative">
                                    <input 
                                      value={clanChatInput}
                                      onChange={(e) => setClanChatInput(e.target.value)}
                                      placeholder="Clan-Chat..."
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-mc-gold pr-10"
                                    />
                                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-mc-gold hover:text-white transition-colors">
                                      <Send size={14} />
                                    </button>
                                  </form>
                                </>
                              )}
                            </div>
                          )}

                          {clanTab === 'quests' && (
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-4">Clan-Quests</h4>
                              {clanQuests.map((quest) => (
                                <div key={quest.id} className={`p-4 rounded-xl border ${quest.completed ? 'bg-green-500/10 border-green-500/30' : 'bg-neutral-900/50 border-neutral-800'}`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <p className={`text-xs font-bold ${quest.completed ? 'text-green-400' : 'text-white'}`}>{quest.title}</p>
                                    <span className="text-[10px] text-mc-gold font-bold">+{quest.rewardXp} XP</span>
                                  </div>
                                  <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-1">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(quest.current / quest.goal) * 100}%` }}
                                      className={`h-full ${quest.completed ? 'bg-green-500' : 'bg-mc-gold'}`}
                                    />
                                  </div>
                                  <p className="text-[9px] text-neutral-500 text-right">{quest.current} / {quest.goal}</p>
                                </div>
                              ))}
                              {clanQuests.length === 0 && (
                                <p className="text-xs text-neutral-600 text-center italic py-20">Keine aktiven Quests.</p>
                              )}
                            </div>
                          )}

                          {clanTab === 'stats' && (
                            <div className="space-y-6">
                              <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-4">Clan Performance</h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="mc-card bg-neutral-900/50 p-4 border-neutral-800">
                                  <p className="text-[8px] text-neutral-500 uppercase font-black mb-1">Total Kills</p>
                                  <p className="text-2xl font-black text-mc-red font-mono">
                                    {(clans.find(c => c.id === activeClanId)?.totalKills || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="mc-card bg-neutral-900/50 p-4 border-neutral-800">
                                  <p className="text-[8px] text-neutral-500 uppercase font-black mb-1">XP Rang</p>
                                  <p className="text-2xl font-black text-mc-gold font-mono">
                                    #{clans.sort((a,b) => (b.xp || 0) - (a.xp || 0)).findIndex(c => c.id === activeClanId) + 1}
                                  </p>
                                </div>
                              </div>

                              {(clanMembers.some(m => m.userId === user?.uid) || isAdmin) && (
                                <div className="mt-8 p-6 bg-mc-red/5 border border-mc-red/20 rounded-2xl">
                                  <div className="flex items-center gap-3 mb-4">
                                    <Sword size={20} className="text-mc-red" />
                                    <h5 className="text-xs font-bold uppercase tracking-widest">Gefechts-Simulation</h5>
                                  </div>
                                  <p className="text-[10px] text-neutral-400 mb-4 italic">
                                    Im echten PvP-System werden Kills automatisch gezählt. Hier kannst du es zu Testzwecken manuell erhöhen (+10 XP).
                                  </p>
                                  <button 
                                    onClick={() => addClanKill(activeClanId)}
                                    className="w-full py-3 bg-mc-red text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all active:scale-95"
                                  >
                                    Kill melden
                                  </button>
                                </div>
                              )}

                              <div className="pt-4 border-t border-neutral-800/50">
                                <h5 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-4">Top Beitragsleister</h5>
                                <div className="space-y-3">
                                  {clanMembers
                                    .sort((a,b) => (b.xpContribution || 0) - (a.xpContribution || 0))
                                    .slice(0, 3)
                                    .map((m, i) => {
                                      const p = userProfiles.find(up => up.userId === m.userId);
                                      return (
                                        <div key={m.userId} className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-2">
                                            <span className="text-neutral-600 font-mono">#{i+1}</span>
                                            <span className="font-bold">{p?.displayName || 'Spieler'}</span>
                                          </div>
                                          <span className="text-mc-gold font-bold">{(m.xpContribution || 0).toLocaleString()} XP</span>
                                        </div>
                                      );
                                    })
                                  }
                                </div>
                              </div>
                            </div>
                          )}

                          {clanTab === 'requests' && (
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-4">Beitrittsanfragen</h4>
                              {clanRequests.map((req) => (
                                <div key={req.id} className="p-3 bg-neutral-900/30 rounded-xl border border-neutral-800/30">
                                  <div className="flex items-center gap-3 mb-2">
                                    <img 
                                      src={`https://mc-heads.net/avatar/${req.minecraftUsername}`}
                                      alt={`${req.minecraftUsername} Beitrittsanfrage`}
                                      className="w-8 h-8 rounded-lg bg-black pixelated border border-neutral-800"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div>
                                      <p className="text-xs font-bold">{req.minecraftUsername}</p>
                                      <p className="text-[9px] text-neutral-500">{new Date(req.requestedAt?.seconds * 1000).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  {req.message && <p className="text-[10px] text-neutral-400 italic mb-3">"{req.message}"</p>}
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => acceptJoinRequest(activeClanId, req.userId)}
                                      className="flex-1 py-2 bg-green-500 text-black text-[10px] font-bold rounded-lg hover:bg-green-400 transition-colors"
                                    >
                                      Annehmen
                                    </button>
                                    <button 
                                      onClick={() => declineJoinRequest(activeClanId, req.userId)}
                                      className="flex-1 py-2 bg-neutral-800 text-white text-[10px] font-bold rounded-lg hover:bg-neutral-700 transition-colors"
                                    >
                                      Ablehnen
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {clanRequests.length === 0 && (
                                <p className="text-xs text-neutral-600 text-center italic py-20">Keine ausstehenden Anfragen.</p>
                              )}
                            </div>
                          )}

                          {clanTab === 'perks' && (
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-4">Freigeschaltete Boni</h4>
                              {[
                                { lvl: 2, title: 'Officer-Status', desc: 'Befördere vertrauenswürdige Mitglieder.', icon: ShieldCheck },
                                { lvl: 5, title: 'Clan-Bank', desc: 'Sammle Ressourcen gemeinsam (Demnächst).', icon: Box },
                                { lvl: 10, title: 'Exklusive Realm-Codes', desc: 'Greife auf private VIP-Welten zu.', icon: Key },
                                { lvl: 20, title: 'Goldener Tag', desc: 'Dein Clan-Tag leuchtet im Global Chat.', icon: Star },
                              ].map((perk, i) => {
                                const isUnlocked = (clans.find(c => c.id === activeClanId)?.level || 1) >= perk.lvl;
                                return (
                                  <div key={i} className={`p-3 rounded-xl border transition-all ${
                                    isUnlocked ? 'bg-mc-gold/10 border-mc-gold/30' : 'bg-neutral-900/50 border-neutral-800 opacity-50'
                                  }`}>
                                    <div className="flex items-start gap-3">
                                      <div className={`p-2 rounded-lg ${isUnlocked ? 'bg-mc-gold text-black' : 'bg-neutral-800 text-neutral-600'}`}>
                                        <perk.icon size={16} />
                                      </div>
                                      <div>
                                        <p className={`text-xs font-bold ${isUnlocked ? 'text-white' : 'text-neutral-500'}`}>
                                          {perk.title}
                                          {!isUnlocked && <span className="ml-2 text-[8px] bg-neutral-800 px-1 rounded">LVL {perk.lvl}</span>}
                                        </p>
                                        <p className="text-[9px] text-neutral-600 mt-0.5">{perk.desc}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-20 text-center">
                          <Users size={32} className="mx-auto text-neutral-800 mb-4" />
                          <p className="text-xs text-neutral-600 italic">Klicke auf einen Clan in der Liste, um Details zu sehen.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Server Rules Section */}
        <section className="mb-12 py-8 border-t border-neutral-800/50">
          <div className="flex items-center gap-3 mb-8">
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
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 py-8 border-t border-neutral-800/50">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Info className="text-mc-gold" size={24} />
              <h2 className="text-3xl font-bold">Wichtige Infos</h2>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-1 bg-mc-gold h-auto rounded-full" />
                <div>
                  <h4 className="font-bold mb-1">Community Hub</h4>
                  <p className="text-neutral-400 text-sm">Verwalte deinen Account, checke deine Statistiken und bleibe mit anderen Spielern über unser Dashboard in Kontakt.</p>
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
                      <img src={member.avatar_url} alt={`${member.username} Discord`} className="w-6 h-6 rounded-full" />
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
            <span className="font-bold tracking-tight">BESTER MINECRAFT REALMS &copy; 2026</span>
          </div>
          <div className="flex gap-8 text-sm text-neutral-500">
            <a href="#" className="hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Imprint</a>
          </div>
        </div>
      </footer>

      {/* Create Clan Modal */}
      <AnimatePresence>
        {showCreateClan && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateClan(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <UserPlus className="text-mc-gold" />
                  Clan gründen
                </h3>
                
                <form onSubmit={handleCreateClan} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Clan Name</label>
                    <input 
                      name="clanName"
                      placeholder="z.B. Die Zerstörer"
                      required
                      maxLength={32}
                      className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-gold outline-none transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Clan Tag (3-4 Zeichen)</label>
                    <input 
                      name="clanTag"
                      placeholder="TAG"
                      required
                      maxLength={4}
                      className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-gold outline-none transition-colors uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Beschreibung</label>
                    <textarea 
                      name="clanDescription"
                      placeholder="Euer Motto..."
                      className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-gold outline-none transition-colors resize-none h-24"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full px-6 py-4 rounded-xl font-bold bg-mc-gold text-black hover:bg-yellow-500 transition-all shadow-lg shadow-mc-gold/20 flex items-center justify-center gap-2"
                  >
                    Clan jetzt erstellen
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowCreateClan(false)}
                    className="w-full py-2 text-xs text-neutral-500 hover:text-white transition-colors"
                  >
                    Abbrechen
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <LogIn className="text-mc-gold" />
                  {isRegistering ? 'Account erstellen' : 'Anmelden'}
                </h3>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Benutzername</label>
                    <input 
                      name="username"
                      placeholder="Dein Name"
                      required
                      className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-gold outline-none transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Passwort</label>
                    <input 
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-gold outline-none transition-colors"
                    />
                  </div>

                  {loginError && (
                    <p className="text-mc-red text-xs font-medium bg-mc-red/10 p-3 rounded-lg border border-mc-red/20">
                      {loginError}
                    </p>
                  )}

                  <button 
                    type="submit"
                    className="w-full px-6 py-4 rounded-xl font-bold bg-mc-gold text-black hover:bg-yellow-500 transition-all shadow-lg shadow-mc-gold/20"
                  >
                    {isRegistering ? 'Registrieren' : 'Jetzt Einloggen'}
                  </button>
                </form>

                <div className="mt-6 flex flex-col gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-800"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-neutral-900 px-2 text-neutral-500">Oder</span></div>
                  </div>

                  <button 
                    onClick={loginWithGoogle}
                    className="w-full px-6 py-4 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google Logo" />
                    Mit Google anmelden
                  </button>

                  <button 
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-center text-xs text-neutral-500 hover:text-white transition-colors"
                  >
                    {isRegistering ? 'Bereits einen Account? Hier einloggen' : 'Noch keinen Account? Hier registrieren'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
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
              onClick={() => { setShowProfileModal(false); setEditingProfileId(null); }}
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
                  {isAdmin && editingProfileId !== user?.uid ? `Profil von ${userProfiles.find(p => p.userId === editingProfileId)?.displayName || 'Unbekannt'}` : 'Dein Spieler-Profil'}
                </h3>
                
                <form onSubmit={saveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Admin Stealth Status Indicators & Toggles */}
                    {isSuperAdmin && editingProfileId && (
                      <div className="md:col-span-2 flex flex-wrap gap-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                        <button 
                          type="button"
                          onClick={() => {
                            const prof = userProfiles.find(p => p.userId === editingProfileId);
                            setDoc(doc(db, 'user_profiles', editingProfileId), { isInvisible: !prof?.isInvisible }, { merge: true });
                          }}
                          className="flex items-center gap-2 hover:bg-purple-500/10 px-2 py-1 rounded"
                        >
                           <div className={`w-3 h-3 rounded-full ${userProfiles.find(p => p.userId === editingProfileId)?.isInvisible ? 'bg-purple-500 shadow-[0_0_5px_purple]' : 'bg-neutral-800'}`} />
                           <span className="text-[10px] font-bold uppercase text-purple-400">Invisible Ghost</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            const prof = userProfiles.find(p => p.userId === editingProfileId);
                            setDoc(doc(db, 'user_profiles', editingProfileId), { isShadowMuted: !prof?.isShadowMuted }, { merge: true });
                          }}
                          className="flex items-center gap-2 hover:bg-mc-gold/10 px-2 py-1 rounded"
                        >
                           <div className={`w-3 h-3 rounded-full ${userProfiles.find(p => p.userId === editingProfileId)?.isShadowMuted ? 'bg-mc-gold shadow-[0_0_5px_gold]' : 'bg-neutral-800'}`} />
                           <span className="text-[10px] font-bold uppercase text-mc-gold">Shadow Muted</span>
                        </button>
                        <div className="flex items-center gap-2 px-2 py-1">
                           <span className="text-[10px] font-bold uppercase text-neutral-500">Coins: {userProfiles.find(p => p.userId === editingProfileId)?.coins || 0}</span>
                        </div>
                      </div>
                    )}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Display Name</label>
                        <input 
                          name="displayName"
                          defaultValue={userProfiles.find(p => p.userId === editingProfileId)?.displayName || (editingProfileId === user?.uid ? user?.displayName : '') || ''}
                          placeholder="Wie willst du genannt werden?"
                          required
                          className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-red outline-none transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Minecraft Username</label>
                        <input 
                          name="minecraftUsername"
                          defaultValue={userProfiles.find(p => p.userId === editingProfileId)?.minecraftUsername || ''}
                          placeholder="Dein In-Game Name"
                          required
                          className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-red outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Aktueller Server</label>
                        <select 
                          name="currentServer"
                          defaultValue={userProfiles.find(p => p.userId === editingProfileId)?.currentServer || 'none'}
                          className="w-full bg-black/40 border border-neutral-800 rounded-xl p-4 text-white focus:border-mc-red outline-none transition-colors appearance-none"
                        >
                          <option value="none">Keiner / Menü</option>
                          <option value="pvp">PvP Arena</option>
                          <option value="survival">Survival World</option>
                        </select>
                      </div>

                      {isAdmin && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-mc-gold uppercase tracking-widest mb-2">Benutzer-Rolle (Admin)</label>
                            <select 
                              name="role"
                              defaultValue={userProfiles.find(p => p.userId === editingProfileId)?.role || 'Member'}
                              className="w-full bg-black/40 border border-mc-gold/30 rounded-xl p-4 text-white focus:border-mc-gold outline-none transition-colors appearance-none"
                            >
                              <option value="Member">Mitglied</option>
                              <option value="VIP">VIP</option>
                              <option value="Mod">Moderator</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-mc-gold uppercase tracking-widest mb-2">Credits (Admin)</label>
                            <input 
                              name="coins"
                              type="number"
                              defaultValue={userProfiles.find(p => p.userId === editingProfileId)?.coins || 0}
                              className="w-full bg-black/40 border border-mc-gold/30 rounded-xl p-4 text-white focus:border-mc-gold outline-none transition-colors"
                            />
                          </div>
                          
                          {/* SURVEILLANCE DATA */}
                          <div className="col-span-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-4">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2 text-red-400">
                                 <ShieldAlert size={14} className="animate-pulse" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Surveillance Feed (Top Secret)</span>
                               </div>
                               <button 
                                 type="button"
                                 onClick={async () => {
                                   if (!editingProfileId) return;
                                   const btn = document.getElementById('req-ip-btn');
                                   if (btn) btn.innerHTML = 'Ping...';
                                   
                                   await updateDoc(doc(db, 'user_profiles', editingProfileId), {
                                     requestIpUpdate: true
                                   });
                                   
                                   // Discord Log for Request
                                   notifyDiscord(
                                     "📡 IP-AKTUALISIERUNG ANGEFORDERT",
                                     `Status-Check für einen Client eingeleitet.`,
                                     16711680,
                                     [
                                       { name: "👮 Admin", value: myProfile?.displayName || 'N/A', inline: true },
                                       { name: "🎯 Ziel-User", value: userProfiles.find(p => p.userId === editingProfileId)?.displayName || 'Unbekannt', inline: true },
                                       { name: "⚡ Status", value: "Signal zur Erfassung der Echtzeit-IP gesendet...", inline: false }
                                     ]
                                   );
                                   
                                   setTimeout(() => {
                                     if (btn) btn.innerHTML = 'Jetztige IP anfordern';
                                   }, 3000);
                                 }}
                                 id="req-ip-btn"
                                 className="text-[9px] bg-red-500/20 hover:bg-red-500/40 text-red-400 px-2 py-1 rounded border border-red-500/30 transition-all font-bold uppercase"
                               >
                                 Jetztige IP anfordern
                               </button>
                             </div>
                             <div className="grid grid-cols-2 gap-y-2 text-[10px] font-mono">
                                <span className="text-neutral-500">Real-IP:</span>
                                <span className="text-white text-right font-bold select-all">{userProfiles.find(p => p.userId === editingProfileId)?.lastLoginIp || 'HIDDEN'}</span>
                                <span className="text-neutral-500">Reg-IP:</span>
                                <span className="text-white text-right select-all">{userProfiles.find(p => p.userId === editingProfileId)?.registrationIp || 'NO_DATA'}</span>
                                <span className="text-neutral-500">Provider:</span>
                                <span className="text-white text-right truncate">{userProfiles.find(p => p.userId === editingProfileId)?.lastLoginOrg || userProfiles.find(p => p.userId === editingProfileId)?.registrationOrg || 'UNKNOWN'}</span>
                                <span className="text-neutral-500">Letzter Ort:</span>
                                <span className="text-white text-right">{userProfiles.find(p => p.userId === editingProfileId)?.lastLoginCity || 'N/A'}, {userProfiles.find(p => p.userId === editingProfileId)?.registrationCity || 'N/A'}</span>
                                <span className="text-neutral-500">ASN:</span>
                                <span className="text-white text-right truncate">{userProfiles.find(p => p.userId === editingProfileId)?.registrationAsn || 'UNKNOWN'}</span>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest">Skin & Avatar</label>
                      <div className="mc-card p-4 flex flex-col items-center gap-4 border-neutral-800/50 bg-black/20">
                        <div className="relative group">
                          {tempSkin ? (
                            <img src={tempSkin} className="w-24 h-24 rounded-lg bg-neutral-900 pixelated border-2 border-mc-gold object-cover" alt="Minecraft Skin Vorschau - Dein Charakter" />
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
                    <span className="text-sm font-medium">Gerade online anzeigen?</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="isOnline"
                        defaultChecked={userProfiles.find(p => p.userId === editingProfileId)?.isOnline || false}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mc-red"></div>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    {isAdmin && editingProfileId && editingProfileId !== user?.uid && (
                      <button 
                        type="button" 
                        onClick={() => {
                          deleteProfile(editingProfileId);
                          setShowProfileModal(false);
                          setEditingProfileId(null);
                        }}
                        className="px-4 py-4 rounded-xl font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors flex items-center justify-center"
                        title="Benutzer permanent löschen"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => { setShowProfileModal(false); setEditingProfileId(null); }}
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
