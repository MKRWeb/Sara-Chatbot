// Ensure DOM is fully parsed
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Setup ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    // Pink fog blends particles into the CSS background
    scene.fog = new THREE.FogExp2(0xffd1dc, 0.0015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- 2. Create Floating Particles ---
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 3000;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i+=3) {
        posArray[i] = (Math.random() - 0.5) * 1000;
        posArray[i+1] = (Math.random() - 0.5) * 1000;
        posArray[i+2] = (Math.random() * -3000) + 500;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 4,
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    camera.position.z = 0;

    // --- 3. Scroll Tracking Logic ---
    let scrollPercent = 0;
    let targetCameraZ = 0;

    function updateScroll() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        scrollPercent = maxScroll > 0 ? (scrollTop / maxScroll) : 0;
        targetCameraZ = scrollPercent * -2500; 
    }

    window.addEventListener('scroll', updateScroll, { passive: true });
    // Run once on load to set initial state
    updateScroll(); 

    // --- 4. HTML UI Updates ---
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
            sec.style.transform = `scale(${scale}) translateZ(0)`; // translateZ forces hardware acceleration
            sec.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
        });
    }

    // --- 5. Animation Loop ---
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Smooth camera interpolation (Lerp)
        camera.position.z += (targetCameraZ - camera.position.z) * 0.05;

        // Slow rotation of particles
        particlesMesh.rotation.y = elapsedTime * 0.02;
        particlesMesh.rotation.x = elapsedTime * 0.01;

        updateHTMLUI();
        renderer.render(scene, camera);
    }

    animate();

    // --- 6. Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
                  
