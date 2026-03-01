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

// Iranian targets for news-based strike detection
const IRAN_STRIKE_LOCATIONS = {
  'tehran': { lat: 35.69, lng: 51.39 },
  'isfahan': { lat: 32.65, lng: 51.68 },
  'natanz': { lat: 33.51, lng: 51.73 },
  'fordow': { lat: 34.88, lng: 51.59 },
  'bushehr': { lat: 28.97, lng: 50.84 },
  'shiraz': { lat: 29.59, lng: 52.58 },
  'tabriz': { lat: 38.08, lng: 46.29 },
  'parchin': { lat: 35.52, lng: 51.77 },
  'bandar abbas': { lat: 27.19, lng: 56.28 },
  'arak': { lat: 34.09, lng: 49.69 },
  'qom': { lat: 34.64, lng: 50.88 },
  'mashhad': { lat: 36.30, lng: 59.60 },
  'ahvaz': { lat: 31.32, lng: 48.67 },
  'kermanshah': { lat: 34.31, lng: 47.06 },
  'dezful': { lat: 32.43, lng: 48.38 },
  'hamadan': { lat: 34.80, lng: 48.51 },
  'karaj': { lat: 35.84, lng: 50.97 },
  'semnan': { lat: 35.57, lng: 53.40 },
  'khuzestan': { lat: 31.32, lng: 48.67 },
  'abadan': { lat: 30.34, lng: 48.30 },
  'kerman': { lat: 30.28, lng: 57.08 },
  'urmia': { lat: 37.55, lng: 45.08 },
  'yazd': { lat: 31.90, lng: 54.37 },
  'shahroud': { lat: 36.42, lng: 55.02 },
  'jask': { lat: 25.64, lng: 57.77 },
  'chahbahar': { lat: 25.30, lng: 60.63 },
  'khorramabad': { lat: 33.49, lng: 48.35 },
  'sari': { lat: 36.56, lng: 53.06 },
  'gorgan': { lat: 36.84, lng: 54.44 },
  'ardabil': { lat: 38.25, lng: 48.30 },
  'zanjan': { lat: 36.67, lng: 48.50 },
};

// Detect strikes mentioned in news/tweets and add them to strikes data
function extractStrikesFromNews(articles) {
  const found = [];
  const strikeWords = /strike|struck|hit|bomb|attack|airstrike|missile|explosion|blast|destroyed|damage|target|offensive|raid|shell|cruise|killed|casualties/i;
  const iranRef = /iran|iranian/i;

  for (const article of articles) {
    const text = `${article.title || ''} ${article.summary || ''}`;
    if (!strikeWords.test(text)) continue;
    if (!iranRef.test(text)) continue;

    const lower = text.toLowerCase();
    for (const [place, coords] of Object.entries(IRAN_STRIKE_LOCATIONS)) {
      if (lower.includes(place)) {
        found.push({
          id: `news-strike-${article.id}-${place}`,
          name: place.charAt(0).toUpperCase() + place.slice(1),
          lat: coords.lat + (Math.random() - 0.5) * 0.02,
          lng: coords.lng + (Math.random() - 0.5) * 0.02,
          date: article.timestamp ? article.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
          desc: (article.title || '').slice(0, 300),
          source: article.url || article.source || 'News',
          title: (article.title || '').slice(0, 200),
          fatalities: 0
        });
      }
    }
  }
  return found;
}

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

// Merge news-detected strikes into the strikes pool
function mergeNewsStrikes(articles) {
  const newsStrikes = extractStrikesFromNews(articles);
  if (newsStrikes.length > 0) {
    // Merge with existing strikes, dedup by proximity
    const combined = [...latestData.strikes, ...newsStrikes];
    const seen = new Set();
    const deduped = combined.filter(s => {
      const key = `${Math.round(s.lat * 5)}:${Math.round(s.lng * 5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    latestData.strikes = deduped;
    broadcast('strikes', deduped);
    console.log(`[news-strikes] ${newsStrikes.length} new strikes from news (${deduped.length} total)`);
  }
}

// Start all scrapers
function startScrapers() {
  // News scraper - also extract strikes from articles
  async function runNews() {
    try {
      const data = await newsScraper();
      if (data && data.length > 0) {
        // Sort newest first before storing
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        latestData.news = data;
        broadcast('news', data);
        console.log(`[news] ${data.length} items`);
        // Extract strikes mentioned in news
        mergeNewsStrikes(data);
      }
    } catch (err) {
      console.error('[news] Error:', err.message);
    }
  }
  runNews();
  setInterval(runNews, 2 * 60 * 1000); // 2 min

  runScraper('aircraft', aircraftScraper, 30 * 1000);       // 30 sec
  runScraper('ships', shipsScraper, 60 * 1000);              // 60 sec
  runScraper('events', gdeltScraper, 15 * 60 * 1000);     // 15 min
  runScraper('conflicts', conflictsScraper, 2 * 60 * 1000); // 2 min
  runScraper('strikes', strikesScraper, 10 * 60 * 1000);    // 10 min

  // Twitter/X feed - merge into news, also detect strikes
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
        // Extract strikes from tweets too
        mergeNewsStrikes(tweets);
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
