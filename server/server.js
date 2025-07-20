require('dotenv').config();
const express = require("express");
const cors = require("cors");
const http = require("http");               // ✅ Required for WebSocket integration
const { Server } = require("ws");           // ✅ WebSocket package

const app = express();
const pool = require("./db");
const subscriptionRoutes = require('./routes/subscription');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');


// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('OK');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api/users', usersRoutes); // ✅ Register this
// ✅ REST endpoints (your existing POST/GET/PUT/DELETE logic here... unchanged)
app.get("/todos", async (req, res) => {
  try {
    const allToDos = await pool.query("SELECT * FROM todo");
    res.json(allToDos.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ⬇️ For brevity, your existing todos, tenants, users, subtenants routes are omitted
// Keep all your existing CRUD routes as they are

// ✅ Setup HTTP server (to pass into WebSocket)
const server = http.createServer(app);

// ✅ Attach WebSocket server to HTTP server
const wss = new Server({ server });

wss.on("connection", (ws) => {
  console.log("🔌 Client connected via WebSocket");

  ws.send("👋 Hello from WebSocket server!");

  ws.on("message", (message) => {
    console.log("📨 Message received:", message);
    // Optional: broadcast or handle message
  });

  ws.on("close", () => {
    console.log("❌ WebSocket client disconnected");
  });
});

// ✅ Start the combined HTTP + WebSocket server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
