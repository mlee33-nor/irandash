const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Proxy for non-US access
const PROXY_URL = 'http://lumi-kpi5c55rgblc:92ceY8s10xm5Ivib@190.123.43.235:6011';
const agent = new HttpsProxyAgent(PROXY_URL);

// Known Iran/war-related event slugs (discovered from Polymarket)
const KNOWN_SLUGS = [
  'khamenei-out-as-supreme-leader-of-iran-by-february-28',
  'khamenei-out-as-supreme-leader-of-iran-by-march-31',
  'will-the-us-officially-declare-war-on-iran-by',
  'will-trump-declare-war-on-iran-by',
  'trump-invokes-war-powers-against-iran-by',
  'will-the-us-invade-iran-by-march-31',
  'will-the-us-invade-iran-before-2027',
  'will-the-iranian-regime-fall-by-march-31',
  'will-the-iranian-regime-fall-by-the-end-of-2026',
  'will-the-iranian-regime-fall-by-june-30',
  'will-the-iranian-regime-survive-us-military-strikes-741',
  'iran-strike-on-us-military-by-february-28',
  'usisrael-strikes-iran-on',
  'will-us-or-israel-strike-iran-first',
  'trump-announces-end-of-military-operations-against-iran-by',
  'iran-nuclear-test-before-2027',
  'will-iran-close-its-airspace-by-february-28',
  'how-many-different-countries-will-iran-strike-in-march',
  'what-will-the-usisrael-target-in-iran-by-march-31',
];

const SEARCH_TAGS = ['Politics', 'World'];

let cachedMarkets = [];
let lastSuccess = 0;

module.exports = async function scrapePolymarket() {
  const markets = [];
  const seenIds = new Set();

  try {
    // Strategy 1: Fetch known event slugs directly
    for (const slug of KNOWN_SLUGS) {
      try {
        const url = `https://gamma-api.polymarket.com/events?slug=${slug}`;
        const response = await fetch(url, {
          timeout: 10000,
          agent,
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) continue;
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) continue;

        for (const event of events) {
          if (!event.markets || !Array.isArray(event.markets)) continue;
          // Skip fully closed events
          if (event.closed && !event.active) continue;

          for (const market of event.markets) {
            if (seenIds.has(market.id)) continue;
            if (market.closed) continue;
            seenIds.add(market.id);

            const outcomes = parseOutcomes(market);
            if (outcomes.length === 0) continue;

            markets.push({
              id: `poly-${market.id}`,
              title: market.question || event.title,
              slug: event.slug,
              outcomes,
              volume: parseFloat(market.volume || 0),
              liquidity: parseFloat(market.liquidity || 0),
              endDate: market.endDate || event.endDate,
              active: market.active !== false,
              url: `https://polymarket.com/event/${event.slug}`,
              source: 'Polymarket',
              lastUpdated: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        // silently continue to next slug
      }
    }

    // Strategy 2: Fetch high-volume active events and filter for relevance
    for (const tag of SEARCH_TAGS) {
      try {
        const url = `https://gamma-api.polymarket.com/events?limit=100&active=true&closed=false&order=volume24hr&ascending=false&tag=${encodeURIComponent(tag)}`;
        const response = await fetch(url, {
          timeout: 10000,
          agent,
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) continue;
        const events = await response.json();
        if (!Array.isArray(events)) continue;

        for (const event of events) {
          if (!isRelevant(event.title + ' ' + (event.description || '') + ' ' + (event.slug || ''))) continue;
          if (!event.markets || !Array.isArray(event.markets)) continue;

          for (const market of event.markets) {
            if (seenIds.has(market.id)) continue;
            if (market.closed) continue;
            seenIds.add(market.id);

            const outcomes = parseOutcomes(market);
            if (outcomes.length === 0) continue;

            markets.push({
              id: `poly-${market.id}`,
              title: market.question || event.title,
              slug: event.slug,
              outcomes,
              volume: parseFloat(market.volume || 0),
              liquidity: parseFloat(market.liquidity || 0),
              endDate: market.endDate || event.endDate,
              active: market.active !== false,
              url: `https://polymarket.com/event/${event.slug}`,
              source: 'Polymarket',
              lastUpdated: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.log(`[polymarket] tag ${tag} error: ${e.message}`);
      }
    }

    // Sort by volume descending
    markets.sort((a, b) => b.volume - a.volume);

    if (markets.length > 0) {
      cachedMarkets = markets;
      lastSuccess = Date.now();
      console.log(`[polymarket] found ${markets.length} relevant markets`);
      return markets;
    }
  } catch (e) {
    console.log(`[polymarket] error: ${e.message}`);
  }

  // Return cache if fresh enough (30 min)
  if (cachedMarkets.length > 0 && Date.now() - lastSuccess < 30 * 60 * 1000) {
    console.log(`[polymarket] returning ${cachedMarkets.length} cached markets`);
    return cachedMarkets;
  }

  return markets;
};

function isRelevant(text) {
  if (!text) return false;
  return /iran|khamenei|israel|gaza|hezbollah|houthi|netanyahu|nuclear|irgc|tehran|middle.east|ceasefire|strait.of.hormuz|yemen|syria|iraqi?|palestinian|hamas|mossad|idf|centcom|persian.gulf|war.powers|invade|regime.fall|military.strike|airspace/i.test(text);
}

function parseOutcomes(market) {
  const outcomes = [];
  try {
    const names = JSON.parse(market.outcomes || '[]');
    const prices = JSON.parse(market.outcomePrices || '[]');
    for (let i = 0; i < names.length; i++) {
      outcomes.push({
        name: names[i],
        price: parseFloat(prices[i] || 0),
        pct: (parseFloat(prices[i] || 0) * 100).toFixed(1) + '%'
      });
    }
  } catch (e) {}
  return outcomes;
}
