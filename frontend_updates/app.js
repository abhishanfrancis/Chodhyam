// WebGL Canvas Effect (Morphing Dot Matrix - Distinct Cloud & PDF)
const canvas = document.getElementById('field');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.z = 700;
camera.position.x = -230; 

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const particlesCount = 12500;

// Generator for Iconic 3D Cloud Shape (Step 1 - Upload & Sandbox)
function getCloudPoints(count) {
    const pts = [];
    
    // Cloud dome definitions: [x, y, z, radius]
    const domes = [
        { x: 12,   y: 42,  z: 0, r: 72 },  // Big Main Top Dome
        { x: -58,  y: 22,  z: 0, r: 56 },  // Top-Left Dome
        { x: 58,   y: 18,  z: 0, r: 54 },  // Top-Right Dome
        { x: -105, y: -16, z: 0, r: 44 },  // Far-Left Lobe
        { x: 95,   y: -18, z: 0, r: 46 },  // Far-Right Lobe
        { x: 0,    y: -14, z: 0, r: 52 },  // Center Fill
        { x: -45,  y: -16, z: 0, r: 48 },  // Left Base Fill
        { x: 45,   y: -16, z: 0, r: 48 },  // Right Base Fill
    ];

    while (pts.length < count) {
        // Pick one of the domes
        const domeIdx = Math.floor(Math.random() * domes.length);
        const d = domes[domeIdx];
        
        // Uniform volumetric sphere sampling
        let u = Math.random();
        let v = Math.random();
        let theta = u * 2.0 * Math.PI;
        let phi = Math.acos(2.0 * v - 1.0);
        let r = Math.cbrt(Math.random()) * d.r;
        
        let px = d.x + r * Math.sin(phi) * Math.cos(theta);
        let py = d.y + r * Math.sin(phi) * Math.sin(theta);
        let pz = (d.z + r * Math.cos(phi)) * 0.65; // Soft 3D depth
        
        // Rounded cloud bottom contour
        if (py < -38) {
            if (Math.abs(px) < 100) {
                py = -38 + (Math.random() * 6);
            } else {
                continue;
            }
        }
        
        pts.push({ x: px, y: py, z: pz });
    }
    return pts;
}

// Generator for Neural Query / Search Radar Rings (Step 2 - Ask & RAG Semantic Search)
function getQueryPoints(count) {
    const pts = [];
    for (let i = 0; i < count; i++) {
        const p = Math.random();
        if (p < 0.28) {
            // Central Dense Query Core Sphere
            let u = Math.random();
            let v = Math.random();
            let theta = u * 2.0 * Math.PI;
            let phi = Math.acos(2.0 * v - 1.0);
            let r = Math.cbrt(Math.random()) * 52;
            pts.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi)
            });
        } else if (p < 0.70) {
            // Concentric 3D Orbital Search Rings
            const ringSelect = Math.random();
            let ringR = ringSelect < 0.45 ? 100 : 160;
            let angle = Math.random() * Math.PI * 2;
            let spread = (Math.random() - 0.5) * 10;
            let x = Math.cos(angle) * (ringR + spread);
            let z = Math.sin(angle) * (ringR + spread);
            let y = (Math.random() - 0.5) * 10;
            
            // Incline the ring for 3D gyroscope look
            let tilt = ringSelect < 0.45 ? 0.55 : -0.55;
            let rotatedY = y * Math.cos(tilt) - z * Math.sin(tilt);
            let rotatedZ = y * Math.sin(tilt) + z * Math.cos(tilt);
            pts.push({ x: x, y: rotatedY, z: rotatedZ });
        } else if (p < 0.88) {
            // Radiating Semantic Vector Search Rays
            let rayIndex = Math.floor(Math.random() * 8);
            let rayAngle = (rayIndex / 8) * Math.PI * 2;
            let rayDist = 52 + Math.random() * 130;
            let jitterX = (Math.random() - 0.5) * 6;
            let jitterY = (Math.random() - 0.5) * 6;
            let jitterZ = (Math.random() - 0.5) * 6;
            pts.push({
                x: Math.cos(rayAngle) * rayDist + jitterX,
                y: jitterY,
                z: Math.sin(rayAngle) * rayDist + jitterZ
            });
        } else {
            // Floating Semantic Query Nodes
            let r = 75 + Math.random() * 115;
            let theta = Math.random() * Math.PI * 2;
            let phi = Math.random() * Math.PI;
            pts.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.cos(phi) * 0.75,
                z: r * Math.sin(phi) * Math.sin(theta)
            });
        }
    }
    return pts;
}

// Generator for PDF Document Shape with Citations (Step 3 - Reason & SLM Grounding)
function getDocumentPoints(count) {
    const pts = [];
    const width = 192;
    const height = 264;
    for (let i = 0; i < count; i++) {
        let x = (Math.random() - 0.5) * width;
        let y = (Math.random() - 0.5) * height;
        let z = (Math.random() - 0.5) * 5; 
        
        let p = Math.random();
        if (p < 0.55) {
            // Structured text lines
            let line = Math.floor(Math.random() * 7);
            y = (height / 2) - 72 - (line * 29) + (Math.random() - 0.5) * 7;
            
            let lineWidth = width - 48;
            if (line === 0) lineWidth = width / 2;
            if (line === 6) lineWidth = width * 0.7;
            
            let leftEdge = -width/2 + 24;
            x = leftEdge + Math.random() * lineWidth;
            z += 7;
        } else if (p < 0.75) {
            // Highlighted Citation Block (raised badge on document)
            let citeLine = 3;
            y = (height / 2) - 72 - (citeLine * 29) + (Math.random() - 0.5) * 16;
            let leftEdge = -width/2 + 24;
            x = leftEdge + Math.random() * (width - 48);
            z += 14; // Pop citation block forward in 3D
        }

        // Folded top-right corner
        let corner = 60;
        let lx = x - (width/2 - corner);
        let ly = y - (height/2 - corner);
        if (lx > 0 && ly > 0 && lx + ly > corner) {
            x = (width/2 - corner) + (corner - ly);
            y = (height/2 - corner) + (corner - lx);
            z += 12; // Pop fold out
        }

        pts.push({ x, y, z });
    }
    return pts;
}

// Generator for Purge / Dispersal Vortex Shape (Step 4 - Instant Zero-Retention Purge)
function getPurgePoints(count) {
    const pts = [];
    for (let i = 0; i < count; i++) {
        let p = Math.random();
        if (p < 0.65) {
            // Expanding Vortex ring dissolving outwards
            let angle = Math.random() * Math.PI * 2;
            let r = 160 + Math.random() * 180;
            let spreadY = (Math.random() - 0.5) * 140;
            let spiral = (r - 160) * 0.05;
            let x = Math.cos(angle + spiral) * r;
            let z = Math.sin(angle + spiral) * r;
            pts.push({ x: x, y: spreadY, z: z });
        } else {
            // Outer scatter bursts into complete void
            let u = Math.random();
            let v = Math.random();
            let theta = u * 2.0 * Math.PI;
            let phi = Math.acos(2.0 * v - 1.0);
            let r = 240 + Math.random() * 200;
            let x = r * Math.sin(phi) * Math.cos(theta);
            let y = r * Math.sin(phi) * Math.sin(theta);
            let z = r * Math.cos(phi) * 0.5;
            pts.push({ x, y, z });
        }
    }
    return pts;
}

const cloudData = getCloudPoints(particlesCount);
const queryData = getQueryPoints(particlesCount);
const docData = getDocumentPoints(particlesCount);
const purgeData = getPurgePoints(particlesCount);

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
    size: 3.2,
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
let inJourney = false;
let pastJourney = false;
let currentJourneyStep = 0;

// Dynamic active step morph targets
let activeTargetData = cloudData;
let previousTargetData = cloudData;
let morphBlend = 1.0;
let lastStep = 0;

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Determine target shape based on current step, past journey, or ambient hero cycle
    if (pastJourney) {
        // Leave dispersed after 4th step without resetting or reforming
        activeTargetData = purgeData;
        previousTargetData = purgeData;
        morphBlend = 1.0;
    } else if (inJourney) {
        let stepTarget = cloudData;
        if (currentJourneyStep === 0) stepTarget = cloudData;
        else if (currentJourneyStep === 1) stepTarget = queryData;
        else if (currentJourneyStep === 2) stepTarget = docData;
        else if (currentJourneyStep === 3) stepTarget = purgeData;

        if (currentJourneyStep !== lastStep) {
            previousTargetData = activeTargetData;
            activeTargetData = stepTarget;
            morphBlend = 0.0;
            lastStep = currentJourneyStep;
        }

        morphBlend = Math.min(1.0, morphBlend + 0.045);
    } else {
        // Ambient Morph between Cloud, Query, and Doc on Hero
        const cycle = (elapsedTime % 18);
        let targetA, targetB, progressRatio;
        if (cycle < 6) {
            targetA = cloudData;
            targetB = queryData;
            progressRatio = cycle / 6;
        } else if (cycle < 12) {
            targetA = queryData;
            targetB = docData;
            progressRatio = (cycle - 6) / 6;
        } else {
            targetA = docData;
            targetB = cloudData;
            progressRatio = (cycle - 12) / 6;
        }
        previousTargetData = targetA;
        activeTargetData = targetB;
        morphBlend = progressRatio;
    }

    // Smooth cubic ease for morphing
    const t = morphBlend < 0.5 ? 2 * morphBlend * morphBlend : 1 - Math.pow(-2 * morphBlend + 2, 2) / 2;

    // Fluid Spatial Flow: Shift position when in Journey Section vs Hero
    let targetMeshX = 0;
    let targetMeshY = 0;
    let targetCameraX = -230;

    if (pastJourney) {
        // Stay in place dispersed without following
        const isDesktop = window.innerWidth >= 768;
        targetMeshX = isDesktop ? 240 : 0;
        targetMeshY = isDesktop ? 0 : -60;
        targetCameraX = isDesktop ? -190 : -230;
    } else if (inJourney) {
        const isDesktop = window.innerWidth >= 768;
        targetMeshX = isDesktop ? 240 : 0;
        targetMeshY = isDesktop ? 0 : -60;
        targetCameraX = isDesktop ? -190 : -230;
    } else {
        targetMeshX = 0;
        targetMeshY = 0;
        targetCameraX = -230;
    }

    // Smooth position lerp
    particlesMesh.position.x += (targetMeshX - particlesMesh.position.x) * 0.06;
    particlesMesh.position.y += (targetMeshY - particlesMesh.position.y) * 0.06;
    camera.position.x += (targetCameraX - camera.position.x) * 0.06;

    // Get Mouse World Position for Interactive Repulsion
    const vector = new THREE.Vector3(rawMouseX, rawMouseY, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const mouseWorldPos = camera.position.clone().add(dir.multiplyScalar(distance));

    const positions = particlesMesh.geometry.attributes.position.array;
    
    for(let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        
        let pA = previousTargetData[i];
        let pB = activeTargetData[i];
        
        let targetX = pA.x * (1 - t) + pB.x * t;
        let targetY = pA.y * (1 - t) + pB.y * t;
        let targetZ = pA.z * (1 - t) + pB.z * t;
        
        // Subtle floating noise
        targetY += Math.sin(elapsedTime * 2 + i * 0.1) * 2.5;
        
        // Interactive Mouse Repulsion
        const localPos = new THREE.Vector3(targetX, targetY, targetZ);
        localPos.applyEuler(particlesMesh.rotation);
        
        const distToMouse = localPos.distanceTo(mouseWorldPos);
        const radius = 180; 
        
        if (distToMouse < radius) {
            const force = (radius - distToMouse) / radius;
            const pushDir = localPos.clone().sub(mouseWorldPos).normalize();
            
            // Explosive scatter away from cursor
            targetX += pushDir.x * force * 65;
            targetY += pushDir.y * force * 65;
            targetZ += pushDir.z * force * 65;
        }
        
        // Elastic snap-back to target positions
        positions[i3] += (targetX - positions[i3]) * 0.12;
        positions[i3+1] += (targetY - positions[i3+1]) * 0.12;
        positions[i3+2] += (targetZ - positions[i3+2]) * 0.12;
    }
    
    particlesMesh.geometry.attributes.position.needsUpdate = true;

    // Smooth whole-object rotation reacting to mouse and scroll
    let targetRotX = -(rawMouseY * 0.2);
    let targetRotY = (rawMouseX * 0.2) + (elapsedTime * 0.12) + (inJourney ? 0.4 : 0); 
    
    particlesMesh.rotation.x += (targetRotX - particlesMesh.rotation.x) * 0.05;
    particlesMesh.rotation.y += (targetRotY - particlesMesh.rotation.y) * 0.05;

    renderer.render(scene, camera);
}

animate();

// GSAP Animations
gsap.registerPlugin(ScrollTrigger);

const introTl = gsap.timeline({ defaults: { ease: "power3.out", clearProps: "all" } });

introTl
  .from("nav", {
    opacity: 0,
    y: -15,
    duration: 0.5
  })
  .from(".display-lg", {
    opacity: 0,
    y: 20,
    duration: 0.6
  }, "-=0.35")
  .from(".body-md", {
    opacity: 0,
    y: 15,
    duration: 0.5
  }, "-=0.4")
  .from(".hero-actions a", {
    opacity: 0,
    duration: 0.5,
    stagger: 0.08
  }, "-=0.35");

// GSAP Dropdown Menu Interaction
const menuBtn = document.getElementById('menu-btn');
const menuTl = gsap.timeline({ paused: true, reversed: true });

menuTl.to("#dropdown-menu", {
  autoAlpha: 1,
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

document.querySelectorAll('.menu-link').forEach(link => {
  link.addEventListener('click', () => {
    if (!menuTl.reversed()) {
      menuTl.reverse();
      menuBtn.textContent = "Menu";
      menuBtn.classList.remove("bg-white/20");
    }
  });
});

// GSAP Scrollytelling Journey
const journeySection = document.getElementById('journey');
const steps = document.querySelectorAll('.journey-step');
const progressBar = document.getElementById('journey-progress-bar');
const progressText = document.getElementById('journey-progress-text');

if (journeySection && steps.length > 0) {
  ScrollTrigger.create({
    trigger: '#journey',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const progress = self.progress;
      if (progress >= 1) {
        pastJourney = true;
        inJourney = false;
        currentJourneyStep = 3;
      } else if (progress <= 0) {
        pastJourney = false;
        inJourney = false;
        currentJourneyStep = 0;
      } else {
        pastJourney = false;
        inJourney = true;
        const stepIndex = Math.min(3, Math.floor(progress * 4));
        currentJourneyStep = stepIndex;
      }

      // Update progress bar
      if (progressBar) {
        const percentage = Math.min(100, Math.round((progress * 0.75 + 0.25) * 100));
        progressBar.style.width = `${percentage}%`;
      }
      if (progressText) {
        const displayStep = Math.min(3, Math.floor(progress * 4));
        progressText.textContent = `0${displayStep + 1}/04`;
      }

      // Smooth step card transitions
      const stepIndex = Math.min(3, Math.floor(progress * 4));
      steps.forEach((step, i) => {
        if (i === stepIndex) {
          gsap.to(step, {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            ease: 'power3.out',
            overwrite: 'auto'
          });
        } else {
          const yOffset = i < stepIndex ? -24 : 24;
          gsap.to(step, {
            autoAlpha: 0,
            y: yOffset,
            duration: 0.3,
            ease: 'power2.in',
            overwrite: 'auto'
          });
        }
      });
    },
    onLeave: () => {
      pastJourney = true;
      inJourney = false;
      currentJourneyStep = 3;
    },
    onLeaveBack: () => {
      pastJourney = false;
      inJourney = false;
      currentJourneyStep = 0;
    }
  });
}

