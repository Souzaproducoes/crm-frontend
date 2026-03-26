const API_URL = 'https://crm-api-isisaiagent.vercel.app';

// Elementos das Abas
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const msg = document.getElementById('msg');

// Alternar para Login
tabLogin.onclick = () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    msg.textContent = "";
};

// Alternar para Registro
tabRegister.onclick = () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    msg.textContent = "";
};

// Lógica de LOGIN
loginForm.onsubmit = async (e) => {
    e.preventDefault();
    msg.textContent = "Validando acesso...";
    msg.className = "message-box";

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro no login');

        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('crm_company', JSON.stringify(data.company));
        
        msg.textContent = "Acesso autorizado! Redirecionando...";
        msg.className = "message-box success";
        
        setTimeout(() => window.location.href = 'dashboard.html', 1000);

    } catch (err) {
        msg.textContent = err.message;
        msg.className = "message-box error";
    }
};

// Lógica de REGISTRO
registerForm.onsubmit = async (e) => {
    e.preventDefault();
    msg.textContent = "Criando conta...";

    const payload = {
        companyName: document.getElementById('regCompany').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value
    };

    try {
        const res = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao registrar');

        msg.textContent = "Conta criada! Agora clique em 'Entrar' e faça o login.";
        msg.className = "message-box success";
        registerForm.reset();

    } catch (err) {
        msg.textContent = err.message;
        msg.className = "message-box error";
    }
};