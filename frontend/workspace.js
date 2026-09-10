const API_BASE = window.location.origin.includes('localhost:3000') || window.location.origin.includes('localhost:8000') ? window.location.origin + '/api' : '/api';
let sessionId = localStorage.getItem('chodhyam_session_id');

document.getElementById('menu-end-session').addEventListener('click', (e) => {
    e.preventDefault();
    if (sessionId) {
        document.getElementById('end-session-btn').click();
    }
});

const createWorkspaceBtn = document.querySelector('.btn-primary');
const endSessionBtn = document.getElementById('end-session-btn');
const workspaceView = document.getElementById('workspace-view');
const fileInput = document.getElementById('file-input');
const uploadZone = document.getElementById('upload-zone');
const documentList = document.getElementById('document-list');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const chatSubmit = document.getElementById('chat-submit');
const sessionTimer = document.getElementById('session-timer');

let uploadedDocuments = [];
let sessionExpiryTime = localStorage.getItem('chodhyam_expires_at');
let timerInterval;
let hasWarnedExpiry = false;

let currentPreviewFilename = null;
let currentPreviewPage = 1;
let currentPreviewQuote = "";
let currentPreviewTotalPages = 1;

// Auto-Initialize Workspace
async function initializeWorkspace() {
    if (sessionId && sessionExpiryTime && Date.now() < parseInt(sessionExpiryTime) * 1000) {
        showWorkspace();
        startTimer();
    } else {
        // Create new session automatically
        try {
            const response = await fetch(`${API_BASE}/auth/login`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to create workspace');
            const data = await response.json();
            
            sessionId = data.session_id;
            sessionExpiryTime = data.expires_at;
            
            localStorage.setItem('chodhyam_session_id', sessionId);
            localStorage.setItem('chodhyam_expires_at', sessionExpiryTime);
            
            showWorkspace();
            startTimer();
        } catch (error) {
            console.error(error);
            alert('Could not create workspace. Please try again.');
            window.location.href = 'index.html';
        }
    }
}
initializeWorkspace();

// End Session
endSessionBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to end this session? All data will be deleted immediately.')) {
        try {
            await fetch(`${API_BASE}/documents/session/${sessionId}`, { method: 'DELETE' });
            await fetch(`${API_BASE}/auth/logout?session_id=${sessionId}`, { method: 'POST' });
        } catch (e) {
            console.error('Error during cleanup', e);
        }
        clearSession();
    }
});

// Reset Timer
const resetTimerBtn = document.getElementById('reset-timer-btn');
if (resetTimerBtn) {
    resetTimerBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!sessionId) return;
        
        resetTimerBtn.textContent = 'Resetting...';
        try {
            const response = await fetch(`${API_BASE}/auth/extend?session_id=${sessionId}`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to extend session');
            const data = await response.json();
            
            sessionExpiryTime = data.expires_at;
            localStorage.setItem('chodhyam_expires_at', sessionExpiryTime);
            if (typeof hasWarnedExpiry !== 'undefined') hasWarnedExpiry = false;
            updateTimer();
        } catch (error) {
            console.error(error);
            alert('Could not reset timer.');
        } finally {
            resetTimerBtn.textContent = 'Reset Timer';
        }
    });
}

// File Upload Logic
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('border-[#14B8A6]', 'bg-[#14B8A6]/10');
});

uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('border-[#14B8A6]', 'bg-[#14B8A6]/10');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('border-[#14B8A6]', 'bg-[#14B8A6]/10');
    if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        handleFiles(fileInput.files);
    }
});

async function handleFiles(files) {
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
        alert('Only PDF files are supported.');
        return;
    }

    const formData = new FormData();
    formData.append('session_id', sessionId);
    pdfFiles.forEach(file => {
        formData.append('files', file);
    });

    uploadZone.querySelector('p').textContent = 'Uploading...';
    
    try {
        const response = await fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.detail || 'Upload failed.');
            return;
        }
        
        if (data.uploaded_documents) {
            data.uploaded_documents.forEach(doc => {
                if(doc.status === 'processed') {
                    uploadedDocuments.push(doc);
                    renderDocument(doc);
                } else {
                    alert(`Failed to process ${doc.filename}: ${doc.error}`);
                }
            });
            chatInput.disabled = false;
            chatSubmit.disabled = chatInput.value.trim().length === 0;
            
            const firstSuccess = data.uploaded_documents.find(d => d.status === 'processed');
            if (firstSuccess) {
                updatePdfPreview(firstSuccess.filename, 1, "");
            }
        }
    } catch (error) {
        console.error(error);
        alert('Upload failed.');
    } finally {
        uploadZone.querySelector('p').textContent = 'Drop PDF files here';
        fileInput.value = '';
    }
}

function renderDocument(doc) {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10';
    div.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[#14B8A6] flex-shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span class="text-sm text-gray-300 truncate">${doc.filename}</span>
        </div>
        <span class="text-xs text-[#14B8A6] bg-[#14B8A6]/10 px-2 py-1 rounded">Ready</span>
    `;
    documentList.appendChild(div);
}

// Chat Logic
chatInput.addEventListener('input', () => {
    chatSubmit.disabled = chatInput.value.trim().length === 0 || uploadedDocuments.length === 0;
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = chatInput.value.trim();
    if (!question) return;

    if (uploadedDocuments.length === 0) {
        alert("Please upload at least one document first.");
        return;
    }

    appendMessage('user', question);
    chatInput.value = '';
    chatSubmit.disabled = true;

    const loadingId = appendLoading();
    
    try {
        const response = await fetch(`${API_BASE}/chat/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                question: question
            })
        });
        
        if (!response.ok) throw new Error('Query failed');
        
        const data = await response.json();
        removeLoading(loadingId);
        appendMessage('assistant', data.answer, data.sources);
        
        if (data.sources && data.sources.length > 0) {
            updatePdfPreview(data.sources[0].document, data.sources[0].page, data.sources[0].quote || "");
        }
        
    } catch (error) {
        console.error(error);
        removeLoading(loadingId);
        appendMessage('assistant', 'Sorry, an error occurred while processing your question.');
    }
});

function appendMessage(role, text, sources = []) {
    const div = document.createElement('div');
    div.className = `flex flex-col gap-2 ${role === 'user' ? 'items-end' : 'items-start'}`;
    
    const bubble = document.createElement('div');
    bubble.className = `px-4 py-3 rounded-2xl max-w-[85%] text-sm ${
        role === 'user' 
        ? 'bg-[#14B8A6] text-black font-medium rounded-tr-sm' 
        : 'bg-white/10 text-gray-200 border border-white/10 rounded-tl-sm'
    }`;
    bubble.textContent = text;
    
    div.appendChild(bubble);

    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'flex flex-wrap gap-2 mt-1 px-1';
        sources.forEach(src => {
            const badge = document.createElement('span');
            badge.className = 'text-xs text-gray-400 bg-white/5 border border-white/10 px-2 py-1 rounded cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-1';
            badge.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg> ${src.document} (p. ${src.page})`;
            badge.addEventListener('click', () => {
                updatePdfPreview(src.document, src.page, src.quote || "");
            });
            sourcesDiv.appendChild(badge);
        });
        div.appendChild(sourcesDiv);
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendLoading() {
    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'flex items-start gap-2';
    div.innerHTML = `
        <div class="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 rounded-tl-sm flex items-center gap-2 text-gray-400 text-sm">
            <span class="animate-pulse">Searching documents...</span>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}


function showWorkspace() {
    workspaceView.classList.remove('hidden');
    workspaceView.classList.add('flex');
    if (uploadedDocuments.length === 0) {
        chatMessages.innerHTML = '<div class="text-gray-400 text-sm italic">Workspace ready. Upload PDFs to begin.</div>';
    }
    hasWarnedExpiry = false;
}

function clearSession() {
    localStorage.removeItem('chodhyam_session_id');
    localStorage.removeItem('chodhyam_expires_at');
    sessionId = null;
    sessionExpiryTime = null;
    clearInterval(timerInterval);
    window.location.href = 'index.html';
}

function startTimer() {
    clearInterval(timerInterval);
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!sessionExpiryTime) return;
    const now = Date.now() / 1000;
    const remaining = parseInt(sessionExpiryTime) - now;
    
    if (remaining <= 0) {
        clearSession();
        alert('Your session has expired. Workspace data has been cleared.');
        return;
    }
    
    if (remaining <= 300 && !hasWarnedExpiry) {
        hasWarnedExpiry = true;
        alert('Warning: Your session will expire in 5 minutes! Please reset the timer to keep your workspace active.');
    }
    
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    sessionTimer.textContent = `Expires in ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');

if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
        if (currentPreviewPage > 1) {
            updatePdfPreview(currentPreviewFilename, currentPreviewPage - 1, "");
        }
    });
}
if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
        if (currentPreviewPage < currentPreviewTotalPages) {
            updatePdfPreview(currentPreviewFilename, currentPreviewPage + 1, "");
        }
    });
}

function updatePdfPreview(filename, page, quote = "") {
    const img = document.getElementById('pdf-preview-img');
    const placeholder = document.getElementById('pdf-preview-placeholder');
    const pageInfo = document.getElementById('preview-page-info');
    
    if (!img || !placeholder) return;
    
    currentPreviewFilename = filename;
    currentPreviewPage = page;
    currentPreviewQuote = quote;
    
    const docInfo = uploadedDocuments.find(d => d.filename === filename);
    currentPreviewTotalPages = docInfo && docInfo.total_pages ? docInfo.total_pages : 1;
    
    if (prevPageBtn) {
        prevPageBtn.classList.remove('hidden');
        prevPageBtn.disabled = currentPreviewPage <= 1;
    }
    if (nextPageBtn) {
        nextPageBtn.classList.remove('hidden');
        nextPageBtn.disabled = currentPreviewPage >= currentPreviewTotalPages;
    }
    
    placeholder.classList.add('hidden');
    img.classList.remove('hidden');
    img.style.opacity = '0.5'; // Loading state
    
    const url = new URL(`${API_BASE}/documents/session/${sessionId}/file/${encodeURIComponent(filename)}/page/${page}`, window.location.origin);
    if (quote) {
        url.searchParams.append('highlight_text', quote);
    }
    
    img.onload = () => { img.style.opacity = '1'; };
    img.src = url.toString();
    pageInfo.textContent = `${filename} - Page ${page} of ${currentPreviewTotalPages}`;
}

