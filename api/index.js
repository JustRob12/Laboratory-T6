const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces

// Function to get local IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const interfaceName in interfaces) {
    const interface = interfaces[interfaceName];
    for (const iface of interface) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  
  return addresses;
}

// Secret key for JWT (in production, store securely and use environment variables)
const JWT_SECRET = 'your_jwt_secret_key_here';

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// In-memory database (for demo purposes)
let notes = [
  { id: 1, text: 'Business plan draft', timestamp: new Date().toISOString() },
  { id: 2, text: 'Meeting notes', timestamp: new Date().toISOString() },
  { id: 3, text: 'Project requirements', timestamp: new Date().toISOString() },
];

// User database (for demo purposes)
const users = [
  { id: 1, username: 'admin', password: 'password123', name: 'John Doe' },
  { id: 2, username: 'user', password: 'user123', name: 'Jane Smith' },
];

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Routes
// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple authentication (for demo purposes)
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate JWT token with 1 hour expiration
  const currentTime = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id.toString(),
    name: user.name,
    iat: currentTime,
    exp: currentTime + 3600 // 1 hour expiration
  };
  
  const token = jwt.sign(payload, JWT_SECRET);
  
  res.json({ token });
});

// Get notes endpoint (protected)
app.get('/notes', authenticateToken, (req, res) => {
  res.json({ notes });
});

// Add note endpoint (protected)
app.post('/notes', authenticateToken, (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Note text is required' });
  }
  
  const newNote = {
    id: notes.length + 1,
    text,
    timestamp: new Date().toISOString()
  };
  
  notes.push(newNote);
  res.status(201).json({ note: newNote });
});

// Server initialization
app.listen(PORT, HOST, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Login credentials: admin/password123 or user/user123`);
  
  // Print available IP addresses to connect from mobile device
  const ipAddresses = getLocalIpAddresses();
  console.log('Available IP addresses to connect from your phone:');
  ipAddresses.forEach(ip => {
    console.log(`http://${ip}:${PORT}`);
  });
}); 