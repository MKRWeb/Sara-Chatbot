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

    // --- 2. Create Floating Romantic Symbols (Love, Kiss, Hug) ---
    const floatingSymbols = [];
    const emojis = ['❤️', '💋', '🫂', '💖', '💕'];

    // Generate 60 floating emojis in the 3D space
    for(let i = 0; i < 60; i++) {
        // Draw emoji on an invisible canvas to use as a 3D texture
        const emojiCanvas = document.createElement('canvas');
        emojiCanvas.width = 128; 
        emojiCanvas.height = 128;
        const ctx = emojiCanvas.getContext('2d');
        ctx.font = '72px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Pick a random romantic emoji
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        ctx.fillText(randomEmoji, 64, 64);

        const texture = new THREE.CanvasTexture(emojiCanvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85 });
        const sprite = new THREE.Sprite(material);

        // Scatter them deep along the camera's path (Z-axis)
        sprite.position.set(
            (Math.random() - 0.5) * 400, // X: left to right
            (Math.random() - 0.5) * 300, // Y: up and down
            (Math.random() * -3000)      // Z: depth into the screen
        );
        
        sprite.scale.set(15, 15, 1);
        
        sprite.userData = {
            floatSpeed: Math.random() * 0.02 + 0.01,
            offset: Math.random() * Math.PI * 2
        };

        scene.add(sprite);
        floatingSymbols.push(sprite);
    }

    // --- 3. Auto-Animation Logic ---
    let autoProgress = 0;   // Goes from 0.0 to 1.0
    let targetCameraZ = 0;
    let isChatting = false;

    const sections = [
        document.getElementById('sec-0'), document.getElementById('sec-1'),
        document.getElementById('sec-2'), document.getElementById('sec-3')
    ];

    // Timings for when each sentence appears and fades out (based on 0 to 1 progress)
    const sectionTimings = [
        { start: 0.05, peak: 0.15, end: 0.25 },
        { start: 0.30, peak: 0.40, end: 0.50 },
        { start: 0.55, peak: 0.65, end: 0.75 },
        { start: 0.80, peak: 0.95, end: 1.00 } // Final screen stays
    ];

    function updateHTMLUI() {
        if(isChatting) return;
        
        sections.forEach((sec, index) => {
            const timing = sectionTimings[index];
            let opacity = 0;
            let scale = 0.5;

            if (autoProgress >= timing.start && autoProgress <= timing.end) {
                if (autoProgress <= timing.peak) {
                    // Entering dimension: Fades in and scales to normal
                    const progress = (autoProgress - timing.start) / (timing.peak - timing.start);
                    opacity = progress;
                    scale = 0.5 + (progress * 0.5); 
                } else if (index !== sections.length - 1) { 
                    // Exiting dimension: Flies past you, scaling up massively
                    const progress = (autoProgress - timing.peak) / (timing.end - timing.peak);
                    opacity = 1 - progress;
                    scale = 1.0 + (progress * 4.0); 
                } else {
                    opacity = 1; scale = 1;
                }
            } else if (index === sections.length - 1 && autoProgress > timing.end) {
                opacity = 1; scale = 1;
            }

            sec.style.opacity = opacity;
            sec.style.transform = `scale(${scale})`;
            sec.style.pointerEvents = opacity > 0.8 ? 'auto' : 'none';
        });
    }

    // --- 4. Render Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        
        // Slowly increment the progress to make it auto-play (takes ~12 seconds)
        if (!isChatting && autoProgress < 1.0) {
            autoProgress += 0.0012; 
            if (autoProgress > 1.0) autoProgress = 1.0;
            targetCameraZ = autoProgress * -3000;
        }

        // Move camera forward
        camera.position.z += (targetCameraZ - camera.position.z) * 0.05;

        // Make the romantic symbols bob up and down gently
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

    // --- 5. Chatbot NLP Logic (Pollinations AI) ---
    const sayHelloBtn = document.getElementById('say-hello-btn');
    const introSequence = document.getElementById('intro-container');
    const chatInterface = document.getElementById('chat-interface');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // Enter Chat Mode
    sayHelloBtn.addEventListener('click', () => {
        isChatting = true;
        introSequence.style.display = 'none'; 
        chatInterface.classList.remove('hidden'); 
        
        setTimeout(() => appendMessage("bot", "Hi there. I'm Sara. I'm here to listen whenever you're ready. 💖"), 800);
    });

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
        typingDiv.textContent = "...";
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
                                   
