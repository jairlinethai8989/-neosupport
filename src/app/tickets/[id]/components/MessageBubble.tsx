"use client";

import { useState } from "react";
import { Image as ImageIcon, Video, FileText, Check, Clock } from "lucide-react";

interface MessageBubbleProps {
  msg: any;
  isIT: boolean;
  setAnnotationImage: (url: string) => void;
  setSelectedImage: (url: string) => void;
}

export default function MessageBubble({ msg, isIT, setAnnotationImage, setSelectedImage }: MessageBubbleProps) {
  const [isImage] = useState(
    msg.message_type === "image" || 
    (msg.message_type === "sticker" && msg.content?.startsWith('http'))
  );
  const [isVideo] = useState(msg.message_type === "video");
  const isSystem = msg.direction === "system";

  if (isSystem) {
    return (
      <div className="system-msg-container">
        <div className="system-msg-line" />
        <span className="system-msg-text">
          {msg.content}
        </span>
        <div className="system-msg-line" />
      </div>
    );
  }

  return (
    <div className={`msg-row ${isIT ? 'msg-outbound' : 'msg-inbound'}`}>
      <div className={`msg-bubble ${isIT ? 'bubble-staff' : 'bubble-user'} ${isImage ? 'bubble-media' : ''}`}>
        {/* Message Metadata Header (Minimal HUD style) */}
        {!isImage && !isVideo && (
          <div className="bubble-meta-header">
            <span className="sender-tag">{isIT ? "STAFF_ID" : "NODE_USER"}</span>
            <span className="timestamp-tag">
              {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Content Area */}
        <div className="bubble-content">
          {isImage && msg.content.startsWith('http') ? (
            <div className="media-wrapper">
              <img
                src={msg.content}
                alt="Attachment"
                className="media-img"
                onClick={() => setSelectedImage(msg.content)}
              />
              {!isIT && (
                <button
                  onClick={(e) => { e.stopPropagation(); setAnnotationImage(msg.content); }}
                  className="btn-media-edit"
                  title="Draw and send back"
                >
                  <FileText size={14} /> <span>EDIT_RESPONSE</span>
                </button>
              )}
            </div>
          ) : isVideo && msg.content.startsWith('http') ? (
            <div className="media-wrapper">
              <video
                src={msg.content}
                controls
                className="media-video"
              />
            </div>
          ) : (
            <div className="text-content">
              {msg.content}
            </div>
          )}
        </div>

        {/* Status Footer */}
        <div className="bubble-footer">
          {isImage || isVideo ? (
            <span className="timestamp-tag-overlay">
              {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
          
          <div className="status-icons">
            {isIT ? (
              <Check size={12} className="status-check" />
            ) : (
              <Clock size={10} className="status-clock" />
            )}
            {msg.message_type !== 'text' && (
              <span className="type-icon">
                {msg.message_type === 'image' && <ImageIcon size={10} />}
                {msg.message_type === 'video' && <Video size={10} />}
                {msg.message_type === 'sticker' && <FileText size={10} />}
              </span>
            )}
          </div>
        </div>

        {/* HUD Decorative Elements */}
        {isIT && <div className="hud-corner top-right" />}
        {!isIT && <div className="hud-corner top-left" />}
      </div>

      <style jsx>{`
        .msg-row {
          display: flex;
          width: 100%;
          margin-bottom: 1.25rem;
          opacity: 0;
          transform: translateY(10px);
          animation: msg-appear 0.3s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        @keyframes msg-appear {
          to { opacity: 1; transform: translateY(0); }
        }
        
        .msg-outbound { justify-content: flex-end; }
        .msg-inbound { justify-content: flex-start; }

        .msg-bubble {
          max-width: 80%;
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 1rem;
          transition: var(--transition);
          border: 1px solid var(--border-color);
        }
        
        .bubble-staff {
          background: linear-gradient(180deg, var(--primary), #0369a1);
          color: white;
          border-radius: 12px 2px 12px 12px;
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 15px var(--primary-glow);
        }
        
        .bubble-user {
          background: var(--bg-surface);
          backdrop-filter: blur(10px);
          color: var(--text-main);
          border-radius: 2px 12px 12px 12px;
          border-color: var(--border-color);
          box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.2);
        }

        .bubble-media {
          padding: 4px;
          background: #000;
          border-color: rgba(255,255,255,0.1);
        }

        .bubble-meta-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          opacity: 0.7;
          letter-spacing: 0.5px;
        }
        
        .sender-tag {
          font-size: 0.55rem;
          font-weight: 800;
          font-family: monospace;
          background: rgba(0, 0, 0, 0.2);
          padding: 1px 4px;
          border-radius: 2px;
        }
        
        .timestamp-tag {
          font-size: 0.6rem;
          font-weight: 500;
        }

        .text-content {
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.5;
          font-size: 0.925rem;
          font-weight: 500;
        }

        .media-wrapper {
          position: relative;
          overflow: hidden;
          border-radius: 8px;
        }
        
        .media-img {
          max-width: 100%;
          max-height: 400px;
          display: block;
          cursor: zoom-in;
          transition: transform 0.3s ease;
        }
        .media-img:hover { transform: scale(1.02); }
        
        .media-video {
          max-width: 100%;
          max-height: 400px;
          border-radius: 8px;
        }

        .btn-media-edit {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(14, 165, 233, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          color: white;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
          font-size: 0.7rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transition: all 0.2s;
        }
        .btn-media-edit:hover { background: var(--primary); transform: scale(1.05); }

        .bubble-footer {
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
        }
        
        .timestamp-tag-overlay {
          font-size: 0.6rem;
          opacity: 0.7;
          background: rgba(0,0,0,0.5);
          padding: 2px 6px;
          border-radius: 10px;
          color: white;
        }

        .status-icons {
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0.6;
        }

        .hud-corner {
          position: absolute;
          width: 6px;
          height: 6px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          pointer-events: none;
        }
        .top-right { top: -1px; right: -1px; border-left: none; border-bottom: none; }
        .top-left { top: -1px; left: -1px; border-right: none; border-bottom: none; }

        .system-msg-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 2rem 0;
          width: 100%;
        }
        
        .system-msg-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border-color), transparent);
        }
        
        .system-msg-text {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 700;
          background: var(--bg-color);
          padding: 0.2rem 1rem;
          border: 1px solid var(--border-color);
        }
      `}</style>
    </div>
  );
}

