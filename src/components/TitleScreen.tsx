import React, { useState } from 'react';
import { sound } from '../audio/soundEffects.ts';
import {
  Sparkles,
  Users,
  Compass,
  ArrowRight,
  Shield,
  BookOpen,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';

interface TitleScreenProps {
  onStartStudent: () => void;
  onStartGuru: () => void;
  onQuickDemo: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartStudent,
  onStartGuru,
  onQuickDemo,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-6 md:p-10 bg-slate-950 overflow-hidden select-none">
      
      {/* Mystical Atmospheric Background with Radial Gradient & Star field */}
      <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Sound toggle and mode badge */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Game Pembelajaran Kooperatif 3D</span>
        </div>

        <button
          onClick={handleToggleSound}
          className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Nyalakan/Matikan Audio"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup over negative space */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto max-w-3xl">
        {/* Bespoke SVG Emblem & Title Lockup */}
        <div className="mb-4">
          <svg className="w-20 h-20 mx-auto text-cyan-400 drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]" viewBox="0 0 100 100" fill="none">
            <polygon points="50,6 94,84 6,84" stroke="currentColor" strokeWidth="4" fill="rgba(6,182,212,0.1)" />
            <circle cx="50" cy="54" r="18" stroke="#f59e0b" strokeWidth="3" fill="none" />
            <polygon points="50,42 60,62 40,62" fill="#38bdf8" />
            <circle cx="50" cy="54" r="4" fill="#ffffff" />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-amber-300 font-serif tracking-widest uppercase mb-3 drop-shadow-md">
          Aethelgard
        </h1>

        <div className="text-xs sm:text-sm md:text-base font-bold text-cyan-300 tracking-[0.25em] uppercase mb-4">
          Misteri Kuil Pengetahuan Kuno
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed mb-8">
          Jelajahi dunia terbuka 3D bersama rekan sekelasmu. Pecahkan 6 altar teka-teki kooperatif yang disiapkan oleh Guru, berkoordinasi via chat real-time, dan temukan rahasia Segel Abadi!
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3.5 w-full max-w-md">
          <button
            onClick={() => {
              sound.playClick();
              onStartStudent();
            }}
            className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Compass className="w-4 h-4 text-cyan-200" />
            <span>Masuk Sebagai Siswa</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onStartGuru();
            }}
            className="py-3.5 px-6 rounded-xl bg-slate-900 border border-amber-500/50 hover:bg-slate-800 text-amber-300 hover:text-amber-200 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Portal & Analitik Guru</span>
          </button>
        </div>

        {/* Quick Demo Access */}
        <button
          onClick={() => {
            sound.playSuccess();
            onQuickDemo();
          }}
          className="mt-4 text-xs text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3 h-3 text-cyan-400" />
          <span>Coba Langsung (Ruang Demo Ekspedisi 7A) &rarr;</span>
        </button>
      </div>

      {/* Bottom Footer: Flat Single Control Hint Line */}
      <div className="relative z-10 w-full text-center text-[11px] text-slate-300 tracking-wider font-mono">
        WASD / Joystick Bergerak &bull; E Periksa Teka-teki &bull; Enter Chat Tim &bull; H Sembunyikan HUD
      </div>
    </div>
  );
};
