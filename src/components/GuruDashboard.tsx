import React, { useState, useEffect } from 'react';
import { GameRoom, Question, StudentProgress } from '../types/game.ts';
import { sound } from '../audio/soundEffects.ts';
import {
  Users,
  Upload,
  BarChart3,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Edit3,
  Save,
  Plus
} from 'lucide-react';

interface GuruDashboardProps {
  roomCode: string;
  guruPasscode: string;
  onEnterWorldAsGuru: () => void;
  onBackToMenu: () => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({
  roomCode,
  guruPasscode,
  onEnterWorldAsGuru,
  onBackToMenu,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'questions' | 'livefeed'>('analytics');
  const [roomData, setRoomData] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Announcement state
  const [announcementText, setAnnouncementText] = useState<string>('');
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState<boolean>(false);

  // Question editing / upload state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState<string>('');
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch full room data with guru credentials
  const fetchRoom = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/guru-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: guruPasscode }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal memuat data ruangan.');
      }
      const data = await res.json();
      setRoomData(data.room);
      setQuestions(data.room.questions || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
    // Poll every 3 seconds for live student progress updates
    const interval = setInterval(fetchRoom, 3000);
    return () => clearInterval(interval);
  }, [roomCode, guruPasscode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    sound.playClick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Broadcast announcement to students
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim() || isSendingAnnouncement) return;

    setIsSendingAnnouncement(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: guruPasscode, text: announcementText.trim() }),
      });
      if (res.ok) {
        sound.playSuccess();
        setAnnouncementText('');
        fetchRoom();
      }
    } catch {
      alert('Gagal mengirim pengumuman.');
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  // Reset room progress
  const handleResetProgress = async () => {
    if (!window.confirm('Apakah Anda yakin ingin meriset progres stasiun dan nilai siswa di ruangan ini?')) {
      return;
    }
    try {
      const res = await fetch(`/api/rooms/${roomCode}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: guruPasscode }),
      });
      if (res.ok) {
        sound.playInteract();
        fetchRoom();
      }
    } catch {
      alert('Gagal meriset ruangan.');
    }
  };

  // Handle JSON file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        let parsedQuestions: Question[] = [];

        if (file.name.endsWith('.json')) {
          parsedQuestions = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          parsedQuestions = parseCSVQuestions(content);
        } else {
          throw new Error('Format file harus berupa .json atau .csv');
        }

        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
          throw new Error('Data soal kosong atau format tidak sesuai.');
        }

        // Save to server
        const res = await fetch(`/api/rooms/${roomCode}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode: guruPasscode, questions: parsedQuestions }),
        });

        if (res.ok) {
          sound.playSuccess();
          setQuestions(parsedQuestions);
          setUploadMessage({ text: `Berhasil mengunggah ${parsedQuestions.length} soal!`, type: 'success' });
          fetchRoom();
        } else {
          const err = await res.json();
          throw new Error(err.error || 'Gagal menyimpan soal');
        }
      } catch (err: any) {
        sound.playError();
        setUploadMessage({ text: err.message || 'Gagal memproses file.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  // Import from Google Sheets CSV link
  const handleImportGoogleSheets = async () => {
    if (!sheetsUrl.trim()) return;

    try {
      setUploadMessage({ text: 'Mengambil data dari Google Sheets...', type: 'success' });
      let fetchUrl = sheetsUrl.trim();

      // If user pasted normal Google Sheet link, convert to CSV export URL
      if (fetchUrl.includes('/spreadsheets/d/')) {
        const sheetIdMatch = fetchUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetIdMatch && sheetIdMatch[1]) {
          fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv`;
        }
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error('Tidak dapat mengunduh data sheet. Pastikan sheet disetel "Siapa saja yang memiliki link dapat melihat".');
      
      const csvText = await res.text();
      const parsedQuestions = parseCSVQuestions(csvText);

      if (!parsedQuestions.length) throw new Error('Tidak ada baris soal valid yang ditemukan di Google Sheet.');

      // Save to server
      const saveRes = await fetch(`/api/rooms/${roomCode}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: guruPasscode, questions: parsedQuestions }),
      });

      if (saveRes.ok) {
        sound.playSuccess();
        setQuestions(parsedQuestions);
        setUploadMessage({ text: `Berhasil mengimpor ${parsedQuestions.length} soal dari Google Sheets!`, type: 'success' });
        fetchRoom();
      }
    } catch (err: any) {
      sound.playError();
      setUploadMessage({ text: err.message || 'Gagal mengimpor Google Sheets.', type: 'error' });
    }
  };

  // Helper: parse CSV into questions array
  const parseCSVQuestions = (csv: string): Question[] => {
    const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    const parsed: Question[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 6) continue;

      const stationId = Number(parts[0]) || (i);
      const title = parts[1] || `Teka-teki Stasiun ${stationId}`;
      const questionText = parts[2] || 'Soal';
      const optA = parts[3] || '';
      const optB = parts[4] || '';
      const optC = parts[5] || '';
      const optD = parts[6] || '';
      const correctAnswer = parts[7] || optA;
      const hint = parts[8] || '';
      const explanation = parts[9] || '';
      const points = Number(parts[10]) || 100;

      parsed.push({
        id: `q-${stationId}`,
        stationId,
        stationName: `Stasiun #${stationId}`,
        title,
        riddle: `Simbol kuno terukir di atas altar stasiun ${stationId}...`,
        question: questionText,
        type: 'mcq',
        options: [optA, optB, optC, optD].filter(o => o.length > 0),
        correctAnswer,
        hint,
        explanation,
        points,
      });
    }
    return parsed;
  };

  // Download template JSON
  const handleDownloadTemplateJSON = () => {
    const template = questions.length > 0 ? questions : [
      {
        id: 'q-1',
        stationId: 1,
        stationName: 'Altar Fajar Terbit',
        title: 'Judul Teka-teki',
        riddle: 'Latar cerita kuno...',
        question: 'Tuliskan pertanyaan di sini?',
        type: 'mcq',
        options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
        correctAnswer: 'Pilihan A',
        hint: 'Petunjuk tambahan guru',
        explanation: 'Penjelasan mengapa jawaban benar',
        points: 100,
      }
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Template_Soal_Aethelgard_${roomCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Student Grade Report to CSV
  const handleExportCSVReport = () => {
    if (!roomData || !roomData.students) return;

    let csvContent = 'ID Siswa,Nama Siswa,Status,Total Skor,Jumlah Stasiun Selesai,Daftar Stasiun Selesai\n';
    Object.values(roomData.students).forEach((s: any) => {
      const student = s as StudentProgress;
      csvContent += `"${student.studentId}","${student.name}","${student.online ? 'Online' : 'Offline'}",${student.score},${student.solvedCount},"${(student.solvedStations || []).join(';')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Nilai_Siswa_${roomCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Menghubungkan ke Portal Pemantauan Guru...</p>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <XCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Akses Terputus</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-md">{error}</p>
        <button
          onClick={onBackToMenu}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          Kembali ke Menu Utama
        </button>
      </div>
    );
  }

  const studentsList: StudentProgress[] = Object.values(roomData.students || {});
  const onlineCount = studentsList.filter(s => s.online).length;
  const solvedStationsCount = roomData.solvedStations?.length || 0;

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToMenu}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Kembali ke Menu"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                PORTAL GURU
              </span>
              <h1 className="text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                {roomData.name}
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">{roomData.subject}</p>
          </div>
        </div>

        {/* Room Code Badge & Action CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Kode Siswa:
            </span>
            <span className="font-mono font-bold text-amber-400 text-sm">{roomCode}</span>
            <button
              onClick={handleCopyCode}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Salin Kode Ruangan"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={onEnterWorldAsGuru}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Masuk Dunia 3D (Pemandu)</span>
          </button>
        </div>
      </header>

      {/* Secondary Sub-Nav Tabs */}
      <div className="px-6 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard Pemantauan Siswa</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'questions'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Manajemen Soal ({questions.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 py-2">
          <button
            onClick={handleResetProgress}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Progres</span>
          </button>

          <button
            onClick={handleExportCSVReport}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Unduh Nilai (CSV)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'analytics' && (
          <div className="flex flex-col gap-6 max-w-6xl mx-auto">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{studentsList.length}</div>
                  <div className="text-xs text-slate-400">Total Siswa Terdaftar</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">{onlineCount} Aktif Saat Ini</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{solvedStationsCount} / 6</div>
                  <div className="text-xs text-slate-400">Stasiun Kuil Terpecahkan</div>
                  <div className="text-[10px] text-cyan-400 font-semibold">
                    {roomData.mysterySolved ? '✨ Misteri Kuil Selesai!' : 'Kooperatif Berjalan'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{roomData.timeLimitMinutes} Menit</div>
                  <div className="text-xs text-slate-400">Batas Waktu Ekspedisi</div>
                  <div className="text-[10px] text-slate-400">Status: {roomData.status}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {studentsList.reduce((acc, s) => acc + s.score, 0)}
                  </div>
                  <div className="text-xs text-slate-400">Total Skor Kolektif</div>
                  <div className="text-[10px] text-purple-400 font-semibold">Akumulasi Seluruh Kelas</div>
                </div>
              </div>
            </div>

            {/* Mass Announcement / Game Master Directive to 3D World */}
            <form
              onSubmit={handleSendAnnouncement}
              className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex flex-col sm:flex-row gap-3 items-center"
            >
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  Kirim Petunjuk Massal / Pengumuman Langsung ke Layar Siswa:
                </label>
                <input
                  type="text"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Contoh: Perhatikan petunjuk pada rasi bintang di Altar Selatan!"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={!announcementText.trim() || isSendingAnnouncement}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer sm:self-end"
              >
                <Send className="w-4 h-4" />
                <span>Kirim ke 3D</span>
              </button>
            </form>

            {/* Student Real-time Progress Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Tabel Pemantauan Siswa Real-Time</h3>
                  <p className="text-xs text-slate-400">Progres pengerjaan soal dan koordinasi di dalam kuil 3D</p>
                </div>
                <span className="text-xs font-semibold text-cyan-400">
                  {studentsList.length} Siswa Terdaftar
                </span>
              </div>

              {studentsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Belum ada siswa yang masuk ke ruangan. Berikan kode <strong className="text-amber-400">{roomCode}</strong> kepada siswa untuk bergabung!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Skor</th>
                        <th className="py-3 px-4">Stasiun Selesai</th>
                        <th className="py-3 px-4">Rincian Jawaban Soal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {studentsList.map((st) => (
                        <tr key={st.studentId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                style={{ backgroundColor: st.avatar?.color || '#3b82f6' }}
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                              />
                              <span className="font-bold text-white">{st.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                st.online
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {st.online ? 'Online di 3D' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {st.score} Pts
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5, 6].map((stNum) => {
                                const isDone = st.solvedStations?.includes(stNum);
                                return (
                                  <span
                                    key={stNum}
                                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                                      isDone
                                        ? 'bg-emerald-500 text-slate-950 font-black'
                                        : 'bg-slate-800 text-slate-500'
                                    }`}
                                    title={`Stasiun #${stNum}: ${isDone ? 'Selesai' : 'Belum'}`}
                                  >
                                    {stNum}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(st.answers || {}).map(([qId, ans]) => (
                                <span
                                  key={qId}
                                  className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                                    ans.isCorrect
                                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700'
                                      : 'bg-rose-950/70 text-rose-300 border border-rose-700'
                                  }`}
                                  title={`Jawaban: ${ans.answer} (${ans.timeTakenSeconds}s)`}
                                >
                                  {ans.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  <span>{qId}</span>
                                </span>
                              ))}
                              {Object.keys(st.answers || {}).length === 0 && (
                                <span className="text-slate-500 text-[11px]">Belum menjawab soal</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="flex flex-col gap-6 max-w-5xl mx-auto">
            {/* Upload & Import Options Section */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Unggah File Soal & Integrasi Google Sheets
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Guru dapat mengunggah file soal mandiri dalam format <strong>JSON</strong> atau <strong>CSV</strong>, atau menempelkan tautan tabel <strong>Google Sheets</strong> publik. Soal akan otomatis dipetakan ke 6 Stasiun Altar Kuil 3D.
              </p>

              {uploadMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    uploadMessage.type === 'success'
                      ? 'bg-emerald-950/70 border border-emerald-500 text-emerald-300'
                      : 'bg-rose-950/70 border border-rose-500 text-rose-300'
                  }`}
                >
                  {uploadMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{uploadMessage.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Method 1: Upload File */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Unggah File (.JSON / .CSV)
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Pilih file soal dari komputer Anda untuk langsung diterapkan ke game.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs text-center cursor-pointer transition-colors">
                      Pilih File Soal...
                      <input
                        type="file"
                        accept=".json,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleDownloadTemplateJSON}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Unduh Template Soal JSON"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Method 2: Google Sheets Import */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Impor dari Google Sheets
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Tempel URL Google Sheets publik (atau link Published CSV).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={sheetsUrl}
                      onChange={(e) => setSheetsUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleImportGoogleSheets}
                      className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      Impor
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Active Questions in 6 Stations */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white">Daftar Soal Aktif di 6 Stasiun Kuil</h3>
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2.5 shadow"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center">
                        #{q.stationId}
                      </span>
                      <span className="font-bold text-white text-xs">{q.stationName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({q.title})</span>
                    </div>
                    <span className="text-xs font-bold text-amber-400">+{q.points} Pts</span>
                  </div>

                  <div className="text-xs text-slate-200 font-medium">
                    {q.question}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {q.options?.map((opt, oIdx) => {
                      const isCorrect = opt.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
                      return (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-lg border flex items-center justify-between ${
                            isCorrect
                              ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400'
                          }`}
                        >
                          <span>{opt}</span>
                          {isCorrect && (
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                              (Jawaban Benar)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.hint && (
                    <div className="text-[11px] text-amber-300/80 bg-amber-950/30 p-2 rounded-lg border border-amber-900/50">
                      💡 Petunjuk: {q.hint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
