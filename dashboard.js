const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let leads = [];
let selectedLead = null;
let currentFilter = 'all';

const token = localStorage.getItem('crm_token');
const companyData = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) window.location.href = 'index.html';

function init() {
    // Correção visual do nome
    let name = companyData.name || 'Minha Empresa';
    if (name.toLowerCase().includes("preocu")) name = "Souza Produções";
    document.getElementById('companyName').textContent = name;
    
    loadLeads();
    setInterval(loadLeads, 60000); // Atualiza a cada 1 min
}

async function loadLeads() {
    try {
        const res = await fetch(`${API_URL}/api/leads`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        leads = data.leads || [];
        renderAll();
    } catch (err) { console.error("Erro ao carregar:", err); }
}

// TROCA DE ABAS
function switchTab(tabId) {
    // 1. Esconde todas as abas
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    // 2. Remove 'active' de todos os botões da sidebar
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    // 3. Ativa a aba e o botão corretos
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`btn-${tabId}`).classList.add('active');
    
    renderAll();
}

// FILTRO RÁPIDO PELOS CARDS
function setFilter(filter) {
    currentFilter = filter;
    switchTab('dashboard'); // Sempre volta pro Dashboard ao filtrar por métricas
}

function renderAll() {
    // Atualizar Números Superiores
    document.getElementById('statTotal').textContent = leads.length;
    document.getElementById('statNovos').textContent = leads.filter(l => l.status === 'novo').length;
    document.getElementById('statAtendimento').textContent = leads.filter(l => l.status === 'em_atendimento').length;
    document.getElementById('statConvertidos').textContent = leads.filter(l => l.status === 'convertido').length;

    // 1. Render Dashboard (Lista Lateral)
    const filteredLeads = currentFilter === 'all' ? leads : leads.filter(l => l.status === currentFilter);
    document.getElementById('countCurrent').textContent = filteredLeads.length;
    document.getElementById('leadsList').innerHTML = filteredLeads.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <strong>👤 ${l.name}</strong>
            <span>📞 ${l.phone}</span>
        </div>
    `).join('');

    // 2. Render Tabela (Aba Todos os Leads)
    document.getElementById('tableBody').innerHTML = leads.map(l => `
        <tr>
            <td>${l.name}</td>
            <td>${l.phone}</td>
            <td><span style="font-size:10px; background:rgba(99, 102, 241, 0.2); padding:2px 6px; border-radius:4px;">${l.status.toUpperCase()}</span></td>
            <td style="font-family:monospace; color:#10b981; font-size:12px;">${l.signature_key || 'ORIGINAL'}</td>
            <td><button onclick="selectLead(${l.id})" style="background:var(--accent); color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Ver</button></td>
        </tr>
    `).join('');

    // 3. Render Kanban (Aba Pipeline)
    const cols = {
        'novo': document.getElementById('col-novo'),
        'em_atendimento': document.getElementById('col-atendimento'),
        'convertido': document.getElementById('col-convertido')
    };
    // Limpa colunas antes de preencher
    Object.values(cols).forEach(c => { if(c) c.innerHTML = ""; });

    leads.forEach(l => {
        const targetCol = cols[l.status];
        if (targetCol) {
            targetCol.innerHTML += `
                <div class="kanban-card" onclick="selectLead(${l.id})">
                    <strong>${l.name}</strong>
                    <small style="display:block; color:var(--text-muted); margin-top:5px;">${l.phone}</small>
                </div>
            `;
        }
    });
}

function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    switchTab('dashboard'); // Abre o dashboard para mostrar os detalhes
    
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px; animation: fadeIn 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h2 style="margin:0;">${selectedLead.name}</h2>
                    <p style="color:var(--text-muted);">${selectedLead.phone}</p>
                </div>
                <div style="text-align:right">
                    <small style="color:var(--text-muted)">DIGITAL SP</small><br>
                    <strong style="color:#10b981; font-family:monospace;">${selectedLead.signature_key || 'VALIDA'}</strong>
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:15px; margin:25px 0;">
                <label style="color:var(--accent); font-size:11px; font-weight:bold; text-transform:uppercase;">Interesse registrado</label>
                <p style="margin-top:10px; line-height:1.6;">${selectedLead.interesse || 'Nenhum detalhe informado.'}</p>
            </div>

            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone.replace(/\D/g,'')}" target="_blank" style="flex:2; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold;">Chamar no WhatsApp</a>
                <select onchange="updateStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; border:1px solid var(--border); padding:10px; cursor:pointer;">
                    <option value="">Status</option>
                    <option value="novo">Novo</option>
                    <option value="em_atendimento">Aberto</option>
                    <option value="convertido">Ganho</option>
                </select>
            </div>
        </div>`;
}

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
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_souza_producoes.csv`;
        a.click();
    } catch (err) { alert("Erro ao exportar"); }
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }

// Iniciar sistema
document.addEventListener('DOMContentLoaded', init);
