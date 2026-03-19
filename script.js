document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Setup & Solid Wooden Shutters ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    // Soft twilight blue fog 
    scene.fog = new THREE.FogExp2(0x142433, 0.0007); 

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Cool, soft ambient lighting (gentle on the eyes)
    const ambientLight = new THREE.AmbientLight(0xdbebf9, 0.6); 
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xaad4eb, 1.0); 
    dirLight.position.set(200, 500, 300);
    scene.add(dirLight);

    // --- Ancient Solid Wood Material ---
    // Deep, rich dark brown for nice contrast against the blue sky
      
const woodMat = new THREE.MeshStandardMaterial({ 
    color: 0x825e4c, // This matches the specific brown in your image
    roughness: 0.85, 
    metalness: 0.05 
});


    const windowsArray = [];

    function buildSolidWoodenWindow(zPos, triggerTime) {
        const windowGroup = new THREE.Group();
        windowGroup.position.z = zPos;

        const width = 500;
        const height = 700;
        const frameThick = 30;
        const frameDepth = 40;

        const outerFrame = new THREE.Group();
        
        const topOuter = new THREE.Mesh(new THREE.BoxGeometry(width + frameThick*2, frameThick, frameDepth), woodMat);
        topOuter.position.y = height / 2 + frameThick / 2;
        
        const botOuter = new THREE.Mesh(new THREE.BoxGeometry(width + frameThick*2, frameThick, frameDepth), woodMat);
        botOuter.position.y = -height / 2 - frameThick / 2;
        
        const leftOuter = new THREE.Mesh(new THREE.BoxGeometry(frameThick, height, frameDepth), woodMat);
        leftOuter.position.x = -width / 2 - frameThick / 2;
        
        const rightOuter = new THREE.Mesh(new THREE.BoxGeometry(frameThick, height, frameDepth), woodMat);
        rightOuter.position.x = width / 2 + frameThick / 2;

        outerFrame.add(topOuter, botOuter, leftOuter, rightOuter);
        windowGroup.add(outerFrame);

        const doorWidth = width / 2;

        function createSolidDoor(isLeft) {
            const doorGroup = new THREE.Group();
            const direction = isLeft ? 1 : -1;
            const doorBase = new THREE.Group();

            const backPanel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth - 4, height - 4, 12), woodMat);

            const braceThick = 18;
            const topBrace = new THREE.Mesh(new THREE.BoxGeometry(doorWidth - 10, 25, braceThick), woodMat);
            topBrace.position.set(0, height / 2 - 40, 0);

            const botBrace = new THREE.Mesh(new THREE.BoxGeometry(doorWidth - 10, 25, braceThick), woodMat);
            botBrace.position.set(0, -height / 2 + 40, 0);

            const diagLength = Math.sqrt(Math.pow(doorWidth, 2) + Math.pow(height - 80, 2));
            const diagBrace = new THREE.Mesh(new THREE.BoxGeometry(diagLength - 20, 25, braceThick), woodMat);
            const angle = Math.atan2(height - 80, doorWidth);
            diagBrace.rotation.z = isLeft ? angle : -angle;

            doorBase.add(backPanel, topBrace, botBrace, diagBrace);
            doorBase.position.set(direction * (doorWidth / 2), 0, 0); 
            doorGroup.add(doorBase);

            return doorGroup;
        }

        const leftHinge = createSolidDoor(true);
        leftHinge.position.set(-width / 2, 0, 0); 

        const rightHinge = createSolidDoor(false);
        rightHinge.position.set(width / 2, 0, 0); 

        windowGroup.add(leftHinge, rightHinge);
        scene.add(windowGroup);

        windowsArray.push({ left: leftHinge, right: rightHinge, trigger: triggerTime });
    }

    buildSolidWoodenWindow(-650, 0.18);  
    buildSolidWoodenWindow(-1400, 0.43); 
    buildSolidWoodenWindow(-2150, 0.68); 

    // Soft sky-blue floating particles
    const particles = [];
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const posArray = new Float32Array(particleCount * 3);

    for(let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 2000; 
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
        size: 4, color: 0x76b3e8, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // --- 2. Auto-Animation & Progression Logic ---
    let autoProgress = 0;   
    let targetCameraZ = 0;
    let isChatting = false;

    const sections = [
        document.getElementById('sec-0'), document.getElementById('sec-1'),
        document.getElementById('sec-2'), document.getElementById('sec-3')
    ];

    const sectionTimings = [
        { start: 0.00, peak: 0.05, hold: 0.16, end: 0.24 },
        { start: 0.24, peak: 0.30, hold: 0.41, end: 0.49 },
        { start: 0.49, peak: 0.55, hold: 0.66, end: 0.74 },
        { start: 0.74, peak: 0.85, hold: 1.00, end: 1.00 }
    ];

    function updateHTMLUI() {
        if(isChatting) return;
        
        sections.forEach((sec, index) => {
            const t = sectionTimings[index];
            let opacity = 0; let scale = 0.8;

            if (autoProgress >= t.start && autoProgress <= t.end) {
                if (autoProgress < t.peak) {
                    const p = (autoProgress - t.start) / (t.peak - t.start);
                    opacity = p; scale = 0.8 + (p * 0.2);
                } else if (autoProgress <= t.hold) {
                    opacity = 1; scale = 1.0;
                } else if (index !== sections.length - 1) { 
                    const p = (autoProgress - t.hold) / (t.end - t.hold);
                    opacity = 1 - (p * 1.5); if(opacity < 0) opacity = 0;
                    scale = 1.0 + (p * 4.0); 
                } else {
                    opacity = 1; scale = 1;
                }
            } else if (index === sections.length - 1 && autoProgress > t.end) {
                opacity = 1; scale = 1;
            }

            sec.style.opacity = opacity;
            sec.style.transform = `scale(${scale})`;
            sec.style.pointerEvents = opacity > 0.8 ? 'auto' : 'none';
        });
    }

    function animate() {
        requestAnimationFrame(animate);
        
        if (!isChatting && autoProgress < 1.0) {
            autoProgress += 0.0006; 
            if (autoProgress > 1.0) autoProgress = 1.0;
            targetCameraZ = autoProgress * -3000;
        }

        camera.position.z += (targetCameraZ - camera.position.z) * 0.04;

        // Animate Solid Wooden Windows Swinging Open Inward (Backwards)
        windowsArray.forEach((win) => {
            const targetRot = autoProgress >= win.trigger ? Math.PI * 0.65 : 0;
            win.left.rotation.y += (targetRot - win.left.rotation.y) * 0.015; 
            win.right.rotation.y += (-targetRot - win.right.rotation.y) * 0.015;
        });

        particleSystem.rotation.y += 0.0003;
        particleSystem.rotation.x += 0.0001;

        updateHTMLUI();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- 3. Chatbot NLP & Navigation History Logic ---
    const sayHelloBtn = document.getElementById('say-hello-btn');
    const introSequence = document.getElementById('intro-container');
    const chatInterface = document.getElementById('chat-interface');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const farewellOverlay = document.getElementById('farewell-overlay');

    sayHelloBtn.addEventListener('click', () => {
        isChatting = true;
        history.pushState({ page: 'chat' }, 'Chat with Sara', '#chat');

        introSequence.style.display = 'none'; 
        chatInterface.classList.remove('hidden'); 
        
        setTimeout(() => appendMessage("bot", "Hi there. I'm Sara. I'm here to listen whenever you're ready. 💖"), 800);
    });

    window.addEventListener('popstate', (event) => {
        if (isChatting) handleExitChat();
    });

    function handleExitChat() {
        isChatting = false;
        chatInterface.classList.add('hidden');
        
        farewellOverlay.style.opacity = '1';
        farewellOverlay.style.pointerEvents = 'auto';

        setTimeout(() => {
            farewellOverlay.style.opacity = '0';
            farewellOverlay.style.pointerEvents = 'none';
            
            setTimeout(() => {
                introSequence.style.display = 'flex';
                autoProgress = 1.0; 
            }, 1000);
            
        }, 3000); 
    }

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage('user', text);
        chatInput.value = '';
        
        const typingId = "typing-" + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot');
        typingDiv.id = typingId;
        typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const systemPrompt = "You are Sara. You are a romantic, sweet, deeply empathetic, and completely non-judgmental listener. Keep your responses brief, conversational, and comforting. Do not act like a robot.";
            const fullPrompt = `${systemPrompt} The user says: "${text}"`;
            
            const response = await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);
            const aiText = await response.text();

            document.getElementById(typingId).remove();
            appendMessage('bot', aiText);
        } catch (error) {
            document.getElementById(typingId).remove();
            appendMessage('bot', "I'm having a little trouble connecting right now, but I'm still here for you. ❤️");
        }
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
        
