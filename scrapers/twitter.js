const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const RSSParser = require('rss-parser');
const parser = new RSSParser();

// HTTP proxy to avoid rate limiting
const PROXY_URL = 'http://lumi-kpi5c55rgblc:92ceY8s10xm5Ivib@190.123.43.235:6011';
const proxyAgent = new HttpsProxyAgent(PROXY_URL);

const ACCOUNTS = [
  'BRICSinfo',
  'sentaborsen',
  'IntelDoge',
  'IsraelRadar_com',
  'ELINTNews',
  'OSINTdefender',
  'Faytuks',
  'MiddleEastEye',
  'TheInsiderPaper',
  'BNONews',
  'Conflicts',
  'Liveuamap',
];

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
];

// Cache tweets so we always have something to show
let cachedTweets = [];
let lastSuccess = 0;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = async function scrapeTwitter() {
  const tweets = [];
  let rateLimited = false;

  // Try each account with staggered requests
  for (let a = 0; a < ACCOUNTS.length; a++) {
    const account = ACCOUNTS[a];
    if (rateLimited) break; // stop hammering if rate limited

    // Small delay between accounts (shorter with proxy)
    if (a > 0) await delay(500);

    let success = false;
    // Try up to 2 different UAs per account
    for (let attempt = 0; attempt < 2 && !success; attempt++) {
      const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      try {
        const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${account}`;
        const response = await fetch(url, {
          agent: proxyAgent,
          timeout: 10000,
          headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          }
        });

        if (response.status === 429) {
          console.log(`[twitter] @${account}: rate limited (429)`);
          rateLimited = true;
          break;
        }

        if (!response.ok) {
          console.log(`[twitter] @${account}: ${response.status}`);
          continue;
        }

        const html = await response.text();
        const before = tweets.length;
        parseSyndicationTweets(html, account, tweets);
        const found = tweets.length - before;
        if (found > 0) {
          console.log(`[twitter] @${account}: ${found} tweets`);
          success = true;
        }
      } catch (e) {
        console.log(`[twitter] @${account}: ${e.message}`);
      }
    }
  }

  // If syndication got some tweets, update cache
  if (tweets.length > 0) {
    cachedTweets = tweets;
    lastSuccess = Date.now();
    console.log(`[twitter] total: ${tweets.length} tweets (cached)`);
    return tweets;
  }

  // Fallback: Google News RSS search for OSINT accounts
  console.log('[twitter] syndication failed, trying Google News fallback');
  try {
    const queries = [
      'https://news.google.com/rss/search?q=%22BRICSinfo%22+OR+%22IntelDoge%22+OR+%22IsraelRadar%22+iran+OR+israel&hl=en-US&gl=US&ceid=US:en',
      'https://news.google.com/rss/search?q=iran+strike+OR+attack+OR+bomb+breaking&hl=en-US&gl=US&ceid=US:en',
    ];
    for (const gUrl of queries) {
      try {
        const feed = await Promise.race([
          parser.parseURL(gUrl),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ]);
        if (feed && feed.items) {
          for (const item of feed.items.slice(0, 15)) {
            if (item.isoDate) {
              const age = Date.now() - new Date(item.isoDate).getTime();
              if (age > 48 * 60 * 60 * 1000) continue;
            }
            const text = (item.title || '').trim();
            if (text.length < 20) continue;
            tweets.push({
              id: `x-osint-${Buffer.from(item.link || text).toString('base64').slice(0, 16)}`,
              title: text.slice(0, 200),
              summary: (item.contentSnippet || '').slice(0, 200),
              source: 'X/OSINT',
              url: item.link || '',
              timestamp: item.isoDate || new Date().toISOString(),
              severity: getSeverity(text),
              location: null
            });
          }
        }
      } catch (e) {}
    }
    if (tweets.length > 0) {
      console.log(`[twitter] google fallback: ${tweets.length} items`);
      cachedTweets = tweets;
      lastSuccess = Date.now();
      return tweets;
    }
  } catch (e) {}

  // Last resort: return cached tweets if less than 30 min old
  if (cachedTweets.length > 0 && Date.now() - lastSuccess < 30 * 60 * 1000) {
    console.log(`[twitter] returning ${cachedTweets.length} cached tweets`);
    return cachedTweets;
  }

  return tweets;
};

function parseSyndicationTweets(html, account, tweets) {
  const fullTexts = html.match(/"full_text":"((?:[^"\\]|\\.)*)"/g);
  const createdAts = html.match(/"created_at":"((?:[^"\\]|\\.)*)"/g);
  const idStrs = html.match(/"id_str":"(\d+)"/g);

  if (!fullTexts) return;

  for (let i = 0; i < Math.min(fullTexts.length, 20); i++) {
    const textMatch = fullTexts[i].match(/"full_text":"((?:[^"\\]|\\.)*)"/);
    if (!textMatch) continue;

    let text = textMatch[1]
      .replace(/\\n/g, ' ')
      .replace(/\\u[\dA-Fa-f]{4}/g, m => String.fromCharCode(parseInt(m.slice(2), 16)))
      .replace(/\\"/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length < 20) continue;

    let timestamp = new Date().toISOString();
    if (createdAts && createdAts[i]) {
      const dateMatch = createdAts[i].match(/"created_at":"((?:[^"\\]|\\.)*)"/);
      if (dateMatch) {
        const parsed = new Date(dateMatch[1]);
        if (!isNaN(parsed.getTime())) {
          timestamp = parsed.toISOString();
          if (Date.now() - parsed.getTime() > 48 * 60 * 60 * 1000) continue;
        }
      }
    }

    let tweetId = '';
    if (idStrs && idStrs[i]) {
      const idMatch = idStrs[i].match(/"id_str":"(\d+)"/);
      if (idMatch) tweetId = idMatch[1];
    }

    tweets.push({
      id: `x-${account}-${tweetId || i}`,
      title: text.slice(0, 200),
      summary: text.length > 200 ? text.slice(200, 400) : '',
      source: `X/@${account}`,
      url: tweetId ? `https://x.com/${account}/status/${tweetId}` : `https://x.com/${account}`,
      timestamp,
      severity: getSeverity(text),
      location: null
    });
  }
}

function getSeverity(text) {
  const lower = text.toLowerCase();
  if (/breaking|killed|dead\b|death|died|attack|strike|bomb|war|invasion|nuclear|assassinat|supreme leader|khamenei|casualt|airstrike|explosion/i.test(lower)) return 'critical';
  if (/military|missile|drone|sanction|threat|weapon|urgent|retaliat|offensive|mobiliz|intercept/i.test(lower)) return 'high';
  if (/tension|deploy|warning|protest|clash|just in|confirm|report|update/i.test(lower)) return 'medium';
  return 'low';
}
