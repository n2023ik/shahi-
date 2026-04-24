import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import * as THREE from 'three';

interface LiveTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveTrackerModal = ({ isOpen, onClose }: LiveTrackerModalProps) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const truckGroupRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const targetRotationYRef = useRef(-Math.PI / 4);
  const targetRotationXRef = useRef(0.6);
  const isMouseDownRef = useRef(false);
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const timeRef = useRef(0);

  const COLORS = {
    orange: '#f37021',
    grey: '#6d6e71',
    darkGrey: '#2d2d2d',
    bg: '#f8fafc',
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !canvasContainerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(15, 12, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(20, 30, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshPhongMaterial({ color: 0xf1f5f9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(100, 40, 0xd1d5db, 0xe2e8f0);
    grid.position.y = 0.02;
    scene.add(grid);

    const buildingMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    for (let i = 0; i < 45; i++) {
      const w = Math.random() * 2 + 1;
      const d = Math.random() * 2 + 1;
      const h = Math.random() * 5 + 1;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
      let x, z;
      do {
        x = (Math.random() - 0.5) * 80;
        z = (Math.random() - 0.5) * 80;
      } while (Math.abs(x) < 8 && Math.abs(z) < 18);
      b.position.set(x, h / 2, z);
      b.castShadow = true;
      b.receiveShadow = true;
      scene.add(b);
    }

    const points = [];
    for (let i = 0; i <= 30; i++)
      points.push(new THREE.Vector3(0, 0.05, -20 + i * 1.5));
    const curve = new THREE.CatmullRomCurve3(points);
    const pathGeo = new THREE.TubeGeometry(curve, 64, 0.12, 8, false);
    const pathMat = new THREE.MeshBasicMaterial({
      color: COLORS.orange,
      transparent: true,
      opacity: 0.3,
    });
    scene.add(new THREE.Mesh(pathGeo, pathMat));

    const truckGroup = new THREE.Group();
    truckGroupRef.current = truckGroup;

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.8, 2),
      new THREE.MeshPhongMaterial({ color: COLORS.darkGrey })
    );
    cabin.position.set(0, 1.3, 2.5);
    cabin.castShadow = true;
    truckGroup.add(cabin);

    const container = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.4, 6),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 0 })
    );
    container.position.set(0, 1.6, -1.5);
    container.castShadow = true;
    truckGroup.add(container);

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.4, 7),
      new THREE.MeshPhongMaterial({ color: 0x111111 })
    );
    chassis.position.set(0, 0.6, 0.5);
    truckGroup.add(chassis);

    const wGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    [[-1.1, 0.5, 2.5], [1.1, 0.5, 2.5], [-1.1, 0.5, -3.5], [1.1, 0.5, -3.5], [-1.1, 0.5, -1.5], [1.1, 0.5, -1.5]].forEach((pos) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(...(pos as [number, number, number]));
      w.castShadow = true;
      truckGroup.add(w);
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 1024, 512);
      const centerX = 512;
      const iconSize = 180;
      const iconY = 40;
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 12;
      ctx.strokeRect(centerX - iconSize / 2, iconY, iconSize, iconSize);
      ctx.beginPath();
      ctx.moveTo(centerX - iconSize / 2, iconY);
      ctx.lineTo(centerX + iconSize / 2, iconY + iconSize);
      ctx.stroke();
      ctx.fillStyle = COLORS.grey;
      ctx.beginPath();
      ctx.moveTo(centerX - iconSize / 2 + 6, iconY + 6);
      ctx.lineTo(centerX - 15, iconY + 6);
      ctx.lineTo(centerX - 15, iconY + iconSize - 6);
      ctx.lineTo(centerX - iconSize / 2 + 6, iconY + iconSize - 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.lineWidth = 10;
      ctx.moveTo(centerX - iconSize / 2, iconY);
      ctx.lineTo(centerX - 15, iconY + iconSize / 2);
      ctx.lineTo(centerX - 15, iconY + iconSize);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = 'bold 150px Outfit, sans-serif';
      const textY = iconY + iconSize + 160;
      ctx.fillStyle = COLORS.grey;
      ctx.fillText('Lynk', centerX - 40, textY);
      ctx.fillStyle = COLORS.orange;
      ctx.fillText('it.', centerX + 155, textY);
    }

    const logoTex = new THREE.CanvasTexture(canvas);
    logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const logoPlane = new THREE.PlaneGeometry(4.5, 2.2);
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, side: THREE.DoubleSide });
    const l1 = new THREE.Mesh(logoPlane, logoMat);
    l1.position.set(1.31, 1.7, -1.5);
    l1.rotation.y = Math.PI / 2;
    truckGroup.add(l1);
    const l2 = new THREE.Mesh(logoPlane, logoMat);
    l2.position.set(-1.31, 1.7, -1.5);
    l2.rotation.y = -Math.PI / 2;
    truckGroup.add(l2);
    scene.add(truckGroup);

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      mouseXRef.current = e.clientX;
      mouseYRef.current = e.clientY;
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDownRef.current) {
        targetRotationYRef.current += (e.clientX - mouseXRef.current) * 0.007;
        targetRotationXRef.current = Math.max(0.2, Math.min(1.2, targetRotationXRef.current + (e.clientY - mouseYRef.current) * 0.007));
        mouseXRef.current = e.clientX;
        mouseYRef.current = e.clientY;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(8, Math.min(50, camera.position.z + e.deltaY * 0.02));
    };

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    canvasContainerRef.current.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    canvasContainerRef.current.addEventListener('wheel', handleWheel);
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.0004;
      if (truckGroup) {
        truckGroup.position.z = Math.sin(timeRef.current) * 12;
        truckGroup.position.x = Math.sin(timeRef.current * 0.5) * 0.4;
      }
      camera.position.x += (Math.cos(targetRotationYRef.current) * 20 - camera.position.x) * 0.05;
      camera.position.z += (Math.sin(targetRotationYRef.current) * 20 - camera.position.z) * 0.05;
      camera.position.y += (targetRotationXRef.current * 18 - camera.position.y) * 0.05;
      camera.lookAt(0, 1, 0);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      canvasContainerRef.current?.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      canvasContainerRef.current?.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      if (renderer && canvasContainerRef.current?.contains(renderer.domElement)) {
        canvasContainerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999]"
        >
          <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full" />

          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full px-4 max-w-[400px] z-40 pointer-events-auto">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold">Live Tracking</h2>
                  <p className="text-lg font-bold text-gray-800 mt-1">Okhla Phase I, New Delhi</p>
                </div>
                <div className="bg-orange-500 text-white px-3 py-1 rounded-xl text-xs font-bold">ON TIME</div>
              </div>
              <div className="space-y-4">
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full w-3/4 rounded-full" />
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-orange-500" fill="currentColor">
                      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM17 9.5l1.5 2H15V9.5h2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">Lynkit SmartCarrier</p>
                    <p className="text-xs text-gray-500">Asset Tracking Enabled</p>
                  </div>
                  <button className="p-2 bg-orange-50 rounded-full text-orange-500 hover:bg-orange-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="fixed top-6 left-6 right-6 flex justify-between items-center z-50 pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <motion.button
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 }}
                onClick={onClose}
                className="bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-lg border border-white/20 hover:bg-slate-800 transition-all text-sm font-semibold"
                whileTap={{ scale: 0.97 }}
              >
                ← Back
              </motion.button>

              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">L</span>
                </div>
                <span className="font-bold text-gray-800">LYNKIT <span className="font-normal text-gray-500">Fleet</span></span>
              </motion.div>
            </div>

            <motion.button
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              onClick={onClose}
              className="bg-white/95 backdrop-blur-md p-3 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-100 hover:shadow-xl transition-all pointer-events-auto cursor-pointer"
              whileTap={{ scale: 0.95 }}
            >
              <X size={32} className="text-gray-800 stroke-[2.5]" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
