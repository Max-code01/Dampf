import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), 'emergency_data.json');

  app.use(express.json());

  // --- PERSISTENCE HELPERS ---
  const loadData = () => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('Error loading emergency data', e);
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

  const saveData = (data: any) => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Error saving emergency data', e);
    }
  };

  let emergencyConfig = loadData();

  // API for emergency recovery
  app.get('/api/emergency-config', (req, res) => {
    res.json(emergencyConfig);
  });

  app.post('/api/emergency-config', (req, res) => {
    emergencyConfig = { ...emergencyConfig, ...req.body };
    saveData(emergencyConfig);
    res.json({ success: true, config: emergencyConfig });
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
    console.log(`[SYSTEM] Full-Stack Emergency Server running on http://localhost:${PORT}`);
  });
}

startServer();
