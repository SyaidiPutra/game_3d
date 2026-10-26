import * as THREE from 'three';

/**
 * Creates procedural textures via HTML5 2D Canvas.
 * No external PNG/JPG downloads. 100% zero-404 guaranteed.
 */

// 1. Procedural Ancient Stone & Cobble Pathway Texture
export function createCobbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base stone slate color
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  // Draw procedural stone pavers with varied tones
  const tileSize = 64;
  for (let y = 0; y < 512; y += tileSize) {
    const offsetX = (y / tileSize) % 2 === 0 ? 0 : tileSize / 2;
    for (let x = -tileSize; x < 512 + tileSize; x += tileSize) {
      const stoneX = x + offsetX;
      const lightness = 25 + Math.floor(Math.random() * 20);
      const greenTint = Math.random() > 0.6 ? 5 : 0; // slight moss tint
      ctx.fillStyle = `rgb(${lightness}, ${lightness + greenTint}, ${lightness + 8})`;
      
      ctx.beginPath();
      ctx.roundRect(stoneX + 4, y + 4, tileSize - 8, tileSize - 8, 6);
      ctx.fill();

      // Stone edge highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner subtle specks
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(
          stoneX + 8 + Math.random() * (tileSize - 20),
          y + 8 + Math.random() * (tileSize - 20),
          3,
          3
        );
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 2. Procedural Glowing Runic Ring Texture for Shrines
export function createRuneRingTexture(colorHex: string = '#38bdf8'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const center = 256;
  ctx.clearRect(0, 0, 512, 512);

  // Concentric magical circles
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center, center, 220, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(center, center, 180, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center, center, 140, 0, Math.PI * 2);
  ctx.stroke();

  // Draw 12 mystical runic symbols around the circle
  const runes = ['᚛', 'ᛝ', 'ᛟ', 'ᚫ', 'ᛏ', 'ᚨ', 'ᛊ', 'ᛚ', 'ᛗ', 'ᚹ', 'ᚲ', 'ᚷ'];
  ctx.font = 'bold 32px serif';
  ctx.fillStyle = colorHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const rx = center + Math.cos(angle) * 200;
    const ry = center + Math.sin(angle) * 200;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(runes[i % runes.length], 0, 0);
    ctx.restore();
  }

  // Radial geometric sacred lines
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * 140, center + Math.sin(angle) * 140);
    ctx.lineTo(center + Math.cos(angle) * 180, center + Math.sin(angle) * 180);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3. Procedural Ancient Marble & Monolith Carving Texture
export function createAncientPillarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Sandstone / marble base
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 512);

  // Vertical fluting & carving lines
  ctx.lineWidth = 4;
  for (let x = 16; x < 256; x += 32) {
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(x + 4, 0);
    ctx.lineTo(x + 4, 512);
    ctx.stroke();
  }

  // Ancient horizontal banding & crack lines
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 120); ctx.lineTo(256, 125);
  ctx.moveTo(0, 260); ctx.lineTo(256, 258);
  ctx.moveTo(0, 390); ctx.lineTo(256, 395);
  ctx.stroke();

  // Subtle ivy green lichen patches
  ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
  for (let i = 0; i < 15; i++) {
    const px = Math.random() * 256;
    const py = 200 + Math.random() * 300;
    const pr = 10 + Math.random() * 25;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 4. Soft Radial Contact Shadow Texture
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 5. Billboard Name & Speech Bubble Canvas Texture
export function createBillboardTexture(name: string, role: string, colorHex: string, chatBubble?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 256);

  // If there's an active speech bubble
  if (chatBubble) {
    const bubbleText = chatBubble.length > 35 ? chatBubble.slice(0, 32) + '...' : chatBubble;
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    const textWidth = Math.min(ctx.measureText(bubbleText).width + 36, 480);
    const bubbleX = 256 - textWidth / 2;
    const bubbleY = 16;
    const bubbleH = 68;

    // Speech bubble background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = colorHex || '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, textWidth, bubbleH, 16);
    ctx.fill();
    ctx.stroke();

    // Small pointer triangle at bottom of speech bubble
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.moveTo(250, bubbleY + bubbleH);
    ctx.lineTo(262, bubbleY + bubbleH);
    ctx.lineTo(256, bubbleY + bubbleH + 12);
    ctx.closePath();
    ctx.fill();

    // Speech bubble text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bubbleText, 256, bubbleY + bubbleH / 2);
  }

  // Name Tag Plaque
  const plaqueY = 120;
  const plaqueW = 320;
  const plaqueH = 64;
  const plaqueX = 256 - plaqueW / 2;

  // Background plaque
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = role === 'guru' ? '#f59e0b' : colorHex || '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(plaqueX, plaqueY, plaqueW, plaqueH, 12);
  ctx.fill();
  ctx.stroke();

  // Role badge / indicator dot
  ctx.fillStyle = role === 'guru' ? '#f59e0b' : colorHex;
  ctx.beginPath();
  ctx.arc(plaqueX + 24, plaqueY + plaqueH / 2, 8, 0, Math.PI * 2);
  ctx.fill();

  // Name Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const displayRole = role === 'guru' ? '[GURU] ' : '';
  const displayName = `${displayRole}${name.slice(0, 16)}`;
  ctx.fillText(displayName, plaqueX + 42, plaqueY + plaqueH / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
