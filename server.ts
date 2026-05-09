import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
    // Basic protection: normally you'd check a secret here
    emergencyConfig = { ...emergencyConfig, ...req.body };
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
