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

// ⚙️ TOGGLE TOOLS MENU POPUP
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

// ================= SEND MESSAGE & AI IMAGE GENERATOR =================
async function sendMessage(e) {
    if (e) e.preventDefault();
    closeToolsMenu();

    const user = getUserData();
    const input = document.getElementById('messageInput');
    let userPrompt = input ? input.value.trim() : '';

    if (!userPrompt && attachedFile) {
        userPrompt = "Fadlan iigu soo koob dukumentigan qodobada ugu muhiimsan.";
    }
    if (!userPrompt && !attachedFile) return;

    // Qari Welcome Box
    const welcome = document.getElementById('welcomeBox');
    if (welcome) welcome.style.display = 'none';

    let uiMessage = userPrompt;
    let finalPromptToSend = userPrompt;

    if (attachedFile) {
        uiMessage = `📎 [Fayl: ${attachedFile.name}]\n\n${userPrompt}`;
        finalPromptToSend = `Dukumentiga magaciisu waa: '${attachedFile.name}'.\nQoraalka:\n"""\n${attachedFile.content}\n"""\n\nSu'aasha: ${userPrompt}`;
    }

    appendMessage('user', uiMessage);
    if (input) input.value = '';
    removeAttachedFile();

    // 🎨 CHECK IF USER ASKS FOR AN IMAGE
    const lowerPrompt = userPrompt.toLowerCase();
    if (lowerPrompt.startsWith("sawir:") || lowerPrompt.startsWith("image:") || lowerPrompt.startsWith("/image")) {
        const imageSubject = userPrompt.replace(/^(sawir:|image:|\/image)/i, "").trim();
        if (imageSubject) {
            handleImageGeneration(imageSubject);
            return;
        }
    }

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

// 🎨 AI IMAGE GENERATOR
function handleImageGeneration(promptText) {
    const typingId = appendTyping("🎨 SUGAL AI wuxuu soo saarayaa sawirkaaga...");
    
    setTimeout(() => {
        removeElement(typingId);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=1024&height=1024&nologo=true&enhance=true`;
        
        const list = document.getElementById('messagesList');
        if (!list) return;

        const div = document.createElement('div');
        div.className = 'ai-msg mr-auto p-4 rounded-2xl max-w-[92%] sm:max-w-[80%] rounded-bl-xs space-y-3';
        div.innerHTML = `
            <p class="text-xs sm:text-sm text-cyan-300 font-semibold">🎨 Waa sawirkii aad codsatay: <em>"${escapeHtml(promptText)}"</em></p>
            <div class="overflow-hidden rounded-xl border border-cyan-400/40 shadow-xl">
                <img src="${imageUrl}" alt="${escapeHtml(promptText)}" class="w-full h-auto object-cover rounded-xl shadow-lg" loading="lazy">
            </div>
            <div class="flex justify-end pt-1">
                <a href="${imageUrl}" target="_blank" download="sugal_ai_image.jpg" class="text-xs font-bold text-cyan-300 hover:underline flex items-center gap-1 bg-blue-900/70 px-3 py-1.5 rounded-lg border border-cyan-500/40">
                    ⬇️ Soo Daji Sawirka (HD)
                </a>
            </div>
        `;
        list.appendChild(div);
        scrollToBottom();
    }, 1200);
}

// 📄 EXPORT AS WORD DOCUMENT (.doc)
window.downloadAsWord = function(buttonEl) {
    const msgDiv = buttonEl.closest('.ai-msg').querySelector('.content-body');
    if (!msgDiv) return;

    const textContent = msgDiv.innerText;
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>SUGAL AI Document</title></head><body style='font-family: Arial, sans-serif; font-size: 13pt; line-height: 1.6; color: #111;'>";
    const footer = "</body></html>";
    const sourceHTML = header + textContent.replace(/\n/g, "<br>") + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = "SUGAL_AI_Document.doc";
    fileDownload.click();
    document.body.removeChild(fileDownload);
};

// 📄 EXPORT AS PDF
window.downloadAsPDF = function(buttonEl) {
    const msgDiv = buttonEl.closest('.ai-msg').querySelector('.content-body');
    if (!msgDiv) return;

    const printWindow = window.open('', '', 'height=700,width=800');
    printWindow.document.write('<html><head><title>SUGAL AI Document</title>');
    printWindow.document.write('<style>body{font-family: Arial, sans-serif; padding: 40px; font-size: 13pt; line-height: 1.6; color: #222;} h2{color:#0284c7;} strong{color:#0369a1;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h2>SUGAL AI Generated Document</h2><hr style="margin-bottom:20px;">');
    printWindow.document.write(msgDiv.innerHTML.replace(/\n/g, "<br>"));
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
};

// 📋 COPY TEXT
window.copyMessageText = function(buttonEl) {
    const msgDiv = buttonEl.closest('.ai-msg').querySelector('.content-body');
    if (!msgDiv) return;

    navigator.clipboard.writeText(msgDiv.innerText);
    const originalText = buttonEl.innerText;
    buttonEl.innerText = "✓ Copied!";
    setTimeout(() => { buttonEl.innerText = originalText; }, 2000);
};

// 🔤 MARKDOWN FORMATTER
function formatMarkdown(text) {
    if (!text) return "";
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-cyan-200">$1</strong>');
    formatted = formatted.replace(/^\s*\*\s+(.*)$/gm, '• $1');
    return formatted;
}

function appendMessage(role, text) {
    const list = document.getElementById('messagesList');
    if (!list) return;

    const div = document.createElement('div');
    div.className = `p-4 sm:p-5 rounded-2xl message-text max-w-[90%] sm:max-w-[82%] ${
        role === 'user' ? 'user-msg ml-auto text-white rounded-br-xs' : 'ai-msg mr-auto text-slate-100 rounded-bl-xs'
    }`;

    if (role === 'ai') {
        div.innerHTML = `
            <div class="content-body">${formatMarkdown(text)}</div>
            
            <!-- 📄 ACTION BAR: COPY, WORD, PDF -->
            <div class="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-cyan-500/20 text-xs">
                <button onclick="copyMessageText(this)" class="px-2.5 py-1 rounded-lg bg-blue-900/50 hover:bg-blue-800/70 border border-cyan-500/30 text-cyan-300 transition">
                    📋 Copy
                </button>
                <button onclick="downloadAsWord(this)" class="px-2.5 py-1 rounded-lg bg-blue-900/50 hover:bg-blue-800/70 border border-cyan-500/30 text-cyan-300 transition">
                    📝 Word (.doc)
                </button>
                <button onclick="downloadAsPDF(this)" class="px-2.5 py-1 rounded-lg bg-blue-900/50 hover:bg-blue-800/70 border border-cyan-500/30 text-cyan-300 transition">
                    📄 PDF
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
    div.className = 'ai-msg mr-auto p-4 rounded-2xl text-sm text-cyan-300 max-w-[85%] rounded-bl-xs flex items-center gap-2';
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
            
            const input = document.getElementById('messageInput');
            if (input) {
                input.placeholder = `Su'aasha aad ka qabto '${data.file_name}' halkan ku qor...`;
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