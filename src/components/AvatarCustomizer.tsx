import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createProceduralAvatar, AvatarInstance } from '../game3d/avatarBuilder.ts';
import { AvatarConfig } from '../types/game.ts';
import { sound } from '../audio/soundEffects.ts';
import { User, Sparkles, Check, ArrowRight, ArrowLeft, Shield, Wand2, Compass } from 'lucide-react';

interface AvatarCustomizerProps {
  initialName?: string;
  initialCode?: string;
  onJoin: (studentName: string, avatar: AvatarConfig, roomCode: string) => void;
  onBack: () => void;
}

const COLOR_OPTIONS = [
  { label: 'Safir Arkana', hex: '#3b82f6', bg: 'bg-blue-500' },
  { label: 'Zamrud Hutan', hex: '#10b981', bg: 'bg-emerald-500' },
  { label: 'Kecubung Mistik', hex: '#8b5cf6', bg: 'bg-purple-500' },
  { label: 'Delima Api', hex: '#ef4444', bg: 'bg-red-500' },
  { label: 'Emas Kuno', hex: '#f59e0b', bg: 'bg-amber-500' },
  { label: 'Obsidian Gelap', hex: '#475569', bg: 'bg-slate-600' },
];

const HAT_OPTIONS = [
  { id: 'scholar', label: 'Topi Sarjana', desc: 'Simbol penuntut ilmu sejati' },
  { id: 'explorer', label: 'Helm Penjelajah', desc: 'Siap menembus belantara kuno' },
  { id: 'wizard', label: 'Topi Penyihir', desc: 'Memusatkan energi arkana' },
  { id: 'visor', label: 'Visor Sibernetik', desc: 'Pemindai frekuensi masa depan' },
  { id: 'crown', label: 'Mahkota Arkana', desc: 'Lambang kehormatan kebijaksanaan' },
];

const ACCESSORY_OPTIONS = [
  { id: 'torch', label: 'Obor Penjelajah', desc: 'Penerang lorong kuil yang gelap' },
  { id: 'staff', label: 'Tongkat Kristal', desc: 'Fokus resonansi batu elemen' },
  { id: 'compass', label: 'Kompas Emas', desc: 'Penunjuk arah selatan sejati' },
  { id: 'scroll', label: 'Gulungan Kuno', desc: 'Memuat catatan teka-teki purba' },
];

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  initialName = '',
  initialCode = 'DEMO-2026',
  onJoin,
  onBack,
}) => {
  const [studentName, setStudentName] = useState(initialName || '');
  const [roomCode, setRoomCode] = useState(initialCode || 'DEMO-2026');
  const [avatar, setAvatar] = useState<AvatarConfig>({
    color: '#3b82f6',
    outfit: 'adventurer',
    hat: 'scholar',
    accessory: 'torch',
  });

  const previewMountRef = useRef<HTMLDivElement>(null);
  const avatarInstRef = useRef<AvatarInstance | null>(null);

  // Initialize 3D Avatar Turntable Preview
  useEffect(() => {
    const container = previewMountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.6, 4.4);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    keyLight.position.set(4, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 1.0);
    scene.add(fillLight);

    // Decorative Pedestal
    const pedGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.2, 24);
    const pedMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.7,
      metalness: 0.3,
    });
    const pedestal = new THREE.Mesh(pedGeo, pedMat);
    pedestal.position.y = -0.1;
    scene.add(pedestal);

    // Create Avatar
    const avatarInst = createProceduralAvatar(studentName || 'Petualang', avatar, 'student');
    avatarInst.group.position.y = 0;
    scene.add(avatarInst.group);
    avatarInstRef.current = avatarInst;

    let animId = 0;
    let clock = 0;

    function renderLoop() {
      clock += 0.016;
      if (avatarInstRef.current) {
        avatarInstRef.current.group.rotation.y = clock * 0.75;
        avatarInstRef.current.updateAnimation(0.016, false);
      }
      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderLoop);
    }
    renderLoop();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (avatarInstRef.current) {
        avatarInstRef.current.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update avatar live on config change
  const handleColorChange = (hex: string) => {
    sound.playClick();
    const updated = { ...avatar, color: hex };
    setAvatar(updated);
    if (avatarInstRef.current) {
      avatarInstRef.current.updateConfig(updated);
    }
  };

  const handleHatChange = (hat: string) => {
    sound.playClick();
    const updated = { ...avatar, hat };
    setAvatar(updated);
    if (avatarInstRef.current) {
      avatarInstRef.current.updateConfig(updated);
    }
  };

  const handleAccessoryChange = (acc: string) => {
    sound.playClick();
    const updated = { ...avatar, accessory: acc };
    setAvatar(updated);
    if (avatarInstRef.current) {
      avatarInstRef.current.updateConfig(updated);
    }
  };

  const handleStartAdventure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert('Silakan masukkan nama siswa atau nomor absen terlebih dahulu!');
      return;
    }
    if (!roomCode.trim()) {
      alert('Silakan masukkan kode ruangan ekspedisi dari Guru!');
      return;
    }
    sound.playSuccess();
    onJoin(studentName.trim(), avatar, roomCode.trim().toUpperCase());
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4 md:p-6 overflow-y-auto">
      {/* Background ambient gradient glow */}
      <div className="absolute inset-0 bg-radial from-cyan-900/20 via-slate-950/80 to-slate-950 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl bg-slate-900/85 border border-slate-700/80 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 backdrop-blur-none">
        
        {/* Left Column: 3D Turntable Avatar View */}
        <div className="w-full md:w-5/12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-6">
          <div className="flex items-center gap-2 mb-2 text-cyan-400 font-semibold text-sm tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Karakter 3D Penjelajah</span>
          </div>

          <div
            ref={previewMountRef}
            className="w-full h-64 md:h-72 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner"
          />

          <p className="text-xs text-slate-400 text-center mt-3">
            Avatar berputar secara dinamis dalam 3D dan akan dilihat oleh teman sekelasmu.
          </p>
        </div>

        {/* Right Column: Customization Controls & Room Access Form */}
        <form onSubmit={handleStartAdventure} className="w-full md:w-7/12 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <User className="w-6 h-6 text-cyan-400" />
              Kustomisasi Petualang
            </h2>
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded bg-slate-800/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </button>
          </div>

          {/* Student Name & Room Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Lengkap / Panggilan Siswa:
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Contoh: Rian Pratama (08)"
                maxLength={24}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm font-medium transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kode Akses Ruangan (dari Guru):
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="DEMO-2026"
                maxLength={16}
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-amber-400 font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-amber-500 text-sm transition-colors"
              />
            </div>
          </div>

          {/* Color Palettes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Warna Jubah Petualang:
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = avatar.color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => handleColorChange(c.hex)}
                    className={`h-9 px-3 rounded-lg border flex items-center gap-2 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-white text-white shadow-md shadow-cyan-500/20 bg-slate-800'
                        : 'border-slate-700/80 text-slate-300 hover:border-slate-500 bg-slate-950/60'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${c.bg} shadow`} />
                    <span>{c.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hat Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Pilihan Topi / Pelindung Kepala:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HAT_OPTIONS.map((h) => {
                const isSelected = avatar.hat === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleHatChange(h.id)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{h.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{h.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accessory Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              Perlengkapan di Tangan:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACCESSORY_OPTIONS.map((a) => {
                const isSelected = avatar.accessory === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleAccessoryChange(a.id)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/40 text-amber-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{a.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{a.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-3 py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
          >
            <span>Masuki Dunia Petualangan Aethelgard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
