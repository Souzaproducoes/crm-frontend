const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let leads = [];
let selectedLead = null;
let currentFilter = 'all';

// Auth - Pega os dados salvos
const token = localStorage.getItem('crm_token');
const companyData = JSON.parse(localStorage.getItem('crm_company') || '{}');

if (!token) {
    window.location.href = 'index.html';
}

function init() {
    console.log("Iniciando Dashboard...");
    // 1. Correção visual do nome
    let name = companyData.name || 'Minha Empresa';
    if (name.toLowerCase().includes("preocu")) name = "Souza Produções";
    
    const nameEl = document.getElementById('companyName');
    if (nameEl) nameEl.textContent = name;
    
    // 2. Webhook
    updateWebhookInfo();
    
    // 3. Carregar dados
    loadLeads();
    
    // Auto-refresh a cada 2 minutos
    setInterval(loadLeads, 120000);
}

async function loadLeads() {
    try {
        console.log("Sincronizando com o banco de dados...");
        const res = await fetch(`${API_URL}/api/leads`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        
        if (!res.ok) throw new Error("Erro na API");
        
        const data = await res.json();
        leads = data.leads || [];
        console.log("Leads carregados:", leads.length);
        renderAll();
    } catch (err) { 
        console.error("Falha ao carregar leads:", err); 
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tabId}`);
    const targetBtn = document.getElementById(`btn-${tabId}`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
}

function setFilter(f) { 
    currentFilter = f; 
    switchTab('dashboard'); 
    renderAll(); 
}

function renderAll() {
    // Stats
    document.getElementById('statTotal').textContent = leads.length;
    document.getElementById('statNovos').textContent = leads.filter(l => l.status === 'novo').length;
    document.getElementById('statAtendimento').textContent = leads.filter(l => l.status === 'em_atendimento').length;
    document.getElementById('statConvertidos').textContent = leads.filter(l => l.status === 'convertido').length;

    // Lista Lateral
    const filtered = currentFilter === 'all' ? leads : leads.filter(l => l.status === currentFilter);
    const countEl = document.getElementById('countCurrent');
    if (countEl) countEl.textContent = filtered.length;
    
    document.getElementById('leadsList').innerHTML = filtered.map(l => `
        <div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
            <div class="lead-card-header"><span>👤</span> ${l.name}</div>
            <div class="lead-card-body"><span>📞</span> ${l.phone}</div>
            <div class="lead-card-badge">${l.status.toUpperCase()}</div>
        </div>
    `).join('');

    // Tabela
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = leads.map(l => `
            <tr>
                <td>${l.name}</td>
                <td>${l.phone}</td>
                <td><span class="plan-badge">${l.status}</span></td>
                <td style="color:#10b981; font-family:monospace;">${l.signature_key || 'SP-2026'}</td>
                <td><button onclick="selectLead(${l.id})" style="background:var(--accent); color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Ver</button></td>
            </tr>
        `).join('');
    }

    // Kanban
    const cols = { 
        'novo': document.getElementById('col-novo'), 
        'em_atendimento': document.getElementById('col-atendimento'), 
        'convertido': document.getElementById('col-convertido') 
    };
    Object.values(cols).forEach(c => { if(c) c.innerHTML = ""; });
    leads.forEach(l => { 
        if(cols[l.status]) {
            cols[l.status].innerHTML += `
                <div class="kanban-card" onclick="selectLead(${l.id})">
                    <strong>${l.name}</strong><br><small>${l.phone}</small>
                </div>`;
        }
    });
}

function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    if (!selectedLead) return;
    
    switchTab('dashboard');
    renderAll();
    
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px; padding-bottom:100px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div>
                    <h2 style="margin:0;">${selectedLead.name}</h2>
                    <p style="color:var(--text-muted);">${selectedLead.phone}</p>
                </div>
                <button onclick="executarIA('analyze')" id="btn-ai" style="background:linear-gradient(135deg, #6366f1, #a855f7); color:white; border:none; padding:10px 20px; border-radius:30px; cursor:pointer; font-weight:bold; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);">✨ Briefing Isis IA</button>
            </div>

            <div id="ai-briefing-result" style="display:none; margin-bottom:25px; padding:25px; background:rgba(99, 102, 241, 0.08); border:1px solid rgba(99, 102, 241, 0.3); border-radius:20px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center;">
                    <span id="ai-temp" style="font-size:10px; font-weight:800; padding:5px 12px; border-radius:30px; color:white;"></span>
                    <span style="font-size:10px; color:var(--text-muted);">SCORE: <strong id="ai-score" style="color:white;"></strong></span>
                </div>
                <p id="ai-resumo" style="font-size:15px; line-height:1.6; color:#f1f5f9; margin-bottom:15px;"></p>
                <div style="padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                    <small style="color:var(--accent); font-weight:800; text-transform:uppercase; font-size:10px; display:block; margin-bottom:8px;">💡 Estratégia de Escala</small>
                    <p id="ai-sugestao" style="color:#cbd5e1; font-size:13px; font-style:italic; line-height:1.4; margin-bottom:20px;"></p>
                    <button onclick="executarIA('message')" id="btn-msg-ia" style="width:100%; padding:15px; background:#6366f1; color:white; border:none; border-radius:12px; font-weight:700; cursor:pointer;">Gerar Abordagem Executiva</button>
                </div>
            </div>

            <div style="background:rgba(0,0,0,0.2); padding:20px; border-radius:15px; margin-bottom:25px; border:1px solid var(--border);">
                <label style="color:var(--accent); font-size:11px; font-weight:bold; text-transform:uppercase;">Interesse Original</label>
                <p style="margin-top:10px; line-height:1.6;">${selectedLead.interesse || 'Sem notas.'}</p>
            </div>

            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone.replace(/\D/g,'')}" target="_blank" style="flex:2; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold;">WhatsApp Direto</a>
                <select onchange="updateStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; border:1px solid var(--border); padding:10px;">
                    <option value="">Status</option>
                    <option value="novo">Novo</option>
                    <option value="em_atendimento">Aberto</option>
                    <option value="convertido">Ganho</option>
                </select>
            </div>
        </div>`;
}

async function executarIA(acao) {
    const btnAi = document.getElementById('btn-ai');
    const btnMsg = document.getElementById('btn-msg-ia');
    const resultBox = document.getElementById('ai-briefing-result');
    
    if (acao === 'analyze') { btnAi.textContent = "Isis pensando..."; btnAi.disabled = true; } 
    else { btnMsg.textContent = "Isis escrevendo..."; btnMsg.disabled = true; }

    try {
        const payload = { action: acao, leadName: selectedLead.name, leadInteresse: selectedLead.interesse, briefing: document.getElementById('ai-resumo')?.textContent || "" };
        const res = await fetch(`${API_URL}/api/ai`, { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        const data = await res.json();
        
        if (acao === 'analyze') {
            document.getElementById('ai-resumo').textContent = data.resumo;
            document.getElementById('ai-score').textContent = data.score + "/100";
            document.getElementById('ai-sugestao').textContent = data.sugestao;
            const temp = document.getElementById('ai-temp'); 
            temp.textContent = data.temperatura.toUpperCase();
            const t = data.temperatura.toLowerCase(); 
            temp.style.background = t.includes('quente') ? '#ef4444' : (t.includes('morno') ? '#fbbf24' : '#60a5fa');
            resultBox.style.display = 'block'; 
            btnAi.innerHTML = "✨ Briefing Atualizado";
        } else {
            // ENVIO LIMPO PARA WHATSAPP
            window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}?text=${encodeURIComponent(data.message.trim())}`, '_blank');
            btnMsg.innerHTML = "Gerar Abordagem Executiva";
        }
    } catch (err) { 
        alert("A Isis está descansando."); 
    } finally { 
        if (btnAi) btnAi.disabled = false; 
        if (btnMsg) btnMsg.disabled = false; 
    }
}

function updateWebhookInfo() { 
    const urlInput = document.getElementById('webhookUrl'); 
    if (urlInput && companyData.id) urlInput.value = `${API_URL}/api/webhook?id=${companyData.id}`; 
}

function copyWebhook() { 
    const copyText = document.getElementById("webhookUrl"); 
    copyText.select(); 
    navigator.clipboard.writeText(copyText.value); 
    alert("URL Copiada!"); 
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

async function exportarDados() { 
    try { 
        const res = await fetch(`${API_URL}/api/export`, { headers: { 'Authorization': `Bearer ${token}` } }); 
        const data = await res.json(); 
        const csv = "Nome,Telefone,Status\n" + data.leads.map(l => `${l.name},${l.phone},${l.status}`).join("\n"); 
        const blob = new Blob([csv], { type: 'text/csv' }); 
        const url = window.URL.createObjectURL(blob); 
        const a = document.createElement('a'); a.href = url; a.download = `backup_leads.csv`; a.click(); 
    } catch (err) { 
        alert("Erro ao exportar."); 
    } 
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

// Garante o início do sistema
document.addEventListener('DOMContentLoaded', init);
