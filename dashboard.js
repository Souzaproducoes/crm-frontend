// ============================================================
// ISIS AI AGENT CRM - DASHBOARD
// ============================================================

const API_URL = 'https://crm-api-guales.vercel.app';

// Estado Global
let leads = [];
let selectedLead = null;
let currentFilter = 'all';
let refreshInterval = null;
let lastLoadTime = null;

// Elementos do DOM
const leadsList = document.getElementById('leadsList');
const detailPanel = document.getElementById('detailPanel');
const companyName = document.getElementById('companyName');
const companyPlan = document.getElementById('companyPlan');
const lastUpdateTime = document.getElementById('lastUpdateTime');
const filterBtns = document.querySelectorAll('.filter-btn');
const toastContainer = document.getElementById('toastContainer');

// Stats elements
const statTotal = document.getElementById('statTotal');
const statNovos = document.getElementById('statNovos');
const statAtendimento = document.getElementById('statAtendimento');
const statConvertidos = document.getElementById('statConvertidos');

// Count elements
const countAll = document.getElementById('countAll');
const countNovo = document.getElementById('countNovo');
const countAtendimento = document.getElementById('countAtendimento');
const countConvertido = document.getElementById('countConvertido');

// ============================================================
// VERIFICAR AUTENTICAÇÃO
// ============================================================
const token = localStorage.getItem('crm_token');
const company = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) {
    window.location.href = 'index.html';
}

// ============================================================
// MAPEAMENTO DE STATUS
// ============================================================
const STATUS_LABELS = {
    'new': '🔵 Novo',
    'contacted': '🟡 Contatado',
    'qualified': '🟢 Qualificado',
    'proposal': '📄 Proposta',
    'negotiation': '💰 Negociação',
    'won': '✅ Fechado',
    'lost': '❌ Perdido',
    'nurturing': '🌱 Nutrição'
};

const STATUS_CSS = {
    'new': 'status-novo',
    'contacted': 'status-em-atendimento',
    'qualified': 'status-convertido',
    'proposal': 'status-em-atendimento',
    'negotiation': 'status-em-atendimento',
    'won': 'status-convertido',
    'lost': 'status-perdido',
    'nurturing': 'status-novo'
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function init() {
    companyName.textContent = company.name || 'Empresa';
    companyPlan.textContent = company.plan || 'Free';
    loadLeads();
    startAutoRefresh();
    setupFilterListeners();
}

// ============================================================
// EVENT LISTENERS PARA FILTROS
// ============================================================
function setupFilterListeners() {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderLeads();
        });
    });
}

// ============================================================
// CARREGAR LEADS
// ============================================================
async function loadLeads() {
    const refreshBtn = document.querySelector('.btn-refresh');
    if (refreshBtn) refreshBtn.classList.add('spinning');

    try {
        const response = await fetch(`${API_URL}/api/leads`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                showToast('Sessão expirada. Faça login novamente.', 'error');
                logout();
                return;
            }
            throw new Error('Erro ao carregar leads');
        }

        const data = await response.json();
        leads = data.leads || [];

        lastLoadTime = new Date();
        updateLastUpdateTime();
        updateStats();
        updateFilterCounts();
        renderLeads();

        if (leads.length > 0) {
            showToast(`${leads.length} lead(s) carregado(s)`, 'success');
        }

    } catch (error) {
        console.error('Erro:', error);
        leadsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-title">Erro ao carregar</div>
                <div class="empty-state-text">
                    Não foi possível carregar os leads.<br>
                    <button class="btn-refresh" onclick="loadLeads()" style="margin-top: 12px;">
                        Tentar novamente
                    </button>
                </div>
            </div>
        `;
        showToast('Erro ao carregar leads', 'error');
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
}

// ============================================================
// ATUALIZAR STATS
// ============================================================
function updateStats() {
    statTotal.textContent = leads.length;
    statNovos.textContent = leads.filter(l => l.status === 'new').length;
    statAtendimento.textContent = leads.filter(l => ['contacted', 'qualified'].includes(l.status)).length;
    statConvertidos.textContent = leads.filter(l => ['won', 'proposal', 'negotiation'].includes(l.status)).length;
}

// ============================================================
// ATUALIZAR CONTADORES DOS FILTROS
// ============================================================
function updateFilterCounts() {
    countAll.textContent = leads.length;
    countNovo.textContent = leads.filter(l => l.status === 'new').length;
    countAtendimento.textContent = leads.filter(l => ['contacted', 'qualified'].includes(l.status)).length;
    countConvertido.textContent = leads.filter(l => ['won', 'proposal', 'negotiation'].includes(l.status)).length;
}

// ============================================================
// ATUALIZAR TEMPO DE ATUALIZAÇÃO
// ============================================================
function updateLastUpdateTime() {
    if (lastLoadTime) {
        const now = new Date();
        const diff = Math.floor((now - lastLoadTime) / 1000);
        
        if (diff < 60) {
            lastUpdateTime.textContent = 'Atualizado agora';
        } else if (diff < 3600) {
            const minutes = Math.floor(diff / 60);
            lastUpdateTime.textContent = `Atualizado há ${minutes}m`;
        } else {
            const hours = Math.floor(diff / 3600);
            lastUpdateTime.textContent = `Atualizado há ${hours}h`;
        }
    }
}

// ============================================================
// RENDERIZAR LISTA DE LEADS
// ============================================================
function renderLeads() {
    const filtered = filterLeads(leads);

    if (filtered.length === 0) {
        leadsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-title">Nenhum lead encontrado</div>
                <div class="empty-state-text">
                    ${currentFilter === 'all'
                        ? 'Os leads aparecerão aqui quando recebidos'
                        : `Não há leads com status "${currentFilter}"`}
                </div>
            </div>
        `;
        return;
    }

    leadsList.innerHTML = filtered.map(lead => {
        const statusLabel = STATUS_LABELS[lead.status] || '🔵 Novo';
        const statusCss = STATUS_CSS[lead.status] || 'status-novo';
        const phoneFormatted = formatPhone(lead.phone || lead.whatsapp);
        const leadDate = formatDate(lead.created_at);

        return `
            <div class="lead-item ${selectedLead?.id === lead.id ? 'selected' : ''}"
                onclick="selectLead('${lead.id}')">
                <div class="lead-header">
                    <span class="lead-name">📞 ${escapeHtml(lead.name)}</span>
                    <span class="lead-status ${statusCss}">${statusLabel}</span>
                </div>
                <div class="lead-info">
                    <div style="margin-bottom: 4px; color: #94a3b8; font-size: 12px;">
                        ${escapeHtml(lead.company_name || lead.email || 'Sem empresa')}
                    </div>
                    <div style="color: #e2e8f0; font-weight: 500; margin-bottom: 4px;">
                        ${escapeHtml(lead.job_title || lead.industry || 'Sem cargo')}
                    </div>
                    <span class="lead-date">📅 ${leadDate}</span>
                </div>
            </div>
        `;
    }).join('');

    // Atualizar contador do painel
    document.getElementById('leadsCount').textContent = filtered.length;
}

// ============================================================
// FORMATAR TELEFONE
// ============================================================
function formatPhone(phone) {
    if (!phone) return 'Não informado';
    const numero = phone.replace(/\D/g, '');
    
    if (numero.length === 13 && numero.startsWith('55')) {
        const ddd = numero.substring(2, 4);
        const parte1 = numero.substring(4, 9);
        const parte2 = numero.substring(9, 13);
        return `+55 (${ddd}) ${parte1}-${parte2}`;
    }
    
    if (numero.length === 11) {
        const ddd = numero.substring(0, 2);
        const parte1 = numero.substring(2, 7);
        const parte2 = numero.substring(7, 11);
        return `(${ddd}) ${parte1}-${parte2}`;
    }
    
    return phone;
}

// ============================================================
// FILTRAR LEADS
// ============================================================
function filterLeads(leads) {
    if (currentFilter === 'all') return leads;
    return leads.filter(lead => lead.status === currentFilter);
}

// ============================================================
// SELECIONAR LEAD
// ============================================================
async function selectLead(leadId) {
    selectedLead = leads.find(l => l.id === leadId);
    if (!selectedLead) return;
    renderLeads();
    await loadLeadDetails(selectedLead.id);
}

// ============================================================
// CARREGAR DETALHES DO LEAD
// ============================================================
async function loadLeadDetails(leadId) {
    try {
        // Aqui você pode buscar mensagens se tiver a API
        const messages = [];
        renderLeadDetails(messages);
    } catch (error) {
        console.error('Erro:', error);
        if (selectedLead) {
            detailPanel.innerHTML = `
                <div class="detail-header">
                    <h3 class="detail-title">👤 ${escapeHtml(selectedLead.name)}</h3>
                    ${buildStatusSelect(selectedLead)}
                </div>
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <div class="empty-state-text">Erro ao carregar detalhes</div>
                </div>
            `;
        }
    }
}

// ============================================================
// BUILD STATUS SELECT
// ============================================================
function buildStatusSelect(lead) {
    const options = Object.entries(STATUS_LABELS).map(([value, label]) => {
        const selected = lead.status === value ? 'selected' : '';
        return `<option value="${value}" ${selected}>${label}</option>`;
    }).join('');

    return `<select class="status-select" onchange="updateStatus('${lead.id}', this.value)">${options}</select>`;
}

// ============================================================
// RENDERIZAR DETALHES DO LEAD
// ============================================================
function renderLeadDetails(messages) {
    if (!selectedLead) return;

    const phoneFormatted = formatPhone(selectedLead.phone || selectedLead.whatsapp);
    const statusLabel = STATUS_LABELS[selectedLead.status] || '🔵 Novo';

    detailPanel.innerHTML = `
        <div class="detail-header">
            <h3 class="detail-title">👤 ${escapeHtml(selectedLead.name)}</h3>
            ${buildStatusSelect(selectedLead)}
        </div>

        <div style="padding: 16px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; margin-bottom: 16px;">
            <div style="margin-bottom: 12px;">
                <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">📧 Email</div>
                <div style="color: #e2e8f0; font-size: 14px;">${escapeHtml(selectedLead.email || 'Não informado')}</div>
            </div>
            <div style="margin-bottom: 12px;">
                <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">📱 Telefone</div>
                <div style="color: #e2e8f0; font-size: 14px;">${escapeHtml(phoneFormatted)}</div>
            </div>
            <div style="margin-bottom: 12px;">
                <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">🏢 Empresa</div>
                <div style="color: #e2e8f0; font-size: 14px;">${escapeHtml(selectedLead.company_name || 'Não informado')}</div>
            </div>
            <div>
                <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">💼 Cargo</div>
                <div style="color: #e2e8f0; font-size: 14px;">${escapeHtml(selectedLead.job_title || 'Não informado')}</div>
            </div>
        </div>

        <div style="padding: 16px; background: rgba(30, 41, 59, 0.3); border-radius: 8px; margin-bottom: 16px;">
            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">📋 Origem</div>
            <div style="color: #cbd5e1; font-size: 14px;">${escapeHtml(selectedLead.source || 'Manual')}</div>
        </div>

        ${selectedLead.notes ? `
            <div style="padding: 16px; background: rgba(30, 41, 59, 0.3); border-radius: 8px; margin-bottom: 16px;">
                <div style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">📝 Observações</div>
                <div style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">${escapeHtml(selectedLead.notes)}</div>
            </div>
        ` : ''}

        <div class="messages-section">
            <h4 class="section-title">
                📨 Histórico de Mensagens
                <span style="margin-left: 8px; padding: 2px 8px; background: rgba(59, 130, 246, 0.1); border-radius: 10px; font-size: 10px; color: #93c5fd;">
                    ${messages.length} mensagens
                </span>
            </h4>
            <div class="messages-list">
                ${messages.length === 0 ? `
                    <div class="empty-state" style="padding: 30px 10px;">
                        <div class="empty-state-icon">💬</div>
                        <div class="empty-state-text">Nenhuma mensagem no histórico</div>
                    </div>
                ` : messages.map(msg => `
                    <div class="message ${msg.direction === 'inbound' ? 'inbound' : 'outbound'}">
                        <div class="message-header">
                            <span>${msg.direction === 'inbound' ? '📥 Recebida' : '📤 Enviada'}</span>
                            <span>${formatDateTime(msg.created_at)}</span>
                        </div>
                        <div class="message-content">${escapeHtml(msg.content || '')}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================================
// ATUALIZAR STATUS DO LEAD
// ============================================================
async function updateStatus(leadId, newStatus) {
    try {
        const response = await fetch(`${API_URL}/api/leads`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: leadId, status: newStatus })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar status');
        }

        if (selectedLead) {
            selectedLead.status = newStatus;
            const idx = leads.findIndex(l => l.id === leadId);
            if (idx !== -1) leads[idx].status = newStatus;
        }

        updateStats();
        updateFilterCounts();
        renderLeads();

        if (selectedLead && selectedLead.id === leadId) {
            renderLeadDetails([]);
        }

        const statusNames = STATUS_LABELS[newStatus] || newStatus;
        showToast(`Status atualizado para "${statusNames}"`, 'success');

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar status. Tente novamente.', 'error');
    }
}

// ============================================================
// AUTO-REFRESH A CADA 30 SEGUNDOS
// ============================================================
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(async () => {
        await loadLeads();
        if (selectedLead) {
            await loadLeadDetails(selectedLead.id);
        }
    }, 30000);
}

// ============================================================
// LOGOUT
// ============================================================
function logout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_company');
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    window.location.href = 'index.html';
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : '⚠️'}</span>
        <span class="toast-message">${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function formatDate(dateString) {
    if (!dateString) return 'Data não disponível';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// CLEANUP
// ============================================================
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// ============================================================
// INICIAR APLICAÇÃO
// ============================================================
init();