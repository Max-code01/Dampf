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
  UserMinus,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  Globe,
  Circle,
  ChevronDown,
  MessageSquare,
  Award,
  Lock,
  Send,
  Box,
  Key,
  Star
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
  limit,
  addDoc,
  serverTimestamp
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
}

interface UserProfile {
  userId: string;
  displayName: string;
  minecraftUsername: string;
  isOnline: boolean;
  currentServer: 'none' | 'pvp' | 'survival';
  role?: 'Member' | 'VIP' | 'Mod' | 'Admin';
  customSkin?: string;
  updatedAt: any;
}

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  displayName: string;
  role?: string;
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
}

interface ClanMember {
  id: string;
  userId: string;
  role: 'Leader' | 'Officer' | 'Member';
  joinedAt: any;
}

export default function App() {
  const [realmCodes, setRealmCodes] = useState({
    PVP: 'w3PHnwq-5_kcfoE',
    SURVIVAL: 'JwMPYn9KpsVnRFo'
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [user, setUser] = useState<User| null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Clan State
  const [clans, setClans] = useState<Clan[]>([]);
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [showCreateClan, setShowCreateClan] = useState(false);
  const [activeClanId, setActiveClanId] = useState<string | null>(null);
  const [isClansOpen, setIsClansOpen] = useState(false);
  const [clanChatMessages, setClanChatMessages] = useState<ChatMessage[]>([]);
  const [clanChatInput, setClanChatInput] = useState('');
  const [clanTab, setClanTab] = useState<'members' | 'chat' | 'perks'>('members');

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
      // Admin check: Developer email or system 'Max' account (max@community.local)
      setIsAdmin(u?.email === 'max.schule13@gmail.com' || u?.email === 'max@community.local' || u?.email === 'dampf@community.local');
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

    return () => {
      unsubscribePlayers();
      unsubscribePvp();
      unsubscribeSurvival();
      unsubscribeProfiles();
      unsubscribeCodes();
      unsubscribeChat();
      unsubscribeClans();
    };
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

    try {
      await setDoc(doc(db, 'user_profiles', targetId), {
        userId: targetId,
        displayName,
        minecraftUsername,
        isOnline,
        currentServer,
        role: role || 'Member',
        customSkin: tempSkin || null,
        updatedAt: serverTimestamp()
      }, { merge: true }); // Use merge to be safer
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

    const unsubscribeChat = onSnapshot(query(collection(db, 'clans', activeClanId, 'chat'), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)).reverse();
      setClanChatMessages(msgs);
    }, (err) => {
      // It's okay if this fails (e.g. user not a member), we just clear messages
      setClanChatMessages([]);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeChat();
    };
  }, [activeClanId, user]);

  const sendClanMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeClanId || !clanChatInput.trim()) return;
    
    // Check membership
    const isMember = clanMembers.some(m => m.userId === user.uid);
    if (!isMember) {
      alert('Du musst Mitglied sein, um zu schreiben.');
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
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'clans', clanId, 'members', user.uid), {
        userId: user.uid,
        role: 'Leader',
        joinedAt: serverTimestamp()
      });

      setShowCreateClan(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'clans');
    }
  };

  const joinClan = async (clanId: string) => {
    if (!user) return;
    const clan = clans.find(c => c.id === clanId);
    if (!clan) return;

    try {
      await setDoc(doc(db, 'clans', clanId, 'members', user.uid), {
        userId: user.uid,
        role: 'Member',
        joinedAt: serverTimestamp()
      });
      
      await setDoc(doc(db, 'clans', clanId), {
        memberCount: (clan.memberCount || 0) + 1
      }, { merge: true });

      setActiveClanId(clanId);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `clans/${clanId}/members`);
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
    if (!confirm('Clan wirklich auflösen?')) return;
    
    try {
      await deleteDoc(doc(db, 'clans', clanId));
      // Members subcollection is not automatically deleted, but for this demo it's fine
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

    try {
      await addDoc(collection(db, 'chat_messages'), {
        text: chatInput,
        userId: user.uid,
        displayName: myProfile?.displayName || user.displayName || 'Unbekannt',
        role: myProfile?.role || 'Member',
        createdAt: serverTimestamp()
      });
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
    try {
      if (player.type === 'manual') {
        await deleteDoc(doc(db, 'online_players', player.id));
      } else {
        await setDoc(doc(db, 'user_profiles', player.id), { 
          isOnline: false, 
          currentServer: 'none',
          updatedAt: serverTimestamp() 
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, player.type === 'manual' ? OperationType.DELETE : OperationType.WRITE, `kick_${player.type}/${player.id}`);
    }
  };

  const clearPlayers = async () => {
    if (!isAdmin) return;
    if (!confirm('Bist du sicher, dass du alle Online-Listen und Status zurücksetzen willst?')) return;
    try {
      // 1. Delete manual players
      const snapshot = await getDocs(collection(db, 'online_players'));
      await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'online_players', d.id))));
      
      // 2. Clear server status counts
      await setDoc(doc(db, 'server_status', 'pvp'), { ...pvpStatus, playerCount: 0 });
      await setDoc(doc(db, 'server_status', 'survival'), { ...survivalStatus, playerCount: 0 });

      // 3. Mark all user profiles as offline
      const profilesSnapshot = await getDocs(collection(db, 'user_profiles'));
      await Promise.all(profilesSnapshot.docs.map(d => 
        setDoc(doc(db, 'user_profiles', d.id), { 
          isOnline: false, 
          currentServer: 'none',
          updatedAt: serverTimestamp() 
        }, { merge: true })
      ));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'clear_players');
    }
  };

  const totalReset = async () => {
    if (!isAdmin) return;
    if (!confirm('!!! MASSIVER RESET !!!\nDies löscht:\n- Alle Online-Spieler\n- Alle Benutzerprofile\n- Den gesamten Chat\n\nBist du ABSOLUT sicher?')) return;
    
    try {
      // Clear Everything
      const playersSnap = await getDocs(collection(db, 'online_players'));
      await Promise.all(playersSnap.docs.map(d => deleteDoc(doc(db, 'online_players', d.id))));

      const chatSnap = await getDocs(collection(db, 'chat_messages'));
      await Promise.all(chatSnap.docs.map(d => deleteDoc(doc(db, 'chat_messages', d.id))));

      const userSnap = await getDocs(collection(db, 'user_profiles'));
      await Promise.all(userSnap.docs.map(d => deleteDoc(doc(db, 'user_profiles', d.id))));

      await setDoc(doc(db, 'server_status', 'pvp'), { online: true, playerCount: 0, maxPlayers: 10 });
      await setDoc(doc(db, 'server_status', 'survival'), { online: true, playerCount: 0, maxPlayers: 10 });

      alert('Das gesamte System wurde zurückgesetzt.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'total_reset');
    }
  };

  const clearProfiles = async () => {
    if (!isAdmin) return;
    if (!confirm('WARNUNG: Dies löscht ALLE Benutzerprofile der Community! Fortfahren?')) return;
    try {
      const snapshot = await getDocs(collection(db, 'user_profiles'));
      await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'user_profiles', d.id))));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'user_profiles');
    }
  };

  const deleteProfile = async (profileId: string) => {
    if (!isAdmin) return;
    if (!confirm('Dieses Profil wirklich löschen?')) return;
    try {
      await deleteDoc(doc(db, 'user_profiles', profileId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `user_profiles/${profileId}`);
    }
  };

  const clearChat = async () => {
    if (!isAdmin) return;
    if (!confirm('Chat-Verlauf leeren?')) return;
    try {
      const snapshot = await getDocs(collection(db, 'chat_messages'));
      await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'chat_messages', d.id))));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'chat_messages');
    }
  };

  const pvpPlayers = players.filter(p => p.server === 'pvp');
  const survivalPlayers = players.filter(p => p.server === 'survival');
  
  // Combined lists for specific servers
  const combinedPvpPlayers = [
    ...userProfiles
      .filter(p => p.isOnline && p.currentServer === 'pvp')
      .map(p => ({ username: p.minecraftUsername, id: p.userId, type: 'profile', role: p.role || 'Member' })),
    ...pvpPlayers.map(p => ({ username: p.username, id: p.id, type: 'manual', role: 'Member' }))
  ].filter((player, index, self) => 
    index === self.findIndex((t) => t.username.toLowerCase() === player.username.toLowerCase())
  );

  const combinedSurvivalPlayers = [
    ...userProfiles
      .filter(p => p.isOnline && p.currentServer === 'survival')
      .map(p => ({ username: p.minecraftUsername, id: p.userId, type: 'profile', role: p.role || 'Member' })),
    ...survivalPlayers.map(p => ({ username: p.username, id: p.id, type: 'manual', role: 'Member' }))
  ].filter((player, index, self) => 
    index === self.findIndex((t) => t.username.toLowerCase() === player.username.toLowerCase())
  );

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
        userId: p.userId,
        type: 'profile'
      }))
  ].filter((player, index, self) => 
    index === self.findIndex((t) => t.username.toLowerCase() === player.username.toLowerCase())
  );

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

      {/* Navigation */}
      <nav className="relative z-10 border-b border-neutral-800/50 bg-black/50 backdrop-blur-sm sticky top-0">
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
                      <Trash2 size={14} /> Online-Listen leeren
                    </button>
                    <button onClick={clearProfiles} className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs py-3 rounded-xl border border-orange-500/20 flex items-center justify-center gap-2">
                       <UserMinus size={14} /> Alle Profile löschen
                    </button>
                    <button onClick={clearChat} className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs py-3 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2">
                       <MessageCircle size={14} /> Chat leeren
                    </button>
                    <button onClick={totalReset} className="w-full bg-white/5 hover:bg-white/10 text-white text-[10px] py-2 rounded-lg border border-white/10 flex items-center justify-center gap-2 mt-4 opacity-50 hover:opacity-100 transition-opacity">
                       <ShieldCheck size={12} /> Totaler System Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button */}
      <button 
        onClick={() => setChatOpen(!chatOpen)}
        className={`fixed bottom-8 right-8 z-[60] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${chatOpen ? 'bg-mc-red text-white rotate-90' : 'bg-black border border-neutral-800 text-white'}`}
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-black/95 backdrop-blur-xl z-50 border-l border-neutral-800 shadow-2xl flex flex-col pt-20"
          >
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Community Chat</h3>
                <p className="text-neutral-500 text-xs">Schreibe mit anderen Spielern</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.userId === user?.uid ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{msg.displayName}</span>
                    {msg.role && msg.role !== 'Member' && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase text-white ${
                        msg.role === 'Admin' ? 'bg-mc-gold' : 
                        msg.role === 'Mod' ? 'bg-mc-red' : 
                        'bg-purple-500'
                      }`}>
                        {msg.role}
                      </span>
                    )}
                  </div>
                  <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                    msg.userId === user?.uid ? 'bg-mc-red text-white' : 'bg-neutral-800 text-neutral-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 text-center space-y-4">
                   <div className="p-4 bg-neutral-900 rounded-full">
                     <MessageCircle size={32} />
                   </div>
                   <p className="text-xs italic">Noch keine Nachrichten... fang an zu schreiben!</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-800">
              {user ? (
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Sende eine Nachricht..."
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
                  className="relative group cursor-pointer"
                  onClick={() => isAdmin && p.type === 'profile' && openProfileEdit(p.userId)}
                >
                  <img 
                    src={p.type === 'profile' ? (userProfiles.find(prof => prof.userId === p.userId)?.customSkin || `https://mc-heads.net/avatar/${p.username}`) : `https://mc-heads.net/avatar/${p.username}`} 
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
              {userProfiles.map((p) => (
                <motion.div 
                  key={p.userId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mc-card p-4 flex flex-col items-center text-center border-neutral-800/50 transition-colors group relative ${isAdmin ? 'hover:border-mc-gold/50 cursor-pointer' : 'hover:border-mc-red/30'}`}
                  onClick={() => isAdmin && openProfileEdit(p.userId)}
                >
                  <div className="absolute top-2 right-2 flex gap-1 z-20">
                    {p.role && p.role !== 'Member' && (
                      <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-sm ${
                        p.role === 'Admin' ? 'bg-mc-gold text-black' :
                        p.role === 'Mod' ? 'bg-mc-red text-white' :
                        p.role === 'VIP' ? 'bg-purple-500 text-white' : ''
                      }`}>
                        {p.role}
                      </div>
                    )}
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteProfile(p.userId); }}
                          className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40"
                        >
                          <Trash2 size={12} />
                        </button>
                        <div className="p-1.5 bg-mc-gold/20 text-mc-gold rounded-lg">
                          <ShieldCheck size={12} />
                        </div>
                      </div>
                    )}
                  </div>
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
        <section id="clans" className="mb-24 py-12 border-t border-neutral-800/50">
          <div 
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 cursor-pointer group"
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
              <p className="text-neutral-400">Schließe dich mit anderen zusammen und dominiere gemeinsam.</p>
            </div>
            
            <div className="flex gap-4">
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
                    {clans.map(clan => (
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
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); joinClan(clan.id); }}
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
                    <div className="border-b border-neutral-800 flex bg-neutral-900/50">
                      {(['members', 'chat', 'perks'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setClanTab(tab)}
                          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                            clanTab === tab 
                              ? 'text-mc-gold bg-mc-gold/5 border-b-2 border-mc-gold' 
                              : 'text-neutral-600 hover:text-neutral-400'
                          }`}
                        >
                          {tab === 'members' && <Users size={12} className="inline mr-1" />}
                          {tab === 'chat' && <MessageSquare size={12} className="inline mr-1" />}
                          {tab === 'perks' && <Award size={12} className="inline mr-1" />}
                          {tab}
                        </button>
                      ))}
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
                              {clanMembers.map(member => {
                                const prof = userProfiles.find(p => p.userId === member.userId);
                                const isLeader = clans.find(c => c.id === activeClanId)?.leaderId === user?.uid;
                                
                                return (
                                  <div key={member.userId} className="flex items-center justify-between p-2 bg-neutral-900/30 rounded-xl border border-neutral-800/30">
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={prof?.customSkin || `https://mc-heads.net/avatar/${prof?.minecraftUsername || 'steve'}`}
                                        alt=""
                                        className="w-8 h-8 rounded-lg bg-black pixelated border border-neutral-800 object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div>
                                        <p className="text-xs font-bold leading-tight">{prof?.displayName || 'Spieler'}</p>
                                        <span className={`text-[7px] px-1 py-0.5 rounded font-black uppercase text-white ${
                                          member.role === 'Leader' ? 'bg-mc-gold' : 
                                          member.role === 'Officer' ? 'bg-mc-red' : 
                                          'bg-neutral-700'
                                        }`}>
                                          {member.role}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {isLeader && member.userId !== user?.uid && (
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
                              {!clanMembers.some(m => m.userId === user?.uid) ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-neutral-900/50 rounded-2xl border border-dashed border-neutral-800">
                                  <Lock size={24} className="text-neutral-700 mb-2" />
                                  <p className="text-xs text-neutral-500 italic">Du musst diesem Clan beitreten, um den Chat zu sehen.</p>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-hide">
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
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
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
                  {isAdmin && editingProfileId !== user?.uid ? `Profil von ${userProfiles.find(p => p.userId === editingProfileId)?.displayName || 'Unbekannt'}` : 'Dein Spieler-Profil'}
                </h3>
                
                <form onSubmit={saveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      )}
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
