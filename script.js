document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Oceanic Setup ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    
    // Define our ocean colors (Surface vs Deep)
    const surfaceColor = new THREE.Color(0x0077be);
    const deepColor = new THREE.Color(0x000511);
    
    scene.background = surfaceColor;
    scene.fog = new THREE.FogExp2(surfaceColor, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    // Start slightly above 0
    camera.position.set(0, 0, 500); 

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const floatingBubbles = [];

    // Create a realistic bubble texture using Canvas API
    const createBubbleTexture = () => {
        const bubbleCanvas = document.createElement('canvas');
        bubbleCanvas.width = 64; bubbleCanvas.height = 64;
        const ctx = bubbleCanvas.getContext('2d');
        
        // Bubble outline
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner faint fill
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
        
        // Specular highlight (reflection)
        ctx.beginPath();
        ctx.arc(22, 22, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        return new THREE.CanvasTexture(bubbleCanvas);
    };

    const bubbleTexture = createBubbleTexture();

    // Generate Bubbles
    for(let i = 0; i < 150; i++) {
        const material = new THREE.SpriteMaterial({ map: bubbleTexture, transparent: true, blending: THREE.AdditiveBlending });
        const sprite = new THREE.Sprite(material);

        // Randomize positions in a wide volume
        sprite.position.set(
            (Math.random() - 0.5) * 1000, 
            (Math.random() - 0.5) * -2500, // Spread them deep down
            (Math.random() - 0.5) * 800
        );
        
        const scaleBase = Math.random() * 8 + 4;
        sprite.scale.set(scaleBase, scaleBase, 1);
        
        // Custom data for bubble animation
        sprite.userData = { 
            floatSpeed: Math.random() * 1.5 + 0.5, 
            wobbleSpeed: Math.random() * 0.02 + 0.01,
            wobbleOffset: Math.random() * Math.PI * 2,
            baseX: sprite.position.x
        };

        scene.add(sprite);
        floatingBubbles.push(sprite);
    }

    // --- 2. Auto-Animation & Diving Logic ---
    let autoProgress = 0;   
    let targetCameraY = 0;
    let isChatting = false;
    const maxDepth = -2500; // How deep the camera goes

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
        
        // Progression algorithm
        if (!isChatting && autoProgress < 1.0) {
            autoProgress += 0.0008; // Adjusted speed for a smooth dive
            if (autoProgress > 1.0) autoProgress = 1.0;
            targetCameraY = autoProgress * maxDepth;
        }

        // Smoothly move camera down
        camera.position.y += (targetCameraY - camera.position.y) * 0.03;

        // Dynamic Environment Colors (Lerping from surface to deep ocean)
        const currentColor = surfaceColor.clone().lerp(deepColor, autoProgress);
        scene.background = currentColor;
        scene.fog.color = currentColor;
        scene.fog.density = 0.001 + (autoProgress * 0.002); // Fog gets thicker at depth

        // Animate Bubbles
        floatingBubbles.forEach((bubble) => {
            // Rise up
            bubble.position.y += bubble.userData.floatSpeed;
            // Wobble side to side
            bubble.position.x = bubble.userData.baseX + Math.sin(time * bubble.userData.wobbleSpeed + bubble.userData.wobbleOffset) * 20;

            // Continuous loop: If a bubble goes too far above the camera, reset it deep below the camera
            if (bubble.position.y > camera.position.y + 400) {
                bubble.position.y = camera.position.y - 1000 - (Math.random() * 500);
                bubble.position.x = bubble.userData.baseX = (Math.random() - 0.5) * 1000;
            }
        });

        updateHTMLUI();
        renderer.render(scene, camera);
    }
    animate();

    // Handle Window Resize
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
        
        // Empty previous messages if reopening
        if(chatMessages.children.length === 0) {
            setTimeout(() => appendMessage("bot", "Hi there. I'm Sara. You're safe here. I'm ready to listen whenever you are. 🌊💙"), 800);
        }
    });

    // Safely exit chat without crashing
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
                // Lock progress at 1 to keep them at the deep ocean "Say Hello" screen smoothly
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
            
