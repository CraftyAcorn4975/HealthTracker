// ─── GOALS ───

const DEFAULT_GOALS = [
  {id:1, title:'Workout session',      type:'streak',   progress:5, total:7, color:'#2dd4bf', done:false},
  {id:2, title:'Drink 8 glasses water',type:'check',    progress:0, total:1, color:'#8b5cf6', done:false},
  {id:3, title:'Read for 30 min',      type:'check',    progress:0, total:1, color:'#a78bfa', done:false},
  {id:4, title:'Meditate',             type:'progress', progress:4, total:7, color:'#fbbf24', done:false},
  {id:5, title:'Call a friend',        type:'check',    progress:0, total:1, color:'#f87171', done:false},
];

let goals = [];
let nextGoalId = 100;

function loadGoals() {
  const saved = CONFIG.goals;
  goals = saved.length ? saved : [...DEFAULT_GOALS];
  nextGoalId = Math.max(...goals.map(g => g.id), 99) + 1;
}

function saveGoals() {
  CONFIG.goals = goals;
}

function renderGoals() {
  const list = document.getElementById('goalsList');
  if (!list) return;
  list.innerHTML = goals.map(g => {
    const pct = Math.min(100, Math.round((g.progress / g.total) * 100));
    return `<div class="goal-row" onclick="toggleGoal(${g.id})">
      <div class="goal-dot" style="background:${g.color}"></div>
      <div class="goal-info">
        <div class="goal-title" style="${g.done?'text-decoration:line-through;opacity:.5':''}">${g.title}</div>
        <div class="goal-prog-bar"><div class="goal-prog-fill" style="width:${pct}%;background:${g.color}"></div></div>
        <div class="goal-sub">${g.progress}/${g.total}${g.type==='streak'?' days':g.type==='progress'?' done':''}</div>
      </div>
      <div class="goal-check${g.done?' done':''}">✓</div>
    </div>`;
  }).join('');
}

function toggleGoal(id) {
  const g = goals.find(x => x.id === id);
  if (!g) return;
  if (g.type === 'check') {
    g.done = !g.done;
    g.progress = g.done ? 1 : 0;
  } else if (g.type === 'progress') {
    g.progress = Math.min(g.total, g.progress + 1);
    if (g.progress >= g.total) g.done = true;
  } else if (g.type === 'streak') {
    g.progress = Math.min(g.total, g.progress + 1);
    g.done = g.progress >= g.total;
  }
  saveGoals();
  renderGoals();
}

function showAddGoal() {
  const form = document.getElementById('addGoalForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function addGoal() {
  const title = document.getElementById('newGoalTitle').value.trim();
  if (!title) return;
  const type = document.getElementById('newGoalType').value;
  const target = parseInt(document.getElementById('newGoalTarget').value) || (type === 'streak' ? 7 : 1);
  const colors = ['#2dd4bf','#8b5cf6','#f87171','#fbbf24','#34d399','#60a5fa','#a78bfa'];
  const color = colors[nextGoalId % colors.length];
  goals.push({ id: nextGoalId++, title, type, progress: 0, total: target, color, done: false });
  saveGoals();
  renderGoals();
  document.getElementById('newGoalTitle').value = '';
  document.getElementById('newGoalTarget').value = '';
  document.getElementById('addGoalForm').style.display = 'none';
}
