import express from "express";
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

  app.use("/api", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  const localDistPath = path.resolve(__dirname, "dist");
  const cwdDistPath = path.resolve(process.cwd(), "dist");
  const distPath =
    fs.existsSync(localDistPath) || !fs.existsSync(cwdDistPath)
      ? localDistPath
      : cwdDistPath;
  const indexHtmlPath = path.join(distPath, "index.html");
  const hasDistBuild = fs.existsSync(indexHtmlPath);

  const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.env.NODE_ENV !== "development" && hasDistBuild);

  if (!isProduction) {
    console.log("Starting server in development mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static assets...");
    app.use(express.static(distPath));
    app.use("/assets", (req, res) => {
      res.status(404).send("Asset not found");
    });
    app.get(/.*/, (req, res) => {
      res.sendFile(indexHtmlPath, (err) => {
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
