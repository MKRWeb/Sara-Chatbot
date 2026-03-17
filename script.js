document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Cinematic Dive Setup ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    
    // Color Palette based on the video (Surface Pink -> Deep Purple)
    const surfaceColor = new THREE.Color(0xfbb4b4); // Peachy pink
    const midColor = new THREE.Color(0x8e54e9);     // Vibrant purple
    const deepColor = new THREE.Color(0x2a0845);    // Deep dark purple
    
    scene.background = surfaceColor;
    scene.fog = new THREE.FogExp2(surfaceColor, 0.0015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 50, 400); 

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- 2. Lighting (Crucial for the premium feel) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffeedd, 1);
    directionalLight.position.set(100, 200, 50);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffaaff, 2, 500);
    scene.add(pointLight);

    // --- 3. Optimized 3D Objects (No external models to prevent crashes) ---
    const floatingObjects = [];

    // Premium Materials
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 });
    const pearlMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xffffff, metalness: 0.1, roughness: 0.1, transmission: 0.5, thickness: 1.0 
    });
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffaaff, metalness: 0.2, roughness: 0.1, transmission: 0.9, transparent: true
    });
    const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.2 });

    // Object 1: Floating Ruin / Column (Top surface)
    const columnGeo = new THREE.CylinderGeometry(15, 15, 80, 16);
    const column = new THREE.Mesh(columnGeo, stoneMaterial);
    column.position.set(-80, 20, 150);
    column.rotation.z = Math.PI / 6;
    scene.add(column);
    floatingObjects.push({ mesh: column, bobSpeed: 1.5, rotSpeed: 0.005 });

    // Object 2: Floating Rocks (Top surface)
    const rockGeo = new THREE.BoxGeometry(40, 10, 30);
    for(let i=0; i<3; i++) {
        const rock = new THREE.Mesh(rockGeo, stoneMaterial);
        rock.position.set(60 + (i*40), 10 - (i*20), 100 - (i*30));
        scene.add(rock);
        floatingObjects.push({ mesh: rock, bobSpeed: 1.2 + i*0.2, rotSpeed: 0.01 });
    }

    // Object 3: Glowing Pearl (Mid depth)
    const pearlGeo = new THREE.SphereGeometry(20, 32, 32);
    const pearl = new THREE.Mesh(pearlGeo, pearlMaterial);
    pearl.position.set(0, -600, 50);
    scene.add(pearl);
    floatingObjects.push({ mesh: pearl, bobSpeed: 2.0, rotSpeed: 0.02 });

    // Object 4: Floating Capsules / Multivitamins (Deep)
    const capsuleGeo = new THREE.CapsuleGeometry(10, 20, 16, 32);
    for(let i=0; i<5; i++) {
        const capsule = new THREE.Mesh(capsuleGeo, glassMaterial);
        capsule.position.set((Math.random() - 0.5) * 300, -1200 - (Math.random() * 400), (Math.random() - 0.5) * 200);
        scene.add(capsule);
        floatingObjects.push({ mesh: capsule, bobSpeed: 1.8, rotSpeed: 0.03 });
    }

    // Object 5: Geometric Pyramid (Ocean Floor)
    const pyramidGeo = new THREE.ConeGeometry(50, 80, 4);
    const pyramid = new THREE.Mesh(pyramidGeo, goldMaterial);
    pyramid.position.set(50, -2200, -50);
    scene.add(pyramid);
    floatingObjects.push({ mesh: pyramid, bobSpeed: 0.5, rotSpeed: 0.005 });

    // Ocean floor plane
    const floorGeo = new THREE.PlaneGeometry(2000, 2000);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x110522, roughness: 1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2300;
    scene.add(floor);

    // Bubbles for atmosphere
    const bubbleGeo = new THREE.SphereGeometry(2, 8, 8);
    const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const bubbles = [];
    for(let i=0; i<100; i++) {
        const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
        bubble.position.set((Math.random() - 0.5)*800, (Math.random() * -2400), (Math.random() - 0.5)*800);
        scene.add(bubble);
        bubbles.push(bubble);
    }


    // --- 4. Auto-Animation & Drone Diving Logic ---
    let autoProgress = 0;   
    let targetCameraY = 50;
    let isChatting = false;
    const maxDepth = -2100; // Stops just above the floor

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
            autoProgress += 0.0006; // Smooth, cinematic dive speed
            if (autoProgress > 1.0) autoProgress = 1.0;
            targetCameraY = 50 + (autoProgress * maxDepth);
        }

        // Camera Movement
        camera.position.y += (targetCameraY - camera.position.y) * 0.03;
        camera.position.x = Math.sin(time * 0.3) * 20; // Drone sway
        
        // Point light follows camera to illuminate objects in the dark deep
        pointLight.position.set(camera.position.x, camera.position.y, camera.position.z - 50);

        // Dynamic Environment Colors (Pink -> Purple -> Dark Purple)
        let currentColor = new THREE.Color();
        if (autoProgress < 0.5) {
            currentColor.lerpColors(surfaceColor, midColor, autoProgress * 2);
        } else {
            currentColor.lerpColors(midColor, deepColor, (autoProgress - 0.5) * 2);
        }
        scene.background = currentColor;
        scene.fog.color = currentColor;
        scene.fog.density = 0.0015 + (autoProgress * 0.002);

        // Animate Objects
        floatingObjects.forEach((obj, index) => {
            obj.mesh.position.y += Math.sin(time * obj.bobSpeed + index) * 0.05;
            obj.mesh.rotation.x += obj.rotSpeed;
            obj.mesh.rotation.y += obj.rotSpeed;
        });

        // Animate Bubbles
        bubbles.forEach(bubble => {
            bubble.position.y += 0.5;
            if (bubble.position.y > camera.position.y + 200) {
                bubble.position.y = camera.position.y - 800;
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

    // --- 5. Chatbot Logic ---
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
            setTimeout(() => appendMessage("bot", "Hi there. I'm Sara. You're safe down here. I'm ready to listen. 💜"), 800);
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
            appendMessage('bot', "I'm having a little trouble connecting right now, but I'm still here for you. 💜");
        }
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
                          
