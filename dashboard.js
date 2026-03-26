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
    } catch (err) { console.error("Erro ao carregar:", err); }
}

function switchTab(tabId, btn) {
    // Esconde todas as abas
    document.querySelectorAll('.content-tab').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    // Mostra a aba clicada
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.style.display = 'flex';
    btn.classList.add('active');
}

function renderAll() {
    // Atualizar Contadores
    document.getElementById('statTotal').textContent = leads.length;
    document.getElementById('statNovos').textContent = leads.filter(l => l.status === 'novo').length;
    document.getElementById('statAtendimento').textContent = leads.filter(l => l.status === 'em_atendimento').length;
    document.getElementById('statConvertidos').textContent = leads.filter(l => l.status === 'convertido').length;

    // Renderizar Lista Lateral (Dashboard)
    document.getElementById('leadsList').innerHTML = leads.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <strong>👤 ${l.name}</strong>
            <span>📞 ${l.phone}</span>
        </div>
    `).join('');

    // Renderizar Tabela (Aba Leads)
    document.getElementById('tableBody').innerHTML = leads.map(l => `
        <tr>
            <td>${l.name}</td>
            <td>${l.phone}</td>
            <td><span class="plan-badge">${l.status}</span></td>
            <td style="font-family: monospace; color: #10b981;">${l.signature_key || 'GERANDO...'}</td>
            <td><button class="refresh-circle" onclick="selectLead(${l.id})">👁️</button></td>
        </tr>
    `).join('');

    // Renderizar Kanban
    const colNovo = document.getElementById('col-novo');
    const colAtend = document.getElementById('col-atendimento');
    const colConv = document.getElementById('col-convertido');
    
    colNovo.innerHTML = ""; colAtend.innerHTML = ""; colConv.innerHTML = "";

    leads.forEach(l => {
        const card = `<div class="kanban-card" onclick="selectLead(${l.id})"><strong>${l.name}</strong><br><small>${l.phone}</small></div>`;
        if (l.status === 'novo') colNovo.innerHTML += card;
        else if (l.status === 'em_atendimento') colAtend.innerHTML += card;
        else if (l.status === 'convertido') colConv.innerHTML += card;
    });
}

function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    switchTab('dashboard', document.querySelector('.nav-btn')); // Volta pro dash para ver detalhes
    
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h2 style="margin:0;">${selectedLead.name}</h2>
                    <p style="color:var(--text-muted);">${selectedLead.phone}</p>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:10px; color:var(--text-muted);">ID DE VERIFICAÇÃO (DIGITAL)</span>
                    <div style="font-family:monospace; color:#10b981; font-weight:bold; background:#10b98111; padding:5px 10px; border-radius:5px; border:1px solid #10b98133;">
                        ${selectedLead.signature_key || 'ORIGINAL'}
                    </div>
                </div>
            </div>

            <div style="background:#00000033; padding:20px; border-radius:15px; margin:20px 0;">
                <label style="color:#6366f1; font-size:11px; font-weight:bold;">HISTÓRICO DO LEAD</label>
                <p style="margin-top:10px; line-height:1.6;">${selectedLead.interesse || 'Nenhum interesse registrado.'}</p>
            </div>

            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone}" target="_blank" style="flex:2; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold;">Chamar no WhatsApp</a>
                <select onchange="updateStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; border:1px solid var(--border); padding:10px;">
                    <option value="">Mudar Status</option>
                    <option value="novo">Novo</option>
                    <option value="em_atendimento">Em Atendimento</option>
                    <option value="convertido">Fechado/Ganho</option>
                </select>
            </div>
        </div>`;
}

async function updateStatus(id, status) {
    if (!status) return;
    await fetch(`${API_URL}/api/leads`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
    });
    loadLeads();
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }
init();
