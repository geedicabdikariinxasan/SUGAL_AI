let currentChatId = null;
let allUserChats = [];
let attachedFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    renderTopAuthNav();
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

function renderTopAuthNav() {
    const user = getUserData();
    const topAuthArea = document.getElementById('topAuthArea');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const welcomeName = document.getElementById('welcomeName');

    if (!topAuthArea) return;

    if (user && user.email) {
        const userName = user.fullName || user.full_name || user.name || 'Hassan Abdikariin';
        const initial = userName.charAt(0).toUpperCase();

        topAuthArea.innerHTML = `
            <div class="flex items-center gap-2 bg-[#06183d] px-2.5 py-1 rounded-2xl border border-cyan-500/20">
                <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white">${initial}</div>
                <p class="text-xs font-bold text-slate-200 hidden sm:block">${userName}</p>
            </div>
        `;

        if (welcomeName) welcomeName.textContent = userName;
        if (sidebarAvatar) sidebarAvatar.textContent = initial;
        if (sidebarUserName) sidebarUserName.textContent = userName;
    } else {
        topAuthArea.innerHTML = `
            <a href="login.html" class="px-2.5 py-1 border border-cyan-400/40 text-cyan-300 rounded-xl text-xs font-semibold">Login</a>
            <a href="register.html" class="px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-bold">Sign Up</a>
        `;
        if (welcomeName) welcomeName.textContent = "Friend";
    }
}

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
    const welcome = document.getElementById('welcomeBox');
    const messagesList = document.getElementById('messagesList');

    if (welcome) welcome.style.display = 'flex';
    if (messagesList) messagesList.innerHTML = '';
}

function newChat() {
    goHome();
    closeModal('historyModal');
}

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

// ================= 🚀 SEND MESSAGE (TOOS U QARI HELLO HASSAN) =================
async function sendMessage(e) {
    if (e) e.preventDefault();

    const user = getUserData();
    const input = document.getElementById('messageInput');
    let userPrompt = input ? input.value.trim() : '';

    if (!userPrompt && attachedFile) {
        userPrompt = "Fadlan iigu soo koob dukumentigan qodobada ugu muhiimsan.";
    }
    if (!userPrompt && !attachedFile) return;

    // 🚀 1. HELLO HASSAN & ROBOT-KA GEBI AHAANBA QARI
    const welcome = document.getElementById('welcomeBox');
    if (welcome) welcome.style.display = 'none';

    let uiMessage = userPrompt;
    let finalPromptToSend = userPrompt;

    if (attachedFile) {
        uiMessage = `📎 [Fayl: ${attachedFile.name}]\n\n${userPrompt}`;
        finalPromptToSend = `Dukumentiga magaciisu waa: '${attachedFile.name}'.\nQoraalka:\n"""\n${attachedFile.content}\n"""\n\nSu'aasha: ${userPrompt}`;
    }

    // 🚀 2. MUUJI FARIINTA QOFKA DHEXDA
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
            // 🚀 3. MUUJI JAWAABTA AI-GA
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
    const list = document.getElementById('messagesList');
    if (!list) return;

    const div = document.createElement('div');
    div.className = `p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
        role === 'user' ? 'user-msg ml-auto text-white rounded-br-xs' : 'ai-msg mr-auto text-slate-100 rounded-bl-xs'
    }`;
    div.textContent = text;
    list.appendChild(div);

    scrollToBottom();
}

function appendTyping() {
    const id = 'typing_' + Date.now();
    const list = document.getElementById('messagesList');
    if (!list) return id;

    const div = document.createElement('div');
    div.id = id;
    div.className = 'ai-msg mr-auto p-3 rounded-2xl text-xs text-cyan-300 max-w-[85%] rounded-bl-xs flex items-center gap-2';
    div.innerHTML = `<span>✦ SUGAL AI is thinking...</span>`;
    list.appendChild(div);

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
        setTimeout(() => {
            chatArea.scrollTop = chatArea.scrollHeight;
        }, 50);
    }
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
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 cursor-pointer border border-cyan-500/10 transition" onclick="openChat('${chat.chat_id}')">
                    <div class="flex items-center gap-2 min-w-0">
                        <span>💬</span>
                        <p class="text-xs font-semibold text-slate-200 truncate max-w-[200px]">${chat.title}</p>
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

    const welcome = document.getElementById('welcomeBox');
    const messagesList = document.getElementById('messagesList');

    if (welcome) welcome.style.display = 'none';
    if (messagesList) messagesList.innerHTML = '';

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
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function logout() {
    localStorage.removeItem('user');
    location.reload();
}