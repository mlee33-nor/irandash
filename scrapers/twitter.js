const fetch = require('node-fetch');

const ACCOUNTS = [
  'BRICSinfo',
  'sentaborsen',
  'IntelDoge',
  'IsraelRadar_com',
];

module.exports = async function scrapeTwitter() {
  const tweets = [];

  for (const account of ACCOUNTS) {
    try {
      const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${account}`;
      const response = await fetch(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      if (!response.ok) {
        console.log(`[twitter] ${account}: ${response.status}`);
        continue;
      }

      const html = await response.text();

      // Extract tweets from embedded JSON in the HTML
      const fullTexts = html.match(/"full_text":"((?:[^"\\]|\\.)*)"/g);
      const createdAts = html.match(/"created_at":"((?:[^"\\]|\\.)*)"/g);
      const idStrs = html.match(/"id_str":"(\d+)"/g);

      if (!fullTexts) continue;

      for (let i = 0; i < Math.min(fullTexts.length, 20); i++) {
        const textMatch = fullTexts[i].match(/"full_text":"((?:[^"\\]|\\.)*)"/);
        if (!textMatch) continue;

        let text = textMatch[1]
          .replace(/\\n/g, ' ')
          .replace(/\\u[\dA-Fa-f]{4}/g, m => String.fromCharCode(parseInt(m.slice(2), 16)))
          .replace(/\\"/g, '"')
          .replace(/\s+/g, ' ')
          .trim();

        // Skip retweet duplicates and very short tweets
        if (text.length < 20) continue;

        let timestamp = new Date().toISOString();
        if (createdAts && createdAts[i]) {
          const dateMatch = createdAts[i].match(/"created_at":"((?:[^"\\]|\\.)*)"/);
          if (dateMatch) {
            const parsed = new Date(dateMatch[1]);
            if (!isNaN(parsed.getTime())) {
              timestamp = parsed.toISOString();
              // Only last 48 hours (wider window for active conflict)
              if (Date.now() - parsed.getTime() > 48 * 60 * 60 * 1000) continue;
            }
          }
        }

        let tweetId = '';
        if (idStrs && idStrs[i]) {
          const idMatch = idStrs[i].match(/"id_str":"(\d+)"/);
          if (idMatch) tweetId = idMatch[1];
        }

        // Determine severity from content
        const lower = text.toLowerCase();
        let severity = 'low';
        if (/breaking|killed|dead\b|death|died|attack|strike|bomb|war|invasion|nuclear|assassinat|supreme leader|khamenei|casualt|airstrike|explosion/i.test(lower)) severity = 'critical';
        else if (/military|missile|drone|sanction|threat|weapon|urgent|retaliat|offensive|mobiliz|intercept/i.test(lower)) severity = 'high';
        else if (/tension|deploy|warning|protest|clash|just in|confirm|report|update/i.test(lower)) severity = 'medium';

        tweets.push({
          id: `x-${account}-${tweetId || i}`,
          title: text.slice(0, 200),
          summary: text.length > 200 ? text.slice(200, 400) : '',
          source: `X/@${account}`,
          url: tweetId ? `https://x.com/${account}/status/${tweetId}` : `https://x.com/${account}`,
          timestamp,
          severity,
          location: null
        });
      }

      console.log(`[twitter] @${account}: ${tweets.length} tweets`);
    } catch (e) {
      console.error(`[twitter] @${account} error:`, e.message);
    }
  }

  return tweets;
};
