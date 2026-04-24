import { useEffect, useRef } from "react";
import * as THREE from "three";

const COLORS = {
  orange: "#f37021",
  grey: "#6d6e71",
  darkGrey: "#2d2d2d",
  bg: "#f8fafc",
};

function createLynkitLogoTexture(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture(canvas);

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

  ctx.textAlign = "center";
  ctx.font = "bold 150px Outfit, sans-serif";
  const textY = iconY + iconSize + 160;

  ctx.fillStyle = COLORS.grey;
  ctx.fillText("Lynk", centerX - 40, textY);

  ctx.fillStyle = COLORS.orange;
  ctx.fillText("it.", centerX + 155, textY);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }
  material.dispose();
}

export default function LiveDeliveryTracker() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getPixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    camera.position.set(15, 12, 15);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(getPixelRatio());
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.85);
    sunLight.position.set(20, 30, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const mapGroup = new THREE.Group();

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshPhongMaterial({ color: 0xf1f5f9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    mapGroup.add(floor);

    const grid = new THREE.GridHelper(100, 40, 0xd1d5db, 0xe2e8f0);
    grid.position.y = 0.02;
    mapGroup.add(grid);

    const buildingMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    for (let index = 0; index < 45; index += 1) {
      const width = Math.random() * 2 + 1;
      const depth = Math.random() * 2 + 1;
      const height = Math.random() * 5 + 1;
      const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMaterial);
      let x = 0;
      let z = 0;
      do {
        x = (Math.random() - 0.5) * 80;
        z = (Math.random() - 0.5) * 80;
      } while (Math.abs(x) < 8 && Math.abs(z) < 18);

      building.position.set(x, height / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      mapGroup.add(building);
    }
    scene.add(mapGroup);

    const routePoints: THREE.Vector3[] = [];
    for (let step = 0; step <= 30; step += 1) {
      routePoints.push(new THREE.Vector3(0, 0.05, -20 + step * 1.5));
    }
    const routeCurve = new THREE.CatmullRomCurve3(routePoints);
    const routeMesh = new THREE.Mesh(
      new THREE.TubeGeometry(routeCurve, 64, 0.12, 8, false),
      new THREE.MeshBasicMaterial({ color: COLORS.orange, transparent: true, opacity: 0.3 })
    );
    scene.add(routeMesh);

    const truckGroup = new THREE.Group();

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.8, 2),
      new THREE.MeshPhongMaterial({ color: COLORS.darkGrey })
    );
    cabin.position.set(0, 1.3, 2.5);
    cabin.castShadow = true;
    truckGroup.add(cabin);

    const containerBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.4, 6),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 0 })
    );
    containerBox.position.set(0, 1.6, -1.5);
    containerBox.castShadow = true;
    truckGroup.add(containerBox);

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.4, 7),
      new THREE.MeshPhongMaterial({ color: 0x111111 })
    );
    chassis.position.set(0, 0.6, 0.5);
    truckGroup.add(chassis);

    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });
    [
      [-1.1, 0.5, 2.5], [1.1, 0.5, 2.5],
      [-1.1, 0.5, -3.5], [1.1, 0.5, -3.5],
      [-1.1, 0.5, -1.5], [1.1, 0.5, -1.5],
    ].forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x as number, y as number, z as number);
      wheel.castShadow = true;
      truckGroup.add(wheel);
    });

    const logoTexture = createLynkitLogoTexture(renderer);
    const logoGeometry = new THREE.PlaneGeometry(4.5, 2.2);
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const logoRight = new THREE.Mesh(logoGeometry, logoMaterial);
    logoRight.position.set(1.31, 1.7, -1.5);
    logoRight.rotation.y = Math.PI / 2;
    truckGroup.add(logoRight);

    const logoLeft = new THREE.Mesh(logoGeometry, logoMaterial);
    logoLeft.position.set(-1.31, 1.7, -1.5);
    logoLeft.rotation.y = -Math.PI / 2;
    truckGroup.add(logoLeft);

    scene.add(truckGroup);

    const targetRotation = { x: 0.6, y: -Math.PI / 4 };
    const pointerState = {
      dragging: false,
      x: 0,
      y: 0,
    };

    const updateSize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      if (!width || !height) return;
      renderer.setPixelRatio(getPixelRatio());
      renderer.setSize(width, height, true);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateSize();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerState.dragging = true;
      pointerState.x = event.clientX;
      pointerState.y = event.clientY;
      container.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerState.dragging) return;
      targetRotation.y += (event.clientX - pointerState.x) * 0.007;
      targetRotation.x = Math.max(0.2, Math.min(1.2, targetRotation.x + (event.clientY - pointerState.y) * 0.007));
      pointerState.x = event.clientX;
      pointerState.y = event.clientY;
    };

    const handlePointerUp = () => {
      pointerState.dragging = false;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z = Math.max(8, Math.min(50, camera.position.z + event.deltaY * 0.02));
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointerleave", handlePointerUp);
    container.addEventListener("wheel", handleWheel, { passive: false });

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    window.addEventListener("resize", updateSize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    updateSize();

    let animationFrameId = 0;
    const animate = () => {
      animationFrameId = window.requestAnimationFrame(animate);

      const time = Date.now() * 0.0004;
      truckGroup.position.z = Math.sin(time) * 12;
      truckGroup.position.x = Math.sin(time * 0.5) * 0.4;

      camera.position.x += (Math.cos(targetRotation.y) * 20 - camera.position.x) * 0.05;
      camera.position.z += (Math.sin(targetRotation.y) * 20 - camera.position.z) * 0.05;
      camera.position.y += (targetRotation.x * 18 - camera.position.y) * 0.05;
      camera.lookAt(0, 1, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("pointerleave", handlePointerUp);
      container.removeEventListener("wheel", handleWheel);

      logoTexture.dispose();
      routeMesh.geometry.dispose();
      disposeMaterial(routeMesh.material);
      floor.geometry.dispose();
      disposeMaterial(floor.material);
      grid.geometry.dispose();
      disposeMaterial(grid.material);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, []);

  return (
    <section
      className="relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-[28px] border border-slate-200 bg-[#f3f4f6] text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55)_0%,_rgba(255,255,255,0.18)_30%,_rgba(248,250,252,0.02)_72%)]" />

      <div className="absolute left-5 right-5 top-5 flex justify-between gap-4 md:left-6 md:right-6 md:top-6">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f37021]">
            <span className="text-xs font-bold text-white">L</span>
          </div>
          <span className="font-bold text-slate-800">
            LYNKIT <span className="font-normal text-slate-500">Fleet</span>
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 left-1/2 w-[92%] max-w-[420px] -translate-x-1/2 md:bottom-8">
        <div className="pointer-events-auto rounded-[26px] border border-slate-200 bg-white/95 p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] backdrop-blur-md">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Live Tracking</h2>
              <p className="text-lg font-bold text-slate-800">Okhla Phase I, New Delhi</p>
            </div>
            <div className="rounded-xl bg-[#f37021] px-3 py-1.5 text-[0.8rem] font-bold text-white shadow-sm">
              ON TIME
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-3/4 rounded-full bg-[#f37021]" />
            </div>

            <div className="flex items-center gap-4 border-t border-slate-100 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#f37021]" fill="currentColor" aria-hidden="true">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM17 9.5l1.5 2H15V9.5h2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">Lynkit SmartCarrier</p>
                <p className="text-xs text-slate-500">Asset Tracking Enabled</p>
              </div>
              <button type="button" className="rounded-full bg-orange-50 p-2 text-[#f37021] transition-colors hover:bg-orange-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}