let currentChatId = null;
let allUserChats = [];
let totalFilesUploaded = 0;
let attachedFile = null; // Faylka lagu xirayo su'aasha

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuthStatus()) return;
    loadUserProfile();
    // 🚀 Shaashad bannaan oo nadiif ah (Welcome screen) ayuu ku bilaabanayaa
    await loadUserHistory(false);
});

// ================= AUTH HELPERS =================

function getUserData() {
    const userDataStr = localStorage.getItem('user');
    if (!userDataStr) return null;
    try {
        return JSON.parse(userDataStr);
    } catch (e) {
        return null;
    }
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

    const userName = user.fullName || user.full_name || user.name || 'User';
    const userEmail = user.email || 'user@example.com';
    const initial = userName.charAt(0).toUpperCase();

    // Dashboard Elements
    document.getElementById('welcomeName') && (document.getElementById('welcomeName').textContent = `Hello, ${userName} 👋`);
    document.getElementById('topUserName') && (document.getElementById('topUserName').textContent = userName);
    document.getElementById('topUserEmail') && (document.getElementById('topUserEmail').textContent = userEmail);
    document.getElementById('topAvatar') && (document.getElementById('topAvatar').textContent = initial);
    document.getElementById('profileName') && (document.getElementById('profileName').textContent = userName);
    document.getElementById('profileEmail') && (document.getElementById('profileEmail').textContent = userEmail);
    document.getElementById('rightAvatar') && (document.getElementById('rightAvatar').textContent = initial);

    // Modal Profile Elements
    document.getElementById('modalAvatar') && (document.getElementById('modalAvatar').textContent = initial);
    document.getElementById('modalProfileName') && (document.getElementById('modalProfileName').textContent = userName);
    document.getElementById('modalProfileEmail') && (document.getElementById('modalProfileEmail').textContent = userEmail);
    document.getElementById('editFullName') && (document.getElementById('editFullName').value = userName);
}

// ================= HISTORY (Recent Chats) =================

async function loadUserHistory(autoOpenFirst = false) {
    const user = getUserData();
    if (!user || !user.email) return;

    try {
        const response = await fetch(`/api/chats/${encodeURIComponent(user.email.trim().toLowerCase())}`);
        const data = await response.json();

        if (data.status === "success") {
            allUserChats = data.chats || [];
            renderRecentChats(allUserChats);

            const chatCountEl = document.getElementById('chatCount');
            if (chatCountEl) chatCountEl.textContent = allUserChats.length;

            if (autoOpenFirst && allUserChats.length > 0 && !currentChatId) {
                openChat(allUserChats[0].chat_id);
            }
        }
    } catch (error) {
        console.error("Error loading chat history:", error);
    }
}

function renderRecentChats(chats) {
    const recentChatsContainer = document.getElementById('recentChats');
    if (!recentChatsContainer) return;

    if (!chats || chats.length === 0) {
        recentChatsContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Wax sheekooyin ah weli ma jiraan</p>`;
        return;
    }

    recentChatsContainer.innerHTML = '';

    chats.slice(0, 10).forEach(chat => {
        const isActive = chat.chat_id === currentChatId;
        const itemHTML = `
            <div class="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 cursor-pointer transition ${isActive ? 'bg-blue-50 border border-blue-200' : ''}" onclick="openChat('${chat.chat_id}')">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <i data-lucide="message-square" class="w-4 h-4 text-blue-600"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-semibold text-gray-800 truncate max-w-[140px]">${escapeHtml(chat.title)}</p>
                        <p class="text-[10px] text-gray-400">Guji si aad u furto</p>
                    </div>
                </div>
                <button onclick="deleteChat('${chat.chat_id}', event)" class="p-1 text-gray-400 hover:text-red-500 rounded transition">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        `;
        recentChatsContainer.insertAdjacentHTML('beforeend', itemHTML);
    });

    if (window.lucide) lucide.createIcons();
}

async function openChat(chatId) {
    currentChatId = chatId;
    closeModal('historyModal');

    const welcomeSection = document.getElementById('welcomeSection');
    const messagesDiv = document.getElementById('messages');
    if (welcomeSection) welcomeSection.classList.add('hidden');
    if (messagesDiv) messagesDiv.innerHTML = '';

    renderRecentChats(allUserChats);

    try {
        const res = await fetch(`/api/chat/${chatId}`);
        const data = await res.json();

        if (data.status === "success" && data.messages) {
            data.messages.forEach(msg => {
                if (msg.role === 'user') {
                    appendUserMessage(msg.content);
                } else {
                    appendBotMessage(msg.content);
                }
            });
        }
    } catch (e) {
        console.error("Error opening chat:", e);
    }
}

async function deleteChat(chatId, event) {
    if (event) event.stopPropagation();
    if (!confirm("Ma hubtaa inaad sheekadan tirtirto?")) return;

    try {
        const res = await fetch(`/api/chat/${chatId}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.status === "success") {
            allUserChats = allUserChats.filter(c => c.chat_id !== chatId);
            if (currentChatId === chatId) {
                newChat();
            } else {
                renderRecentChats(allUserChats);
            }
            loadUserHistory(false);
        }
    } catch (err) {
        console.error(err);
    }
}

async function clearAllHistory() {
    const user = getUserData();
    if (!user || !user.email) return;
    if (!confirm("DIGNIIN: Ma hubtaa inaad tirtirto DHAMMAAN sheekooyinkaaga? Dib looma soo celin karo!")) return;

    try {
        const res = await fetch(`/api/chats/clear/${encodeURIComponent(user.email.trim().toLowerCase())}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === "success") {
            allUserChats = [];
            newChat();
            closeModal('historyModal');
            closeModal('settingsModal');
            alert("Dhammaan sheekooyinkii hore waa la tirtiray!");
        }
    } catch (e) {
        alert("Cillad ayaa dhacday marka la tirtirayay taariikhda.");
    }
}

function newChat() {
    currentChatId = null;
    removeAttachedFile();
    const messagesDiv = document.getElementById('messages');
    const welcomeSection = document.getElementById('welcomeSection');
    if (messagesDiv) messagesDiv.innerHTML = '';
    if (welcomeSection) welcomeSection.classList.remove('hidden');
    renderRecentChats(allUserChats);
}

// ================= 🚀 PDF & FILE EXTRACTOR (HAGAAGSAN) =================

async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Muuji calaamadda faylka (Loading Status)
    const container = document.getElementById('filePreviewContainer');
    const nameEl = document.getElementById('attachedFileName');
    if (container && nameEl) {
        nameEl.textContent = `Akhrinayaa: ${file.name}...`;
        container.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    try {
        // U dir backend-ka si uu qoraalka nadiifka ah uga soo saaro PDF-ka ama File-ka
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/extract-file", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (res.ok && data.status === "success") {
            // Keydi qoraalkii nadiifka ahaa ee laga soo saaray faylka
            attachedFile = {
                name: data.file_name,
                content: data.extracted_text
            };

            if (nameEl) nameEl.textContent = `📄 ${data.file_name} (Diyaar)`;
            
            const input = document.getElementById('messageInput');
            if (input) {
                input.placeholder = `Su'aasha aad ka qabto '${data.file_name}' halkan ku qor...`;
                input.focus();
            }

            totalFilesUploaded++;
            document.getElementById('fileCount') && (document.getElementById('fileCount').textContent = totalFilesUploaded);
        } else {
            alert("Cillad: " + (data.detail || "Faylka lama akhrin karin."));
            removeAttachedFile();
        }
    } catch (e) {
        console.error("PDF Extraction error:", e);
        alert("Server-ka laguma xiri karin marka faylka la akhrinayay!");
        removeAttachedFile();
    }
}

function removeAttachedFile() {
    attachedFile = null;
    const container = document.getElementById('filePreviewContainer');
    if (container) container.classList.add('hidden');
    
    const input = document.getElementById('messageInput');
    if (input) input.placeholder = "Kuu qor fariintaada (Somali, English, Arabic, Spanish...)";

    document.getElementById('fileInput') && (document.getElementById('fileInput').value = '');
    document.getElementById('pdfInput') && (document.getElementById('pdfInput').value = '');
}

// ================= MESSAGE SENDING =================

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

function quickMessage(text) {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value = text;
        sendMessage();
    }
}

async function sendMessage() {
    const user = getUserData();
    const input = document.getElementById('messageInput');
    let userPrompt = input ? input.value.trim() : '';

    // Haddii uusan qofku waxba qorin laakiin fayl uu ku dheggan yahay
    if (!userPrompt && attachedFile) {
        userPrompt = "Fadlan si faahfaahsan iigu sharrax dukumentigan qodobada ugu muhiimsan.";
    }

    if (!userPrompt && !attachedFile) return;

    const welcomeSection = document.getElementById('welcomeSection');
    if (welcomeSection && !welcomeSection.classList.contains('hidden')) {
        welcomeSection.classList.add('hidden');
    }

    // Diyaari waxa UI-ga lagu muujinayo iyo waxa AI-ga loo dirayo
    let uiMessage = userPrompt;
    let finalPromptToSend = userPrompt;

    if (attachedFile) {
        uiMessage = `📎 [Fayl: ${attachedFile.name}]\n\n${userPrompt}`;
        finalPromptToSend = `Dukumentiga magaciisu waa: '${attachedFile.name}'.\nQoraalka dukumentiga ku jira waa kan:\n"""\n${attachedFile.content}\n"""\n\nSu'aashayda/Amarkayga: ${userPrompt}`;
    }

    // Muuji fariinta qofka
    appendUserMessage(uiMessage);
    if (input) input.value = '';

    // Nadiifi faylka markii la diro kadib
    removeAttachedFile();

    const typingId = appendTypingIndicator();

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

        removeMessage(typingId);

        if (response.ok) {
            const data = await response.json();
            currentChatId = data.chat_id;
            appendBotMessage(data.reply || data.response || 'Haye!');
            loadUserHistory(false);
        } else {
            const errData = await response.json().catch(() => ({}));
            appendBotMessage('Cillad: ' + (errData.detail || 'Fadlan dib u tijaabi.'));
        }
    } catch (error) {
        removeMessage(typingId);
        appendBotMessage('Aad uma xiriiri karin server-ka backend-ka.');
    }
}

function appendUserMessage(text) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    const user = getUserData();
    const userName = user ? (user.fullName || user.full_name || user.name || 'User') : 'U';
    const initial = userName.charAt(0).toUpperCase();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgHTML = `
        <div class="flex justify-end items-start gap-3 message-animation my-3">
            <div class="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-sm">
                <p class="text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(text)}</p>
                <span class="text-[10px] text-blue-200 block text-right mt-1">${timeStr}</span>
            </div>
            <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                ${initial}
            </div>
        </div>
    `;
    messagesDiv.insertAdjacentHTML('beforeend', msgHTML);
    scrollToBottom();
}

function appendBotMessage(text) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgHTML = `
        <div class="flex justify-start items-start gap-3 message-animation my-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs shrink-0">
                🤖
            </div>
            <div class="bg-slate-100 text-slate-800 p-4 rounded-2xl rounded-tl-none max-w-[80%] border border-slate-200 shadow-sm">
                <p class="text-sm leading-relaxed whitespace-pre-wrap">${escapeHtml(text)}</p>
                <span class="text-[10px] text-slate-400 block mt-1">${timeStr}</span>
            </div>
        </div>
    `;
    messagesDiv.insertAdjacentHTML('beforeend', msgHTML);
    scrollToBottom();
}

function appendTypingIndicator() {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return null;

    const id = 'typing_' + Date.now();
    const html = `
        <div id="${id}" class="flex justify-start items-center gap-3 message-animation my-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs shrink-0">
                🤖
            </div>
            <div class="bg-slate-100 p-3 rounded-2xl rounded-tl-none border border-slate-200 flex items-center gap-1.5">
                <span class="w-2 h-2 bg-blue-500 rounded-full typing-dot"></span>
                <span class="w-2 h-2 bg-blue-500 rounded-full typing-dot"></span>
                <span class="w-2 h-2 bg-blue-500 rounded-full typing-dot"></span>
            </div>
        </div>
    `;
    messagesDiv.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ================= MODAL CONTROLS =================

function showHistory() {
    const modal = document.getElementById('historyModal');
    const listContainer = document.getElementById('modalHistoryList');
    if (!modal || !listContainer) return;

    listContainer.innerHTML = '';
    if (allUserChats.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-gray-400 py-8 text-sm">Wax sheekooyin hore ah lama helin.</p>`;
    } else {
        allUserChats.forEach(chat => {
            const item = `
                <div class="flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition" onclick="openChat('${chat.chat_id}')">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <i data-lucide="message-circle" class="w-5 h-5 text-blue-600"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-gray-800 truncate max-w-[280px]">${escapeHtml(chat.title)}</p>
                            <p class="text-xs text-gray-400">Guji si aad u furto</p>
                        </div>
                    </div>
                    <button onclick="deleteChat('${chat.chat_id}', event)" class="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', item);
        });
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function showTools() { openModal('toolsModal'); }
function showProfile() { openModal('profileModal'); }
function showSettings() { openModal('settingsModal'); }
function showHelp() { openModal('helpModal'); }
function showUpgradePro() { openModal('proModal'); }

function openModal(id) {
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
}

function useTool(toolName, templatePrompt) {
    closeModal('toolsModal');
    const input = document.getElementById('messageInput');
    if (input) {
        input.value = templatePrompt;
        input.focus();
    }
}

async function saveProfileChanges() {
    const newName = document.getElementById('editFullName').value.trim();
    const user = getUserData();
    if (!newName || !user) return;

    try {
        const res = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, fullName: newName })
        });
        const data = await res.json();
        if (data.status === "success") {
            user.fullName = newName;
            localStorage.setItem('user', JSON.stringify(user));
            loadUserProfile();
            closeModal('profileModal');
            alert("Magacaaga si guul leh ayaa loo beddelay!");
        }
    } catch (e) {
        alert("Cillad ayaa dhacday!");
    }
}

// ================= SEARCH, VOICE, THEME, LOGOUT =================

function filterHistory(query) {
    if (!query) {
        renderRecentChats(allUserChats);
        return;
    }
    const filtered = allUserChats.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));
    renderRecentChats(filtered);
}

function startVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Browser-kaagu ma taageero Voice Recognition. Fadlan isticmaal Google Chrome.");
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'so-SO';
    recognition.continuous = false;

    const statusEl = document.getElementById('voiceStatus');
    if (statusEl) statusEl.textContent = "Dhagaysanayaa... 🎙️";

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = transcript;
            sendMessage();
        }
        if (statusEl) statusEl.textContent = "Voice Input";
    };

    recognition.onerror = () => {
        if (statusEl) statusEl.textContent = "Voice Input";
    };

    recognition.onend = () => {
        if (statusEl) statusEl.textContent = "Voice Input";
    };

    recognition.start();
}

function showNotifications() {
    alert("🔔 Ogeysiis: SUGAL AI wuxuu ku shaqaynayaa noocii ugu dambeeyay ee AI!");
}

function toggleTheme() {
    const body = document.body;
    const themeCircle = document.getElementById('themeCircle');
    if (body) {
        body.classList.toggle('dark-mode');
        if (themeCircle) {
            themeCircle.style.left = body.classList.contains('dark-mode') ? '22px' : '4px';
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainArea = document.getElementById('mainArea');
    if (sidebar) sidebar.classList.toggle('sidebar-hidden');
    if (mainArea) mainArea.classList.toggle('main-expanded');
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
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