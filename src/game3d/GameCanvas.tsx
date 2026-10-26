import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildAethelgardWorld, Station3D } from './worldBuilder.ts';
import { createProceduralAvatar, AvatarInstance } from './avatarBuilder.ts';
import { AvatarConfig, StudentProgress } from '../types/game.ts';
import { sound } from '../audio/soundEffects.ts';

interface GameCanvasProps {
  localPlayerName: string;
  localPlayerAvatar: AvatarConfig;
  localPlayerRole?: 'student' | 'guru';
  remotePlayers: Record<string, StudentProgress>;
  solvedStations: number[];
  onMoveUpdate: (pos: { x: number; y: number; z: number }, rotation: number, isMoving: boolean) => void;
  onNearStation: (stationId: number | null) => void;
  onOpenStation: (stationId: number) => void;
}

// Scratch vector objects to prevent Garbage Collection in the 60fps render loop
const _playerDir = new THREE.Vector3();
const _camOffset = new THREE.Vector3(0, 5.5, 9.5);
const _targetCamPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

export const GameCanvas: React.FC<GameCanvasProps> = ({
  localPlayerName,
  localPlayerAvatar,
  localPlayerRole = 'student',
  remotePlayers,
  solvedStations,
  onMoveUpdate,
  onNearStation,
  onOpenStation,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const touchJoystickRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // Store mutable refs to prevent recreation of scene or loop
  const stateRef = useRef<{
    localPlayerPos: THREE.Vector3;
    localPlayerRot: number;
    isMoving: boolean;
    localAvatarInstance: AvatarInstance | null;
    remoteAvatarInstances: Map<string, AvatarInstance>;
    stations: Record<number, Station3D>;
    nearestStationId: number | null;
    keys: Record<string, boolean>;
    lastFootstepTime: number;
    lastMoveEmitTime: number;
  }>({
    localPlayerPos: new THREE.Vector3(0, 0, 4),
    localPlayerRot: 0,
    isMoving: false,
    localAvatarInstance: null,
    remoteAvatarInstances: new Map(),
    stations: {},
    nearestStationId: null,
    keys: {},
    lastFootstepTime: 0,
    lastMoveEmitTime: 0,
  });

  // Update solved stations on 3D world beacons
  useEffect(() => {
    const stations = stateRef.current.stations;
    if (!stations) return;
    for (let id = 1; id <= 6; id++) {
      if (stations[id]) {
        const isSolved = solvedStations.includes(id);
        stations[id].setSolved(isSolved);
      }
    }
  }, [solvedStations]);

  // Sync avatar customizations if changed
  useEffect(() => {
    if (stateRef.current.localAvatarInstance) {
      stateRef.current.localAvatarInstance.updateConfig(localPlayerAvatar);
    }
  }, [localPlayerAvatar]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect Software WebGL per Three.js skill
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Initialize WebGL Renderer
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Scene & Horizon Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.022);

    // 4. Camera
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 150);
    camera.position.set(0, 6, 12);

    // 5. Studio Environment & Lighting Rig
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Warm Directional Key Light with shadow bounds
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.6);
    keyLight.position.set(20, 35, 20);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 80;
    keyLight.shadow.camera.left = -30;
    keyLight.shadow.camera.right = 30;
    keyLight.shadow.camera.top = 30;
    keyLight.shadow.camera.bottom = -30;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Cool Sky/Ground Hemisphere Light Fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.85);
    scene.add(hemiLight);

    // Subtle blue rim ambient
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.5);
    scene.add(ambientLight);

    // 6. Build Procedural World
    const world = buildAethelgardWorld(scene);
    stateRef.current.stations = world.stations;

    // Apply any initial solved stations
    solvedStations.forEach((id) => {
      if (world.stations[id]) {
        world.stations[id].setSolved(true);
      }
    });

    // 7. Spawn Local Player Avatar
    const localAvatar = createProceduralAvatar(
      localPlayerName,
      localPlayerAvatar,
      localPlayerRole
    );
    localAvatar.group.position.copy(stateRef.current.localPlayerPos);
    scene.add(localAvatar.group);
    stateRef.current.localAvatarInstance = localAvatar;

    // Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 8. Input Event Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      stateRef.current.keys[key] = true;

      // Check interaction key [E] or [Space]
      if (key === 'e' || (key === ' ' && stateRef.current.nearestStationId !== null)) {
        if (stateRef.current.nearestStationId !== null) {
          sound.playInteract();
          onOpenStation(stateRef.current.nearestStationId);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      stateRef.current.keys[key] = false;
    };

    const handleBlur = () => {
      stateRef.current.keys = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 9. Simulation & Render Loop
    let frameId = 0;
    let lastTime = performance.now();
    let totalTime = 0;

    function tick() {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling
      lastTime = now;
      totalTime += dt;

      // --- Player Movement Input Processing ---
      const keys = stateRef.current.keys;
      const joystick = touchJoystickRef.current;

      let moveX = 0;
      let moveZ = 0;

      if (keys['w'] || keys['arrowup']) moveZ -= 1;
      if (keys['s'] || keys['arrowdown']) moveZ += 1;
      if (keys['a'] || keys['arrowleft']) moveX -= 1;
      if (keys['d'] || keys['arrowright']) moveX += 1;

      // Blend virtual joystick touch if active
      if (joystick.active) {
        moveX += joystick.x;
        moveZ += joystick.y;
      }

      const inputLen = Math.hypot(moveX, moveZ);
      const isMoving = inputLen > 0.1;
      stateRef.current.isMoving = isMoving;

      const playerPos = stateRef.current.localPlayerPos;

      if (isMoving) {
        const normX = moveX / Math.max(inputLen, 1);
        const normZ = moveZ / Math.max(inputLen, 1);
        const moveSpeed = 8.2;

        const nextX = playerPos.x + normX * moveSpeed * dt;
        const nextZ = playerPos.z + normZ * moveSpeed * dt;

        // Radius boundary clamp (stay within the valley)
        const distFromCenter = Math.hypot(nextX, nextZ);
        if (distFromCenter < 40) {
          playerPos.x = nextX;
          playerPos.z = nextZ;
        }

        // Target rotation facing movement vector
        const targetRot = Math.atan2(normX, normZ);
        // Exponential damping for smooth avatar turning
        stateRef.current.localPlayerRot = THREE.MathUtils.damp(
          stateRef.current.localPlayerRot,
          targetRot,
          16,
          dt
        );

        // Footsteps audio rhythm
        if (now - stateRef.current.lastFootstepTime > 320) {
          sound.playFootstep();
          stateRef.current.lastFootstepTime = now;
        }

        // Throttle movement network broadcast to ~25Hz
        if (now - stateRef.current.lastMoveEmitTime > 40) {
          onMoveUpdate(
            { x: playerPos.x, y: playerPos.y, z: playerPos.z },
            stateRef.current.localPlayerRot,
            true
          );
          stateRef.current.lastMoveEmitTime = now;
        }
      } else {
        // Send idle state when stopped
        if (now - stateRef.current.lastMoveEmitTime > 250) {
          onMoveUpdate(
            { x: playerPos.x, y: playerPos.y, z: playerPos.z },
            stateRef.current.localPlayerRot,
            false
          );
          stateRef.current.lastMoveEmitTime = now;
        }
      }

      // Update Local Avatar 3D Mesh
      if (localAvatar) {
        localAvatar.group.position.set(playerPos.x, 0, playerPos.z);
        localAvatar.group.rotation.y = stateRef.current.localPlayerRot;
        localAvatar.updateAnimation(dt, isMoving);
      }

      // Proximity detection to 6 puzzle stations
      let nearestId: number | null = null;
      let minDistance = 3.6; // Activation threshold

      for (const stId in world.stations) {
        const station = world.stations[stId];
        const dist = Math.hypot(
          playerPos.x - station.position.x,
          playerPos.z - station.position.z
        );
        if (dist < minDistance) {
          nearestId = Number(stId);
          minDistance = dist;
        }
      }

      if (nearestId !== stateRef.current.nearestStationId) {
        stateRef.current.nearestStationId = nearestId;
        onNearStation(nearestId);
      }

      // --- Damped Camera Following Local Player ---
      _targetCamPos.copy(playerPos).add(_camOffset);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 6, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 6, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 6, dt);

      _lookTarget.set(playerPos.x, playerPos.y + 1.2, playerPos.z);
      camera.lookAt(_lookTarget);

      // --- Update World Animations ---
      world.updateWorld(dt, totalTime);

      // Render Scene
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        // Software WebGL pacing
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            gl.deleteSync(sync);
            frameId = window.setTimeout(tick, 70);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);

      if (localAvatar) {
        localAvatar.dispose();
      }

      stateRef.current.remoteAvatarInstances.forEach((inst) => inst.dispose());
      stateRef.current.remoteAvatarInstances.clear();

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync Remote Players (Add, update position/animations, or remove)
  useEffect(() => {
    const scene = stateRef.current.localAvatarInstance?.group.parent as THREE.Scene;
    if (!scene) return;

    const existingMap = stateRef.current.remoteAvatarInstances;
    const currentRemoteIds = new Set(Object.keys(remotePlayers));

    // Remove disconnected players
    for (const [id, avatarInst] of existingMap.entries()) {
      if (!currentRemoteIds.has(id)) {
        scene.remove(avatarInst.group);
        avatarInst.dispose();
        existingMap.delete(id);
      }
    }

    // Add or update remote players
    for (const id in remotePlayers) {
      const student = remotePlayers[id];
      if (!existingMap.has(id)) {
        // Create new procedural avatar for remote student
        const newInst = createProceduralAvatar(
          student.name,
          student.avatar,
          'student'
        );
        newInst.group.position.set(student.position.x, 0, student.position.z);
        newInst.group.rotation.y = student.rotation || 0;
        scene.add(newInst.group);
        existingMap.set(id, newInst);
      } else {
        const inst = existingMap.get(id)!;
        // Smooth interpolate remote position & rotation
        inst.group.position.set(student.position.x, 0, student.position.z);
        inst.group.rotation.y = student.rotation || 0;
        inst.updateAnimation(0.016, student.isMoving);
      }
    }
  }, [remotePlayers]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Virtual Touch Joystick for Mobile / Tablet / Touchscreen devices */}
      <div
        className="md:hidden absolute bottom-24 left-6 w-28 h-28 rounded-full border-2 border-cyan-500/30 bg-slate-900/60 touch-none flex items-center justify-center pointer-events-auto"
        onTouchStart={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const touch = e.touches[0];
          touchJoystickRef.current.active = true;
          const dx = touch.clientX - (rect.left + rect.width / 2);
          const dy = touch.clientY - (rect.top + rect.height / 2);
          touchJoystickRef.current.x = Math.max(-1, Math.min(1, dx / 45));
          touchJoystickRef.current.y = Math.max(-1, Math.min(1, dy / 45));
        }}
        onTouchMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const touch = e.touches[0];
          const dx = touch.clientX - (rect.left + rect.width / 2);
          const dy = touch.clientY - (rect.top + rect.height / 2);
          touchJoystickRef.current.x = Math.max(-1, Math.min(1, dx / 45));
          touchJoystickRef.current.y = Math.max(-1, Math.min(1, dy / 45));
        }}
        onTouchEnd={() => {
          touchJoystickRef.current.active = false;
          touchJoystickRef.current.x = 0;
          touchJoystickRef.current.y = 0;
        }}
      >
        <div className="w-10 h-10 rounded-full bg-cyan-400/80 shadow-lg shadow-cyan-500/50" />
      </div>
    </div>
  );
};
