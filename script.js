document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Setup ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffd1dc, 0.001);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const floatingSymbols = [];
    // Changed to marine/nature elements to fit Organimo branding
    const emojis = ['🐚', '🌿', '💧', '✨', '🫧'];

    for(let i = 0; i < 60; i++) {
        const emojiCanvas = document.createElement('canvas');
        emojiCanvas.width = 128; emojiCanvas.height = 128;
        const ctx = emojiCanvas.getContext('2d');
        ctx.font = '72px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        ctx.fillText(randomEmoji, 64, 64);

        const texture = new THREE.CanvasTexture(emojiCanvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85 });
        const sprite = new THREE.Sprite(material);

        sprite.position.set(
            (Math.random() - 0.5) * 400, (Math.random() - 0.5) * 300, (Math.random() * -3000)
        );
        sprite.scale.set(15, 15, 1);
        sprite.userData = { floatSpeed: Math.random() * 0.02 + 0.01, offset: Math.random() * Math.PI * 2 };

        scene.add(sprite);
        floatingSymbols.push(sprite);
    }

    // --- 2. Auto-Animation Logic ---
    let autoProgress = 0;   
    let targetCameraZ = 0;
    let isChatting = false;

    // Corrected to include all 5 sections
    const sections = [
        document.getElementById('sec-0'), 
        document.getElementById('sec-1'),
        document.getElementById('sec-2'), 
        document.getElementById('sec-3'),
        document.getElementById('sec-4')
    ];

    // Corrected math to divide the 1.00 timeline cleanly across 5 sections
    const sectionTimings = [
        { start: 0.00, peak: 0.04, hold: 0.16, end: 0.20 },
        { start: 0.20, peak: 0.24, hold: 0.36, end: 0.40 },
        { start: 0.40, peak: 0.44, hold: 0.56, end: 0.60 },
        { start: 0.60, peak: 0.64, hold: 0.76, end: 0.80 },
        { start: 0.80, peak: 0.85, hold: 1.00, end: 1.00 }
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
            autoProgress += 0.001; 
            if (autoProgress > 1.0) autoProgress = 1.0;
            targetCameraZ = autoProgress * -3000;
        }

        camera.position.z += (targetCameraZ - camera.position.z) * 0.05;

        floatingSymbols.forEach((symbol) => {
            symbol.position.y += Math.sin(time * symbol.userData.floatSpeed + symbol.userData.offset) * 0.1;
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
        
        setTimeout(() => appendMessage("bot", "Hi! I'm Sara, your Organimo health guide. Do you have any questions about our marine ingredients or benefits? 🌿"), 800);
    });

    // Handle Back Button (Exiting Chat)
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
            // Updated System Prompt to match the new brand
            const systemPrompt = "You are Sara, a friendly and knowledgeable health guide for 'Organimo', a brand making natural marine-based multivitamins from Canada (featuring Sea Moss and Bladderwrack). Keep your responses brief, conversational, and helpful.";
            const fullPrompt = `${systemPrompt} The user says: "${text}"`;
            
            const response = await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);
            const aiText = await response.text();

            document.getElementById(typingId).remove();
            appendMessage('bot', aiText);
        } catch (error) {
            document.getElementById(typingId).remove();
            appendMessage('bot', "I'm having a little trouble connecting right now, but I'm still here to help with your wellness journey. 🌿");
        }
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
                
