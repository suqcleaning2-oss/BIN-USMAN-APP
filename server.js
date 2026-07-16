import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for verification (Simulating database)
const bookings = {};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Register a booking to allow sandbox/dev status simulation
  app.post("/api/bookings/initiate", (req, res) => {
    const { bookingId, userId, listingId, listingTitle, amount, checkIn, checkOut, nights } = req.body;
    
    bookings[bookingId] = {
      id: bookingId,
      userId,
      listingId: listingId || "unknown",
      listingTitle: listingTitle || "Stay booking",
      amount: Number(amount) || 0,
      checkIn: checkIn || new Date().toISOString(),
      checkOut: checkOut || new Date().toISOString(),
      nights: Number(nights) || 1,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    console.log(`Booking ${bookingId} initiated on server memory.`);
    res.json({ success: true });
  });

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

  // Smart checking of production vs development mode
  const isProduction = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));

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
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
