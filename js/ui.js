// ─── UI ───

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'goals') renderGoals();
}

function calcTDEE() {
  const age  = parseFloat(document.getElementById('bAge')?.value);
  const wlbs = parseFloat(document.getElementById('bWeight')?.value);
  const hcm  = parseFloat(document.getElementById('bHeight')?.value);
  const act  = parseFloat(document.getElementById('bAct')?.value || CONFIG.activity);
  const sex  = document.getElementById('bSex')?.value || CONFIG.sex;

  if (!age || !wlbs || !hcm) return;

  // Save
  localStorage.setItem('j_age', age);
  localStorage.setItem('j_weight', wlbs);
  localStorage.setItem('j_height', hcm);
  localStorage.setItem('j_activity', act);

  const wkg = wlbs * 0.453592;
  // Mifflin-St Jeor
  const bmr = sex === 'female'
    ? (10 * wkg) + (6.25 * hcm) - (5 * age) - 161
    : (10 * wkg) + (6.25 * hcm) - (5 * age) + 5;

  const tdee = Math.round(bmr * act);
  document.getElementById('tdeeVal').textContent = tdee.toLocaleString() + ' kcal/day';
  document.getElementById('tdeeBarLbl').textContent = 'TDEE ' + tdee.toLocaleString();
  updateBalance(tdee);
}

function updateBalance(tdee) {
  const eatEl = document.getElementById('enEaten');
  const burnEl = document.getElementById('enBurned');
  if (!eatEl || !burnEl) return;

  const eaten  = parseInt((eatEl.textContent  || '0').replace(/[^0-9]/g, '')) || 0;
  const burned = parseInt((burnEl.textContent || '0').replace(/[^0-9]/g, '')) || 0;

  if (!eaten && !burned) return;

  const net = eaten - burned;
  const netEl = document.getElementById('enNet');
  if (netEl) netEl.textContent = (net > 0 ? '+' : '') + net.toLocaleString();

  const badge = document.getElementById('balBadge');
  if (badge) {
    if (eaten === 0 && burned === 0) {
      badge.textContent = '—'; badge.className = 'energy-badge';
    } else if (net > 0) {
      badge.textContent = '+' + net.toLocaleString() + ' surplus'; badge.className = 'energy-badge surplus';
    } else {
      badge.textContent = Math.abs(net).toLocaleString() + ' deficit'; badge.className = 'energy-badge deficit';
    }
  }

  if (!tdee) {
    const tv = document.getElementById('tdeeVal')?.textContent;
    tdee = parseInt((tv || '').replace(/[^0-9]/g, '')) || 0;
  }
  if (tdee > 0 && eaten > 0) {
    const pct = Math.min(120, Math.round((eaten / tdee) * 100));
    const bar = document.getElementById('enBar');
    if (bar) {
      bar.style.width = pct + '%';
      bar.style.background = pct > 110 ? 'var(--coral)' : pct < 80 ? 'var(--teal)' : 'var(--accent)';
    }
  }
}

// Restore body stats fields from localStorage
function restoreBodyStats() {
  const age = localStorage.getItem('j_age');
  const w   = localStorage.getItem('j_weight');
  const h   = localStorage.getItem('j_height');
  const act = localStorage.getItem('j_activity');
  if (age && document.getElementById('bAge'))    document.getElementById('bAge').value    = age;
  if (w   && document.getElementById('bWeight')) document.getElementById('bWeight').value = w;
  if (h   && document.getElementById('bHeight')) document.getElementById('bHeight').value = h;
  if (act && document.getElementById('bAct'))    document.getElementById('bAct').value    = act;
}
