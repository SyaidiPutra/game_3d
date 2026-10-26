export interface Question {
  id: string;
  stationId: number;
  stationName: string;
  title: string;
  riddle: string;
  question: string;
  type: 'mcq' | 'text' | 'sequence';
  options?: string[];
  correctAnswer: string;
  hint: string;
  explanation: string;
  points: number;
}

export interface AvatarConfig {
  color: string;
  outfit: string;
  hat: string;
  accessory: string;
}

export interface StudentProgress {
  studentId: string;
  name: string;
  avatar: AvatarConfig;
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

export interface RoomData {
  code: string;
  name: string;
  subject: string;
  description: string;
  status: 'lobby' | 'playing' | 'completed';
  timeLimitMinutes: number;
  solvedStations: number[];
  mysterySolved: boolean;
  mysterySolvedAt?: number;
  totalQuestions: number;
  studentCount?: number;
  questions: Question[];
  students?: Record<string, StudentProgress>;
  chatMessages?: ChatMessage[];
  announcements?: string[];
  guruPasscode?: string;
  createdAt?: number;
}

export type GameRoom = RoomData;
