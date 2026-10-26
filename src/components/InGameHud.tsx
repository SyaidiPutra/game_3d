import React, { useState, useEffect } from 'react';
import { sound } from '../audio/soundEffects.ts';
import {
  Volume2,
  VolumeX,
  MessageSquare,
  Compass,
  MapPin,
  ChevronDown,
  ChevronUp,
  Sparkles,
  LogOut,
  HelpCircle,
  Users,
  Shield
} from 'lucide-react';

interface InGameHudProps {
  roomCode: string;
  roomName: string;
  playerName: string;
  playerRole: 'student' | 'guru';
  playerColor: string;
  playerScore: number;
  solvedStations: number[];
  onlineCount: number;
  nearestStationId: number | null;
  onOpenStation: (stationId: number) => void;
  onToggleChat: () => void;
  onExit: () => void;
  latestAnnouncement?: string;
}

const STATION_NAMES: Record<number, string> = {
  1: 'Altar Fajar Terbit',
  2: 'Monolit Logika Arkana',
  3: 'Arsip Batu Purba',
  4: 'Gerbang Kristal Elemen',
  5: 'Taman Pengamat Bintang',
  6: 'Pusat Segel Kuil Abadi',
};

export const InGameHud: React.FC<InGameHudProps> = ({
  roomCode,
  roomName,
  playerName,
  playerRole,
  playerColor,
  playerScore,
  solvedStations,
  onlineCount,
  nearestStationId,
  onOpenStation,
  onToggleChat,
  onExit,
  latestAnnouncement,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);

  // Keyboard shortcut 'H' to toggle dock collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setIsDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const solvedCount = solvedStations.length;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
      
      {/* Top-Left Cluster: Room & Mystery Quest Status */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
        <div className="px-3.5 py-2 rounded-xl bg-slate-950/85 border border-slate-700/80 shadow-lg flex items-center gap-3">
          <div
            style={{ backgroundColor: playerColor || '#38bdf8' }}
            className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
          />
          <div>
            <div className="flex items-center gap-1.5">
              {playerRole === 'guru' && <Shield className="w-3.5 h-3.5 text-amber-400" />}
              <span className="text-xs font-bold text-white tracking-wide">{playerName}</span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                ({playerScore} Pts)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider">
              KODE: <span className="text-amber-400 font-bold">{roomCode}</span>
            </div>
          </div>
        </div>

        {/* Station Progress Meter */}
        <div className="px-3.5 py-2 rounded-xl bg-slate-950/85 border border-slate-700/80 shadow-lg flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Kuil Kebijaksanaan:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-cyan-300 text-xs tabular-nums">
                {solvedCount} / 6 STASIUN
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <span
                    key={num}
                    className={`w-3.5 h-3.5 rounded text-[8px] font-bold flex items-center justify-center ${
                      solvedStations.includes(num)
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top-Right Cluster: Online Count, Sound, Exit */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        <div className="px-3 py-1.5 rounded-xl bg-slate-950/85 border border-slate-700/80 shadow-lg flex items-center gap-2 text-xs text-slate-300">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono font-bold tabular-nums text-emerald-400">{onlineCount}</span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">Online</span>
        </div>

        <button
          onClick={handleToggleSound}
          className="p-2 rounded-xl bg-slate-950/85 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg transition-colors cursor-pointer"
          title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        <button
          onClick={onExit}
          className="p-2 rounded-xl bg-slate-950/85 border border-slate-700/80 text-slate-300 hover:text-rose-400 hover:bg-slate-800 shadow-lg transition-colors cursor-pointer"
          title="Keluar ke Menu"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Latest Announcement Floating Banner */}
      {latestAnnouncement && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto max-w-lg w-[90%] px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs shadow-xl text-center font-semibold animate-in fade-in slide-in-from-top-2 duration-300">
          📢 {latestAnnouncement}
        </div>
      )}

      {/* Center Screen: Interactive Proximity Prompt */}
      {nearestStationId !== null && (
        <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => onOpenStation(nearestStationId)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-black text-sm shadow-2xl shadow-cyan-500/40 border border-cyan-400/80 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="w-6 h-6 rounded-lg bg-white/20 text-white font-mono text-xs flex items-center justify-center font-bold">
              E
            </span>
            <span>Buka Teka-teki {STATION_NAMES[nearestStationId] || `Stasiun #${nearestStationId}`}</span>
          </button>
          <span className="text-[11px] text-cyan-200/80 drop-shadow">
            Tekan [E] pada keyboard atau ketuk tombol di atas
          </span>
        </div>
      )}

      {/* Map Radar Modal if opened */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 pointer-events-auto">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Peta Altar & Kuil Aethelgard</span>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[1, 2, 3, 4, 5, 6].map((id) => (
                <div
                  key={id}
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                    solvedStations.includes(id)
                      ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200'
                      : 'border-slate-800 bg-slate-950/70 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Stasiun #{id}</span>
                    <span className="text-[10px]">
                      {solvedStations.includes(id) ? 'Terpecahkan' : 'Terkunci'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{STATION_NAMES[id]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unified Bottom Control Dock (Strictly adhering to Three.js skill) */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: `translateX(-50%) translateY(${isDockCollapsed ? 'calc(100% - 28px)' : '0'})`,
          maxWidth: 'min(940px, 94vw)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="pointer-events-auto flex flex-col items-center"
      >
        {/* Dock Collapse / Expand Toggle Tab */}
        <button
          onClick={() => {
            sound.playClick();
            setIsDockCollapsed(!isDockCollapsed);
          }}
          className="px-4 py-1 rounded-t-xl bg-slate-900 border-t border-x border-slate-700 text-slate-400 hover:text-white text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-md transition-colors cursor-pointer"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Tampilkan Kontrol [H]</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Sembunyikan HUD [H]</span>
            </>
          )}
        </button>

        {/* Dock Bar Panel */}
        <div className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Controls Hints */}
          <div className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px]">WASD</span>
            <span>Bergerak</span>
            <span className="text-slate-600">&bull;</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px]">E</span>
            <span>Periksa Altar</span>
            <span className="text-slate-600">&bull;</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px]">H</span>
            <span>Zen Mode</span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                sound.playClick();
                setShowMapModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Peta Stasiun</span>
            </button>

            <button
              onClick={onToggleChat}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Obrolan Tim</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
