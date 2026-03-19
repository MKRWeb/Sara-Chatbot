document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. Three.js Setup & Solid Wooden Shutters ---
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    // Deep black-blue fog 
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.0007); 

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Soft pinkish-purple ambient lighting 
    const ambientLight = new THREE.AmbientLight(0xe6c8ee, 0.6); 
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xd484e1, 1.0); 
    dirLight.position.set(200, 500, 300);
    scene.add(dirLight);

    // --- Window Material ---
    // Deep purple-pink to match the theme!
    const woodMat = new THREE.MeshStandardMaterial({ 
        color: 0x9b5de5, 
        roughness: 0.90, 
        metalness: 0.10 
    });

    const windowsArray = [];

    function buildSolidWoodenWindow(zPos, triggerTime) {
        const windowGroup = new THREE.Group();
        windowGroup.position.z = zPos;

        const width = 500;
        const height = 700;
        const frameThick = 30;
        const frameDepth = 40;

        const outerFrame = new THREE.Group();
        
        const topOuter = new THREE.Mesh(new THREE.BoxGeometry(width + frameThick*2, frameThick, frameDepth), woodMat);
        topOuter.position.y = height / 2 + frameThick / 2;
        
        const botOuter = new THREE.Mesh(new THREE.BoxGeometry(width + frameThick*2, frameThick, frameDepth), woodMat);
        botOuter.position.y = -height / 2 - frameThick / 2;
        
        const leftOuter = new THREE.Mesh(new THREE.BoxGeometry(frameThick, height, frameDepth), woodMat);
        leftOuter.position.x = -width / 2 - frameThick / 2;
        
        const rightOuter = new THREE.Mesh(new THREE.BoxGeometry(frameThick, height, frameDepth), woodMat);
        rightOuter.position.x = width / 2 + frameThick / 2;

        outerFrame.add(topOuter, botOuter, leftOuter, rightOuter);
        windowGroup.add(outerFrame);

        const doorWidth = width / 2;

        function createSolidDoor(isLeft) {
            const doorGroup = new THREE.Group();
            const direction = isLeft ? 1 : -1;
            const doorBase = new THREE.Group();

            const backPanel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth - 4, height - 4, 12), woodMat);

            const braceThick = 18;
            const topBrace = new THREE.Mesh(new THREE.BoxGeometry(doorWidth - 10, 25, braceThick), woodMat);
            topBrace.position.set(0, height / 2 - 40, 0);

            const botBrace = new THREE.Mesh(new THREE.BoxGeometry(doorWidth - 10, 25, braceThick), woodMat);
            botBrace.position.set(0, -height / 2 + 40, 0);

            const diagLength = Math.sqrt(Math.pow(doorWidth, 2) + Math.pow(height - 80, 2));
            const diagBrace = new THREE.Mesh(new THREE.BoxGeometry(diagLength - 20, 25, braceThick), woodMat);
            const angle = Math.atan2(height - 80, doorWidth);
            diagBrace.rotation.z = isLeft ? angle : -angle;

            doorBase.add(backPanel, topBrace, botBrace, diagBrace);
            doorBase.position.set(direction * (doorWidth / 2), 0, 0); 
            doorGroup.add(doorBase);

            return doorGroup;
        }

        const leftHinge = createSolidDoor(true);
        leftHinge.position.set(-width / 2, 0, 0); 

        const rightHinge = createSolidDoor(false);
        rightHinge.position.set(width / 2, 0, 0); 

        windowGroup.add(leftHinge, rightHinge);
        scene.add(windowGroup);

        windowsArray.push({ left: leftHinge, right: rightHinge, trigger: triggerTime });
    }

    buildSolidWoodenWindow(-650, 0.18);  
    buildSolidWoodenWindow(-1400, 0.43); 
    buildSolidWoodenWindow(-2150, 0.68); 

    // Soft glowing pink/purple particles
    const particles = [];
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const posArray = new Float32Array(particleCount * 3);

    for(let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 2000; 
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
        size: 4, color: 0xffb3f6, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);
    
    // ... KEEP THE REST OF YOUR JS EXACTLY AS IT WAS ...
                          
