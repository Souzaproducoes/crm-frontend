// ============================================================
// ISIS AI AGENT CRM - LOGIN & REGISTER
// ============================================================

const API_URL = 'https://crm-api-guales.vercel.app';

// Elementos do DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const registerSuccess = document.getElementById('registerSuccess');
const tabBtns = document.querySelectorAll('.tab-btn');

// ============================================================
// VERIFICAR SE JÁ ESTÁ LOGADO
// ============================================================
if (localStorage.getItem('crm_token')) {
    window.location.href = 'dashboard.html';
}

// ============================================================
// TABS - Alternar entre Login e Registro
// ============================================================
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Atualizar tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Mostrar formulário correto
        loginForm.classList.remove('active');
        registerForm.classList.remove('active');
        
        if (tab === 'login') {
            loginForm.classList.add('active');
        } else {
            registerForm.classList.add('active');
        }
        
        // Limpar mensagens
        hideMessages();
    });
});

// ============================================================
// LOGIN HANDLER
// ============================================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Loading state
    setLoading(loginBtn, true);
    hideMessages();
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
        }
        
        // Salvar token e dados
        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('crm_company', JSON.stringify(data.company));
        
        // Redirecionar
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        showError(loginError, error.message);
        setLoading(loginBtn, false);
    }
});

// ============================================================
// REGISTER HANDLER
// ============================================================
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const companyName = document.getElementById('registerCompany').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const industry = document.getElementById('registerIndustry').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;
    
    // Validações
    if (password.length < 6) {
        showError(registerError, 'A senha deve ter no mínimo 6 caracteres');
        return;
    }
    
    if (password !== confirm) {
        showError(registerError, 'As senhas não coincidem');
        return;
    }
    
    if (!acceptTerms) {
        showError(registerError, 'Você precisa aceitar os termos de uso');
        return;
    }
    
    // Loading state
    setLoading(registerBtn, true);
    hideMessages();
    
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyName,
                email,
                phone,
                industry,
                password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao criar conta');
        }
        
        // Sucesso
        showSuccess(registerSuccess, 'Conta criada com sucesso! Redirecionando...');
        
        // Aguardar 2 segundos e ir para login
        setTimeout(() => {
            tabBtns[0].click(); // Voltar para aba de login
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = password;
        }, 2000);
        
    } catch (error) {
        showError(registerError, error.message);
        setLoading(registerBtn, false);
    }
});

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function setLoading(btn, loading) {
    btn.disabled = loading;
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    
    if (loading) {
        btnText.classList.add('hidden');
        btnLoading.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function showSuccess(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideMessages() {
    loginError.classList.add('hidden');
    registerError.classList.add('hidden');
    registerSuccess.classList.add('hidden');
}

// Format phone on input
document.getElementById('registerPhone')?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        e.target.value = value;
    }
});