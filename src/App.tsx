import React, { useState, useEffect, useRef } from 'react';
import { TitleScreen } from './components/TitleScreen.tsx';
import { AvatarCustomizer } from './components/AvatarCustomizer.tsx';
import { GameCanvas } from './game3d/GameCanvas.tsx';
import { InGameHud } from './components/InGameHud.tsx';
import { RiddleModal } from './components/RiddleModal.tsx';
import { ChatDrawer } from './components/ChatDrawer.tsx';
import { GuruDashboard } from './components/GuruDashboard.tsx';
import { GuruPortalModal } from './components/GuruPortalModal.tsx';
import { sound } from './audio/soundEffects.ts';
import {
  AvatarConfig,
  Question,
  StudentProgress,
  ChatMessage,
  RoomData,
} from './types/game.ts';

type AppScreen = 'title' | 'customize' | 'playing' | 'guru_dashboard';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('title');
  const [isGuruModalOpen, setIsGuruModalOpen] = useState<boolean>(false);

  // Player session info
  const [studentId, setStudentId] = useState<string>(() => {
    return 'stud-' + Math.random().toString(36).substring(2, 9);
  });
  const [studentName, setStudentName] = useState<string>('Petualang Siswa');
  const [playerRole, setPlayerRole] = useState<'student' | 'guru'>('student');
  const [guruPasscode, setGuruPasscode] = useState<string>('guru123');
  const [avatar, setAvatar] = useState<AvatarConfig>({
    color: '#3b82f6',
    outfit: 'adventurer',
    hat: 'scholar',
    accessory: 'torch',
  });

  // Current Room info
  const [roomCode, setRoomCode] = useState<string>('DEMO-2026');
  const [roomName, setRoomName] = useState<string>('Petualangan Ekspedisi Aethelgard');
  const [solvedStations, setSolvedStations] = useState<number[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [remotePlayers, setRemotePlayers] = useState<Record<string, StudentProgress>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [latestAnnouncement, setLatestAnnouncement] = useState<string>('');

  // In-Game UI states
  const [nearestStationId, setNearestStationId] = useState<number | null>(null);
  const [inspectingStationId, setInspectingStationId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);
  const answerPromiseRef = useRef<{
    resolve: (res: any) => void;
    reject: (err: any) => void;
  } | null>(null);

  // Connect to WebSocket when entering 'playing' screen
  useEffect(() => {
    if (screen !== 'playing') {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send JOIN_ROOM message
      ws.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomCode: roomCode.toUpperCase().trim(),
          studentId,
          studentName,
          avatar,
          role: playerRole,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type } = data;

        if (type === 'INIT_STATE') {
          const { room } = data;
          setRoomName(room.name || 'Ekspedisi');
          setSolvedStations(room.solvedStations || []);
          setQuestions(room.questions || []);
          if (room.chatMessages) setChatMessages(room.chatMessages);

          // Populate remote players (exclude self)
          const remotes: Record<string, StudentProgress> = {};
          for (const sId in room.students) {
            if (sId !== studentId) {
              remotes[sId] = room.students[sId];
            } else {
              setPlayerScore(room.students[sId].score || 0);
            }
          }
          setRemotePlayers(remotes);
        }

        else if (type === 'PLAYER_JOINED') {
          const { player, message } = data;
          if (player && player.studentId !== studentId) {
            setRemotePlayers((prev) => ({
              ...prev,
              [player.studentId]: player,
            }));
          }
          if (message) {
            setChatMessages((prev) => [...prev, message]);
          }
        }

        else if (type === 'PLAYER_MOVED') {
          const { studentId: movedId, position, rotation, isMoving } = data;
          if (movedId !== studentId) {
            setRemotePlayers((prev) => {
              if (!prev[movedId]) return prev;
              return {
                ...prev,
                [movedId]: {
                  ...prev[movedId],
                  position,
                  rotation,
                  isMoving,
                },
              };
            });
          }
        }

        else if (type === 'CHAT_MESSAGE') {
          const { message } = data;
          if (message) {
            setChatMessages((prev) => [...prev, message]);
            if (message.senderId !== studentId) {
              sound.playChatPing();
            }
          }
        }

        else if (type === 'ANSWER_RESULT') {
          if (answerPromiseRef.current) {
            answerPromiseRef.current.resolve(data);
            answerPromiseRef.current = null;
          }
        }

        else if (type === 'PUZZLE_SOLVED') {
          const { stationId, solvedStations: newSolved, message, solverId, studentScore } = data;
          if (newSolved) setSolvedStations(newSolved);
          if (message) setChatMessages((prev) => [...prev, message]);

          if (solverId === studentId && typeof studentScore === 'number') {
            setPlayerScore(studentScore);
          }

          sound.playInteract();
        }

        else if (type === 'ANNOUNCEMENT') {
          const { message } = data;
          if (message) {
            setLatestAnnouncement(message.text);
            sound.playInteract();
            setTimeout(() => setLatestAnnouncement(''), 10000);
          }
        }

        else if (type === 'ROOM_RESET') {
          setSolvedStations([]);
          setPlayerScore(0);
          sound.playInteract();
        }

        else if (type === 'PLAYER_LEFT') {
          const { studentId: leftId } = data;
          setRemotePlayers((prev) => {
            const copy = { ...prev };
            delete copy[leftId];
            return copy;
          });
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WS connection closed.');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [screen, roomCode, studentId, studentName, avatar, playerRole]);

  // Movement update from GameCanvas
  const handleMoveUpdate = (
    pos: { x: number; y: number; z: number },
    rotation: number,
    isMoving: boolean
  ) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'PLAYER_MOVE',
          position: pos,
          rotation,
          isMoving,
        })
      );
    }
  };

  // Send chat message
  const handleSendMessage = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SEND_CHAT',
          text,
        })
      );
    }
  };

  // Submit answer for a puzzle station
  const handleSubmitAnswer = (
    stationId: number,
    answer: string,
    timeTaken: number
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('Koneksi terputus.'));
        return;
      }

      answerPromiseRef.current = { resolve, reject };

      wsRef.current.send(
        JSON.stringify({
          type: 'SUBMIT_ANSWER',
          stationId,
          answer,
          timeTakenSeconds: timeTaken,
        })
      );

      // Timeout safety after 10s
      setTimeout(() => {
        if (answerPromiseRef.current) {
          answerPromiseRef.current.reject(new Error('Batas waktu server habis.'));
          answerPromiseRef.current = null;
        }
      }, 10000);
    });
  };

  // Switch to student customize screen
  const handleStartStudent = () => {
    setPlayerRole('student');
    setScreen('customize');
  };

  // Open Guru Modal
  const handleStartGuru = () => {
    setIsGuruModalOpen(true);
  };

  // Quick Demo into DEMO-2026
  const handleQuickDemo = () => {
    setPlayerRole('student');
    setStudentName('Penjelajah Siswa ' + Math.floor(10 + Math.random() * 90));
    setRoomCode('DEMO-2026');
    setScreen('playing');
  };

  // Join Room from Avatar Customizer
  const handleJoinFromCustomizer = (
    name: string,
    avatarConfig: AvatarConfig,
    code: string
  ) => {
    setStudentName(name);
    setAvatar(avatarConfig);
    setRoomCode(code);
    setPlayerRole('student');
    setScreen('playing');
  };

  // Guru Authentication Success -> Navigate to Guru Dashboard
  const handleGuruAuthSuccess = (code: string, passcode: string) => {
    setRoomCode(code);
    setGuruPasscode(passcode);
    setIsGuruModalOpen(false);
    setScreen('guru_dashboard');
  };

  // Enter 3D world as Guru Game Master
  const handleEnterWorldAsGuru = () => {
    setPlayerRole('guru');
    setStudentName('Guru Pemandu');
    setAvatar({
      color: '#f59e0b',
      outfit: 'adventurer',
      hat: 'crown',
      accessory: 'staff',
    });
    setScreen('playing');
  };

  const currentInspectingQuestion = questions.find(
    (q) => q.stationId === inspectingStationId
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      
      {/* 1. Title Screen */}
      {screen === 'title' && (
        <TitleScreen
          onStartStudent={handleStartStudent}
          onStartGuru={handleStartGuru}
          onQuickDemo={handleQuickDemo}
        />
      )}

      {/* 2. Avatar Customizer Screen */}
      {screen === 'customize' && (
        <AvatarCustomizer
          initialName={studentName}
          initialCode={roomCode}
          onJoin={handleJoinFromCustomizer}
          onBack={() => setScreen('title')}
        />
      )}

      {/* 3. Guru Analytics Dashboard */}
      {screen === 'guru_dashboard' && (
        <GuruDashboard
          roomCode={roomCode}
          guruPasscode={guruPasscode}
          onEnterWorldAsGuru={handleEnterWorldAsGuru}
          onBackToMenu={() => setScreen('title')}
        />
      )}

      {/* 4. Main 3D Playing Adventure Viewport */}
      {screen === 'playing' && (
        <div className="relative w-full h-full">
          {/* 3D WebGL Canvas Engine */}
          <GameCanvas
            localPlayerName={studentName}
            localPlayerAvatar={avatar}
            localPlayerRole={playerRole}
            remotePlayers={remotePlayers}
            solvedStations={solvedStations}
            onMoveUpdate={handleMoveUpdate}
            onNearStation={(stId) => setNearestStationId(stId)}
            onOpenStation={(stId) => setInspectingStationId(stId)}
          />

          {/* In-Game HUD Overlay */}
          <InGameHud
            roomCode={roomCode}
            roomName={roomName}
            playerName={studentName}
            playerRole={playerRole}
            playerColor={avatar.color}
            playerScore={playerScore}
            solvedStations={solvedStations}
            onlineCount={Object.keys(remotePlayers).length + 1}
            nearestStationId={nearestStationId}
            onOpenStation={(stId) => setInspectingStationId(stId)}
            onToggleChat={() => setIsChatOpen((prev) => !prev)}
            onExit={() => setScreen('title')}
            latestAnnouncement={latestAnnouncement}
          />

          {/* Riddle Modal Dialog */}
          {inspectingStationId !== null && currentInspectingQuestion && (
            <RiddleModal
              question={currentInspectingQuestion}
              isAlreadySolvedByMe={solvedStations.includes(inspectingStationId)}
              isSolvedInRoom={solvedStations.includes(inspectingStationId)}
              onClose={() => setInspectingStationId(null)}
              onSubmitAnswer={(ans, timeTaken) =>
                handleSubmitAnswer(inspectingStationId, ans, timeTaken)
              }
            />
          )}

          {/* Real-time Collaborative Chat Drawer */}
          <ChatDrawer
            messages={chatMessages}
            currentStudentId={studentId}
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen((prev) => !prev)}
            onSendMessage={handleSendMessage}
          />
        </div>
      )}

      {/* Guru Portal Modal (Popup from Title Screen) */}
      {isGuruModalOpen && (
        <GuruPortalModal
          onSuccess={handleGuruAuthSuccess}
          onClose={() => setIsGuruModalOpen(false)}
        />
      )}
    </div>
  );
}
