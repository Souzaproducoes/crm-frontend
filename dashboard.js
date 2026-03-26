const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let leads = [];
let selectedLead = null;

const token = localStorage.getItem('crm_token');
const companyData = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) window.location.href = 'index.html';

function init() {
    let name = companyData.name || 'Minha Empresa';
    // Correção automática do erro de digitação
    if (name.toLowerCase().includes("preocu")) name = "Souza Produções";
    
    document.getElementById('companyName').textContent = name;
    document.getElementById('companyPlan').textContent = companyData.plan || 'FREE';
    loadLeads();
}

async function loadLeads() {
    try {
        const res = await fetch(`${API_URL}/api/leads`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        leads = data.leads || [];
        renderDashboard();
    } catch (err) { console.error(err); }
}

function renderDashboard() {
    document.getElementById('statTotal').textContent = leads.length;
    document.getElementById('statNovos').textContent = leads.filter(l => l.status === 'novo').length;
    document.getElementById('statAtendimento').textContent = leads.filter(l => l.status === 'em_atendimento').length;
    document.getElementById('statConvertidos').textContent = leads.filter(l => l.status === 'convertido').length;
    document.getElementById('countAll').textContent = leads.length;

    document.getElementById('leadsList').innerHTML = leads.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <strong>👤 ${l.name || 'Sem nome'}</strong>
            <span>📞 ${l.phone || 'N/A'}</span>
        </div>
    `).join('');
}

function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    renderDashboard();
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px;">
            <h2>${selectedLead.name}</h2>
            <p>${selectedLead.phone}</p>
            <div style="background:#00000033; padding:20px; border-radius:15px; margin:20px 0;">
                <label style="color:#6366f1; font-size:11px;">INTERESSE</label>
                <p>${selectedLead.interesse || 'Nenhum'}</p>
            </div>
            <a href="https://wa.me/${selectedLead.phone}" target="_blank" style="display:block; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold;">Chamar no WhatsApp</a>
        </div>`;
}

async function exportarDados() {
    try {
        const res = await fetch(`${API_URL}/api/export`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const csv = "Nome,Telefone,Email,Status,Interesse\n" + data.leads.map(l => `${l.name},${l.phone},${l.email},${l.status},"${l.interesse}"`).join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_isis_crm.csv`;
        a.click();
    } catch (err) { alert("Erro ao exportar"); }
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }
init();
