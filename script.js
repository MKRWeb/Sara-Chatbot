document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Background Setup ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffd1dc, 0.001);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const floatingObjects = [];
    const geometries = [
        new THREE.TorusGeometry(12, 3, 16, 100),
        new THREE.OctahedronGeometry(15),
        new THREE.TetrahedronGeometry(14),
        new THREE.IcosahedronGeometry(12)
    ];
    
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.5
    });

    for(let i = 0; i < 80; i++) {
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set((Math.random() - 0.5) * 500, (Math.random() - 0.5) * 500, (Math.random() * -3000));
        mesh.userData = {
            rotX: (Math.random() - 0.5) * 0.01, rotY: (Math.random() - 0.5) * 0.01,
            floatSpeed: Math.random() * 0.02, offset: Math.random() * Math.PI * 2
        };
        scene.add(mesh);
        floatingObjects.push(mesh);
    }

    // --- 2. Scroll Dimension Transition Logic ---
    let scrollPercent = 0;
    let targetCameraZ = 0;
    let isChatting = false;

    function updateScroll() {
        if(isChatting) return;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        scrollPercent = maxScroll > 0 ? (scrollTop / maxScroll) : 0;
        targetCameraZ = scrollPercent * -2800; // Move deep into space
    }

    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    const sections = [
        document.getElementById('sec-0'), document.getElementById('sec-1'),
        document.getElementById('sec-2'), document.getElementById('sec-3')
    ];

    const sectionTimings = [
        { start: 0.00, peak: 0.10, end: 0.25 },
        { start: 0.25, peak: 0.40, end: 0.55 },
        { start: 0.50, peak: 0.65, end: 0.80 },
        { start: 0.80, peak: 0.95, end: 1.00 }
    ];

    function updateHTMLUI() {
        if(isChatting) return;
        sections.forEach((sec, index) => {
            const timing = sectionTimings[index];
            let opacity = 0;
            let scale = 0.5;

            if (scrollPercent >= timing.start && scrollPercent <= timing.end) {
                if (scrollPercent <= timing.peak) {
                    // Flying In
                    const progress = (scrollPercent - timing.start) / (timing.peak - timing.start);
                    opacity = progress;
                    scale = 0.5 + (progress * 0.5); // 0.5 to 1.0
                } else if (index !== sections.length - 1) { 
                    // Flying Past (Dimension warp effect)
                    const progress = (scrollPercent - timing.peak) / (timing.end - timing.peak);
                    opacity = 1 - progress;
                    scale = 1.0 + (progress * 3.0); // Scales up massively as it flies past the camera
                } else {
                    opacity = 1; scale = 1;
                }
            } else if (index === sections.length - 1 && scrollPercent > timing.end) {
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
        
        camera.position.z += (targetCameraZ - camera.position.z) * 0.05;

        floatingObjects.forEach((obj) => {
            obj.rotation.x += obj.userData.rotX;
            obj.rotation.y += obj.userData.rotY;
            obj.position.y += Math.sin(time * obj.userData.floatSpeed + obj.userData.offset) * 0.08;
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

    // --- 3. Chatbot NLP Logic (Pollinations AI) ---
    const sayHelloBtn = document.getElementById('say-hello-btn');
    const introSequence = document.getElementById('intro-scroll-container');
    const chatInterface = document.getElementById('chat-interface');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // Enter Chat Mode
    sayHelloBtn.addEventListener('click', () => {
        isChatting = true;
        document.body.style.overflow = 'hidden'; // Stop scrolling
        introSequence.style.display = 'none'; // Hide text
        chatInterface.classList.remove('hidden'); // Show chat
        
        // Push camera deep into a stable background state
        targetCameraZ = -3000; 
        
        // Sara's greeting
        setTimeout(() => appendMessage("bot", "Hi there. I'm Sara. I'm here to listen whenever you're ready."), 800);
    });

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to bottom
    }

    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Show user message
        appendMessage('user', text);
        chatInput.value = '';
        
        // Show typing indicator
        const typingId = "typing-" + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot');
        typingDiv.id = typingId;
        typingDiv.textContent = "...";
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
            appendMessage('bot', "I'm having a little trouble connecting right now, but I'm still here for you.");
        }
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
                
