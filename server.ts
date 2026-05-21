import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Client, GatewayIntentBits, REST, Routes, PermissionFlagsBits, ChatInputCommandInteraction } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, query, collection, where, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- DISCORD BOT SETUP ---
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.VITE_DISCORD_GUILD_ID || "1451980583969230882";

  if (botToken) {
    const client = new Client({ 
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
    });

    client.on('ready', async () => {
      console.log(`[DISCORD] Bot online als ${client.user?.tag}`);
      
      // Register Slash Commands GLOBALLY (can take up to 1 hour to propagate, but works for User Installs)
      const rest = new REST({ version: '10' }).setToken(botToken);
      const commands = [
        {
          name: 'ban',
          description: 'Bannt einen User vom Discord und aus der Website-Datenbank',
          default_member_permissions: PermissionFlagsBits.BanMembers.toString(),
          dm_permission: false,
          integration_types: [0, 1],
          contexts: [0, 1, 2],
          options: [
            {
              name: 'discord_user',
              type: 6, // USER
              description: 'Der Discord-User zum Bannen',
              required: false
            },
            {
              name: 'web_id',
              type: 3, // STRING
              description: 'Oder die Website-ID / Minecraft-Name zum Bannen',
              required: false
            },
            {
              name: 'grund',
              type: 3, // STRING
              description: 'Grund für den Bann',
              required: false
            }
          ]
        },
        {
          name: 'stats',
          description: 'Zeigt Statistiken eines Spielers an',
          integration_types: [0, 1],
          contexts: [0, 1, 2],
          options: [
            {
              name: 'user',
              type: 6, // USER
              description: 'Der User dessen Stats du sehen willst',
              required: false
            }
          ]
        },
        {
          name: 'status',
          description: 'Zeigt den System-Status an',
          integration_types: [0, 1],
          contexts: [0, 1, 2]
        },
        {
          name: 'help',
          description: 'Zeigt alle verfügbaren Befehle an',
          integration_types: [0, 1],
          contexts: [0, 1, 2]
        }
      ];

      try {
        // Register globally for User Context support
        await rest.put(
          Routes.applicationCommands(client.user!.id),
          { body: commands }
        );
        console.log('[DISCORD] Globale Slash Commands registriert.');
      } catch (err) {
        console.error('[DISCORD] Fehler beim Registrieren der globalen Commands:', err);
      }

      try {
        if (guildId) {
          // Also register guild-specific for instant updates on main server
          await rest.put(
            Routes.applicationGuildCommands(client.user!.id, guildId),
            { body: commands }
          );
          console.log(`[DISCORD] Gilden-spezifische Slash Commands für Guild ID ${guildId} registriert.`);
        }
      } catch (err: any) {
        const errStr = String(err);
        if (err.code === 50001 || err.status === 403 || errStr.includes('50001') || errStr.includes('Missing Access')) {
          console.warn(`[DISCORD] Hinweis: Gilden-Befehle konnten für Guild ID ${guildId} nicht registriert werden (Missing Access / Code 50001).`);
          console.warn(`           Das ist normal, wenn der Bot nicht auf diesem Server existiert oder ohne die 'applications.commands' Berechtigung eingeladen wurde.`);
        } else {
          console.error('[DISCORD] Fehler beim Registrieren der Gilden-spezifischen Commands:', err);
        }
      }
    });

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const { commandName, options } = interaction;

      if (commandName === 'ban') {
        const targetUser = options.getUser('discord_user');
        const webId = options.getString('web_id');
        const reason = options.getString('grund') || 'Kein Grund angegeben';

        if (!targetUser && !webId) {
          return interaction.reply({ content: '❌ Du musst entweder einen Discord-User oder eine Website-ID/Namen angeben.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
          let systemBanSuccess = false;
          let foundUser = null;

          if (targetUser) {
            const q = query(collection(db, 'user_profiles'), where('discordId', '==', targetUser.id));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const batch = writeBatch(db);
              snapshot.forEach(docSnap => {
                foundUser = docSnap.data();
                batch.delete(doc(db, 'user_profiles', docSnap.id));
              });
              await batch.commit();
              systemBanSuccess = true;
            }
          } else if (webId) {
            // Search by ID or Name
            const qByName = query(collection(db, 'user_profiles'), where('minecraftUsername', '==', webId));
            const qById = query(collection(db, 'user_profiles'), where('userId', '==', webId));
            const [snapName, snapId] = await Promise.all([getDocs(qByName), getDocs(qById)]);
            
            const batch = writeBatch(db);
            const snaps = [...snapName.docs, ...snapId.docs];
            if (snaps.length > 0) {
              snaps.forEach(docSnap => {
                foundUser = docSnap.data();
                batch.delete(doc(db, 'user_profiles', docSnap.id));
              });
              await batch.commit();
              systemBanSuccess = true;
            }
          }

          // Discord Ban if user provided
          if (targetUser) {
            const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
            if (member) {
              await member.ban({ reason: `[Admin: ${interaction.user.tag}] ${reason}` });
            } else {
              await interaction.guild?.bans.create(targetUser.id, { reason: `[Admin: ${interaction.user.tag}] ${reason}` });
            }
          }

          await interaction.editReply({ 
            content: `✅ Bann abgeschlossen.\n- Ziel: ${targetUser ? targetUser.tag : webId}\n- Discord: ${targetUser ? 'Gebannt' : 'N/A'}\n- Website-Datenbank: ${systemBanSuccess ? `Gefunden & Gelöscht (${foundUser?.displayName})` : 'Kein Account gefunden'}` 
          });
        } catch (err: any) {
          console.error('[DISCORD] Ban-Fehler:', err);
          await interaction.editReply({ content: `❌ Fehler beim Ausführen des Banns: ${err.message}` });
        }
      }

      if (commandName === 'stats') {
        const targetUser = options.getUser('user') || interaction.user;
        await interaction.deferReply();

        try {
          const q = query(collection(db, 'user_profiles'), where('discordId', '==', targetUser.id));
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
            return interaction.editReply({ content: `❌ Kein verknüpfter Website-Account für **${targetUser.tag}** gefunden.` });
          }

          const profile = snapshot.docs[0].data() as any;
          const embed = {
            color: 0xffd700,
            title: `Statistiken für ${profile.displayName}`,
            thumbnail: { url: targetUser.displayAvatarURL() },
            fields: [
              { name: '💰 Coins', value: `\`${profile.coins || 0}\``, inline: true },
              { name: '⭐ Level', value: `\`${Math.floor(Math.sqrt((profile.xp || 0) / 100)) + 1}\``, inline: true },
              { name: '🛡️ Rang', value: `\`${profile.role || 'Spieler'}\``, inline: true },
              { name: '🎮 Minecraft', value: `\`${profile.minecraftUsername || 'Unbekannt'}\``, inline: true },
              { name: '🔥 XP', value: `\`${profile.xp || 0}\``, inline: true },
            ],
            timestamp: new Date().toISOString()
          };

          await interaction.editReply({ embeds: [embed] });
        } catch (err: any) {
          await interaction.editReply({ content: `❌ Fehler beim Laden der Stats: ${err.message}` });
        }
      }

      if (commandName === 'status') {
        await interaction.reply({ content: '✅ **System-Status:** Online\n- Website: https://mc-manager.example.com\n- Datenbank-Sync: Aktiv\n- AI-Integration: Bereit' });
      }

      if (commandName === 'help') {
        const helpMsg = `**Verfügbare Befehle:**\n` + 
          `- \`/stats [@user]\`: Zeigt Statistiken an.\n` +
          `- \`/ban [discord_user] [web_id] [grund]\`: Bannt einen User (Admin).\n` +
          `- \`/status\`: Zeigt System-Status an.\n` +
          `- \`/help\`: Diese Nachricht.`;
        await interaction.reply({ content: helpMsg, ephemeral: true });
      }
    });

    client.login(botToken).catch(err => {
      console.error('[DISCORD] Login fehlgeschlagen:', err);
    });
  } else {
    console.warn('[DISCORD] DISCORD_BOT_TOKEN nicht gesetzt. Bot bleibt offline.');
  }

  // --- EMERGENCY PERSISTENCE (In-Memory for now) ---
  // This stores critical states when Firebase is dead
  let emergencyConfig = {
    maintenanceMode: false,
    realmCodes: {
      PVP: 'w3PHnwq-5_kcfoE',
      SURVIVAL: 'JwMPYn9KpsVnRFo'
    }
  };

  // Basic API for emergency recovery
  app.get('/api/emergency-config', (req, res) => {
    res.json(emergencyConfig);
  });

  app.post('/api/emergency-config', (req, res) => {
    emergencyConfig = { ...emergencyConfig, ...req.body };
    res.json({ success: true, config: emergencyConfig });
  });

  // --- DISCORD API ENDPOINT (For Website -> Discord) ---
  app.post('/api/discord/ban', async (req, res) => {
    const { discordUserId, reason } = req.body;
    
    if (!botToken) {
      return res.status(500).json({ error: "Discord Bot Token nicht konfiguriert (DISCORD_BOT_TOKEN)." });
    }

    if (!discordUserId) {
      return res.status(400).json({ error: "Keine Discord User ID angegeben." });
    }

    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/bans/${discordUserId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delete_message_days: 1,
          reason: reason || "Banned via Admin Dashboard"
        })
      });

      if (response.ok || response.status === 204) {
        res.json({ success: true, message: "User erfolgreich auf Discord gebannt." });
      } else {
        const errData = await response.json().catch(() => ({ message: "Unbekannter Discord API Fehler" }));
        res.status(response.status).json({ error: errData.message });
      }
    } catch (err) {
      res.status(500).json({ error: "Verbindung zu Discord fehlgeschlagen." });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mode: 'full-stack' });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SYSTEM] Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer();
