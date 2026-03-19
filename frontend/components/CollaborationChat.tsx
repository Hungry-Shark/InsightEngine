"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User as UserIcon, X, MessageSquare } from "lucide-react";

export interface ChatMessage {
  type: "chat" | "info" | "comment";
  user: string;
  text: string;
  picture?: string;
  ts?: string;
}

interface CollaborationChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
  currentUser: { name: string; picture?: string };
  roomName: string;
}

export default function CollaborationChat({ messages, onSendMessage, onClose, currentUser, roomName }: CollaborationChatProps) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText("");
    }
  };

  return (
    <div className="collab-chat-panel glass-card">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={16} className="text-secondary" style={{ opacity: 0.8 }} />
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Room: {roomName}</h3>
        </div>
        <button onClick={onClose} className="chat-close-btn"><X size={16} /></button>
      </div>

      <div className="chat-body" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg-wrap ${msg.type}`}>
            {msg.type === "chat" ? (
              <div className="chat-bubble">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  {msg.picture ? (
                    <img src={msg.picture} alt="U" className="chat-avatar" />
                  ) : (
                    <div className="chat-avatar-fallback">{msg.user[0]}</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div className="chat-user-row">
                      <span className="chat-user-name">{msg.user}</span>
                      <span className="chat-ts">{msg.ts || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="chat-text">{msg.text}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chat-info-msg">{msg.text}</div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="chat-empty">
            <p style={{ opacity: 0.5 }}>No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input 
          type="text" 
          className="chat-input-small" 
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
          <Send size={14} />
        </button>
      </form>

      <style jsx>{`
        .collab-chat-panel {
          position: fixed;
          right: 32px;
          bottom: 32px;
          width: 340px;
          height: 480px;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          overflow: visible; /* For glint border */
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .chat-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.02);
        }
        .chat-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }
        .chat-close-btn:hover {
          color: white;
        }
        .chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .chat-bubble {
          background: rgba(255,255,255,0.03);
          padding: 12px;
          border-radius: 16px;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255,255,255,0.03);
        }
        .chat-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .chat-avatar-fallback {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .chat-user-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .chat-user-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-primary);
          opacity: 0.9;
        }
        .chat-ts {
          font-size: 0.65rem;
          color: var(--text-muted);
          opacity: 0.5;
        }
        .chat-text {
          margin: 0;
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--text-secondary);
          word-break: break-word;
        }
        .chat-info-msg {
          text-align: center;
          font-size: 0.7rem;
          color: var(--text-muted);
          font-style: italic;
          padding: 6px 0;
          opacity: 0.6;
        }
        .chat-input-row {
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          gap: 10px;
          background: rgba(255,255,255,0.01);
        }
        .chat-input-small {
          flex: 1;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          padding: 8px 16px;
          color: white;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .chat-input-small:focus {
          border-color: rgba(255,255,255,0.1);
        }
        .chat-send-btn {
          background: white;
          color: black;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chat-send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          opacity: 0.9;
        }
        .chat-send-btn:disabled {
          background: rgba(255,255,255,0.05);
          color: var(--text-muted);
          cursor: not-allowed;
        }
        .chat-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
          padding: 40px;
        }
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
