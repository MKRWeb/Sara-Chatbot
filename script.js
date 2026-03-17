document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Setup ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    // Calm blue fog and lighting for peace of mind
    scene.fog = new THREE.FogExp2(0xc2e0ff, 0.001); 

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // --- 2. Create Floating Romantic Symbols (Love, Kiss, Hug) ---
    // User requested natural scenario instead of emojis
    const floatingSymbols = [];
    const emojiSymbols = ['❤️', '💋', '🫂', '💖', '💕']; // No change needed to this line

    // New 3D textures for natural scenario: clouds, detailed leaves, flowers
    const natureTextures = [];

    // Draw cloud texture
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 128; cloudCanvas.height = 128;
    const ctxC = cloudCanvas.getContext('2d');
    ctxC.fillStyle = '#ffffff';
    // Draw overlapping blurred circles for soft cloud shape
    const drawCircle = (x, y, r, shadow) => {
        ctxC.shadowColor = `rgba(0, 0, 0, ${shadow})`;
        ctxC.shadowBlur = 15;
        ctxC.beginPath();
        ctxC.arc(x, y, r, 0, Math.PI * 2);
        ctxC.fill();
    };
    drawCircle(64, 64, 30, 0.05);
    drawCircle(40, 70, 25, 0.03);
    drawCircle(88, 70, 25, 0.03);
    drawCircle(55, 90, 20, 0.02);
    drawCircle(75, 90, 20, 0.02);
    natureTextures.push(new THREE.CanvasTexture(cloudCanvas));

    // Draw detailed green leaf texture
    const leafCanvas = document.createElement('canvas');
    leafCanvas.width = 128; leafCanvas.height = 128;
    const ctxL = leafCanvas.getContext('2d');
    // Simple leaf path
    const drawLeaf = (x, y, scale, angle, color) => {
        ctxL.save();
        ctxL.translate(x, y);
        ctxL.rotate(angle);
        ctxL.scale(scale, scale);
        ctxL.fillStyle = color;
        ctxL.beginPath();
        ctxL.moveTo(0, 0);
        ctxL.bezierCurveTo(-20, -10, -30, 30, 0, 50);
        ctxL.bezierCurveTo(30, 30, 20, -10, 0, 0);
        ctxL.fill();
        // Add veins
        ctxL.strokeStyle = `rgba(0,0,0,0.1)`;
        ctxL.beginPath();
        ctxL.moveTo(0,0);
        ctxL.lineTo(0, 50);
        ctxL.moveTo(0, 10); ctxL.lineTo(-10, 20);
        ctxL.moveTo(0, 10); ctxL.lineTo(10, 20);
        ctxL.moveTo(0, 25); ctxL.lineTo(-15, 35);
        ctxL.moveTo(0, 25); ctxL.lineTo(15, 35);
        ctxL.stroke();
        ctxL.restore();
    };
    drawLeaf(64, 40, 1.2, 0, '#66cc66'); // Darker green
    drawLeaf(80, 50, 1.0, 0.3, '#99ff99'); // Lighter green
    drawLeaf(48, 50, 1.0, -0.3, '#99ff99'); // Lighter green
    natureTextures.push(new THREE.CanvasTexture(leafCanvas));

    // Draw simple colorful flower texture
    const flowerCanvas = document.createElement('canvas');
    flowerCanvas.width = 128; flowerCanvas.height = 128;
    const ctxF = flowerCanvas.getContext('2d');
    // Simple colorful flower
    const drawFlower = (x, y, r, color, colorCenter) => {
        ctxF.save();
        ctxF.translate(x, y);
        // Petals
        for (let i = 0; i < 5; i++) {
            ctxF.rotate(Math.PI * 2 / 5);
            ctxF.fillStyle = color;
            ctxF.beginPath();
            ctxF.arc(0, r, r*0.7, 0, Math.PI * 2);
            ctxF.fill();
        }
        // Center
        ctxF.fillStyle = colorCenter;
        ctxF.beginPath();
        ctxF.arc(0, 0, r/2, 0, Math.PI * 2);
        ctxF.fill();
        ctxF.restore();
    };
    // colorful small colorful flower for petals. small colorful colorful colorful circles colorful
    drawFlower(64, 64, 15, '#ff99ff', '#ffff99');
    drawFlower(50, 50, 10, '#ccffff', '#ffff99');
    drawFlower(78, 50, 10, '#ccffff', '#ffff99');
    drawFlower(50, 78, 10, '#ccffff', '#ffff99');
    drawFlower(78, 78, 10, '#ccffff', '#ffff99');
    natureTextures.push(new THREE.CanvasTexture(flowerCanvas));

    // Scatter 60 nature sprites (clouds, detailed leaves, flowers) deep along the camera's path
    for(let i = 0; i < 60; i++) {
        // Draw emoji on an invisible canvas to use as a 3D texture
        const texture = natureTextures[Math.floor(Math.random() * natureTextures.length)];
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85 });
        const sprite = new THREE.Sprite(material);

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

    // --- 3. Auto-Animation Logic with Reading Pauses ---
    let autoProgress = 0;   
    let targetCameraZ = 0;
    let isChatting = false;
    let isExiting = false; // Tracks if the 15-second exit timer is running

    const sections = [
        document.getElementById('sec-0'), document.getElementById('sec-1'),
        document.getElementById('sec-2'), document.getElementById('sec-3')
    ];

    // Added a "hold" phase. It fades in until "peak", stays entirely static until "hold", then flies past.
    // Timings for when each sentence appears and fades out (based on 0 to 1 progress)
    // User requested static reader time before passing, but user requested "total opposite" animation of passing.
    // The opposite of passing is **staying**, which perfectly creates a peaceful feeling.
    // The camera flies through a landscape of text, and by the end, you pass many static text sections. This is peaceful.
    const sectionTimings = [
        { start: 0.00, peak: 0.05, hold: 0.18, end: 0.25 },
        { start: 0.25, peak: 0.30, hold: 0.43, end: 0.50 },
        { start: 0.50, peak: 0.55, hold: 0.68, end: 0.75 },
        { start: 0.75, peak: 0.85, hold: 1.00, end: 1.00 } // Final screen stays
    ];

    function updateHTMLUI() {
        if(isChatting) return;
        
        sections.forEach((sec, index) => {
            if (!sec) return;
            const t = sectionTimings[index];
            let opacity = 0;
            let scale = 0.8;

            if (autoProgress >= t.start && autoProgress <= t.end) {
                if (autoProgress < t.peak) {
                    // 1. Fading in and settling into place
                    const p = (autoProgress - t.start) / (t.peak - t.start);
                    opacity = p;
                    scale = 0.8 + (p * 0.2); // scales 0.8 to 1.0
                } 
                else if (autoProgress <= t.hold) {
                    // 2. STATIC READING TIME - perfectly still
                    opacity = 1;
                    scale = 1.0;
                } 
                // User requested totally opposite passing effect. The opposite is accumulation.
                // Intermediate sections appear and later stay. Scale and opacity fixed at 1.0.
                else if (index !== sections.length - 1) { 
                    // No pass logic, they simply stay on screen.
                    opacity = 1; scale = 1.0; 
                } 
                else {
                    opacity = 1; scale = 1;
                }
            } 
            // Once they faded in, they stay interactive if they accumulate
            else if (index < sections.length - 1 && autoProgress > t.end) {
                 opacity = 1; scale = 1;
            }
            else if (index === sections.length - 1 && autoProgress > t.end) {
                opacity = 1; scale = 1;
            }

            sec.style.opacity = opacity;
            sec.style.transform = `scale(${scale})`;
            // Pointer events auto for accumulated sections if faded in.
            // Wait, for peaceful feeling, it's better if they stay non-interactive.
            // User requested final screen button, so that one must be interactive.
            // Okay, let's make all faded-in sections interactive for simplicity and correctness if they accumulate.
            // User feedback on previous version requested final button to be interactive.
            // Intermediate sections now appear one by one. Final screen stays.
            // User requested final screen description details too. These logic looks solid.
            sec.style.pointerEvents = opacity > 0.8 ? 'auto' : 'none';
        });
    }

    // --- 4. Render Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        
        // Slower increment for a relaxed ~16-18 second cinematic experience
        if (!isChatting && autoProgress < 1.0) {
            autoProgress += 0.001; 
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
    // Preservation of chatbot, NLP, typing animation, delayed back button exit logic
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
        isExiting = false;
        
        // Push state to browser history (Intercept Back Button)
        history.pushState({ page: 'chat' }, 'Chat with Sara', '#chat');

        introSequence.style.display = 'none'; 
        chatInterface.classList.remove('hidden'); 
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.placeholder = "Type a message...";
        
        // Sara's greeting on avatar gradient background
        setTimeout(() => appendMessage("bot", "Hi there. I'm Sara. I'm here to listen whenever you're ready. 💖"), 800);
    });

    // Handle Back Button (Delayed Exit)
    window.addEventListener('popstate', (event) => {
        if (isChatting && !isExiting) {
            handleDelayedExit();
        }
    });

    function handleDelayedExit() {
        isExiting = true;
        
        // Push state AGAIN so the user doesn't accidentally leave while waiting
        history.pushState({ page: 'exiting' }, 'Leaving soon', '#leaving');

        // Disable input so they can't send more messages while exiting
        chatInput.disabled = true;
        sendBtn.disabled = true;
        chatInput.placeholder = "Closing soon...";

        // Sara lets them know she's giving them time
        setTimeout(() => {
            appendMessage("bot", "I see you have to go. I'll leave our messages up for 15 seconds so you can finish reading. 🌸");
        }, 500);

        // 15 Second Timer before the final farewell screen
        setTimeout(() => {
            chatInterface.classList.add('hidden');
            farewellOverlay.style.opacity = '1';
            farewellOverlay.style.pointerEvents = 'auto';

            // Wait 3 seconds, hide farewell, and return to Home Screen
            setTimeout(() => {
                farewellOverlay.style.opacity = '0';
                farewellOverlay.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    introSequence.style.display = 'flex';
                    autoProgress = 1.0; // Ensure we are exactly at the "Say hello" screen
                    isChatting = false;
                    
                    // Clear chat history for the next time they click "Say hello"
                    chatMessages.innerHTML = '';
                    chatInput.value = '';
                    chatInput.placeholder = "Type a message...";
                }, 1000); // Wait for fade out
                
            }, 3000); // 3 seconds to read the final overlay message
        }, 15000); // 15 SECONDS WAIT TIME
    }

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
    }

    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text || isExiting) return;

        // Show user message
        appendMessage('user', text);
        chatInput.value = '';
        
        // Show Animated Typing Dots
        const typingId = "typing-" + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot');
        typingDiv.id = typingId;
        typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // Pollinations NLP API - Prompt structured for a romantic, empathetic response
            const systemPrompt = "You are Sara. You are a romantic, sweet, deeply empathetic, and completely non-judgmental listener. Keep your responses brief, conversational, and comforting. Do not act like a robot.";
            const fullPrompt = `${systemPrompt} The user says: "${text}"`;
            
            const response = await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);
            const aiText = await response.text();

            // Replace typing indicator with actual response
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
    
