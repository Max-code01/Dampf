import express from 'express';
import path from 'path';
import fs from 'fs';
import { MongoClient, Db } from 'mongodb';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), 'emergency_data.json');
  
  let db: Db | null = null;
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      console.log('[SYSTEM] Attempting MongoDB Connection...');
      const client = new MongoClient(mongoUri, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000
      });
      await client.connect();
      db = client.db('emergency_backup');
      console.log('[SYSTEM] Connected to MongoDB Emergency Backup');
    } catch (e: any) {
      console.error('[SYSTEM] MongoDB Connection Failed:', e.message);
      console.log('[SYSTEM] Using local file fallback (emergency_data.json)');
    }
  }

  app.use(express.json());

  // --- PERSISTENCE HELPERS ---
  const loadData = async () => {
    if (db) {
      try {
        const config = await db.collection('config').findOne({ id: 'main' });
        if (config) {
          // Remove mongo ID
          const { _id, ...rest } = config;
          return rest;
        }
      } catch (e) {
        console.error('Error loading from MongoDB', e);
      }
    }
    
    // File Fallback
    try {
      if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('Error loading emergency data from file', e);
    }
    
    return {
      maintenanceMode: false,
      broadcastMessage: null,
      realmCodes: {
        PVP: 'w3PHnwq-5_kcfoE',
        SURVIVAL: 'K2_7HskE9mI'
      }
    };
  };

  const saveData = async (data: any) => {
    if (db) {
      try {
        await db.collection('config').updateOne(
          { id: 'main' },
          { $set: { ...data, updatedAt: new Date() } },
          { upsert: true }
        );
      } catch (e) {
        console.error('Error saving to MongoDB', e);
      }
    }
    
    // File Sync
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Error saving emergency data to file', e);
    }
  };

  let emergencyConfig = await loadData();
  let userCache: Record<string, any> = {};

  // API for emergency recovery
  app.get('/api/emergency-config', async (req, res) => {
    // Refresh from DB occasionally or on request to ensure multi-user sync
    if (db) emergencyConfig = await loadData();
    res.json({ ...emergencyConfig, userCache });
  });

  app.post('/api/emergency-config', async (req, res) => {
    emergencyConfig = { ...emergencyConfig, ...req.body };
    await saveData(emergencyConfig);
    res.json({ success: true, config: emergencyConfig });
  });

  app.post('/api/emergency-user-sync', async (req, res) => {
    const { uid, profile } = req.body;
    if (uid && profile) {
      userCache[uid] = profile;
      if (db) {
        await db.collection('users').updateOne(
          { uid },
          { $set: { ...profile, lastSeen: new Date() } },
          { upsert: true }
        );
      }
    }
    res.json({ success: true });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mode: 'full-stack', storage: db ? 'mongodb' : 'file' });
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
    console.log(`[SYSTEM] Full-Stack Emergency Server running on http://localhost:${PORT}`);
  });
}

startServer();
