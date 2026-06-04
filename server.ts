import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for verification (Simulating database)
interface Booking {
  id: string;
  userId: string;
  listingId: string;
  listingTitle: string;
  amount: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
  createdAt: string;
}

const bookings: Record<string, Booking> = {};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Check booking status
  app.get("/api/bookings/status/:id", (req, res) => {
    const bookingId = req.params.id;
    const booking = bookings[bookingId];
    
    // For Sandbox/Dev stimulation: If it's still pending after 5 seconds, mark it confirmed 
    // to simulate a background IPN since the dev container might not be reachable by PayFast.
    if (booking && booking.status === 'pending') {
      const createdTime = new Date(booking.createdAt).getTime();
      const now = new Date().getTime();
      if (now - createdTime > 5000) {
        booking.status = 'confirmed';
      }
    }

    if (booking) {
      res.json(booking);
    } else {
      res.status(404).json({ error: "Booking not found" });
    }
  });

  // Get all bookings for a user
  app.get("/api/bookings/user/:userId", (req, res) => {
    const userId = req.params.userId;
    const userBookings = Object.values(bookings)
      .filter(b => b.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(userBookings);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
