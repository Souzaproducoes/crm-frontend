// ============================================
// CONFIGURAÇÃO DA API
// ============================================
const API_URL = 'https://crm-api-gules.vercel.app';

// ============================================
// ESTADO GLOBAL
// ============================================
let leads = [];
let selectedLead = null;
let currentFilter = 'all';
let refreshInterval = null;
let lastLoadTime = null;

// ============================================
// ELEMENTOS DO DOM
// ============================================
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

// ============================================
// VERIFICAR AUTENTICAÇÃO
// ============================================
const token = localStorage.getItem('crm_token');
const company = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) {
    window.location.href = 'index.html';
}

// ============================================
// MAPEAMENTO DE STATUS
// ============================================
const STATUS_LABELS = {
    'novo': '🔵 Novo',
    'em_atendimento': '🟡 Em Atendimento',
    'convertido': '🟢 Convertido',
    'perdido': '⚫ Perdido'
};

const STATUS_CSS = {
    'novo': 'status-novo',
    'em_atendimento': 'status-em-atendimento',
    'convertido': 'status-convertido',
    'perdido': 'status-perdido'
};

// ============================================
// INICIALIZAÇÃO
// ============================================
function init() {
    companyName.textContent = company.name || 'Empresa';
    companyPlan.textContent = company.plan || 'Free';
    loadLeads();
    startAutoRefresh();
    setupFilterListeners();
}

// ============================================
// EVENT LISTENERS PARA FILTROS
// ============================================
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

// ============================================
// CARREGAR LEADS
// ============================================
async function loadLeads() {
    const refreshBtn = document.querySelector('.refresh-btn');
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
                    <button class="refresh-btn" onclick="loadLeads()" style="margin-top: 12px;">
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

// ============================================
// ATUALIZAR STATS
// ============================================
function updateStats() {
    statTotal.textContent = leads.length;
    statNovos.textContent = leads.filter(l => l.status === 'novo').length;
    statAtendimento.textContent = leads.filter(l => l.status === 'em_atendimento').length;
    statConvertidos.textContent = leads.filter(l => l.status === 'convertido').length;
}

// ============================================
// ATUALIZAR CONTADORES DOS FILTROS
// ============================================
function updateFilterCounts() {
    countAll.textContent = leads.length;
    countNovo.textContent = leads.filter(l => l.status === 'novo').length;
    countAtendimento.textContent = leads.filter(l => l.status === 'em_atendimento').length;
    countConvertido.textContent = leads.filter(l => l.status === 'convertido').length;
}

// ============================================
// ATUALIZAR TEMPO DE ATUALIZAÇÃO
// ============================================
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

// ============================================
// RENDERIZAR LISTA DE LEADS (COM NOME)
// ============================================
function renderLeads() {
    const filtered = filterLeads(leads);

    if (filtered.length === 0) {
        leadsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-title">Nenhum lead encontrado</div>
                <div class="empty-state-text">
                    ${currentFilter === 'all'
                        ? 'Os leads aparecerão aqui quando cadastrados'
                        : `Não há leads com status "${currentFilter}"`}
                </div>
            </div>
        `;
        return;
    }

    leadsList.innerHTML = filtered.map(lead => {
        const statusLabel = STATUS_LABELS[lead.status] || '🔵 Novo';
        const statusCss = STATUS_CSS[lead.status] || 'status-novo';
        
        // NOME DO LEAD (prioridade máxima)
        const leadName = lead.name || 'Sem nome';
        
        // Telefone formatado
        const phoneFormatted = formatPhone(lead.user_id);
        
        // Ícone do canal
        const canalIcon = lead.canal === 'whatsapp' ? '📱 WhatsApp' : '📧 Email';
        
        // Resumo do interesse
        const interesseResumo = lead.interesse 
            ? lead.interesse.substring(0, 45) + (lead.interesse.length > 45 ? '...' : '')
            : 'Sem descrição';

        return `
            <div class="lead-item ${selectedLead?.id === lead.id ? 'selected' : ''}"
                 onclick="selectLead('${lead.id}')">
                <div class="lead-header">
                    <span class="lead-name">👤 ${escapeHtml(leadName)}</span>
                    <span class="lead-status ${statusCss}">
                        ${statusLabel}
                    </span>
                </div>
                <div class="lead-info">
                    <div style="margin-bottom: 4px; color: #60a5fa; font-size: 13px; font-weight: 500;">
                        📞 ${phoneFormatted}
                    </div>
                    <div style="margin-bottom: 4px; color: #94a3b8; font-size: 12px;">
                        ${canalIcon}
                    </div>
                    <div style="color: #e2e8f0; font-size: 13px; margin-bottom: 4px;">
                        ${escapeHtml(interesseResumo)}
                    </div>
                    <span class="lead-date">📅 ${formatDate(lead.criado_em)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// FORMATAR TELEFONE
// ============================================
function formatPhone(userId) {
    if (!userId) return 'Não informado';
    
    const numero = userId.replace(/\D/g, '');
    
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
    
    return userId;
}

// ============================================
// FILTRAR LEADS
// ============================================
function filterLeads(leads) {
    if (currentFilter === 'all') return leads;
    const normalized = currentFilter.replace(/-/g, '_');
    return leads.filter(lead => lead.status === normalized);
}

// ============================================
// SELECIONAR LEAD
// ============================================
async function selectLead(leadId) {
    selectedLead = leads.find(l => l.id === leadId || l.user_id === leadId);
    if (!selectedLead) return;
    renderLeads();
    await loadLeadDetails(selectedLead.user_id || leadId);
}

// ============================================
// CARREGAR DETALHES DO LEAD
// ============================================
async function loadLeadDetails(userId) {
    try {
        const response = await fetch(`${API_URL}/api/messages?user_id=${encodeURIComponent(userId)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar mensagens');
        }

        const messages = await response.json();
        renderLeadDetails(messages);

    } catch (error) {
        console.error('Erro:', error);
        renderLeadDetails([]);
    }
}

// ============================================
// RENDERIZAR DETALHES (COM NOME EDITÁVEL)
// ============================================
function renderLeadDetails(messages) {
    if (!selectedLead) return;

    const leadName = selectedLead.name || 'Sem nome';
    const phoneFormatted = formatPhone(selectedLead.user_id);
    const canalIcon = selectedLead.canal === 'whatsapp' ? '📱 WhatsApp' : '📧 Email';
    const interesseCompleto = selectedLead.interesse || 'Nenhuma descrição de interesse';
    const ultimaMensagem = selectedLead.ultima_mensagem || 'Nenhuma mensagem registrada';

    detailPanel.innerHTML = `
        <div class="detail-header">
            <div>
                <h3 class="detail-title" style="margin-bottom: 4px;">👤 ${escapeHtml(leadName)}</h3>
                <div style="color: #60a5fa; font-size: 14px;">📞 ${phoneFormatted}</div>
            </div>
            ${buildStatusSelect(selectedLead)}
        </div>

        <div style="padding: 16px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; margin-bottom: 16px;">
            <div style="margin-bottom: 12px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${canalIcon} • ID: ${escapeHtml(selectedLead.user_id)}
            </div>
            
            <div style="margin-bottom: 8px; color: #e2e8f0; font-weight: 600;">
                📋 Interesse:
            </div>
            <div style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
                ${escapeHtml(interesseCompleto)}
            </div>

            <div style="display: flex; gap: 8px;">
                <button onclick="editLeadName('${selectedLead.user_id}', '${escapeHtml(leadName)}')" 
                        style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
                    ✏️ Editar Nome
                </button>
                <button onclick="editLeadInterest('${selectedLead.user_id}')" 
                        style="padding: 6px 12px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
                    📝 Editar Interesse
                </button>
            </div>
        </div>

        <div style="padding: 16px; background: rgba(30, 41, 59, 0.3); border-radius: 8px; margin-bottom: 16px;">
            <div style="color: #94a3b8; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                💬 Última mensagem
            </div>
            <div style="color: #cbd5e1; font-size: 14px; font-style: italic; line-height: 1.5;">
                "${escapeHtml(ultimaMensagem)}"
            </div>
        </div>

        <div class="messages-section">
            <h4 class="section-title">
                📨 Histórico Completo
                <span style="margin-left: 8px; padding: 2px 8px; background: rgba(59, 130, 246, 0.1); border-radius: 10px; font-size: 10px; color: #93c5fd;">${messages.length} mensagens</span>
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
                            <span>${formatDateTime(msg.criado_em || msg.created_at)}</span>
                        </div>
                        <div class="message-content">${escapeHtml(msg.content || msg.mensagem || '')}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================
// EDITAR NOME DO LEAD (NOVA FUNÇÃO)
// ============================================
async function editLeadName(userId, currentName) {
    const newName = prompt('Digite o nome do lead:', currentName === 'Sem nome' ? '' : currentName);
    
    if (newName === null) return; // Cancelou
    
    if (newName.trim() === '') {
        showToast('Nome não pode estar vazio', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/leads`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                user_id: userId, 
                name: newName.trim() 
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar nome');
        }

        // Atualizar localmente
        if (selectedLead) {
            selectedLead.name = newName.trim();
            const idx = leads.findIndex(l => (l.user_id || l.id) === userId);
            if (idx !== -1) leads[idx].name = newName.trim();
        }

        renderLeads();
        renderLeadDetails([]);
        await loadLeadDetails(userId);
        
        showToast('Nome atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar nome', 'error');
    }
}

// ============================================
// EDITAR INTERESSE DO LEAD
// ============================================
async function editLeadInterest(userId) {
    const currentInterest = selectedLead?.interesse || '';
    const newInterest = prompt('Digite o interesse/descrição:', currentInterest);
    
    if (newInterest === null) return;

    try {
        const response = await fetch(`${API_URL}/api/leads`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                user_id: userId, 
                interesse: newInterest.trim() 
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar interesse');
        }

        if (selectedLead) {
            selectedLead.interesse = newInterest.trim();
            const idx = leads.findIndex(l => (l.user_id || l.id) === userId);
            if (idx !== -1) leads[idx].interesse = newInterest.trim();
        }

        renderLeads();
        renderLeadDetails([]);
        await loadLeadDetails(userId);
        
        showToast('Interesse atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar interesse', 'error');
    }
}

// ============================================
// HELPER — GERA SELECT DE STATUS
// ============================================
function buildStatusSelect(lead) {
    const userId = lead.user_id || lead.id;
    return `
        <select class="status-select" onchange="updateStatus('${userId}', this.value)">
            <option value="novo"           ${lead.status === 'novo'           ? 'selected' : ''}>🔵 Novo</option>
            <option value="em_atendimento" ${lead.status === 'em_atendimento' ? 'selected' : ''}>🟡 Em Atendimento</option>
            <option value="convertido"     ${lead.status === 'convertido'     ? 'selected' : ''}>🟢 Convertido</option>
            <option value="perdido"        ${lead.status === 'perdido'        ? 'selected' : ''}>⚫ Perdido</option>
        </select>
    `;
}

// ============================================
// ATUALIZAR STATUS DO LEAD
// ============================================
async function updateStatus(userId, newStatus) {
    try {
        const response = await fetch(`${API_URL}/api/leads`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId, status: newStatus })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar status');
        }

        if (selectedLead) {
            selectedLead.status = newStatus;
            const idx = leads.findIndex(l => (l.user_id || l.id) === userId);
            if (idx !== -1) leads[idx].status = newStatus;
        }

        updateStats();
        updateFilterCounts();
        renderLeads();

        if (selectedLead && (selectedLead.user_id || selectedLead.id) === userId) {
            renderLeadDetails([]);
            await loadLeadDetails(userId);
        }

        const statusNames = {
            'novo': 'Novo',
            'em_atendimento': 'Em Atendimento',
            'convertido': 'Convertido',
            'perdido': 'Perdido'
        };

        showToast(`Status atualizado para "${statusNames[newStatus] || newStatus}"`, 'success');

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar status. Tente novamente.', 'error');
    }
}

// ============================================
// AUTO-REFRESH A CADA 30 SEGUNDOS
// ============================================
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    refreshInterval = setInterval(async () => {
        await loadLeads();
        if (selectedLead) {
            await loadLeadDetails(selectedLead.user_id || selectedLead.id);
        }
    }, 30000);
}

// ============================================
// LOGOUT
// ============================================
function logout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_company');
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    window.location.href = 'index.html';
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
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

// ============================================
// UTILITÁRIOS
// ============================================
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

// ============================================
// CLEANUP
// ============================================
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// ============================================
// INICIAR APLICAÇÃO
// ============================================
init();
