#!/usr/bin/env node

/**
 * OSC Bridge Server
 *
 * Receives OSC messages from iOS apps (PhyOSC, MotionSender, TouchOSC)
 * and forwards them to browser clients via WebSocket.
 *
 * Usage:
 *   npm install osc ws
 *   node osc-bridge-server.js
 *
 * Configure iOS app to send to:
 *   IP: <this-computer-ip>
 *   Port: 8000
 */

const osc = require('osc');
const WebSocket = require('ws');
const os = require('os');

// Configuration
const OSC_PORT = 8000;
const WS_PORT = 8080;

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }

  return ips;
}

// Create UDP OSC server
const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: OSC_PORT,
  metadata: true
});

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

let connectedClients = 0;
let messageCount = 0;
let lastMessageTime = Date.now();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  connectedClients++;
  const clientIp = req.socket.remoteAddress;

  console.log(`✅ Browser connected from ${clientIp} (total: ${connectedClients})`);

  ws.on('close', () => {
    connectedClients--;
    console.log(`❌ Browser disconnected (total: ${connectedClients})`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
});

// OSC message handler
udpPort.on('message', (oscMsg, timeTag, info) => {
  messageCount++;
  lastMessageTime = Date.now();

  // Extract values (handle both typed and untyped args)
  const args = oscMsg.args.map(arg => {
    if (typeof arg === 'object' && arg.value !== undefined) {
      return arg.value;
    }
    return arg;
  });

  // Log to console (throttled)
  if (messageCount % 10 === 0) {
    console.log(`[${oscMsg.address}]`, args.map(v =>
      typeof v === 'number' ? v.toFixed(3) : v
    ).join(', '));
  }

  // Forward to all connected browsers
  const payload = JSON.stringify({
    address: oscMsg.address,
    args: args,
    source: info.address,
    timestamp: Date.now()
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
});

udpPort.on('error', (err) => {
  console.error('❌ OSC Error:', err.message);
});

// Start servers
udpPort.open();

console.log('🎵 SuperSonic OSC Bridge Server\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📡 OSC listening on UDP port ${OSC_PORT}`);
console.log(`🌐 WebSocket server on port ${WS_PORT}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📱 Configure your iOS app:');
const ips = getLocalIPs();
if (ips.length > 0) {
  console.log(`   Target IP: ${ips[0]} (or ${ips.join(', ')})`);
} else {
  console.log('   Target IP: <your-computer-ip>');
}
console.log(`   Target Port: ${OSC_PORT}\n`);

console.log('🌐 Connect browser to:');
console.log(`   ws://localhost:${WS_PORT}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Waiting for OSC messages...\n');

// Status updates every 5 seconds
setInterval(() => {
  const timeSinceLastMsg = Date.now() - lastMessageTime;
  const status = timeSinceLastMsg < 5000 ? '🟢 ACTIVE' : '🔴 IDLE';

  console.log(`[Status] ${status} | Messages: ${messageCount} | Clients: ${connectedClients}`);
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  udpPort.close();
  wss.close();
  process.exit(0);
});
