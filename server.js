const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const newsScraper = require('./scrapers/news');
const aircraftScraper = require('./scrapers/aircraft');
const shipsScraper = require('./scrapers/ships');
const gdeltScraper = require('./scrapers/gdelt');
const conflictsScraper = require('./scrapers/conflicts');
const strikesScraper = require('./scrapers/strikes');
const twitterScraper = require('./scrapers/twitter');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Store latest data for new connections
const latestData = {
  news: [],
  aircraft: [],
  ships: [],
  events: [],
  conflicts: [],
  strikes: []
};

// Broadcast to all connected clients
function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send all current data to new client
  for (const [type, data] of Object.entries(latestData)) {
    if (data.length > 0) {
      ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    }
  }

  ws.on('close', () => console.log('Client disconnected'));
});

// Scraper runner
async function runScraper(name, scraperFn, intervalMs) {
  const run = async () => {
    try {
      const data = await scraperFn();
      if (data && data.length > 0) {
        latestData[name] = data;
        broadcast(name, data);
        console.log(`[${name}] ${data.length} items`);
      }
    } catch (err) {
      console.error(`[${name}] Error:`, err.message);
    }
  };

  await run();
  setInterval(run, intervalMs);
}

// Start all scrapers
function startScrapers() {
  runScraper('news', newsScraper, 2 * 60 * 1000);       // 2 min
  runScraper('aircraft', aircraftScraper, 30 * 1000);       // 30 sec
  runScraper('ships', shipsScraper, 60 * 1000);              // 60 sec
  runScraper('events', gdeltScraper, 15 * 60 * 1000);     // 15 min
  runScraper('conflicts', conflictsScraper, 2 * 60 * 1000); // 2 min
  runScraper('strikes', strikesScraper, 10 * 60 * 1000);    // 10 min

  // Twitter/X feed - merge into news
  async function runTwitter() {
    try {
      const tweets = await twitterScraper();
      if (tweets && tweets.length > 0) {
        // Merge with existing news, tweets first
        const combined = [...tweets, ...latestData.news];
        // Deduplicate by id
        const seen = new Set();
        const deduped = combined.filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
        // Sort newest first
        deduped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        latestData.news = deduped.slice(0, 80);
        broadcast('news', latestData.news);
        console.log(`[twitter] Merged ${tweets.length} tweets into news feed`);
      }
    } catch (e) {
      console.error('[twitter] Error:', e.message);
    }
  }
  // Delay first twitter run to let news load first
  setTimeout(runTwitter, 15000);
  setInterval(runTwitter, 2 * 60 * 1000); // 2 min
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard running at http://localhost:${PORT} [v2 - no fake data]`);
  startScrapers();
});
