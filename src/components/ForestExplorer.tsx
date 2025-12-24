import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const TRANSLATIONS = {
  "en-US": {
    "forestExplorerControlsTitle": "Forest Explorer",
    "moveControls": "W/S or ↑/↓ - Move forward/back",
    "strafeControls": "A/D or ←/→ - Strafe left/right",
    "lookControls": "Click + drag - Look around",
    "exploreMessage": "Explore the beautiful forest!"
  },
  "es-ES": {
    "forestExplorerControlsTitle": "Explorador del Bosque",
    "moveControls": "W/S o ↑/↓ - Avanzar/retroceder",
    "strafeControls": "A/D o ←/→ - Moverse lateral",
    "lookControls": "Clic + arrastrar - Mirar alrededor",
    "exploreMessage": "¡Explora el hermoso bosque!"
  }
};

const browserLocale = navigator.languages?.[0] || navigator.language || 'en-US';
const findMatchingLocale = (locale: string) => {
  if (TRANSLATIONS[locale as keyof typeof TRANSLATIONS]) return locale;
  const lang = locale.split('-')[0];
  const match = Object.keys(TRANSLATIONS).find(key => key.startsWith(lang + '-'));
  return match || 'en-US';
};
const locale = findMatchingLocale(browserLocale);
const t = (key: string) => TRANSLATIONS[locale as keyof typeof TRANSLATIONS]?.[key as keyof typeof TRANSLATIONS['en-US']] || TRANSLATIONS['en-US'][key as keyof typeof TRANSLATIONS['en-US']] || key;

const ForestExplorer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseXRef = useRef(0);
  const onMouseDownRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Fog for atmosphere - deep forest green
    scene.fog = new THREE.Fog(0x1a3a2a, 30, 150);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x87CEEB);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x4a6741, 0.4);
    scene.add(ambientLight);

    // Hemisphere light for natural sky/ground lighting
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d5a27, 0.3);
    scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0xfff5c1, 1);
    directionalLight.position.set(50, 80, -50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Sunlight rays (god rays effect via point light)
    const sunGlow = new THREE.PointLight(0xffd700, 0.5, 200);
    sunGlow.position.set(50, 60, -50);
    scene.add(sunGlow);

    // Ground with texture-like variation
    const groundGeometry = new THREE.PlaneGeometry(500, 500, 100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x3d5a3a,
    });
    
    // Add slight height variation to ground
    const groundPositions = groundGeometry.attributes.position.array;
    for (let i = 0; i < groundPositions.length; i += 3) {
      groundPositions[i + 2] += (Math.random() - 0.5) * 0.5;
    }
    groundGeometry.computeVertexNormals();
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Tree creation function
    const createTree = (x: number, z: number, scale = 1) => {
      const group = new THREE.Group();
      
      // Trunk with bark texture feel
      const trunkHeight = 6 + Math.random() * 4;
      const trunkGeometry = new THREE.CylinderGeometry(
        0.2 * scale, 
        0.4 * scale, 
        trunkHeight * scale,
        8
      );
      const trunkMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.07, 0.4, 0.15 + Math.random() * 0.05)
      });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      // Foliage layers
      const leavesColors = [0x1a4d2e, 0x2d5a3d, 0x3a6b4c, 0x4a7b5c];
      const layers = 3 + Math.floor(Math.random() * 2);
      
      for (let i = 0; i < layers; i++) {
        const coneRadius = (2.5 - i * 0.4) * scale;
        const coneHeight = (4 - i * 0.5) * scale;
        const leavesGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 8);
        const leavesColor = leavesColors[Math.floor(Math.random() * leavesColors.length)];
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: leavesColor });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = (trunkHeight * 0.5 + 1.5 + i * 2) * scale;
        leaves.rotation.y = Math.random() * Math.PI;
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        group.add(leaves);
      }

      group.position.set(x, (trunkHeight * 0.5) * scale, z);
      return group;
    };

    // Create forest with varied density
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 180;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.7 + Math.random() * 0.6;
      const tree = createTree(x, z, scale);
      scene.add(tree);
    }

    // Bushes and undergrowth
    const createBush = (x: number, z: number) => {
      const group = new THREE.Group();
      const bushColors = [0x2a5a3a, 0x3a6a4a, 0x4a7a5a];
      
      for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
        const size = 0.5 + Math.random() * 0.5;
        const geometry = new THREE.SphereGeometry(size, 8, 6);
        const material = new THREE.MeshLambertMaterial({ 
          color: bushColors[Math.floor(Math.random() * bushColors.length)]
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(
          (Math.random() - 0.5) * 1.5,
          size * 0.7,
          (Math.random() - 0.5) * 1.5
        );
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        group.add(sphere);
      }
      
      group.position.set(x, 0, z);
      return group;
    };

    for (let i = 0; i < 80; i++) {
      const x = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      if (Math.abs(x) > 8 || Math.abs(z) > 8) {
        const bush = createBush(x, z);
        scene.add(bush);
      }
    }

    // Grass blades
    const grassGeometry = new THREE.PlaneGeometry(0.1, 0.8);
    
    for (let i = 0; i < 800; i++) {
      const grassMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.5, 0.3 + Math.random() * 0.15),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      grass.position.set(
        (Math.random() - 0.5) * 150,
        0.4,
        (Math.random() - 0.5) * 150
      );
      grass.rotation.y = Math.random() * Math.PI;
      grass.rotation.x = -0.1 + Math.random() * 0.2;
      scene.add(grass);
    }

    // Rocks
    for (let i = 0; i < 30; i++) {
      const rockGeometry = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.7, 0);
      const rockMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0, 0, 0.3 + Math.random() * 0.15)
      });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.set(
        (Math.random() - 0.5) * 150,
        0.3,
        (Math.random() - 0.5) * 150
      );
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.scale.set(1, 0.6 + Math.random() * 0.4, 1);
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
    }

    // Floating particles (dust/pollen in sunlight)
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = Math.random() * 30;
      positions[i + 2] = (Math.random() - 0.5) * 100;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xfff5c1,
      size: 0.1,
      transparent: true,
      opacity: 0.6
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    setIsLoaded(true);

    // Movement controls
    const moveSpeed = 0.3;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const updateMovement = () => {
      const keys = keysRef.current;
      if (keys['KeyW'] || keys['ArrowUp']) {
        camera.translateZ(-moveSpeed);
      }
      if (keys['KeyS'] || keys['ArrowDown']) {
        camera.translateZ(moveSpeed);
      }
      if (keys['KeyA'] || keys['ArrowLeft']) {
        camera.translateX(-moveSpeed);
      }
      if (keys['KeyD'] || keys['ArrowRight']) {
        camera.translateX(moveSpeed);
      }
      
      camera.position.y = 5;
    };

    // Mouse look controls
    const handleMouseDown = () => {
      onMouseDownRef.current = true;
    };
    
    const handleMouseUp = () => {
      onMouseDownRef.current = false;
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (onMouseDownRef.current) {
        mouseXRef.current += e.movementX * 0.002;
        camera.rotation.y = -mouseXRef.current;
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    let time = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      time += 0.01;
      
      updateMovement();
      
      // Animate particles floating
      const particlePositions = particlesGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount * 3; i += 3) {
        particlePositions[i + 1] += Math.sin(time + i) * 0.002;
      }
      particlesGeometry.attributes.position.needsUpdate = true;
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Controls Panel */}
      <div 
        className={`
          absolute top-6 left-6 glass-panel p-6 max-w-xs
          transition-all duration-700 ease-out
          ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
        `}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-forest-sunlight animate-pulse-glow" />
          <h2 className="text-xl font-semibold text-foreground text-shadow-forest">
            {t('forestExplorerControlsTitle')}
          </h2>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">W/S</kbd>
            <span>{t('moveControls').split(' - ')[1]}</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">A/D</kbd>
            <span>{t('strafeControls').split(' - ')[1]}</span>
          </li>
          <li className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">🖱️</kbd>
            <span>{t('lookControls').split(' - ')[1]}</span>
          </li>
        </ul>
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-accent font-medium animate-float">
            {t('exploreMessage')}
          </p>
        </div>
      </div>

      {/* Compass/Position Indicator */}
      <div 
        className={`
          absolute bottom-6 right-6 glass-panel p-4
          transition-all duration-700 delay-300 ease-out
          ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <div className="w-12 h-12 rounded-full border-2 border-forest-sunlight/50 flex items-center justify-center">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-forest-sunlight transform -translate-y-0.5" />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">N</p>
      </div>

      {/* Loading overlay */}
      <div 
        className={`
          absolute inset-0 bg-background flex items-center justify-center
          transition-opacity duration-1000
          ${isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading forest...</p>
        </div>
      </div>
    </div>
  );
};

export default ForestExplorer;