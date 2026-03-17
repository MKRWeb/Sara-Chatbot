document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Setup ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffd1dc, 0.0012);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- 2. Add Lighting for 3D Objects ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // --- 3. Create Ongoing Animated 3D Objects ---
    const floatingObjects = [];
    const geometries = [
        new THREE.TorusGeometry(12, 3, 16, 100),     // Floating rings
        new THREE.OctahedronGeometry(15),            // Diamonds
        new THREE.TetrahedronGeometry(14),           // Pyramids
        new THREE.IcosahedronGeometry(12)            // Spheres
    ];
    
    // Create a soft, frosted-glass look for the objects
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 0.2, 
        metalness: 0.1,
        transparent: true,
        opacity: 0.6
    });

    // Generate 70 objects scattered deep into the background
    for(let i = 0; i < 70; i++) {
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.x = (Math.random() - 0.5) * 500;
        mesh.position.y = (Math.random() - 0.5) * 500;
        mesh.position.z = (Math.random() * -2500) + 100; 
        
        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.y = Math.random() * Math.PI;
        
        // Give each object its own unique rotation and floating speed
        mesh.userData = {
            rotSpeedX: (Math.random() - 0.5) * 0.01,
            rotSpeedY: (Math.random() - 0.5) * 0.01,
            floatSpeed: Math.random() * 0.02,
            floatOffset: Math.random() * Math.PI * 2
        };
        
        scene.add(mesh);
        floatingObjects.push(mesh);
    }

    // --- 4. Scroll Tracking Logic ---
    let scrollPercent = 0;
    let targetCameraZ = 0;

    function updateScroll() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        scrollPercent = maxScroll > 0 ? (scrollTop / maxScroll) : 0;
        targetCameraZ = scrollPercent * -2500; 
    }

    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll(); 

    // --- 5. HTML UI Updates ---
    const sections = [
        document.getElementById('sec-0'),
        document.getElementById('sec-1'),
        document.getElementById('sec-2'),
        document.getElementById('sec-3')
    ];

    const sectionTimings = [
        { start: 0.00, peak: 0.05, end: 0.20 },
        { start: 0.25, peak: 0.35, end: 0.45 },
        { start: 0.50, peak: 0.60, end: 0.75 },
        { start: 0.80, peak: 0.95, end: 1.00 }
    ];

    function updateHTMLUI() {
        sections.forEach((sec, index) => {
            if (!sec) return;
            const timing = sectionTimings[index];
            let opacity = 0;
            let scale = 0.8;

            if (scrollPercent >= timing.start && scrollPercent <= timing.end) {
                if (scrollPercent <= timing.peak) {
                    const progress = (scrollPercent - timing.start) / (timing.peak - timing.start);
                    opacity = progress;
                    scale = 0.8 + (progress * 0.2);
                } else if (index !== sections.length - 1) { 
                    const progress = (scrollPercent - timing.peak) / (timing.end - timing.peak);
                    opacity = 1 - progress;
                    scale = 1.0 + (progress * 0.5);
                } else {
                    opacity = 1;
                    scale = 1;
                }
            } else if (index === sections.length - 1 && scrollPercent > timing.end) {
                opacity = 1;
                scale = 1;
            }

            sec.style.opacity = opacity;
            sec.style.transform = `scale(${scale}) translateZ(0)`;
            sec.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
        });
    }

    // --- 6. Animation Loop (The Ongoing Motion) ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Smoothly glide camera based on scroll
        camera.position.z += (targetCameraZ - camera.position.z) * 0.05;

        // Animate all 3D objects continuously
        floatingObjects.forEach((obj) => {
            obj.rotation.x += obj.userData.rotSpeedX;
            obj.rotation.y += obj.userData.rotSpeedY;
            // Gentle up and down bobbing motion
            obj.position.y += Math.sin(elapsedTime * obj.userData.floatSpeed + obj.userData.floatOffset) * 0.1;
        });

        updateHTMLUI();
        renderer.render(scene, camera);
    }

    animate();

    // --- 7. Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
                                
