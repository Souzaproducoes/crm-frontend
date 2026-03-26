const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let leads = [];
let selectedLead = null;

// Elementos DOM
const leadsList = document.getElementById('leadsList');
const detailPanel = document.getElementById('detailPanel');
const companyName = document.getElementById('companyName');
const companyPlan = document.getElementById('companyPlan');
const statTotal = document.getElementById('statTotal');
const statNovos = document.getElementById('statNovos');
const statAtendimento = document.getElementById('statAtendimento');
const statConvertidos = document.getElementById('statConvertidos');

const token = localStorage.getItem('crm_token');
const companyData = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) window.location.href = 'index.html';

function init() {
    // CORREÇÃO DO NOME DA EMPRESA
    let name = companyData.name || 'Minha Empresa';
    if (name.includes("Preocupações")) name = name.replace("Preocupações", "Produções");
    
    companyName.textContent = name;
    companyPlan.textContent = companyData.plan || 'FREE';
    loadLeads();
    setInterval(loadLeads, 60000); // Auto-refresh a cada 1 min
}

async function loadLeads() {
    try {
        const response = await fetch(`${API_URL}/api/leads`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        leads = data.leads || [];
        renderDashboard();
    } catch (err) {
        console.error("Erro ao carregar:", err);
    }
}

function renderDashboard() {
    // Atualizar Stats
    statTotal.textContent = leads.length;
    statNovos.textContent = leads.filter(l => l.status === 'novo').length;
    statAtendimento.textContent = leads.filter(l => l.status === 'em_atendimento').length;
    statConvertidos.textContent = leads.filter(l => l.status === 'convertido').length;
    document.getElementById('countAll').textContent = leads.length;

    // Renderizar Lista
    leadsList.innerHTML = leads.map(lead => `
        <div class="lead-card ${selectedLead?.id === lead.id ? 'selected' : ''}" onclick="selectLead(${lead.id})">
            <strong>👤 ${lead.name || 'Sem nome'}</strong>
            <span>📞 ${lead.phone || 'N/A'}</span>
            <div style="margin-top:8px; font-size:10px; color:var(--accent)">${lead.status.toUpperCase()}</div>
        </div>
    `).join('');
}

function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    renderDashboard();
    renderDetails();
}

function renderDetails() {
    if (!selectedLead) return;
    detailPanel.innerHTML = `
        <div style="padding: 30px;">
            <h2 style="margin-bottom:10px;">${selectedLead.name}</h2>
            <p style="color:var(--text-muted); margin-bottom:20px;">${selectedLead.phone}</p>
            
            <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:15px; margin-bottom:20px;">
                <h4 style="margin-bottom:10px; font-size:12px; color:var(--accent)">INTERESSE</h4>
                <p>${selectedLead.interesse || 'Nenhum detalhe informado'}</p>
            </div>

            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone}" target="_blank" style="flex:1; background:#25d366; color:white; text-decoration:none; text-align:center; padding:12px; border-radius:10px; font-weight:bold;">WhatsApp</a>
                <button onclick="alert('Funcionalidade em breve')" style="flex:1; background:var(--sidebar); border:1px solid var(--border); color:white; border-radius:10px; cursor:pointer;">Editar</button>
            </div>
        </div>
    `;
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

init();
