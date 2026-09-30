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
    const modalAvatar = document.getElementById('modalAvatar');
    const modalProfileName = document.getElementById('modalProfileName');
    const modalProfileEmail = document.getElementById('modalProfileEmail');
    const editFullName = document.getElementById('editFullName');

    if (!topAuthArea) return;

    if (user && user.email) {
        const userName = user.fullName || user.full_name || user.name || 'Hassan Abdikariin';
        const initial = userName.charAt(0).toUpperCase();

        topAuthArea.innerHTML = `
            <div onclick="showProfile()" class="flex items-center gap-1.5 bg-[#06183d] px-2 py-1 rounded-2xl border border-cyan-500/20 cursor-pointer hover:border-cyan-400 transition">
                <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-[10px] sm:text-xs text-white">${initial}</div>
                <p class="text-xs font-bold text-slate-200 hidden sm:block">${userName}</p>
            </div>
        `;

        if (welcomeName) welcomeName.textContent = userName;
        if (sidebarAvatar) sidebarAvatar.textContent = initial;
        if (sidebarUserName) sidebarUserName.textContent = userName;
        if (modalAvatar) modalAvatar.textContent = initial;
        if (modalProfileName) modalProfileName.textContent = userName;
        if (modalProfileEmail) modalProfileEmail.textContent = user.email;
        if (editFullName) editFullName.value = userName;
    } else {
        topAuthArea.innerHTML = `
            <a href="login.html" class="px-2.5 py-1 border border-cyan-400/40 text-cyan-300 rounded-xl text-xs font-bold">Login</a>
            <a href="register.html" class="px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-bold">Sign Up</a>
        `;
        if (welcomeName) welcomeName.textContent = "Friend";
    }
}

// ================= SIDEBAR & TOOLS TOGGLES =================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) {
        sidebar.classList.toggle('open');
        const isOpen = sidebar.classList.contains('open');
        if (overlay) overlay.style.display = isOpen ? 'block' : 'none';
    }
}

function toggleToolsMenu() {
    const menu = document.getElementById('toolsMenuPopup');
    if (menu) menu.classList.toggle('hidden');
}

function closeToolsMenu() {
    const menu = document.getElementById('toolsMenuPopup');
    if (menu) menu.classList.add('hidden');
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

function openImagePrompt() {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value = "sawir: ";
        input.focus();
    }
}

// ================= 🚀 MODALS: TOOLS, PROFILE, HELP, SETTINGS =================
function showTools() { openModal('toolsModal'); }
function showProfile() { openModal('profileModal'); }
function showHelp() { openModal('helpModal'); }
function showSettings() { openModal('settingsModal'); }

function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('hidden');
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
}

function useToolTemplate(templateText) {
    closeModal('toolsModal');
    const input = document.getElementById('messageInput');
    if (input) {
        input.value = templateText;
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
        if (data.status === 'success') {
            user.fullName = newName;
            localStorage.setItem('user', JSON.stringify(user));
            renderTopAuthNav();
            closeModal('profileModal');
            alert('Magacaaga si guul leh ayaa loo beddelay!');
        }
    } catch (e) {
        alert('Cillad ayaa dhacday!');
    }
}

// ================= SEND MESSAGE & AI ENGINE =================
async function sendMessage(e) {
    if (e) e.preventDefault();
    closeToolsMenu();

    const user = getUserData();
    const input = document.getElementById('messageInput');
    let userPrompt = input ? input.value.trim() : '';

    if (!userPrompt && attachedFile) {
        userPrompt = attachedFile.isImage ? "Fadlan iiga faalloo sawirkan oo ii sharrax waxa ku jira." : "Fadlan iigu soo koob dukumentigan qodobada ugu muhiimsan.";
    }
    if (!userPrompt && !attachedFile) return;

    const welcome = document.getElementById('welcomeBox');
    if (welcome) welcome.style.display = 'none';

    let uiMessage = userPrompt;
    let finalPromptToSend = userPrompt;

    if (attachedFile) {
        uiMessage = `📎 [${attachedFile.isImage ? 'Sawir' : 'Fayl'}: ${attachedFile.name}]\n\n${userPrompt}`;
        finalPromptToSend = `Dukumentiga/Sawirka magaciisu waa: '${attachedFile.name}'.\nFaahfaahinta:\n"""\n${attachedFile.content}\n"""\n\nSu'aashayda: ${userPrompt}`;
    }

    appendMessage('user', uiMessage);
    if (input) input.value = '';

    // 🎨 AI IMAGE GENERATION / EDIT CHECK
    const isImageGeneration = /^(sawir:|image:|\/image|sawir ii samee|sawirka|sawir )/i.test(userPrompt);
    const isImageEdit = attachedFile && attachedFile.isImage && /(edit|beddel|hagaaji|wax ka beddel)/i.test(userPrompt);

    if (isImageGeneration || isImageEdit) {
        let imageSubject = userPrompt.replace(/^(sawir:|image:|\/image|sawir ii samee|sawirka|sawir)/i, "").trim();
        if (isImageEdit) {
            imageSubject = `Modify this image: ${attachedFile.name}, change according to: ${userPrompt}`;
        }
        removeAttachedFile();
        await handleImageGeneration(imageSubject || "A beautiful Somali landscape with modern architecture 8k");
        return;
    }

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

// 🎨 ROBUST AI IMAGE GENERATOR
async function handleImageGeneration(promptText) {
    const user = getUserData();
    const typingId = appendTyping("🎨 SUGAL AI wuxuu samaynayaa sawirkaaga HD-ga ah...");

    try {
        const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: promptText,
                email: user ? user.email : 'guest@user.com'
            })
        });

        removeElement(typingId);
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            const list = document.getElementById('messagesList');
            if (!list) return;

            const div = document.createElement('div');
            div.className = 'ai-msg mr-auto p-3.5 sm:p-4 rounded-2xl max-w-[95%] sm:max-w-[80%] rounded-bl-xs space-y-2.5';
            div.innerHTML = `
                <div class="flex items-center justify-between">
                    <p class="text-xs sm:text-sm text-cyan-300 font-bold">🎨 Sawirkii aad codsatay: <em>"${escapeHtml(promptText)}"</em></p>
                </div>
                <div class="overflow-hidden rounded-xl border border-cyan-400/40 shadow-xl bg-slate-950">
                    <img src="${data.image_url}" alt="${escapeHtml(promptText)}" class="w-full h-auto object-cover rounded-xl shadow-lg transition duration-300 hover:scale-[1.02]" loading="lazy">
                </div>
                <div class="flex justify-end gap-2 pt-1">
                    <a href="${data.image_url}" target="_blank" download="sugal_ai_image.jpg" class="text-xs font-bold text-cyan-300 hover:underline flex items-center gap-1 bg-blue-900/80 px-3 py-1.5 rounded-lg border border-cyan-500/40">
                        ⬇️ Soo Daji Sawirka (HD)
                    </a>
                </div>
            `;
            list.appendChild(div);
            scrollToBottom();
        } else {
            appendMessage('ai', 'Waan ka xumahay, sawirka lama soo saari karin. Fadlan mar kale tijaabi.');
        }
    } catch (err) {
        removeElement(typingId);
        appendMessage('ai', 'Cillad ayaa dhacday marka sawirka la samaynayay.');
    }
}

// 🔤 MARKDOWN FORMATTER
function formatMarkdown(text) {
    if (!text) return "";
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-cyan-200">$1</strong>');
    formatted = formatted.replace(/^\s*\*\s+(.*)$/gm, '• $1');
    return formatted;
}

// 🔊 TEXT TO SPEECH
window.speakText = function(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#•`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
};

// 🚀 APPEND MESSAGE
function appendMessage(role, text) {
    const list = document.getElementById('messagesList');
    if (!list) return;

    const div = document.createElement('div');
    div.className = `p-3.5 sm:p-4 rounded-2xl message-text max-w-[92%] sm:max-w-[82%] relative ${
        role === 'user' ? 'user-msg ml-auto text-white rounded-br-xs' : 'ai-msg mr-auto text-slate-100 rounded-bl-xs'
    }`;

    if (role === 'ai') {
        div.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div class="flex-1 msg-content-text">${formatMarkdown(text)}</div>
                <button onclick="speakText('${escapeHtml(text.replace(/'/g, "\\'"))}')" class="text-xs text-cyan-400 hover:text-white opacity-75 p-1" title="Dhagayso">
                    🔊
                </button>
            </div>
        `;
    } else {
        div.innerHTML = formatMarkdown(text);
    }

    list.appendChild(div);
    scrollToBottom();
}

function appendTyping(customText = "✦ SUGAL AI is thinking...") {
    const id = 'typing_' + Date.now();
    const list = document.getElementById('messagesList');
    if (!list) return id;

    const div = document.createElement('div');
    div.id = id;
    div.className = 'ai-msg mr-auto p-3 sm:p-4 rounded-2xl text-xs sm:text-sm font-bold text-cyan-300 max-w-[85%] rounded-bl-xs flex items-center gap-2';
    div.innerHTML = `<span>${customText}</span>`;
    list.appendChild(div);

    scrollToBottom();
    return id;
}

function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    const scrollContainer = document.getElementById('scrollContainer');
    if (scrollContainer) {
        setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 50);
    }
}

// ================= FILE & IMAGE UPLOAD =================
async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isImg = file.type.startsWith('image/');

    const badge = document.getElementById('filePreviewBadge');
    const nameEl = document.getElementById('attachedFileName');
    const iconEl = document.getElementById('attachedFileIcon');

    if (badge && nameEl) {
        nameEl.textContent = `Akhrinayaa: ${file.name}...`;
        if (iconEl) iconEl.textContent = isImg ? "🖼️" : "📄";
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
            attachedFile = { name: data.file_name, content: data.extracted_text, isImage: isImg };
            if (nameEl) nameEl.textContent = `${isImg ? '🖼️' : '📄'} ${data.file_name} (Diyaar)`;
            
            const input = document.getElementById('messageInput');
            if (input) {
                input.placeholder = isImg ? `Sawirkan maxaan kaaga beddelaa ama kaaga sharraxaa?...` : `Su'aasha aad ka qabto '${data.file_name}' halkan ku qor...`;
                input.focus();
            }
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
    document.getElementById('pdfInput') && (document.getElementById('pdfInput').value = '');
}

// ================= VOICE INPUT =================
function startVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Browser-kaagu ma taageero Voice. Fadlan isticmaal Google Chrome.");
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'so-SO';
    recognition.continuous = false;

    const input = document.getElementById('messageInput');
    if (input) input.placeholder = "Dhagaysanayaa... 🎙️";

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (input) {
            input.value = transcript;
            sendMessage();
        }
    };
    recognition.start();
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
        list.innerHTML = `<p class="text-center text-slate-400 py-6 text-xs font-semibold">Wax sheekooyin hore ah lama helin.</p>`;
    } else {
        allUserChats.forEach(chat => {
            const item = `
                <div class="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 cursor-pointer border border-cyan-500/10 transition" onclick="openChat('${chat.chat_id}')">
                    <div class="flex items-center gap-2 min-w-0">
                        <span>💬</span>
                        <p class="text-xs font-bold text-slate-200 truncate max-w-[180px]">${chat.title}</p>
                    </div>
                    <button onclick="deleteChat('${chat.chat_id}', event)" class="p-1 text-slate-400 hover:text-red-400 font-bold text-xs">✕</button>
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