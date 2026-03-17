document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Oceanic Drone Setup ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    
    // Deeper, vibrant reef colors
    const surfaceColor = new THREE.Color(0x0088cc);
    const deepReefColor = new THREE.Color(0x001e36);
    
    scene.background = surfaceColor;
    scene.fog = new THREE.FogExp2(surfaceColor, 0.0015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 0, 400); 

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- 2. Crash-Proof Entity Generation (Texture Caching) ---
    // We create the textures ONCE to save memory, preventing browser crashes.
    const seaCreatures = [
        { char: '🐠', type: 'fish', speed: 1.5, size: 20 },
        { char: '🐟', type: 'fish', speed: 1.2, size: 18 },
        { char: '🐡', type: 'fish', speed: 1.0, size: 22 },
        { char: '🐙', type: 'creature', speed: 0.4, size: 30 },
        { char: '🧜‍♀️', type: 'mermaid', speed: 0.6, size: 35 },
        { char: '🐳', type: 'whale', speed: 0.2, size: 60 },
        { char: '🐋', type: 'whale', speed: 0.3, size: 70 },
        { char: '🪸', type: 'coral', speed: 0, size: 50 }
    ];

    const textureCache = {};

    function createEmojiTexture(char) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 128; tempCanvas.height = 128;
        const ctx = tempCanvas.getContext('2d');
        ctx.font = '80px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, 64, 64);
        return new THREE.CanvasTexture(tempCanvas);
    }

    // Pre-load all textures into the cache
    seaCreatures.forEach(creature => {
        textureCache[creature.char] = createEmojiTexture(creature.char);
    });

    const floatingEntities = [];

    // Spawn 150 entities scattered through the depth
    for(let i = 0; i < 150; i++) {
        // Pick a random creature
        const template = seaCreatures[Math.floor(Math.random() * seaCreatures.length)];
        
        // Reuse the cached texture
        const material = new THREE.SpriteMaterial({ map: textureCache[template.char], transparent: true });
        const sprite = new THREE.Sprite(material);

        let yPos, xPos, zPos;
        
        // Corals stay at the bottom of the reef, others swim everywhere
        if (template.type === 'coral') {
            yPos = -2200 - Math.random() * 400; // Ocean floor
        } else {
            yPos = (Math.random() - 0.5) * -2500; // Scattered depths
        }
        
        xPos = (Math.random() - 0.5) * 1200;
        zPos = (Math.random() - 0.5) * 800 - 100;

        sprite.position.set(xPos, yPos, zPos);
        
        // Add some random size variance
        const sizeVariance = template.size * (0.8 + Math.random() * 0.4);
        sprite.scale.set(sizeVariance, sizeVariance, 1);
        
        // Flip sprites horizontally if they are swimming left
        const direction = Math.random() > 0.5 ? 1 : -1;
        if (direction === -1 && template.type !== 'coral') {
            sprite.material.rotation = Math.PI; // Flip emoji
            sprite.material.needsUpdate = true;
        }

        sprite.userData = { 
            type: template.type,
            speedX: direction * template.speed,
            baseY: yPos,
            bobSpeed: Math.random() * 2 + 1,
            bobOffset: Math.random() * Math.PI * 2
        };

        scene.add(sprite);
        floatingEntities.push(sprite);
    }

    // --- 3. Auto-Animation & Drone Diving Logic ---
    let autoProgress = 0;   
    let targetCameraY = 0;
    let isChatting = false;
    const maxDepth = -2300; 

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

    const clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        
        if (!isChatting && autoProgress < 1.0) {
            autoProgress += 0.0007; // Slow dive
            if (autoProgress > 1.0) autoProgress = 1.0;
            targetCameraY = autoProgress * maxDepth;
        }

        // Camera Drone Movement
        camera.position.y += (targetCameraY - camera.position.y) * 0.03;
        // Add a gentle side-to-side drone sway
        camera.position.x = Math.sin(time * 0.5) * 15;

        // Dynamic Environment Colors
        const currentColor = surfaceColor.clone().lerp(deepReefColor, autoProgress);
        scene.background = currentColor;
        scene.fog.color = currentColor;
        scene.fog.density = 0.001 + (autoProgress * 0.0015);

        // Animate Entities
        floatingEntities.forEach((entity) => {
            if (entity.userData.type !== 'coral') {
                // Swim left/right
                entity.position.x += entity.userData.speedX;
                
                // Gentle bobbing up and down
                entity.position.y = entity.userData.baseY + Math.sin(time * entity.userData.bobSpeed + entity.userData.bobOffset) * 10;

                // Wrap around the screen horizontally so it feels infinite
                if (entity.position.x > 800) entity.position.x = -800;
                if (entity.position.x < -800) entity.position.x = 800;
            }
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

    // --- 4. Chatbot Logic ---
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
        
        if(chatMessages.children.length === 0) {
            setTimeout(() => appendMessage("bot", "Hi there. I'm Sara. You're safe here. I'm ready to listen whenever you are. 🪸💙"), 800);
        }
    });

    window.addEventListener('popstate', (event) => {
        if (isChatting) {
            handleExitChat();
        }
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
                updateHTMLUI();
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
            appendMessage('bot', "I'm having a little trouble connecting right now, but I'm still here for you. 💙");
        }
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
            
