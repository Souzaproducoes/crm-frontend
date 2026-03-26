const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let leads = [];
let selectedLead = null;
let currentFilter = 'all';

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

// Navegação entre abas
function switchTab(tabId) {
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`btn-${tabId}`).classList.add('active');
}

// Filtro por clique nos cards
function setFilter(filter) {
    currentFilter = filter;
    switchTab('dashboard'); // Garante que volta pro dash ao filtrar
    renderAll();
}

function renderAll() {
    // 1. Atualizar Stats
    document.getElementById('statTotal').textContent = leads.length;
    document.getElementById('statNovos').textContent = leads.filter(l => l.status === 'novo').length;
    document.getElementById('statAtendimento').textContent = leads.filter(l => l.status === 'em_atendimento').length;
    document.getElementById('statConvertidos').textContent = leads.filter(l => l.status === 'convertido').length;

    // 2. Renderizar Dashboard (Filtra baseado no currentFilter)
    const filteredLeads = currentFilter === 'all' ? leads : leads.filter(l => l.status === currentFilter);
    document.getElementById('countCurrent').textContent = filteredLeads.length;
    
    document.getElementById('leadsList').innerHTML = filteredLeads.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <strong>👤 ${l.name}</strong>
            <span>📞 ${l.phone}</span>
        </div>
    `).join('');

    // 3. Renderizar Tabela (Aba Leads)
    document.getElementById('tableBody').innerHTML = leads.map(l => `
        <tr>
            <td>${l.name}</td>
            <td>${l.phone}</td>
            <td><span class="plan-badge">${l.status}</span></td>
            <td style="font-family:monospace; color:#10b981">${l.signature_key || 'ORIGINAL'}</td>
            <td><button onclick="selectLead(${l.id})" style="background:var(--accent); color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer">Ver</button></td>
        </tr>
    `).join('');

    // 4. Renderizar Kanban
    const cols = {
        'novo': document.getElementById('col-novo'),
        'em_atendimento': document.getElementById('col-atendimento'),
        'convertido': document.getElementById('col-convertido')
    };
    Object.values(cols).forEach(c => c.innerHTML = "");
    leads.forEach(l => {
        if(cols[l.status]) {
            cols[l.status].innerHTML += `<div class="kanban-card" onclick="selectLead(${l.id})"><strong>${l.name}</strong><br><small>${l.phone}</small></div>`;
        }
    });
}

function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    switchTab('dashboard');
    renderAll();
    
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px;">
            <div style="display:flex; justify-content:space-between;">
                <h2>${selectedLead.name}</h2>
                <div style="text-align:right"><small>DIGITAL SP</small><br><strong style="color:#10b981">${selectedLead.signature_key || 'VALIDA'}</strong></div>
            </div>
            <p>${selectedLead.phone}</p>
            <div style="background:#00000033; padding:20px; border-radius:15px; margin:20px 0;">
                <p>${selectedLead.interesse || 'Sem observações.'}</p>
            </div>
            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone}" target="_blank" style="flex:2; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold;">WhatsApp</a>
                <select onchange="updateStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; padding:10px;">
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
    await fetch(`${API_URL}/api/leads`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
    });
    loadLeads();
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }
init();
