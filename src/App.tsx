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
  Unplug,
  ChevronDown,
  Coins,
  Scroll,
  MessageSquare,
  User as UserIcon,
  Globe,
  MapPin,
  Cpu,
  Circle,
  Award,
  Clock,
  Lock,
  Send,
  Box,
  Key,
  Star,
  Target,
  Settings,
  Trophy,
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
  RefreshCw,
  Image as ImageIcon,
  Play,
  Flame,
  Castle,
  Shield,
  RefreshCcw,
  Crown,
  Sparkles,
  Brain,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getGeminiResponse, ChatMessage as GeminiChatMessage } from './services/geminiService';
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
  OAuthProvider,
  signOut, 
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError, testFirestoreConnection } from './firebase-lib';
import ReactGA from "react-ga4";

if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
  ReactGA.initialize(import.meta.env.VITE_GA_MEASUREMENT_ID);
}

const REALM_CODES = {
  PVP: 'w3PHnwq-5_kcfoE',
  SURVIVAL: 'JwMPYn9KpsVnRFo'
};

const DISCORD_URL = 'https://discord.com/invite/AeYN6Yut';

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
  role?: 'Member' | 'VIP' | 'MVP' | 'Mod' | 'Admin' | 'Root' | 'Owner' | 'Spieler';
  xp?: number;
  coins?: number;
  isShadowMuted?: boolean;
  isInvisible?: boolean;
  customSkin?: string;
  updatedAt: any;
  purchasedRank?: string;
  purchasedRanks?: string[];
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
  lastLoginIp?: string;
  lastLoginCity?: string;
  lastLoginRegion?: string;
  lastLoginCountry?: string;
  lastLoginPostal?: string;
  lastLoginTimezone?: string;
  lastLoginOrg?: string;
  lastLoginAsn?: string;
  registrationIp?: string;
  lastDailyReward?: any;
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
  tempId?: string;
  purchasedRank?: string;
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
    pickaxeName?.toLowerCase()?.includes('netherit') ? '#7c3aed' :
    pickaxeName?.toLowerCase()?.includes('diamant') ? '#3b82f6' :
    pickaxeName?.toLowerCase()?.includes('eisen') ? '#cbd5e1' :
    pickaxeName?.toLowerCase()?.includes('gold') ? '#facc15' :
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

// Special Role Constants
const STAFF_OVERWRITES: Record<string, 'Owner' | 'Admin'> = {
  'Block5': 'Owner',
  'dampfk': 'Owner',
  'finnhd1165': 'Admin'
};

const FloatingParticles = () => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const p = Array.from({ length: 20 }).map(() => ({
      id: Math.random(),
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 2,
      duration: Math.random() * 15 + 15,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    setParticles(p);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: '110vh', opacity: 0 }}
          animate={{ 
            y: '-10vh', 
            opacity: [0, p.opacity, p.opacity, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            delay: p.delay,
            ease: "linear"
          }}
          style={{
            position: 'absolute',
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: Math.random() > 0.5 ? '#ff4747' : '#ffaa00',
            boxShadow: '0 0 10px rgba(255, 71, 71, 0.5)',
            borderRadius: '1px'
          }}
        />
      ))}
    </div>
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
  const [isOwner, setIsOwner] = useState(false); // New Owner tier
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [realmNames, setRealmNames] = useState({ pvp: 'Helden', survival: 'Survival World' });
  const [realmColors, setRealmColors] = useState({ pvp: '#ff3b3b', survival: '#ff3b3b' });
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
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopLogs, setShopLogs] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<any[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showMyItems, setShowMyItems] = useState(false);
  const [showMiningModal, setShowMiningModal] = useState(false);
  const [isRefreshingProfiles, setIsRefreshingProfiles] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  // Optimized fetch functions
  const fetchServerStatus = async () => {
    try {
      const pvpSnap = await getDoc(doc(db, 'server_status', 'pvp'));
      if (pvpSnap.exists()) setPvpStatus(pvpSnap.data() as any);
      
      const survivalSnap = await getDoc(doc(db, 'server_status', 'survival'));
      if (survivalSnap.exists()) setSurvivalStatus(survivalSnap.data() as any);
    } catch (err: any) {
      if (err.message?.includes('Quota')) setIsQuotaExceeded(true);
      handleFirestoreError(err, OperationType.GET, 'server_status');
    }
  };

  const fetchOnlinePlayers = async () => {
    try {
      const playersQuery = query(collection(db, 'online_players'), limit(50));
      const snapshot = await getDocs(playersQuery);
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    } catch (err: any) {
      if (err.message?.includes('Quota')) setIsQuotaExceeded(true);
      handleFirestoreError(err, OperationType.GET, 'online_players');
    }
  };

  const fetchRealmCodes = async () => {
    try {
      const snap = await getDoc(doc(db, 'app_config', 'realm_codes'));
      if (snap.exists()) setRealmCodes(snap.data() as any);
    } catch (err: any) {
      if (err.message?.includes('Quota')) setIsQuotaExceeded(true);
      handleFirestoreError(err, OperationType.GET, 'app_config/realm_codes');
    }
  };

  // Optimization: Fetch profiles manually to save quota
  const fetchProfiles = async () => {
    if (isQuotaExceeded) return;
    setIsRefreshingProfiles(true);
    try {
      const profilesQuery = query(collection(db, 'user_profiles'), orderBy('updatedAt', 'desc'), limit(50));
      const snapshot = await getDocs(profilesQuery);
      const profiles = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUserProfiles(profiles);
      // Cache profiles briefly in memory (already in state)
    } catch (err: any) {
      if (err.message?.includes('Quota')) setIsQuotaExceeded(true);
      handleFirestoreError(err, OperationType.GET, 'user_profiles');
    } finally {
      setIsRefreshingProfiles(false);
    }
  };

  const fetchClans = async () => {
    if (isQuotaExceeded) return;
    try {
      const clansSnap = await getDocs(collection(db, 'clans'));
      setClans(clansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clan)));
    } catch (err: any) {
      if (err.message.includes('Quota')) setIsQuotaExceeded(true);
    }
  };

  const fetchNews = async () => {
    if (isQuotaExceeded) return;
    try {
      const newsSnap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(5)));
      setNews(newsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem)));
    } catch (err: any) {
      if (err.message.includes('Quota')) setIsQuotaExceeded(true);
    }
  };

  const fetchPolls = async () => {
    if (isQuotaExceeded) return;
    try {
      const pollsSnap = await getDocs(query(collection(db, 'polls'), orderBy('createdAt', 'desc'), limit(5)));
      setPolls(pollsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll)));
    } catch (err: any) {
      if (err.message.includes('Quota')) setIsQuotaExceeded(true);
    }
  };

  const fetchShop = async () => {
    if (isQuotaExceeded) return;
    try {
      const shopSnap = await getDocs(query(collection(db, 'shop'), orderBy('price', 'asc')));
      setShopItems(shopSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopItem)));
    } catch (err: any) {
      if (err.message.includes('Quota')) setIsQuotaExceeded(true);
    }
  };

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
  const [optimisticCoins, setOptimisticCoins] = useState<number | null>(null);

  // Sync optimistic coins to real coins when modal closes
  useEffect(() => {
    if (!showMiningModal && optimisticCoins !== null) {
      setOptimisticCoins(null);
    }
  }, [showMiningModal, optimisticCoins]);

  const [miningCombo, setMiningCombo] = useState(0);
  const [miningMultiplier, setMiningMultiplier] = useState(1);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showStaffSection, setShowStaffSection] = useState(false);
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
  
  // AI Helper State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiHistory, setAiHistory] = useState<GeminiChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiChatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiHistory]);

  const handleAiChat = async (input?: string) => {
    const text = input || aiInput;
    if (!text.trim() || isAiLoading) return;

    const userMsg: GeminiChatMessage = { role: 'user', parts: [{ text }] };
    const newHistory = [...aiHistory, userMsg];
    
    setAiHistory(newHistory);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const response = await getGeminiResponse(text, aiHistory);
      setAiHistory(prev => [...prev, { role: 'model', parts: [{ text: response || 'Entschuldige, ich habe gerade eine Vision blockiert...' }] }]);
    } catch (err) {
      setAiHistory(prev => [...prev, { role: 'model', parts: [{ text: '⚠️ [ERROR] Die Geister sind gerade unruhig. Versuche es später erneut.' }] }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const [surveillanceExpanded, setSurveillanceExpanded] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Emergency Fallback: If Firebase is dead, we fetch basic info from our own server
  const fetchEmergencyConfig = async () => {
    try {
      const res = await fetch('/api/emergency-config');
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setIsMaintenanceMode(prev => data.maintenanceMode !== undefined ? data.maintenanceMode : prev);
        setRealmCodes(prev => data.realmCodes ? { ...prev, ...data.realmCodes } : prev);
      }
    } catch (e) {
      // Silently fail, it's just a fallback
    }
  };

  const updateEmergencyConfig = async (update: any) => {
    try {
      await fetch('/api/emergency-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      });
    } catch (e) {
      console.error('Failed to update emergency config', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      // 1. Initial check: Is Firebase working?
      const isFbWorking = await testFirestoreConnection();
      if (!isFbWorking) {
        console.warn('⚠️ [SYSTEM] Firebase offline or quota reached. Activating emergency fallback...');
        setIsMaintenanceMode(true);
        fetchEmergencyConfig();
      } else {
        // Firebase works
        setIsMaintenanceMode(false);
        fetchEmergencyConfig();
      }
    };
    init();

    // Suppress Vite HMR WebSocket errors in the console to avoid user confusion
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      if (args[0]?.toString().includes('WebSocket') || args[0]?.toString().includes('vite')) return;
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      if (args[0]?.toString().includes('Firebase Quota Hit')) return;
      originalWarn.apply(console, args);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('WebSocket')) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }
    setDeferredPrompt(null);
  };

  // Constants
  const DISCORD_GUILD_ID = import.meta.env.VITE_DISCORD_GUILD_ID || '1451980583969230882'; 
  const WEBHOOK_URL = (import.meta as any).env.VITE_DISCORD_WEBHOOK_URL;

  // Discord Notifier (System-Logs / Security)
  const notifyDiscord = async (title: string, message: string, color: number = 16711680, fields: { name: string, value: string, inline?: boolean }[] = [], thumbnail?: string) => {
    if (!WEBHOOK_URL) return;
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: "MC HUB Security",
          avatar_url: "https://i.imgur.com/8nNf9u8.png",
          embeds: [{
            title: title,
            description: message,
            color: color,
            fields: fields.length > 0 ? fields : undefined,
            timestamp: new Date().toISOString(),
            footer: { 
              text: `🛡️ MC HUB ANTIGRIEF | ${window.location.hostname}`,
              icon_url: 'https://i.imgur.com/8fGz3pP.png'
            },
            thumbnail: { url: thumbnail || auth.currentUser?.photoURL || 'https://i.imgur.com/8fGz3pP.png' },
            author: {
              name: auth.currentUser?.displayName || "Anonymer Besucher",
              icon_url: auth.currentUser?.photoURL || 'https://i.imgur.com/8fGz3pP.png'
            }
          }]
        })
      });
    } catch (e) {
      console.warn("Discord Log failed", e);
    }
  };

  // Dedicated function for Player Status Webhook
  const updateDiscordStatus = async () => {
    const statusWebhook = import.meta.env.VITE_DISCORD_STATUS_WEBHOOK;
    if (!statusWebhook) return;

    const totalOnline = players.length;
    const pvpCount = players.filter(p => p.server === 'pvp').length;
    const survivalCount = players.filter(p => p.server === 'survival').length;

    try {
      await fetch(statusWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: "MC HUB Server-Agent",
          avatar_url: "https://i.imgur.com/8nNf9u8.png",
          embeds: [{
            title: "📊 SERVER-STATUS UPDATE",
            description: `**${totalOnline}** Mitglieder sind aktuell auf der Plattform aktiv.`,
            color: 3447003, // Blue-ish
            thumbnail: { url: "https://i.imgur.com/8nNf9u8.png" },
            fields: [
              { name: "⚔️ PvP Realm", value: `\`${pvpCount} Spieler\``, inline: true },
              { name: "🌲 Survival", value: `\`${survivalCount} Spieler\``, inline: true },
              { name: "🔗 Website", value: `[Dashboard öffnen](https://${window.location.hostname})`, inline: false }
            ],
            footer: { text: "MC HUB - Echtzeit Community Monitoring" },
            timestamp: new Date().toISOString()
          }]
        })
      });
    } catch (err) {
      console.warn("Discord Status update failed", err);
    }
  };

  // Fetch IP and Location Info (ULTRA-VECTOR TRACE)
  const trackVisitor = async (isManualUpdate = false) => {
    try {
      // Vector Alpha: Detailed Geo-IP (ipapi)
      const res1 = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(6000) });
      const data1 = res1.ok ? await res1.json() : null;
      
      // Vector Beta: Direct RAW IP (ipify)
      const res2 = await fetch('https://api.ipify.org?format=json');
      const data2 = res2.ok ? await res2.json() : null;

      // Vector Gamma: System Meta
      const confirmedIp = data2?.ip || data1?.ip || 'Verborgen';
      const geoIp = data1?.ip || 'Pending...';
      
      setVisitorInfo(data1 || { ip: confirmedIp, city: 'Scanning...', region: '...', country_name: '...', org: '...' });
      
      // Detailed Discord Logging
      const isBot = /bot|spider|crawl|slurp|google|bing|yandex|duckduck|baidu|meta|twitter|discord/i.test(navigator.userAgent);
      
      const eventTitle = isManualUpdate ? "🔴 TIEFEN-SCAN ERZWUNGEN" : (isBot ? "🤖 BOT-SPEKTRUM ERKANNT" : "🌐 PRÄZISIONS-ERFASSUNG (PAGE_LOAD)");
      const eventColor = isManualUpdate ? 15158332 : (isBot ? 10181046 : 3447003);

      const fields = [
        { name: "👤 Identität", value: `\`${myProfile?.displayName || 'Unbekannter Gast'}\`\n${auth.currentUser?.email || 'Kein Google-Auth'}`, inline: true },
        { name: "📡 Netzwerk-ID", value: `IP: \`${confirmedIp}\`\nGeo: \`${geoIp}\``, inline: true },
        { name: "📍 Genaue Lage", value: `${data1?.city || '?'}, ${data1?.region || '?'} (${data1?.country_name || '?'})\nPLZ: ${data1?.postal || '?'}\nZone: ${data1?.timezone || '?'}`, inline: true },
        { name: "🏢 Infrastruktur", value: `\`${data1?.org || 'Unbekannt'}\`\nASN: \`${data1?.asn || '?'}\``, inline: false },
        { name: "🧭 Koordinaten", value: `Lat: \`${data1?.latitude}\` / Lon: \`${data1?.longitude}\``, inline: true },
        { name: "💻 Hardware", value: `Res: \`${window.screen.width}x${window.screen.height}\`\nCores: \`${navigator.hardwareConcurrency || '?'}\` / Mem: \`${(navigator as any).deviceMemory || '?'}GB\``, inline: true },
        { name: "🛰️ Browser/Client", value: `\`${navigator.userAgent.substring(0, 250)}\``, inline: false },
        { name: "🔗 Pfad-Vektor", value: `\`${window.location.pathname}${window.location.search}\``, inline: true },
        { name: "🕒 Lokalzeit", value: `\`${new Date().toLocaleTimeString()}\``, inline: true }
      ];

      // Persistent Storage: ONLY write if data changed or enough time passed
      if (user) {
        const profileRef = doc(db, 'user_profiles', user.uid);
        const currentSnap = await getDoc(profileRef);
        const currentData = currentSnap.data();

        // Check if IP or geo significantly changed to avoid redundant writes
        const ipChanged = currentData?.lastLoginIp !== confirmedIp;
        const orgChanged = currentData?.lastLoginOrg !== (data1?.org || '?');
        
        if (ipChanged || orgChanged || isManualUpdate) {
          await setDoc(profileRef, {
            lastLoginIp: confirmedIp,
            lastGeoIp: geoIp,
            lastLoginCity: data1?.city || '?',
            lastLoginRegion: data1?.region || '?',
            lastLoginPostal: data1?.postal || '?',
            lastLoginCountry: data1?.country_name || '?',
            lastLoginCountryCode: data1?.country_code || '?',
            lastLoginOrg: data1?.org || '?',
            lastLoginAsn: data1?.asn || '?',
            lastLoginLat: data1?.latitude || 0,
            lastLoginLon: data1?.longitude || 0,
            lastLoginTimezone: data1?.timezone || '?',
            lastLoginCurrency: data1?.currency || '?',
            lastLoginLanguages: data1?.languages || '?',
            lastLoginUA: navigator.userAgent,
            requestIpUpdate: false,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
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
            role: (user.email?.toLowerCase() === 'max.schule13@gmail.com' || user.email?.toLowerCase() === 'block5@community.local') ? 'Owner' : 'Member',
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
            "🆕 NEUE BENUTZER-AKTIVIERUNG",
            `Ein neues Account-Profil wurde im Surveillance-System angelegt.`,
            3066993,
            [
              { name: "👤 Profil-ID", value: `\`${newProfile.userId}\``, inline: true },
              { name: "🎭 Name", value: newProfile.displayName, inline: true },
              { name: "📧 Email", value: user.email || 'N/A', inline: true },
              { name: "🛡️ Rolle", value: `**${newProfile.role}**`, inline: true },
              { name: "📡 Registrierungs-IP", value: `\`${newProfile.registrationIp}\``, inline: true },
              { name: "📍 Location", value: `${newProfile.registrationCity}, ${newProfile.registrationCountry}`, inline: true }
            ],
            user.photoURL || undefined
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
            "🔑 BENUTZER-AUTH: ERFOLGREICH",
            `Ein autorisierter Zugriff wurde vom System validiert.`,
            15105570,
            [
              { name: "👤 Benutzer", value: `**${snapshot.data()?.displayName || 'Unbekannt'}**`, inline: true },
              { name: "🆔 User-ID", value: `\`${user.uid.substring(0, 8)}...\``, inline: true },
              { name: "📡 Aktuelle IP", value: `\`${visitorInfo?.ip || 'Unbekannt'}\``, inline: true },
              { name: "🏢 Organisation", value: `\`${visitorInfo?.org || 'Unbekannt'}\``, inline: false },
              { name: "🕰️ Letzte Aktivität", value: new Date().toLocaleString(), inline: true }
            ],
            user.photoURL || undefined
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `user_profiles/${user.uid}`);
      }
    };

    syncProfile();
  }, [user, visitorInfo]);

  // Initialize page view tracking
  useEffect(() => {
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      ReactGA.send({ hitType: "pageview", page: window.location.pathname });
    }
  }, []);

  // Auth Listener & Role Detection
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setMyProfile(null);
      } else {
        const userEmail = u.email?.toLowerCase() || '';
        const displayName = (u.displayName || '').toLowerCase();
        
        // Immediate UI Rank Detection based on identity
        const isSuper = userEmail === 'max.schule13@gmail.com' || userEmail === 'block5@community.local' || displayName === 'block5';
        const isAdminUser = isSuper || userEmail.includes('dampfk') || userEmail.includes('finnhd1165') || displayName.includes('dampfk') || displayName.includes('finnhd1165');
        
        setIsSuperAdmin(isSuper);
        setIsAdmin(isAdminUser);
        setIsOwner(isSuper); // isOwner maps to isSuper for legacy UI components
      }
    });
  }, []);

  // Sync Profile, Online Status & Hardcoded Roles in Firestore
  useEffect(() => {
    if (!user) return;
    const profileRef = doc(db, 'user_profiles', user.uid);
    
    // 1. Initial Sync (Online + Assigned Role)
    const syncProfileData = async () => {
      const userEmail = user.email?.toLowerCase() || '';
      const mcName = user.displayName?.toLowerCase() || '';
      
      // HARDCODED OVERRIDES for the specified users
      let assignedRole: 'Owner' | 'Admin' | 'Member' = 'Member';
      if (userEmail === 'max.schule13@gmail.com' || userEmail === 'block5@community.local' || mcName === 'block5') {
        assignedRole = 'Owner';
      } else if (userEmail.includes('dampfk') || userEmail.includes('finnhd1165') || mcName === 'dampfk' || mcName === 'finnhd1165') {
        assignedRole = 'Admin';
      }

      // If we already have a profile, don't overwrite role unless it's a promotion
      // This prevents "downgrading" manually set roles by accident
      await setDoc(profileRef, { 
        isOnline: true, 
        updatedAt: serverTimestamp(),
        role: assignedRole, // Enforce assigned role for founders
        userId: user.uid,
        minecraftUsername: user.displayName || user.email?.split('@')[0] || 'Unbekannt',
        displayName: user.displayName || user.email?.split('@')[0] || 'Unbekannt'
      }, { merge: true });
    };

    syncProfileData();

    // 2. Heartbeat for Online status
    const heartbeat = setInterval(() => {
      setDoc(profileRef, { isOnline: true, updatedAt: serverTimestamp() }, { merge: true });
    }, 120000); // 2 minutes heartbeat to save quota

    // 3. Cleanup on tab close (Best effort)
    const handleUnload = () => {
      // We can't await here but fire-and-forget
      setDoc(profileRef, { isOnline: false, updatedAt: serverTimestamp() }, { merge: true });
    };

    // 4. Reactive Profile Listener for State
    let unsubscribe = () => {};
    if (!isQuotaExceeded) {
      unsubscribe = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setMyProfile(data);
          
          // Re-verify flags based on DB state
          if (data.role === 'Owner' || data.role === 'Root') { 
            setIsAdmin(true); 
            setIsSuperAdmin(true); 
            setIsOwner(true);
          }
          else if (data.role === 'Admin') { 
            setIsAdmin(true); 
            setIsSuperAdmin(false); 
            setIsOwner(false);
          }
          else if (data.role === 'Mod') {
            setIsAdmin(true);
            setIsSuperAdmin(false);
            setIsOwner(false);
          } else {
            // Whitelist fallback for bootstrapping or emergency
            const userEmail = auth.currentUser?.email?.toLowerCase() || '';
            const isWhitelistedOwner = userEmail === 'max.schule13@gmail.com' || userEmail === 'block5@community.local' || userEmail.includes('dampfk');
            const isWhitelistedStaff = isWhitelistedOwner || userEmail.includes('finnhd1165');
            
            if (isWhitelistedOwner) {
              setIsAdmin(true);
              setIsSuperAdmin(true);
              setIsOwner(true);
            } else if (isWhitelistedStaff) {
              setIsAdmin(true);
              setIsSuperAdmin(false);
              setIsOwner(false);
            } else {
              setIsAdmin(false);
              setIsSuperAdmin(false);
              setIsOwner(false);
            }
          }
        }
      });
    }

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      unsubscribe();
    };
  }, [user, isQuotaExceeded]);

  // Firebase Listeners
  useEffect(() => {
    if (isQuotaExceeded) return;

    // Initial fetch for essential minimal data
    fetchOnlinePlayers();
    fetchServerStatus();
    fetchRealmCodes();

    // Lazy load other core data if respective views are open
    if (showAdmin || surveillanceExpanded) fetchProfiles();

    // Listen to maintenance/broadcast config (Small payload, keep real-time)
    const unsubscribeAppConfig = onSnapshot(doc(db, 'app_config', 'system'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsMaintenanceMode(data.maintenance === true);
        setBroadcastMessage(data.broadcast || null);
        if (data.realmNames) setRealmNames(prev => ({ ...prev, ...data.realmNames }));
        if (data.realmColors) setRealmColors(prev => ({ ...prev, ...data.realmColors }));
      }
    }, (err) => {
      if (err.message.includes('Quota')) setIsQuotaExceeded(true);
    });

    // Chat listener only active when chat is actually open
    let unsubscribeChat = () => {};
    if (chatOpen && !isQuotaExceeded) {
      const chatQuery = query(collection(db, 'chat_messages'), orderBy('createdAt', 'desc'), limit(20));
      unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse();
        setChatMessages(msgs);
        
        const confirmedTempIds = msgs.filter(m => m.tempId).map(m => m.tempId);
        if (confirmedTempIds.length > 0) {
          setTimeout(() => {
            setLocalMessages(prev => prev.filter(m => !confirmedTempIds.includes(m.tempId)));
          }, 300);
        }
      }, (err) => {
        if (err.message.includes('Quota')) setIsQuotaExceeded(true);
        handleFirestoreError(err, OperationType.GET, 'chat_messages');
      });
    }

    return () => {
      unsubscribeAppConfig();
      unsubscribeChat();
    };
  }, [user, showAdmin, surveillanceExpanded, isQuotaExceeded, chatOpen]);

  // Auto-Update for Discord Status Webhook
  useEffect(() => {
    if (!import.meta.env.VITE_DISCORD_STATUS_WEBHOOK) return;
    
    // Initial update
    updateDiscordStatus();

    // Every 15 minutes to avoid spam but keep it fresh
    const interval = setInterval(updateDiscordStatus, 900000);
    return () => clearInterval(interval);
  }, [players.length > 0]);

  // Separate effect for admin logs
  useEffect(() => {
    if (!isAdmin || !user || isQuotaExceeded) return;
    
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'shop_logs'), orderBy('createdAt', 'desc'), limit(30));
        const snap = await getDocs(q);
        setShopLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err: any) {
        if (err.message.includes('Quota')) setIsQuotaExceeded(true);
      }
    };
    
    fetchLogs();
  }, [isAdmin, user, isQuotaExceeded]);

  useEffect(() => {
    if (!user || isQuotaExceeded) return;
    
    const fetchPurchases = async () => {
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'purchases'));
        setMyPurchases(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err: any) {
        if (err.message.includes('Quota')) setIsQuotaExceeded(true);
      }
    };
    
    fetchPurchases();
  }, [user, isQuotaExceeded]);

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
  const isAnyOverlayOpen = chatOpen || shopOpen || newsOpen || pollsOpen || showAdmin || showLoginModal || showProfileModal || showMiningModal || (openingBox as any).isOpen || isAiOpen;
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to avoid credential caching issues
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setShowLoginModal(false);
        setLoginError(null);
      }
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/invalid-credential') {
        setLoginError("Authentifizierungs-Fehler: Ungültige Anmeldedaten. Bitte versuche es erneut oder melde dich im Discord.");
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError("Popup wurde blockiert. Bitte erlaube Popups für diese Seite.");
      } else {
        setLoginError("Google Login fehlgeschlagen: " + (error.message || "Unbekannter Fehler"));
      }
      
      notifyDiscord(
        "⚠️ LOGIN-FEHLER DETEKTIERT",
        `Ein Benutzer hat versucht sich einzuloggen, aber ein Fehler ist aufgetreten.`,
        16733202,
        [
          { name: "❌ Fehler-Code", value: error.code || 'N/A', inline: true },
          { name: "📜 Nachricht", value: error.message || 'N/A', inline: false }
        ]
      );
    }
  };

  const loginWithDiscord = async () => {
    try {
      const provider = new OAuthProvider('discord.com');
      // Discord permissions: identify, email
      provider.addScope('identify');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setShowLoginModal(false);
        setLoginError(null);
        
        notifyDiscord(
          "🎮 DISCORD-LOGIN ERFOLGREICH",
          `Ein Benutzer hat sich erfolgreich via Discord authentifiziert.`,
          5793266,
          [
            { name: "👤 Name", value: result.user.displayName || 'Unbekannt', inline: true },
            { name: "📧 Email", value: result.user.email || 'N/A', inline: true }
          ]
        );
      }
    } catch (error: any) {
      console.error("Discord Login Error Details:", {
        code: error.code,
        message: error.message,
        customData: error.customData
      });

      if (error.code === 'auth/popup-blocked') {
        setLoginError("Popup wurde blockiert. Bitte erlaube Popups für diese Seite.");
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError("Discord Login ist in Firebase noch nicht aktiviert (OAuth Provider fehlt).");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("Diese Domain ist in Firebase noch nicht autorisiert.");
      } else {
        setLoginError(`Discord Login Fehler (${error.code || 'Unbekannt'}). Bitte prüfe die Konsole.`);
      }
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

    // Map username to a fake email for Firebase - SANITIZED
    const sanitizedUsername = username.trim().replace(/\s+/g, '_');
    const email = `${sanitizedUsername.toLowerCase()}@community.local`;

    try {
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create default profile for NEW user
        await setDoc(doc(db, 'user_profiles', userCred.user.uid), {
          userId: userCred.user.uid,
          displayName: username,
          minecraftUsername: username,
          role: 'Member',
          coins: 50,
          xp: 0,
          isOnline: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });

        notifyDiscord(
          "🆕 EMAIL-REGISTRIERUNG",
          `Ein neuer Benutzer hat sich via Email-Vektor angemeldet.`,
          3066993,
          [
            { name: "👤 Username", value: username, inline: true },
            { name: "🆔 ID", value: `\`${userCred.user.uid.substring(0, 8)}\``, inline: true },
            { name: "📡 IP", value: `\`${visitorInfo?.ip || '?'}\``, inline: true }
          ]
        );
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        
        // Ensure profile is online
        await setDoc(doc(db, 'user_profiles', userCred.user.uid), { isOnline: true, updatedAt: serverTimestamp() }, { merge: true });

        notifyDiscord(
          "🔑 EMAIL-LOGIN",
          `Ein Login via Email-Authentifizierung wurde durchgeführt.`,
          15105570,
          [
            { name: "👤 Username", value: username, inline: true },
            { name: "🆔 ID", value: `\`${userCred.user.uid.substring(0, 8)}\``, inline: true }
          ]
        );
      }
      setShowLoginModal(false);
    } catch (error: any) {
      console.error("Auth error", error);
      const isBlock5Attempt = username.toLowerCase() === 'block5';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setLoginError(isBlock5Attempt ? "Passwort für Block5 ist falsch oder Benutzer existiert nicht." : "Benutzer nicht gefunden oder falscher Name/Passwort.");
      } else if (error.code === 'auth/wrong-password') {
        setLoginError("Falsches Passwort.");
      } else if (error.code === 'auth/email-already-in-use') {
        setLoginError("Dieser Name ist bereits vergeben.");
      } else if (error.code === 'auth/invalid-email') {
        setLoginError("Ungültiger Name. Verwende keine Sonderzeichen.");
      } else {
        setLoginError(`Fehler: ${error.code}. Versuche den Login im neuen Fenster (Button unten).`);
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
    if (!isAdmin && !isOwner && !isSuperAdmin) {
      alert("Zugriff verweigert: Diese Systemfunktion ist der Teamleitung vorbehalten.");
      return;
    }
    const newState = !isMaintenanceMode;
    try {
      // 1. Firebase (attempt)
      const batch = writeBatch(db);
      batch.set(doc(db, 'app_config', 'system'), { 
        maintenance: newState,
        broadcast: newState ? "⚠️ SYSTEM-WARTUNG: Zugriff eingeschränkt." : null
      }, { merge: true });
      batch.set(doc(db, 'server_status', 'pvp'), { maintenance: newState }, { merge: true });
      batch.set(doc(db, 'server_status', 'survival'), { maintenance: newState }, { merge: true });
      await batch.commit();
      
      // 2. Emergency Server (Success even if Firebase fails later)
      await updateEmergencyConfig({ maintenanceMode: newState });
    } catch (e) {
      console.error("Maintenance toggle failed", e);
      // Fallback to server only
      await updateEmergencyConfig({ maintenanceMode: newState });
      setIsMaintenanceMode(newState);
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
    if (!isAdmin && !isOwner && !isSuperAdmin) return;
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

  // Logic: Scroll chat to bottom
  useEffect(() => {
    if (chatOpen) {
      const scroll = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      scroll();
      // Second attempt to ensure it works after image load or heavy render
      const timeout = setTimeout(scroll, 100);
      return () => clearTimeout(timeout);
    }
  }, [chatMessages, localMessages, chatOpen]);

  // Logic: Lock body scroll when any modal is open
  useEffect(() => {
    if (isAnyOverlayOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isAnyOverlayOpen]);

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

    // Chance auf Rarity-Upgrade pro Click (Deutlich erhöht für mehr Spaß)
    const roll = Math.random();
    if (roll > 0.4) {
      if (nextRarity === 'Standard') {
        nextRarity = 'Selten';
        setBroadcastMessage("✨ CASE UPGRADE: SELTEN!");
      } else if (nextRarity === 'Selten') {
        nextRarity = 'EPIK';
        setBroadcastMessage("🔥 CASE UPGRADE: EPIK!");
      } else if (nextRarity === 'EPIK') {
        nextRarity = 'LEGENDÄR';
        setBroadcastMessage("⚡ CASE UPGRADE: LEGENDÄR!!!");
      }
      setTimeout(() => setBroadcastMessage(null), 2000);
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
      let purchasedRank = "";
      if (item.category === 'Ränge') {
        const newRole = item.name.replace(' Rang', '').trim();
        purchasedRank = newRole;
        // ADMIN SCHUTZ: Überschreibe Admin/Owner nicht durch normale Ränge
        if (myProfile?.role === 'Admin' || myProfile?.role === 'Owner' || myProfile?.role === 'Root') {
          specialMessage = `Rang ${newRole} wurde freigeschaltet (Dein Admin-Rang bleibt sichtbar!)`;
          updates.purchasedRank = newRole; // Save the purchased rank specifically
          const currentRanks = myProfile?.purchasedRanks || [];
          if (!currentRanks.includes(newRole)) {
            updates.purchasedRanks = [...currentRanks, newRole];
          }
        } else {
          updates.role = newRole;
          updates.purchasedRank = ""; // Clear if they overwrite their primary role (e.g. going from VIP to MVP)
          specialMessage = `Du hast nun den Rang: ${newRole}`;
        }
      } 
      else if (item.category === 'Ausrüstung') {
        const powerMatch = item.description.match(/Power: (\d+)/);
        const luckMatch = item.description.match(/Luck: \+(\d+)/);
        const xpBoost = item.name?.toLowerCase()?.includes('erfahrungs-boost');

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
        if (item.name?.toLowerCase()?.includes('key')) {
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
        if (item.name?.toLowerCase()?.includes('flug')) {
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
        "🛒 TRANSAKTION: SHOP-EINKAUF",
        `Ein Benutzer hat soeben eine Transaktion im Marktplatz abgeschlossen.`,
        15844367, // Gold
        [
          { name: "👤 Käufer", value: `**${myProfile?.displayName || 'N/A'}**`, inline: true },
          { name: "📦 Produkt", value: `**${item.name}**`, inline: true },
          { name: "💰 Preis", value: `${item.price} Coins`, inline: true },
          { name: "📁 Kategorie", value: item.category, inline: true },
          { name: "📉 Neuer Kontostand", value: `${(updates.coins || newCoins).toLocaleString()} Coins`, inline: true },
          { name: "📢 Nachricht", value: specialMessage || 'Standard-Erwerb ohne Komplikationen.', inline: false }
        ],
        user.photoURL || undefined
      );
      
      await addDoc(collection(db, 'chat_messages'), {
        text: item.category === 'Ränge' 
          ? `👑 **${myProfile.displayName}** ist nun offiziell **${purchasedRank}**! Herzlichen Glückwunsch!`
          : `🛒 **${myProfile.displayName}** hat sich gerade **${item.name}** gegönnt! ${specialMessage}`,
        userId: 'system',
        displayName: 'SHOP',
        role: 'System',
        purchasedRank: purchasedRank,
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
    if (myProfile.role === 'Admin' || myProfile.role === 'Owner' || myProfile.role === 'Root') reward = 10000;
    
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
      
      // Update DB
      await updateDoc(doc(db, 'user_profiles', user.uid), {
        coins: increment(coinsPerSecond),
        xp: increment(xpReward)
      });

      // 🔥 Sync with Optimistic UI if mining modal is open
      if (showMiningModal) {
        setOptimisticCoins(prev => (prev !== null ? prev + coinsPerSecond : (myProfile?.coins || 0) + coinsPerSecond));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, coinsPerSecond, showMiningModal, myProfile?.coins]);

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

    // Spawn Impact Particles
    const centerX = e.clientX;
    const centerY = e.clientY;

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
    const damage = (myProfile?.inventory?.pickaxePower || 1);
    const baseCpc = (myProfile?.mining?.coinsPerClick || 1);
    const powerBonus = (myProfile?.inventory?.pickaxePower || 0) * 0.5;
    const luckBonus = (myProfile?.inventory?.luck || 0) * 0.1;
    const coinsPerClick = Math.floor((baseCpc + powerBonus) * (1 + luckBonus) * miningMultiplier);
    
    // 🔥 Optimistic Sync: UI Updates immediately
    const coinsStr = `+${coinsPerClick} 🪙`;
    const rewardId = Math.random();
    setFloatingRewards(prev => [...prev, {
      id: rewardId,
      text: coinsStr,
      x: centerX,
      y: centerY,
      color: '#fbbf24'
    }].slice(-10));

    // Clear reward after 1s
    setTimeout(() => {
      setFloatingRewards(prev => prev.filter(r => r.id !== rewardId));
    }, 1000);

    if (optimisticCoins === null) setOptimisticCoins((myProfile?.coins || 0) + coinsPerClick);
    else setOptimisticCoins(prev => (prev || 0) + coinsPerClick);

    setTimeout(() => {
      setPickaxeSwing(false);
      setHitFeedback(false);
      setMiningShake(0);
    }, 100);
    
    const colors: Record<string, string> = {
      'Stone': '#737373', 'Coal': '#333333', 'Iron': '#cbd5e1', 'Gold': '#fbbf24', 'Diamond': '#60a5fa', 'Emerald': '#10b981', 'TNT': '#ef4444', 'Chest': '#b45309'
    };

    const particleCount = miningBlock.type === 'TNT' ? 40 : 8;
    const particles = Array.from({ length: particleCount }).map(() => ({
      id: Math.random(),
      x: centerX,
      y: centerY,
      color: colors[miningBlock.type] || '#ffffff',
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20 - 10
    }));
    setMiningParticles(prev => [...prev, ...particles].slice(-60));
    
    if (user) {
      updateDoc(doc(db, 'user_profiles', user.uid), {
        coins: increment(coinsPerClick)
      });
    }

    const newHealth = Math.max(0, miningBlock.health - damage);

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
    
    // Floating reward for block destruction
    const blockRewardId = Math.random();
    setFloatingRewards(prev => [...prev, {
      id: blockRewardId,
      text: `+${finalCoins} 🪙`,
      x: centerX,
      y: centerY - 50,
      color: '#fbbf24'
    }].slice(-10));

    setTimeout(() => {
      setFloatingRewards(prev => prev.filter(r => r.id !== blockRewardId));
    }, 1500);

    // Synchronize optimistic coins
    if (optimisticCoins !== null) {
      setOptimisticCoins(prev => (prev || 0) + finalCoins);
    }

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
      const existingNames = shopItems.map(i => i.name?.toLowerCase() || '');
      
      let addedCount = 0;
      for (const item of items) {
        if (!existingNames.includes(item.name?.toLowerCase() || '')) {
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
    if (!isAdmin && !isOwner && !isSuperAdmin) {
      alert("Halt Stop! Das darf nur die Heeresleitung.");
      return;
    }
    if (!confirm('⚡ EXTREMER CHAT-WIPE: ALLES wird gelöscht. Fortfahren?')) return;
    try {
      const deletedCount = await deleteCollectionInWaves('chat_messages');
      
      notifyDiscord(
        "☢️ CHAT-REINIGUNG (LEVEL 4)",
        `Eine vollständige Bereinigung des globalen Kommunikations-Streams wurde durchgeführt.`,
        16711680,
        [
          { name: "🛡️ Autorität", value: myProfile?.displayName || user?.displayName || 'N/A', inline: true },
          { name: "🧹 Gelöscht", value: `${deletedCount} Datensätze`, inline: true },
          { name: "⚡ Status", value: "Chat-Speicher vollständig geleert", inline: false }
        ]
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

  const logout = async () => {
    if (user) {
      notifyDiscord(
        "👋 BENUTZER-LOGOUT",
        `Die aktive Session von **${myProfile?.displayName || user.displayName || 'Unbekannt'}** wurde beendet.`,
        9807270,
        [
          { name: "👤 Benutzer", value: myProfile?.displayName || 'N/A', inline: true },
          { name: "⏳ Session-Dauer", value: `Beendet um ${new Date().toLocaleTimeString()}`, inline: true }
        ],
        user.photoURL || undefined
      );
      
      // Update online status in Firestore before actual logout
      try {
        await setDoc(doc(db, 'user_profiles', user.uid), { isOnline: false, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.error("Logout status update failed", e);
      }
    }
    signOut(auth);
  };

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
    if (!targetId || !user) return; // Must be logged in

    // Security & Hierarchy
    const targetProfile = userProfiles.find(p => p.userId === targetId);
    if (targetId !== user.uid) {
      if (!isAdmin) {
        alert("Nicht autorisiert.");
        return;
      }
      
      const targetIsStaff = targetProfile?.role === 'Owner' || targetProfile?.role === 'Admin' || targetProfile?.role === 'Root';
      if (targetIsStaff && !isOwner) {
        alert("Admins können keine anderen Teammitglieder bearbeiten. (Nur Owner)");
        return;
      }
    }

    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('displayName') as string;
    const minecraftUsername = formData.get('minecraftUsername') as string;
    const currentServer = formData.get('currentServer') as 'none' | 'pvp' | 'survival';
    const isOnline = currentServer !== 'none' || formData.get('isOnline') === 'on';
    const role = formData.get('role') as any;
    const coins = parseInt(formData.get('coins') as string) || 0;

    try {
      const existingProfile = targetProfile;
      let finalRole = existingProfile?.role || 'Member';
      let finalCoins = existingProfile?.coins || 0;

      if (isAdmin) {
        // Only Owners can assign Admin/Owner roles
        const isSettingStaffRole = role === 'Admin' || role === 'Owner' || role === 'Root';
        if (isSettingStaffRole && !isOwner) {
          alert("Du kannst keine Team-Ränge vergeben. (Nur Owner)");
          finalRole = existingProfile?.role || 'Member';
        } else {
          finalRole = role || finalRole;
        }
        finalCoins = coins;
      }

      await setDoc(doc(db, 'user_profiles', targetId), {
        userId: targetId,
        displayName,
        minecraftUsername,
        isOnline,
        currentServer,
        coins: finalCoins,
        role: finalRole,
        customSkin: tempSkin || null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      notifyDiscord(
        "🧬 PROFIL-MODIFIKATION (STAFF)",
        `Ein Benutzerprofil wurde durch einen Administrator angepasst.`,
        2123412, // Dark Greenish
        [
          { name: "👮 Admin", value: myProfile?.displayName || user?.displayName || 'System', inline: true },
          { name: "🎯 Ziel-Konto", value: targetProfile?.displayName || 'Unbekannt', inline: true },
          { name: "📊 Neue Daten", value: `Rolle: ${role || targetProfile?.role}\nCoins: ${coins}`, inline: false }
        ]
      );

      setShowProfileModal(false);
      setEditingProfileId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_profiles/${targetId}`);
    }
  };

  // Listen to clan members when user is in a clan or viewing one
  useEffect(() => {
    if (!activeClanId || isQuotaExceeded) return;
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
  }, [activeClanId, user, isQuotaExceeded]);

  const sendClanMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeClanId || !clanChatInput.trim()) return;
    
    // ROOT CONSOLE (Staff commands in clan chat)
    if ((isSuperAdmin || isOwner || isAdmin) && clanChatInput.startsWith('/root.')) {
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

    const clanId = name?.toLowerCase()?.replace(/\s+/g, '-') || `clan-${Date.now()}`;

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
        "⚜️ CLAN-GRÜNDUNG",
        `Ein neues Machtzentrum wurde im System etabliert.`,
        15105570,
        [
          { name: "🛡️ Clan-Name", value: name, inline: true },
          { name: "🏷️ Tag", value: `[${tag.toUpperCase()}]`, inline: true },
          { name: "👑 Gründer", value: myProfile?.displayName || user.displayName, inline: true },
          { name: "📜 Vision", value: description || 'Keine Angabe', inline: false }
        ]
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
    const clan = clans.find(c => c.id === clanId);
    if (!clan) {
      alert("Clan nicht gefunden.");
      return;
    }
    
    // Permission check: Leader OR Admin/Owner/Root
    const canDelete = (user && clan.leaderId === user.uid) || isAdmin;
    
    if (!canDelete) {
      alert('Du hast keine Berechtigung, diesen Clan aufzulösen. (Admins/Owner oder Leader einzige Erlaubnis)');
      return;
    }
    
    if (!confirm(`🚨 CLAN-AUFLÖSUNG: Bist du sicher, dass du "${clan.name}" [${clan.tag}] löschen möchtest? Alle Daten gehen verloren!`)) return;
    
    try {
      console.log(`Starting deletion for clan ${clanId}... (Initiator: ${user?.uid})`);
      
      // Clean up subcollections
      await Promise.all([
        deleteCollectionInWaves(`clans/${clanId}/members`).catch(e => console.error("Error deleting members:", e)),
        deleteCollectionInWaves(`clans/${clanId}/chat`).catch(e => console.error("Error deleting chat:", e)),
        deleteCollectionInWaves(`clans/${clanId}/requests`).catch(e => console.error("Error deleting requests:", e)),
        deleteCollectionInWaves(`clans/${clanId}/quests`).catch(e => console.error("Error deleting quests:", e))
      ]);
      
      console.log(`Sub-collections for clan ${clanId} deletion attempted. Deleting main document...`);
      await deleteDoc(doc(db, 'clans', clanId));
      
      notifyDiscord(
        "🏚️ CLAN-AUFLÖSUNG",
        `Ein Clan wurde von einem Admin oder dem Leader aufgelöst.`,
        16711680,
        [
          { name: "🛡️ Clan", value: `${clan.name} [${clan.tag}]`, inline: true },
          { name: "🚧 Initiator", value: myProfile?.displayName || user?.displayName || 'N/A', inline: true },
          { name: "⚠️ Status", value: "Vollständig gelöscht", inline: false }
        ]
      );

      alert(`Der Clan "${clan.name}" wurde erfolgreich aufgelöst.`);
      
      if (activeClanId === clanId) {
        setActiveClanId(null);
        setMyClan(null);
      }
    } catch (err) {
      console.error("Critical Error during clan deletion:", err);
      alert("Fehler beim Löschen des Clans. Details siehe Konsole.");
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
      const command = parts[0]?.toLowerCase() || '';
      const args = parts.slice(1);

      try {
        switch (command) {
          case 'help': {
            notifyDiscord(
              "⚙️ COMMAND-USAGE: /help",
              `Benutzer **${myProfile?.displayName}** hat die Hilfe aufgerufen.`,
              2123412,
              [
                { name: "👤 User", value: myProfile?.displayName || 'N/A', inline: true },
                { name: "📡 IP", value: `\`${visitorInfo?.ip || '?'}\``, inline: true }
              ]
            );
            const adminCmds = isAdmin ? '\n\n§c[ADMIN-BEDIENER]§r\n§7/root.invisible§r - Ninja-Modus\n§7/root.mute [User]§r - Silent-Mute\n§7/root.coins [User] [Betrag]§r - Kontostand hacken\n§7/root.xp [User] [Betrag]§r - Level manipulieren\n§7/root.nuke§r - Alles weglöschen\n§7/root.broadcast [Text]§r - Globale Megaphon-Nachricht' : '';
            sendSystemMsg(`§6§l--- BEFEHLS-ZENTRALE ---§r\n§e/stats [Spieler]§r - Level, Coins & XP abrufen\n§e/pay [User] [Betrag]§r - Coins spendieren\n§e/top§r - Wer ist der Beste?\n§e/list§r - Wer treibt sich hier rum?\n§e/me [Aktion]§r - Rollenspiel-Action\n§e/rank§r - XP-Fortschritt checken\n§e/rules§r - Was darf ich?\n§e/discord§r - Server-Invite\n§e/ai [Frage]§r - Das Orakel befragen ✨\n§e/ping§r - Verbindungs-Check\n§e/calc [Formel]§r - Der smarte Rechner\n§e/roll [max]§r - Glücksrad\n§e/flip§r - Münze werfen\n§e/joke§r - Lass mich dich unterhalten\n§e/clear§r - Chat sauber machen${adminCmds}`);
            break;
          }
          case 'ai':
          case 'oracle': {
            setIsAiOpen(true);
            if (args.length > 0) {
              handleAiChat(args.join(' '));
            } else {
              sendSystemMsg("§6Das scharfe Orakel wurde gerufen!§r ✨");
            }
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
            if (targetName?.toLowerCase() === myProfile?.minecraftUsername?.toLowerCase() || targetName?.toLowerCase() === myProfile?.displayName?.toLowerCase()) {
              sendSystemMsg("§cDu kannst dir nicht selbst Geld überweisen!§r");
              break;
            }
            if ((myProfile?.coins || 0) < amount) {
              sendSystemMsg("§cOperation abgelehnt: Guthaben nicht ausreichend!§r");
              break;
            }
            const targetProf = userProfiles.find(p => 
              (p.minecraftUsername?.toLowerCase() === targetName?.toLowerCase()) || 
              (p.displayName?.toLowerCase() === targetName?.toLowerCase())
            );
            if (!targetProf) {
              sendSystemMsg(`§cEmpfänger "${targetName}" im System unauffindbar.§r`);
              break;
            }
            
            await setDoc(doc(db, 'user_profiles', user.uid), { coins: (myProfile?.coins || 0) - amount }, { merge: true });
            await setDoc(doc(db, 'user_profiles', targetProf.userId), { coins: (targetProf.coins || 0) + amount }, { merge: true });
            
            // Discord Transaction Log
            notifyDiscord(
              "💸 COIN-TRANSFER PROTOKOLL",
              `Eine interne Währungsübertragung wurde autorisiert.`,
              15158332,
              [
                { name: "📤 Sender", value: myProfile?.displayName || 'N/A', inline: true },
                { name: "📥 Empfänger", value: targetProf.displayName || 'N/A', inline: true },
                { name: "💰 Volumen", value: `${amount} Coins`, inline: true },
                { name: "🛰️ Tracking-ID", value: `TX-${Math.random().toString(36).substring(7).toUpperCase()}`, inline: false }
              ]
            );

            await addDoc(collection(db, 'chat_messages'), {
              text: `💸 **${myProfile?.displayName}** hat **${amount} Coins** an **${targetProf.displayName}** überwiesen!`,
              userId: 'system',
              displayName: 'BANK',
              role: 'System',
              createdAt: serverTimestamp(),
              tempId: `sys-${Date.now()}-${Math.random()}`
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
              isAction: true,
              tempId: `act-${Date.now()}-${Math.random()}`
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
            const targetProf = userProfiles.find(p => p.minecraftUsername?.toLowerCase() === targetName?.toLowerCase() || p.displayName?.toLowerCase() === targetName?.toLowerCase());
            if (!targetProf) {
              sendSystemMsg(`§cFehler: Spieler-Profil "${targetName}" nicht gefunden.§r`);
            } else {
              const lv = getLevel(targetProf.xp || 0);
              const statusStr = targetProf.isOnline ? '§aONLINE§r' : '§cOFFLINE§r';
              sendSystemMsg(`§b§lAKTE: ${targetProf.displayName?.toUpperCase() || 'UNBEKANNT'}§r\n§8----------------------§r\n§eRang:§r ${targetProf.role || 'Member'}\n§eLevel:§r §l${lv}§r (${targetProf.xp || 0} XP)\n§eCoins:§r ${targetProf.coins || 0}\n§eRealm:§r ${targetProf.currentServer || 'Keiner'}\n§eStatus:§r ${statusStr}`);
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
              isAction: true,
              tempId: `roll-${Date.now()}`
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
              isAction: true,
              tempId: `flip-${Date.now()}`
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
              createdAt: serverTimestamp(),
              tempId: `shrug-${Date.now()}`
            });
            break;
          }
          case 'lenny': {
            await addDoc(collection(db, 'chat_messages'), {
              text: '( ͡° ͜ʖ ͡°)',
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp(),
              tempId: `lenny-${Date.now()}`
            });
            break;
          }
          case 'tableflip': {
            await addDoc(collection(db, 'chat_messages'), {
              text: '(╯°□°）╯︵ ┻━┻',
              userId: user.uid,
              displayName: myProfile?.displayName || 'Unbekannt',
              role: myProfile?.role || 'Member',
              createdAt: serverTimestamp(),
              tempId: `tableflip-${Date.now()}`
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
              isAction: true,
              tempId: `hug-${Date.now()}`
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
              isAction: true,
              tempId: `slap-${Date.now()}`
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
                      sendSystemMsg(`§6§lROOT:§r Stealth-Modus nun ${!myProfile?.isInvisible ? '§aAKTIVIERT§r' : '§cDEAKTIVIERT§r'}.`);
                      break;
                    case 'mute': {
                      const target = args[0];
                      if (!target) { sendSystemMsg("§cVerwendung: /root.mute [Name]§r"); break; }
                      const targetProf = userProfiles.find(p => p.minecraftUsername?.toLowerCase() === target?.toLowerCase() || p.displayName?.toLowerCase() === target?.toLowerCase());
                      if (targetProf) {
                        const isStaff = targetProf.role === 'Owner' || targetProf.role === 'Admin' || targetProf.role === 'Root';
                        if (isStaff && !isOwner) {
                          sendSystemMsg("§cError: Du kannst keine Teammitglieder stummschalten!§r");
                          break;
                        }
                        await setDoc(doc(db, 'user_profiles', targetProf.userId), { isShadowMuted: !targetProf.isShadowMuted }, { merge: true });
                        sendSystemMsg(`§6§lROOT:§r Shadowmute für ${targetProf.displayName} ${!targetProf.isShadowMuted ? '§aGESETZT§r' : '§cENTFERNT§r'}.`);
                      }
                      break;
                    }
                    case 'coins': {
                      const target = args[0];
                      if (!target || !args[1]) { sendSystemMsg("§cVerwendung: /root.coins [Name] [Betrag]§r"); break; }
                      const targetProf = userProfiles.find(p => p.minecraftUsername?.toLowerCase() === target?.toLowerCase() || p.displayName?.toLowerCase() === target?.toLowerCase());
                      if (targetProf) {
                        const isStaff = targetProf.role === 'Owner' || targetProf.role === 'Admin' || targetProf.role === 'Root';
                        if (isStaff && !isOwner) {
                          sendSystemMsg("§cError: Konten von Teammitgliedern können nur von Besitzern manipuliert werden!§r");
                          break;
                        }
                        await setDoc(doc(db, 'user_profiles', targetProf.userId), { coins: parseInt(args[1]) }, { merge: true });
                        sendSystemMsg(`§6§lROOT:§r Coins von ${targetProf.displayName} auf §e${args[1]}§r gesetzt.`);
                      }
                      break;
                    }
                    case 'xp': {
                      const target = args[0];
                      if (!target || !args[1]) { sendSystemMsg("§cVerwendung: /root.xp [Name] [Betrag]§r"); break; }
                      const targetProf = userProfiles.find(p => p.minecraftUsername?.toLowerCase() === target?.toLowerCase() || p.displayName?.toLowerCase() === target?.toLowerCase());
                      if (targetProf) {
                        const isStaff = targetProf.role === 'Owner' || targetProf.role === 'Admin' || targetProf.role === 'Root';
                        if (isStaff && !isOwner) {
                          sendSystemMsg("§cError: XP von Teammitgliedern können nur von Besitzern manipuliert werden!§r");
                          break;
                        }
                        await setDoc(doc(db, 'user_profiles', targetProf.userId), { xp: parseInt(args[1]) }, { merge: true });
                        sendSystemMsg(`§6§lROOT:§r XP von ${targetProf.displayName} auf §b${args[1]}§r gesetzt.`);
                      }
                      break;
                    }
                    case 'nuke':
                      if (!isOwner) {
                        sendSystemMsg("§cError: /root.nuke ist ein exklusiver Owner-Befehl!§r");
                        break;
                      }
                      nukeChat();
                      sendSystemMsg("§4§lDETONATION ERFOLGT:§r Chat wurde vollständig bereinigt.");
                      break;
                    case 'maintenance':
                      toggleMaintenance();
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
    const inputToSend = chatInput.trim();
    setChatInput('');
    
    // Safety check for offline users
    if (!navigator.onLine) {
      sendSystemMsg('Du bist aktuell offline! Deine Nachricht wird gesendet, sobald die Verbindung steht.', 'SYSTEM');
      // Note: Firestore actually handles offline queuing, but we want to show visual feedback better
    }

    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(7);
    const tempMsg: ChatMessage = {
      id: tempId,
      text: inputToSend,
      userId: user.uid,
      displayName: (myProfile?.displayName || user.displayName || 'Unbekannt').substring(0, 64),
      role: (myProfile?.role || 'Member').substring(0, 64),
      purchasedRank: myProfile?.purchasedRank,
      createdAt: null,
      tempId: tempId
    };
    
    setLocalMessages(prev => {
      // Prevent duplicates in local state
      if (prev.some(m => m.text === inputToSend && (Date.now() - parseInt(m.id.split('-')[1]) < 1000))) {
        return prev;
      }
      return [...prev, tempMsg];
    });
    
    let retries = 0;
    const maxRetries = 3;

    const executeSend = async () => {
      try {
        await addDoc(collection(db, 'chat_messages'), {
          text: inputToSend,
          userId: user.uid,
          displayName: (myProfile?.displayName || user.displayName || 'Unbekannt').substring(0, 64),
          role: (myProfile?.role || 'Member').substring(0, 64),
          purchasedRank: myProfile?.purchasedRank || "",
          createdAt: serverTimestamp(),
          tempId: tempId
        });
        
        notifyDiscord(
          "💬 CHAT-LIVESTREAM",
          `Eine neue Nachricht wurde im globalen Chat gesendet.`,
          3447003,
          [
            { name: "👤 Absender", value: myProfile?.displayName || user.displayName || 'Unbekannt', inline: true },
            { name: "💬 Nachricht", value: inputToSend, inline: false }
          ]
        );
      } catch (err) {
        if (retries < maxRetries && navigator.onLine) {
          retries++;
          const delay = Math.pow(2, retries) * 800; // Exponential backoff
          setTimeout(executeSend, delay);
        } else {
          setLocalMessages(prev => prev.filter(m => m.id !== tempId));
          setChatInput(inputToSend); // Restore input on final failure
          sendSystemMsg('Nachricht konnte nicht zugestellt werden. Bitte erneut versuchen.', 'FEHLER');
          handleFirestoreError(err, OperationType.CREATE, 'chat_messages');
        }
      }
    };

    executeSend();
    
    // Long-term cleanup fallback
    setTimeout(() => {
      setLocalMessages(prev => prev.filter(m => m.id !== tempId));
    }, 30000);
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
    const playerId = username?.toLowerCase() || `player-${Date.now()}`;
    
    try {
      await setDoc(doc(db, 'online_players', playerId), {
        username,
        server,
        lastSeen: new Date().toISOString()
      });
      // Update count locally for faster UI
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
        batch.delete(doc(db, 'online_players', player.id?.toLowerCase() || player.id));
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
        "🦶 SPIELER-MASSNAHME ERGRIFFEN",
        `Ein Administrator hat eine Moderations-Aktion durchgeführt.`,
        16776960,
        [
          { name: "👮 Admin", value: myProfile?.displayName || 'System', inline: true },
          { name: "🎯 Ziel-ID", value: `\`${player.id}\``, inline: true },
          { name: "🛠️ Methode", value: action ? '🔴 VOLLSTÄNDIGE LÖSCHUNG' : '🟡 SOFT-KICK', inline: false }
        ]
      );

      console.log(`[EXTREME] Action performed on ${player.id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `kick_${player.type}/${player.id}`);
    }
  };

  const clearPlayers = async () => {
    if (!isOwner && !isSuperAdmin) return;
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
        "🌊 GLOBALER STATUS-RESET",
        `Die Online-Listen wurden vollständig bereinigt.`,
        16753920,
        [
          { name: "👮 Admin", value: myProfile?.displayName || 'System', inline: true },
          { name: "📡 Gelöschte Einträge", value: `${deletedManual}`, inline: true },
          { name: "⚙️ System-Status", value: "ALL_PROFILES_OFFLINED", inline: false }
        ]
      );

      console.log(`[EXTREME] Reset complete. Cleared ${deletedManual} manual entries.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'clear_players');
    }
  };

  const totalReset = async () => {
    if (!isOwner && !isSuperAdmin) return;
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
    if (!isOwner && !isSuperAdmin) return;
    if (!confirm('🔥 DATABASE PURGE: Alle Benutzerprofile löschen?')) return;
    try {
      const deleted = await deleteCollectionInWaves('user_profiles');
      console.log(`Database Purge: ${deleted} profiles removed.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'user_profiles');
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!isOwner && !isSuperAdmin) return;
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
        batch.delete(doc(db, 'online_players', profile.minecraftUsername?.toLowerCase()));
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

  const updateRealmName = async (server: 'pvp' | 'survival', name: string) => {
    if (!isAdmin && !isOwner && !isSuperAdmin) return;
    try {
      await setDoc(doc(db, 'app_config', 'system'), {
        realmNames: {
          [server]: name
        }
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'app_config/system');
    }
  };

  const updateRealmColor = async (server: 'pvp' | 'survival', color: string) => {
    if (!isAdmin && !isOwner && !isSuperAdmin) return;
    try {
      await setDoc(doc(db, 'app_config', 'system'), {
        realmColors: {
          [server]: color
        }
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'app_config/system');
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
      .map(p => ({ username: p.minecraftUsername, id: p.userId, type: 'profile', role: p.role || 'Member', ip: p.lastLoginIp, purchasedRank: p.purchasedRank })),
    ...pvpPlayers.map(p => ({ username: p.username, id: p.id, type: 'manual', role: 'Member', ip: null }))
  ].filter((player, index, self) => 
    index === self.findIndex((t) => t.username?.toLowerCase() === player.username?.toLowerCase())
    && (!userProfiles.find(up => up.minecraftUsername?.toLowerCase() === player.username?.toLowerCase())?.isInvisible || isAdmin)
  );

  const combinedSurvivalPlayers = [
    ...userProfiles
      .filter(p => p.isOnline && p.currentServer === 'survival' && (!p.isInvisible || isAdmin))
      .map(p => ({ username: p.minecraftUsername, id: p.userId, type: 'profile', role: p.role || 'Member', ip: p.lastLoginIp, purchasedRank: p.purchasedRank })),
    ...survivalPlayers.map(p => ({ username: p.username, id: p.id, type: 'manual', role: 'Member', ip: null }))
  ].filter((player, index, self) => 
    index === self.findIndex((t) => t.username?.toLowerCase() === player.username?.toLowerCase())
    && (!userProfiles.find(up => up.minecraftUsername?.toLowerCase() === player.username?.toLowerCase())?.isInvisible || isAdmin)
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
    index === self.findIndex((t) => t.username?.toLowerCase() === player.username?.toLowerCase())
    && (!userProfiles.find(up => up.minecraftUsername?.toLowerCase() === player.username?.toLowerCase())?.isInvisible || isAdmin)
  );

  // Final Unified Community Status List (Synced with Firebase) - Deduped by lowercase username
  // Filter out any duplicates and invalid entries
  const communityDisplayList = Array.from(new Map(
    userProfiles
      .filter(p => p.userId && (p.displayName || p.minecraftUsername)) 
      .sort((a,b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0) || (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
      .filter(p => !p.isInvisible || isAdmin)
      .map(p => {
        const name = (p.minecraftUsername || p.displayName || p.userId || '').trim();
        const key = name.toLowerCase();
        
        // Respect STAFF_OVERWRITES for fixed roles (like dampfk and Block5)
        const rawRole = p.role || 'Member';
        const overwrittenRole = STAFF_OVERWRITES[name] || STAFF_OVERWRITES[p.displayName || ''] || rawRole;
        const displayRole = (overwrittenRole === 'Owner' || overwrittenRole === 'Root') ? 'Owner' : (overwrittenRole === 'Admin') ? 'Admin' : overwrittenRole;
        
        // If staff role overwritten a purchased rank role, preserve it as purchased rank
        let effectivePurchasedRank = p.purchasedRank;
        if ((!effectivePurchasedRank || effectivePurchasedRank === 'undefined') && (rawRole === 'VIP' || rawRole === 'MVP')) {
          if (displayRole === 'Owner' || displayRole === 'Admin' || displayRole === 'Mod') {
            effectivePurchasedRank = rawRole;
          }
        }

        return [key, {
          username: name,
          displayName: p.displayName,
          userId: p.userId,
          isOnline: p.isOnline,
          role: displayRole,
          purchasedRank: effectivePurchasedRank,
          profile: p,
          server: p.currentServer || 'none',
          lastLoginIp: p.lastLoginIp,
          lastLoginCity: p.lastLoginCity
        }];
      })
  ).values()).slice(0, 60);

  const staffList = Array.from(new Map(
    userProfiles
      .filter(p => {
        const name = (p.minecraftUsername || p.displayName || p.userId || '').trim();
        const role = STAFF_OVERWRITES[name] || STAFF_OVERWRITES[p.displayName || ''] || p.role;
        return (role === 'Owner' || role === 'Admin' || role === 'Mod' || role === 'Root');
      })
      .sort((a,b) => {
        const nameA = (a.minecraftUsername || a.displayName || a.userId || '').trim();
        const nameB = (b.minecraftUsername || b.displayName || b.userId || '').trim();
        const roleA = STAFF_OVERWRITES[nameA] || STAFF_OVERWRITES[a.displayName || ''] || a.role;
        const roleB = STAFF_OVERWRITES[nameB] || STAFF_OVERWRITES[b.displayName || ''] || b.role;
        
        const rank = { 'Root': 0, 'Owner': 1, 'Admin': 2, 'Mod': 3 };
        const rankValueA = rank[roleA as keyof typeof rank] ?? 99;
        const rankValueB = rank[roleB as keyof typeof rank] ?? 99;
        
        // Sort lowest priority first so map preserves highest
        if (rankValueA !== rankValueB) return rankValueB - rankValueA;
        if (a.isOnline !== b.isOnline) return a.isOnline ? 1 : -1;
        return (a.updatedAt?.seconds || 0) - (b.updatedAt?.seconds || 0);
      })
      .map(p => [(p.minecraftUsername || p.displayName || p.userId || '').trim().toLowerCase(), p])
  ).values()).sort((a: any, b: any) => {
    const nameA = (a.minecraftUsername || a.displayName || a.userId || '').trim();
    const nameB = (b.minecraftUsername || b.displayName || b.userId || '').trim();
    const roleA = STAFF_OVERWRITES[nameA] || STAFF_OVERWRITES[a.displayName || ''] || a.role;
    const roleB = STAFF_OVERWRITES[nameB] || STAFF_OVERWRITES[b.displayName || ''] || b.role;
    
    const rank = { 'Root': 0, 'Owner': 1, 'Admin': 2, 'Mod': 3 };
    const rankValueA = rank[roleA as keyof typeof rank] ?? 99;
    const rankValueB = rank[roleB as keyof typeof rank] ?? 99;
    if (rankValueA !== rankValueB) return rankValueA - rankValueB;
    if (a.isOnline !== b.isOnline) return b.isOnline ? 1 : -1;
    return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
  });

  const totalOnline = userProfiles.filter(p => p.isOnline).length;

  return (
    <div className="min-h-screen relative overflow-hidden pixel-grid bg-black">
      <FloatingParticles />
      {/* Emergency Fallback Banner */}
      {isMaintenanceMode && (
        <motion.div 
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="fixed top-0 left-0 right-0 bg-red-600/90 backdrop-blur-md text-white py-1 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-center border-b border-red-500/50 z-[9991] flex items-center justify-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]"></div>
          <ShieldAlert size={10} className="animate-pulse" />
          <span>⚠️ EMERGENCY-BACKUP AKTIV: KRITISCHE DATEN WERDEN VOM LOKALEN SERVER GEHODELT (FIREBASE QUOTA LIMIT)</span>
          <ShieldAlert size={10} className="animate-pulse" />
        </motion.div>
      )}

      {/* Background Video/Effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-mc-red/5 to-transparent animate-pulse" />
        <div className="w-full h-full opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ff4747 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 z-[2] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20" />

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
      {isSuperAdmin && !isAnyOverlayOpen && (
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
              className="max-w-5xl w-full h-full sm:h-[85vh] bg-neutral-900/40 border border-white/5 rounded-none sm:rounded-[3rem] overflow-hidden flex flex-col relative z-10 shadow-[0_0_100px_rgba(0,0,0,1)]"
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
                       <p className="text-xl font-black text-mc-gold italic">
                         {optimisticCoins !== null ? optimisticCoins.toLocaleString() : (myProfile?.coins?.toLocaleString() || 0)} 🪙
                       </p>
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
              <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden bg-[#1a1a1a] relative custom-scrollbar">
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
                <div className="w-full md:w-1/2 h-auto min-h-[300px] md:h-full flex flex-col items-center justify-center p-4 md:p-6 sm:border-r border-white/5 relative z-10 select-none touch-pan-y">
                  <div className="mb-4 md:mb-8 text-center space-y-1 scale-90 md:scale-100 pointer-events-none">
                     <h2 className="text-white font-black text-2xl md:text-3xl tracking-[0.3em] uppercase drop-shadow-mc">Mining Clicker</h2>
                     <p className="text-mc-gold font-bold italic text-sm">CPS: {coinsPerSecond} Coins/s</p>
                  </div>

                  {/* Center Game Area */}
                  <div className="flex-1 flex flex-col items-center justify-center relative w-full overflow-visible touch-pan-y">
                    <div className="absolute inset-0 pointer-events-none z-0">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[400px] md:h-[600px] w-full opacity-5 blur-[80px] bg-mc-gold rounded-full" />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={miningBlock.type}
                        initial={{ scale: 0.3, rotate: -30, opacity: 0, y: 50 }}
                        animate={{ scale: 0.8, rotate: 0, opacity: 1, y: 0 }} 
                        whileInView={{ scale: window.innerWidth < 768 ? 0.7 : 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                        className="relative z-50 w-48 h-48 sm:w-72 sm:h-72 group cursor-pointer touch-pan-y"
                        onClick={mineBlock}
                        style={{ touchAction: 'pan-y' }}
                      >
                        {/* Health Bar */}
                        <div className="absolute -top-12 md:-top-16 left-1/2 -translate-x-1/2 w-48 md:w-64 text-center space-y-2 md:space-y-3 pointer-events-none">
                          <p className="text-white font-black text-sm md:text-xl uppercase tracking-[0.4em] drop-shadow-mc-thick shrink-0">
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
                <div className="w-full md:w-1/2 min-h-[400px] md:min-h-0 h-auto md:h-full flex flex-col bg-black/30 backdrop-blur-md md:border-l border-t md:border-t-0 border-white/5 md:overflow-hidden relative flex-shrink-0">
                  <div className="flex-shrink-0 bg-[#1a1a1a]/80 backdrop-blur-sm z-50 p-4 md:p-6 pb-2 border-b border-white/5">
                    <h3 className="text-mc-gold font-black text-lg md:text-xl flex items-center gap-2 drop-shadow-mc">
                      <ShoppingBag size={24} /> UPGRADES & MINERS
                    </h3>
                  </div>

                  <div className="flex-1 md:overflow-y-auto p-3 sm:p-6 space-y-3 custom-scrollbar touch-pan-y overscroll-contain relative scroll-smooth h-auto md:h-full min-h-[200px]">
                    {[
                      { id: 'miner_1', name: 'Holz-Mitarbeiter', price: 150, cps: 1, icon: Pickaxe, desc: 'Ein einfacher Helfer für den Start.', type: 'miner' },
                      { id: 'miner_2', name: 'Eisen-Bergmann', price: 1000, cps: 8, icon: UserIcon, desc: 'Ausgebildeter Facharbeiter.', type: 'miner' },
                      { id: 'miner_3', name: 'Mining-Team', price: 6000, cps: 55, icon: Users, desc: 'Ein ganzer Trupp Profis im Einsatz.', type: 'miner' },
                      { id: 'click_1', name: 'Goldmünze', price: 500, cpc: 2, icon: Gem, desc: 'Zusätzliche Münzen pro Klick.', type: 'click' },
                      { id: 'click_2', name: 'Schatzbeutel', price: 3000, cpc: 8, icon: Package, desc: 'Viel mehr Münzen pro Klick.', type: 'click' },
                      { id: 'click_3', name: 'Ender-Schatz', price: 15000, cpc: 25, icon: Castle, desc: 'Göttliche Ausbeute bei jedem Schlag.', type: 'click' },
                      { id: 'power_1', name: 'Scharfe Kante', price: 400, power: 1, icon: Zap, desc: '+1 Schaden pro Klick.', type: 'power' },
                      { id: 'power_2', name: 'Wuchtiger Schlag', price: 2500, power: 6, icon: Hammer, desc: '+6 Schaden pro Klick.', type: 'power' },
                      { id: 'power_3', name: 'Nether-Effizienz', price: 8000, power: 20, icon: Flame, desc: '+20 Schaden pro Klick.', type: 'power' },
                      { id: 'miner_4', name: 'Diamant-Bohrer', price: 25000, cps: 250, icon: Settings, desc: 'Industrielle Bohrleistung.', type: 'miner' },
                      { id: 'miner_5', name: 'Laser-Extraktor', price: 100000, cps: 1200, icon: Target, desc: 'Schmilzt Gestein in Sekunden.', type: 'miner' },
                      { id: 'click_4', name: 'Königlicher Segen', price: 50000, cpc: 100, icon: Trophy, desc: 'Jeder Klick ist ein Vermögen wert.', type: 'click' },
                      { id: 'power_4', name: 'Weltenspalter', price: 40000, power: 85, icon: Swords, desc: 'Kein Block hält diesem Schlag stand.', type: 'power' },
                    ].map((item) => {
                      const currentCoins = optimisticCoins !== null ? optimisticCoins : (myProfile?.coins || 0);
                      const canAfford = currentCoins >= item.price;
                      const typeColor = item.type === 'miner' ? 'text-blue-400' : item.type === 'click' ? 'text-yellow-400' : 'text-mc-red';
                      const typeBg = item.type === 'miner' ? 'bg-blue-400/10' : item.type === 'click' ? 'bg-yellow-400/10' : 'bg-mc-red/10';

                      return (
                        <motion.button
                          key={item.id}
                          whileHover={canAfford ? { scale: 1.02, x: 5, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
                          whileTap={canAfford ? { scale: 0.98 } : {}}
                          onClick={async () => {
                             if (!canAfford || !user) return;
                             
                             // 🔥 Optimistic UI update
                             if (optimisticCoins !== null) {
                               setOptimisticCoins(prev => (prev || 0) - item.price);
                             } else {
                               setOptimisticCoins((myProfile?.coins || 0) - item.price);
                             }

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

                             try {
                               await updateDoc(doc(db, 'user_profiles', user.uid), updates);
                               
                               // Feedback
                               setFloatingRewards(prev => [...prev, {
                                 id: Math.random(),
                                 text: `GEKAUFT: ${item.name}`,
                                 x: window.innerWidth / 2,
                                 y: window.innerHeight / 2,
                                 color: '#22c55e'
                               }].slice(-10));
                             } catch (err) {
                               console.error("Purchase failed:", err);
                               // Revert optimistic coins on failure
                               setOptimisticCoins(null);
                             }
                          }}
                          className={`w-full p-4 rounded-2xl border flex items-center gap-4 text-left transition-all ${
                            canAfford 
                              ? 'bg-neutral-800/40 border-white/10 hover:border-mc-gold/50 cursor-pointer' 
                              : 'bg-neutral-900 shadow-inner border-transparent relative opacity-60'
                          }`}
                        >
                          {!canAfford && (
                            <div className="absolute inset-0 z-20 flex items-center justify-end pr-8 pointer-events-none opacity-20">
                              <Lock size={40} className="text-neutral-500" />
                            </div>
                          )}
                          <div className={`p-3 rounded-xl flex-shrink-0 ${canAfford ? `${typeBg} ${typeColor} shadow-lg shadow-black/40` : 'bg-neutral-700 text-neutral-500'}`}>
                            <item.icon size={28} />
                          </div>
                          <div className="flex-1 overflow-hidden relative z-10">
                            <div className="flex justify-between items-center gap-2">
                              <span className={`font-black truncate text-sm transition-colors ${canAfford ? 'text-white' : 'text-neutral-500'}`}>{item.name}</span>
                              <span className={`font-black text-xs whitespace-nowrap ${canAfford ? 'text-mc-gold' : 'text-neutral-600'}`}>{item.price.toLocaleString()} 🪙</span>
                            </div>
                            <p className={`text-[10px] truncate ${canAfford ? 'text-neutral-400' : 'text-neutral-600'}`}>{item.desc}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                               <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${canAfford ? `${typeBg} ${typeColor} border-${item.type === 'miner' ? 'blue' : item.type === 'click' ? 'yellow' : 'red'}-400/20` : 'bg-neutral-800 text-neutral-600 border-transparent'}`}>
                                 {'cps' in item ? `+${item.cps} CPS` : 'cpc' in item ? `+${item.cpc} CPC` : `+${item.power} KRAFT`}
                               </span>
                               <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest">{item.type}</span>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                    <div className="pb-40 pt-10 text-center">
                      <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-[0.3em]">Ende der Liste</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isQuotaExceeded && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md pointer-events-none"
          >
            <div className="bg-orange-500/90 border border-white/20 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-4 shadow-[0_0_50px_rgba(249,115,22,0.4)] pointer-events-auto">
              <div className="p-2 bg-white/20 text-white rounded-xl">
                <ShieldAlert size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-white italic uppercase tracking-wider">System im Ruhemodus</h4>
                <p className="text-[10px] text-white/80 leading-relaxed uppercase font-bold tracking-widest mt-0.5">
                  Das Firebase-Limit wurde erreicht. Echtzeit-Updates sind bis morgen pausiert.
                </p>
              </div>
              <button 
                onClick={() => setIsQuotaExceeded(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}

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
                      x: openingBox.clicks > 0 ? [0, -5, 5, -5, 5, 0] : 0,
                      scale: 1 + (openingBox.clicks * 0.1),
                      filter: openingBox.clicks > 0 ? `brightness(${1 + (openingBox.clicks * 0.3)})` : 'none',
                      boxShadow: openingBox.rarity === 'LEGENDÄR' ? '0 0 150px rgba(255,170,0,0.8)' : 
                                 openingBox.rarity === 'EPIK' ? '0 0 120px rgba(168,85,247,0.8)' :
                                 openingBox.rarity === 'Selten' ? '0 0 100px rgba(59,130,246,0.8)' : '0 0 60px rgba(255,255,255,0.3)'
                    }}
                    onClick={handleBoxClick}
                    className="w-64 h-64 mx-auto cursor-pointer relative group/chest select-none active:scale-90 transition-transform"
                  >
                    {/* Floating Numbers on Tap */}
                    <AnimatePresence>
                      {openingBox.clicks > 0 && (
                        <motion.div
                          key={openingBox.clicks}
                          initial={{ opacity: 1, y: 0, scale: 1 }}
                          animate={{ opacity: 0, y: -100, scale: 2 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]"
                        >
                           <span className="text-4xl font-black text-white italic drop-shadow-mc-thick">TAP!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
        {broadcastMessage && !isAnyOverlayOpen && (
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
      <nav className={`relative z-10 border-b border-neutral-800/50 bg-black/50 backdrop-blur-sm sticky top-0 transition-all duration-500 ${isAnyOverlayOpen ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
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
            className="relative z-10 bg-neutral-900 border-b border-neutral-800 max-h-[85vh] overflow-y-auto custom-scrollbar"
          >
            <div className="max-w-[1600px] mx-auto px-6 py-10 flex flex-col gap-8">
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {/* Root Control for Block5 & Owners */}
                {(isSuperAdmin || isOwner || isAdmin) && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 space-y-4">
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-widest flex items-center gap-2">
                       <Zap size={14} /> Root Control (Teamleitung)
                    </span>
                    <div className="space-y-3">
                      <button 
                        onClick={() => {
                          if (user) {
                            updateDoc(doc(db, 'user_profiles', user.uid), {
                              coins: increment(10000)
                            });
                          }
                        }}
                        className="w-full py-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-500/20 shadow-lg shadow-green-500/5 transition-all active:scale-95"
                      >
                         <Coins size={14} className="inline mr-2" /> +10k Coins (Test)
                      </button>
                      <button 
                        onClick={() => addRandomPlayer('pvp')}
                        className="w-full py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 mt-2"
                      >
                        PVP Bot Simulieren
                      </button>
                      <button 
                        onClick={toggleMaintenance}
                        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border mt-2 ${isMaintenanceMode ? 'bg-mc-red border-white/20 text-white shadow-lg shadow-mc-red/40' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}
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
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase font-bold">Realm Name (Anzeige)</label>
                      <input 
                        type="text"
                        defaultValue={realmNames.pvp}
                        onBlur={(e) => updateRealmName('pvp', e.target.value)}
                        placeholder="z.B. Helden Realm"
                        className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-xs focus:border-mc-gold outline-none"
                      />
                    </div>
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
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase font-bold">Farbe</label>
                      <input 
                        type="color"
                        defaultValue={realmColors.pvp}
                        onBlur={(e) => updateRealmColor('pvp', e.target.value)}
                        className="w-full h-8 bg-black/40 border border-neutral-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Survival Controls */}
                <div className="bg-black/40 border border-neutral-800 rounded-2xl p-6 space-y-4">
                  <span className="text-[10px] uppercase font-bold text-mc-red tracking-widest">Survival Server Control</span>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase font-bold">Realm Name (Anzeige)</label>
                      <input 
                        type="text"
                        defaultValue={realmNames.survival}
                        onBlur={(e) => updateRealmName('survival', e.target.value)}
                        placeholder="z.B. Survival World"
                        className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2 text-xs focus:border-mc-gold outline-none"
                      />
                    </div>
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
                    <div className="space-y-1">
                      <label className="text-[10px] text-neutral-500 uppercase font-bold">Farbe</label>
                      <input 
                        type="color"
                        defaultValue={realmColors.survival}
                        onBlur={(e) => updateRealmColor('survival', e.target.value)}
                        className="w-full h-8 bg-black/40 border border-neutral-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Global Actions */}
                {(isAdmin || isOwner || isSuperAdmin) && (
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
                      {(isOwner || isSuperAdmin) && (
                        <button onClick={totalReset} className="w-full bg-white/5 hover:bg-white/10 text-white text-[10px] py-2 rounded-lg border border-white/10 flex items-center justify-center gap-2 mt-4 opacity-50 hover:opacity-100 transition-opacity">
                           <ShieldCheck size={12} /> NUCLEAR RESET
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* BIG SURVEILLANCE TABLE */}
              <div className="bg-black/20 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="bg-neutral-900/80 px-8 py-5 border-b border-neutral-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <h5 className="text-[11px] uppercase font-black text-mc-red tracking-[0.2em] flex items-center gap-2">
                      <Activity size={16} className="text-mc-red animate-pulse" /> Global Entity Intelligence & Identity Matrix
                    </h5>
                    <span className="text-[8px] text-neutral-500 font-mono tracking-widest mt-1">REAL-TIME SURVEILLANCE PROTOCOL ACTIVE | SATELLITE UPLINK: VERIFIED</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                       <span className="text-[9px] text-neutral-500 font-mono uppercase">Nodes Tracked</span>
                       <span className="text-sm font-black text-white font-mono">{userProfiles.length}</span>
                    </div>
                    <div className="w-[1px] h-8 bg-neutral-800" />
                    <button 
                      onClick={() => trackVisitor(true)}
                      className="p-2 bg-mc-red text-white rounded-lg hover:bg-red-500 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest active:scale-95"
                    >
                      <RefreshCcw size={14} /> Force Update
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="text-[9px] uppercase font-black text-neutral-400 border-b border-neutral-800 shadow-sm bg-neutral-900/50 sticky top-0 z-20">
                        <tr>
                          <th className="px-8 py-5 tracking-[0.1em]">Identity Vector</th>
                          <th className="px-8 py-5 tracking-[0.1em]">Session Status</th>
                          <th className="px-8 py-5 tracking-[0.1em]">Network Address (IP)</th>
                          <th className="px-8 py-5 tracking-[0.1em]">Geolocation Intelligence</th>
                          <th className="px-8 py-5 tracking-[0.1em]">Infrastructure/ISP</th>
                          <th className="px-8 py-5 tracking-[0.1em]">Protocol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/40 bg-black/10">
                        {userProfiles.length === 0 ? (
                           <tr>
                             <td colSpan={6} className="px-8 py-20 text-center text-neutral-600 text-xs font-mono uppercase tracking-[0.3em]">No valid entities detected in perimeter</td>
                           </tr>
                        ) : [...userProfiles].sort((a,b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)).map((p) => (
                           <tr key={p.userId} className="hover:bg-mc-red/[0.04] transition-all duration-300 group">
                             <td className="px-8 py-5">
                               <div className="flex items-center gap-4">
                                 <div className="relative group/avatar">
                                   <img 
                                     src={p.customSkin || `https://mc-heads.net/avatar/${p.minecraftUsername || 'Steve'}`} 
                                     className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 object-cover shadow-lg group-hover/avatar:border-mc-red/50 transition-all" 
                                     alt=""
                                     referrerPolicy="no-referrer"
                                   />
                                   {p.isOnline && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse" />}
                                 </div>
                                 <div className="flex flex-col">
                                   <div className="flex items-center gap-2">
                                     <span className="font-black text-sm text-white tracking-tight">{p.displayName}</span>
                                     <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                       p.role === 'Owner' || p.role === 'Root' ? 'bg-mc-gold/20 text-mc-gold border border-mc-gold/30' : 
                                       p.role === 'Admin' ? 'bg-mc-red/20 text-mc-red border border-mc-red/30' : 
                                       'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                     }`}>
                                       {p.role}
                                     </span>
                                   </div>
                                   <span className="text-[9px] text-neutral-500 font-mono uppercase mt-1">UID: {p.userId}</span>
                                 </div>
                               </div>
                             </td>
                             <td className="px-8 py-5">
                               <div className="flex flex-col gap-1">
                                 <div className="flex items-center gap-2">
                                   <div className={`w-2 h-2 rounded-full ${p.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-neutral-800'}`} />
                                   <span className={`text-[10px] font-black uppercase tracking-widest ${p.isOnline ? 'text-green-400' : 'text-neutral-500'}`}>
                                     {p.isOnline ? 'Connected' : 'Disconnected'}
                                   </span>
                                 </div>
                                 <span className="text-[8px] text-neutral-600 font-mono">
                                    Last Active: {p.updatedAt?.seconds ? new Date(p.updatedAt.seconds * 1000).toLocaleString() : 'Legacy Record'}
                                 </span>
                               </div>
                             </td>
                             <td className="px-8 py-5">
                               <div className="flex flex-col gap-1">
                                 <span className="font-mono text-mc-gold text-xs font-black tracking-widest selection:bg-mc-gold selection:text-black">
                                   {p.lastLoginIp || '0.0.0.0'}
                                 </span>
                                 <span className="text-[8px] text-neutral-600 font-black uppercase">Trace-Vektor: Alpha-Primary</span>
                               </div>
                             </td>
                             <td className="px-8 py-5">
                               <div className="flex items-center gap-3">
                                 <MapPin size={16} className="text-mc-red opacity-50 shrink-0" />
                                 <div className="flex flex-col max-w-[200px]">
                                   <span className="text-white text-[11px] font-black leading-tight uppercase tracking-tight truncate">
                                     {p.lastLoginCity || 'Unknown'}, {p.lastLoginRegion || 'N/A'}
                                   </span>
                                   <span className="text-[9px] text-neutral-500 font-bold uppercase truncate">{p.lastLoginCountry || 'Neutral Territory'}</span>
                                 </div>
                               </div>
                             </td>
                             <td className="px-8 py-5 text-neutral-400">
                               <div className="flex flex-col max-w-[250px]">
                                 <span className="text-[10px] font-mono text-neutral-300 font-bold truncate leading-tight">{p.lastLoginOrg || 'Analyzing Provider...'}</span>
                                 <span className="text-[8px] text-neutral-600 font-black uppercase mt-1">ASN: {p.lastLoginAsn || '---'}</span>
                               </div>
                             </td>
                             <td className="px-8 py-5">
                               <button 
                                 onClick={() => openProfileEdit(p.userId)}
                                 className="w-full py-3 bg-neutral-900 border border-neutral-800 hover:border-mc-red hover:bg-mc-red/10 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95 group/btn"
                               >
                                 <Shield size={14} className="group-hover/btn:text-mc-red transition-colors" />
                                 Full Trace
                               </button>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Group - Hide when any overlay is open */}
      <AnimatePresence>
        {!isAnyOverlayOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-8 right-8 z-[80] flex flex-col sm:flex-row gap-3"
          >
            {/* Install App Button */}
            {showInstallButton && (
              <button 
                onClick={handleInstallClick}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 bg-mc-green text-black border border-green-500/50"
                title="App installieren"
              >
                <Rocket size={24} className="animate-bounce" />
              </button>
            )}

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
              onClick={() => { 
                const newState = !shopOpen;
                setShopOpen(newState); 
                if (newState) fetchShop();
                setNewsOpen(false); 
                setPollsOpen(false); 
                setChatOpen(false); 
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${shopOpen ? 'bg-mc-gold text-black' : 'bg-black border border-neutral-800 text-white'}`}
              title="Globaler Shop"
            >
              <ShoppingBag size={24} />
            </button>

            {/* News Button */}
            <button 
              onClick={() => { 
                const newState = !newsOpen;
                setNewsOpen(newState); 
                if (newState) fetchNews();
                setPollsOpen(false); 
                setChatOpen(false); 
              }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${newsOpen ? 'bg-mc-red text-white' : 'bg-black border border-neutral-800 text-white'}`}
              title="News-Feed"
            >
              <Newspaper size={24} />
            </button>

            {/* Polls Button */}
            <button 
              onClick={() => { 
                const newState = !pollsOpen;
                setPollsOpen(newState); 
                if (newState) fetchPolls();
                setNewsOpen(false); 
                setChatOpen(false); 
              }}
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
                            <button onClick={() => togglePollStatus(poll.id)} className="p-1 hover:bg-black/20 rounded" title={poll.isActive ? "Beenden" : "Aktivieren"}>
                              {poll.isActive ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                            <button onClick={() => deletePoll(poll.id)} className="p-1 hover:bg-black/20 rounded text-red-500" title="Löschen">
                              <Trash2 size={12} />
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
            className="fixed inset-y-0 right-0 w-full md:w-[700px] bg-black/98 backdrop-blur-2xl z-[70] border-l border-neutral-800 shadow-2xl flex flex-col pt-20"
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

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth overscroll-contain min-h-0 custom-scrollbar space-y-12">
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
                <>
                  {/* Premium Featured Section */}
                  <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-mc-gold/20 via-black to-black border-2 border-mc-gold/30 overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-all duration-1000">
                      <Star size={200} className="text-mc-gold" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                      <div className="w-40 h-40 bg-mc-gold rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(255,170,0,0.3)] shrink-0">
                         <Crown size={80} className="text-black" />
                      </div>
                      <div className="text-center md:text-left space-y-4">
                        <span className="bg-mc-gold text-black text-[10px] px-4 py-1 rounded-full font-black uppercase tracking-widest">Empfehlung der Admins</span>
                        <h2 className="text-4xl font-black text-white italic tracking-tighter leading-tight">DER MVP RANG<br/><span className="text-mc-gold">MAXIMALE POWER</span></h2>
                        <p className="text-neutral-400 text-sm max-w-md font-medium leading-relaxed italic">
                          Hol dir den ultimativen Rang und starte jeden Tag mit <span className="text-mc-gold font-black">5.000 Coins Bonus</span>. Inklusive exklusivem Prefix & Chat-Farben!
                        </p>
                        <div className="pt-2">
                          <button 
                            onClick={() => {
                              const mvp = shopItems.find(i => i.name === 'MVP Rang');
                              if (mvp) buyItem(mvp);
                              else alert("MVP Rang Item wurde noch nicht generiert! Klicke unten auf 'Beispiel-Katalog Generieren'");
                            }}
                            className="bg-mc-gold text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-xl shadow-mc-gold/20"
                          >
                            Jetzt Sichern
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="mc-card p-6 border-neutral-800 flex items-center justify-between group overflow-hidden relative">
                      <div className="absolute inset-0 bg-mc-gold/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                       <div>
                         <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Guthaben</p>
                         <span className="text-2xl font-black text-mc-gold italic">{(myProfile?.coins || 0).toLocaleString()}</span>
                       </div>
                       <div className="p-3 bg-mc-gold/10 text-mc-gold rounded-xl group-hover:scale-110 transition-transform"><Coins size={24} /></div>
                    </div>
                    <div className="mc-card p-6 border-neutral-800 flex items-center justify-between group overflow-hidden relative">
                      <div className="absolute inset-0 bg-blue-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                       <div>
                         <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Deine Keys</p>
                         <span className="text-2xl font-black text-mc-blue italic">{(myProfile?.inventory?.keys || 0)}</span>
                       </div>
                       <div className="p-3 bg-mc-blue/10 text-mc-blue rounded-xl group-hover:scale-110 transition-transform"><Key size={24} /></div>
                    </div>
                  </div>

                  <div className="space-y-12">
                    {/* Rank Status Info */}
                    {myProfile?.role && myProfile.role !== 'Spieler' && (
                    <div className="p-4 bg-mc-gold/10 border border-mc-gold/20 rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-mc-gold/20 flex items-center justify-center shadow-[0_0_20px_rgba(255,170,0,0.2)]">
                        <Award size={24} className="text-mc-gold" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-black tracking-widest text-mc-gold">Aktivierter Rang</div>
                        <div className="text-xl font-black text-white">{myProfile.role === 'Owner' ? 'Admin' : myProfile.role}</div>
                        <div className="text-[9px] text-neutral-400 mt-1 italic">Vorteil: Erhöhter Daily-Bonus aktiviert!</div>
                      </div>
                    </div>
                  )}

                  {myProfile?.purchasedRank && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                        <Award size={24} className="text-purple-400" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-black tracking-widest text-purple-400">Erworbener Rang</div>
                        <div className="text-xl font-black text-white">{myProfile.purchasedRank}</div>
                        <div className="text-[9px] text-neutral-400 mt-1 italic">Vorteil: Dieser Rang wird im Chat angezeigt!</div>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {items.length === 0 && isAdmin && (
                            <button 
                              onClick={seedShop}
                              className="text-center py-8 opacity-20 text-[10px] uppercase tracking-[0.3em] border-2 border-dashed border-neutral-800 rounded-2xl font-bold hover:opacity-100 hover:border-mc-gold/50 transition-all flex flex-col items-center gap-2 group mt-4"
                            >
                              <Plus className="group-hover:scale-125 transition-transform" />
                              Beispiel-Items generieren
                            </button>
                          )}
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
                                      <h5 className={`font-black text-lg transition-colors ${(item.price >= 25000 || item.name.includes('MVP')) ? 'text-mc-gold' : item.name.includes('VIP') ? 'text-purple-400' : 'text-gray-100 group-hover:text-mc-gold'}`}>
                                        {item.name}
                                      </h5>
                                      {(item.price >= 25000 || item.name.includes('MVP')) ? (
                                        <span className="bg-mc-gold text-black text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-[0_0_15px_rgba(255,170,0,0.4)] border border-yellow-300/50">LEGENDÄR</span>
                                      ) : (item.price >= 5000 || item.name.includes('VIP')) ? (
                                        <span className="bg-purple-500/20 text-purple-400 text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]">VIP ELITE</span>
                                      ) : null}
                                      {isOwnRank && (
                                        <span className="bg-white text-black text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-[0_0_10px_rgba(255,255,255,0.3)]">AKTIV</span>
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
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  </motion.div>
)}
</AnimatePresence>

      {/* AI Oracle Drawer */}
      <AnimatePresence>
        {isAiOpen && (
          <div className="fixed inset-0 z-[120] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-mc-gold/20 flex items-center justify-center shadow-[0_0_20px_rgba(255,170,0,0.2)]">
                    <Sparkles className="text-mc-gold" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white italic tracking-tighter">DAS SCHARFE ORAKEL</h3>
                    <p className="text-[10px] text-mc-gold font-bold uppercase tracking-[0.3em]">AI-Powered Wisdom</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAiOpen(false)}
                  className="p-3 hover:bg-white/5 rounded-xl transition-colors text-neutral-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scroll-smooth space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                {aiHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                     <Brain size={64} className="mb-4 text-mc-gold animate-pulse" />
                     <p className="text-lg font-black italic">Warte auf deine Fragen...</p>
                     <p className="max-w-[280px] text-[10px] uppercase font-bold tracking-widest mt-2">Frag mich nach News, Minecraft-Tips oder wie du dein Projekt bekannter machst!</p>
                  </div>
                )}
                {aiHistory.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                      msg.role === 'user' 
                        ? 'bg-mc-gold text-black font-bold shadow-lg shadow-mc-gold/10' 
                        : 'bg-neutral-800 text-neutral-100 border border-neutral-700/50 shadow-xl'
                    }`}>
                       <div className="markdown-body text-sm leading-relaxed">
                          <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
                       </div>
                    </div>
                  </motion.div>
                ))}
                {isAiLoading && (
                  <div className="flex justify-start">
                     <div className="bg-neutral-800 border border-neutral-700/50 rounded-3xl px-6 py-4 flex items-center gap-3">
                        <div className="flex gap-1">
                           <div className="w-1.5 h-1.5 bg-mc-gold rounded-full animate-bounce [animation-delay:-0.3s]" />
                           <div className="w-1.5 h-1.5 bg-mc-gold rounded-full animate-bounce [animation-delay:-0.15s]" />
                           <div className="w-1.5 h-1.5 bg-mc-gold rounded-full animate-bounce" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-mc-gold/50">Orakel fokussiert sich...</span>
                     </div>
                  </div>
                )}
                <div ref={aiChatEndRef} />
              </div>

              <div className="p-6 bg-black/60 border-t border-neutral-800">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAiChat(); }}
                  className="relative group"
                >
                  <input 
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Frag das Orakel..."
                    className="w-full bg-neutral-900 border-2 border-neutral-800 rounded-2xl py-5 px-6 pr-16 text-white focus:border-mc-gold transition-all outline-none group-focus-within:shadow-[0_0_30px_rgba(255,170,0,0.1)]"
                  />
                  <button 
                    disabled={isAiLoading || !aiInput.trim()}
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-mc-gold text-black flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all shadow-lg"
                  >
                     <Send size={20} />
                  </button>
                </form>
                <p className="text-center text-[9px] text-neutral-600 mt-4 uppercase font-bold tracking-tighter">KI kann Fehler machen. Überprüfe wichtige Informationen.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Oracle Floating Button */}
      {!isAnyOverlayOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsAiOpen(true)}
          className="fixed bottom-24 right-8 z-[90] w-16 h-16 rounded-2xl bg-black border-2 border-mc-gold flex items-center justify-center group shadow-[0_0_30px_rgba(255,170,0,0.3)] hover:scale-110 active:scale-95 transition-all"
        >
          <div className="absolute inset-0 bg-mc-gold/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 text-mc-gold">
            <Sparkles className="group-hover:rotate-12 transition-transform" size={28} />
          </div>
          {/* Label Tooltip */}
          <div className="absolute right-full mr-4 px-4 py-2 bg-mc-gold text-black text-[10px] font-black uppercase tracking-widest rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all pointer-events-none shadow-xl">
             KI- ORAKEL FRAGEN
          </div>
        </motion.button>
      )}

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

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scroll-smooth">
              {(() => {
                const combined = [...chatMessages];
                // Add local messages that aren't confirmed yet
                localMessages.forEach(lm => {
                  if (lm.isLocal && lm.userId === 'system') {
                    combined.push(lm);
                  } else if (lm.tempId && !chatMessages.some(cm => cm.tempId === lm.tempId)) {
                    combined.push(lm);
                  }
                });

                return combined
                  .sort((a, b) => {
                    const getTime = (ca: any) => {
                      if (!ca) return Date.now() + 60000; // Local pending messages at the end
                      if (ca.seconds) return ca.seconds * 1000;
                      if (ca instanceof Date) return ca.getTime();
                      if (typeof ca === 'string') return new Date(ca).getTime();
                      if (typeof ca === 'number') return ca;
                      try { if (ca.toDate) return ca.toDate().getTime(); } catch (e) {}
                      return 0;
                    };
                    return getTime(a.createdAt) - getTime(b.createdAt);
                  })
                  .map((msg, idx, arr) => {
                    const prevMsg = arr[idx - 1];
                    const isSameSender = prevMsg && prevMsg.userId === msg.userId && !msg.isAction && !prevMsg.isAction;
                    const isSystem = msg.userId === 'system';
                    const isMe = msg.userId === user?.uid;
                    const displayRole = STAFF_OVERWRITES[msg.displayName] || msg.role;

                    return (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={msg.id} 
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isSameSender ? '-mt-2' : ''}`}
                      >
                        {!isSameSender && (
                          <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              isSystem ? 'text-mc-gold' : 'text-neutral-500'
                            }`}>
                              {msg.displayName}
                            </span>
                            {displayRole && displayRole !== 'Member' && (
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase text-white ${
                                displayRole === 'Owner' ? 'bg-mc-gold shadow-[0_0_10px_rgba(255,170,0,0.3)]' :
                                displayRole === 'Admin' || displayRole === 'Root' ? 'bg-mc-red' : 
                                displayRole === 'Mod' ? 'bg-blue-600' : 
                                'bg-purple-500'
                              }`}>
                                {displayRole}
                              </span>
                            )}
                            {(() => {
                              const senderProf = userProfiles.find(p => p.userId === msg.userId);
                              const rankToShow = (msg.purchasedRank && msg.purchasedRank !== 'undefined') 
                                ? msg.purchasedRank 
                                : senderProf?.purchasedRank;
                                
                              if (rankToShow && rankToShow !== 'undefined') {
                                return (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded font-black uppercase text-white bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                                    {rankToShow}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {msg.isLocal && !isSystem && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded font-black uppercase bg-neutral-800 text-neutral-400 border border-neutral-700">
                                Privat
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-end gap-2 group max-w-[85%]">
                          {(isAdmin || isOwner || isSuperAdmin) && !isSystem && (
                            <button 
                              onClick={() => deleteSingleMessage(msg.id)}
                              className="p-1.5 text-neutral-600 hover:text-mc-red transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                          
                          <div className={`relative px-4 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap transition-all ${
                            msg.isAction ? 'italic text-neutral-400 bg-transparent py-1 px-0 shadow-none border-0' :
                            msg.userId === 'system' ? 'bg-mc-gold/10 border border-mc-gold/20 text-mc-gold' :
                            msg.id.startsWith('temp-') ? 'bg-neutral-800 text-neutral-400 opacity-60 border border-neutral-700 border-dashed' :
                            isMe ? 'bg-mc-red text-white shadow-lg shadow-mc-red/15 rounded-tr-sm' : 
                            'bg-neutral-800 text-neutral-100 rounded-tl-sm'
                          }`}>
                            {(() => {
                              let cleanText = msg.text.replace(/§[a-z0-9]/g, '');
                              const undefinedRankPattern = /ist nun offiziell \*\*undefined\*\*/g;
                              if (msg.userId === 'system' && (cleanText.includes('undefined') || undefinedRankPattern.test(cleanText))) {
                                // Versuche den Rang aus dem purchasedRank Feld zu nehmen, falls vorhanden
                                const actualRank = (msg.purchasedRank && msg.purchasedRank !== 'undefined') ? msg.purchasedRank : 'Mitglied';
                                // Replace both bold and non-bold variants
                                cleanText = cleanText.replace(/\*\*undefined\*\*/g, `**${actualRank}**`)
                                                     .replace(/undefined/g, actualRank);
                              }
                              return cleanText;
                            })()}
                            {msg.id.startsWith('temp-') && (
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="absolute -right-2 -top-2 bg-neutral-900 rounded-full p-0.5"
                              >
                                <div className="w-2 h-2 border-2 border-mc-red border-t-transparent rounded-full" />
                              </motion.div>
                            )}
                          </div>

                          {/* Deletion button removed here because it's now handled before the message for better consistency */}
                        </div>
                      </motion.div>
                    );
                  })
              })()}
              <div ref={chatEndRef} className="h-4" />
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
                <div className="flex flex-col gap-2">
                  {!navigator.onLine && (
                    <div className="flex items-center gap-2 text-[10px] text-mc-red font-bold uppercase animate-pulse mb-1">
                      <div className="w-1.5 h-1.5 bg-mc-red rounded-full" />
                      Offline - Warte auf Verbindung...
                    </div>
                  )}
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
                </div>
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

      <main className={`relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-24 transition-all duration-500 ${isAnyOverlayOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
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
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Circle className="text-mc-red fill-mc-red animate-pulse" size={12} />
                  <h2 className="text-2xl font-bold">Wer ist gerade online?</h2>
                </div>
                <p className="text-neutral-500 text-sm">Aktuell sind {totalOnline} Spieler in der Community aktiv.</p>
              </div>
              <button 
                onClick={fetchOnlinePlayers}
                className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-neutral-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-all hover:border-neutral-700 active:scale-95 group/refresh"
              >
                <RefreshCw size={12} className="group-hover/refresh:rotate-180 transition-transform duration-500" />
                Aktualisieren
              </button>
            </div>
            
            <div className="flex -space-x-4">
              {(combinedOnline || []).map((p: any, i: number) => (
                <motion.div 
                  key={p?.userId || p?.username || `online-${i}`}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative group cursor-pointer"
                  onClick={() => isAdmin && p?.type === 'profile' && p?.userId && openProfileEdit(p.userId)}
                >
                  <img 
                    src={p?.type === 'profile' ? (userProfiles.find(prof => prof.userId === p.userId)?.customSkin || `https://mc-heads.net/avatar/${p.username}`) : `https://mc-heads.net/avatar/${p?.username}`} 
                    alt={`${p?.username} Minecraft Profil`}
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

        {/* Staff / Team Section */}
        {staffList.length > 0 && (
          <section className="mb-24">
            <div 
              className="flex items-center justify-between gap-3 mb-8 cursor-pointer group select-none"
              onClick={() => setShowStaffSection(!showStaffSection)}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-mc-gold" size={24} />
                <h2 className="text-3xl font-bold">Unser Team</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">
                {showStaffSection ? 'Einklappen' : 'Ausklappen'}
                <ChevronDown className={`transition-transform duration-300 ${showStaffSection ? 'rotate-180' : ''}`} size={16} />
              </div>
            </div>
            
            <AnimatePresence>
              {showStaffSection && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 pt-4">
                    {staffList.map((p: any, i) => (
                      <motion.div 
                        key={p.userId || i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="mc-card p-6 flex flex-col items-center text-center group border-mc-gold/10 hover:border-mc-gold/40 transition-colors"
                      >
                         <div className="relative mb-4">
                           <img 
                             src={p.customSkin || `https://mc-heads.net/avatar/${p.minecraftUsername || 'Steve'}`} 
                             className="w-20 h-20 rounded-xl bg-neutral-900 border-2 border-mc-gold/20 pixelated object-cover group-hover:scale-105 transition-transform" 
                             alt=""
                             referrerPolicy="no-referrer"
                           />
                           {p.isOnline && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black animate-pulse" />}
                         </div>
                         <span className="font-extrabold text-sm mb-1">{p.displayName}</span>
                         <div className="flex flex-wrap justify-center gap-1">
                           {(() => {
                             const name = (p.minecraftUsername || p.displayName || p.userId || '').trim();
                             const displayRole = STAFF_OVERWRITES[name] || STAFF_OVERWRITES[p.displayName || ''] || p.role;
                             if (!displayRole || displayRole === 'Member') return null;
                             
                             return (
                               <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                 (displayRole === 'Root') ? 'bg-mc-gold text-black shadow-[0_0_15px_rgba(255,170,0,0.6)]' :
                                 (displayRole === 'Owner') ? 'bg-mc-gold text-black shadow-[0_0_10px_rgba(255,170,0,0.4)]' : 
                                 displayRole === 'Admin' ? 'bg-mc-red text-white' : 
                                 displayRole === 'Mod' ? 'bg-mc-red/40 text-white' : 
                                 displayRole === 'VIP' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.7)]' :
                                 displayRole === 'MVP' ? 'bg-mc-gold text-black' :
                                 'bg-blue-600 text-white'
                               }`}>
                                 {(displayRole === 'Root') ? 'DEVELOPER' : (displayRole === 'Owner') ? 'OWNER' : (displayRole === 'Admin') ? 'ADMIN' : (displayRole === 'VIP') ? 'VIP' : (displayRole === 'MVP') ? 'MVP' : displayRole}
                               </span>
                             );
                           })()}
                           {p.purchasedRank && p.purchasedRank !== 'undefined' && (
                             <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]">
                               {p.purchasedRank}
                             </span>
                           )}
                         </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Realm Codes Section */}
        <section id="codes" className="mb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">Realm Zugangscodes</h2>
              <p className="text-neutral-400">Direkter Zugang für geprüfte Community-Mitglieder.</p>
            </div>
            <button 
              onClick={() => { fetchServerStatus(); fetchRealmCodes(); }}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-all hover:border-neutral-700 active:scale-95 group/status"
            >
              <RefreshCw size={14} className="group-hover/status:rotate-180 transition-transform duration-700" />
              Status Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              className="relative overflow-hidden group"
            >
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ background: `linear-gradient(to bottom right, ${realmColors.pvp}1a, transparent)` }}
              />
              <div className="mc-card h-full flex flex-col justify-between" style={{ borderColor: `${realmColors.pvp}33` }}>
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${realmColors.pvp}33`, color: realmColors.pvp }}>
                      <Swords size={32} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: realmColors.pvp }}>Live Status</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ backgroundColor: `${realmColors.pvp}1a`, color: realmColors.pvp, borderColor: `${realmColors.pvp}33` }}>
                          {combinedPvpPlayers.length} / {pvpStatus.maxPlayers} Online
                        </span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{realmNames.pvp}</h3>

                  <p className="text-neutral-400 mb-6 leading-relaxed">
                    {realmNames.pvp === 'PvP Arena' ? 'Der offizielle Realm für unsere PvP-Turniere. Kämpfe gegen andere, verbessere deine Skills und dominiere.' : `Willkommen auf dem ${realmNames.pvp} Realm!`}
                  </p>
                  
                  {/* Player List */}
                  <div className="mb-8 min-h-[40px]">
                    <p className="text-[10px] uppercase font-bold text-neutral-500 mb-2 tracking-widest">Aktive Spieler</p>
                    <div className="flex flex-wrap gap-2">
                      {combinedPvpPlayers.length > 0 ? combinedPvpPlayers.map((p, i) => (
                        <div key={p.id || p.username || `pvp-${i}`} className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded-lg border border-neutral-800 text-xs group/item relative overflow-hidden">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: realmColors.pvp, boxShadow: `0 0 5px ${realmColors.pvp}80` }} />
                          <span className="flex items-center gap-1.5">
                            {p.username}
                            {isAdmin && (p as any).ip && (
                              <span className="text-[9px] font-mono px-1 rounded border" style={{ color: realmColors.pvp, backgroundColor: `${realmColors.pvp}1a`, borderColor: `${realmColors.pvp}33` }}>
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
                            {(p as any).purchasedRank && (p as any).purchasedRank !== 'undefined' && (
                              <span className="text-[8px] px-1 py-0.5 rounded-sm font-bold uppercase bg-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]">
                                {(p as any).purchasedRank}
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
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ background: `linear-gradient(to bottom right, ${realmColors.survival}1a, transparent)` }}
              />
              <div className="mc-card h-full flex flex-col justify-between" style={{ borderColor: `${realmColors.survival}33` }}>
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${realmColors.survival}33`, color: realmColors.survival }}>
                      <Trees size={32} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: realmColors.survival }}>Live Status</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-3 py-1 rounded-full border" style={{ backgroundColor: `${realmColors.survival}1a`, color: realmColors.survival, borderColor: `${realmColors.survival}33` }}>
                          {combinedSurvivalPlayers.length} / {survivalStatus.maxPlayers} Online
                        </span>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{realmNames.survival}</h3>
                  <p className="text-neutral-400 mb-6 leading-relaxed text-wrap">
                    {realmNames.survival === 'Survival World' ? 'Entspanntes Vanilla-Survival. Erforsche, baue gemeinsam und genieße die Welt.' : `Willkommen auf dem ${realmNames.survival} Realm!`}
                  </p>

                   {/* Player List */}
                   <div className="mb-8 min-h-[40px]">
                    <p className="text-[10px] uppercase font-bold text-neutral-500 mb-2 tracking-widest">Aktive Spieler</p>
                    <div className="flex flex-wrap gap-2">
                      {combinedSurvivalPlayers.length > 0 ? combinedSurvivalPlayers.map((p, i) => (
                        <div key={p.id || p.username || `surv-${i}`} className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded-lg border border-neutral-800 text-xs group/item relative overflow-hidden">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: realmColors.survival, boxShadow: `0 0 5px ${realmColors.survival}80` }} />
                          <span className="flex items-center gap-1.5">
                            {p.username}
                            {isAdmin && (p as any).ip && (
                              <span className="text-[9px] font-mono px-1 rounded border" style={{ color: realmColors.survival, backgroundColor: `${realmColors.survival}1a`, borderColor: `${realmColors.survival}33` }}>
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
                            {(p as any).purchasedRank && (p as any).purchasedRank !== 'undefined' && (
                              <span className="text-[8px] px-1 py-0.5 rounded-sm font-bold uppercase bg-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]">
                                {(p as any).purchasedRank}
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
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Globe className="text-mc-gold" size={28} />
                <h2 className="text-3xl font-bold">Community Status</h2>
              </div>
              <button 
                onClick={fetchProfiles}
                disabled={isRefreshingProfiles}
                className={`flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all hover:border-neutral-700 ${isRefreshingProfiles ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCw size={14} className={isRefreshingProfiles ? 'animate-spin' : ''} />
                {isRefreshingProfiles ? 'Refreshing...' : 'Aktualisieren'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {communityDisplayList.map((p: any, i) => (
                <motion.div 
                  key={p.userId || p.username || `community-${i}`}
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
                  <div className="absolute top-2 right-2 flex flex-wrap gap-1 z-20 justify-end">
                    {p.role && p.role !== 'Member' && (
                      <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm ${
                        p.role === 'Owner' || p.role === 'Root' ? 'bg-mc-gold text-black shadow-[0_0_10px_rgba(255,170,0,0.5)]' :
                        p.role === 'Admin' ? 'bg-mc-red text-white' :
                        p.role === 'Mod' ? 'bg-mc-red/40 text-white' :
                        p.role === 'VIP' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.7)] border border-purple-400/30' :
                        p.role === 'MVP' ? 'bg-mc-blue text-white' :
                        p.role === 'Besucher' ? 'bg-neutral-700 text-neutral-300' : ''
                      }`}>
                        {p.role === 'Root' ? 'Owner' : p.role}
                      </div>
                    )}
                    {p.purchasedRank && p.purchasedRank !== 'undefined' && (
                      <div className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                        {p.purchasedRank}
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
                      <span 
                        className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter border shadow-sm"
                        style={{ 
                          backgroundColor: `${p.server === 'pvp' ? realmColors.pvp : realmColors.survival}1a`, 
                          color: p.server === 'pvp' ? realmColors.pvp : realmColors.survival,
                          borderColor: `${p.server === 'pvp' ? realmColors.pvp : realmColors.survival}33`
                        }}
                      >
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
                          {(user?.uid === clan.leaderId || isAdmin) ? (
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
            <div className="mc-card" style={{ borderColor: `${realmColors.pvp}1a`, backgroundColor: `${realmColors.pvp}02` }}>
              <div className="flex items-center gap-3 mb-6">
                <Swords size={24} style={{ color: realmColors.pvp }} className="opacity-80" />
                <h3 className="text-xl font-bold">{realmNames.pvp} Rules</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: realmColors.pvp }} />
                  Keine künstlichen Verzögerungen oder "Lag-Switching".
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: realmColors.pvp }} />
                  Respektvoller Umgang im Chat nach einem Kampf (GG!).
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: realmColors.pvp }} />
                  Kein Teaming in Solo-Modi.
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: realmColors.pvp }} />
                  Nutzung von Exploits führt zum sofortigen Bann.
                </li>
              </ul>
            </div>

            <div className="mc-card" style={{ borderColor: `${realmColors.survival}1a`, backgroundColor: `${realmColors.survival}02` }}>
              <div className="flex items-center gap-3 mb-6">
                <Trees size={24} style={{ color: realmColors.survival }} className="opacity-80" />
                <h3 className="text-xl font-bold">{realmNames.survival} Rules</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: realmColors.survival }} />
                  Kein Griefing oder Zerstören fremder Bauwerke.
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: realmColors.survival }} />
                  Kein Stehlen aus Kisten – fragt vorher um Erlaubnis.
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: realmColors.survival }} />
                  Haltet die Welt sauber (keine schwebenden Baumkronen).
                </li>
                <li className="flex gap-3 text-sm text-neutral-400">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: realmColors.survival }} />
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
                    <div className="space-y-2">
                      <p className="text-mc-red text-[11px] font-bold bg-mc-red/10 p-4 rounded-xl border border-mc-red/20 shadow-inner">
                        <ShieldAlert size={14} className="inline mr-2 mb-0.5" />
                        {loginError}
                      </p>
                      <button 
                        type="button"
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="w-full text-[10px] text-mc-gold hover:underline font-bold uppercase tracking-widest text-center py-1 animate-pulse"
                      >
                        Login im neuen Fenster versuchen (Empfohlen)
                      </button>
                    </div>
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
                    onClick={loginWithDiscord}
                    className="w-full px-6 py-4 rounded-xl font-bold bg-[#5865F2] text-white hover:bg-[#4752C4] transition-all flex items-center justify-center gap-2"
                  >
                    <Globe size={18} />
                    Mit Discord anmelden
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
              className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col z-10"
            >
              <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <UserIcon className="text-mc-red" />
                  {isAdmin && editingProfileId !== user?.uid ? `Profil von ${userProfiles.find(p => p.userId === editingProfileId)?.displayName || 'Unbekannt'}` : 'Dein Spieler-Profil'}
                </h3>
                
                <form onSubmit={saveProfile} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                    
                    {/* Left Column: Basic Info */}
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
                          <option value="pvp">{realmNames.pvp}</option>
                          <option value="survival">{realmNames.survival}</option>
                        </select>
                      </div>
                    </div>

                    {/* Right Column: Skin & Avatar */}
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
                        </div>
                      </div>
                    </div>

                    {/* Full Width Bottom: Admin Dashboard */}
                    {isAdmin && (
                      <div className="md:col-span-2 space-y-8 pt-10 border-t border-white/5 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-xs font-bold text-mc-gold uppercase tracking-widest mb-2">Benutzer-Rolle (Nur Staff)</label>
                              <select 
                                name="role"
                                defaultValue={userProfiles.find(p => p.userId === editingProfileId)?.role || 'Member'}
                                className="w-full bg-black/40 border border-mc-gold/30 rounded-xl p-4 text-white focus:border-mc-gold outline-none transition-colors appearance-none"
                              >
                                <option value="Member">Mitglied</option>
                                <option value="Mod">Moderator</option>
                                <option value="Admin">Administrator</option>
                                <option value="Owner">Besitzer (Owner)</option>
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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button 
                            type="button"
                            onClick={() => {
                              if (!editingProfileId) return;
                              if (confirm("🚨 KICK: Benutzer-Session terminieren?")) {
                                setDoc(doc(db, 'user_profiles', editingProfileId), { isOnline: false }, { merge: true });
                              }
                            }}
                            className="py-4 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-600 hover:text-white text-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                             <Unplug size={16} /> Session Kicken
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              if (!editingProfileId) return;
                              if (confirm("☢️ PERMANENT-DELETE: Profil vollständig vernichten?")) {
                                deleteDoc(doc(db, 'user_profiles', editingProfileId));
                                setShowProfileModal(false);
                              }
                            }}
                            className="py-4 bg-red-600/10 border border-red-600/30 hover:bg-red-600 hover:text-white text-mc-red rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                             <ShieldAlert size={16} /> Profil Löschen
                          </button>
                        </div>
                          
                        <div className="bg-black/60 border border-red-500/20 rounded-3xl overflow-hidden shadow-[inset_0_0_50px_rgba(239,68,68,0.05)]">
                             <div className="bg-gradient-to-r from-red-600/15 via-red-600/5 to-transparent border-b border-white/5 px-8 py-6 flex items-center justify-between">
                               <div className="flex items-center gap-6">
                                 <div className="relative flex items-center justify-center">
                                   <div className="absolute inset-0 bg-red-500 blur-[15px] animate-pulse opacity-30" />
                                   <ShieldAlert size={24} className="text-red-500 relative drop-shadow-[0_0_12px_rgba(239,68,68,1)]" />
                                 </div>
                                 <div className="flex flex-col">
                                   <span className="text-[14px] font-black uppercase tracking-[0.3em] text-red-500 leading-none">
                                     Identity Surveillance Feed
                                   </span>
                                   <div className="text-[8px] font-mono text-neutral-500 uppercase tracking-[0.1em] mt-2 flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]" />
                                     Direct Satellite Uplink Active & Secure
                                   </div>
                                 </div>
                               </div>
                               
                               <button 
                                 type="button"
                                 onClick={() => setSurveillanceExpanded(!surveillanceExpanded)}
                                 className={`text-[9px] px-6 py-2.5 rounded-xl border transition-all font-black uppercase tracking-[0.1em] shadow-lg active:scale-95 ${surveillanceExpanded ? 'bg-red-500 text-white border-red-400' : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:border-red-500/50 hover:text-white'}`}
                               >
                                 {surveillanceExpanded ? 'TERMINATE TRACE' : 'ESTABLISH FULL TRACE'}
                               </button>
                             </div>
                             
                             <div className="p-8 bg-neutral-950/40">
                                <div className="flex flex-col gap-8">
                                  {!surveillanceExpanded ? (
                                    <div className="flex items-center justify-between bg-red-500/5 border border-red-500/10 p-8 rounded-3xl group hover:border-red-500/30 transition-all">
                                      <div className="flex items-center gap-6">
                                        <Activity size={20} className="text-red-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        <div className="flex flex-col">
                                          <span className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em] mb-1">Active Signal Monitor</span>
                                          <span className="text-xl font-mono text-white font-black tracking-widest break-all">
                                            {(userProfiles.find(p => p.userId === editingProfileId) as any)?.lastLoginIp || 'DETERMINING_IP...'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">Status</span>
                                        <span className="px-4 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-lg border border-green-500/20">READY</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      className="space-y-10 overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                          {/* PRIMARY VECTOR */}
                                          <div className="space-y-6">
                                           <div className="text-[10px] font-black text-red-500/80 uppercase tracking-[0.3em] flex items-center gap-3">
                                              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]" />
                                              Infrastructural Origins
                                            </div>
                                            <div className="bg-neutral-900/80 border border-red-500/20 p-8 rounded-[2rem] group hover:border-red-500/60 transition-all cursor-copy relative overflow-hidden" onClick={() => {
                                              const ip = userProfiles.find(p => p.userId === editingProfileId)?.lastLoginIp;
                                              if (ip) { navigator.clipboard.writeText(ip); }
                                            }}>
                                              <div className="absolute top-0 right-0 p-6 opacity-5">
                                                <Activity size={100} className="text-red-500" />
                                              </div>
                                              <div className="flex flex-col relative z-10 text-left">
                                                <p className="text-[9px] font-black text-neutral-500 uppercase mb-2 tracking-widest">Active session IP (Trace)</p>
                                                <span className="text-3xl font-mono font-black text-white tracking-widest break-all group-hover:text-red-500 transition-colors">
                                                  {userProfiles.find(p => p.userId === editingProfileId)?.lastLoginIp || 'HIDDEN'}
                                                </span>
                                                <div className="flex items-center gap-3 mt-4">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                  <p className="text-[9px] text-neutral-600 uppercase font-black tracking-widest">Verified Integrity Protocol v4.2</p>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div className="bg-black/40 p-6 rounded-2xl border border-blue-500/20 flex items-center justify-between group hover:border-blue-500/50 transition-all">
                                              <div>
                                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Genesis Arrival IP</p>
                                                <span className="text-lg font-mono font-bold text-blue-400 tracking-wider">
                                                  {userProfiles.find(p => p.userId === editingProfileId)?.registrationIp || '---'}
                                                </span>
                                              </div>
                                              <div className="px-3 py-1 bg-blue-500/10 rounded-xl text-blue-500 text-[9px] font-black border border-blue-500/20 shadow-lg shadow-blue-500/5">SYSTEM_ROOT</div>
                                            </div>
                                          </div>

                                          {/* GEOSPATIAL INTELLIGENCE */}
                                          <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2rem] space-y-8 flex flex-col justify-between relative overflow-hidden group">
                                            <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-700">
                                              <MapPin size={250} className="text-mc-gold" />
                                            </div>
                                            <div className="space-y-4">
                                              <div className="flex items-center gap-3">
                                                <MapPin size={20} className="text-mc-gold" />
                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Satellite Analytics</span>
                                              </div>
                                              <div className="flex flex-col gap-2 relative z-10 text-left">
                                                <span className="text-3xl font-black text-white leading-tight tracking-tight">
                                                  {(userProfiles.find(p => p.userId === editingProfileId) as any)?.lastLoginCity || '?'}, 
                                                  {(userProfiles.find(p => p.userId === editingProfileId) as any)?.lastLoginRegion || '?'}
                                                </span>
                                                <div className="text-mc-gold font-black uppercase tracking-[0.2em] text-sm flex items-center gap-2">
                                                  <div className="w-4 h-[1px] bg-mc-gold/40" />
                                                  {(userProfiles.find(p => p.userId === editingProfileId) as any)?.lastLoginCountry || 'Neutral Territory'}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                              <div className="bg-black/60 p-5 rounded-2xl border border-white/5 hover:border-mc-gold/30 transition-colors group/sub text-left">
                                                <p className="text-[9px] font-black text-neutral-600 uppercase mb-2 tracking-widest">Registry ZIP</p>
                                                <p className="text-base font-mono text-neutral-300 font-bold tracking-widest">{(userProfiles.find(p => p.userId === editingProfileId) as any)?.lastLoginPostal || '---'}</p>
                                              </div>
                                              <div className="bg-black/60 p-5 rounded-2xl border border-white/5 hover:border-mc-gold/30 transition-colors group/sub text-left">
                                                <p className="text-[9px] font-black text-neutral-600 uppercase mb-2 tracking-widest">Zone / Offset</p>
                                                <p className="text-base font-mono text-mc-gold font-black tracking-widest">{(userProfiles.find(p => p.userId === editingProfileId) as any)?.lastLoginTimezone || 'UTC'}</p>
                                              </div>
                                            </div>
                                          </div>

                                          {/* INFRASTRUCTURE & NETWORK - FULL WIDTH SUBGRID */}
                                          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2rem] space-y-6 group hover:border-red-500/30 transition-all">
                                              <div className="flex items-center gap-4">
                                                <Cpu size={20} className="text-red-500" />
                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Carrier / ISP Node</span>
                                              </div>
                                              <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 group-hover:border-red-500/20 transition-all relative overflow-hidden">
                                                <div className="relative z-10 text-left">
                                                  <span className="text-xl font-mono text-red-500 font-black block leading-tight tracking-[0.02em]">
                                                    {(userProfiles.find(p => p.userId === editingProfileId) as any)?.lastLoginOrg || 'DETERMINING ISP...'}
                                                  </span>
                                                  <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-4">
                                                    <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-widest">AS Number</span>
                                                    <span className="text-xs font-mono bg-mc-gold/10 text-mc-gold px-3 py-1 rounded-lg border border-mc-gold/20 font-black">
                                                      {(userProfiles.find(p => p.userId === editingProfileId) as any)?.lastLoginAsn || 'AS_NONE'}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-[2rem] space-y-6 group hover:border-green-500/30 transition-all">
                                              <div className="flex items-center gap-4">
                                                <Activity size={20} className="text-green-500" />
                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Client Specs Sensor</span>
                                              </div>
                                              <div className="grid grid-cols-2 gap-4 h-full">
                                                <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 text-center flex flex-col justify-center gap-2 group-hover:bg-green-500/5 transition-all">
                                                  <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Cores</p>
                                                  <span className="text-3xl font-mono text-white font-black leading-none">{navigator.hardwareConcurrency || '?'}</span>
                                                </div>
                                                <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 text-center flex flex-col justify-center gap-2 group-hover:bg-green-500/5 transition-all">
                                                  <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Memory</p>
                                                  <span className="text-3xl font-mono text-white font-black leading-none">{(navigator as any).deviceMemory || '?'}<span className="text-xs text-neutral-500 uppercase tracking-normal">GB</span></span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between px-2 pt-8 border-t border-white/5">
                                          <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-lg border border-red-500/20">
                                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                              <span className="text-[9px] font-mono text-red-500 font-black tracking-widest uppercase">Trace_Active</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-neutral-500 font-bold tracking-widest">
                                              ENTITY_IDENT: TR-{(userProfiles.find(p => p.userId === editingProfileId) as any)?.userId?.substring(0, 10).toUpperCase()}
                                            </span>
                                          </div>
                                          <span className="text-[9px] font-mono text-neutral-700 uppercase tracking-[0.2em] font-bold">Protocol v8.12.0 SECURED</span>
                                        </div>
                                    </motion.div>
                                  )}
                                </div>
                             </div>
                        </div>
                      </div>
                    )}
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
