// News feed panel module

const NewsModule = (function () {
  const feedEl = document.getElementById('news-feed');
  const tweetFeedEl = document.getElementById('tweet-feed');
  const countEl = document.getElementById('news-count');
  let currentItems = [];

  function update(articles) {
    countEl.textContent = articles.length;

    // Track existing IDs
    const existingIds = new Set(currentItems.map(a => a.id));
    const newArticles = articles.filter(a => !existingIds.has(a.id));

    // Prepend new items with animation
    newArticles.forEach(article => {
      const el = createNewsElement(article);
      if (feedEl.firstChild) {
        feedEl.insertBefore(el, feedEl.firstChild);
      } else {
        feedEl.appendChild(el);
      }
    });

    // Update existing items (in case of changes)
    if (currentItems.length === 0) {
      // First load - render all
      feedEl.innerHTML = '';
      articles.forEach(article => {
        feedEl.appendChild(createNewsElement(article));
      });
    }

    // Trim old items if too many
    while (feedEl.children.length > 80) {
      feedEl.removeChild(feedEl.lastChild);
    }

    currentItems = articles;

    // Update tweets-only feed
    if (tweetFeedEl) {
      const tweets = articles.filter(a => a.source && a.source.startsWith('X/'));
      tweetFeedEl.innerHTML = '';
      if (tweets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'news-item severity-low';
        empty.innerHTML = '<div class="news-source">[X/TWITTER]</div><div class="news-title" style="color:var(--text-muted)">Waiting for tweets...</div>';
        tweetFeedEl.appendChild(empty);
      } else {
        tweets.forEach(t => {
          tweetFeedEl.appendChild(createNewsElement(t));
        });
      }
    }
  }

  function createNewsElement(article) {
    const el = document.createElement('div');
    el.className = `news-item severity-${article.severity || 'low'}`;
    el.dataset.id = article.id;

    const isTwitter = article.source && article.source.startsWith('X/');
    const sourceIcon = isTwitter ? '&#120143; ' : '';

    el.innerHTML = `
      <div class="news-source">${sourceIcon}[${escapeHtml(article.source)}] ${article.severity ? article.severity.toUpperCase() : ''}</div>
      <div class="news-title">${escapeHtml(article.title)}</div>
      <div class="news-meta">
        <span>${timeAgo(article.timestamp)}</span>
        <span>${article.location ? '&#128205; ' + escapeHtml(article.location.name) : ''}</span>
      </div>
      <div class="news-summary">${escapeHtml(article.summary)}</div>
    `;

    // Click to zoom map to location
    if (article.location) {
      el.addEventListener('click', () => {
        MapModule.panTo(article.location.lat, article.location.lng, 8);
      });
    }

    // Double-click to open article
    if (article.url) {
      el.addEventListener('dblclick', () => {
        window.open(article.url, '_blank');
      });
    }

    return el;
  }

  return { update };
})();
