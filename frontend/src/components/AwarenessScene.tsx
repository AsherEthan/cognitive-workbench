"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Dimension = "clarity" | "stability" | "tension";
type Level = 0 | 1 | 2 | null;
type SceneStatus = "ready" | "fallback";

interface AwarenessSceneProps {
  values: Record<Dimension, Level>;
  activeDimension: Dimension;
  onSelectDimension: (dimension: Dimension) => void;
  paused: boolean;
  resetToken: number;
  onStatusChange?: (status: SceneStatus) => void;
}

const LABELS: Record<Dimension, string> = {
  clarity: "清楚度",
  stability: "安住度",
  tension: "鬆緊度",
};
const DIMENSIONS: Dimension[] = ["clarity", "stability", "tension"];
const COLORS = [0x97d9ff, 0x65e5cf, 0xffaa98];
const INSTRUCTIONS = "拖曳旋轉；滾輪縮放。方向鍵旋轉，＋／− 縮放，Home 或 0 重設視角。上下滑動可捲動頁面。";

// An unknown description has the neutral shape, without implying a measurement.
const amount = (level: Level) => level === null ? 0.5 : level / 2;

const filamentVertex = /* glsl */ `
  attribute vec2 aParam;
  attribute float aSeed;
  uniform float uTime;
  uniform float uClarity;
  uniform float uStability;
  uniform float uTension;
  uniform float uPixelRatio;
  uniform float uPointScale;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float u = aParam.x;
    float v = aParam.y;
    float t = uTime;
    float looseness = 1.0 - uTension;
    float wandering = 1.0 - uStability;
    float weave = v + 3.0 * u + 0.16 * sin(u * 3.0 + t * 0.19);
    float radius = 2.12 + 0.11 * sin(3.0 * u + t * 0.16)
      + 0.055 * sin(5.0 * u - t * 0.13);
    float tube = 0.43 + 0.13 * looseness + 0.06 * (1.0 - uClarity);
    tube *= 1.0 + 0.15 * sin(2.0 * u + v * 0.45 + t * 0.17);
    float breath = (0.025 + 0.065 * wandering)
      * sin(u * 7.0 + v * 2.0 - t * 0.32);
    float radial = radius + (tube + breath) * cos(weave);
    vec3 p = vec3(
      radial * cos(u) * (1.0 + uTension * 0.055),
      radial * sin(u) * (0.88 - uTension * 0.045),
      tube * sin(weave) + 0.16 * sin(2.0 * u + t * 0.11)
    );
    p.z += 0.045 * wandering * sin(9.0 * u + v - t * 0.26);
    p += normalize(p + vec3(0.001)) * (aSeed - 0.5) * 0.035;

    vec3 ice = vec3(0.39, 0.72, 1.0);
    vec3 jade = vec3(0.14, 0.89, 0.73);
    vec3 coral = vec3(1.0, 0.49, 0.38);
    float gradient = 0.5 + 0.5 * sin(u - 0.8 + v * 0.23);
    vColor = mix(ice, jade, gradient);
    float ember = pow(max(0.0, cos(u - 5.10)), 14.0) * 0.78;
    vColor = mix(vColor, coral, ember);
    float stream = pow(0.5 + 0.5 * sin(4.0 * u - t * 0.50 + v * 0.8), 5.0);
    vAlpha = (0.12 + 0.32 * stream + 0.10 * uClarity)
      * (0.65 + 0.35 * sin(v * 2.0 + 1.4) * sin(v * 2.0 + 1.4));

    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(uPointScale * uPixelRatio * (8.0 / -viewPosition.z), 1.0, 26.0);
  }
`;

const filamentFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

const particleFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (radius > 1.0) discard;
    float glow = pow(1.0 - radius, 2.4);
    gl_FragColor = vec4(vColor, glow * vAlpha * 0.76);
  }
`;

export default function AwarenessScene(props: AwarenessSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const driverRef = useRef<{ invalidate: () => void; reset: () => void } | null>(null);
  propsRef.current = props;

  useEffect(() => {
    driverRef.current?.invalidate();
  }, [props.values.clarity, props.values.stability, props.values.tension, props.activeDimension, props.paused]);

  useEffect(() => {
    driverRef.current?.reset();
  }, [props.resetToken]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let frame: number | null = null;
    let released = false;
    let failed = false;
    let reported: SceneStatus | null = null;
    let inView = true;
    let width = 0;
    let height = 0;
    let previousTime = 0;
    let animationTime = 0;
    let cameraWasMoved = false;
    let shaderFailed = false;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const cleanups: (() => void)[] = [];
    const geometry = <T extends THREE.BufferGeometry>(value: T): T => { geometries.add(value); return value; };
    const material = <T extends THREE.Material>(value: T): T => { materials.add(value); return value; };
    const texture = <T extends THREE.Texture>(value: T): T => { textures.add(value); return value; };

    function report(status: SceneStatus) {
      host!.dataset.renderState = status;
      if (canvas) canvas.dataset.renderState = status;
      if (reported !== status) {
        reported = status;
        propsRef.current.onStatusChange?.(status);
      }
    }

    function release() {
      if (released) return;
      released = true;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      cleanups.forEach(cleanup => cleanup());
      controls?.dispose();
      geometries.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
      textures.forEach(value => value.dispose());
      renderer?.renderLists.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      driverRef.current = null;
    }

    function fallback() {
      if (failed || released) return;
      failed = true;
      if (canvas) { canvas.style.visibility = "hidden"; canvas.style.pointerEvents = "none"; }
      report("fallback");
      release();
    }

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.debug.onShaderError = () => { shaderFailed = true; };
      canvas = renderer.domElement;
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `由手動描述形成的抽象流動環形雕塑，並非身心測量。三個發光節點可選取清楚度、安住度或鬆緊度；也可使用頁面上的維度選擇按鈕。${INSTRUCTIONS}`);
      canvas.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp ArrowDown + - Home 0");
      canvas.tabIndex = 0;
      canvas.title = INSTRUCTIONS;
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.cursor = "grab";
      canvas.style.outlineOffset = "-4px";
      host.appendChild(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 70);
      camera.position.set(0, 0.42, 8.9);
      controls = new OrbitControls(camera, canvas);
      controls.target.set(0, -0.23, 0);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.085;
      controls.rotateSpeed = 0.50;
      controls.zoomSpeed = 0.66;
      controls.minPolarAngle = Math.PI * 0.15;
      controls.maxPolarAngle = Math.PI * 0.85;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
      controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
      // OrbitControls defaults to touch-action:none. Let a vertical swipe scroll
      // the page; horizontal drags still rotate, and two-finger gestures can zoom.
      canvas.style.touchAction = "pan-y";
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reducedMotion = motion.matches;
      controls.enableDamping = !reducedMotion;

      const uniforms = {
        uTime: { value: 0 },
        uClarity: { value: amount(propsRef.current.values.clarity) },
        uStability: { value: amount(propsRef.current.values.stability) },
        uTension: { value: amount(propsRef.current.values.tension) },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uPointScale: { value: 2.4 },
      };

      // Each line winds around the tube three times. Continuous strands, rather
      // than a wireframe mesh, give the sculpture its layered woven silhouette.
      const lanes = 76;
      const segments = 360;
      const vertices = lanes * segments * 2;
      const positions = new Float32Array(vertices * 3);
      const parameters = new Float32Array(vertices * 2);
      const seeds = new Float32Array(vertices);
      let cursor = 0;
      for (let lane = 0; lane < lanes; lane++) {
        const v = (lane / lanes) * Math.PI * 2;
        for (let step = 0; step < segments; step++) {
          for (let endpoint = 0; endpoint < 2; endpoint++) {
            const u = ((step + endpoint) / segments) * Math.PI * 2;
            parameters[cursor * 2] = u;
            parameters[cursor * 2 + 1] = v;
            seeds[cursor] = lane / lanes;
            positions[cursor * 3] = Math.cos(u) * 2.6;
            positions[cursor * 3 + 1] = Math.sin(u) * 2.6;
            cursor++;
          }
        }
      }
      const silkGeometry = geometry(new THREE.BufferGeometry());
      silkGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      silkGeometry.setAttribute("aParam", new THREE.BufferAttribute(parameters, 2));
      silkGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
      const silkMaterial = material(new THREE.ShaderMaterial({
        uniforms, vertexShader: filamentVertex, fragmentShader: filamentFragment,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      const sculpture = new THREE.Group();
      sculpture.position.y = -0.23;
      sculpture.rotation.set(0.24, -0.20, -0.12);
      scene.add(sculpture);
      const silk = new THREE.LineSegments(silkGeometry, silkMaterial);
      silk.frustumCulled = false;
      sculpture.add(silk);

      // Deterministic speckles keep remounts/reset visually consistent.
      let randomState = 72401;
      const random = () => {
        randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
        return randomState / 4294967296;
      };
      const particleCount = 2600;
      const particlePositions = new Float32Array(particleCount * 3);
      const particleParameters = new Float32Array(particleCount * 2);
      const particleSeeds = new Float32Array(particleCount);
      for (let index = 0; index < particleCount; index++) {
        particleParameters[index * 2] = random() * Math.PI * 2;
        particleParameters[index * 2 + 1] = random() * Math.PI * 2;
        particleSeeds[index] = random();
      }
      const particleGeometry = geometry(new THREE.BufferGeometry());
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute("aParam", new THREE.BufferAttribute(particleParameters, 2));
      particleGeometry.setAttribute("aSeed", new THREE.BufferAttribute(particleSeeds, 1));
      const particleMaterial = material(new THREE.ShaderMaterial({
        uniforms, vertexShader: filamentVertex, fragmentShader: particleFragment,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      particles.frustumCulled = false;
      sculpture.add(particles);
      const hazeMaterial = material(new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uPointScale: { value: 10.0 } },
        vertexShader: filamentVertex, fragmentShader: particleFragment,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      const haze = new THREE.Points(particleGeometry, hazeMaterial);
      haze.frustumCulled = false;
      sculpture.add(haze);

      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = 96; glowCanvas.height = 96;
      const glowContext = glowCanvas.getContext("2d");
      if (!glowContext) throw new Error("Glow texture unavailable");
      const gradient = glowContext.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.11, "rgba(255,255,255,.75)");
      gradient.addColorStop(0.32, "rgba(255,255,255,.15)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      glowContext.fillStyle = gradient; glowContext.fillRect(0, 0, 96, 96);
      const glow = texture(new THREE.CanvasTexture(glowCanvas));
      glow.colorSpace = THREE.SRGBColorSpace;

      const auraMaterial = material(new THREE.SpriteMaterial({ map: glow, color: 0x246d7a, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
      const aura = new THREE.Sprite(auraMaterial);
      aura.position.set(-0.35, -0.20, -1.7); aura.scale.set(9.2, 7.5, 1);
      scene.add(aura);

      const orbit = new THREE.Group();
      orbit.position.y = -0.23;
      orbit.rotation.set(0.22, -0.12, 0.06);
      scene.add(orbit);
      const orbitPosition = (angle: number, radius = 1) => new THREE.Vector3(
        Math.cos(angle) * 3.20 * radius,
        Math.sin(angle) * 2.63 * radius,
        Math.sin(angle * 2) * 0.23,
      );
      for (let ring = 0; ring < 2; ring++) {
        const points = Array.from({ length: 241 }, (_, index) => orbitPosition(index / 240 * Math.PI * 2, ring === 0 ? 1 : 1.075));
        const path = new THREE.Line(
          geometry(new THREE.BufferGeometry().setFromPoints(points)),
          material(new THREE.LineBasicMaterial({ color: ring === 0 ? 0x668c9d : 0x507a86, transparent: true, opacity: ring === 0 ? 0.18 : 0.07, depthWrite: false, blending: THREE.AdditiveBlending })),
        );
        orbit.add(path);
      }

      const hitGeometry = geometry(new THREE.SphereGeometry(0.23, 12, 10));
      const coreGeometry = geometry(new THREE.SphereGeometry(0.052, 12, 10));
      const haloGeometry = geometry(new THREE.TorusGeometry(0.125, 0.006, 6, 48));
      const hitMaterial = material(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      const targets: THREE.Mesh[] = [];
      const nodeAngles = [2.03, 3.98, 0.15];
      const nodes = DIMENSIONS.map((dimension, index) => {
        const group = new THREE.Group();
        group.position.copy(orbitPosition(nodeAngles[index]));
        orbit.add(group);
        const nodeMaterial = material(new THREE.MeshBasicMaterial({ color: COLORS[index], transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
        const core = new THREE.Mesh(coreGeometry, nodeMaterial);
        const ring = new THREE.Mesh(haloGeometry, nodeMaterial);
        group.add(core, ring);
        const glowMaterial = material(new THREE.SpriteMaterial({ map: glow, color: COLORS[index], transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false }));
        const halo = new THREE.Sprite(glowMaterial);
        halo.scale.setScalar(0.67); group.add(halo);
        const hit = new THREE.Mesh(hitGeometry, hitMaterial);
        hit.userData.dimension = dimension;
        group.add(hit); targets.push(hit);
        return { dimension, core, ring, halo, glowMaterial };
      });

      const dustPositions = new Float32Array(165 * 3);
      const dustColors = new Float32Array(165 * 3);
      for (let index = 0; index < 165; index++) {
        dustPositions[index * 3] = (random() - 0.5) * 14;
        dustPositions[index * 3 + 1] = (random() - 0.5) * 10;
        dustPositions[index * 3 + 2] = -2.5 - random() * 6;
        const brightness = 0.12 + random() * 0.37;
        dustColors[index * 3] = brightness * 0.53;
        dustColors[index * 3 + 1] = brightness * 0.79;
        dustColors[index * 3 + 2] = brightness;
      }
      const dustGeometry = geometry(new THREE.BufferGeometry());
      dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
      dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
      const dust = new THREE.Points(dustGeometry, material(new THREE.PointsMaterial({ size: 0.021, vertexColors: true, transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending })));
      scene.add(dust);

      const updateMetadata = () => {
        if (!canvas) return;
        canvas.dataset.camera = [camera.position.x, camera.position.y, camera.position.z].map(value => value.toFixed(3)).join(",");
        canvas.dataset.selected = propsRef.current.activeDimension;
      };
      const available = () => !released && !failed && !document.hidden && inView && width > 0 && height > 0;
      const invalidate = () => {
        if (available() && frame === null) frame = requestAnimationFrame(draw);
      };
      const fitDistance = () => 8.9 / Math.min(1, Math.max(0.5, camera.aspect));
      const reset = () => {
        if (released || !controls) return;
        cameraWasMoved = false;
        // Flush a drag's remaining damping before restoring the exact view.
        const damping = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        controls.target.set(0, -0.23, 0);
        camera.position.set(0, 0.42, fitDistance());
        controls.update(); controls.enableDamping = damping; controls.saveState();
        updateMetadata(); invalidate();
      };

      function draw(now: number) {
        frame = null;
        if (!available() || !renderer || !controls || !canvas) return;
        try {
          const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 1 / 60;
          previousTime = now;
          const animate = !propsRef.current.paused && !reducedMotion;
          const blend = animate ? 1 - Math.exp(-dt * 3.0) : 1;
          uniforms.uClarity.value = THREE.MathUtils.lerp(uniforms.uClarity.value, amount(propsRef.current.values.clarity), blend);
          uniforms.uStability.value = THREE.MathUtils.lerp(uniforms.uStability.value, amount(propsRef.current.values.stability), blend);
          uniforms.uTension.value = THREE.MathUtils.lerp(uniforms.uTension.value, amount(propsRef.current.values.tension), blend);
          if (animate) animationTime += dt * (0.38 + (1 - uniforms.uStability.value) * 0.52);
          uniforms.uTime.value = animationTime;
          for (const node of nodes) {
            const active = propsRef.current.activeDimension === node.dimension;
            const targetScale = active ? 1.45 : 1;
            node.ring.scale.setScalar(THREE.MathUtils.lerp(node.ring.scale.x, targetScale, blend));
            node.core.scale.setScalar(active ? 1.17 : 1);
            node.glowMaterial.opacity = active ? 1 : 0.57;
            node.halo.scale.setScalar(active ? 0.90 : 0.63);
          }
          controls.update();
          scene.updateMatrixWorld();
          renderer.render(scene, camera);
          if (shaderFailed) { fallback(); return; }
          if (reported !== "ready") report("ready");
          canvas.dataset.renderState = propsRef.current.paused ? "paused" : reducedMotion ? "reduced-motion" : "ready";
          host!.dataset.renderState = canvas.dataset.renderState;
          updateMetadata();
          if (animate) invalidate();
        } catch { fallback(); }
      }

      const resize = () => {
        if (released || !renderer || !controls) return;
        const bounds = host.getBoundingClientRect();
        width = Math.round(bounds.width); height = Math.round(bounds.height);
        if (width < 1 || height < 1) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
        renderer.setPixelRatio(ratio); uniforms.uPixelRatio.value = ratio;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        const distance = fitDistance();
        controls.minDistance = distance * 0.63; controls.maxDistance = distance * 1.9;
        if (!cameraWasMoved) reset();
        invalidate();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      // ResizeObserver covers layout; window resize also catches DPR changes.
      window.addEventListener("resize", resize);
      cleanups.push(() => window.removeEventListener("resize", resize));

      const syncVisibility = () => {
        if (released || !controls) return;
        controls.enabled = !document.hidden && inView;
        if (!available()) {
          if (frame !== null) cancelAnimationFrame(frame);
          frame = null; previousTime = 0;
          if (canvas) canvas.dataset.renderState = document.hidden ? "hidden" : "offscreen";
        } else invalidate();
      };
      document.addEventListener("visibilitychange", syncVisibility);
      cleanups.push(() => document.removeEventListener("visibilitychange", syncVisibility));
      if (typeof IntersectionObserver !== "undefined") {
        intersectionObserver = new IntersectionObserver(entries => {
          inView = entries[0]?.isIntersecting ?? true;
          syncVisibility();
        }, { threshold: 0 });
        intersectionObserver.observe(host);
      }
      const onMotionChange = () => {
        reducedMotion = motion.matches;
        if (controls) controls.enableDamping = !reducedMotion;
        previousTime = 0; invalidate();
      };
      motion.addEventListener("change", onMotionChange);
      cleanups.push(() => motion.removeEventListener("change", onMotionChange));

      controls.addEventListener("change", invalidate);
      const onControlStart = () => { cameraWasMoved = true; };
      controls.addEventListener("start", onControlStart);
      cleanups.push(() => {
        controls?.removeEventListener("change", invalidate);
        controls?.removeEventListener("start", onControlStart);
      });

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerDown: { id: number; x: number; y: number } | null = null;
      const pick = (event: PointerEvent): Dimension | null => {
        if (!canvas) return null;
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return null;
        pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
        scene.updateMatrixWorld(); raycaster.setFromCamera(pointer, camera);
        const intersection = raycaster.intersectObjects(targets, false)[0];
        return intersection ? intersection.object.userData.dimension as Dimension : null;
      };
      const onPointerDown = (event: PointerEvent) => {
        if (!event.isPrimary || event.button !== 0) return;
        pointerDown = { id: event.pointerId, x: event.clientX, y: event.clientY };
        if (canvas) canvas.style.cursor = "grabbing";
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!canvas || pointerDown || event.pointerType === "touch") return;
        const dimension = pick(event);
        canvas.style.cursor = dimension ? "pointer" : "grab";
        canvas.title = dimension ? `選取${LABELS[dimension]}；不會更改記錄值。` : INSTRUCTIONS;
      };
      const onPointerUp = (event: PointerEvent) => {
        if (pointerDown?.id === event.pointerId && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) < 7) {
          const dimension = pick(event);
          if (dimension) propsRef.current.onSelectDimension(dimension);
        }
        pointerDown = null;
        if (canvas) canvas.style.cursor = "grab";
      };
      const cancelPointer = () => { pointerDown = null; if (canvas) canvas.style.cursor = "grab"; };
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", cancelPointer);
      canvas.addEventListener("pointerleave", cancelPointer);
      cleanups.push(() => {
        canvas?.removeEventListener("pointerdown", onPointerDown);
        canvas?.removeEventListener("pointermove", onPointerMove);
        canvas?.removeEventListener("pointerup", onPointerUp);
        canvas?.removeEventListener("pointercancel", cancelPointer);
        canvas?.removeEventListener("pointerleave", cancelPointer);
      });

      const onKeyDown = (event: KeyboardEvent) => {
        if (!controls?.enabled || event.altKey || event.metaKey || event.ctrlKey) return;
        const direction = camera.position.clone().sub(controls.target);
        const spherical = new THREE.Spherical().setFromVector3(direction);
        switch (event.key) {
          case "ArrowLeft": spherical.theta += 0.10; break;
          case "ArrowRight": spherical.theta -= 0.10; break;
          case "ArrowUp": spherical.phi -= 0.08; break;
          case "ArrowDown": spherical.phi += 0.08; break;
          case "+": case "=": spherical.radius *= 0.91; break;
          case "-": case "_": spherical.radius *= 1.09; break;
          case "Home": case "0": event.preventDefault(); reset(); return;
          default: return;
        }
        event.preventDefault(); cameraWasMoved = true;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
        spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
        controls.update(); invalidate();
      };
      const onContextLost = (event: Event) => { event.preventDefault(); fallback(); };
      canvas.addEventListener("keydown", onKeyDown);
      canvas.addEventListener("webglcontextlost", onContextLost);
      cleanups.push(() => {
        canvas?.removeEventListener("keydown", onKeyDown);
        canvas?.removeEventListener("webglcontextlost", onContextLost);
      });

      driverRef.current = { invalidate, reset };
      resize(); syncVisibility();
    } catch { fallback(); }

    return () => {
      release();
      canvas?.remove();
    };
  }, []);

  return <div ref={hostRef} data-awareness-scene data-render-state="initializing" style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }} />;
}
