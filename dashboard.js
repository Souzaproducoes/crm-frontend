// ============================================
// ISIS AI AGENT CRM - DASHBOARD PREMIUM
// ============================================
const API_URL = 'https://crm-api-isisaiagent.vercel.app';

// Estado global
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

// Auth
const token = localStorage.getItem('crm_token');
const companyData = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) {
    window.location.href = 'index.html';
}

// Inicialização
function init() {
    let name = companyData.name || 'Minha Empresa';
    
    // CORREÇÃO VISUAL AUTOMÁTICA
    // Se o nome gravado no banco tiver o erro "Preocupações", exibimos o correto
    if (name.toLowerCase().includes("preocup")) {
        name = "Souza Produções";
    }
    
    if (companyName) companyName.textContent = name;
    if (companyPlan) companyPlan.textContent = companyData.plan || 'FREE';
    
    loadLeads();
    // Refresh automático a cada 60 segundos
    setInterval(loadLeads, 60000); 
}

// Carregar leads da API
async function loadLeads() {
    try {
        const response = await fetch(`${API_URL}/api/leads`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) logout();
            throw new Error('Erro ao carregar dados');
        }

        const data = await response.json();
        leads = data.leads || [];
        renderDashboard();

    } catch (error) {
        console.error('Erro:', error);
    }
}

// Renderizar painel e estatísticas
function renderDashboard() {
    // Atualizar Números
    if (statTotal) statTotal.textContent = leads.length;
    if (statNovos) statNovos.textContent = leads.filter(l => l.status === 'novo').length;
    if (statAtendimento) statAtendimento.textContent = leads.filter(l => l.status === 'em_atendimento' || l.status === 'contacted').length;
    if (statConvertidos) statConvertidos.textContent = leads.filter(l => l.status === 'convertido').length;

    const countAll = document.getElementById('countAll');
    if (countAll) countAll.textContent = leads.length;

    // Renderizar Lista lateral
    if (leadsList) {
        leadsList.innerHTML = leads.map(lead => `
            <div class="lead-card ${selectedLead?.id === lead.id ? 'selected' : ''}" 
                 onclick="selectLead(${lead.id})">
                <strong>👤 ${escapeHtml(lead.name || 'Sem nome')}</strong>
                <span>📞 ${lead.phone || 'Não informado'}</span>
                <div style="margin-top:8px; font-size:10px; font-weight:bold; color:#6366f1;">
                    ${lead.status.toUpperCase()}
                </div>
            </div>
        `).join('');
    }
}

// Selecionar lead e mostrar detalhes
function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    renderDashboard();
    renderDetails();
}

// Painel de detalhes (Direita)
function renderDetails() {
    if (!selectedLead || !detailPanel) return;

    const lead = selectedLead;
    detailPanel.innerHTML = `
        <div style="padding: 30px; animation: fadeIn 0.3s ease;">
            <h2 style="margin-bottom:5px; color:#f8fafc;">${escapeHtml(lead.name || 'Sem nome')}</h2>
            <p style="color:#94a3b8; margin-bottom:25px;">${lead.phone || ''}</p>
            
            <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:15px; border:1px solid rgba(255,255,255,0.05); margin-bottom:25px;">
                <h4 style="font-size:11px; color:#6366f1; text-transform:uppercase; margin-bottom:10px; letter-spacing:1px;">Interesse / Notas</h4>
                <p style="line-height:1.6; color:#cbd5e1;">${escapeHtml(lead.interesse || 'Nenhum detalhe adicional.')}</p>
            </div>

            <div style="display:flex; gap:12px;">
                <a href="https://wa.me/${lead.phone ? lead.phone.replace(/\D/g,'') : ''}" 
                   target="_blank" 
                   style="flex:1; background:#25d366; color:white; text-decoration:none; text-align:center; padding:15px; border-radius:12px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px;">
                   <span>💬</span> WhatsApp
                </a>
                <button onclick="alert('Funcionalidade de edição em breve!')" 
                        style="flex:1; background:#334155; border:1px solid rgba(255,255,255,0.1); color:white; border-radius:12px; cursor:pointer; font-weight:600;">
                        Editar Status
                </button>
            </div>
        </div>
    `;
}

// Logout
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Segurança
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Iniciar
document.addEventListener('DOMContentLoaded', init);
