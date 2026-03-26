// index.js
const API_URL = 'https://crm-api-isisaiagent.vercel.app';

// Aguarda o HTML carregar 100% antes de rodar o JS
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema carregado. Iniciando escuta de botões...");

    // Captura dos elementos
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const msg = document.getElementById('msg');

    // VERIFICAÇÃO DE SEGURANÇA
    if (!tabLogin || !tabRegister) {
        console.error("ERRO CRÍTICO: Os botões de aba não foram encontrados no HTML!");
        return;
    }

    // Ação ao clicar em Login
    tabLogin.addEventListener('click', () => {
        console.log("Trocando para aba de Login");
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        if(msg) msg.textContent = "";
    });

    // Ação ao clicar em Registro
    tabRegister.addEventListener('click', () => {
        console.log("Trocando para aba de Registro");
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        if(msg) msg.textContent = "";
    });

    // Lógica do Formulário de Login
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            msg.textContent = "Validando...";
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const res = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erro no acesso');

                localStorage.setItem('crm_token', data.token);
                localStorage.setItem('crm_company', JSON.stringify(data.company));
                window.location.href = 'dashboard.html';
            } catch (err) {
                msg.textContent = err.message;
                msg.style.color = "#f87171";
            }
        };
    }

    // Lógica do Formulário de Registro
    if (registerForm) {
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

                msg.textContent = "Conta criada! Clique em 'Entrar' para logar.";
                msg.style.color = "#10b981";
                registerForm.reset();
            } catch (err) {
                msg.textContent = err.message;
                msg.style.color = "#f87171";
            }
        };
    }
});
