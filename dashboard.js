// ============================================
// ISIS AI AGENT CRM - DASHBOARD COMPLETO
// ============================================
const API_URL = 'https://crm-api-isisaiagent.vercel.app';

// Estado global
let leads = [];
let selectedLead = null;
let currentFilter = 'all';
let refreshInterval = null;
let lastLoadTime = null;

// Elementos DOM
const leadsList = document.getElementById('leadsList');
const detailPanel = document.getElementById('detailPanel');
const companyName = document.getElementById('companyName');
const companyPlan = document.getElementById('companyPlan');
const lastUpdateTime = document.getElementById('lastUpdateTime');
const filterBtns = document.querySelectorAll('.filter-btn');
const toastContainer = document.getElementById('toastContainer');

// Stats
const statTotal = document.getElementById('statTotal');
const statNovos = document.getElementById('statNovos');
const statAtendimento = document.getElementById('statAtendimento');
const statConvertidos = document.getElementById('statConvertidos');

// Counts
const countAll = document.getElementById('countAll');
const countNovo = document.getElementById('countNovo');
const countAtendimento = document.getElementById('countAtendimento');
const countConvertido = document.getElementById('countConvertido');

// Auth
const token = localStorage.getItem('crm_token');
const company = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) {
    window.location.href = 'index.html';
}

// Mapeamento de status
const STATUS_LABELS = {
    'novo': '🔵 Novo',
    'em_atendimento': '🟡 Em Atendimento', 
    'convertido': '🟢 Convertido',
    'perdido': '⚫ Perdido',
    'contacted': '📞 Contactado',
    'qualified': '✅ Qualificado'
};

const STATUS_CSS = {
    'novo': 'status-novo',
    'em_atendimento': 'status-em-atendimento',
    'convertido': 'status-convertido',
    'perdido': 'status-perdido',
    'contacted': 'status-em-atendimento',
    'qualified': 'status-convertido'
};

// Inicialização
function init() {
    companyName.textContent = company.name || 'Empresa';
    companyPlan.textContent = company.plan || 'Free';
    loadLeads();
    startAutoRefresh();
    setupFilterListeners();
}

// Filtros
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

// Carregar leads da API
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

// Atualizar estatísticas
function updateStats() {
    statTotal.textContent = leads.length;
    statNovos.textContent = leads.filter(l => l.status === 'novo').length;
    statAtendimento.textContent = leads.filter(l => l.status === 'em_atendimento' || l.status === 'contacted').length;
    statConvertidos.textContent = leads.filter(l => l.status === 'convertido' || l.status === 'qualified').length;
}

// Atualizar contadores dos filtros
function updateFilterCounts() {
    countAll.textContent = leads.length;
    countNovo.textContent = leads.filter(l => l.status === 'novo').length;
    countAtendimento.textContent = leads.filter(l => l.status === 'em_atendimento').length;
    countConvertido.textContent = leads.filter(l => l.status === 'convertido').length;
}

// Atualizar tempo
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

// Renderizar lista de leads (AGORA COM NOME PRINCIPAL)
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
        
        // NOME DO LEAD (CAMPO PRINCIPAL)
        const leadName = lead.name || 'Sem nome';
        
        // Telefone formatado
        const phoneFormatted = formatPhone(lead.phone || lead.whatsapp || '');
        
        // Empresa do lead (se houver)
        const companyText = lead.company_name ? `🏢 ${lead.company_name}` : '';
        
        // Cargo (se houver)
        const jobText = lead.job_title ? `💼 ${lead.job_title}` : '';
        
        // Cidade/Estado
        const locationText = (lead.city && lead.state) ? `📍 ${lead.city}/${lead.state}` : '';
        
        // Interesse resumido
        const interesseResumo = lead.interesse 
            ? lead.interesse.substring(0, 50) + (lead.interesse.length > 50 ? '...' : '')
            : (lead.notes ? lead.notes.substring(0, 50) + '...' : 'Sem descrição');

        return `
            <div class="lead-item ${selectedLead?.id === lead.id ? 'selected' : ''}"
                 onclick="selectLead(${lead.id})" data-id="${lead.id}">
                <div class="lead-header">
                    <span class="lead-name" style="font-weight: 600; color: #f1f5f9; font-size: 15px;">
                        👤 ${escapeHtml(leadName)}
                    </span>
                    <span class="lead-status ${statusCss}">
                        ${statusLabel}
                    </span>
                </div>
                <div class="lead-info" style="margin-top: 8px;">
                    ${companyText ? `<div style="margin-bottom: 4px; color: #60a5fa; font-size: 13px; font-weight: 500;">${escapeHtml(companyText)}</div>` : ''}
                    ${jobText ? `<div style="margin-bottom: 4px; color: #94a3b8; font-size: 12px;">${escapeHtml(jobText)}</div>` : ''}
                    <div style="margin-bottom: 4px; color: #cbd5e1; font-size: 13px;">
                        📞 ${phoneFormatted}
                    </div>
                    ${locationText ? `<div style="margin-bottom: 4px; color: #64748b; font-size: 12px;">${escapeHtml(locationText)}</div>` : ''}
                    <div style="color: #e2e8f0; font-size: 13px; font-style: italic; margin-top: 6px;">
                        "${escapeHtml(interesseResumo)}"
                    </div>
                    <span class="lead-date" style="margin-top: 8px; display: block; font-size: 11px; color: #64748b;">
                        📅 ${formatDate(lead.created_at)}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// Formatar telefone
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

// Filtrar leads
function filterLeads(leads) {
    if (currentFilter === 'all') return leads;
    const normalized = currentFilter.replace(/-/g, '_');
    return leads.filter(lead => lead.status === normalized);
}

// Selecionar lead (agora usando ID numérico)
function selectLead(leadId) {
    selectedLead = leads.find(l => l.id === leadId);
    if (!selectedLead) return;
    renderLeads();
    loadLeadDetails(leadId);
}

// Carregar detalhes do lead e mensagens
async function loadLeadDetails(leadId) {
    try {
        // Buscar mensagens deste lead
        const response = await fetch(`${API_URL}/api/messages?lead_id=${leadId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let messages = [];
        if (response.ok) {
            messages = await response.json();
        }

        renderLeadDetails(messages);

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        renderLeadDetails([]);
    }
}

// Renderizar painel de detalhes (COMPLETO COM NOME)
function renderLeadDetails(messages) {
    if (!selectedLead) return;

    const lead = selectedLead;
    const leadName = lead.name || 'Sem nome';
    const phoneFormatted = formatPhone(lead.phone || lead.whatsapp || '');
    const whatsappFormatted = formatPhone(lead.whatsapp || lead.phone || '');
    
    // Informações adicionais
    const emailText = lead.email ? `📧 ${lead.email}` : '';
    const companyText = lead.company_name ? `🏢 ${lead.company_name}` : '';
    const jobText = lead.job_title ? `💼 ${lead.job_title}` : '';
    const industryText = lead.industry ? `🏭 ${lead.industry}` : '';
    const locationText = (lead.city && lead.state) ? `📍 ${lead.city}, ${lead.state}` : '';
    
    const interesseCompleto = lead.interesse || lead.notes || 'Nenhuma descrição de interesse cadastrada';

    detailPanel.innerHTML = `
        <div class="detail-header" style="border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 20px;">
            <div style="flex: 1;">
                <h3 class="detail-title" style="font-size: 22px; margin-bottom: 6px; color: #f8fafc; font-weight: 700;">
                    👤 ${escapeHtml(leadName)}
                </h3>
                <div style="color: #60a5fa; font-size: 15px; font-weight: 500; margin-bottom: 4px;">
                    📞 ${phoneFormatted}
                </div>
                ${emailText ? `<div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">${escapeHtml(emailText)}</div>` : ''}
            </div>
            ${buildStatusSelect(lead)}
        </div>

        <div style="padding: 20px; background: rgba(30, 41, 59, 0.6); border-radius: 12px; margin-bottom: 20px; border: 1px solid #475569;">
            <div style="margin-bottom: 16px; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                📋 Informações do Lead
            </div>
            
            <div style="display: grid; gap: 10px; margin-bottom: 16px;">
                ${companyText ? `<div style="color: #e2e8f0; font-size: 14px;">${escapeHtml(companyText)}</div>` : ''}
                ${jobText ? `<div style="color: #cbd5e1; font-size: 13px;">${escapeHtml(jobText)}</div>` : ''}
                ${industryText ? `<div style="color: #94a3b8; font-size: 13px;">${escapeHtml(industryText)}</div>` : ''}
                ${locationText ? `<div style="color: #64748b; font-size: 13px;">${escapeHtml(locationText)}</div>` : ''}
            </div>

            <div style="margin-bottom: 8px; color: #e2e8f0; font-weight: 600; font-size: 14px;">
                📝 Interesse / Descrição:
            </div>
            <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px; padding: 12px; background: rgba(15, 23, 42, 0.5); border-radius: 8px;">
                ${escapeHtml(interesseCompleto)}
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="editLeadName(${lead.id}, '${escapeHtml(leadName)}')" 
                        style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                    ✏️ Editar Nome
                </button>
                <button onclick="editLeadInterest(${lead.id})" 
                        style="padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                    📝 Editar Interesse
                </button>
                <a href="https://wa.me/${lead.whatsapp || lead.phone}" target="_blank"
                   style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; text-decoration: none; transition: all 0.2s;">
                    💬 WhatsApp
                </a>
            </div>
        </div>

        <div class="messages-section">
            <h4 class="section-title" style="font-size: 14px; margin-bottom: 16px; color: #94a3b8; font-weight: 600;">
                📨 Histórico de Mensagens
                <span style="margin-left: 8px; padding: 4px 12px; background: rgba(59, 130, 246, 0.15); border-radius: 12px; font-size: 11px; color: #60a5fa; font-weight: 600;">${messages.length} mensagens</span>
            </h4>
            <div class="messages-list" style="display: flex; flex-direction: column; gap: 12px; max-height: 300px; overflow-y: auto;">
                ${messages.length === 0 ? `
                    <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                        <div class="empty-state-icon" style="font-size: 32px; margin-bottom: 8px;">💬</div>
                        <div class="empty-state-text" style="color: #64748b; font-size: 13px;">Nenhuma mensagem no histórico</div>
                    </div>
                ` : messages.map(msg => `
                    <div class="message ${msg.direction === 'inbound' ? 'inbound' : 'outbound'}" 
                         style="padding: 14px; border-radius: 12px; max-width: 85%; ${msg.direction === 'inbound' ? 'background: #1e293b; align-self: flex-start; border-bottom-left-radius: 4px;' : 'background: rgba(99, 102, 241, 0.2); align-self: flex-end; border-bottom-right-radius: 4px;'}">
                        <div class="message-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 11px; color: #64748b;">
                            <span style="font-weight: 600;">${msg.direction === 'inbound' ? '📥 Recebida' : '📤 Enviada'}</span>
                            <span>${formatDateTime(msg.created_at)}</span>
                        </div>
                        <div class="message-content" style="color: #f1f5f9; font-size: 14px; line-height: 1.5;">
                            ${escapeHtml(msg.content || '')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Editar nome do lead
async function editLeadName(leadId, currentName) {
    const newName = prompt('Digite o nome completo do lead:', currentName === 'Sem nome' ? '' : currentName);
    
    if (newName === null) return;
    
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
                id: leadId, 
                name: newName.trim() 
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar nome');
        }

        // Atualizar localmente
        if (selectedLead && selectedLead.id === leadId) {
            selectedLead.name = newName.trim();
        }
        const idx = leads.findIndex(l => l.id === leadId);
        if (idx !== -1) leads[idx].name = newName.trim();

        renderLeads();
        if (selectedLead && selectedLead.id === leadId) {
            renderLeadDetails([]);
            loadLeadDetails(leadId);
        }
        
        showToast('Nome atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar nome', 'error');
    }
}

// Editar interesse do lead
async function editLeadInterest(leadId) {
    const lead = leads.find(l => l.id === leadId);
    const currentInterest = lead?.interesse || '';
    const newInterest = prompt('Digite o interesse ou descrição:', currentInterest);
    
    if (newInterest === null) return;

    try {
        const response = await fetch(`${API_URL}/api/leads`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                id: leadId, 
                interesse: newInterest.trim() 
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar interesse');
        }

        if (lead) {
            lead.interesse = newInterest.trim();
        }
        if (selectedLead && selectedLead.id === leadId) {
            selectedLead.interesse = newInterest.trim();
        }

        renderLeads();
        if (selectedLead && selectedLead.id === leadId) {
            renderLeadDetails([]);
            loadLeadDetails(leadId);
        }
        
        showToast('Interesse atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar interesse', 'error');
    }
}

// Select de status
function buildStatusSelect(lead) {
    return `
        <select class="status-select" onchange="updateStatus(${lead.id}, this.value)" 
                style="padding: 8px 16px; border-radius: 8px; border: 1px solid #475569; background: #1e293b; color: #f1f5f9; font-size: 13px; cursor: pointer; font-weight: 500;">
            <option value="novo"           ${lead.status === 'novo'           ? 'selected' : ''}>🔵 Novo</option>
            <option value="contacted"      ${lead.status === 'contacted'      ? 'selected' : ''}>📞 Contactado</option>
            <option value="em_atendimento" ${lead.status === 'em_atendimento' ? 'selected' : ''}>🟡 Em Atendimento</option>
            <option value="qualified"      ${lead.status === 'qualified'      ? 'selected' : ''}>✅ Qualificado</option>
            <option value="convertido"     ${lead.status === 'convertido'     ? 'selected' : ''}>🟢 Convertido</option>
            <option value="perdido"        ${lead.status === 'perdido'        ? 'selected' : ''}>⚫ Perdido</option>
        </select>
    `;
}

// Atualizar status
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

        const lead = leads.find(l => l.id === leadId);
        if (lead) lead.status = newStatus;
        
        if (selectedLead && selectedLead.id === leadId) {
            selectedLead.status = newStatus;
        }

        updateStats();
        updateFilterCounts();
        renderLeads();

        if (selectedLead && selectedLead.id === leadId) {
            renderLeadDetails([]);
            loadLeadDetails(leadId);
        }

        const statusNames = {
            'novo': 'Novo',
            'contacted': 'Contactado',
            'em_atendimento': 'Em Atendimento',
            'qualified': 'Qualificado',
            'convertido': 'Convertido',
            'perdido': 'Perdido'
        };

        showToast(`Status atualizado: ${statusNames[newStatus] || newStatus}`, 'success');

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar status', 'error');
    }
}

// Auto-refresh
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

// Logout
function logout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_company');
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    window.location.href = 'index.html';
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `
        <span style="font-size: 20px;">${type === 'success' ? '✅' : '⚠️'}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utilitários
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

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(style);

// Cleanup
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// Iniciar
init();
