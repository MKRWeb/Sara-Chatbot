document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Setup & Floral Gates ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffe4e1, 0.0008); // Soft romantic fog

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Helper: Generate Emoji Textures for Flowers
    function createEmojiTexture(emoji, size = 128) {
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        ctx.font = `${size * 0.75}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size / 2, size / 2);
        return new THREE.CanvasTexture(c);
    }

    const flowerEmojis = ['🌸', '🌺', '🌷', '🌼'];
    const flowerTextures = flowerEmojis.map(e => createEmojiTexture(e));

    // Create a 3D Gate decorated with flowers
    const gates = [];
    function buildFloralGate(zPos, triggerTime) {
        const gateGroup = new THREE.Group();
        gateGroup.position.z = zPos;

        const doorWidth = 350;
        const doorHeight = 600;

        // Semi-transparent frosted glass/white wood material for doors
        const doorMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, transparent: true, opacity: 0.6 
        });

        // --- Left Door ---
        const leftHinge = new THREE.Group();
        leftHinge.position.set(-doorWidth, 0, 0); // Position hinge at left edge

        const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 10), doorMat);
        leftDoor.position.set(doorWidth / 2, 0, 0); // Offset mesh relative to hinge
        leftHinge.add(leftDoor);

        // --- Right Door ---
        const rightHinge = new THREE.Group();
        rightHinge.position.set(doorWidth, 0, 0); // Position hinge at right edge

        const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 10), doorMat);
        rightDoor.position.set(-doorWidth / 2, 0, 0); // Offset mesh relative to hinge
        rightHinge.add(rightDoor);

        // Decorate doors with flowers
        for (let i = 0; i < 20; i++) {
            const tex = flowerTextures[Math.floor(Math.random() * flowerTextures.length)];
            const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            
            // Left door decorations
            const spriteL = new THREE.Sprite(spriteMat);
            spriteL.position.set((Math.random() - 0.5) * doorWidth * 0.8, (Math.random() - 0.5) * doorHeight * 0.8, 6);
            spriteL.scale.set(40, 40, 1);
            leftDoor.add(spriteL);

            // Right door decorations
            const spriteR = new THREE.Sprite(spriteMat);
            spriteR.position.set((Math.random() - 0.5) * doorWidth * 0.8, (Math.random() - 0.5) * doorHeight * 0.8, 6);
            spriteR.scale.set(40, 40, 1);
            rightDoor.add(spriteR);
        }

        gateGroup.add(leftHinge, rightHinge);
        scene.add(gateGroup);

        // Save reference to animate later
        gates.push({ 
            left: leftHinge, 
            right: rightHinge, 
            trigger: triggerTime 
        });
    }

    // Place gates at calculated Z-depths to match the timing of the sentences ending
    // Camera travels from Z=0 to Z=-3000 over progress 0.0 -> 1.0
    buildFloralGate(-650, 0.18);  // Gate 1 (End of Sentence 1)
    buildFloralGate(-1400, 0.43); // Gate 2 (End of Sentence 2)
    buildFloralGate(-2150, 0.68); // Gate 3 (Opens to Home Page)

    // Add some soft ambient falling petals
    const petals = [];
    for(let i = 0; i < 40; i++) {
        const tex = flowerTextures[Math.floor(Math.random() * flowerTextures.length)];
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7 });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set((Math.random() - 0.5) * 800, (Math.random() - 0.5) * 600, (Math.random() * -2800));
        sprite.scale.set(15, 15, 1);
        sprite.userData = { speedY: Math.random() * 0.5 + 0.2, speedX: Math.random() * 0.2 - 0.1 };
        scene.add(sprite);
        petals.push(sprite);
    }

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

        // Move camera smoothly forward
        camera.position.z += (targetCameraZ - camera.position.z) * 0.05;

        // Animate Gates (Open when threshold is met)
        gates.forEach((gate) => {
            // If camera is getting close (based on progress timing), open doors
            const targetRot = autoProgress >= gate.trigger ? Math.PI * 0.6 : 0;
            
            // Lerp left door rotation (opens inward/left)
            gate.left.rotation.y += (-targetRot - gate.left.rotation.y) * 0.04;
            // Lerp right door rotation (opens inward/right)
            gate.right.rotation.y += (targetRot - gate.right.rotation.y) * 0.04;
        });

        // Drift background petals gently
        petals.forEach((petal) => {
            petal.position.y -= petal.userData.speedY;
            petal.position.x += petal.userData.speedX;
            if (petal.position.y < -400) petal.position.y = 400; // loop
        });

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

    // Entering Chat
    sayHelloBtn.addEventListener('click', () => {
        isChatting = true;
        history.pushState({ page: 'chat' }, 'Chat with Sara', '#chat');

        introSequence.style.display = 'none'; 
        chatInterface.classList.remove('hidden'); 
        
        setTimeout(() => appendMessage("bot", "Hi there. I'm Sara. I'm here to listen whenever you're ready. 💖"), 800);
    });

    // Handle Back Button (Exiting Chat)
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
                
