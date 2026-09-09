// WebGL Canvas Effect (Morphing Dot Matrix - Distinct Cloud & PDF)
const canvas = document.getElementById('field');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.z = 700;
camera.position.x = -250; 

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const particlesCount = 12000;

// Generator for a highly distinctive Cloud Shape (Flat bottom, puffy top)
function getCloudPoints(count) {
    const pts = [];
    while (pts.length < count) {
        let x = (Math.random() - 0.5) * 2;
        let y = (Math.random() - 0.5) * 2;
        let z = (Math.random() - 0.5) * 2;
        if (x*x + y*y + z*z < 1) {
            let sphere = Math.random();
            let sx, sy, sz, sr;
            if (sphere < 0.35) {
                sx = 0; sy = 0; sz = 0; sr = 120; // Center
            } else if (sphere < 0.65) {
                sx = -90; sy = -20; sz = 15; sr = 75; // Left bump
            } else if (sphere < 0.85) {
                sx = 90; sy = -10; sz = -15; sr = 85; // Right bump
            } else {
                sx = 20; sy = 60; sz = 10; sr = 80; // Top bump
            }
            
            let px = sx + x * sr;
            let py = sy + y * sr;
            let pz = sz + z * sr;
            
            // Flatten the bottom to look like a classic cloud icon
            if (py < -40) {
                py = -40 + (Math.random() * 8); 
            }
            
            pts.push({ x: px, y: py, z: pz });
        }
    }
    return pts;
}

// Generator for a highly distinctive PDF Document Shape (Folded corner, text lines)
function getDocumentPoints(count) {
    const pts = [];
    const width = 160;
    const height = 220;
    for (let i = 0; i < count; i++) {
        let x = (Math.random() - 0.5) * width;
        let y = (Math.random() - 0.5) * height;
        let z = (Math.random() - 0.5) * 4; 
        
        // Simulating distinct text lines
        if (Math.random() < 0.6) {
            let line = Math.floor(Math.random() * 7);
            y = (height / 2) - 60 - (line * 24) + (Math.random() - 0.5) * 6;
            
            let lineWidth = width - 40;
            if (line === 0) lineWidth = width / 2; // Short title
            if (line === 6) lineWidth = width * 0.7; // Short last line
            
            let leftEdge = -width/2 + 20;
            x = leftEdge + Math.random() * lineWidth;
            z += 6; // Raise text slightly
        }

        // Folded top-right corner
        let corner = 50;
        let lx = x - (width/2 - corner);
        let ly = y - (height/2 - corner);
        if (lx > 0 && ly > 0 && lx + ly > corner) {
            // Reflect point across the diagonal line
            x = (width/2 - corner) + (corner - ly);
            y = (height/2 - corner) + (corner - lx);
            z += 8; // Pop the fold out
        }

        pts.push({ x, y, z });
    }
    return pts;
}

const cloudData = getCloudPoints(particlesCount);
const docData = getDocumentPoints(particlesCount);

const geometry = new THREE.BufferGeometry();
const posArray = new Float32Array(particlesCount * 3);
const colorsArray = new Float32Array(particlesCount * 3);
const currentPos = new Float32Array(particlesCount * 3);

const colorTeal = new THREE.Color('#14B8A6');
const colorPurple = new THREE.Color('#9333EA');
const colorBlue = new THREE.Color('#0F5AC8');

for(let i = 0; i < particlesCount; i++) {
    const i3 = i * 3;
    posArray[i3] = cloudData[i].x;
    posArray[i3+1] = cloudData[i].y;
    posArray[i3+2] = cloudData[i].z;
    
    currentPos[i3] = cloudData[i].x;
    currentPos[i3+1] = cloudData[i].y;
    currentPos[i3+2] = cloudData[i].z;

    // Rich gradient mixing
    let mix = Math.random();
    let c = colorTeal.clone();
    if (mix < 0.5) {
        c.lerp(colorBlue, mix * 2);
    } else {
        c = colorBlue.clone().lerp(colorPurple, (mix - 0.5) * 2);
    }
    colorsArray[i3] = c.r;
    colorsArray[i3+1] = c.g;
    colorsArray[i3+2] = c.b;
}

geometry.setAttribute('position', new THREE.BufferAttribute(currentPos, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

const material = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
});

const particlesMesh = new THREE.Points(geometry, material);
scene.add(particlesMesh);

let rawMouseX = 0;
let rawMouseY = 0;

document.addEventListener('mousemove', (event) => {
    rawMouseX = (event.clientX / window.innerWidth) * 2 - 1;
    rawMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let transitionProgress = 0;

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Morph Logic (Switch every 6 seconds)
    const cycle = (elapsedTime % 12);
    let targetShape = cycle < 6 ? 0 : 1; // 0 = cloud, 1 = doc
    
    if (targetShape === 0) {
        transitionProgress -= 0.015;
    } else {
        transitionProgress += 0.015;
    }
    transitionProgress = Math.max(0, Math.min(1, transitionProgress));

    // Smooth cubic ease for morphing
    const t = transitionProgress < 0.5 ? 2 * transitionProgress * transitionProgress : 1 - Math.pow(-2 * transitionProgress + 2, 2) / 2;

    // Get Mouse World Position for Interactive Repulsion
    const vector = new THREE.Vector3(rawMouseX, rawMouseY, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const mouseWorldPos = camera.position.clone().add(dir.multiplyScalar(distance));

    const positions = particlesMesh.geometry.attributes.position.array;
    
    for(let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        
        let cx = cloudData[i].x;
        let cy = cloudData[i].y;
        let cz = cloudData[i].z;
        
        let dx = docData[i].x;
        let dy = docData[i].y;
        let dz = docData[i].z;
        
        // Target shape position
        let targetX = cx * (1 - t) + dx * t;
        let targetY = cy * (1 - t) + dy * t;
        let targetZ = cz * (1 - t) + dz * t;
        
        // Add subtle floating noise to keep it alive
        targetY += Math.sin(elapsedTime * 2 + i * 0.1) * 3;
        
        // Interactive Mouse Repulsion
        const localPos = new THREE.Vector3(targetX, targetY, targetZ);
        localPos.applyEuler(particlesMesh.rotation);
        
        const distToMouse = localPos.distanceTo(mouseWorldPos);
        const radius = 150; 
        
        if (distToMouse < radius) {
            const force = (radius - distToMouse) / radius;
            const pushDir = localPos.clone().sub(mouseWorldPos).normalize();
            
            // Explosive scatter away from cursor
            targetX += pushDir.x * force * 60;
            targetY += pushDir.y * force * 60;
            targetZ += pushDir.z * force * 60;
        }
        
        // Elastic snap-back to target positions
        positions[i3] += (targetX - positions[i3]) * 0.12;
        positions[i3+1] += (targetY - positions[i3+1]) * 0.12;
        positions[i3+2] += (targetZ - positions[i3+2]) * 0.12;
    }
    
    particlesMesh.geometry.attributes.position.needsUpdate = true;

    // Smooth whole-object rotation reacting to mouse
    let targetRotX = -(rawMouseY * 0.2);
    let targetRotY = (rawMouseX * 0.2) + (elapsedTime * 0.2); 
    
    particlesMesh.rotation.x += (targetRotX - particlesMesh.rotation.x) * 0.05;
    particlesMesh.rotation.y += (targetRotY - particlesMesh.rotation.y) * 0.05;

    renderer.render(scene, camera);
}

animate();

// GSAP Animations
gsap.registerPlugin(ScrollTrigger);

gsap.from(".display-lg", {
  y: 30,
  opacity: 0,
  duration: 1,
  ease: "power3.out",
  delay: 0.2
});

gsap.from("p, .btn-primary, nav", {
  y: 20,
  opacity: 0,
  duration: 1,
  stagger: 0.1,
  ease: "power2.out",
  delay: 0.5
});

// GSAP Dropdown Menu Interaction
const menuBtn = document.getElementById('menu-btn');
const menuTl = gsap.timeline({ paused: true, reversed: true });

menuTl.to("#dropdown-menu", {
  autoAlpha: 1, // Toggles visibility and opacity
  y: 0,
  duration: 0.5,
  ease: "power4.out"
})
.fromTo(".menu-link", {
  y: 20,
  opacity: 0
}, {
  y: 0,
  opacity: 1,
  duration: 0.4,
  stagger: 0.08,
  ease: "power3.out"
}, "-=0.3")
.to(".menu-divider", {
  opacity: 1,
  duration: 0.3
}, "-=0.2");

menuBtn.addEventListener("click", () => {
  if (menuTl.reversed()) {
    menuTl.play();
    menuBtn.textContent = "Close";
    menuBtn.classList.add("bg-white/20");
  } else {
    menuTl.reverse();
    menuBtn.textContent = "Menu";
    menuBtn.classList.remove("bg-white/20");
  }
});

document.getElementById('menu-new-workspace').addEventListener('click', (e) => {
    e.preventDefault();
    if (!sessionId) {
        document.querySelector('.btn-primary').click();
    }
    menuBtn.click();
});

document.getElementById('menu-upload').addEventListener('click', (e) => {
    e.preventDefault();
    if (sessionId) {
        document.getElementById('file-input').click();
    } else {
        alert("Please create a workspace first.");
    }
    menuBtn.click();
});

document.getElementById('menu-security').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Chodhyam uses ephemeral workspaces. All documents and vector embeddings are instantly deleted when you end your session or after 45 minutes of inactivity.");
    menuBtn.click();
});

document.getElementById('menu-end-session').addEventListener('click', (e) => {
    e.preventDefault();
    if (sessionId) {
        document.getElementById('end-session-btn').click();
    }
    menuBtn.click();
});

// GSAP Scrollytelling Journey
let scrollProgress = 0; // Global variable for WebGL to read

const steps = document.querySelectorAll('.journey-step');

ScrollTrigger.create({
  trigger: '#journey',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    scrollProgress = self.progress; 
    
    const currentStepIndex = Math.min(3, Math.floor(self.progress * 4));
    
    steps.forEach((step, i) => {
      if (i === currentStepIndex) {
        gsap.to(step, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      } else {
        const yOffset = i < currentStepIndex ? -40 : 40;
        gsap.to(step, { autoAlpha: 0, y: yOffset, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      }
    });
  }
});

// --- Application Logic ---

const API_BASE = window.location.origin.includes('localhost:3000') || window.location.origin.includes('localhost:8000') ? window.location.origin + '/api' : '/api';
let sessionId = localStorage.getItem('chodhyam_session_id');

const createWorkspaceBtn = document.querySelector('.btn-primary');
const endSessionBtn = document.getElementById('end-session-btn');
const heroSection = document.getElementById('hero-section');
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

// Initialize
if (sessionId && sessionExpiryTime && Date.now() < parseInt(sessionExpiryTime) * 1000) {
    showWorkspace();
    startTimer();
} else {
    clearSession();
}

// Create Workspace
createWorkspaceBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    createWorkspaceBtn.textContent = 'Creating...';
    try {
        const response = await fetch(`${API_BASE}/auth/login`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to create workspace');
        const data = await response.json();
        
        sessionId = data.session_id;
        sessionExpiryTime = data.expires_at;
        
        localStorage.setItem('chodhyam_session_id', sessionId);
        localStorage.setItem('chodhyam_expires_at', sessionExpiryTime);
        
        createWorkspaceBtn.textContent = 'Create Workspace';
        showWorkspace();
        startTimer();
    } catch (error) {
        console.error(error);
        alert('Could not create workspace. Please try again.');
        createWorkspaceBtn.textContent = 'Create Workspace';
    }
});

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
    heroSection.classList.add('hidden');
    workspaceView.classList.remove('hidden');
    workspaceView.classList.add('flex');
    gsap.to(canvas, { autoAlpha: 0, duration: 0.5, ease: 'power2.out' });
    if (uploadedDocuments.length === 0) {
        chatMessages.innerHTML = '<div class="text-gray-400 text-sm italic">Workspace ready. Upload PDFs to begin.</div>';
    }
}

function clearSession() {
    localStorage.removeItem('chodhyam_session_id');
    localStorage.removeItem('chodhyam_expires_at');
    sessionId = null;
    sessionExpiryTime = null;
    uploadedDocuments = [];
    documentList.innerHTML = '';
    chatMessages.innerHTML = '';
    clearInterval(timerInterval);
    workspaceView.classList.add('hidden');
    workspaceView.classList.remove('flex');
    heroSection.classList.remove('hidden');
    gsap.to(canvas, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' });
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
    
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    sessionTimer.textContent = `Expires in ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updatePdfPreview(filename, page, quote = "") {
    const img = document.getElementById('pdf-preview-img');
    const placeholder = document.getElementById('pdf-preview-placeholder');
    const pageInfo = document.getElementById('preview-page-info');
    
    if (!img || !placeholder) return;
    
    placeholder.classList.add('hidden');
    img.classList.remove('hidden');
    img.style.opacity = '0.5'; // Loading state
    
    const url = new URL(`${API_BASE}/documents/session/${sessionId}/file/${encodeURIComponent(filename)}/page/${page}`, window.location.origin);
    if (quote) {
        url.searchParams.append('highlight_text', quote);
    }
    
    img.onload = () => { img.style.opacity = '1'; };
    img.src = url.toString();
    pageInfo.textContent = `${filename} - Page ${page}`;
}

