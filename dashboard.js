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
    // Correção visual do nome da empresa (Resolve o erro do banco)
    let name = companyData.name || 'Minha Empresa';
    if (name.toLowerCase().includes("preocu")) name = "Souza Produções";
    
    const elName = document.getElementById('companyName');
    if (elName) elName.textContent = name;
    
    loadLeads();
    // Atualiza os dados automaticamente a cada 2 minutos
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
 * Navegação entre as Abas (Dashboard, Leads, Pipeline)
 */
function switchTab(tabId) {
    // Esconde todas as abas
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    // Desativa todos os botões
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    // Ativa o selecionado
    const targetTab = document.getElementById(`tab-${tabId}`);
    const targetBtn = document.getElementById(`btn-${tabId}`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
    
    renderAll();
}

/**
 * Filtro rápido pelos cards de métricas
 */
function setFilter(filter) {
    currentFilter = filter;
    switchTab('dashboard'); // Garante que a visualização mude para o Dash
}

/**
 * Orquestrador de Renderização
 */
function renderAll() {
    renderStats();
    renderLeadsList();
    renderTable();
    renderKanban();
}

// 1. Atualiza os números nos Cards
function renderStats() {
    const statTotal = document.getElementById('statTotal');
    const statNovos = document.getElementById('statNovos');
    const statAtendimento = document.getElementById('statAtendimento');
    const statConvertidos = document.getElementById('statConvertidos');

    if (statTotal) statTotal.textContent = leads.length;
    if (statNovos) statNovos.textContent = leads.filter(l => l.status === 'novo').length;
    if (statAtendimento) statAtendimento.textContent = leads.filter(l => l.status === 'em_atendimento').length;
    if (statConvertidos) statConvertidos.textContent = leads.filter(l => l.status === 'convertido').length;
}

// 2. Renderiza a Lista Lateral (Dashboard)
function renderLeadsList() {
    const list = document.getElementById('leadsList');
    if (!list) return;

    const filtered = currentFilter === 'all' ? leads : leads.filter(l => l.status === currentFilter);
    document.getElementById('countCurrent').textContent = filtered.length;

    list.innerHTML = filtered.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <strong>👤 ${escapeHtml(l.name)}</strong>
            <span>📞 ${l.phone}</span>
            <div style="font-size:10px; margin-top:5px; color:var(--accent); font-weight:bold;">
                ${l.status.toUpperCase().replace('_', ' ')}
            </div>
        </div>
    `).join('');
}

// 3. Renderiza a Tabela de Gestão
function renderTable() {
    const body = document.getElementById('tableBody');
    if (!body) return;

    body.innerHTML = leads.map(l => `
        <tr>
            <td>${escapeHtml(l.name)}</td>
            <td>${l.phone}</td>
            <td><span class="plan-badge">${l.status}</span></td>
            <td style="font-family:monospace; color:#10b981; font-size:12px;">${l.signature_key || 'ORIGINAL'}</td>
            <td><button onclick="selectLead(${l.id})" style="background:var(--accent); color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">Ver</button></td>
        </tr>
    `).join('');
}

// 4. Renderiza o Funil (Kanban)
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
                    <small style="display:block; color:var(--text-muted); margin-top:5px;">${l.phone}</small>
                </div>
            `;
        }
    });
}

/**
 * Seleciona um lead e abre o Painel de Detalhes
 */
function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    if (!selectedLead) return;

    switchTab('dashboard'); // Sempre foca no Dash para ver os detalhes
    
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px; animation: fadeIn 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h2 style="margin:0;">${escapeHtml(selectedLead.name)}</h2>
                    <p style="color:var(--text-muted); margin-top:5px;">${selectedLead.phone}</p>
                </div>
                <button onclick="analisarComIA()" id="btn-ai" style="background:linear-gradient(135deg, #6366f1, #a855f7); color:white; border:none; padding:10px 20px; border-radius:30px; font-size:12px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                    ✨ Briefing Isis IA
                </button>
            </div>

            <!-- Box da IA (Escondido por padrão) -->
            <div id="ai-briefing-result" style="display:none; margin-top:20px; padding:20px; background:rgba(99, 102, 241, 0.1); border:1px solid #6366f144; border-radius:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span id="ai-temp" style="font-size:10px; font-weight:bold; padding:4px 10px; border-radius:10px; color:white;"></span>
                    <span style="font-size:10px; color:var(--text-muted);">QUALIDADE: <strong id="ai-score" style="color:white;"></strong></span>
                </div>
                <p id="ai-resumo" style="font-size:14px; line-height:1.5; color:#f1f5f9; margin-bottom:12px;"></p>
                <div style="padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); color:var(--accent); font-size:13px; font-weight:500;">
                    💡 Próximo passo: <span id="ai-sugestao" style="color:#f8fafc; font-style:italic;"></span>
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:15px; margin:25px 0; border:1px solid var(--border);">
                <label style="color:var(--accent); font-size:11px; font-weight:bold; text-transform:uppercase;">Interesse registrado</label>
                <p style="margin-top:10px; line-height:1.6;">${escapeHtml(selectedLead.interesse || 'Nenhum detalhe informado.')}</p>
            </div>

            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone.replace(/\D/g,'')}" target="_blank" style="flex:2; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px;">
                   <span>💬</span> Chamar no WhatsApp
                </a>
                <select onchange="updateStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; border:1px solid var(--border); padding:10px; cursor:pointer;">
                    <option value="">Status</option>
                    <option value="novo">Novo</option>
                    <option value="em_atendimento">Em Atendimento</option>
                    <option value="convertido">Fechado (Ganho)</option>
                    <option value="perdido">Perdido</option>
                </select>
            </div>
            
            <div style="margin-top:20px; text-align:center;">
                <small style="color:var(--text-muted); font-family:monospace;">DIGITAL SP: ${selectedLead.signature_key || 'SOUZA-PR-2026'}</small>
            </div>
        </div>`;
}

/**
 * INTEGRAÇÃO COM A GROQ (Isis AI)
 */
async function analisarComIA() {
    const btn = document.getElementById('btn-ai');
    const resultBox = document.getElementById('ai-briefing-result');
    
    if (!selectedLead.interesse) {
        alert("O lead não possui informações de interesse para analisar.");
        return;
    }

    btn.textContent = "Isis analisando...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/ai-analyze`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                leadName: selectedLead.name,
                leadInteresse: selectedLead.interesse
            })
        });

        const data = await res.json();

        // Preenche os dados da IA na tela
        document.getElementById('ai-resumo').textContent = data.resumo;
        document.getElementById('ai-score').textContent = data.score + "/100";
        document.getElementById('ai-sugestao').textContent = data.sugestao;
        
        const temp = document.getElementById('ai-temp');
        temp.textContent = data.temperatura.toUpperCase();
        
        // Cor baseada na temperatura
        const t = data.temperatura.toLowerCase();
        temp.style.background = t.includes('quente') ? '#ef4444' : (t.includes('morno') ? '#fbbf24' : '#60a5fa');
        
        resultBox.style.display = 'block';
        btn.innerHTML = "✨ Briefing Atualizado";
    } catch (err) {
        console.error(err);
        alert("A Isis está descansando. Verifique sua chave da Groq.");
    } finally {
        btn.disabled = false;
    }
}

/**
 * Atualiza o Status do Lead no Banco
 */
async function updateStatus(id, status) {
    if(!status) return;
    try {
        const res = await fetch(`${API_URL}/api/leads`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
        if (res.ok) loadLeads();
    } catch (err) {
        alert("Erro ao atualizar status.");
    }
}

/**
 * Busca na Tabela
 */
function filterLeadsTable() {
    const term = document.getElementById('searchLeads').value.toLowerCase();
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        row.style.display = name.includes(term) ? '' : 'none';
    });
}

/**
 * Exporta Backup em CSV
 */
async function exportarDados() {
    try {
        const res = await fetch(`${API_URL}/api/export`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        
        const csvHeaders = "Nome,Telefone,Status,Digital,Interesse\n";
        const csvRows = data.leads.map(l => `${l.name},${l.phone},${l.status},${l.signature_key},"${l.interesse}"`).join("\n");
        
        const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_leads_souza_producoes.csv`;
        a.click();
    } catch (err) {
        alert("Erro ao gerar backup.");
    }
}

/**
 * Sair do sistema
 */
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

/**
 * Utilitário de segurança
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicia o sistema
document.addEventListener('DOMContentLoaded', init);
