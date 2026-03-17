document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Scroll-Driven Setup ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    
    // Color Palette: Pink Surface -> Purple Mid -> Dark Violet Deep
    const colorTop = new THREE.Color(0xfbb4b4); 
    const colorMid = new THREE.Color(0x6a2a88);     
    const colorDeep = new THREE.Color(0x220b34);    
    
    scene.background = colorTop;
    scene.fog = new THREE.FogExp2(colorTop, 0.0012);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    // Start at the surface
    camera.position.set(0, 100, 400); 

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- 2. Cinematic Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffaaff, 2, 600);
    scene.add(pointLight);

    // --- 3. Code-Generated 3D Objects ---
    const floatingObjects = [];

    // Premium Materials
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 });
    const shellMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
    const pillMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffaaff, transmission: 0.8, opacity: 1, transparent: true, roughness: 0.1 });
    const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9, roughness: 0.2 });

    // Object 1: Ruins (Cylinders) - Surface Level
    const columnGeo = new THREE.CylinderGeometry(15, 15, 100, 16);
    const column = new THREE.Mesh(columnGeo, stoneMaterial);
    column.position.set(-90, 20, 100);
    column.rotation.z = Math.PI / 8;
    scene.add(column);
    floatingObjects.push({ mesh: column, rotSpeedX: 0.002, rotSpeedY: 0.005 });

    // Object 2: Organic Shell Proxy (TorusKnot) - Upper Mid Level
    const shellGeo = new THREE.TorusKnotGeometry(20, 6, 100, 16);
    const shell = new THREE.Mesh(shellGeo, shellMaterial);
    shell.position.set(80, -500, 50);
    scene.add(shell);
    floatingObjects.push({ mesh: shell, rotSpeedX: 0.005, rotSpeedY: 0.01 });

    // Object 3: Limitless Pills (Stretched Spheres) - Deep Mid Level
    const pillGeo = new THREE.SphereGeometry(8, 32, 32);
    for(let i=0; i<4; i++) {
        const pill = new THREE.Mesh(pillGeo, pillMaterial);
        pill.scale.set(1, 2.5, 1); // Stretch to make a pill shape
        pill.position.set((Math.random() - 0.5) * 200, -1200 - (Math.random() * 400), (Math.random() - 0.5) * 150);
        scene.add(pill);
        floatingObjects.push({ mesh: pill, rotSpeedX: 0.02, rotSpeedY: 0.03 });
    }

    // Object 4: The Golden Pyramid - Ocean Floor
    const pyramidGeo = new THREE.ConeGeometry(60, 90, 4);
    const pyramid = new THREE.Mesh(pyramidGeo, goldMaterial);
    pyramid.position.set(40, -2200, -50);
    scene.add(pyramid);
    floatingObjects.push({ mesh: pyramid, rotSpeedX: 0.002, rotSpeedY: 0.008 });

    // The Ocean Floor
    const floorGeo = new THREE.PlaneGeometry(3000, 3000);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x110522, roughness: 1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2300;
    scene.add(floor);

    // Particles/Bubbles
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 400;
    const posArray = new Float32Array(particleCount * 3);
    for(let i=0; i < particleCount * 3; i+=3) {
        posArray[i] = (Math.random() - 0.5) * 1000;       // x
        posArray[i+1] = (Math.random() - 0.5) * -2500;    // y
        posArray[i+2] = (Math.random() - 0.5) * 1000;     // z
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({ size: 2, color: 0xffffff, transparent: true, opacity: 0.4 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- 4. Scroll Engine ---
    let targetScrollProgress = 0;
    let currentScrollProgress = 0;
    const maxDepth = -2150; 

    // Listen to user scrolling
    window.addEventListener('scroll', () => {
        // Calculate percentage of page scrolled (0.0 to 1.0)
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        targetScrollProgress = window.scrollY / scrollableHeight;
    });

    // UI Text Timings based on Scroll %
    const sections = [
        document.getElementById('sec-0'), document.getElementById('sec-1'),
        document.getElementById('sec-2'), document.getElementById('sec-3')
    ];
    const sectionTimings = [
        { start: 0.00, peak: 0.08, hold: 0.15, end: 0.22 },
        { start: 0.25, peak: 0.33, hold: 0.40, end: 0.47 },
        { start: 0.50, peak: 0.58, hold: 0.65, end: 0.72 },
        { start: 0.75, peak: 0.85, hold: 1.00, end: 1.00 }
    ];

    function updateHTMLUI(progress) {
        sections.forEach((sec, index) => {
            if(!sec) return;
            const t = sectionTimings[index];
            let opacity = 0; let scale = 0.85;

            if (progress >= t.start && progress <= t.end) {
                if (progress < t.peak) {
                    const p = (progress - t.start) / (t.peak - t.start);
                    opacity = p; scale = 0.85 + (p * 0.15);
                } else if (progress <= t.hold) {
                    opacity = 1; scale = 1.0;
                } else if (index !== sections.length - 1) { 
                    const p = (progress - t.hold) / (t.end - t.hold);
                    opacity = 1 - p; 
                    scale = 1.0 + (p * 0.5); 
                } else {
                    opacity = 1; scale = 1;
                }
            } else if (index === sections.length - 1 && progress > t.end) {
                opacity = 1; scale = 1;
            }

            sec.style.opacity = Math.max(0, opacity);
            sec.style.transform = `scale(${scale})`;
            sec.style.pointerEvents = opacity > 0.8 ? 'auto' : 'none';
        });
    }

    const clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        
        // Lerp (smooth out) the scroll progress so it glides like Apple websites
        currentScrollProgress += (targetScrollProgress - currentScrollProgress) * 0.05;

        // Move Camera based on scroll
        camera.position.y = 100 + (currentScrollProgress * maxDepth);
        
        // Gentle drone sway
        camera.position.x = Math.sin(time * 0.4) * 15; 
        camera.lookAt(camera.position.x, camera.position.y, 0); 
        
        // Point light follows camera
        pointLight.position.set(camera.position.x, camera.position.y, camera.position.z - 50);

        // Dynamic Color Blending based on Scroll Depth
        let renderColor = new THREE.Color();
        if (currentScrollProgress < 0.5) {
            // Top half: Pink to Mid Purple
            const mix = currentScrollProgress * 2;
            renderColor.copy(colorTop).lerp(colorMid, mix);
        } else {
            // Bottom half: Mid Purple to Deep Violet
            const mix = (currentScrollProgress - 0.5) * 2;
            renderColor.copy(colorMid).lerp(colorDeep, mix);
        }
        
        scene.background = renderColor;
        scene.fog.color = renderColor;
        scene.fog.density = 0.0012 + (currentScrollProgress * 0.002); // Thicker at bottom

        // Rotate Objects
        floatingObjects.forEach((obj, index) => {
            obj.mesh.rotation.x += obj.rotSpeedX;
            obj.mesh.rotation.y += obj.rotSpeedY;
            obj.mesh.position.y += Math.sin(time * 2 + index) * 0.1; // Bobbing
        });

        // Drift Particles
        particles.position.y = Math.sin(time * 0.5) * 20;

        updateHTMLUI(currentScrollProgress);
        renderer.render(scene, camera);
    }
    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- 5. Chat Interface Logic ---
    const sayHelloBtn = document.getElementById('say-hello-btn');
    const chatInterface = document.getElementById('chat-interface');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const farewellOverlay = document.getElementById('farewell-overlay');

    if(sayHelloBtn) {
        sayHelloBtn.addEventListener('click', () => {
            document.body.style.overflow = 'hidden'; // Lock scrolling
            history.pushState({ page: 'chat' }, 'Chat with Sara', '#chat');
            chatInterface.classList.remove('hidden'); 
            
            if(chatMessages.children.length === 0) {
                setTimeout(() => appendMessage("bot", "Hi there. You made it to the bottom. I'm ready to listen. 💜"), 800);
            }
        });
    }

    window.addEventListener('popstate', (event) => {
        if (!chatInterface.classList.contains('hidden')) {
            handleExitChat();
        }
    });

    function handleExitChat() {
        chatInterface.classList.add('hidden');
        farewellOverlay.style.opacity = '1';
        farewellOverlay.style.pointerEvents = 'auto';

        setTimeout(() => {
            farewellOverlay.style.opacity = '0';
            farewellOverlay.style.pointerEvents = 'none';
            document.body.style.overflow = 'auto'; // Unlock scrolling
            document.body.style.overflowX = 'hidden';
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
            const systemPrompt = "You are Sara. You are a romantic, sweet, deeply empathetic, and completely non-judgmental listener.";
            const fullPrompt = `${systemPrompt} The user says: "${text}"`;
            const response = await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);
            const aiText = await response.text();

            const typingEl = document.getElementById(typingId);
            if(typingEl) typingEl.remove();
            appendMessage('bot', aiText);
        } catch (error) {
            const typingEl = document.getElementById(typingId);
            if(typingEl) typingEl.remove();
            appendMessage('bot', "I'm having a little trouble connecting right now, but I'm still here. 💜");
        }
    }

    if(sendBtn && chatInput) {
        sendBtn.addEventListener('click', handleSend);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }
});
        
