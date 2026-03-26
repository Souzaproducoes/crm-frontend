// ============================================
// 🚀 ISIS AI AGENT CRM - DASHBOARD HUMANIZADO
// ============================================
const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let leads = [];
let selectedLead = null;
let currentFilter = 'all';

// 🎭 Auth
const token = localStorage.getItem('crm_token');
const companyData = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) window.location.href = 'index.html';

// 🌟 Emojis por Status
const STATUS_EMOJIS = {
  'novo': '🆕',
  'em_atendimento': '🔥',
  'convertido': '💰',
  'perdido': '❌',
  'agendado': '📅',
  'nao_respondeu': '👻'
};

const STATUS_LABELS = {
  'novo': 'Novo Lead',
  'em_atendimento': 'Em Conversa',
  'convertido': 'Fechado 🎉',
  'perdido': 'Não Rolou',
  'agendado': 'Reunião Marcada',
  'nao_respondeu': 'Fantasma'
};

/**
 * ✨ Inicialização
 */
function init() {
  let name = companyData.name || 'Empresa';
  if (name.toLowerCase().includes("preocu")) name = "Souza Produções 🎬";
  
  const elName = document.getElementById('companyName');
  if (elName) elName.textContent = name;
  
  updateWebhookInfo();
  loadLeads();
  
  // Auto-refresh a cada 2 minutos
  setInterval(loadLeads, 120000);
  
  // Mensagem de boas-vindas animada
  showWelcomeToast();
}

function showWelcomeToast() {
  const hour = new Date().getHours();
  let msg = 'Bem-vindo de volta! 👋';
  if (hour < 12) msg = 'Bom dia! Pronto para fechar negócio hoje? ☕️💰';
  else if (hour < 18) msg = 'Boa tarde! Vamos converter esses leads? 🚀';
  else msg = 'Boa noite! Ainda dá tempo de fechar uma venda hoje 💪';
  
  // Implementação visual do toast seria aqui
  console.log('🎯 ' + msg);
}

/**
 * 📊 Navegação
 */
function switchTab(tabId) {
  document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`btn-${tabId}`);
  
  if (targetTab) targetTab.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');
  
  // Efeito visual de transição
  if (targetTab) {
    targetTab.style.opacity = '0';
    setTimeout(() => targetTab.style.opacity = '1', 50);
  }
}

function setFilter(filter) {
  currentFilter = filter;
  switchTab('dashboard');
  renderAll();
  
  // Feedback visual
  const emoji = STATUS_EMOJIS[filter] || '📋';
  console.log(`${emoji} Filtro aplicado: ${filter}`);
}

/**
 * 🔄 Renderização Geral
 */
function renderAll() {
  renderStats();
  renderLeadsList();
  renderTable();
  renderKanban();
}

function renderStats() {
  const stats = {
    total: leads.length,
    novos: leads.filter(l => l.status === 'novo').length,
    atendimento: leads.filter(l => l.status === 'em_atendimento').length,
    convertidos: leads.filter(l => l.status === 'convertido').length
  };
  
  // Animação nos números
  animateValue('statTotal', stats.total);
  animateValue('statNovos', stats.novos);
  animateValue('statAtendimento', stats.atendimento);
  animateValue('statConvertidos', stats.convertidos);
}

function animateValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const current = parseInt(el.textContent) || 0;
  if (current === value) return;
  
  el.textContent = value;
  el.style.transform = 'scale(1.2)';
  el.style.transition = 'transform 0.2s';
  setTimeout(() => el.style.transform = 'scale(1)', 200);
}

function renderLeadsList() {
  const list = document.getElementById('leadsList');
  if (!list) return;

  const filtered = currentFilter === 'all' ? leads : leads.filter(l => l.status === currentFilter);
  const countEl = document.getElementById('countCurrent');
  if (countEl) countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'lead' : 'leads'}`;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
        <div style="font-size:40px; margin-bottom:10px;">👻</div>
        <div>Nenhum lead aqui ainda...</div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(l => {
    const statusEmoji = STATUS_EMOJIS[l.status] || '👤';
    const isSelected = selectedLead?.id === l.id;
    
    return `
      <div class="lead-card ${isSelected ? 'selected' : ''}" onclick="selectLead(${l.id})" style="cursor:pointer; transition:all 0.2s;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="font-weight:600; color:#f8fafc;">${statusEmoji} ${escapeHtml(l.name)}</div>
          ${l.temperature === 'quente' ? '🔥' : ''}
        </div>
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:8px;">📞 ${l.phone}</div>
        <div style="display:flex; gap:5px; flex-wrap:wrap;">
          <span style="font-size:10px; padding:3px 8px; background:rgba(99,102,241,0.2); border-radius:10px; color:#818cf8;">
            ${STATUS_LABELS[l.status] || l.status}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function renderTable() {
  const body = document.getElementById('tableBody');
  if (!body) return;

  body.innerHTML = leads.map(l => {
    const statusEmoji = STATUS_EMOJIS[l.status] || '⚪️';
    return `
      <tr style="transition:background 0.2s;">
        <td style="font-weight:500;">${escapeHtml(l.name)}</td>
        <td>📱 ${l.phone}</td>
        <td><span style="font-size:16px; margin-right:5px;">${statusEmoji}</span> ${STATUS_LABELS[l.status] || l.status}</td>
        <td style="font-family:monospace; color:#10b981; font-size:11px;">${l.signature_key || 'ORIGINAL'}</td>
        <td>
          <button onclick="selectLead(${l.id})" style="background:linear-gradient(135deg, #6366f1, #a855f7); color:white; border:none; padding:6px 14px; border-radius:20px; cursor:pointer; font-size:12px; font-weight:600;">
            Ver 👀
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderKanban() {
  const columns = {
    'novo': document.getElementById('col-novo'),
    'em_atendimento': document.getElementById('col-atendimento'),
    'convertido': document.getElementById('col-convertido')
  };
  
  Object.entries(columns).forEach(([status, col]) => {
    if (!col) return;
    col.innerHTML = `<div style="text-align:center; padding:10px; color:var(--text-muted); font-size:12px;">
      ${leads.filter(l => l.status === status).length} leads ${STATUS_EMOJIS[status]}
    </div>`;
  });

  leads.forEach(l => {
    const target = columns[l.status];
    if (target) {
      const tempEmoji = l.temperature === 'quente' ? '🔥' : (l.temperature === 'morno' ? '🌤️' : '❄️');
      target.innerHTML += `
        <div class="kanban-card" onclick="selectLead(${l.id})" style="margin:8px 0; padding:15px; background:rgba(255,255,255,0.05); border-radius:12px; border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <strong style="font-size:14px;">${escapeHtml(l.name)}</strong>
            <span>${tempEmoji}</span>
          </div>
          <small style="color:var(--text-muted); display:block;">${l.phone}</small>
        </div>
      `;
    }
  });
}

/**
 * 🎯 Seleção do Lead & Painel de Inteligência
 */
function selectLead(id) {
  selectedLead = leads.find(l => l.id === id);
  if (!selectedLead) return;

  const activeTab = document.querySelector('.content-tab.active')?.id;
  if (activeTab !== 'tab-dashboard') switchTab('dashboard');
  
  renderLeadsList();

  const tempIndicator = selectedLead.temperature === 'quente' ? '🔥 Quente' : 
                       (selectedLead.temperature === 'morno' ? '🌤️ Morno' : '❄️ Frio');

  document.getElementById('detailPanel').innerHTML = `
    <div style="padding:30px; padding-bottom:80px;">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:25px;">
        <div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
            <h2 style="margin:0; font-size:24px;">${escapeHtml(selectedLead.name)}</h2>
            <span style="background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:20px; font-size:12px;">
              ${tempIndicator}
            </span>
          </div>
          <p style="color:var(--text-muted); margin:0; font-size:14px;">📱 ${selectedLead.phone}</p>
        </div>
        <button onclick="executarIA('analyze')" id="btn-ai" style="background:linear-gradient(135deg, #6366f1, #a855f7); color:white; border:none; padding:12px 24px; border-radius:30px; font-size:13px; font-weight:bold; cursor:pointer; box-shadow:0 4px15px rgba(99,102,241,0.3); display:flex; align-items:center; gap:8px; transition:all 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          <span>✨</span> Analisar com Isis
        </button>
      </div>

      <!-- Resultado da IA -->
      <div id="ai-briefing-result" style="display:none; margin-top:20px; padding:25px; background:linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1)); border:1px solid rgba(99,102,241,0.3); border-radius:20px; backdrop-filter:blur(10px);">
        <div style="display:flex; justify-content:space-between; margin-bottom:20px; align-items:center; flex-wrap:wrap; gap:10px;">
          <span id="ai-temp" style="font-size:11px; font-weight:800; padding:8px 16px; border-radius:30px; color:white; letter-spacing:1px; text-transform:uppercase;"></span>
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:20px;" id="ai-score-emoji">📊</span>
            <span style="font-size:14px; color:#f8fafc; font-weight:600;">Score: <span id="ai-score" style="color:#fbbf24; font-size:18px;"></span>/100</span>
          </div>
        </div>
        
        <div style="margin-bottom:20px;">
          <div style="font-size:12px; color:#818cf8; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">💡 Sobre o Negócio</div>
          <p id="ai-resumo" style="font-size:16px; line-height:1.6; color:#f1f5f9; margin:0; font-weight:500;"></p>
        </div>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:20px;">
          <div style="padding:15px; background:rgba(0,0,0,0.2); border-radius:12px; border-left:3px solid #ef4444;">
            <small style="color:#ef4444; font-weight:800; font-size:10px; text-transform:uppercase; display:block; margin-bottom:5px;">🤕 Dor Principal</small>
            <p id="ai-dor" style="font-size:13px; color:#cbd5e1; margin:0; line-height:1.4;"></p>
          </div>
          <div style="padding:15px; background:rgba(0,0,0,0.2); border-radius:12px; border-left:3px solid #fbbf24;">
            <small style="color:#fbbf24; font-weight:800; font-size:10px; text-transform:uppercase; display:block; margin-bottom:5px;">⚠️ Objeção Provável</small>
            <p id="ai-objecao" style="font-size:13px; color:#cbd5e1; margin:0; line-height:1.4;"></p>
          </div>
        </div>

        <div style="padding:20px; background:rgba(99,102,241,0.1); border-radius:12px; margin-bottom:20px;">
          <small style="color:#a78bfa; font-weight:800; text-transform:uppercase; font-size:10px; display:block; margin-bottom:10px;">🎯 Estratégia Recomendada</small>
          <p id="ai-sugestao" style="color:#e2e8f0; font-size:14px; line-height:1.5; margin:0 0 10px 0;"></p>
          <small id="ai-momento" style="color:#94a3b8; font-size:12px; display:block; margin-top:10px;"></small>
        </div>
        
        <button onclick="executarIA('message')" id="btn-msg-ia" style="width:100%; padding:16px; background:linear-gradient(135deg, #25d366, #128c7e); color:white; border:none; border-radius:12px; font-weight:700; font-size:15px; cursor:pointer; transition:all 0.3s; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 4px15px rgba(37,211,102,0.3);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          <span>💬</span> Gerar Mensagem no WhatsApp
        </button>
      </div>

      <!-- Interesse Original -->
      <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:15px; margin:25px 0; border:1px solid var(--border);">
        <label style="color:var(--accent); font-size:11px; font-weight:bold; text-transform:uppercase; display:flex; align-items:center; gap:5px;">
          <span>📝</span> Interesse Original
        </label>
        <p style="margin-top:10px; line-height:1.6; color:#cbd5e1;">${escapeHtml(selectedLead.interesse || 'Nenhuma anotação ainda... 🤔')}</p>
      </div>

      <!-- Ações -->
      <div style="display:flex; gap:10px;">
        <a href="https://wa.me/${selectedLead.phone.replace(/\D/g,'')}" target="_blank" style="flex:2; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.3s; box-shadow:0 4px10px rgba(37,211,102,0.3);" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          <span>💬</span> Abrir WhatsApp
        </a>
        <select onchange="updateStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; border:1px solid var(--border); padding:10px; cursor:pointer; font-size:14px;">
          <option value="">⚡️ Mudar Status</option>
          <option value="novo">🆕 Novo</option>
          <option value="em_atendimento">🔥 Em Conversa</option>
          <option value="convertido">💰 Fechado</option>
          <option value="perdido">❌ Não Rolou</option>
        </select>
      </div>
      
      <div style="margin-top:25px; text-align:center;">
        <small style="color:var(--text-muted); font-size:10px; font-family:monospace; background:rgba(255,255,255,0.05); padding:5px 10px; border-radius:20px;">
          🔑 Digital: ${selectedLead.signature_key || 'SOUZA-2026'}
        </small>
      </div>
    </div>`;
}

/**
 * 🤖 Chamada para a Groq
 */
async function executarIA(acao) {
  const btnAi = document.getElementById('btn-ai');
  const btnMsg = document.getElementById('btn-msg-ia');
  const resultBox = document.getElementById('ai-briefing-result');
  
  if (acao === 'analyze') { 
    btnAi.innerHTML = '<span>🧠</span> Isis está analisando...'; 
    btnAi.disabled = true; 
  } else { 
    btnMsg.innerHTML = '<span>✍️</span> Isis está escrevendo...'; 
    btnMsg.disabled = true; 
  }

  try {
    const payload = { 
      action: acao, 
      leadName: selectedLead.name, 
      leadInteresse: selectedLead.interesse, 
      briefing: document.getElementById('ai-resumo')?.textContent || "",
      context: {
        horario: new Date().getHours(),
        dia: new Date().getDay()
      }
    };

    const res = await fetch(`${API_URL}/api/ai`, { 
      method: 'POST', 
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      }, 
      body: JSON.stringify(payload) 
    });
    
    if (!res.ok) throw new Error('Erro na API');
    
    const data = await res.json();
    
    if (acao === 'analyze') {
      // Preenche dados com animação
      document.getElementById('ai-resumo').textContent = data.resumo;
      document.getElementById('ai-score').textContent = data.score;
      document.getElementById('ai-sugestao').textContent = data.sugestao_abordagem || data.sugestao;
      document.getElementById('ai-dor').textContent = data.principal_dor || 'Analisando...';
      document.getElementById('ai-objecao').textContent = data.objecao_provavel || 'Nenhuma objeção clara';
      
      if (data.momento_ideal) {
        document.getElementById('ai-momento').innerHTML = `<span>⏰</span> ${data.momento_ideal}`;
      }

      const temp = document.getElementById('ai-temp'); 
      temp.textContent = (data.temperatura || "MORNO").toUpperCase();
      
      const t = (data.temperatura || "").toLowerCase();
      if (t.includes('quente') || t.includes('pronto') || t.includes('⚡️')) {
        temp.style.background = 'linear-gradient(135deg, #ef4444, #f97316)';
        document.getElementById('ai-score-emoji').textContent = '🔥';
      } else if (t.includes('morno')) {
        temp.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
        document.getElementById('ai-score-emoji').textContent = '🌤️';
      } else {
        temp.style.background = 'linear-gradient(135deg, #60a5fa, #3b82f6)';
        document.getElementById('ai-score-emoji').textContent = '❄️';
      }
      
      resultBox.style.display = 'block';
      resultBox.style.animation = 'fadeIn 0.5s ease';
      btnAi.innerHTML = '<span>✨</span> Análise Atualizada';
      
      // Atualiza temperatura do lead localmente
      selectedLead.temperature = t.includes('quente') ? 'quente' : (t.includes('morno') ? 'morno' : 'frio');
      
    } else {
      // WhatsApp com emojis - encode correto
      let msgLimpa = data.message.replace(/^["']|["']$/g, '').trim();
      
      // Garante que a mensagem tem assinatura da Isis
      if (!msgLimpa.includes('Isis')) {
        msgLimpa += '\n\n- Isis 👋';
      }
      
      const encodedMsg = encodeURIComponent(msgLimpa);
      window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}?text=${encodedMsg}`, '_blank');
      
      btnMsg.innerHTML = '<span>✅</span> Mensagem Enviada!';
      setTimeout(() => {
        btnMsg.innerHTML = '<span>💬</span> Gerar Nova Mensagem';
      }, 3000);
    }
  } catch (err) { 
    console.error("Erro na Isis:", err);
    alert("😅 Ops! A Isis deu uma travadinha. Pode tentar de novo?"); 
  } finally { 
    if (btnAi) { btnAi.disabled = false; btnAi.style.opacity = '1'; }
    if (btnMsg) { btnMsg.disabled = false; btnMsg.style.opacity = '1'; }
  }
}

/**
 * 🛠️ Utilidades
 */
function updateWebhookInfo() { 
  const urlInput = document.getElementById('webhookUrl'); 
  if (urlInput && companyData.id) {
    urlInput.value = `${API_URL}/api/webhook?id=${companyData.id}`;
  }
}

function copyWebhook() { 
  const copyText = document.getElementById("webhookUrl"); 
  copyText.select(); 
  document.execCommand('copy');
  
  // Feedback visual
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = '✅ Copiado!';
  btn.style.background = '#10b981';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = '';
  }, 2000);
}

async function updateStatus(id, status) { 
  if(!status) return;
  
  const emoji = STATUS_EMOJIS[status] || '⚡️';
  
  try {
    await fetch(`${API_URL}/api/leads`, { 
      method: 'PATCH', 
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      }, 
      body: JSON.stringify({ id, status }) 
    }); 
    
    // Feedback imediato
    const lead = leads.find(l => l.id === id);
    if (lead) {
      lead.status = status;
      renderAll();
      
      // Toast de sucesso
      console.log(`${emoji} Status atualizado para ${STATUS_LABELS[status]}`);
    }
  } catch (err) {
    alert('❌ Erro ao atualizar status');
  }
}

function filterLeadsTable() {
  const term = document.getElementById('searchLeads').value.toLowerCase();
  const rows = document.querySelectorAll('#tableBody tr');
  rows.forEach(row => {
    const name = row.cells[0].textContent.toLowerCase();
    const phone = row.cells[1].textContent.toLowerCase();
    row.style.display = (name.includes(term) || phone.includes(term)) ? '' : 'none';
  });
}

async function exportarDados() {
  try {
    const res = await fetch(`${API_URL}/api/export`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    const data = await res.json();
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      "Nome,Telefone,Status,Digital,Temperatura\n" + 
      data.leads.map(l => `${l.name},${l.phone},${l.status},${l.signature_key},${l.temperature || 'novo'}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('📊 Exportação realizada com sucesso!');
  } catch (err) { 
    alert("❌ Erro ao exportar dados."); 
  }
}

function logout() { 
  localStorage.clear(); 
  window.location.href = 'index.html'; 
}

function escapeHtml(text) { 
  if (!text) return ''; 
  const div = document.createElement('div'); 
  div.textContent = text; 
  return div.innerHTML; 
}

// Adiciona animação CSS dinâmica
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lead-card:hover {
    transform: translateX(5px);
    border-left: 3px solid #6366f1;
  }
`;
document.head.appendChild(style);

// 🚀 Inicia
document.addEventListener('DOMContentLoaded', init);
