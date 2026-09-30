let currentChatId = null;
let allUserChats = [];
let attachedFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Habee Top Bar & Profile Status (Guest vs User)
    renderTopAuthNav();

    // 2. Haddii uu qofku hore u soo galay, soo deji History
    const user = getUserData();
    if (user && user.email) {
        await loadUserHistory();
    }
});

function getUserData() {
    const userDataStr = localStorage.getItem('user');
    if (!userDataStr) return null;
    try { return JSON.parse(userDataStr); } catch (e) { return null; }
}

// ================= TOP NAVBAR & AUTH STATUS =================
function renderTopAuthNav() {
    const user = getUserData();
    const topAuthArea = document.getElementById('topAuthArea');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    const welcomeName = document.getElementById('welcomeName');
    const guestPromptBanner = document.getElementById('guestPromptBanner');

    if (!topAuthArea) return;

    if (user && user.email) {
        const userName = user.fullName || user.full_name || user.name || 'User';
        const initial = userName.charAt(0).toUpperCase();

        topAuthArea.innerHTML = `
            <div class="flex items-center gap-2 bg-[#06183d] px-3 py-1.5 rounded-2xl border border-cyan-500/20">
                <div class="avatar">${initial}</div>
                <div class="hidden sm:block text-left">
                    <p class="text-xs font-bold text-slate-200">${userName}</p>
                    <p class="text-[9px] text-emerald-400">● Online</p>
                </div>
            </div>
        `;

        if (welcomeName) welcomeName.textContent = userName;
        if (sidebarAvatar) sidebarAvatar.textContent = initial;
        if (sidebarUserName) sidebarUserName.textContent = userName;
        if (sidebarLogoutBtn) sidebarLogoutBtn.classList.remove('hidden');
        if (guestPromptBanner) guestPromptBanner.classList.add('hidden');

    } else {
        // Qofku waa Guest (Muuji Badhamada Login & Sign Up ee dusha sare)
        topAuthArea.innerHTML = `
            <button onclick="openAuthModal('login')" class="px-3 py-1.5 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10 rounded-xl text-xs font-semibold transition">
                Login
            </button>
            <button onclick="openAuthModal('register')" class="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold shadow-md transition">
                Sign Up
            </button>
        `;

        if (welcomeName) welcomeName.textContent = "Friend";
        if (sidebarAvatar) sidebarAvatar.textContent = "G";
        if (sidebarUserName) sidebarUserName.textContent = "Guest User";
        if (sidebarLogoutBtn) sidebarLogoutBtn.classList.add('hidden');
        if (guestPromptBanner) guestPromptBanner.classList.remove('hidden');
    }
}

// ================= AUTH MODAL (LOGIN & REGISTER) =================
function openAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('hidden');
        switchAuthTab(tab);
    }
}

function switchAuthTab(tab) {
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const modalLoginForm = document.getElementById('modalLoginForm');
    const modalRegisterForm = document.getElementById('modalRegisterForm');
    const authErrorMsg = document.getElementById('authErrorMsg');

    if (authErrorMsg) authErrorMsg.classList.add('hidden');

    if (tab === 'login') {
        tabLoginBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white";
        tabRegisterBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white";
        modalLoginForm.classList.remove('hidden');
        modalRegisterForm.classList.add('hidden');
    } else {
        tabRegisterBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white";
        tabLoginBtn.className = "flex-1 py-2 rounded-xl text-xs font-bold transition text-slate-400 hover:text-white";
        modalRegisterForm.classList.remove('hidden');
        modalLoginForm.classList.add('hidden');
    }
}

async function handleModalLogin(e) {
    e.preventDefault();
    const email = document.getElementById('modalLoginEmail').value.trim();
    const password = document.getElementById('modalLoginPassword').value.trim();
    const errorBox = document.getElementById('authErrorMsg');
    const btn = document.getElementById('modalLoginSubmitBtn');

    if (btn) { btn.disabled = true; btn.textContent = "Galayaa... ⏳"; }
    if (errorBox) errorBox.classList.add('hidden');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            localStorage.setItem('user', JSON.stringify(data.user));
            closeModal('authModal');
            renderTopAuthNav();
            await loadUserHistory();
        } else {
            if (errorBox) {
                errorBox.textContent = data.detail || "Email-ka ama Password-ka waa khalad!";
                errorBox.classList.remove('hidden');
            }
        }
    } catch (err) {
        if (errorBox) {
            errorBox.textContent = "Server-ka laguma xiri karin!";
            errorBox.classList.remove('hidden');
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Soo Gal (Login)"; }
    }
}

async function handleModalRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('modalRegName').value.trim();
    const email = document.getElementById('modalRegEmail').value.trim();
    const password = document.getElementById('modalRegPassword').value.trim();
    const errorBox = document.getElementById('authErrorMsg');
    const btn = document.getElementById('modalRegSubmitBtn');

    if (btn) { btn.disabled = true; btn.textContent = "Abuurayaa... ⏳"; }
    if (errorBox) errorBox.classList.add('hidden');

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password })
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            const loginRes = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok && loginData.status === 'success') {
                localStorage.setItem('user', JSON.stringify(loginData.user));
                closeModal('authModal');
                renderTopAuthNav();
                await loadUserHistory();
            }
        } else {
            if (errorBox) {
                errorBox.textContent = data.detail || "Diiwaangelintu kuma guuleysan!";
                errorBox.classList.remove('hidden');
            }
        }
    } catch (err) {
        if (errorBox) {
            errorBox.textContent = "Server-ka laguma xiri karin!";
            errorBox.classList.remove('hidden');
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Abuur Account (Register)"; }
    }
}

// ================= SIDEBAR & NAVIGATION =================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) {
        sidebar.classList.toggle('open');
        const isOpen = sidebar.classList.contains('open');
        if (overlay) overlay.style.display = isOpen ? 'block' : 'none';
    }
}

function goHome() {
    currentChatId = null;
    removeAttachedFile();
    const welcome = document.getElementById('welcome');
    const chatArea = document.getElementById('chatArea');
    const messages = document.getElementById('messages');

    if (welcome) welcome.classList.remove('hidden');
    if (chatArea) chatArea.classList.add('hidden');
    if (messages) messages.innerHTML = '';
}

function newChat() {
    goHome();
    closeModal('historyModal');
}

// ================= CHAT LOGIC (GUEST & USER) =================
function handleTopSearch(e) {
    if (e.key === 'Enter') {
        const topInput = document.getElementById('topSearch');
        if (topInput && topInput.value.trim()) {
            quickMessage(topInput.value.trim());
            topInput.value = '';
        }
    }
}

function quickMessage(text) {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value = text;
        sendMessage();
    }
}

async function sendMessage(e) {
    if (e) e.preventDefault();

    const user = getUserData();
    const input = document.getElementById('messageInput');
    let userPrompt = input ? input.value.trim() : '';

    if (!userPrompt && attachedFile) {
        userPrompt = "Fadlan iigu soo koob dukumentigan qodobada ugu muhiimsan.";
    }
    if (!userPrompt && !attachedFile) return;

    // Beddel shaashadda oo gal Chat View
    const welcome = document.getElementById('welcome');
    const chatArea = document.getElementById('chatArea');
    if (welcome) welcome.classList.add('hidden');
    if (chatArea) chatArea.classList.remove('hidden');

    let uiMessage = userPrompt;
    let finalPromptToSend = userPrompt;

    if (attachedFile) {
        uiMessage = `📎 [Fayl: ${attachedFile.name}]\n\n${userPrompt}`;
        finalPromptToSend = `Dukumentiga magaciisu waa: '${attachedFile.name}'.\nQoraalka:\n"""\n${attachedFile.content}\n"""\n\nSu'aasha: ${userPrompt}`;
    }

    appendMessage('user', uiMessage);
    if (input) input.value = '';
    removeAttachedFile();

    const typingId = appendTyping();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: finalPromptToSend,
                email: user ? user.email : 'guest@user.com',
                chat_id: currentChatId
            })
        });

        removeElement(typingId);

        if (response.ok) {
            const data = await response.json();
            currentChatId = data.chat_id;
            appendMessage('ai', data.reply || data.response || 'Haye!');
        } else {
            appendMessage('ai', 'Cillad ayaa dhacday, fadlan dib u tijaabi.');
        }
    } catch (err) {
        removeElement(typingId);
        appendMessage('ai', 'Server-ka laguma xiri karin!');
    }
}

function appendMessage(role, text) {
    const messages = document.getElementById('messages');
    if (!messages) return;

    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    div.textContent = text;
    messages.appendChild(div);

    scrollToBottom();
}

function appendTyping() {
    const id = 'typing_' + Date.now();
    const messages = document.getElementById('messages');
    if (!messages) return id;

    const div = document.createElement('div');
    div.id = id;
    div.className = 'message ai-message flex items-center gap-2';
    div.innerHTML = `<span>✦ SUGAL AI is thinking...</span>`;
    messages.appendChild(div);

    scrollToBottom();
    return id;
}

function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    const chatArea = document.getElementById('chatArea');
    if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

// ================= FILE ATTACH =================
async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const badge = document.getElementById('filePreviewBadge');
    const nameEl = document.getElementById('attachedFileName');
    if (badge && nameEl) {
        nameEl.textContent = `Akhrinayaa: ${file.name}...`;
        badge.classList.remove('hidden');
    }

    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/extract-file', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (res.ok && data.status === 'success') {
            attachedFile = { name: data.file_name, content: data.extracted_text };
            if (nameEl) nameEl.textContent = `📄 ${data.file_name} (Diyaar)`;
        } else {
            alert('Faylka lama akhriyi karin!');
            removeAttachedFile();
        }
    } catch (e) {
        alert('Cillad akhrinta faylka!');
        removeAttachedFile();
    }
}

function removeAttachedFile() {
    attachedFile = null;
    const badge = document.getElementById('filePreviewBadge');
    if (badge) badge.classList.add('hidden');
    document.getElementById('fileInput') && (document.getElementById('fileInput').value = '');
}

// ================= HISTORY =================
async function loadUserHistory() {
    const user = getUserData();
    if (!user || !user.email) return;

    try {
        const res = await fetch(`/api/chats/${encodeURIComponent(user.email.trim().toLowerCase())}`);
        const data = await res.json();
        if (data.status === 'success') {
            allUserChats = data.chats || [];
        }
    } catch (e) {
        console.error(e);
    }
}

function showHistory() {
    const user = getUserData();
    if (!user || !user.email) {
        openAuthModal('login');
        return;
    }

    const modal = document.getElementById('historyModal');
    const list = document.getElementById('modalHistoryList');
    if (!modal || !list) return;

    list.innerHTML = '';
    if (allUserChats.length === 0) {
        list.innerHTML = `<p class="text-center text-slate-400 py-6 text-xs">Wax sheekooyin hore ah lama helin.</p>`;
    } else {
        allUserChats.forEach(chat => {
            const item = `
                <div class="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-900/40 cursor-pointer border-b border-cyan-500/10 transition" onclick="openChat('${chat.chat_id}')">
                    <div class="flex items-center gap-2">
                        <span>💬</span>
                        <p class="text-xs font-semibold text-slate-200 truncate max-w-[220px]">${escapeHtml(chat.title)}</p>
                    </div>
                    <button onclick="deleteChat('${chat.chat_id}', event)" class="p-1 text-slate-400 hover:text-red-400">✕</button>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', item);
        });
    }

    modal.classList.remove('hidden');
}

async function openChat(chatId) {
    currentChatId = chatId;
    closeModal('historyModal');

    const welcome = document.getElementById('welcome');
    const chatArea = document.getElementById('chatArea');
    const messages = document.getElementById('messages');

    if (welcome) welcome.classList.add('hidden');
    if (chatArea) chatArea.classList.remove('hidden');
    if (messages) messages.innerHTML = '';

    try {
        const res = await fetch(`/api/chat/${chatId}`);
        const data = await res.json();
        if (data.status === 'success' && data.messages) {
            data.messages.forEach(msg => {
                appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteChat(chatId, e) {
    if (e) e.stopPropagation();
    if (!confirm('Ma hubtaa inaad tirtirto?')) return;

    try {
        await fetch(`/api/chat/${chatId}`, { method: 'DELETE' });
        allUserChats = allUserChats.filter(c => c.chat_id !== chatId);
        showHistory();
    } catch (err) {}
}

async function clearAllHistory() {
    const user = getUserData();
    if (!user || !user.email) return;
    if (!confirm('Ma hubtaa inaad tirtirto dhammaan?')) return;

    try {
        await fetch(`/api/chats/clear/${encodeURIComponent(user.email.trim().toLowerCase())}`, { method: 'DELETE' });
        allUserChats = [];
        goHome();
        closeModal('historyModal');
    } catch (e) {}
}

function showTools() { alert("AI Tools: Translator, Coding Assistant, & Essay Writer."); }
function showSettings() { alert("Settings: Ultra-Fast AI Engine Enabled."); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function logout() {
    localStorage.removeItem('user');
    location.reload();
}

function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}