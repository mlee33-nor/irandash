const fetch = require('node-fetch');
const RSSParser = require('rss-parser');
const parser = new RSSParser();

const ACCOUNTS = [
  'BRICSinfo',
  'sentaborsen',
  'IntelDoge',
  'IsraelRadar_com',
];

// Nitter instances to try as fallback (public, no auth needed)
const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.woodland.cafe',
];

module.exports = async function scrapeTwitter() {
  const tweets = [];

  // Method 1: Twitter syndication API
  for (const account of ACCOUNTS) {
    try {
      const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${account}`;
      const response = await fetch(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      if (!response.ok) {
        console.log(`[twitter] syndication @${account}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      parseSyndicationTweets(html, account, tweets);
      console.log(`[twitter] syndication @${account}: ${tweets.length} tweets`);
    } catch (e) {
      console.log(`[twitter] syndication @${account}: ${e.message}`);
    }
  }

  // Method 2: If syndication failed (rate limited), try Nitter RSS
  if (tweets.length === 0) {
    for (const instance of NITTER_INSTANCES) {
      if (tweets.length > 0) break; // got some, stop trying
      for (const account of ACCOUNTS) {
        try {
          const rssUrl = `${instance}/${account}/rss`;
          const feed = await Promise.race([
            parser.parseURL(rssUrl),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
          ]);
          if (feed && feed.items) {
            for (const item of feed.items.slice(0, 15)) {
              if (item.isoDate) {
                const age = Date.now() - new Date(item.isoDate).getTime();
                if (age > 48 * 60 * 60 * 1000) continue;
              }
              const text = (item.title || item.contentSnippet || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
              if (text.length < 20) continue;

              tweets.push({
                id: `x-${account}-${Buffer.from(item.link || text).toString('base64').slice(0, 16)}`,
                title: text.slice(0, 200),
                summary: text.length > 200 ? text.slice(200, 400) : '',
                source: `X/@${account}`,
                url: item.link ? item.link.replace(instance, 'https://x.com') : `https://x.com/${account}`,
                timestamp: item.isoDate || new Date().toISOString(),
                severity: getSeverity(text),
                location: null
              });
            }
            console.log(`[twitter] nitter @${account}: ${tweets.length} tweets via ${instance}`);
          }
        } catch (e) {
          // nitter instance down, try next
        }
      }
    }
  }

  // Method 3: Google News search for these accounts as last resort
  if (tweets.length === 0) {
    try {
      const handles = ACCOUNTS.map(a => `"@${a}"`).join('+OR+');
      const gUrl = `https://news.google.com/rss/search?q=${handles}+iran+OR+israel+OR+strike&hl=en-US&gl=US&ceid=US:en`;
      const feed = await Promise.race([
        parser.parseURL(gUrl),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
      ]);
      if (feed && feed.items) {
        for (const item of feed.items.slice(0, 10)) {
          if (item.isoDate) {
            const age = Date.now() - new Date(item.isoDate).getTime();
            if (age > 48 * 60 * 60 * 1000) continue;
          }
          const text = (item.title || '').trim();
          if (text.length < 20) continue;
          tweets.push({
            id: `x-google-${Buffer.from(item.link || text).toString('base64').slice(0, 16)}`,
            title: text.slice(0, 200),
            summary: (item.contentSnippet || '').slice(0, 200),
            source: 'X/OSINT',
            url: item.link || '',
            timestamp: item.isoDate || new Date().toISOString(),
            severity: getSeverity(text),
            location: null
          });
        }
        if (tweets.length > 0) console.log(`[twitter] google fallback: ${tweets.length} items`);
      }
    } catch (e) {}
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
