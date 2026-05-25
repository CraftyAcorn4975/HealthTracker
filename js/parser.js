// ─── PARSER ───
// Parses the HealthExportCSV CSV map and populates the UI

// Map HK identifiers to our keys
const HK_MAP = {
  sleep:    ['SleepAnalysis', 'TimeInBed'],
  steps:    ['StepCount'],
  hrv:      ['HeartRateVariabilitySDNN'],
  rhr:      ['RestingHeartRate'],
  burned:   ['ActiveEnergyBurned', 'BasalEnergyBurned'],
  eaten:    ['DietaryEnergyConsumed', 'DietaryEnergy'],
  protein:  ['DietaryProtein'],
  carbs:    ['DietaryCarbohydrates'],
  fat:      ['DietaryFatTotal'],
  water:    ['DietaryWater'],
  bodyfat:  ['BodyFatPercentage'],
  weight:   ['BodyMass'],
  vo2:      ['VO2Max'],
  height:   ['Height'],
};

let latestData = {};

function parseCSV(text) {
  if (!text) return [];
  // Remove BOM and sep= line
  const clean = text.replace(/^\uFEFF/, '').replace(/^sep=.*\r?\n/, '');
  const lines = clean.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || '');
    return obj;
  }).filter(r => r.value && r.value !== '');
}

function getLatest(csvMap, keys) {
  for (const key of keys) {
    // Find matching CSV by checking if any csvMap key contains the HK identifier
    const mapKey = Object.keys(csvMap).find(k => keys.some(hk => k.includes(hk)));
    if (!mapKey) continue;
    const rows = parseCSV(csvMap[mapKey]);
    if (!rows.length) continue;
    // Sort by endDate desc, take latest
    rows.sort((a, b) => new Date(b.endDate || b.startDate) - new Date(a.endDate || a.startDate));
    const val = parseFloat(rows[0].value);
    if (!isNaN(val)) return { value: val, unit: rows[0].unit || '', rows };
  }
  return null;
}

function getSum(csvMap, keys) {
  // Sum today's values (or last 24h)
  const mapKey = Object.keys(csvMap).find(k => keys.some(hk => k.includes(hk)));
  if (!mapKey) return null;
  const rows = parseCSV(csvMap[mapKey]);
  if (!rows.length) return null;
  // Get today's date
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = rows.filter(r => {
    const d = r.startDate || r.endDate || '';
    return d.startsWith(today);
  });
  const src = todayRows.length > 0 ? todayRows : rows.slice(-50);
  const sum = src.reduce((acc, r) => acc + (parseFloat(r.value) || 0), 0);
  return { value: sum, unit: src[0]?.unit || '', rows: src };
}

function parseAndRender(csvMap) {
  latestData = {};

  // Helper to find map key
  const find = (hkNames) => {
    for (const name of hkNames) {
      const k = Object.keys(csvMap).find(k => k.includes(name));
      if (k) return k;
    }
    return null;
  };

  const setEl = (id, val, fmt) => {
    const el = document.getElementById(id);
    if (el && val != null && !isNaN(val)) el.textContent = fmt ? fmt(val) : Math.round(val);
  };

  // SLEEP
  const sleepKey = find(HK_MAP.sleep);
  if (sleepKey) {
    const rows = parseCSV(csvMap[sleepKey]).filter(r => r.value);
    rows.sort((a,b) => new Date(b.endDate) - new Date(a.endDate));
    if (rows.length) {
      // Sum sleep stages for last night (look back 18 hours)
      const cutoff = Date.now() - 18 * 3600000;
      const lastNight = rows.filter(r => new Date(r.startDate) > cutoff);
      const hrs = lastNight.length
        ? lastNight.reduce((a, r) => a + parseFloat(r.value || 0), 0)
        : parseFloat(rows[0].value);
      latestData.sleep = hrs;
      setEl('vSleep', hrs, v => parseFloat(v).toFixed(1));
    }
  }

  // STEPS (sum today)
  const stepsKey = find(HK_MAP.steps);
  if (stepsKey) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = parseCSV(csvMap[stepsKey]).filter(r => (r.startDate||'').startsWith(today));
    const total = rows.reduce((a, r) => a + parseFloat(r.value||0), 0);
    if (total > 0) {
      latestData.steps = total;
      document.getElementById('vSteps').textContent = total > 999 ? (total/1000).toFixed(1)+'k' : Math.round(total);
    }
  }

  // HRV
  const hrvKey = find(HK_MAP.hrv);
  if (hrvKey) {
    const rows = parseCSV(csvMap[hrvKey]);
    rows.sort((a,b) => new Date(b.endDate) - new Date(a.endDate));
    if (rows.length) { latestData.hrv = parseFloat(rows[0].value); setEl('vHRV', latestData.hrv, Math.round); }
  }

  // RHR
  const rhrKey = find(HK_MAP.rhr);
  if (rhrKey) {
    const rows = parseCSV(csvMap[rhrKey]);
    rows.sort((a,b) => new Date(b.endDate) - new Date(a.endDate));
    if (rows.length) { latestData.rhr = parseFloat(rows[0].value); setEl('vRHR', latestData.rhr, Math.round); }
  }

  // BODY FAT
  const bfKey = find(HK_MAP.bodyfat);
  if (bfKey) {
    const rows = parseCSV(csvMap[bfKey]);
    rows.sort((a,b) => new Date(b.endDate) - new Date(a.endDate));
    if (rows.length) {
      let bf = parseFloat(rows[0].value);
      // HealthKit stores as decimal (0.18) or percentage (18)
      if (bf < 1) bf = bf * 100;
      latestData.bodyFat = bf;
      setEl('vBody', bf, v => parseFloat(v).toFixed(1));
      // Auto-populate body fat field
      const bfEl = document.getElementById('bBF');
      if (bfEl && !bfEl.value) bfEl.value = bf.toFixed(1);
    }
  }

  // VO2 MAX
  const vo2Key = find(HK_MAP.vo2);
  if (vo2Key) {
    const rows = parseCSV(csvMap[vo2Key]);
    rows.sort((a,b) => new Date(b.endDate) - new Date(a.endDate));
    if (rows.length) { latestData.vo2 = parseFloat(rows[0].value); setEl('vVO2', latestData.vo2, v => parseFloat(v).toFixed(1)); }
  }

  // WEIGHT
  const wKey = find(HK_MAP.weight);
  if (wKey) {
    const rows = parseCSV(csvMap[wKey]);
    rows.sort((a,b) => new Date(b.endDate) - new Date(a.endDate));
    if (rows.length) {
      let w = parseFloat(rows[0].value);
      const unit = rows[0].unit || '';
      if (unit.toLowerCase().includes('kg') || w < 100) w = w * 2.20462; // convert to lbs
      latestData.weight = w;
      const wEl = document.getElementById('bWeight');
      if (wEl && !wEl.value) wEl.value = Math.round(w);
    }
  }

  // ACTIVE ENERGY BURNED
  const burnKey = find(HK_MAP.burned);
  if (burnKey) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = parseCSV(csvMap[burnKey]).filter(r => (r.startDate||'').startsWith(today));
    const total = rows.reduce((a, r) => a + parseFloat(r.value||0), 0);
    if (total > 0) {
      latestData.burned = total;
      document.getElementById('vCalBurned') && (document.getElementById('vCalBurned').textContent = Math.round(total).toLocaleString());
      document.getElementById('enBurned').textContent = Math.round(total).toLocaleString();
    }
  }

  // MACROS (sum today)
  const macros = [
    { keys: HK_MAP.eaten,   id: 'enEaten',  storeKey: 'eaten',   max: 3000 },
    { keys: HK_MAP.protein, id: 'mProt',    storeKey: 'protein', max: 200, barId: 'mProtBar' },
    { keys: HK_MAP.carbs,   id: 'mCarb',    storeKey: 'carbs',   max: 400, barId: 'mCarbBar' },
    { keys: HK_MAP.fat,     id: 'mFat',     storeKey: 'fat',     max: 150, barId: 'mFatBar' },
    { keys: HK_MAP.water,   id: 'mWater',   storeKey: 'water',   max: 3000, barId: 'mWaterBar' },
  ];

  macros.forEach(({ keys, id, storeKey, max, barId }) => {
    const mKey = find(keys);
    if (!mKey) return;
    const today = new Date().toISOString().slice(0, 10);
    const rows = parseCSV(csvMap[mKey]).filter(r => (r.startDate||'').startsWith(today));
    const total = rows.reduce((a, r) => a + parseFloat(r.value||0), 0);
    if (total > 0) {
      latestData[storeKey] = total;
      const el = document.getElementById(id);
      if (el) el.textContent = Math.round(total).toLocaleString();
      if (barId) {
        const bar = document.getElementById(barId);
        if (bar) bar.style.width = Math.min(100, (total/max)*100) + '%';
      }
    }
  });

  calcTDEE();
  updateBalance();
}

function buildHealthContext() {
  const d = latestData;
  return {
    sleep:        d.sleep        ? d.sleep.toFixed(1) + ' hrs'       : 'unknown',
    steps:        d.steps        ? Math.round(d.steps).toLocaleString() : 'unknown',
    hrv:          d.hrv          ? Math.round(d.hrv) + ' ms'         : 'unknown',
    restingHR:    d.rhr          ? Math.round(d.rhr) + ' bpm'        : 'unknown',
    bodyFat:      d.bodyFat      ? d.bodyFat.toFixed(1) + '%'        : 'unknown',
    vo2Max:       d.vo2          ? d.vo2.toFixed(1) + ' ml/kg/min'   : 'unknown',
    caloriesEaten: d.eaten       ? Math.round(d.eaten) + ' kcal'     : 'unknown',
    caloriesBurned: d.burned     ? Math.round(d.burned) + ' kcal'    : 'unknown',
    protein:      d.protein      ? Math.round(d.protein) + 'g'       : 'unknown',
    carbs:        d.carbs        ? Math.round(d.carbs) + 'g'         : 'unknown',
    fat:          d.fat          ? Math.round(d.fat) + 'g'           : 'unknown',
    water:        d.water        ? Math.round(d.water) + ' ml'       : 'unknown',
    weight:       d.weight       ? Math.round(d.weight) + ' lbs'     : localStorage.getItem('j_weight') ? localStorage.getItem('j_weight') + ' lbs' : 'unknown',
    tdee:         document.getElementById('tdeeVal')?.textContent    || 'unknown',
    netBalance:   document.getElementById('enNet')?.textContent      || 'unknown',
  };
}
