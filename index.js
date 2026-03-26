const API_URL = 'https://crm-api-isisaiagent.vercel.app';
let mode = 'login';

const authForm = document.getElementById('authForm');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const registerFields = document.getElementById('registerOnlyFields');
const submitBtn = document.getElementById('submitBtn');
const msg = document.getElementById('msg');

tabLogin.onclick = () => {
    mode = 'login';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    registerFields.style.display = 'none';
    submitBtn.textContent = 'Entrar no Painel';
};

tabRegister.onclick = () => {
    mode = 'register';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerFields.style.display = 'block';
    submitBtn.textContent = 'Criar Conta Grátis';
};

authForm.onsubmit = async (e) => {
    e.preventDefault();
    msg.textContent = "Processando...";
    
    const payload = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    if (mode === 'register') {
        payload.companyName = document.getElementById('companyName').value;
    }

    const endpoint = mode === 'login' ? '/api/login' : '/api/register';

    try {
        const res = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro na requisição');

        if (mode === 'login') {
            localStorage.setItem('crm_token', data.token);
            localStorage.setItem('crm_company', JSON.stringify(data.company));
            window.location.href = 'dashboard.html';
        } else {
            msg.className = "msg-box msg-success";
            msg.textContent = "Conta criada! Mude para 'Entrar' e faça o login.";
        }

    } catch (err) {
        msg.className = "msg-box msg-error";
        msg.textContent = err.message;
    }
};
