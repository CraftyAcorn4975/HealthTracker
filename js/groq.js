// ─── GROQ AI ───
// Uses Groq's free API with Llama 3.3 70B
// Free tier: ~14,400 requests/day — more than enough for personal use
// Get your free key at: https://console.groq.com

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

let chatHistory = [];

async function callGroq(userPrompt, systemPrompt) {
  const key = CONFIG.groqKey;
  if (!key) throw new Error('No Groq API key — go to Settings and add your free key from console.groq.com');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 600,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response.';
}

async function callGroqChat(messages) {
  const key = CONFIG.groqKey;
  if (!key) throw new Error('No Groq API key — go to Settings');

  const ctx = buildHealthContext();
  const goals = CONFIG.goals;

  const systemPrompt = `You are JARVIS, a sharp personal intelligence assistant. You have real-time access to the user's health data and goals. Be direct, analytical, specific. No filler. Keep responses under 4 sentences unless asked for more.

Current health data:
${Object.entries(ctx).map(([k,v]) => `- ${k}: ${v}`).join('\n')}

Active goals:
${goals.length ? goals.map(g => `- ${g.title} (${g.progress}/${g.total})`).join('\n') : '- No goals set yet'}`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 600,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      ]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response.';
}

async function runAnalysis(type) {
  const ctx = buildHealthContext();
  const ctxStr = Object.entries(ctx).map(([k,v]) => `${k}: ${v}`).join(', ');

  if (type === 'sleep') {
    const el = document.getElementById('sleepSummary');
    el.textContent = 'Analyzing…';
    el.classList.remove('loaded');
    try {
      const reply = await callGroq(
        `Analyze this person's sleep and recovery. Health data: ${ctxStr}`,
        'You are JARVIS. Give a 3-sentence sleep analysis: quality rating, how it affects recovery today, and one specific actionable recommendation. Be direct and data-driven. No filler.'
      );
      el.textContent = reply;
      el.classList.add('loaded');
    } catch(e) { el.textContent = '⚠ ' + e.message; }

  } else if (type === 'workout') {
    const el = document.getElementById('workoutSummary');
    el.textContent = 'Analyzing…';
    el.classList.remove('loaded');
    try {
      const reply = await callGroq(
        `Analyze this person's workout performance and give a WHOOP-style strain score out of 21. Health data: ${ctxStr}`,
        'You are JARVIS. Give a 3-sentence workout analysis based on calories burned, steps, HRV, and VO2 max. Then on a NEW LINE output exactly: STRAIN_SCORE: [number 1-21] based on estimated cardiovascular load. No filler.'
      );
      const match = reply.match(/STRAIN_SCORE:\s*(\d+(?:\.\d+)?)/i);
      const body = reply.replace(/STRAIN_SCORE:.*$/im, '').trim();
      el.textContent = body;
      el.classList.add('loaded');
      if (match) {
        document.getElementById('strainNum').textContent = parseFloat(match[1]).toFixed(1);
        document.getElementById('strainWrap').style.display = 'inline-flex';
      }
    } catch(e) { el.textContent = '⚠ ' + e.message; }
  }
}

async function sendChat() {
  const input = document.getElementById('chatIn');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  addMsg('user', msg);
  chatHistory.push({ role: 'user', content: msg });
  const typing = addTyping();
  try {
    const reply = await callGroqChat(chatHistory);
    typing.remove();
    addMsg('ai', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  } catch(e) {
    typing.remove();
    addMsg('ai', '⚠ ' + e.message);
  }
}

function quickAsk(q) {
  switchView('ai');
  setTimeout(() => { document.getElementById('chatIn').value = q; sendChat(); }, 100);
}

function addMsg(role, text) {
  const msgs = document.getElementById('chatMsgs');
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  d.innerHTML = `<div class="mav ${role}">${role === 'ai' ? 'J' : 'ME'}</div><div class="mbub">${text.replace(/\n/g,'<br>')}</div>`;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}

function addTyping() {
  const msgs = document.getElementById('chatMsgs');
  const d = document.createElement('div');
  d.className = 'msg';
  d.innerHTML = '<div class="mav ai">J</div><div class="mbub typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}
