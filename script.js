document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Setup & Ancient Wooden Windows ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffe4e1, 0.0006); 

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Realistic Lighting setup
    const ambientLight = new THREE.AmbientLight(0xfff0dd, 0.7); // Warmer ambient light
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffe8c4, 1.8); // Warm, golden sunlight
    dirLight.position.set(500, 600, 500);
    scene.add(dirLight);

    // --- Ancient Materials ---
    // Aged, rough dark wood
    const woodMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a3424, // Deep weathered brown
        roughness: 0.95, 
        metalness: 0.0 
    });

    // Imperfect, slightly frosted ancient glass
    const ancientGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0xfdfbf7, // Slightly milky/dusty tint
        metalness: 0.1,
        roughness: 0.25, // Not perfectly smooth
        transmission: 0.65, // Less clear than modern glass
        opacity: 1,
        transparent: true,
        ior: 1.55, 
        side: THREE.DoubleSide
    });

    const windowsArray = [];

    // Function to build a classic ancient window with multiple panes
    function buildAncientWindow(zPos, triggerTime) {
        const windowGroup = new THREE.Group();
        windowGroup.position.z = zPos;

        const width = 480;
        const height = 700;
        const frameThick = 25; // Thicker, heavier wood
        const frameDepth = 35;

        // --- 1. Outer Heavy Wooden Frame ---
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

        const paneWidth = width / 2;

        // Helper function to create a door with classic crossbars (muntins)
        function createDoorGroup(isLeft) {
            const doorGroup = new THREE.Group();
            const direction = isLeft ? 1 : -1;
            
            // Outer frame of the swinging door
            const innerThick = 15;
            const doorBorder = new THREE.Group();

            const dTop = new THREE.Mesh(new THREE.BoxGeometry(paneWidth, innerThick, 20), woodMat);
            dTop.position.set(0, height/2 - innerThick/2, 0);
            
            const dBot = new THREE.Mesh(new THREE.BoxGeometry(paneWidth, innerThick, 20), woodMat);
            dBot.position.set(0, -height/2 + innerThick/2, 0);

            const dLeft = new THREE.Mesh(new THREE.BoxGeometry(innerThick, height, 20), woodMat);
            dLeft.position.set(-paneWidth/2 + innerThick/2, 0, 0);

            const dRight = new THREE.Mesh(new THREE.BoxGeometry(innerThick, height, 20), woodMat);
            dRight.position.set(paneWidth/2 - innerThick/2, 0, 0);

            // Crossbars (Muntins) to create the classic 6-pane look per door
            const crossbarV = new THREE.Mesh(new THREE.BoxGeometry(8, height - innerThick*2, 22), woodMat);
            
            const crossbarH1 = new THREE.Mesh(new THREE.BoxGeometry(paneWidth - innerThick*2, 8, 22), woodMat);
            crossbarH1.position.y = height/6;

            const crossbarH2 = new THREE.Mesh(new THREE.BoxGeometry(paneWidth - innerThick*2, 8, 22), woodMat);
            crossbarH2.position.y = -height/6;

            // Single glass plane sitting "inside" the wood bars
            const glass = new THREE.Mesh(new THREE.BoxGeometry(paneWidth - innerThick*2, height - innerThick*2, 4), ancientGlassMat);

            doorBorder.add(dTop, dBot, dLeft, dRight, crossbarV, crossbarH1, crossbarH2, glass);
            
            // Offset the whole door to swing from its edge
            doorBorder.position.set(direction * (paneWidth / 2), 0, 0); 
            doorGroup.add(doorBorder);

            return doorGroup;
        }

        // --- 2. Left Swinging Pane ---
        const leftHinge = createDoorGroup(true);
        leftHinge.position.set(-width / 2, 0, 0); 

        // --- 3. Right Swinging Pane ---
        const rightHinge = createDoorGroup(false);
        rightHinge.position.set(width / 2, 0, 0); 

        windowGroup.add(leftHinge, rightHinge);
        scene.add(windowGroup);

        windowsArray.push({ left: leftHinge, right: rightHinge, trigger: triggerTime });
    }

    // Place Ancient Windows
    buildAncientWindow(-650, 0.18);  
    buildAncientWindow(-1400, 0.43); 
    buildAncientWindow(-2150, 0.68); 

    // Ambient dust motes
    const particles = [];
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const posArray = new Float32Array(particleCount * 3);

    for(let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 2000; 
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
        size: 4,
        color: 0xffe8c4, // Warm glowing dust
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
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
        { start: 0.00, peak: 0.05, hold: 0.18, end: 0.25 },
        { start: 0.25, peak: 0.30, hold: 0.43, end: 0.50 },
        { start: 0.50, peak: 0.55, hold: 0.68, end: 0.75 },
        { start: 0.75, peak: 0.85, hold: 1.00, end: 1.00 }
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
            autoProgress += 0.001; 
            if (autoProgress > 1.0) autoProgress = 1.0;
            targetCameraZ = autoProgress * -3000;
        }

        camera.position.z += (targetCameraZ - camera.position.z) * 0.05;

        // Animate Ancient Windows Swinging Open Outward
        windowsArray.forEach((win) => {
            const targetRot = autoProgress >= win.trigger ? Math.PI * 0.6 : 0;
            win.left.rotation.y += (-targetRot - win.left.rotation.y) * 0.035; // slightly slower, heavier swing
            win.right.rotation.y += (targetRot - win.right.rotation.y) * 0.035;
        });

        // Drift dust particles lazily
        particleSystem.rotation.y += 0.0004;
        particleSystem.rotation.x += 0.00015;

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
            
