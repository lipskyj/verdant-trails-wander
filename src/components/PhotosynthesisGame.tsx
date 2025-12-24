import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Sun, Leaf, Sprout, TreeDeciduous, Zap } from 'lucide-react';

interface GameState {
  energy: number;
  growthProgress: number;
  stage: number;
  score: number;
  sunlightCollected: number;
}

const GROWTH_STAGES = [
  { name: 'Seedling', energyNeeded: 0, icon: Sprout },
  { name: 'Sprout', energyNeeded: 100, icon: Sprout },
  { name: 'Sapling', energyNeeded: 300, icon: Leaf },
  { name: 'Tree', energyNeeded: 600, icon: TreeDeciduous },
];

const PhotosynthesisGame: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const sunlightParticlesRef = useRef<THREE.Mesh[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    energy: 50,
    growthProgress: 0,
    stage: 0,
    score: 0,
    sunlightCollected: 0,
  });
  const [showGrowthAnimation, setShowGrowthAnimation] = useState(false);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const collectSunlight = useCallback(() => {
    setGameState(prev => {
      const newEnergy = Math.min(prev.energy + 15, 100);
      const newProgress = prev.growthProgress + 10;
      const currentStageMax = GROWTH_STAGES[prev.stage + 1]?.energyNeeded || 1000;
      
      let newStage = prev.stage;
      let showGrowth = false;
      
      if (newProgress >= currentStageMax && prev.stage < GROWTH_STAGES.length - 1) {
        newStage = prev.stage + 1;
        showGrowth = true;
      }
      
      if (showGrowth) {
        setShowGrowthAnimation(true);
        setTimeout(() => setShowGrowthAnimation(false), 1000);
      }
      
      return {
        ...prev,
        energy: newEnergy,
        growthProgress: newProgress,
        stage: newStage,
        score: prev.score + 10,
        sunlightCollected: prev.sunlightCollected + 1,
      };
    });
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Sky gradient background
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d')!;
    const gradient = skyCtx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#B0E0E6');
    gradient.addColorStop(1, '#E0F7FA');
    skyCtx.fillStyle = gradient;
    skyCtx.fillRect(0, 0, 2, 512);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    scene.background = skyTexture;

    // Camera setup - top-down isometric view
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 25, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfff8e7, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5c1, 1.2);
    sunLight.position.set(30, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x567d46, 0.4);
    scene.add(hemiLight);

    // Ground
    const groundGeometry = new THREE.CircleGeometry(40, 64);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x7cb342,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Soil patch in center
    const soilGeometry = new THREE.CircleGeometry(3, 32);
    const soilMaterial = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.01;
    soil.receiveShadow = true;
    scene.add(soil);

    // Create player plant
    const createPlayer = () => {
      const group = new THREE.Group();
      
      // Stem
      const stemGeometry = new THREE.CylinderGeometry(0.15, 0.2, 2, 8);
      const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x558b2f });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.y = 1;
      stem.castShadow = true;
      group.add(stem);

      // Leaves
      const leafGeometry = new THREE.SphereGeometry(0.8, 16, 12);
      const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x7cb342 });
      const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
      leaves.position.y = 2.2;
      leaves.scale.set(1, 0.8, 1);
      leaves.castShadow = true;
      group.add(leaves);

      // Glow indicator
      const glowGeometry = new THREE.SphereGeometry(1.2, 16, 12);
      const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffeb3b, 
        transparent: true, 
        opacity: 0.2 
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.y = 2.2;
      glow.name = 'glow';
      group.add(glow);

      return group;
    };

    const player = createPlayer();
    playerRef.current = player;
    scene.add(player);

    // Competing trees (obstacles)
    const createTree = (x: number, z: number, scale: number) => {
      const group = new THREE.Group();
      
      const trunkGeometry = new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 4 * scale, 8);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 2 * scale;
      trunk.castShadow = true;
      group.add(trunk);

      const leavesColors = [0x2e7d32, 0x388e3c, 0x43a047];
      for (let i = 0; i < 3; i++) {
        const coneGeometry = new THREE.ConeGeometry((2.5 - i * 0.4) * scale, (3 - i * 0.3) * scale, 8);
        const coneMaterial = new THREE.MeshLambertMaterial({ 
          color: leavesColors[i % leavesColors.length] 
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.y = (4 + i * 1.8) * scale;
        cone.castShadow = true;
        group.add(cone);
      }

      group.position.set(x, 0, z);
      return group;
    };

    // Add competing trees around the edge
    const treePositions = [
      { x: -12, z: -8, scale: 1.2 },
      { x: 15, z: -5, scale: 1.5 },
      { x: -10, z: 10, scale: 1.3 },
      { x: 12, z: 12, scale: 1.1 },
      { x: -18, z: 2, scale: 1.4 },
      { x: 20, z: 5, scale: 1.0 },
    ];

    treePositions.forEach(({ x, z, scale }) => {
      const tree = createTree(x, z, scale);
      scene.add(tree);
    });

    // Sunlight particles
    const createSunlightParticle = () => {
      const geometry = new THREE.SphereGeometry(0.4, 16, 16);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xffd700,
        transparent: true,
        opacity: 0.9,
      });
      const particle = new THREE.Mesh(geometry, material);
      
      // Inner glow
      const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffeb3b,
        transparent: true,
        opacity: 0.4,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      particle.add(glow);
      
      // Random position
      particle.position.set(
        (Math.random() - 0.5) * 30,
        20 + Math.random() * 10,
        (Math.random() - 0.5) * 30
      );
      
      particle.userData = {
        speed: 0.03 + Math.random() * 0.02,
        swayPhase: Math.random() * Math.PI * 2,
        collected: false,
      };
      
      return particle;
    };

    // Initial sunlight particles
    for (let i = 0; i < 15; i++) {
      const particle = createSunlightParticle();
      sunlightParticlesRef.current.push(particle);
      scene.add(particle);
    }

    // Decorative flowers
    const flowerColors = [0xff69b4, 0xff6b6b, 0xffeb3b, 0xff8a65];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      if (radius > 4) {
        const flowerGroup = new THREE.Group();
        
        const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
        const stemMat = new THREE.MeshLambertMaterial({ color: 0x558b2f });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.25;
        flowerGroup.add(stem);
        
        const petalGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const petalMat = new THREE.MeshLambertMaterial({ 
          color: flowerColors[Math.floor(Math.random() * flowerColors.length)] 
        });
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.y = 0.55;
        flowerGroup.add(petal);
        
        flowerGroup.position.set(x, 0, z);
        scene.add(flowerGroup);
      }
    }

    setIsLoaded(true);

    // Movement controls
    const moveSpeed = 0.15;
    const bounds = 35;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Animation loop
    let time = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      time += 0.016;

      // Player movement
      const keys = keysRef.current;
      if (playerRef.current) {
        if (keys['KeyW'] || keys['ArrowUp']) {
          playerRef.current.position.z = Math.max(-bounds, playerRef.current.position.z - moveSpeed);
        }
        if (keys['KeyS'] || keys['ArrowDown']) {
          playerRef.current.position.z = Math.min(bounds, playerRef.current.position.z + moveSpeed);
        }
        if (keys['KeyA'] || keys['ArrowLeft']) {
          playerRef.current.position.x = Math.max(-bounds, playerRef.current.position.x - moveSpeed);
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
          playerRef.current.position.x = Math.min(bounds, playerRef.current.position.x + moveSpeed);
        }

        // Player sway animation
        playerRef.current.rotation.z = Math.sin(time * 2) * 0.05;
        
        // Glow pulse
        const glow = playerRef.current.getObjectByName('glow') as THREE.Mesh;
        if (glow) {
          const glowMat = glow.material as THREE.MeshBasicMaterial;
          glowMat.opacity = 0.15 + Math.sin(time * 3) * 0.1;
        }

        // Camera follows player
        camera.position.x = playerRef.current.position.x;
        camera.position.z = playerRef.current.position.z + 20;
        camera.lookAt(playerRef.current.position.x, 0, playerRef.current.position.z);
      }

      // Update sunlight particles
      sunlightParticlesRef.current.forEach((particle, index) => {
        if (particle.userData.collected) return;
        
        // Fall down with sway
        particle.position.y -= particle.userData.speed;
        particle.position.x += Math.sin(time + particle.userData.swayPhase) * 0.02;
        
        // Reset if below ground
        if (particle.position.y < 0) {
          particle.position.set(
            (Math.random() - 0.5) * 40,
            25 + Math.random() * 10,
            (Math.random() - 0.5) * 40
          );
        }
        
        // Collision with player
        if (playerRef.current) {
          const distance = particle.position.distanceTo(playerRef.current.position);
          if (distance < 2.5) {
            particle.userData.collected = true;
            collectSunlight();
            
            // Reset particle after collection
            setTimeout(() => {
              particle.position.set(
                (Math.random() - 0.5) * 40,
                25 + Math.random() * 10,
                (Math.random() - 0.5) * 40
              );
              particle.userData.collected = false;
            }, 500);
          }
        }
        
        // Spin
        particle.rotation.y += 0.02;
      });

      // Energy decay
      if (time % 2 < 0.016) {
        setGameState(prev => ({
          ...prev,
          energy: Math.max(0, prev.energy - 1),
        }));
      }

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
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
    };
  }, [collectSunlight]);

  const currentStage = GROWTH_STAGES[gameState.stage];
  const nextStage = GROWTH_STAGES[gameState.stage + 1];
  const StageIcon = currentStage.icon;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Game UI */}
      <div className="absolute inset-x-0 top-0 p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Title & Score */}
          <div 
            className={`
              game-panel px-5 py-3 flex items-center gap-4
              transition-all duration-500
              ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
            `}
          >
            <div className="flex items-center gap-2">
              <Leaf className="w-6 h-6 text-primary" />
              <h1 className="font-game text-xl md:text-2xl font-bold text-foreground">
                Photosynthesis
              </h1>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sun className="w-5 h-5 text-secondary" />
              <span className="font-semibold text-foreground">{gameState.score}</span>
            </div>
          </div>

          {/* Energy & Growth Bars */}
          <div 
            className={`
              game-panel px-5 py-3 flex flex-col gap-3 min-w-[280px]
              transition-all duration-500 delay-100
              ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
            `}
          >
            {/* Energy Bar */}
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-secondary flex-shrink-0" />
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full energy-bar rounded-full transition-all duration-300"
                  style={{ width: `${gameState.energy}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-muted-foreground w-10 text-right">
                {Math.round(gameState.energy)}%
              </span>
            </div>
            
            {/* Growth Bar */}
            <div className="flex items-center gap-3">
              <StageIcon className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full growth-bar rounded-full transition-all duration-300"
                  style={{ 
                    width: nextStage 
                      ? `${(gameState.growthProgress / nextStage.energyNeeded) * 100}%`
                      : '100%'
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-muted-foreground w-16 text-right">
                {currentStage.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Help */}
      <div 
        className={`
          absolute bottom-6 left-6 game-panel p-4
          transition-all duration-500 delay-200
          ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <p className="text-sm text-muted-foreground mb-2 font-medium">Controls</p>
        <div className="flex gap-1">
          <kbd className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs font-bold">W</kbd>
        </div>
        <div className="flex gap-1 mt-1">
          <kbd className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs font-bold">A</kbd>
          <kbd className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs font-bold">S</kbd>
          <kbd className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-xs font-bold">D</kbd>
        </div>
      </div>

      {/* Sunlight Counter */}
      <div 
        className={`
          absolute bottom-6 right-6 game-panel p-4 flex items-center gap-3
          transition-all duration-500 delay-300
          ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
          <Sun className="w-6 h-6 text-secondary animate-pulse-glow" />
        </div>
        <div>
          <p className="text-2xl font-game font-bold text-foreground">{gameState.sunlightCollected}</p>
          <p className="text-xs text-muted-foreground">Collected</p>
        </div>
      </div>

      {/* Growth Animation Overlay */}
      {showGrowthAnimation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="game-panel px-8 py-6 text-center animate-grow">
            <StageIcon className="w-16 h-16 text-primary mx-auto mb-3" />
            <p className="font-game text-2xl font-bold text-foreground">
              Grew to {currentStage.name}!
            </p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      <div 
        className={`
          absolute inset-0 bg-background flex items-center justify-center
          transition-opacity duration-1000
          ${isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        <div className="text-center">
          <Sprout className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce-soft" />
          <p className="text-muted-foreground font-medium">Growing your garden...</p>
        </div>
      </div>
    </div>
  );
};

export default PhotosynthesisGame;