// Substitua a função renderLeadsList no seu dashboard.js por esta:

function renderLeadsList() {
    const list = document.getElementById('leadsList');
    if (!list) return;

    const filtered = currentFilter === 'all' ? leads : leads.filter(l => l.status === currentFilter);
    document.getElementById('countCurrent').textContent = filtered.length;

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-view" style="font-size:13px; opacity:0.5;">Nenhum lead nesta categoria.</div>`;
        return;
    }

    list.innerHTML = filtered.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <div class="lead-card-header">
                <span>👤</span> ${escapeHtml(l.name)}
            </div>
            <div class="lead-card-body">
                <span>📞</span> ${l.phone}
            </div>
            <div class="lead-card-badge">
                ${l.status.replace('_', ' ')}
            </div>
        </div>
    `).join('');
}

// Garanta que a função selectLead mantenha o switchTab corretamente:
function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    // Não usamos switchTab aqui se já estivermos no dashboard para não dar refresh visual à toa
    const activeTab = document.querySelector('.content-tab.active').id;
    if (activeTab !== 'tab-dashboard') {
        switchTab('dashboard');
    }
    
    renderAll();
    renderLeadDetailsArea(); // Função que desenha o lado direito
}

function renderLeadDetailsArea() {
    if (!selectedLead) return;
    
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px; animation: fadeIn 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h2 style="margin:0;">${escapeHtml(selectedLead.name)}</h2>
                    <p style="color:var(--text-muted); margin-top:5px;">${selectedLead.phone}</p>
                </div>
                <button onclick="executarIA('analyze')" id="btn-ai" style="background:linear-gradient(135deg, #6366f1, #a855f7); color:white; border:none; padding:10px 20px; border-radius:30px; cursor:pointer; font-weight:bold;">✨ Briefing Isis IA</button>
            </div>

            <div id="ai-briefing-result" style="display:none; margin-top:20px; padding:20px; background:rgba(99, 102, 241, 0.1); border:1px solid #6366f144; border-radius:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span id="ai-temp" style="font-size:10px; font-weight:bold; padding:4px 10px; border-radius:10px; color:white;"></span>
                    <span style="font-size:10px; color:var(--text-muted);">SCORE: <strong id="ai-score" style="color:white;"></strong></span>
                </div>
                <p id="ai-resumo" style="font-size:14px; line-height:1.6; color:#f1f5f9;"></p>
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                    <p id="ai-sugestao" style="font-size:13px; font-style:italic; color:#cbd5e1; margin-bottom:15px;"></p>
                    <button onclick="executarIA('message')" id="btn-msg-ia" style="width:100%; padding:12px; background:var(--accent); color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">🪄 Gerar Mensagem Personalizada</button>
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:15px; margin:25px 0; border:1px solid var(--border);">
                <label style="color:var(--accent); font-size:11px; font-weight:bold; text-transform:uppercase;">Interesse registrado</label>
                <p style="margin-top:10px; line-height:1.6;">${escapeHtml(selectedLead.interesse || 'Nenhum detalhe informado.')}</p>
            </div>

            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone.replace(/\D/g,'')}" target="_blank" style="flex:2; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold;">WhatsApp Direto</a>
                <select onchange="updateStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; border:1px solid var(--border); padding:10px;">
                    <option value="">Status</option>
                    <option value="novo">Novo</option>
                    <option value="em_atendimento">Em Aberto</option>
                    <option value="convertido">Ganho</option>
                </select>
            </div>
            <div style="height:50px;"></div>
        </div>`;
}
