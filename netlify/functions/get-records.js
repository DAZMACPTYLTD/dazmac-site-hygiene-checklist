const { getStore } = require('@netlify/blobs');

const ADMIN_PIN = process.env.ADMIN_PIN || '7788';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Simple PIN check via header or query param
  const pin = event.headers['x-admin-pin'] || event.queryStringParameters?.pin || '';
  if (pin !== ADMIN_PIN) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const { site, from, to, issues } = event.queryStringParameters || {};

  try {
    const store = getStore('site-hygiene-records');
    const photoStore = getStore('site-hygiene-photos');
    const { blobs } = await store.list();

    const records = [];
    for (const blob of blobs) {
      const rec = await store.get(blob.key, { type: 'json' });
      if (!rec) continue;

      // Apply filters
      if (site && rec.meta?.site !== site) continue;
      if (from && rec.meta?.weekDate < from) continue;
      if (to && rec.meta?.weekDate > to) continue;

      const hasIssues = Object.values(rec.checks || {}).some(c => c.status === 'issue' || c.status === 'triggered');
      if (issues === 'yes' && !hasIssues) continue;
      if (issues === 'no' && hasIssues) continue;

      // Re-hydrate photos from photo store (base64 data)
      for (const ref of Object.keys(rec.checks || {})) {
        const check = rec.checks[ref];
        if (check.photos && check.photos.length > 0) {
          const hydratedPhotos = [];
          for (const photo of check.photos) {
            if (photo.key) {
              try {
                const photoData = await photoStore.get(photo.key, { type: 'text' });
                hydratedPhotos.push({ name: photo.name, data: photoData });
              } catch {
                hydratedPhotos.push({ name: photo.name, data: null });
              }
            } else {
              hydratedPhotos.push(photo);
            }
          }
          rec.checks[ref].photos = hydratedPhotos;
        }
      }

      records.push(rec);
    }

    // Sort newest first
    records.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    };

  } catch (e) {
    console.error('Get records error:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to retrieve records: ' + e.message }),
    };
  }
};
