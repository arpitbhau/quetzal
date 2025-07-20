// radhe radhe

import express from 'express';
import bodyParser from 'body-parser';
import multerApi from './api/multer_api.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// HTTPS certificate and key (self-signed for dev)
const keyPath = path.join(__dirname, 'key.pem');
const certPath = path.join(__dirname, 'cert.pem');
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('Missing key.pem or cert.pem in server directory.');
  console.error('Generate with: openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -days 365');
  process.exit(1);
}
const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS middleware for frontend - COMMENTED OUT
/*
app.use((req, res, next) => {
  const allowedOrigins = [
    SERVER_CONFIG.CORS_ORIGIN,
    `http://${SERVER_CONFIG.DOMAIN}:5173`,
    `http://${SERVER_CONFIG.DOMAIN}:3000`,
    `http://localhost:5173`,
    `http://localhost:3000`
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
*/

// Custom download route that forces download
app.get('/download/:paperId/:filename', (req, res) => {
  const { paperId, filename } = req.params;
  const filePath = path.join(__dirname, 'uploads', paperId, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Set headers to force download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', fs.statSync(filePath).size);
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

// Serve static files from uploads directory (fallback)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Express server!' });
});

// Multer API routes
app.use('/api', multerApi);

// Start HTTPS server
https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
});

