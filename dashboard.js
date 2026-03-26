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
    updateWebhookInfo();
    loadLeads();
    setInterval(loadLeads, 120000);
}

async function loadLeads() {
    try {
        const res = await fetch(`${API_URL}/api/leads`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        leads = data.leads || [];
        renderAll();
    } catch (err) { console.error(err); }
}

function switchTab(tabId) {
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`btn-${tabId}`).classList.add('active');
}

function setFilter(f) { currentFilter = f; switchTab('dashboard'); renderAll(); }

function renderAll() {
    document.getElementById('statTotal').textContent = leads.length;
    document.getElementById('statNovos').textContent = leads.filter(l => l.status === 'novo').length;
    document.getElementById('statAtendimento').textContent = leads.filter(l => l.status === 'em_atendimento').length;
    document.getElementById('statConvertidos').textContent = leads.filter(l => l.status === 'convertido').length;

    const filtered = currentFilter === 'all' ? leads : leads.filter(l => l.status === currentFilter);
    document.getElementById('countCurrent').textContent = filtered.length;
    document.getElementById('leadsList').innerHTML = filtered.map(l => `<div class="lead-card ${selectedLead?.id === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})"><strong>👤 ${l.name}</strong><span>📞 ${l.phone}</span></div>`).join('');

    document.getElementById('tableBody').innerHTML = leads.map(l => `<tr><td>${l.name}</td><td>${l.phone}</td><td><span class="plan-badge">${l.status}</span></td><td style="color:#10b981; font-family:monospace;">${l.signature_key || 'SP-2026'}</td><td><button onclick="selectLead(${l.id})" style="background:var(--accent); color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Ver</button></td></tr>`).join('');

    const cols = { 'novo': document.getElementById('col-novo'), 'em_atendimento': document.getElementById('col-atendimento'), 'convertido': document.getElementById('col-convertido') };
    Object.values(cols).forEach(c => c.innerHTML = "");
    leads.forEach(l => { if(cols[l.status]) cols[l.status].innerHTML += `<div class="kanban-card" onclick="selectLead(${l.id})"><strong>${l.name}</strong><br><small>${l.phone}</small></div>`; });
}

function selectLead(id) {
    selectedLead = leads.find(l => l.id === id);
    switchTab('dashboard');
    renderAll();
    document.getElementById('detailPanel').innerHTML = `
        <div style="padding:30px;">
            <div style="display:flex; justify-content:space-between;">
                <h2>${selectedLead.name}</h2>
                <button onclick="executarIA('analyze')" id="btn-ai" style="background:linear-gradient(135deg, #6366f1, #a855f7); color:white; border:none; padding:10px 20px; border-radius:30px; cursor:pointer; font-weight:bold;">✨ Briefing Isis IA</button>
            </div>
            <p>${selectedLead.phone}</p>
            <div id="ai-briefing-result">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;"><span id="ai-temp" style="padding:5px 12px; border-radius:20px; font-size:10px; font-weight:800; color:white;"></span><span style="font-size:10px; color:var(--text-muted);">SCORE: <strong id="ai-score" style="color:white;"></strong></span></div>
                <p id="ai-resumo" style="font-size:14px; line-height:1.6; color:#f1f5f9;"></p>
                <div style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
                    <p id="ai-sugestao" style="font-size:13px; font-style:italic; color:#cbd5e1;"></p>
                    <button onclick="executarIA('message')" id="btn-msg-ia">🪄 Gerar Mensagem Personalizada</button>
                </div>
            </div>
            <div style="background:#00000033; padding:20px; border-radius:15px; margin:20px 0;"><p>${selectedLead.interesse || 'Sem notas.'}</p></div>
            <div style="display:flex; gap:10px;">
                <a href="https://wa.me/${selectedLead.phone.replace(/\D/g,'')}" target="_blank" style="flex:2; background:#25d366; color:white; text-align:center; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold;">WhatsApp</a>
                <select onchange="updateStatus(${selectedLead.id}, this.value)" style="flex:1; background:var(--sidebar); color:white; border-radius:12px; padding:10px;"><option value="">Status</option><option value="novo">Novo</option><option value="em_atendimento">Aberto</option><option value="convertido">Ganho</option></select>
            </div>
            <div style="height:50px;"></div>
        </div>`;
}

async function executarIA(acao) {
    const btnAi = document.getElementById('btn-ai');
    const btnMsg = document.getElementById('btn-msg-ia');
    const resultBox = document.getElementById('ai-briefing-result');
    if (acao === 'analyze') { btnAi.textContent = "Isis pensando..."; btnAi.disabled = true; } 
    else { btnMsg.textContent = "Escrevendo..."; btnMsg.disabled = true; }
    try {
        const res = await fetch(`${API_URL}/api/ai`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: acao, leadName: selectedLead.name, leadInteresse: selectedLead.interesse, briefing: document.getElementById('ai-resumo')?.textContent || "" })
        });
        const data = await res.json();
        if (acao === 'analyze') {
            document.getElementById('ai-resumo').textContent = data.resumo;
            document.getElementById('ai-score').textContent = data.score + "/100";
            document.getElementById('ai-sugestao').textContent = "💡 Próximo Passo: " + data.sugestao;
            const temp = document.getElementById('ai-temp'); temp.textContent = data.temperatura.toUpperCase();
            const t = data.temperatura.toLowerCase(); temp.style.background = t.includes('quente') ? '#ef4444' : (t.includes('morno') ? '#fbbf24' : '#60a5fa');
            resultBox.style.display = 'block'; btnAi.innerHTML = "✨ Briefing Atualizado";
        } else {
            window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}?text=${encodeURIComponent(data.message)}`, '_blank');
            btnMsg.innerHTML = "🪄 Gerar Mensagem Personalizada";
        }
    } catch (err) { alert("A Isis está descansando."); } finally { if (btnAi) btnAi.disabled = false; if (btnMsg) btnMsg.disabled = false; }
}

function updateWebhookInfo() { const urlInput = document.getElementById('webhookUrl'); if (urlInput && companyData.id) urlInput.value = `https://crm-api-isisaiagent.vercel.app/api/webhook?id=${companyData.id}`; }
function copyWebhook() { const copyText = document.getElementById("webhookUrl"); copyText.select(); navigator.clipboard.writeText(copyText.value); alert("Copiado!"); }
async function updateStatus(id, status) { if(!status) return; await fetch(`${API_URL}/api/leads`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); loadLeads(); }
async function exportarDados() { try { const res = await fetch(`${API_URL}/api/export`, { headers: { 'Authorization': `Bearer ${token}` } }); const data = await res.json(); const csv = "Nome,Telefone,Status,Digital\n" + data.leads.map(l => `${l.name},${l.phone},${l.status},${l.signature_key}`).join("\n"); const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `backup_leads.csv`; a.click(); } catch (err) { alert("Erro ao exportar."); } }
function logout() { localStorage.clear(); window.location.href = 'index.html'; }
document.addEventListener('DOMContentLoaded', init);
