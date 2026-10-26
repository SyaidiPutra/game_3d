import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/game.ts';
import { sound } from '../audio/soundEffects.ts';
import { Send, MessageSquare, Sparkles, X, Shield, Bell } from 'lucide-react';

interface ChatDrawerProps {
  messages: ChatMessage[];
  currentStudentId: string;
  isOpen: boolean;
  onToggle: () => void;
  onSendMessage: (text: string) => void;
}

const QUICK_TACTICS = [
  'Ayo kumpul di Altar! 🏛️',
  'Aku butuh bantuan di sini! 🤝',
  'Keren, satu teka-teki lagi! 🌟',
  'Coba periksa petunjuk kuno! 💡',
  'Ayo ke gerbang kuil utama! 🗝️',
];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  currentStudentId,
  isOpen,
  onToggle,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    sound.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickSend = (text: string) => {
    sound.playClick();
    onSendMessage(text);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-4 z-40 p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/50 text-cyan-400 hover:text-white hover:bg-slate-800 shadow-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer"
        title="Buka Chat Real-time"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="hidden sm:inline">Obrolan Tim</span>
        {messages.length > 0 && (
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80 sm:w-96 h-96 bg-slate-950/95 border border-cyan-500/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Obrolan Ekspedisi Kooperatif
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 text-xs">
        {messages.map((m) => {
          const isMe = m.senderId === currentStudentId;
          const isSystem = m.senderRole === 'system' || m.type === 'system';
          const isCelebration = m.type === 'celebration';
          const isGuru = m.senderRole === 'guru';

          if (isCelebration) {
            return (
              <div
                key={m.id}
                className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium flex items-center gap-1.5 shadow"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{m.text}</span>
              </div>
            );
          }

          if (isSystem) {
            return (
              <div
                key={m.id}
                className="py-1 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 text-[11px] text-center"
              >
                {m.text}
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                {isGuru && <Shield className="w-3 h-3 text-amber-400" />}
                <span
                  style={{ color: m.avatarColor || (isGuru ? '#f59e0b' : '#38bdf8') }}
                  className="font-bold"
                >
                  {isGuru ? `[GURU] ${m.senderName}` : m.senderName}
                </span>
                <span>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div
                className={`p-2.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  isMe
                    ? 'bg-cyan-600 text-white rounded-tr-none'
                    : isGuru
                    ? 'bg-amber-950/70 border border-amber-600/50 text-amber-200 rounded-tl-none font-semibold'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Tactical Clues */}
      <div className="px-2.5 py-1.5 bg-slate-900/90 border-t border-slate-800 flex gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
        {QUICK_TACTICS.map((t, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickSend(t)}
            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik pesan atau koordinasi tim..."
          maxLength={150}
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
