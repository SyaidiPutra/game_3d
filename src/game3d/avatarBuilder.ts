import * as THREE from 'three';
import { createContactShadowTexture, createBillboardTexture } from './proceduralTextures.ts';
import { AvatarConfig } from '../types/game.ts';

export interface AvatarInstance {
  group: THREE.Group;
  parts: {
    head: THREE.Mesh;
    torso: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    hatGroup: THREE.Group;
    accessoryGroup: THREE.Group;
    companionOrb: THREE.Mesh;
    billboard: THREE.Sprite;
  };
  config: AvatarConfig;
  name: string;
  role: string;
  animTime: number;
  updateAnimation: (dt: number, isMoving: boolean) => void;
  updateConfig: (config: AvatarConfig) => void;
  updateChatBubble: (text?: string) => void;
  dispose: () => void;
}

export function createProceduralAvatar(
  name: string,
  config: AvatarConfig,
  role: string = 'student'
): AvatarInstance {
  const group = new THREE.Group();
  group.name = `avatar-${name}`;

  // Palette & Materials
  const baseColor = new THREE.Color(config.color || '#3b82f6');
  const skinTone = new THREE.Color('#fcd34d'); // Warm stylized skin
  const darkCloth = new THREE.Color('#1e293b');
  const goldAccent = new THREE.Color('#fbbf24');

  // PBR materials with varied roughness / metalness
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.65,
    metalness: 0.15,
  });

  const skinMaterial = new THREE.MeshStandardMaterial({
    color: skinTone,
    roughness: 0.5,
    metalness: 0.05,
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: darkCloth,
    roughness: 0.8,
    metalness: 0.2,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: goldAccent,
    roughness: 0.2,
    metalness: 0.85,
  });

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  // 1. Contact Shadow Plane (Grounding)
  const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  group.add(shadowPlane);

  // 2. Torso / Body (Tapered stylized adventurer robe/coat)
  const torsoGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.75, 12);
  const torso = new THREE.Mesh(torsoGeo, bodyMaterial);
  torso.position.y = 0.95;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Torso belt & buckle (Accent detail)
  const beltGeo = new THREE.CylinderGeometry(0.425, 0.425, 0.1, 12);
  const belt = new THREE.Mesh(beltGeo, darkMaterial);
  belt.position.y = -0.15;
  torso.add(belt);

  const buckleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.06);
  const buckle = new THREE.Mesh(buckleGeo, accentMaterial);
  buckle.position.set(0, -0.15, 0.42);
  torso.add(buckle);

  // 3. Head & Face
  const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
  const head = new THREE.Mesh(headGeo, skinMaterial);
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);

  // Stylized Eyes
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  leftEye.position.set(-0.12, 0.04, 0.25);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  rightEye.position.set(0.12, 0.04, 0.25);
  head.add(rightEye);

  // 4. Limbs: Legs
  const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.6, 8);
  
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.2, 0.6, 0);
  const leftLeg = new THREE.Mesh(legGeo, darkMaterial);
  leftLeg.position.y = -0.3;
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);
  group.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.2, 0.6, 0);
  const rightLeg = new THREE.Mesh(legGeo, darkMaterial);
  rightLeg.position.y = -0.3;
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);
  group.add(rightLegPivot);

  // 5. Limbs: Arms
  const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.55, 8);
  
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.46, 1.25, 0);
  const leftArm = new THREE.Mesh(armGeo, bodyMaterial);
  leftArm.position.y = -0.25;
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);
  group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.46, 1.25, 0);
  const rightArm = new THREE.Mesh(armGeo, bodyMaterial);
  rightArm.position.y = -0.25;
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);
  group.add(rightArmPivot);

  // 6. Backpack / Explorer Satchel
  const backpackGeo = new THREE.BoxGeometry(0.44, 0.5, 0.24);
  const backpackMat = new THREE.MeshStandardMaterial({
    color: '#78350f',
    roughness: 0.9,
    metalness: 0.05
  });
  const backpack = new THREE.Mesh(backpackGeo, backpackMat);
  backpack.position.set(0, 0.05, -0.32);
  backpack.castShadow = true;
  torso.add(backpack);

  // Rolled blanket on top of backpack
  const rollGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.48, 8);
  rollGeo.rotateZ(Math.PI / 2);
  const rollMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.8 });
  const roll = new THREE.Mesh(rollGeo, rollMat);
  roll.position.set(0, 0.35, -0.32);
  torso.add(roll);

  // 7. Hats & Headgear (Modular Group)
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 0.28, 0);
  head.add(hatGroup);

  function rebuildHat(hatType: string) {
    // Clear previous hat children
    while (hatGroup.children.length > 0) {
      hatGroup.remove(hatGroup.children[0]);
    }

    if (hatType === 'scholar') {
      // Scholar Mortarboard Cap
      const capSkullGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12);
      const capSkull = new THREE.Mesh(capSkullGeo, darkMaterial);
      hatGroup.add(capSkull);

      const boardGeo = new THREE.BoxGeometry(0.65, 0.04, 0.65);
      const board = new THREE.Mesh(boardGeo, darkMaterial);
      board.position.y = 0.1;
      hatGroup.add(board);

      const tasselGeo = new THREE.CylinderGeometry(0.015, 0.03, 0.3, 6);
      const tassel = new THREE.Mesh(tasselGeo, accentMaterial);
      tassel.position.set(0.26, -0.05, 0.26);
      tassel.rotation.z = -0.2;
      hatGroup.add(tassel);
    } else if (hatType === 'explorer') {
      // Explorer Pith Helmet
      const domeGeo = new THREE.SphereGeometry(0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.7 });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      hatGroup.add(dome);

      const brimGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.05, 16);
      const brim = new THREE.Mesh(brimGeo, domeMat);
      brim.position.y = 0.02;
      hatGroup.add(brim);
    } else if (hatType === 'wizard') {
      // Wizard Cone Hat with Stars
      const coneGeo = new THREE.ConeGeometry(0.32, 0.65, 12);
      const coneMat = new THREE.MeshStandardMaterial({ color: '#4c1d95', roughness: 0.6 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 0.32;
      hatGroup.add(cone);

      const brimGeo = new THREE.CylinderGeometry(0.48, 0.5, 0.04, 16);
      const brim = new THREE.Mesh(brimGeo, coneMat);
      brim.position.y = 0.02;
      hatGroup.add(brim);
    } else if (hatType === 'visor') {
      // Tech Visor / Goggles
      const visorGeo = new THREE.BoxGeometry(0.44, 0.12, 0.18);
      const visorMat = new THREE.MeshStandardMaterial({
        color: '#06b6d4',
        roughness: 0.1,
        metalness: 0.9,
        emissive: '#0891b2',
        emissiveIntensity: 0.6
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, -0.18, 0.22);
      hatGroup.add(visor);
    } else if (hatType === 'crown') {
      // Royal Arcane Circlet / Crown
      const crownBaseGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.1, 16, 1, true);
      const crown = new THREE.Mesh(crownBaseGeo, accentMaterial);
      hatGroup.add(crown);

      for (let i = 0; i < 5; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.04, 0.14, 4);
        const spike = new THREE.Mesh(spikeGeo, accentMaterial);
        const angle = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.27, 0.1, Math.sin(angle) * 0.27);
        hatGroup.add(spike);
      }
    }
  }

  rebuildHat(config.hat || 'scholar');

  // 8. Handheld Accessories (Attached to Right Arm)
  const accessoryGroup = new THREE.Group();
  accessoryGroup.position.set(0, -0.4, 0.15);
  rightArmPivot.add(accessoryGroup);

  function rebuildAccessory(accType: string) {
    while (accessoryGroup.children.length > 0) {
      accessoryGroup.remove(accessoryGroup.children[0]);
    }

    if (accType === 'torch') {
      // Explorer Flame Torch
      const stickGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.65, 8);
      const stickMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.rotation.x = Math.PI / 4;
      accessoryGroup.add(stick);

      const flameGeo = new THREE.OctahedronGeometry(0.12, 0);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(0, 0.3, 0.25);
      accessoryGroup.add(flame);

      const flameLight = new THREE.PointLight(0xf59e0b, 1.2, 4);
      flameLight.position.set(0, 0.3, 0.25);
      accessoryGroup.add(flameLight);
    } else if (accType === 'staff') {
      // Magic Staff with Floating Crystal
      const shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8);
      const shaftMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.6 });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.y = 0.2;
      accessoryGroup.add(shaft);

      const gemGeo = new THREE.OctahedronGeometry(0.14, 0);
      const gemMat = new THREE.MeshStandardMaterial({
        color: '#a855f7',
        roughness: 0.1,
        metalness: 0.8,
        emissive: '#9333ea',
        emissiveIntensity: 0.8
      });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(0, 0.8, 0);
      accessoryGroup.add(gem);
    } else if (accType === 'compass') {
      // Golden Dial Compass
      const compGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16);
      const comp = new THREE.Mesh(compGeo, accentMaterial);
      comp.rotation.x = Math.PI / 3;
      accessoryGroup.add(comp);
    } else if (accType === 'scroll') {
      // Ancient Knowledge Papyrus
      const scrGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
      const scrMat = new THREE.MeshStandardMaterial({ color: '#fef08a', roughness: 0.9 });
      const scr = new THREE.Mesh(scrGeo, scrMat);
      scr.rotation.z = Math.PI / 4;
      accessoryGroup.add(scr);
    }
  }

  rebuildAccessory(config.accessory || 'torch');

  // 9. Floating Mystical Companion Orb / Pet
  const orbGeo = new THREE.SphereGeometry(0.14, 12, 10);
  const orbMat = new THREE.MeshStandardMaterial({
    color: role === 'guru' ? '#f59e0b' : '#38bdf8',
    roughness: 0.1,
    metalness: 0.9,
    emissive: role === 'guru' ? '#d97706' : '#0284c7',
    emissiveIntensity: 0.7
  });
  const companionOrb = new THREE.Mesh(orbGeo, orbMat);
  companionOrb.position.set(0.7, 1.7, -0.2);
  group.add(companionOrb);

  // Mini light on companion orb
  const orbLight = new THREE.PointLight(role === 'guru' ? 0xf59e0b : 0x38bdf8, 0.8, 3.5);
  companionOrb.add(orbLight);

  // 10. Billboard Name & Live Chat Bubble
  let currentBillboardTexture = createBillboardTexture(name, role, config.color || '#3b82f6');
  const spriteMat = new THREE.SpriteMaterial({
    map: currentBillboardTexture,
    transparent: true,
    depthTest: false,
  });
  const billboard = new THREE.Sprite(spriteMat);
  billboard.position.set(0, 2.45, 0);
  billboard.scale.set(2.2, 1.1, 1);
  group.add(billboard);

  let animTime = Math.random() * 10;

  // Animation Update Function
  function updateAnimation(dt: number, isMoving: boolean) {
    animTime += dt;

    // Floating companion orb subtle bobbing & orbiting
    companionOrb.position.y = 1.7 + Math.sin(animTime * 3) * 0.12;
    companionOrb.position.x = 0.65 + Math.cos(animTime * 2) * 0.15;

    if (isMoving) {
      // Walking gait: swing legs & arms opposite
      const walkSpeed = 11;
      const legAngle = Math.sin(animTime * walkSpeed) * 0.55;
      leftLegPivot.rotation.x = legAngle;
      rightLegPivot.rotation.x = -legAngle;

      leftArmPivot.rotation.x = -legAngle * 0.7;
      rightArmPivot.rotation.x = legAngle * 0.7;

      // Subtle torso bounce
      torso.position.y = 0.95 + Math.abs(Math.sin(animTime * walkSpeed)) * 0.06;
      head.position.y = 1.62 + Math.abs(Math.sin(animTime * walkSpeed)) * 0.06;
    } else {
      // Idle breathing: smooth decay towards neutral
      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, 0, 10, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, 0, 10, dt);
      leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, 0, 10, dt);
      rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, 0, 10, dt);

      // Idle breathing expansion
      const breathe = Math.sin(animTime * 2.2) * 0.02;
      torso.position.y = 0.95 + breathe;
      head.position.y = 1.62 + breathe * 1.5;
    }
  }

  function updateConfig(newConfig: AvatarConfig) {
    if (newConfig.color) {
      bodyMaterial.color.set(newConfig.color);
    }
    if (newConfig.hat) {
      rebuildHat(newConfig.hat);
    }
    if (newConfig.accessory) {
      rebuildAccessory(newConfig.accessory);
    }
    // Update billboard
    currentBillboardTexture.dispose();
    currentBillboardTexture = createBillboardTexture(name, role, newConfig.color);
    billboard.material.map = currentBillboardTexture;
    billboard.material.needsUpdate = true;
  }

  let chatBubbleTimer: any = null;
  function updateChatBubble(text?: string) {
    if (chatBubbleTimer) clearTimeout(chatBubbleTimer);
    
    currentBillboardTexture.dispose();
    currentBillboardTexture = createBillboardTexture(name, role, config.color || '#3b82f6', text);
    billboard.material.map = currentBillboardTexture;
    billboard.material.needsUpdate = true;

    if (text) {
      // Automatically hide bubble after 6 seconds
      chatBubbleTimer = setTimeout(() => {
        updateChatBubble(undefined);
      }, 6000);
    }
  }

  function dispose() {
    if (chatBubbleTimer) clearTimeout(chatBubbleTimer);
    currentBillboardTexture.dispose();
    shadowMat.dispose();
    bodyMaterial.dispose();
    skinMaterial.dispose();
    darkMaterial.dispose();
    accentMaterial.dispose();
    eyeMaterial.dispose();
    orbMat.dispose();
    spriteMat.dispose();
  }

  return {
    group,
    parts: {
      head,
      torso,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      hatGroup,
      accessoryGroup,
      companionOrb,
      billboard
    },
    config,
    name,
    role,
    animTime,
    updateAnimation,
    updateConfig,
    updateChatBubble,
    dispose
  };
}
