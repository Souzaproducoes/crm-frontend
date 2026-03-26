const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let leads = [];
let selectedLead = null;

const token = localStorage.getItem('crm_token');
const companyData = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) window.location.href = 'index.html';

function init() {
    let name = companyData.name || 'Empresa';
    if (name.toLowerCase().includes("preocu")) name = "Souza Produções";
    document.getElementById('companyName').textContent = name;
    loadLeads();
}

async function loadLeads() {
    try {
        const res = await fetch(`${API_URL}/api/leads`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        leads = data.leads || [];
        renderAll();
    } catch (err) { console.error(err); }
}

// Alternar Abas
function switchTab(tabId, btn) {
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    btn.classList.add('active');
    renderAll();
}

function renderAll() {
    renderDashboard(); // Dashboard Lateral
    renderTable();     // Aba de Gestão
    renderKanban();    // Funil de Vendas
}

// 1. Renderiza Dashboard Lateral
function renderDashboard() {
    document.getElementById('statTotal').textContent = leads.length;
    document.getElementById('statNovos').textContent = leads.filter(l => l.status === 'novo').length;
    document.getElementById('statAtendimento').textContent = leads.filter(l => l.status === 'em_atendimento').length;
    document.getElementById('statConvertidos').textContent = leads.filter(l => l.status === 'convertido').length;
    document.getElementById('leadsList').innerHTML = leads.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <strong>👤 ${l.name}</strong>
            <span>📞 ${l.phone}</span>
        </div>
    `).join('');
}

// 2. Renderiza Tabela de Leads
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = leads.map(l => `
        <tr>
            <td>${l.name}</td>
            <td>${l.phone}</td>
            <td><span class="plan-badge">${l.status}</span></td>
            <td>${l.interesse || '-'}</td>
            <td><button onclick="selectLead(${l.id})" style="background:var(--accent); border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">Ver</button></td>
        </tr>
    `).join('');
}

// 3. Renderiza Kanban
function renderKanban() {
    const cols = {
        'novo': document.getElementById('col-novo'),
        'em_atendimento': document.getElementById('col-atendimento'),
        'convertido': document.getElementById('col-convertido')
    };
    
    // Limpa colunas
    Object.values(cols).forEach(c => c.innerHTML = "");

    leads.forEach(l => {
        const card = `
            <div class="kanban-card" onclick="selectLead(${l.id})">
                <strong>${l.name}</strong>
                <small>${l.phone}</small>
            </div>
        `;
        if (cols[l.status]) cols[l.status].innerHTML += card;
    });
}

function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    // Abre a aba dashboard se não estiver nela
    const dashBtn = document.querySelector('button[onclick*="dashboard"]');
    switchTab('dashboard', dashBtn);
    
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px;">
            <h2>${selectedLead.name}</h2>
            <p>${selectedLead.phone}</p>
            <div style="background:#00000033; padding:20px; border-radius:15px; margin:20px 0;">
                <label style="color:#6366f1; font-size:11px; font-weight:bold;">HISTÓRICO / INTERESSE</label>
                <p style="margin-top:10px;">${selectedLead.interesse || 'Sem notas'}</p>
            </div>
            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone}" target="_blank" style="flex:1; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold;">WhatsApp</a>
                <select onchange="updateLeadStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; border:1px solid var(--border); padding:10px;">
                    <option value="">Mudar Status</option>
                    <option value="novo">Novo</option>
                    <option value="em_atendimento">Em Contato</option>
                    <option value="convertido">Fechado</option>
                </select>
            </div>
        </div>`;
}

async function updateLeadStatus(id, newStatus) {
    if (!newStatus) return;
    try {
        await fetch(`${API_URL}/api/leads`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });
        loadLeads(); // Recarrega tudo
    } catch (err) { alert("Erro ao atualizar status"); }
}

async function exportarDados() { /* Mesmo código de exportar que você já tem */ }
function logout() { localStorage.clear(); window.location.href = 'index.html'; }
init();
