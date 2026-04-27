import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore(firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Sync endpoint for the Minecraft Bridge Bot
  app.post("/api/realm-sync", async (req, res) => {
    const { secret, server, players } = req.body;

    if (!secret || secret !== process.env.SYNC_SECRET) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!server || !players || !Array.isArray(players)) {
      return res.status(400).json({ error: "Invalid data" });
    }

    try {
      const batch = db.batch();

      // 1. Get current players on this server to remove those who are gone
      const currentPlayersSnapshot = await db.collection("online_players")
        .where("server", "==", server)
        .get();

      currentPlayersSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. Add new players
      players.forEach((username: string) => {
        const playerRef = db.collection("online_players").doc(username.toLowerCase());
        batch.set(playerRef, {
          username: username,
          server: server,
          lastSeen: new Date().toISOString()
        });
      });

      // 3. Update server status
      const statusRef = db.collection("server_status").doc(server);
      batch.set(statusRef, {
        online: true,
        playerCount: players.length,
        maxPlayers: 10 // Realms limit
      }, { merge: true });

      await batch.commit();
      
      console.log(`[Sync] Updated ${server}: ${players.length} players`);
      res.json({ success: true, count: players.length });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
