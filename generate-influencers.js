const axios = require('axios');
const fs    = require('fs');

// ── CONFIG ───────────────────────────────────────────
const API_KEY        = 'AIzaSyAnbVNA-l5M9aFTeILNQmkAu34tH44d_xM';
const ROOT_FOLDER_ID = '1FEiWv5wM1ax-tH6pbaiG1eAGbOO5v5eU';
const LOOKBOOK_NAME  = 'lookbook';   // exact folder name (case-insensitive)
const HEADSHOT_NAME  = 'headshots';   // file must START with this (case-insensitive)
// ─────────────────────────────────────────────────────

const BASE = 'https://www.googleapis.com/drive/v3';

async function listFiles(folderId) {
  const res = await axios.get(`${BASE}/files`, {
    params: {
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      key: API_KEY,
      pageSize: 1000,
    }
  });
  return res.data.files || [];
}

async function run() {
  console.log('🔍 Scanning profilev2 folder...\n');

  // Step 1: list all influencer folders inside profilev2
  const items = await listFiles(ROOT_FOLDER_ID);
  const influencerFolders = items.filter(
    f => f.mimeType === 'application/vnd.google-apps.folder'
  );
  console.log(`Found ${influencerFolders.length} influencer folder(s).\n`);

  const influencers = [];

  for (const influencer of influencerFolders) {
    console.log(`Processing: ${influencer.name}`);

    // Step 2: find the "lookbook" folder inside each influencer folder
    const children = await listFiles(influencer.id);
    const lookbook = children.find(
      f =>
        f.mimeType === 'application/vnd.google-apps.folder' &&
        f.name.toLowerCase() === LOOKBOOK_NAME.toLowerCase()
    );

    if (!lookbook) {
      console.warn(`  ⚠ No "${LOOKBOOK_NAME}" folder found — skipping`);
      continue;
    }

    // Step 3: find headshot.* inside the lookbook folder
    const lookbookFiles = await listFiles(lookbook.id);
    const headshot = lookbookFiles.find(
      f =>
        f.name.toLowerCase().startsWith(HEADSHOT_NAME.toLowerCase()) &&
        f.mimeType.startsWith('image/')
    );

    if (!headshot) {
      console.warn(`  ⚠ No headshot image found in lookbook — skipping`);
      continue;
    }

    const imageUrl = `https://drive.google.com/uc?export=view&id=${headshot.id}`;
    influencers.push({ name: influencer.name, imageUrl });
    console.log(`  ✓ Found headshot: ${headshot.name}`);
  }

  fs.writeFileSync('influencers.json', JSON.stringify(influencers, null, 2));

  console.log(`\n✅ Done! influencers.json written with ${influencers.length} entries.`);
  console.log('   Paste its contents into the CAST.PASS web app to start reviewing.\n');
}

run().catch(err => {
  console.error('\n❌ Error:', err.response?.data?.error?.message || err.message);
  process.exit(1);
});