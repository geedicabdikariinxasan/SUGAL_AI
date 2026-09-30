let currentChatId = null;
let allUserChats = [];
let attachedFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuthStatus()) return;
    loadUserProfile();
    await loadUserHistory();
});

// ================= AUTH =================
function getUserData() {
    const userDataStr = localStorage.getItem('user');
    if (!userDataStr) return null;
    try { return JSON.parse(userDataStr); } catch (e) { return null; }
}

function checkAuthStatus() {
    const user = getUserData();
    if (!user || !user.email) {
        logout();
        return false;
    }
    return true;
}

function loadUserProfile() {
    const user = getUserData();
    if (!user) return;

    const userName = user.fullName || user.full_name || user.name || 'Hassan Abdirakim';
    const initial = userName.charAt(0).toUpperCase();

    document.getElementById('welcomeName') && (document.getElementById('welcomeName').textContent = userName);
    document.getElementById('topUserName') && (document.getElementById('topUserName').textContent = userName);
    document.getElementById('sidebarUserName') && (document.getElementById('sidebarUserName').textContent = userName);
    document.getElementById('topAvatar') && (document.getElementById('topAvatar').textContent = initial);
    document.getElementById('sidebarAvatar') && (document.getElementById('sidebarAvatar').textContent = initial);
}

// ================= ☰ MENU TOGGLE & OVERLAY =================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (sidebar) {
        sidebar.classList.toggle('open');
        const isOpen = sidebar.classList.contains('open');
        if (overlay) {
            overlay.style.display = isOpen ? 'block' : 'none';
        }
    }
}

function goHome() {
    currentChatId = null;
    removeAttachedFile();
    const welcome = document.getElementById('welcome');
    const chatArea = document.getElementById('chatArea');
    const quickActions = document.getElementById('quickActions');
    const messages = document.getElementById('messages');

    if (welcome) welcome.style.display = 'block';
    if (quickActions) quickActions.style.display = 'flex';
    if (chatArea) chatArea.style.display = 'none';
    if (messages) messages.innerHTML = '';
}

function newChat() {
    goHome();
    closeModal('historyModal');
}

// ================= CHAT LOGIC =================
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

    // Beddel muuqaalka una gudub Chat
    const welcome = document.getElementById('welcome');
    const chatArea = document.getElementById('chatArea');
    const quickActions = document.getElementById('quickActions');
    if (welcome) welcome.style.display = 'none';
    if (quickActions) quickActions.style.display = 'none';
    if (chatArea) chatArea.style.display = 'block';

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
                email: user ? user.email : '',
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

    const chatArea = document.getElementById('chatArea');
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
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

    const chatArea = document.getElementById('chatArea');
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
    return id;
}

function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ================= FILE UPLOAD =================
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
                        <p class="text-xs font-semibold text-slate-200 truncate max-w-[220px]">${chat.title}</p>
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
    const quickActions = document.getElementById('quickActions');
    const messages = document.getElementById('messages');

    if (welcome) welcome.style.display = 'none';
    if (quickActions) quickActions.style.display = 'none';
    if (chatArea) chatArea.style.display = 'block';
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
    window.location.href = 'login.html';
}