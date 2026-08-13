import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Check of production vs development mode
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static assets...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          if (!res.headersSent) {
            res.status(503).send("Application is starting up or building. Please reload in a few seconds.");
          }
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
