// ============================================
// ISIS AI AGENT CRM - DASHBOARD ENTERPRISE
// ============================================
const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let leads = [];
let selectedLead = null;
let currentFilter = 'all';

// Auth - Carrega credenciais
const token = localStorage.getItem('crm_token');
const companyData = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) window.location.href = 'index.html';

/**
 * Inicialização
 */
function init() {
    // Correção visual do nome da empresa proprietária
    let name = companyData.name || 'Minha Empresa';
    if (name.toLowerCase().includes("preocu")) name = "Souza Produções";
    
    const elName = document.getElementById('companyName');
    if (elName) elName.textContent = name;
    
    updateWebhookInfo();
    loadLeads();
    
    // Sincronização automática a cada 2 minutos
    setInterval(loadLeads, 120000); 
}

/**
 * Busca dados da API
 */
async function loadLeads() {
    try {
        const res = await fetch(`${API_URL}/api/leads`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) logout();
        
        const data = await res.json();
        leads = data.leads || [];
        renderAll();
    } catch (err) {
        console.error("Erro na sincronização:", err);
    }
}

/**
 * Controle de Navegação (Tabs)
 */
function switchTab(tabId) {
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tabId}`);
    const targetBtn = document.getElementById(`btn-${tabId}`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
}

/**
 * Filtro rápido por cards
 */
function setFilter(filter) {
    currentFilter = filter;
    switchTab('dashboard'); 
    renderAll();
}

/**
 * Renderização Geral
 */
function renderAll() {
    renderStats();
    renderLeadsList(); // Lista lateral
    renderTable();     // Tabela geral
    renderKanban();    // Pipeline
}

function renderStats() {
    document.getElementById('statTotal').textContent = leads.length;
    document.getElementById('statNovos').textContent = leads.filter(l => l.status === 'novo').length;
    document.getElementById('statAtendimento').textContent = leads.filter(l => l.status === 'em_atendimento').length;
    document.getElementById('statConvertidos').textContent = leads.filter(l => l.status === 'convertido').length;
}

function renderLeadsList() {
    const list = document.getElementById('leadsList');
    if (!list) return;

    const filtered = currentFilter === 'all' ? leads : leads.filter(l => l.status === currentFilter);
    document.getElementById('countCurrent').textContent = filtered.length;

    list.innerHTML = filtered.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <div class="lead-card-header"><span>👤</span> ${escapeHtml(l.name)}</div>
            <div class="lead-card-body"><span>📞</span> ${l.phone}</div>
            <div class="lead-card-badge">${l.status.replace('_', ' ')}</div>
        </div>
    `).join('');
}

function renderTable() {
    const body = document.getElementById('tableBody');
    if (!body) return;

    body.innerHTML = leads.map(l => `
        <tr>
            <td>${escapeHtml(l.name)}</td>
            <td>${l.phone}</td>
            <td><span class="plan-badge">${l.status}</span></td>
            <td style="font-family:monospace; color:#10b981; font-size:12px;">${l.signature_key || 'ORIGINAL'}</td>
            <td><button onclick="selectLead(${l.id})" style="background:var(--accent); color:white; border:none; padding:5px 12px; border-radius:6px; cursor:pointer;">Ver</button></td>
        </tr>
    `).join('');
}

function renderKanban() {
    const cols = {
        'novo': document.getElementById('col-novo'),
        'em_atendimento': document.getElementById('col-atendimento'),
        'convertido': document.getElementById('col-convertido')
    };
    Object.values(cols).forEach(c => { if(c) c.innerHTML = ""; });

    leads.forEach(l => {
        const target = cols[l.status];
        if (target) {
            target.innerHTML += `
                <div class="kanban-card" onclick="selectLead(${l.id})">
                    <strong>${escapeHtml(l.name)}</strong>
                    <small style="display:block; color:var(--text-muted); margin-top:8px;">${l.phone}</small>
                </div>
            `;
        }
    });
}

/**
 * Visualização Detalhada do Lead
 */
function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    if (!selectedLead) return;

    const activeTab = document.querySelector('.content-tab.active')?.id;
    if (activeTab !== 'tab-dashboard') switchTab('dashboard');
    
    renderLeadsList(); // Atualiza seleção visual na lista lateral

    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px; animation: fadeIn 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h2 style="margin:0;">${escapeHtml(selectedLead.name)}</h2>
                    <p style="color:var(--text-muted); margin-top:5px;">${selectedLead.phone}</p>
                </div>
                <button onclick="executarIA('analyze')" id="btn-ai" style="background:linear-gradient(135deg, #6366f1, #a855f7); color:white; border:none; padding:10px 20px; border-radius:30px; font-size:12px; font-weight:bold; cursor:pointer;">
                    ✨ Briefing Isis IA
                </button>
            </div>

            <!-- Painel de IA -->
            <div id="ai-briefing-result" style="display:none; margin-top:20px; padding:25px; background:rgba(99, 102, 241, 0.08); border:1px solid rgba(99, 102, 241, 0.3); border-radius:20px; overflow:visible;">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center;">
                    <span id="ai-temp" style="font-size:11px; font-weight:800; padding:6px 12px; border-radius:30px; color:white; letter-spacing:1px;"></span>
                    <span style="font-size:11px; color:var(--text-muted); font-weight:600;">QUALIDADE: <strong id="ai-score" style="color:#f8fafc;"></strong></span>
                </div>
                <p id="ai-resumo" style="font-size:15px; line-height:1.6; color:#f1f5f9; margin-bottom:15px;"></p>
                <div style="padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                    <small style="color:var(--accent); font-weight:800; text-transform:uppercase; font-size:10px; display:block; margin-bottom:8px;">💡 Próximo Passo Estratégico</small>
                    <p id="ai-sugestao" style="color:#cbd5e1; font-size:13px; font-style:italic; line-height:1.4; margin-bottom:15px;"></p>
                    <button onclick="executarIA('message')" id="btn-msg-ia" style="width:100%; padding:15px; background:#6366f1; color:white; border:none; border-radius:12px; font-weight:700; cursor:pointer; transition:0.3s;">
                        🪄 Gerar Mensagem Personalizada
                    </button>
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:15px; margin:25px 0; border:1px solid var(--border);">
                <label style="color:var(--accent); font-size:11px; font-weight:bold; text-transform:uppercase;">Interesse registrado</label>
                <p style="margin-top:10px; line-height:1.6;">${escapeHtml(selectedLead.interesse || 'Nenhum detalhe informado.')}</p>
            </div>

            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone.replace(/\D/g,'')}" target="_blank" style="flex:2; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px;">
                   <span>💬</span> WhatsApp Direto
                </a>
                <select onchange="updateStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; border:1px solid var(--border); padding:10px; cursor:pointer;">
                    <option value="">Status</option>
                    <option value="novo">Novo</option>
                    <option value="em_atendimento">Em Aberto</option>
                    <option value="convertido">Ganho</option>
                    <option value="perdido">Perdido</option>
                </select>
            </div>
            <div style="height:60px;"></div>
        </div>`;
}

/**
 * Inteligência da Isis (Groq)
 */
async function executarIA(acao) {
    const btnAi = document.getElementById('btn-ai');
    const btnMsg = document.getElementById('btn-msg-ia');
    const resultBox = document.getElementById('ai-briefing-result');

    if (acao === 'analyze') {
        btnAi.textContent = "Isis analisando...";
        btnAi.disabled = true;
    } else {
        btnMsg.textContent = "Isis escrevendo...";
        btnMsg.disabled = true;
    }

    try {
        const payload = {
            action: acao,
            leadName: selectedLead.name,
            leadInteresse: selectedLead.interesse,
            briefing: document.getElementById('ai-resumo')?.textContent || ""
        };

        const res = await fetch(`${API_URL}/api/ai`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (acao === 'analyze') {
            document.getElementById('ai-resumo').textContent = data.resumo;
            document.getElementById('ai-score').textContent = data.score + "/100";
            document.getElementById('ai-sugestao').textContent = data.sugestao;
            const temp = document.getElementById('ai-temp');
            temp.textContent = data.temperatura.toUpperCase();
            const t = data.temperatura.toLowerCase();
            temp.style.background = t.includes('quente') ? '#ef4444' : (t.includes('morno') ? '#fbbf24' : '#60a5fa');
            resultBox.style.display = 'block';
            btnAi.innerHTML = "✨ Briefing Atualizado";
        } else {
            // CORREÇÃO DE ENCODING: Abre o WhatsApp sem símbolos estranhos
            const textoFormatado = data.message.trim();
            const linkWa = `https://wa.me/${selectedLead.phone.replace(/\D/g,'')}?text=${encodeURIComponent(textoFormatado)}`;
            window.open(linkWa, '_blank');
            btnMsg.innerHTML = "🪄 Gerar Mensagem Personalizada";
        }
    } catch (err) {
        alert("A Isis está descansando no momento.");
    } finally {
        if (btnAi) btnAi.disabled = false;
        if (btnMsg) btnMsg.disabled = false;
    }
}

/**
 * Webhook
 */
function updateWebhookInfo() {
    const urlInput = document.getElementById('webhookUrl');
    if (urlInput && companyData.id) {
        urlInput.value = `https://crm-api-isisaiagent.vercel.app/api/webhook?id=${companyData.id}`;
    }
}

function copyWebhook() {
    const copyText = document.getElementById("webhookUrl");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("URL do Webhook copiada!");
}

/**
 * Funções de Apoio
 */
async function updateStatus(id, status) {
    if(!status) return;
    try {
        await fetch(`${API_URL}/api/leads`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
        loadLeads();
    } catch (err) { alert("Erro ao atualizar status."); }
}

function filterLeadsTable() {
    const term = document.getElementById('searchLeads').value.toLowerCase();
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        row.style.display = name.includes(term) ? '' : 'none';
    });
}

async function exportarDados() {
    try {
        const res = await fetch(`${API_URL}/api/export`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const csv = "Nome,Telefone,Status,Digital\n" + data.leads.map(l => `${l.name},${l.phone},${l.status},${l.signature_key}`).join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `backup_leads.csv`; a.click();
    } catch (err) { alert("Erro ao exportar."); }
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

// Inicia
document.addEventListener('DOMContentLoaded', init);
