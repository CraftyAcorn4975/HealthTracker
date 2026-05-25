// ─── GOOGLE DRIVE ───
// Fetches the HealthExportCSV zip from Drive, unzips it in-browser, returns CSV text map

async function syncFromDrive() {
  const fileId = CONFIG.driveFileId;
  const apiKey = CONFIG.googleApiKey;
  if (!fileId || !apiKey) {
    setStatus('err', 'No Drive credentials — go to Settings');
    document.getElementById('sdot').classList.add('off');
    return false;
  }

  setStatus('live', 'Fetching from Google Drive…');
  setSyncing(true);

  try {
    // Download the file as binary
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Drive API ${res.status}: ${res.statusText}`);

    const buffer = await res.arrayBuffer();
    const csvMap = await unzipHealthExport(buffer);
    if (!csvMap || Object.keys(csvMap).length === 0) throw new Error('No CSV files found in zip');

    parseAndRender(csvMap);
    const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    setStatus('ok', `Synced from Drive · ${now}`);
    document.getElementById('sdot').classList.remove('off');
    setSyncing(false);
    return true;

  } catch (err) {
    console.error('Drive sync error:', err);
    setStatus('err', `Sync failed: ${err.message}`);
    document.getElementById('sdot').classList.add('off');
    setSyncing(false);
    return false;
  }
}

// Unzip using DecompressionStream (native browser API, no libs needed)
async function unzipHealthExport(buffer) {
  // Parse ZIP central directory to find file entries
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const csvMap = {};

  let offset = 0;
  while (offset < bytes.length - 4) {
    // Local file header signature: 0x04034b50
    if (view.getUint32(offset, true) !== 0x04034b50) { offset++; continue; }

    const compression  = view.getUint16(offset + 8,  true);
    const compSize     = view.getUint32(offset + 18, true);
    const uncompSize   = view.getUint32(offset + 22, true);
    const fnLen        = view.getUint16(offset + 26, true);
    const extraLen     = view.getUint16(offset + 28, true);
    const filename     = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + fnLen));
    const dataStart    = offset + 30 + fnLen + extraLen;
    const compData     = bytes.slice(dataStart, dataStart + compSize);

    if (filename.endsWith('.csv') && compSize > 0) {
      try {
        let text;
        if (compression === 8) {
          // DEFLATE
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          const reader = ds.readable.getReader();
          writer.write(compData);
          writer.close();
          const chunks = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          const total = chunks.reduce((a,b) => a + b.length, 0);
          const out = new Uint8Array(total);
          let pos = 0;
          for (const c of chunks) { out.set(c, pos); pos += c.length; }
          text = new TextDecoder().decode(out);
        } else {
          text = new TextDecoder().decode(compData);
        }
        // Key by the HK identifier name
        const key = filename.split('/').pop().replace(/_\d{4}-.*$/, '');
        csvMap[key] = text;
      } catch (e) {
        console.warn('Failed to decompress', filename, e);
      }
    }
    offset = dataStart + compSize;
  }
  return csvMap;
}

function setSyncing(on) {
  const btn = document.getElementById('syncBtn');
  const lbl = document.getElementById('slbl');
  if (on) { btn.classList.add('syncing'); lbl.textContent = 'Syncing…'; }
  else    { btn.classList.remove('syncing'); lbl.textContent = 'Sync Drive'; }
}

function setStatus(type, msg) {
  const tag = document.getElementById('statusTxt');
  const stag = document.querySelector('.stag');
  if (tag)  tag.textContent = msg;
  if (stag) { stag.className = 'stag'; if (type !== 'live') stag.classList.add(type); stag.textContent = type === 'ok' ? 'LIVE' : type === 'err' ? 'ERROR' : 'SYNC'; }
}

async function triggerSync() {
  await syncFromDrive();
}
