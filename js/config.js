// ─── CONFIG ───
// All keys stored in localStorage so they persist across sessions

const CONFIG = {
  get driveFileId()  { return localStorage.getItem('j_driveFileId')  || '' },
  get googleApiKey() { return localStorage.getItem('j_googleApiKey') || '' },
  get groqKey()      { return localStorage.getItem('j_groqKey')      || '' },
  get autoSync()     { return localStorage.getItem('j_autoSync') !== 'false' },
  get sex()          { return localStorage.getItem('j_sex')      || 'male' },
  get age()          { return localStorage.getItem('j_age')      || '' },
  get weight()       { return localStorage.getItem('j_weight')   || '' },
  get height()       { return localStorage.getItem('j_height')   || '' },
  get activity()     { return localStorage.getItem('j_activity') || '1.55' },
  get goals()        { return JSON.parse(localStorage.getItem('j_goals') || '[]') },
  set goals(v)       { localStorage.setItem('j_goals', JSON.stringify(v)) },
};

function saveCredentials() {
  const fid = document.getElementById('driveFileId').value.trim();
  const gak = document.getElementById('googleApiKey').value.trim();
  if (fid) localStorage.setItem('j_driveFileId', fid);
  if (gak) localStorage.setItem('j_googleApiKey', gak);
  const el = document.getElementById('driveStatus');
  el.textContent = 'Saved. Testing connection…';
  el.style.color = 'var(--text3)';
  syncFromDrive().then(ok => {
    el.textContent = ok ? '✓ Connected successfully' : '✗ Connection failed — check file ID and API key';
    el.style.color  = ok ? 'var(--green)' : 'var(--coral)';
  });
}

function saveGroqKey() {
  const k = document.getElementById('groqKey').value.trim();
  if (k) {
    localStorage.setItem('j_groqKey', k);
    alert('Groq key saved! AI features are now active.');
  }
}

function saveSetting(key, val) {
  localStorage.setItem('j_' + key, val);
}

function clearAllData() {
  if (confirm('Clear all JARVIS local data? This cannot be undone.')) {
    localStorage.clear();
    location.reload();
  }
}

function loadSettingsUI() {
  const fields = {
    driveFileId:  'j_driveFileId',
    googleApiKey: 'j_googleApiKey',
    groqKey:      'j_groqKey',
  };
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    const val = localStorage.getItem(key);
    if (el && val) el.value = val;
  });
  const as = document.getElementById('autoSync');
  const sx = document.getElementById('bSex');
  if (as) as.checked = CONFIG.autoSync;
  if (sx) sx.value   = CONFIG.sex;
}
