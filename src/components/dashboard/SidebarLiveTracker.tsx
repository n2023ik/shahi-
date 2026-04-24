import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { LiveTrackerModal } from './LiveTrackerModal';

export const SidebarLiveTracker = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const truckGroupRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const COLORS = {
    orange: '#f37021',
    grey: '#6d6e71',
    darkGrey: '#2d2d2d',
    bg: '#1e293b',
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const getPixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
    camera.position.set(8, 7, 8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(getPixelRatio());
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
    sunLight.position.set(12, 15, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 512;
    sunLight.shadow.mapSize.height = 512;
    scene.add(sunLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x0f172a });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(20, 20, 0x475569, 0x64748b);
    grid.position.y = 0.01;
    scene.add(grid);

    // Truck Group
    const truckGroup = new THREE.Group();
    truckGroupRef.current = truckGroup;

    // Cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.9, 1),
      new THREE.MeshPhongMaterial({ color: COLORS.darkGrey })
    );
    cabin.position.set(0, 0.65, 1.25);
    cabin.castShadow = true;
    truckGroup.add(cabin);

    // Container
    const container = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.2, 3),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 0 })
    );
    container.position.set(0, 0.8, -0.75);
    container.castShadow = true;
    truckGroup.add(container);

    // Chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.2, 3.5),
      new THREE.MeshPhongMaterial({ color: 0x111111 })
    );
    chassis.position.set(0, 0.3, 0.25);
    truckGroup.add(chassis);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const wheelPositions = [
      [-0.55, 0.25, 1.25],
      [0.55, 0.25, 1.25],
      [-0.55, 0.25, -1.75],
      [0.55, 0.25, -1.75],
      [-0.55, 0.25, -0.75],
      [0.55, 0.25, -0.75],
    ];
    wheelPositions.forEach((pos) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(...(pos as [number, number, number]));
      w.castShadow = true;
      truckGroup.add(w);
    });

    // Logo
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 512, 256);
      const centerX = 256;
      const iconSize = 90;
      const iconY = 20;

      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 6;
      ctx.strokeRect(centerX - iconSize / 2, iconY, iconSize, iconSize);

      ctx.beginPath();
      ctx.moveTo(centerX - iconSize / 2, iconY);
      ctx.lineTo(centerX + iconSize / 2, iconY + iconSize);
      ctx.stroke();

      ctx.fillStyle = COLORS.grey;
      ctx.beginPath();
      ctx.moveTo(centerX - iconSize / 2 + 3, iconY + 3);
      ctx.lineTo(centerX - 8, iconY + 3);
      ctx.lineTo(centerX - 8, iconY + iconSize - 3);
      ctx.lineTo(centerX - iconSize / 2 + 3, iconY + iconSize - 3);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.lineWidth = 5;
      ctx.moveTo(centerX - iconSize / 2, iconY);
      ctx.lineTo(centerX - 8, iconY + iconSize / 2);
      ctx.lineTo(centerX - 8, iconY + iconSize);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = 'bold 60px Outfit, sans-serif';
      ctx.fillStyle = COLORS.grey;
      ctx.fillText('Lynk', centerX - 25, iconY + iconSize + 70);
      ctx.fillStyle = COLORS.orange;
      ctx.fillText('it.', centerX + 75, iconY + iconSize + 70);
    }

    const logoTex = new THREE.CanvasTexture(canvas);
    logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const logoPlane = new THREE.PlaneGeometry(2.25, 1.1);
    const logoMat = new THREE.MeshBasicMaterial({
      map: logoTex,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const l1 = new THREE.Mesh(logoPlane, logoMat);
    l1.position.set(0.655, 0.85, -0.75);
    l1.rotation.y = Math.PI / 2;
    truckGroup.add(l1);

    const l2 = new THREE.Mesh(logoPlane, logoMat);
    l2.position.set(-0.655, 0.85, -0.75);
    l2.rotation.y = -Math.PI / 2;
    truckGroup.add(l2);

    scene.add(truckGroup);

    // Animation Loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.01;

      if (truckGroup) {
        truckGroup.position.z = Math.sin(timeRef.current) * 3;
        truckGroup.position.x = Math.sin(timeRef.current * 0.5) * 0.2;
        truckGroup.rotation.y += 0.002;
      }

      camera.position.y = 6 + Math.sin(timeRef.current * 0.3) * 1;
      camera.lookAt(0, 0.5, 0);

      renderer.render(scene, camera);
    };

    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (!newWidth || !newHeight) return;
      renderer.setPixelRatio(getPixelRatio());
      renderer.setSize(newWidth, newHeight, true);
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateSize();
      }
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    updateSize();

    animate();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (renderer && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      chassis.geometry.dispose();
      (chassis.material as THREE.MeshPhongMaterial).dispose();
      container.geometry.dispose();
      (container.material as THREE.MeshPhongMaterial).dispose();
      cabin.geometry.dispose();
      (cabin.material as THREE.MeshPhongMaterial).dispose();
    };
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        onClick={() => setIsModalOpen(true)}
        className="group mx-3 mt-4 rounded-lg overflow-hidden border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 px-4 py-2 bg-slate-900/40 border-b border-cyan-500/10 group-hover:bg-slate-900/60 transition-colors">
          Live Tracker
        </div>
        <div
          ref={containerRef}
          className="w-full h-[180px] bg-gradient-to-br from-slate-800/40 via-slate-900/30 to-slate-800/20 relative"
        />
      </motion.div>

      <LiveTrackerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
