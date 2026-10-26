import * as THREE from 'three';
import { createCobbleTexture, createRuneRingTexture, createAncientPillarTexture } from './proceduralTextures.ts';

export interface Station3D {
  id: number;
  name: string;
  position: THREE.Vector3;
  group: THREE.Group;
  beaconMesh: THREE.Mesh;
  floatingCrystal: THREE.Mesh;
  runeRingMesh: THREE.Mesh;
  pointLight: THREE.PointLight;
  isSolved: boolean;
  setSolved: (solved: boolean) => void;
  update: (dt: number, time: number) => void;
}

export interface WorldBuildResult {
  scene: THREE.Scene;
  stations: Record<number, Station3D>;
  updateWorld: (dt: number, time: number) => void;
  colliders: { x: number; z: number; radius: number }[];
}

export function buildAethelgardWorld(scene: THREE.Scene): WorldBuildResult {
  const colliders: { x: number; z: number; radius: number }[] = [];

  // Common shared procedural textures
  const cobbleTex = createCobbleTexture();
  const pillarTex = createAncientPillarTexture();

  // Common shared materials
  const groundMat = new THREE.MeshStandardMaterial({
    color: '#0f172a', // Deep mystical earth slate
    roughness: 0.9,
    metalness: 0.1,
  });

  const pathMat = new THREE.MeshStandardMaterial({
    map: cobbleTex,
    roughness: 0.7,
    metalness: 0.2,
  });

  const stoneMat = new THREE.MeshStandardMaterial({
    map: pillarTex,
    color: '#475569',
    roughness: 0.8,
    metalness: 0.2,
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    roughness: 0.25,
    metalness: 0.85,
  });

  // 1. Terrain: Expansive circular valley surrounded by gentle natural slopes
  const terrainGeo = new THREE.CylinderGeometry(55, 58, 2, 48);
  const terrain = new THREE.Mesh(terrainGeo, groundMat);
  terrain.position.y = -1;
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Central Stone Plaza
  const plazaGeo = new THREE.CylinderGeometry(11, 11, 0.15, 32);
  const plaza = new THREE.Mesh(plazaGeo, pathMat);
  plaza.position.y = 0.08;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // Radiating pathways from Central Plaza to the 6 Stations
  const stationCoords: { id: number; name: string; x: number; z: number; color: string }[] = [
    { id: 1, name: 'Altar Fajar Terbit', x: 18, z: 9, color: '#38bdf8' },
    { id: 2, name: 'Monolit Logika Arkana', x: 20, z: -15, color: '#a855f7' },
    { id: 3, name: 'Arsip Batu Purba', x: -18, z: -18, color: '#34d399' },
    { id: 4, name: 'Gerbang Kristal Elemen', x: -22, z: 7, color: '#f59e0b' },
    { id: 5, name: 'Taman Pengamat Bintang', x: -12, z: 22, color: '#818cf8' },
    { id: 6, name: 'Pusat Segel Kuil Abadi', x: 0, z: -7, color: '#ec4899' },
  ];

  stationCoords.forEach((st) => {
    if (st.id === 6) return; // Station 6 is adjacent to plaza
    const dx = st.x;
    const dz = st.z;
    const dist = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const pathGeo = new THREE.BoxGeometry(2.4, 0.1, dist);
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.position.set(dx / 2, 0.06, dz / 2);
    path.rotation.y = angle;
    path.receiveShadow = true;
    scene.add(path);
  });

  // 2. Natural Perimeter Barriers (Cliffs & Rocks bounding the valley)
  const rockGeo = new THREE.DodecahedronGeometry(3.5, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.95,
    metalness: 0.1,
  });

  const perimeterCount = 28;
  for (let i = 0; i < perimeterCount; i++) {
    const angle = (i / perimeterCount) * Math.PI * 2;
    const radius = 42 + (Math.sin(i * 3) * 5);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(
      Math.cos(angle) * radius,
      1.5 + Math.abs(Math.sin(i * 5)) * 2,
      Math.sin(angle) * radius
    );
    rock.scale.set(1 + Math.sin(i) * 0.3, 1.4 + Math.cos(i * 2) * 0.5, 1 + Math.cos(i) * 0.3);
    rock.rotation.set(i * 0.3, i * 0.7, 0);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);

    colliders.push({ x: rock.position.x, z: rock.position.z, radius: 4.5 });
  }

  // 3. Procedural Ancient Trees (Instanced foliage with multi-part trunk & leaves)
  const treeCount = 24;
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.5, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#271b12', roughness: 0.9 });
  const leavesGeo = new THREE.DodecahedronGeometry(1.8, 1);
  const leavesMat = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.8 });

  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + 0.15;
    const dist = 26 + (Math.cos(i * 4) * 8);
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;

    // Check distance to stations so trees don't overlap shrines
    const nearStation = stationCoords.some(s => Math.hypot(s.x - tx, s.z - tz) < 5);
    if (nearStation) continue;

    const treeGroup = new THREE.Group();
    treeGroup.position.set(tx, 0, tz);

    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const leaves1 = new THREE.Mesh(leavesGeo, leavesMat);
    leaves1.position.y = 3.6;
    leaves1.scale.set(1.2, 1.1, 1.2);
    leaves1.castShadow = true;
    treeGroup.add(leaves1);

    const leaves2 = new THREE.Mesh(leavesGeo, leavesMat);
    leaves2.position.set(0.3, 4.6, 0.2);
    leaves2.scale.set(0.85, 0.85, 0.85);
    leaves2.castShadow = true;
    treeGroup.add(leaves2);

    scene.add(treeGroup);
    colliders.push({ x: tx, z: tz, radius: 1.2 });
  }

  // 4. Central Grand Temple Sanctuary Architecture (Station 6)
  const templeGroup = new THREE.Group();
  templeGroup.position.set(0, 0, -8);

  // Temple Base Plinth
  const plinthGeo = new THREE.BoxGeometry(10, 0.8, 8);
  const plinth = new THREE.Mesh(plinthGeo, stoneMat);
  plinth.position.y = 0.4;
  plinth.receiveShadow = true;
  templeGroup.add(plinth);

  // Grand Steps
  const stepGeo = new THREE.BoxGeometry(8, 0.3, 1.2);
  const steps = new THREE.Mesh(stepGeo, stoneMat);
  steps.position.set(0, 0.15, 4.4);
  templeGroup.add(steps);

  // 4 Columns supporting Pediment
  const colGeo = new THREE.CylinderGeometry(0.4, 0.45, 4.8, 12);
  const colPositions = [
    [-3.8, 2.8, -3],
    [3.8, 2.8, -3],
    [-3.8, 2.8, 2.8],
    [3.8, 2.8, 2.8]
  ];
  colPositions.forEach(([cx, cy, cz]) => {
    const col = new THREE.Mesh(colGeo, stoneMat);
    col.position.set(cx, cy, cz);
    col.castShadow = true;
    col.receiveShadow = true;
    templeGroup.add(col);

    // Column Capital
    const capGeo = new THREE.BoxGeometry(1.1, 0.3, 1.1);
    const cap = new THREE.Mesh(capGeo, goldTrimMat);
    cap.position.set(cx, cy + 2.4, cz);
    templeGroup.add(cap);

    colliders.push({ x: cx, z: -8 + cz, radius: 0.8 });
  });

  // Temple Entablature & Pediment (Triangular roof)
  const entGeo = new THREE.BoxGeometry(9.6, 0.6, 7.6);
  const ent = new THREE.Mesh(entGeo, stoneMat);
  ent.position.y = 5.5;
  ent.castShadow = true;
  templeGroup.add(ent);

  const roofGeo = new THREE.ConeGeometry(6.2, 2.2, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, stoneMat);
  roof.position.y = 6.9;
  roof.scale.set(1.2, 1, 0.9);
  roof.castShadow = true;
  templeGroup.add(roof);

  scene.add(templeGroup);

  // 5. Build 6 Interactive Stations / Shrines
  const stations: Record<number, Station3D> = {};

  stationCoords.forEach((st) => {
    const stGroup = new THREE.Group();
    stGroup.position.set(st.x, 0, st.z);

    // Proximity Trigger Collider
    colliders.push({ x: st.x, z: st.z, radius: 1.6 });

    // Raised Circular Runic Dias
    const diasGeo = new THREE.CylinderGeometry(2.5, 2.8, 0.4, 24);
    const dias = new THREE.Mesh(diasGeo, stoneMat);
    dias.position.y = 0.2;
    dias.receiveShadow = true;
    stGroup.add(dias);

    // Runic Floor Ring (Flat disk directly above dias)
    const runeRingGeo = new THREE.RingGeometry(0.8, 2.3, 32);
    const runeRingMat = new THREE.MeshBasicMaterial({
      map: createRuneRingTexture(st.color),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const runeRingMesh = new THREE.Mesh(runeRingGeo, runeRingMat);
    runeRingMesh.rotation.x = -Math.PI / 2;
    runeRingMesh.position.y = 0.42;
    stGroup.add(runeRingMesh);

    // 2-3 Flanking Ancient Pillar Obelisks
    const obeliskGeo = new THREE.BoxGeometry(0.4, 2.6, 0.4);
    [-1.8, 1.8].forEach((ox) => {
      const obelisk = new THREE.Mesh(obeliskGeo, stoneMat);
      obelisk.position.set(ox, 1.3, 0);
      obelisk.castShadow = true;
      stGroup.add(obelisk);

      // Glowing Rune Cap
      const capGemGeo = new THREE.OctahedronGeometry(0.18, 0);
      const capGemMat = new THREE.MeshStandardMaterial({
        color: st.color,
        emissive: st.color,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const capGem = new THREE.Mesh(capGemGeo, capGemMat);
      capGem.position.set(ox, 2.75, 0);
      stGroup.add(capGem);
    });

    // Central Floating Mystery Crystal / Artifact
    const crystalGeo = new THREE.OctahedronGeometry(0.65, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: st.color,
      emissive: st.color,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.8,
    });
    const floatingCrystal = new THREE.Mesh(crystalGeo, crystalMat);
    floatingCrystal.position.set(0, 1.6, 0);
    floatingCrystal.castShadow = true;
    stGroup.add(floatingCrystal);

    // Glowing Point Light around the Station
    const pLight = new THREE.PointLight(new THREE.Color(st.color), 1.2, 7);
    pLight.position.set(0, 1.8, 0);
    stGroup.add(pLight);

    // Vertical Celestial Beacon Pillar (Shoots up when station is solved!)
    const beaconGeo = new THREE.CylinderGeometry(0.3, 0.4, 30, 16, 1, true);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(0, 15, 0);
    stGroup.add(beaconMesh);

    scene.add(stGroup);

    let isSolved = false;

    function setSolved(solved: boolean) {
      isSolved = solved;
      if (solved) {
        beaconMat.opacity = 0.55;
        floatingCrystal.scale.set(1.3, 1.3, 1.3);
        pLight.intensity = 2.4;
        pLight.color.set('#fef08a'); // Warm victorious glow
      } else {
        beaconMat.opacity = 0;
        floatingCrystal.scale.set(1, 1, 1);
        pLight.intensity = 1.2;
        pLight.color.set(st.color);
      }
    }

    function update(_dt: number, time: number) {
      // Floating bobbing & rotation for crystal
      floatingCrystal.rotation.y = time * 0.8;
      floatingCrystal.rotation.x = Math.sin(time * 0.6) * 0.2;
      floatingCrystal.position.y = 1.6 + Math.sin(time * 1.5 + st.id) * 0.15;

      // Slow rotation for floor runic ring
      runeRingMesh.rotation.z = time * 0.15 * (st.id % 2 === 0 ? 1 : -1);

      // Beacon subtle pulse if solved
      if (isSolved) {
        beaconMesh.rotation.y = time * 0.5;
        beaconMat.opacity = 0.45 + Math.sin(time * 3) * 0.15;
      }
    }

    stations[st.id] = {
      id: st.id,
      name: st.name,
      position: new THREE.Vector3(st.x, 0, st.z),
      group: stGroup,
      beaconMesh,
      floatingCrystal,
      runeRingMesh,
      pointLight: pLight,
      isSolved,
      setSolved,
      update,
    };
  });

  // World Animation Loop Hook
  function updateWorld(dt: number, time: number) {
    for (const key in stations) {
      stations[key].update(dt, time);
    }
  }

  return {
    scene,
    stations,
    updateWorld,
    colliders,
  };
}
