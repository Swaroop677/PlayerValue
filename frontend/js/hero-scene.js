/**
 * ========================================================
 * 3D HERO SCENE (THREE.JS) - PLAYERVALUE
 * ========================================================
 * 
 * CONFIGURATION GUIDE:
 * - COLORS:
 *     Modify `CONFIG.colors` below:
 *       • neonGreen: Edge lines, pitch lines, green rim light (default: 0x00FF88)
 *       • cyan: Orbiting ring, cyan rim light (default: 0x00F2FE)
 *       • sky: Floating particles, accent light (default: 0x38BDF8)
 *       • gold: Tallest market growth bar column (default: 0xFFC94D)
 *       • darkBall: Procedural football body color (default: 0x060C18)
 * 
 * - RING SPEEDS:
 *     Modify `CONFIG.ringSpeedMultiplier` (e.g. 1.0 = normal, 2.0 = double speed)
 *     or customize individual speeds in `createOrbitingRings()`.
 * 
 * - MODEL PATH:
 *     Set `CONFIG.modelPath` to your custom GLTF/GLB model (e.g. 'assets/football.glb').
 *     If the file does not exist or fails to load, the scene automatically builds
 *     the procedural dark glossy icosahedron with glowing neon-green edges.
 * 
 * ========================================================
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Configuration
export const CONFIG = {
    modelPath: 'assets/football.glb',
    ringSpeedMultiplier: 1.0,
    colors: {
        neonGreen: 0x00FF88,
        cyan: 0x00F2FE,
        sky: 0x38BDF8,
        gold: 0xFFC94D,
        darkBall: 0x070D1A,
        ambient: 0x0F172A,
        keyLight: 0xFFFFFF
    },
    particles: {
        desktopCount: 220,
        mobileCount: 75
    },
    bloom: {
        enabledOnDesktop: true,
        strength: 0.48,
        radius: 0.35,
        threshold: 0.28
    }
};

/**
 * Check WebGL availability
 */
function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

/**
 * Main 3D Hero Scene Controller
 */
export function initHeroScene() {
    const container = document.getElementById('hero-3d-container');
    const canvas = document.getElementById('hero-3d-canvas');

    if (!container || !canvas) return;

    // Check reduced motion preference or WebGL support
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !isWebGLAvailable()) {
        container.classList.add('fallback-active');
        return;
    }

    let renderer, scene, camera, composer;
    let ballGroup, ballBodyMesh, ballEdgeMaterial;
    let rings = [];
    let bars = [];
    let particlePoints, particlePositions;
    let raycaster, mouse;
    let isIntersecting = true;
    let isTabVisible = true;
    let isHovered = false;
    let spinSpeedMultiplier = 1.0;
    let glowMultiplier = 1.0;

    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const clock = new THREE.Clock();
    const startTime = clock.getElapsedTime();

    // 1. Scene & Transparent Background
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060C1A, 0.042);

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight || 1;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(0, 0.8, 8.2);
    camera.lookAt(0, 0.2, 0);

    // 3. Renderer with transparent background (alpha: true)
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.setClearColor(0x000000, 0);

    // 4. Lighting: Green & Cyan rim lights, white key light, ambient light
    const ambientLight = new THREE.AmbientLight(CONFIG.colors.ambient, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(CONFIG.colors.keyLight, 1.8);
    keyLight.position.set(3.5, 5.5, 5.5);
    scene.add(keyLight);

    const greenRimLight = new THREE.DirectionalLight(CONFIG.colors.neonGreen, 2.6);
    greenRimLight.position.set(-5.5, 3.2, -4.5);
    scene.add(greenRimLight);

    const cyanRimLight = new THREE.DirectionalLight(CONFIG.colors.cyan, 2.6);
    cyanRimLight.position.set(5.5, 3.2, -4.5);
    scene.add(cyanRimLight);

    const softFillLight = new THREE.PointLight(CONFIG.colors.sky, 0.7, 14);
    softFillLight.position.set(0, -1.2, 3.5);
    scene.add(softFillLight);

    // 5. Build Floor Pitch Grid
    buildFloorGrid(scene);

    // 6. Build Market Growth Bar Columns
    bars = buildMarketGrowthBars(scene);

    // 7. Build Orbiting Torus Rings
    rings = buildOrbitingRings(scene);

    // 8. Build Floating Particles
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? CONFIG.particles.mobileCount : CONFIG.particles.desktopCount;
    const particleData = buildParticles(scene, particleCount);
    particlePoints = particleData.points;
    particlePositions = particleData.positions;

    // 9. Central Football (Try GLTF or build procedural)
    ballGroup = new THREE.Group();
    ballGroup.position.set(0, 0.2, 0);
    scene.add(ballGroup);

    tryLoadFootball(ballGroup).then(res => {
        ballBodyMesh = res.bodyMesh;
        ballEdgeMaterial = res.edgeMaterial;
    });

    // 10. Optional Desktop Bloom via UnrealBloomPass
    initPostprocessing();

    // 11. Interaction Setup
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    setupEventListeners();

    // 12. Main Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Pause rendering when offscreen or tab hidden
        if (!isIntersecting || !isTabVisible) return;

        const elapsedTime = clock.getElapsedTime();
        const delta = clock.getDelta();

        // A. Football rotation & bobbing (6-second smooth loop)
        if (ballGroup) {
            // Smoothly interpolate hover speed and glow
            const targetSpeed = isHovered ? 3.5 : 1.0;
            const targetGlow = isHovered ? 2.4 : 1.0;
            spinSpeedMultiplier += (targetSpeed - spinSpeedMultiplier) * 0.08;
            glowMultiplier += (targetGlow - glowMultiplier) * 0.08;

            const baseRotSpeed = 0.008 * spinSpeedMultiplier;
            ballGroup.rotation.y += baseRotSpeed;
            ballGroup.rotation.x += baseRotSpeed * 0.35;

            // 6-second vertical bobbing loop
            const bobOffset = Math.sin((elapsedTime / 6) * Math.PI * 2) * 0.16;
            ballGroup.position.y = 0.2 + bobOffset;

            // Update edge glow when hovered
            if (ballEdgeMaterial) {
                ballEdgeMaterial.opacity = Math.min(0.85 * glowMultiplier, 1.0);
            }
        }

        // B. Orbiting Torus Rings
        rings.forEach(ring => {
            ring.mesh.rotation.x += ring.speedX * spinSpeedMultiplier;
            ring.mesh.rotation.y += ring.speedY * spinSpeedMultiplier;
            ring.mesh.rotation.z += ring.speedZ * spinSpeedMultiplier;
        });

        // C. Market Growth Bars (Staggered rise on load, then gentle pulse)
        bars.forEach((bar, idx) => {
            const barDelay = idx * 0.12;
            const timeSinceStart = elapsedTime - startTime - barDelay;

            if (timeSinceStart > 0) {
                const riseProgress = Math.min(timeSinceStart / 1.1, 1);
                // Ease out cubic
                const ease = 1 - Math.pow(1 - riseProgress, 3);
                
                if (riseProgress < 1) {
                    bar.mesh.scale.y = Math.max(bar.targetHeight * ease, 0.01);
                } else {
                    // Gentle live pulse
                    const pulse = Math.sin(elapsedTime * 2.2 + idx * 0.5) * 0.038;
                    bar.mesh.scale.y = bar.targetHeight * (1 + pulse);
                }
                bar.mesh.position.y = bar.floorY + (bar.mesh.scale.y / 2);
            }
        });

        // D. Floating Particles drift
        if (particlePositions && particlePoints) {
            const posArray = particlePositions;
            const len = posArray.length / 3;
            for (let i = 0; i < len; i++) {
                // Drift upwards slowly
                posArray[i * 3 + 1] += Math.sin(elapsedTime * 0.8 + i) * 0.002 + 0.0035;
                if (posArray[i * 3 + 1] > 6.5) {
                    posArray[i * 3 + 1] = -3.8;
                }
            }
            particlePoints.geometry.attributes.position.needsUpdate = true;
        }

        // E. Mouse Parallax (Gentle camera and scene tilt toward cursor)
        currentMouseX += (targetMouseX - currentMouseX) * 0.05;
        currentMouseY += (targetMouseY - currentMouseY) * 0.05;
        camera.position.x = currentMouseX * 1.25;
        camera.position.y = 0.8 + currentMouseY * 0.8;
        camera.lookAt(0, 0.2, 0);

        // F. Render Scene
        if (composer && window.innerWidth >= 768 && CONFIG.bloom.enabledOnDesktop) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }

    animate();

    /**
     * Set up resize, mouse parallax, raycaster hover, and visibility observers
     */
    function setupEventListeners() {
        // Window Resize
        function onWindowResize() {
            if (!container || !renderer || !camera) return;
            const width = container.clientWidth;
            const height = container.clientHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setSize(width, height, false);
            if (composer) {
                composer.setSize(width, height);
            }
        }
        window.addEventListener('resize', onWindowResize);

        // Mouse Parallax & Hover Raycasting
        function onMouseMove(event) {
            const rect = container.getBoundingClientRect();
            // Normalized coordinates (-1 to 1)
            targetMouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            targetMouseY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

            // Raycasting for ball hover
            mouse.x = targetMouseX;
            mouse.y = targetMouseY;
            raycaster.setFromCamera(mouse, camera);

            if (ballGroup) {
                const intersects = raycaster.intersectObjects(ballGroup.children, true);
                isHovered = intersects.length > 0;
            }
        }

        function onMouseLeave() {
            targetMouseX = 0;
            targetMouseY = 0;
            isHovered = false;
        }

        // Pointer events only active on desktop
        if (window.innerWidth >= 768) {
            container.addEventListener('mousemove', onMouseMove);
            container.addEventListener('mouseleave', onMouseLeave);
        }

        // IntersectionObserver: Pause rendering when off-screen
        const intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isIntersecting = entry.isIntersecting;
            });
        }, { threshold: 0.05 });
        intersectionObserver.observe(container);

        // Tab Visibility: Pause rendering when tab is hidden
        document.addEventListener('visibilitychange', () => {
            isTabVisible = !document.hidden;
        });
    }

    /**
     * Post-processing (Bloom on Desktop only)
     */
    function initPostprocessing() {
        if (window.innerWidth < 768 || !CONFIG.bloom.enabledOnDesktop) return;

        try {
            const renderPass = new RenderPass(scene, camera);
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(container.clientWidth, container.clientHeight),
                CONFIG.bloom.strength,
                CONFIG.bloom.radius,
                CONFIG.bloom.threshold
            );

            composer = new EffectComposer(renderer);
            composer.addPass(renderPass);
            composer.addPass(bloomPass);
        } catch (err) {
            console.warn('UnrealBloomPass unavailable, continuing with standard renderer:', err);
            composer = null;
        }
    }
}

/**
 * Floor Pitch Grid fading into fog
 */
function buildFloorGrid(scene) {
    const floorY = -2.1;

    // Subtle green wireframe grid
    const grid = new THREE.GridHelper(30, 26, CONFIG.colors.neonGreen, 0x0E243D);
    grid.position.y = floorY;
    if (grid.material) {
        grid.material.transparent = true;
        grid.material.opacity = 0.22;
    }
    scene.add(grid);

    // Football pitch center circle marking
    const circleGeom = new THREE.RingGeometry(2.7, 2.76, 52);
    circleGeom.rotateX(-Math.PI / 2);
    const circleMat = new THREE.MeshBasicMaterial({
        color: CONFIG.colors.neonGreen,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide
    });
    const pitchCircle = new THREE.Mesh(circleGeom, circleMat);
    pitchCircle.position.set(0, floorY + 0.005, 0);
    scene.add(pitchCircle);

    // Center pitch line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-14, floorY + 0.005, 0),
        new THREE.Vector3(14, floorY + 0.005, 0)
    ]);
    const lineMat = new THREE.LineBasicMaterial({
        color: CONFIG.colors.neonGreen,
        transparent: true,
        opacity: 0.22
    });
    const pitchLine = new THREE.Line(lineGeom, lineMat);
    scene.add(pitchLine);
}

/**
 * 6-8 Glass-like Bar Columns (Market Growth Curve)
 */
function buildMarketGrowthBars(scene) {
    const bars = [];
    const floorY = -2.1;
    // Heights forming realistic valuation growth trajectory (tallest is gold)
    const heights = [1.2, 1.6, 2.2, 1.9, 2.8, 3.5, 4.3];
    const barWidth = 0.38;
    const barDepth = 0.38;

    heights.forEach((targetHeight, idx) => {
        const isTallest = (idx === heights.length - 1);
        const geom = new THREE.BoxGeometry(barWidth, 1, barDepth);

        // Glass-like MeshPhysicalMaterial with transmission, opacity, and emissive glow
        let material;
        if (isTallest) {
            // Gold column
            material = new THREE.MeshPhysicalMaterial({
                color: CONFIG.colors.gold,
                transparent: true,
                opacity: 0.88,
                transmission: 0.55,
                roughness: 0.12,
                metalness: 0.35,
                ior: 1.5,
                emissive: 0xF59E0B,
                emissiveIntensity: 0.65
            });
        } else {
            // Cyan/emerald glass column
            material = new THREE.MeshPhysicalMaterial({
                color: 0x0EA5E9,
                transparent: true,
                opacity: 0.72,
                transmission: 0.68,
                roughness: 0.18,
                metalness: 0.15,
                ior: 1.45,
                emissive: 0x0284C7,
                emissiveIntensity: 0.38
            });
        }

        const mesh = new THREE.Mesh(geom, material);

        // Curved arc placement behind the central football
        const spreadX = -3.2 + (idx * (6.4 / (heights.length - 1)));
        const arcZ = -2.2 - Math.sin((idx / (heights.length - 1)) * Math.PI) * 0.85;

        mesh.position.set(spreadX, floorY + 0.01, arcZ);
        mesh.scale.set(1, 0.01, 1); // Start small for staggered rise animation

        scene.add(mesh);

        bars.push({
            mesh,
            targetHeight,
            floorY
        });
    });

    return bars;
}

/**
 * 2-3 Thin Orbiting Torus Rings in Cyan and Green
 */
function buildOrbitingRings(scene) {
    const rings = [];

    const ringDefs = [
        {
            radius: 2.35,
            tube: 0.022,
            color: CONFIG.colors.cyan,
            emissive: CONFIG.colors.cyan,
            opacity: 0.65,
            rotX: Math.PI / 3,
            rotZ: Math.PI / 12,
            speedX: 0.005 * CONFIG.ringSpeedMultiplier,
            speedY: 0.009 * CONFIG.ringSpeedMultiplier,
            speedZ: 0.003 * CONFIG.ringSpeedMultiplier
        },
        {
            radius: 2.95,
            tube: 0.018,
            color: CONFIG.colors.neonGreen,
            emissive: CONFIG.colors.neonGreen,
            opacity: 0.55,
            rotX: -Math.PI / 4,
            rotZ: -Math.PI / 8,
            speedX: -0.006 * CONFIG.ringSpeedMultiplier,
            speedY: -0.007 * CONFIG.ringSpeedMultiplier,
            speedZ: -0.004 * CONFIG.ringSpeedMultiplier
        },
        {
            radius: 3.55,
            tube: 0.016,
            color: CONFIG.colors.sky,
            emissive: CONFIG.colors.sky,
            opacity: 0.45,
            rotX: Math.PI / 6,
            rotZ: Math.PI / 4,
            speedX: 0.003 * CONFIG.ringSpeedMultiplier,
            speedY: 0.0045 * CONFIG.ringSpeedMultiplier,
            speedZ: 0.002 * CONFIG.ringSpeedMultiplier
        }
    ];

    ringDefs.forEach(def => {
        const geom = new THREE.TorusGeometry(def.radius, def.tube, 16, 100);
        const mat = new THREE.MeshStandardMaterial({
            color: def.color,
            emissive: def.emissive,
            emissiveIntensity: 0.75,
            transparent: true,
            opacity: def.opacity,
            roughness: 0.25,
            metalness: 0.1
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.set(def.rotX, 0, def.rotZ);
        scene.add(mesh);

        rings.push({
            mesh,
            speedX: def.speedX,
            speedY: def.speedY,
            speedZ: def.speedZ
        });
    });

    return rings;
}

/**
 * 150-300 Small Floating Particles
 */
function buildParticles(scene, count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 9 + 1;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        size: 0.065,
        color: CONFIG.colors.sky,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    return { points, positions };
}

/**
 * Procedural Football: Glossy dark icosahedron with neon-green edge lines
 */
function buildProceduralFootball() {
    const group = new THREE.Group();

    // Detail 1 gives 80 geodesic triangular facets resembling a cyber football
    const geometry = new THREE.IcosahedronGeometry(1.52, 1);

    // Dark glossy body
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: CONFIG.colors.darkBall,
        roughness: 0.16,
        metalness: 0.88,
        emissive: 0x011318,
        emissiveIntensity: 0.25
    });

    const bodyMesh = new THREE.Mesh(geometry, bodyMaterial);
    group.add(bodyMesh);

    // Glowing neon edge lines
    const edgesGeom = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: CONFIG.colors.neonGreen,
        linewidth: 2,
        transparent: true,
        opacity: 0.88
    });

    const edgeLines = new THREE.LineSegments(edgesGeom, edgeMaterial);
    group.add(edgeLines);

    return { group, bodyMesh, edgeMaterial };
}

/**
 * Try loading GLTF football, or fallback smoothly to procedural football
 */
function tryLoadFootball(parentGroup) {
    return new Promise((resolve) => {
        if (!CONFIG.modelPath) {
            const proc = buildProceduralFootball();
            parentGroup.add(proc.group);
            resolve(proc);
            return;
        }

        const loader = new GLTFLoader();
        loader.load(
            CONFIG.modelPath,
            (gltf) => {
                const model = gltf.scene;
                // Fit to bounding box
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    const scale = 3.0 / maxDim;
                    model.scale.set(scale, scale, scale);
                }
                parentGroup.add(model);
                resolve({ group: model, bodyMesh: model, edgeMaterial: null });
            },
            undefined,
            () => {
                // File not found or failed -> fallback to procedural icosahedron
                const proc = buildProceduralFootball();
                parentGroup.add(proc.group);
                resolve(proc);
            }
        );
    });
}
