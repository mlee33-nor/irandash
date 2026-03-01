const fetch = require('node-fetch');

module.exports = async function scrapeGdelt() {
  // GDELT GEO 2.0 API - events in Iran region
  const query = encodeURIComponent('iran OR "persian gulf" OR "strait of hormuz" OR tehran OR irgc OR israel OR idf OR gaza OR hamas OR hezbollah');
  const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${query}&mode=pointdata&format=geojson&timespan=1d&maxpoints=50`;

  const response = await fetch(url, { timeout: 15000 });
  if (!response.ok) {
    throw new Error(`GDELT returned ${response.status}`);
  }

  const text = await response.text();
  if (!text || text.trim().length === 0) return [];

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // GDELT sometimes returns HTML errors
    return [];
  }

  if (!data.features || data.features.length === 0) return [];

  return data.features.map(f => {
    const props = f.properties || {};
    const coords = f.geometry?.coordinates || [0, 0];

    return {
      id: props.urlpubtimeseq || `gdelt-${Date.now()}-${Math.random()}`,
      name: props.name || 'Unknown Event',
      url: props.url || '',
      source: props.domain || 'GDELT',
      tone: parseFloat(props.tone) || 0,
      lat: coords[1],
      lng: coords[0],
      timestamp: props.dateadded || new Date().toISOString(),
      goldstein: parseFloat(props.goldsteinscale) || 0,
      type: categorizeEvent(props)
    };
  }).filter(e => e.lat !== 0 && e.lng !== 0);
};

function categorizeEvent(props) {
  const name = ((props.name || '') + ' ' + (props.url || '')).toLowerCase();
  if (/attack|strike|bomb|explosion|kill/.test(name)) return 'military';
  if (/protest|demonstrat|unrest/.test(name)) return 'protest';
  if (/diplomacy|negotiate|talk|summit|agreement/.test(name)) return 'diplomatic';
  if (/nuclear|enrich|uranium|iaea/.test(name)) return 'nuclear';
  if (/sanction|embargo|trade/.test(name)) return 'economic';
  return 'general';
}
