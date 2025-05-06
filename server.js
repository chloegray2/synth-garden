// server.js - Synth Garden Serial Communication
const express = require('express');
const http = require('http');
const path = require('path');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const socketIo = require('socket.io');
const fs = require('fs');

// Set up Express + HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serial port setup
let portPath = '/dev/tty.usbmodem11101'; // fallback path

function findArduinoPort() {
  return SerialPort.list().then(ports => {
    console.log("Scanning for Arduino ports...");
    for (let port of ports) {
      console.log(` - ${port.path} (${port.manufacturer || 'Unknown'})`);
      if (
        port.manufacturer &&
        (port.manufacturer.toLowerCase().includes('arduino') ||
         (port.vendorId && port.vendorId === '2341'))
      ) {
        console.log(`Found Arduino: ${port.path}`);
        return port.path;
      }
    }
    console.warn("Arduino not automatically detected. Using fallback.");
    return portPath;
  });
}

async function initializeSerial() {
  const arduinoPath = await findArduinoPort();
  console.log(`Connecting to ${arduinoPath}...`);

  const port = new SerialPort({ path: arduinoPath, baudRate: 9600 });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.on('open', () => {
    console.log(`Serial connection established at ${arduinoPath}`);
  });

  port.on('error', (err) => {
    console.error('Serial port error:', err.message);
  });

  parser.on('data', (data) => {
    data = data.trim();
    console.log('From Arduino:', data);
    io.emit('arduinoData', data);
  });

  io.on('connection', (socket) => {
    console.log("Browser connected");
    socket.on('disconnect', () => {
      console.log("Browser disconnected");
    });
  });
}

// Start server
const PORT = 3000;
server.listen(PORT, async () => {
  console.log(`Synth Garden server running at http://localhost:${PORT}`);
  await initializeSerial();
});