// ============================================
// ISIS AI AGENT CRM - DASHBOARD ENTERPRISE
// ============================================
const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let leads = [];
let selectedLead = null;
let currentFilter = 'all';

// Auth - Pega o Token e os dados salvos no Login
const token = localStorage.getItem('crm_token');
const companyData = JSON.parse(localStorage.getItem('crm_company') || '{}');

// Se não tiver token, volta para o login
if (!token) window.location.href = 'index.html';

/**
 * Inicialização do Sistema
 */
function init() {
    // 1. Correção visual do nome da empresa
    let name = companyData.name || 'Minha Empresa';
    if (name.toLowerCase().includes("preocu")) name = "Souza Produções";
    
    const elName = document.getElementById('companyName');
    if (elName) elName.textContent = name;
    
    // 2. Configura a URL do Webhook na aba de integrações
    updateWebhookInfo();

    // 3. Carrega os dados iniciais
    loadLeads();
    
    // 4. Refresh automático a cada 2 minutos
    setInterval(loadLeads, 120000); 
}

/**
 * Busca os leads no Backend
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
        console.error("Falha ao sincronizar leads:", err);
    }
}

/**
 * Navegação entre as Abas (Dashboard, Leads, Pipeline, Integrações)
 */
function switchTab(tabId) {
    // Esconde todas as abas
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    // Desativa todos os botões da sidebar
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    // Ativa a aba e o botão selecionado
    const targetTab = document.getElementById(`tab-${tabId}`);
    const targetBtn = document.getElementById(`btn-${tabId}`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
    
    renderAll();
}

/**
 * Filtro rápido pelos cards de métricas (No Dashboard)
 */
function setFilter(filter) {
    currentFilter = filter;
    switchTab('dashboard'); 
    renderAll();
}

/**
 * Orquestrador de Renderização Total
 */
function renderAll() {
    renderStats();
    renderLeadsList(); // Lista lateral do Dash
    renderTable();     // Tabela da aba Leads
    renderKanban();    // Quadros do Pipeline
}

// 1. Atualiza os números nos Cards Superiores
function renderStats() {
    document.getElementById('statTotal').textContent = leads.length;
    document.getElementById('statNovos').textContent = leads.filter(l => l.status === 'novo').length;
    document.getElementById('statAtendimento').textContent = leads.filter(l => l.status === 'em_atendimento').length;
    document.getElementById('statConvertidos').textContent = leads.filter(l => l.status === 'convertido').length;
}

// 2. Renderiza a Lista Lateral (Dashboard) com Scroll funcional
function renderLeadsList() {
    const list = document.getElementById('leadsList');
    if (!list) return;

    const filtered = currentFilter === 'all' ? leads : leads.filter(l => l.status === currentFilter);
    document.getElementById('countCurrent').textContent = filtered.length;

    list.innerHTML = filtered.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <strong>👤 ${escapeHtml(l.name)}</strong>
            <span>📞 ${l.phone}</span>
            <div style="font-size:10px; margin-top:8px; color:var(--accent); font-weight:bold;">
                ${l.status.toUpperCase()}
            </div>
        </div>
    `).join('');
}

// 3. Renderiza a Tabela de Gestão (Aba Leads)
function renderTable() {
    const body = document.getElementById('tableBody');
    if (!body) return;

    body.innerHTML = leads.map(l => `
        <tr>
            <td>${escapeHtml(l.name)}</td>
            <td>${l.phone}</td>
            <td><span class="plan-badge">${l.status}</span></td>
            <td style="font-family:monospace; color:#10b981; font-size:12px;">${l.signature_key || 'SP-ORIGINAL'}</td>
            <td><button onclick="selectLead(${l.id})" style="background:var(--accent); color:white; border:none; padding:5px 12px; border-radius:6px; cursor:pointer;">Ver</button></td>
        </tr>
    `).join('');
}

// 4. Renderiza o Funil Kanban (Aba Pipeline) com Scroll por coluna
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
 * Seleciona um lead e abre o Painel de Detalhes com IA
 */
function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    if (!selectedLead) return;

    switchTab('dashboard'); // Foca no Dash para gerenciar o lead selecionado
    
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px; animation: fadeIn 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h2 style="margin:0;">${escapeHtml(selectedLead.name)}</h2>
                    <p style="color:var(--text-muted); margin-top:5px;">${selectedLead.phone}</p>
                </div>
                <button onclick="executarIA('analyze')" id="btn-ai" style="background:linear-gradient(135deg, #6366f1, #a855f7); color:white; border:none; padding:10px 20px; border-radius:30px; font-size:12px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                    ✨ Briefing Isis IA
                </button>
            </div>

            <!-- Box da IA -->
            <div id="ai-briefing-result" style="display:none; margin-top:20px; padding:20px; background:rgba(99, 102, 241, 0.1); border:1px solid #6366f144; border-radius:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span id="ai-temp" style="font-size:10px; font-weight:bold; padding:4px 10px; border-radius:10px; color:white;"></span>
                    <span style="font-size:10px; color:var(--text-muted);">SCORE: <strong id="ai-score" style="color:white;"></strong></span>
                </div>
                <p id="ai-resumo" style="font-size:14px; line-height:1.5; color:#f1f5f9; margin-bottom:12px;"></p>
                <div style="padding-top:12px; border-top:1px solid rgba(255,255,255,0.1); display:flex; flex-direction:column; gap:10px;">
                    <small style="color:var(--accent); font-weight:bold;">💡 SUGESTÃO DE ABORDAGEM:</small>
                    <p id="ai-sugestao" style="font-size:13px; font-style:italic; color:#cbd5e1;"></p>
                    <button onclick="executarIA('message')" id="btn-msg-ia" style="background:rgba(255,255,255,0.05); color:white; border:1px solid var(--accent); padding:10px; border-radius:10px; cursor:pointer; font-size:11px; font-weight:bold;">
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
            
            <div style="margin-top:20px; text-align:center;">
                <small style="color:var(--text-muted); font-family:monospace;">DIGITAL SP: ${selectedLead.signature_key || 'ORIGINAL'}</small>
            </div>
        </div>`;
}

/**
 * FUNÇÃO ÚNICA DE IA (Pede Análise ou Mensagem para o novo api/ai.js)
 */
async function executarIA(acao) {
    const btnAi = document.getElementById('btn-ai');
    const btnMsg = document.getElementById('btn-msg-ia');
    const resultBox = document.getElementById('ai-briefing-result');

    if (acao === 'analyze') {
        btnAi.textContent = "Isis pensando...";
        btnAi.disabled = true;
    } else {
        btnMsg.textContent = "Escrevendo...";
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
            // Se for mensagem, já abre o WhatsApp com o texto pronto
            const texto = encodeURIComponent(data.message);
            window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}?text=${texto}`, '_blank');
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
 * WEBHOOK E INTEGRAÇÕES
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
    alert("URL do Webhook copiada! Cole no seu Typebot.");
}

/**
 * FUNÇÕES DE APOIO
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
    } catch (err) { alert("Erro ao atualizar."); }
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

// Inicia o sistema
document.addEventListener('DOMContentLoaded', init);
