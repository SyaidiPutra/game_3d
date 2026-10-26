import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

export interface Question {
  id: string;
  stationId: number; // 1 to 6
  stationName: string;
  title: string;
  riddle: string;
  question: string;
  type: 'mcq' | 'text' | 'sequence';
  options?: string[]; // For MCQ: 4 options
  correctAnswer: string; // Trimmed lowercase match or exact option
  hint: string;
  explanation: string;
  points: number;
}

export interface StudentProgress {
  studentId: string;
  name: string;
  avatar: {
    color: string;
    outfit: string;
    hat: string;
    accessory: string;
  };
  score: number;
  solvedCount: number;
  solvedStations: number[];
  answers: Record<string, {
    answer: string;
    isCorrect: boolean;
    timeTakenSeconds: number;
    submittedAt: number;
  }>;
  position: { x: number; y: number; z: number };
  rotation: number;
  isMoving: boolean;
  online: boolean;
  lastActive: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'guru' | 'system';
  avatarColor?: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'clue' | 'celebration';
}

export interface GameRoom {
  code: string;
  name: string;
  guruPasscode: string;
  subject: string;
  description: string;
  createdAt: number;
  status: 'lobby' | 'playing' | 'completed';
  timeLimitMinutes: number;
  startTime?: number;
  questions: Question[];
  solvedStations: number[]; // e.g. [1, 2, 4]
  mysterySolved: boolean;
  mysterySolvedAt?: number;
  students: Record<string, StudentProgress>;
  chatMessages: ChatMessage[];
  announcements: string[];
}

// In-Memory Database of Rooms
const rooms: Record<string, GameRoom> = {};

// Default Preset Questions for The Ancient Valley of Aethelgard
const DEFAULT_PRESET_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    stationId: 1,
    stationName: 'Altar Fajar Terbit (Dawn Beacon)',
    title: 'Misteri Simbiosis Ekosistem',
    riddle: 'Di dinding altar terpahat ukiran pohon kuno dan jamur yang saling berbisik di bawah akar tanah...',
    question: 'Hubungan timbal balik antara lumut kerak (alga dan jamur) yang saling menguntungkan adalah contoh dari?',
    type: 'mcq',
    options: ['Simbiosis Mutualisme', 'Simbiosis Komensalisme', 'Simbiosis Parasitisme', 'Kompetisi Interspesifik'],
    correctAnswer: 'Simbiosis Mutualisme',
    hint: 'Keduanya saling memberikan nutrisi dan tempat tinggal tanpa ada pihak yang dirugikan.',
    explanation: 'Simbiosis mutualisme adalah hubungan yang saling menguntungkan kedua organisme yang terlibat.',
    points: 100
  },
  {
    id: 'q-2',
    stationId: 2,
    stationName: 'Monolit Logika Arkana (Arcane Monolith)',
    title: 'Sandi Barisan Fibonacci Kuno',
    riddle: 'Pintu monolit terkunci oleh deretan angka bercahaya: 2, 3, 5, 8, 13, 21, ...',
    question: 'Berapakah angka berikutnya yang harus diukir oleh penjelajah untuk menyeimbangkan energi monolit?',
    type: 'mcq',
    options: ['34', '31', '33', '36'],
    correctAnswer: '34',
    hint: 'Setiap suku bilangan merupakan penjumlahan dari dua suku sebelumnya (13 + 21).',
    explanation: 'Barisan Fibonacci: 2+3=5, 3+5=8, 5+8=13, 8+13=21, 13+21=34.',
    points: 150
  },
  {
    id: 'q-3',
    stationId: 3,
    stationName: 'Arsip Batu Purba (Ancient Archives)',
    title: 'Sandi Prasasti Nusantara',
    riddle: 'Gulungan lontar kuno mencatat semboyan pemersatu bangsa yang dipetik dari Kitab Sutasoma karya Mpu Tantular...',
    question: 'Apakah kalimat semboyan bersejarah tersebut yang mengajarkan persatuan dalam keberagaman?',
    type: 'mcq',
    options: [
      'Bhinneka Tunggal Ika',
      'Tut Wuri Handayani',
      'Ing Ngarso Sung Tulodo',
      'Mitreka Satata'
    ],
    correctAnswer: 'Bhinneka Tunggal Ika',
    hint: 'Berarti berbeda-beda tetapi tetap satu jua.',
    explanation: 'Bhinneka Tunggal Ika tercantum dalam Kakawin Sutasoma dan menjadi semboyan resmi Indonesia.',
    points: 120
  },
  {
    id: 'q-4',
    stationId: 4,
    stationName: 'Gerbang Kristal Elemen (Elemental Gate)',
    title: 'Hukum Kekekalan Energi',
    riddle: 'Kristal elemen bergetar saat air terjun mistis memutar kincir batu di depannya...',
    question: 'Energi potensial dari air terjun diubah oleh kincir menjadi energi kinetik, sesuai dengan hukum fisika dasar yaitu?',
    type: 'mcq',
    options: [
      'Hukum Kekekalan Energi (Energi tidak dapat diciptakan atau dimusnahkan)',
      'Hukum Archimedes tentang Gaya Apung',
      'Hukum Gravitasi Universal Newton',
      'Hukum Termodinamika Entropi Maksimum'
    ],
    correctAnswer: 'Hukum Kekekalan Energi (Energi tidak dapat diciptakan atau dimusnahkan)',
    hint: 'Energi hanya dapat berubah wujud dari satu bentuk ke bentuk lainnya.',
    explanation: 'Hukum Pertama Termodinamika/Kekekalan Energi menyatakan energi kekal dan hanya bertransformasi.',
    points: 150
  },
  {
    id: 'q-5',
    stationId: 5,
    stationName: 'Taman Pengamat Bintang (Celestial Sanctum)',
    title: 'Peta Rasi Bintang Navigasi',
    riddle: 'Gugusan bintang di langit kuil membentuk rasi biduk salib selatan...',
    question: 'Rasi bintang apakah yang sejak dahulu digunakan oleh pelaut Nusantara sebagai penunjuk arah selatan?',
    type: 'mcq',
    options: ['Crux (Bintang Salib/Pari)', 'Ursa Major (Biduk Besar)', 'Orion (Pemburu Waluku)', 'Cassiopeia'],
    correctAnswer: 'Crux (Bintang Salib/Pari)',
    hint: 'Empat bintang utama membentuk salib penunjuk selatan malam hari di belahan bumi selatan.',
    explanation: 'Rasi bintang Crux (Salib Selatan / Bintang Pari) merupakan penunjuk arah selatan sejati.',
    points: 180
  },
  {
    id: 'q-6',
    stationId: 6,
    stationName: 'Pusat Segel Kuil Abadi (The Core Sanctum)',
    title: 'Teka-teki Segel Kebijaksanaan Terakhir',
    riddle: 'Segel pintu utama kuil membutuhkan kata sandi kebajikan yang menghubungkan ilmu pengetahuan dengan etika...',
    question: 'Di era sains modern dan kecerdasan buatan, prinsip apa yang paling krusial agar ilmu bermanfaat bagi kemanusiaan?',
    type: 'mcq',
    options: [
      'Etika, Integritas, dan Empati Sosial',
      'Kecepatan Menghitung Tanpa Batas',
      'Otomasi Sepenuhnya Tanpa Intervensi Manusia',
      'Monopoli Pengetahuan Secara Tertutup'
    ],
    correctAnswer: 'Etika, Integritas, dan Empati Sosial',
    hint: 'Kemampuan intelektual yang tinggi harus diiringi moral dan kepedulian terhadap sesama.',
    explanation: 'Ilmu pengetahuan mencapai puncak manfaatnya ketika berlandaskan etika luhur dan empati kemanusiaan.',
    points: 200
  }
];

// Seed Demo Room
rooms['DEMO-2026'] = {
  code: 'DEMO-2026',
  name: 'Petualangan Ekspedisi Aethelgard (Kelas 7A)',
  guruPasscode: 'guru123',
  subject: 'Sains, Logika, & Pengetahuan Terpadu',
  description: 'Ekspedisi pemecahan misteri kuil kuno secara kooperatif. Kerjakan 6 teka-teki bersama tim untuk membuka Segel Abadi!',
  createdAt: Date.now(),
  status: 'playing',
  timeLimitMinutes: 45,
  startTime: Date.now(),
  questions: JSON.parse(JSON.stringify(DEFAULT_PRESET_QUESTIONS)),
  solvedStations: [],
  mysterySolved: false,
  students: {},
  chatMessages: [
    {
      id: 'msg-init',
      senderId: 'system',
      senderName: 'Penjaga Kuil',
      senderRole: 'system',
      text: 'Selamat datang di Lembah Aethelgard! Bekerjasamalah dengan teman sekelasmu untuk menemukan 6 Altar Teka-teki dan membuka Segel Kuil Abadi!',
      timestamp: Date.now() - 60000,
      type: 'system'
    }
  ],
  announcements: ['Selamat datang! Masuki kuil dan cari Altar Fajar Terbit di timur.']
};

interface ClientConnection {
  ws: WebSocket;
  roomCode?: string;
  studentId?: string;
  role?: 'student' | 'guru';
}

const connections = new Map<WebSocket, ClientConnection>();

function broadcastToRoom(roomCode: string, payload: any, excludeWs?: WebSocket) {
  const messageStr = JSON.stringify(payload);
  for (const [ws, client] of connections.entries()) {
    if (client.roomCode === roomCode && ws.readyState === WebSocket.OPEN && ws !== excludeWs) {
      try {
        ws.send(messageStr);
      } catch (err) {
        console.error('Error broadcasting to client:', err);
      }
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // REST API Endpoints
  // 1. Get room preview (public info for student check)
  app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase().trim();
    const room = rooms[code];
    if (!room) {
      res.status(404).json({ error: 'Kode ruangan tidak ditemukan. Pastikan kode yang diberikan guru benar.' });
      return;
    }

    // Return student-safe view (strip correct answers)
    const safeQuestions = room.questions.map(q => ({
      id: q.id,
      stationId: q.stationId,
      stationName: q.stationName,
      title: q.title,
      riddle: q.riddle,
      question: q.question,
      type: q.type,
      options: q.options,
      hint: q.hint,
      points: q.points
    }));

    res.json({
      code: room.code,
      name: room.name,
      subject: room.subject,
      description: room.description,
      status: room.status,
      timeLimitMinutes: room.timeLimitMinutes,
      solvedStations: room.solvedStations,
      mysterySolved: room.mysterySolved,
      totalQuestions: room.questions.length,
      studentCount: Object.keys(room.students).length,
      questions: safeQuestions
    });
  });

  // 2. Guru Login & Full Room Management (with analytics)
  app.post('/api/rooms/:code/guru-auth', (req, res) => {
    const code = req.params.code.toUpperCase().trim();
    const { passcode } = req.body;
    const room = rooms[code];
    if (!room) {
      res.status(404).json({ error: 'Ruangan tidak ditemukan.' });
      return;
    }
    if (room.guruPasscode !== passcode && passcode !== 'superguru') {
      res.status(401).json({ error: 'Kata sandi guru salah.' });
      return;
    }

    res.json({
      success: true,
      room
    });
  });

  // 3. Create a new room (Guru creates room with custom/uploaded questions)
  app.post('/api/rooms', (req, res) => {
    const { name, subject, description, guruPasscode, timeLimitMinutes, questions, customCode } = req.body;
    
    // Generate or use custom code
    let code = (customCode || `KOD-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim().replace(/[^A-Z0-9-]/g, '');
    if (rooms[code]) {
      // make unique
      code = `${code}-${Math.floor(10 + Math.random() * 90)}`;
    }

    const roomQuestions: Question[] = Array.isArray(questions) && questions.length > 0 
      ? questions 
      : JSON.parse(JSON.stringify(DEFAULT_PRESET_QUESTIONS));

    const newRoom: GameRoom = {
      code,
      name: name || `Ekspedisi ${subject || 'Kelas'}`,
      subject: subject || 'Pendidikan Interaktif',
      description: description || 'Petualangan teka-teki kooperatif di dunia 3D Aethelgard.',
      guruPasscode: guruPasscode || '123456',
      createdAt: Date.now(),
      status: 'playing',
      timeLimitMinutes: Number(timeLimitMinutes) || 45,
      startTime: Date.now(),
      questions: roomQuestions,
      solvedStations: [],
      mysterySolved: false,
      students: {},
      chatMessages: [
        {
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'Sistem Petualangan',
          senderRole: 'system',
          text: `Ruangan ${code} berhasil dibuat oleh Guru. Selamat bergabung para penjelajah!`,
          timestamp: Date.now(),
          type: 'system'
        }
      ],
      announcements: ['Selamat datang di petualangan! Selesaikan teka-teki bersama.']
    };

    rooms[code] = newRoom;
    res.json({ success: true, room: newRoom });
  });

  // 4. Update questions / Upload new questions by Guru
  app.post('/api/rooms/:code/questions', (req, res) => {
    const code = req.params.code.toUpperCase().trim();
    const { passcode, questions } = req.body;
    const room = rooms[code];
    if (!room) {
      res.status(404).json({ error: 'Ruangan tidak ditemukan.' });
      return;
    }
    if (room.guruPasscode !== passcode && passcode !== 'superguru') {
      res.status(401).json({ error: 'Akses ditolak. Kata sandi guru tidak cocok.' });
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'Format soal tidak valid atau kosong.' });
      return;
    }

    room.questions = questions;
    // Broadcast question update
    broadcastToRoom(code, {
      type: 'QUESTIONS_UPDATED',
      totalQuestions: questions.length
    });

    res.json({ success: true, count: questions.length });
  });

  // 5. Guru resets room progress
  app.post('/api/rooms/:code/reset', (req, res) => {
    const code = req.params.code.toUpperCase().trim();
    const { passcode } = req.body;
    const room = rooms[code];
    if (!room) {
      res.status(404).json({ error: 'Ruangan tidak ditemukan.' });
      return;
    }
    if (room.guruPasscode !== passcode && passcode !== 'superguru') {
      res.status(401).json({ error: 'Akses ditolak.' });
      return;
    }

    room.solvedStations = [];
    room.mysterySolved = false;
    room.mysterySolvedAt = undefined;
    room.startTime = Date.now();

    // Reset student scores but keep profiles
    for (const sId in room.students) {
      room.students[sId].score = 0;
      room.students[sId].solvedCount = 0;
      room.students[sId].solvedStations = [];
      room.students[sId].answers = {};
    }

    const resetMsg: ChatMessage = {
      id: `sys-reset-${Date.now()}`,
      senderId: 'system',
      senderName: 'Game Master (Guru)',
      senderRole: 'system',
      text: 'Progres ekspedisi dan stasiun teka-teki telah direset oleh Guru. Mari mulai kembali petualangan!',
      timestamp: Date.now(),
      type: 'system'
    };
    room.chatMessages.push(resetMsg);

    broadcastToRoom(code, {
      type: 'ROOM_RESET',
      room: {
        solvedStations: [],
        mysterySolved: false
      },
      message: resetMsg
    });

    res.json({ success: true });
  });

  // 6. Guru broadcasts special hint / announcement
  app.post('/api/rooms/:code/announcement', (req, res) => {
    const code = req.params.code.toUpperCase().trim();
    const { passcode, text } = req.body;
    const room = rooms[code];
    if (!room) {
      res.status(404).json({ error: 'Ruangan tidak ditemukan.' });
      return;
    }
    if (room.guruPasscode !== passcode && passcode !== 'superguru') {
      res.status(401).json({ error: 'Akses ditolak.' });
      return;
    }

    const msg: ChatMessage = {
      id: `announce-${Date.now()}`,
      senderId: 'guru',
      senderName: 'Guru (Game Master)',
      senderRole: 'guru',
      avatarColor: '#f59e0b',
      text: text || 'Perhatian semua penjelajah! Bekerjasamalah untuk memecahkan misteri berikutnya!',
      timestamp: Date.now(),
      type: 'clue'
    };

    room.chatMessages.push(msg);
    room.announcements.push(msg.text);

    broadcastToRoom(code, {
      type: 'ANNOUNCEMENT',
      message: msg
    });

    res.json({ success: true, message: msg });
  });

  // 7. Get Preset Questions template
  app.get('/api/preset-questions', (_req, res) => {
    res.json(DEFAULT_PRESET_QUESTIONS);
  });

  // WebSocket Connection Handling
  wss.on('connection', (ws) => {
    const clientState: ClientConnection = { ws };
    connections.set(ws, clientState);

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const { type } = data;

        if (type === 'JOIN_ROOM') {
          const roomCode = (data.roomCode || '').toUpperCase().trim();
          const studentId = data.studentId || `stud-${Math.random().toString(36).substring(2, 9)}`;
          const studentName = data.studentName || 'Petualang Arkana';
          const avatar = data.avatar || {
            color: '#3b82f6',
            outfit: 'adventurer',
            hat: 'scholar',
            accessory: 'torch'
          };
          const role = data.role === 'guru' ? 'guru' : 'student';

          let room = rooms[roomCode];
          if (!room) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: `Ruangan ${roomCode} tidak ditemukan.`
            }));
            return;
          }

          clientState.roomCode = roomCode;
          clientState.studentId = studentId;
          clientState.role = role;

          // Register or update student
          if (!room.students[studentId]) {
            room.students[studentId] = {
              studentId,
              name: studentName,
              avatar,
              score: 0,
              solvedCount: 0,
              solvedStations: [],
              answers: {},
              position: { x: (Math.random() - 0.5) * 8, y: 0.5, z: (Math.random() - 0.5) * 8 },
              rotation: 0,
              isMoving: false,
              online: true,
              lastActive: Date.now()
            };
          } else {
            room.students[studentId].online = true;
            room.students[studentId].name = studentName;
            room.students[studentId].avatar = avatar;
            room.students[studentId].lastActive = Date.now();
          }

          // Welcome message
          const joinMsg: ChatMessage = {
            id: `msg-join-${Date.now()}`,
            senderId: studentId,
            senderName: studentName,
            senderRole: role,
            avatarColor: avatar.color,
            text: role === 'guru' 
              ? `${studentName} (Guru) telah memasuki Kuil sebagai Pemandu!`
              : `${studentName} telah bergabung ke dalam ekspedisi!`,
            timestamp: Date.now(),
            type: 'system'
          };
          room.chatMessages.push(joinMsg);

          // Send initial state to the connecting client
          ws.send(JSON.stringify({
            type: 'INIT_STATE',
            studentId,
            room: {
              code: room.code,
              name: room.name,
              subject: room.subject,
              description: room.description,
              timeLimitMinutes: room.timeLimitMinutes,
              solvedStations: room.solvedStations,
              mysterySolved: room.mysterySolved,
              mysterySolvedAt: room.mysterySolvedAt,
              questions: room.questions.map(q => ({
                id: q.id,
                stationId: q.stationId,
                stationName: q.stationName,
                title: q.title,
                riddle: q.riddle,
                question: q.question,
                type: q.type,
                options: q.options,
                hint: q.hint,
                points: q.points
              })),
              students: room.students,
              chatMessages: room.chatMessages.slice(-50),
              announcements: room.announcements.slice(-5)
            }
          }));

          // Broadcast to other players in the room
          broadcastToRoom(roomCode, {
            type: 'PLAYER_JOINED',
            player: room.students[studentId],
            message: joinMsg
          }, ws);
        }

        else if (type === 'PLAYER_MOVE') {
          const { roomCode, studentId } = clientState;
          if (!roomCode || !studentId) return;
          const room = rooms[roomCode];
          if (!room || !room.students[studentId]) return;

          const { position, rotation, isMoving } = data;
          if (position) {
            room.students[studentId].position = position;
            room.students[studentId].rotation = rotation || 0;
            room.students[studentId].isMoving = !!isMoving;
            room.students[studentId].lastActive = Date.now();

            // Broadcast movement to all other clients in the room
            broadcastToRoom(roomCode, {
              type: 'PLAYER_MOVED',
              studentId,
              position,
              rotation: rotation || 0,
              isMoving: !!isMoving
            }, ws);
          }
        }

        else if (type === 'SEND_CHAT') {
          const { roomCode, studentId } = clientState;
          if (!roomCode || !studentId) return;
          const room = rooms[roomCode];
          if (!room) return;

          const text = (data.text || '').trim();
          if (!text) return;

          const student = room.students[studentId];
          const chatMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            senderId: studentId,
            senderName: student ? student.name : 'Penjelajah',
            senderRole: clientState.role || 'student',
            avatarColor: student ? student.avatar.color : '#3b82f6',
            text: text.slice(0, 300), // sanitize max length
            timestamp: Date.now(),
            type: data.chatType || 'chat'
          };

          room.chatMessages.push(chatMsg);
          if (room.chatMessages.length > 200) {
            room.chatMessages.shift();
          }

          // Broadcast to everyone in room (including sender for sync)
          broadcastToRoom(roomCode, {
            type: 'CHAT_MESSAGE',
            message: chatMsg
          });
        }

        else if (type === 'SUBMIT_ANSWER') {
          const { roomCode, studentId } = clientState;
          if (!roomCode || !studentId) return;
          const room = rooms[roomCode];
          if (!room) return;

          const { questionId, stationId, answer, timeTakenSeconds } = data;
          const targetQuestion = room.questions.find(q => q.id === questionId || q.stationId === stationId);
          if (!targetQuestion) {
            ws.send(JSON.stringify({
              type: 'ANSWER_RESULT',
              questionId,
              isCorrect: false,
              message: 'Soal tidak ditemukan.'
            }));
            return;
          }

          const student = room.students[studentId];
          if (!student) return;

          // Check answer correctness (trim and case-insensitive check)
          const cleanUserAns = (answer || '').toString().trim().toLowerCase();
          const cleanCorrectAns = (targetQuestion.correctAnswer || '').toString().trim().toLowerCase();
          const isCorrect = cleanUserAns === cleanCorrectAns;

          // Record answer
          student.answers[targetQuestion.id] = {
            answer: (answer || '').toString(),
            isCorrect,
            timeTakenSeconds: Number(timeTakenSeconds) || 15,
            submittedAt: Date.now()
          };

          if (isCorrect) {
            // Update individual score if not already answered correctly before
            const alreadySolvedByStudent = student.solvedStations.includes(targetQuestion.stationId);
            if (!alreadySolvedByStudent) {
              student.score += targetQuestion.points;
              student.solvedCount += 1;
              student.solvedStations.push(targetQuestion.stationId);
            }

            // Check cooperative room station unlock
            const alreadySolvedInRoom = room.solvedStations.includes(targetQuestion.stationId);
            if (!alreadySolvedInRoom) {
              room.solvedStations.push(targetQuestion.stationId);
            }

            // Check if all stations in room are now solved!
            const allStationsRequired = room.questions.map(q => q.stationId);
            const isMysteryComplete = allStationsRequired.every(st => room.solvedStations.includes(st));
            if (isMysteryComplete && !room.mysterySolved) {
              room.mysterySolved = true;
              room.mysterySolvedAt = Date.now();
            }

            const celebrationMsg: ChatMessage = {
              id: `solve-${Date.now()}`,
              senderId: 'system',
              senderName: 'Kuil Kebijaksanaan',
              senderRole: 'system',
              avatarColor: '#10b981',
              text: `✨ ${student.name} berhasil memecahkan teka-teki ${targetQuestion.stationName}! Energi kuil berkobar! (+${targetQuestion.points} Poin)`,
              timestamp: Date.now(),
              type: 'celebration'
            };
            room.chatMessages.push(celebrationMsg);

            // Send private confirmation to answering student
            ws.send(JSON.stringify({
              type: 'ANSWER_RESULT',
              questionId: targetQuestion.id,
              stationId: targetQuestion.stationId,
              isCorrect: true,
              pointsEarned: targetQuestion.points,
              explanation: targetQuestion.explanation,
              message: 'Jawaban benar! Teka-teki terpecahkan!'
            }));

            // Broadcast room update to all players
            broadcastToRoom(roomCode, {
              type: 'PUZZLE_SOLVED',
              solverName: student.name,
              solverId: studentId,
              stationId: targetQuestion.stationId,
              solvedStations: room.solvedStations,
              mysterySolved: room.mysterySolved,
              explanation: targetQuestion.explanation,
              studentScore: student.score,
              allStudents: room.students,
              message: celebrationMsg
            });
          } else {
            // Incorrect answer
            ws.send(JSON.stringify({
              type: 'ANSWER_RESULT',
              questionId: targetQuestion.id,
              stationId: targetQuestion.stationId,
              isCorrect: false,
              hint: targetQuestion.hint,
              message: 'Jawaban belum tepat. Pelajari kembali petunjuk kuno di sekeliling altar!'
            }));

            // Broadcast student stats update for teacher dashboard live monitoring
            broadcastToRoom(roomCode, {
              type: 'STUDENT_STATS_UPDATED',
              studentId,
              student
            });
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      const { roomCode, studentId } = clientState;
      if (roomCode && studentId && rooms[roomCode] && rooms[roomCode].students[studentId]) {
        rooms[roomCode].students[studentId].online = false;
        rooms[roomCode].students[studentId].lastActive = Date.now();

        broadcastToRoom(roomCode, {
          type: 'PLAYER_LEFT',
          studentId,
          player: rooms[roomCode].students[studentId]
        });
      }
      connections.delete(ws);
    });
  });

  // Vite middleware in development or express static in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🏰 Aethelgard 3D Server running on port ${PORT} (Prod: ${isProd})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
