"use client";

import { useState } from "react";
import { Image as ImageIcon, Video, FileText, Check } from "lucide-react";

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
  const [isFile] = useState(msg.message_type === "file");
  const isSystem = msg.direction === "system";

  if (isSystem) {
    return (
      <div className="system-msg-container">
        <div className="system-msg-line" />
        <span className="system-msg-text">{msg.content}</span>
        <div className="system-msg-line" />
      </div>
    );
  }

  return (
    <div className={`msg-row ${isIT ? 'msg-outbound' : 'msg-inbound'}`}>
      <div className={`msg-bubble ${isIT ? 'bubble-staff' : 'bubble-user'} ${isImage ? 'bubble-media' : ''}`}>
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
                >
                  <FileText size={14} /> <span>📝 EDIT</span>
                </button>
              )}
            </div>
          ) : isVideo && msg.content.startsWith('http') ? (
            <div className="media-wrapper">
              <video src={msg.content} controls className="media-video" />
            </div>
          ) : isFile && msg.content.startsWith('http') ? (
            <a href={msg.content} target="_blank" rel="noopener noreferrer" className="file-attachment-pill">
              <FileText size={20} />
              <div className="file-info">
                 <span className="file-name">ไฟล์เอกสาร {isIT ? 'จากแอดมิน' : 'จากลูกค้า'}</span>
                 <span className="file-action">คลิกเพื่อดาวน์โหลดเอกสาร</span>
              </div>
            </a>
          ) : (
            <div className="text-content">{msg.content}</div>
          )}
        </div>

        {/* Status Footer */}
        <div className="bubble-footer">
          <span className="timestamp-tag">
            {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="status-icons">
            {isIT && <Check size={12} className="status-check" />}
          </div>
        </div>
      </div>

      <style jsx>{`
        .msg-row {
          display: flex;
          width: 100%;
          margin-bottom: 1rem;
          opacity: 0;
          transform: translateY(10px);
          animation: msg-appear 0.3s ease-out forwards;
        }
        @keyframes msg-appear {
          to { opacity: 1; transform: translateY(0); }
        }
        
        .msg-outbound { justify-content: flex-end; }
        .msg-inbound { justify-content: flex-start; }

        .msg-bubble {
          max-width: 80%;
          padding: 0.85rem 1.1rem;
          border-radius: 22px;
          position: relative;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          border: 1px solid var(--border-color);
        }
        
        .bubble-staff {
          background: var(--primary);
          color: white;
          border-radius: 22px 22px 4px 22px;
          border: none;
          box-shadow: 0 8px 16px rgba(0, 108, 228, 0.15);
        }
        
        .bubble-user {
          background: #ffffff;
          color: var(--text-heading);
          border-radius: 22px 22px 22px 4px;
        }

        .bubble-content {
          font-size: 0.95rem;
          line-height: 1.5;
          font-weight: 500;
        }

        .bubble-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          opacity: 0.7;
        }

        .timestamp-tag { font-size: 0.65rem; font-weight: 700; }

        .media-img, .media-video {
          max-width: 100%;
          border-radius: 12px;
          display: block;
        }

        .file-attachment-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 108, 228, 0.05);
          padding: 12px 16px;
          border-radius: 14px;
          text-decoration: none;
          color: inherit;
          transition: var(--transition);
          border: 1px solid rgba(0, 108, 228, 0.1);
          margin: 4px 0;
        }
        .bubble-staff .file-attachment-pill {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
        }
        .file-info {
           display: flex;
           flex-direction: column;
           gap: 2px;
        }
        .file-name {
           font-size: 0.85rem;
           font-weight: 700;
           letter-spacing: 0.3px;
        }
        .file-action {
           font-size: 0.7rem;
           opacity: 0.7;
           font-weight: 600;
        }
        .file-attachment-pill:hover {
           transform: translateY(-2px);
           box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .btn-media-edit {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: white;
          color: var(--primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 0.3rem 0.6rem;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          box-shadow: var(--shadow-sm);
        }

        .system-msg-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.5rem 0;
        }
        .system-msg-line { flex: 1; height: 1px; background: var(--border-color); opacity: 0.5; }
        .system-msg-text { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
      `}</style>
    </div>
  );
}
