import React, { useState } from 'react';
import { sound } from '../audio/soundEffects.ts';
import { Shield, Key, Plus, LogIn, X, Sparkles, BookOpen } from 'lucide-react';

interface GuruPortalModalProps {
  onSuccess: (roomCode: string, guruPasscode: string) => void;
  onClose: () => void;
}

export const GuruPortalModal: React.FC<GuruPortalModalProps> = ({
  onSuccess,
  onClose,
}) => {
  const [mode, setMode] = useState<'login' | 'create'>('login');

  // Login form
  const [loginCode, setLoginCode] = useState('DEMO-2026');
  const [loginPasscode, setLoginPasscode] = useState('guru123');

  // Create form
  const [createName, setCreateName] = useState('Petualangan Ekspedisi Kelas 8A');
  const [createSubject, setCreateSubject] = useState('Sains & Eksplorasi Logika');
  const [createCode, setCreateCode] = useState(`KOD-${Math.floor(1000 + Math.random() * 9000)}`);
  const [createPasscode, setCreatePasscode] = useState('guru123');
  const [createTimeLimit, setCreateTimeLimit] = useState(45);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const code = loginCode.trim().toUpperCase();
      const res = await fetch(`/api/rooms/${code}/guru-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: loginPasscode.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Akses guru ditolak.');
      }

      sound.playSuccess();
      onSuccess(code, loginPasscode.trim());
    } catch (err: any) {
      sound.playError();
      setErrorMsg(err.message || 'Gagal masuk ke portal guru.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          subject: createSubject.trim(),
          customCode: createCode.trim().toUpperCase(),
          guruPasscode: createPasscode.trim(),
          timeLimitMinutes: createTimeLimit,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal membuat ruangan baru.');
      }

      const data = await res.json();
      sound.playSuccess();
      onSuccess(data.room.code, createPasscode.trim());
    } catch (err: any) {
      sound.playError();
      setErrorMsg(err.message || 'Gagal membuat ruangan baru.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/60 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Portal Akses Guru & Analitik
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Login vs Create */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk Ruangan</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('create')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              mode === 'create' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Ruangan Baru</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Kode Akses Ruangan:
              </label>
              <input
                type="text"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                placeholder="DEMO-2026"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-amber-400 font-mono font-bold tracking-wider uppercase text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Contoh demo: <strong className="text-slate-400">DEMO-2026</strong>
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Kata Sandi Guru (Passcode):</span>
              </label>
              <input
                type="password"
                value={loginPasscode}
                onChange={(e) => setLoginPasscode(e.target.value)}
                placeholder="guru123"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Sandi demo: <strong className="text-slate-400">guru123</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>{isLoading ? 'Memverifikasi...' : 'Buka Dashboard Analitik'}</span>
            </button>
          </form>
        ) : (
          /* Create New Room Form */
          <form onSubmit={handleCreate} className="flex flex-col gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Nama Ruangan / Ekspedisi:
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Contoh: Petualangan Sains 7B"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Mata Pelajaran / Topik:
              </label>
              <input
                type="text"
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                placeholder="Contoh: Sains & Fisika"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Kode Siswa:
                </label>
                <input
                  type="text"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Sandi Guru:
                </label>
                <input
                  type="text"
                  value={createPasscode}
                  onChange={(e) => setCreatePasscode(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Batas Waktu (Menit):
              </label>
              <input
                type="number"
                min={10}
                max={180}
                value={createTimeLimit}
                onChange={(e) => setCreateTimeLimit(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'Membuat Ruangan...' : 'Buat Ruangan & Lanjut ke Dashboard'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
