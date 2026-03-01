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
const earthquakeScraper = require('./scrapers/earthquakes');
const weatherScraper = require('./scrapers/weather');
const polymarketScraper = require('./scrapers/polymarket');

// All theater strike locations (Iran + Israel + Lebanon + Syria + Iraq + Yemen)
const IRAN_STRIKE_LOCATIONS = {
  // Iran
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
  // Israel - cities
  'tel aviv': { lat: 32.08, lng: 34.78 },
  'jerusalem': { lat: 31.77, lng: 35.23 },
  'haifa': { lat: 32.79, lng: 34.99 },
  'beer sheva': { lat: 31.25, lng: 34.79 },
  'be\'er sheva': { lat: 31.25, lng: 34.79 },
  'beersheba': { lat: 31.25, lng: 34.79 },
  'ashkelon': { lat: 31.67, lng: 34.57 },
  'ashdod': { lat: 31.80, lng: 34.65 },
  'netanya': { lat: 32.33, lng: 34.86 },
  'herzliya': { lat: 32.16, lng: 34.78 },
  'rishon': { lat: 31.97, lng: 34.77 },
  'petah tikva': { lat: 32.09, lng: 34.89 },
  'rehovot': { lat: 31.89, lng: 34.81 },
  'eilat': { lat: 29.56, lng: 34.95 },
  'tiberias': { lat: 32.79, lng: 35.53 },
  'nazareth': { lat: 32.70, lng: 35.30 },
  'sderot': { lat: 31.52, lng: 34.60 },
  'kiryat shmona': { lat: 33.21, lng: 35.57 },
  'nahariya': { lat: 33.01, lng: 35.10 },
  'acre': { lat: 32.93, lng: 35.08 },
  'dimona': { lat: 31.07, lng: 35.03 },
  'modiin': { lat: 31.90, lng: 35.01 },
  // Israel - military/strategic
  'nevatim': { lat: 31.21, lng: 34.93 },
  'ramon airbase': { lat: 30.78, lng: 34.67 },
  'ramat david': { lat: 32.67, lng: 35.18 },
  'hatzerim': { lat: 31.23, lng: 34.66 },
  'palmachim': { lat: 31.90, lng: 34.69 },
  'tel nof': { lat: 31.84, lng: 34.82 },
  'iron dome': { lat: 32.08, lng: 34.78 },
  'arrow battery': { lat: 32.08, lng: 34.78 },
  'david\'s sling': { lat: 32.08, lng: 34.78 },
  'mossad': { lat: 32.15, lng: 34.80 },
  'kirya': { lat: 32.07, lng: 34.79 },
  'negev': { lat: 30.85, lng: 34.78 },
  'golan': { lat: 33.00, lng: 35.75 },
  'golan heights': { lat: 33.00, lng: 35.75 },
  'west bank': { lat: 31.95, lng: 35.25 },
  'gaza': { lat: 31.50, lng: 34.47 },
  // Lebanon
  'beirut': { lat: 33.89, lng: 35.50 },
  'dahiyeh': { lat: 33.85, lng: 35.49 },
  'baalbek': { lat: 34.01, lng: 36.21 },
  'sidon': { lat: 33.56, lng: 35.37 },
  'tyre': { lat: 33.27, lng: 35.20 },
  'tripoli lebanon': { lat: 34.44, lng: 35.83 },
  'nabatieh': { lat: 33.38, lng: 35.48 },
  'bekaa': { lat: 33.85, lng: 35.90 },
  'south lebanon': { lat: 33.30, lng: 35.40 },
  // Syria
  'damascus': { lat: 33.51, lng: 36.29 },
  'aleppo': { lat: 36.20, lng: 37.17 },
  'homs': { lat: 34.73, lng: 36.71 },
  'latakia': { lat: 35.52, lng: 35.79 },
  'deir ez-zor': { lat: 35.34, lng: 40.14 },
  'palmyra': { lat: 34.56, lng: 38.28 },
  't4 airbase': { lat: 34.52, lng: 37.63 },
  // Iraq
  'baghdad': { lat: 33.31, lng: 44.37 },
  'erbil': { lat: 36.19, lng: 44.01 },
  'al asad': { lat: 33.79, lng: 42.44 },
  'ain al-asad': { lat: 33.79, lng: 42.44 },
  'basra': { lat: 30.51, lng: 47.81 },
  // Yemen / Houthi
  'sanaa': { lat: 15.37, lng: 44.19 },
  'hodeidah': { lat: 14.80, lng: 42.95 },
  'aden': { lat: 12.79, lng: 45.02 },
  'marib': { lat: 15.46, lng: 45.33 },
};

// Detect strikes mentioned in news/tweets and add them to strikes data
function extractStrikesFromNews(articles) {
  const found = [];
  const strikeWords = /strike|struck|hit|bomb|attack|airstrike|missile|explosion|blast|destroyed|damage|target|offensive|raid|shell|cruise|killed|casualties|intercept|siren|rocket|barrage|salvo|drone/i;
  const theaterRef = /iran|iranian|israel|israeli|lebanon|lebanese|hezbollah|houthi|syria|syrian|gaza|iraq|iraqi|yemen/i;

  for (const article of articles) {
    const text = `${article.title || ''} ${article.summary || ''}`;
    if (!strikeWords.test(text)) continue;
    if (!theaterRef.test(text)) continue;

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
  strikes: [],
  earthquakes: [],
  weather: { stations: [], downwindVectors: [] },
  polymarket: []
};

// Aircraft trail history buffer - last 20 positions per aircraft
const aircraftTrails = {};
const MAX_TRAIL_POSITIONS = 20;

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
    if (type === 'weather') {
      if (data.stations.length > 0) {
        ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
      }
    } else if (Array.isArray(data) && data.length > 0) {
      ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    }
  }
  // Send aircraft trails
  const trailData = Object.entries(aircraftTrails).map(([id, t]) => ({ id, positions: t.positions, military: t.military }));
  if (trailData.length > 0) {
    ws.send(JSON.stringify({ type: 'aircraftTrails', data: trailData, timestamp: Date.now() }));
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

  // Aircraft scraper - also updates trail history
  async function runAircraft() {
    try {
      const data = await aircraftScraper();
      if (data && data.length > 0) {
        latestData.aircraft = data;
        broadcast('aircraft', data);
        console.log(`[aircraft] ${data.length} items`);

        // Update trail history
        const now = Date.now();
        for (const a of data) {
          if (!a.lat || !a.lng) continue;
          const id = a.icao24;
          if (!aircraftTrails[id]) {
            aircraftTrails[id] = { positions: [], military: !!a.military };
          }
          const trail = aircraftTrails[id];
          trail.military = !!a.military;
          trail.positions.push({ lat: a.lat, lng: a.lng, alt: a.altitude, t: now });
          if (trail.positions.length > MAX_TRAIL_POSITIONS) {
            trail.positions.shift();
          }
          trail.lastSeen = now;
        }
        // Prune stale trails (not seen in 10 min)
        for (const id of Object.keys(aircraftTrails)) {
          if (now - aircraftTrails[id].lastSeen > 10 * 60 * 1000) {
            delete aircraftTrails[id];
          }
        }
        // Broadcast trails
        const trailData = Object.entries(aircraftTrails).map(([id, t]) => ({ id, positions: t.positions, military: t.military }));
        broadcast('aircraftTrails', trailData);
      }
    } catch (err) {
      console.error('[aircraft] Error:', err.message);
    }
  }
  runAircraft();
  setInterval(runAircraft, 30 * 1000);

  runScraper('ships', shipsScraper, 60 * 1000);              // 60 sec
  runScraper('events', gdeltScraper, 15 * 60 * 1000);     // 15 min
  runScraper('conflicts', conflictsScraper, 2 * 60 * 1000); // 2 min
  runScraper('strikes', strikesScraper, 10 * 60 * 1000);    // 10 min

  // Earthquake scraper
  runScraper('earthquakes', earthquakeScraper, 5 * 60 * 1000); // 5 min

  // Weather scraper
  async function runWeather() {
    try {
      const data = await weatherScraper();
      if (data && data.stations && data.stations.length > 0) {
        latestData.weather = data;
        broadcast('weather', data);
        console.log(`[weather] ${data.stations.length} stations, ${data.downwindVectors.length} vectors`);
      }
    } catch (err) {
      console.error('[weather] Error:', err.message);
    }
  }
  runWeather();
  setInterval(runWeather, 15 * 60 * 1000); // 15 min

  // Polymarket prediction markets
  async function runPolymarket() {
    try {
      const data = await polymarketScraper();
      if (data && data.length > 0) {
        latestData.polymarket = data;
        broadcast('polymarket', data);
        console.log(`[polymarket] ${data.length} markets`);
      }
    } catch (e) {
      console.error('[polymarket] Error:', e.message);
    }
  }
  setTimeout(runPolymarket, 20000);
  setInterval(runPolymarket, 5 * 60 * 1000); // 5 min

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
