"use client";

import { useState } from "react";
import { Image as ImageIcon, Video, FileText } from "lucide-react";

interface MessageBubbleProps {
  msg: any;
  isIT: boolean;
  setAnnotationImage: (url: string) => void;
  setSelectedImage: (url: string) => void;
}

export default function MessageBubble({ msg, isIT, setAnnotationImage, setSelectedImage }: MessageBubbleProps) {
  const [isImage, setIsImage] = useState(
    msg.message_type === "image" || 
    (msg.message_type === "sticker" && msg.content?.startsWith('http'))
  );
  const [isVideo, setIsVideo] = useState(msg.message_type === "video");

  const isSystem = msg.direction === "system";

  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        <span style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-color)',
          padding: '0.4rem 1rem',
          borderRadius: '12px'
        }}>
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isIT ? 'flex-end' : 'flex-start',
        marginBottom: '1rem',
        position: 'relative'
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: isImage ? "0.5rem" : "1rem 1.25rem",
          borderRadius: "20px",
          background: isIT ? "linear-gradient(135deg, var(--primary), var(--primary-hover))" : "var(--bg-surface)",
          color: isIT ? "white" : "var(--text-main)",
          boxShadow: isIT ? "0 4px 15px var(--primary-glow)" : "0 4px 10px rgba(0,0,0,0.1)",
          border: isIT ? "none" : "1px solid var(--border-color)",
          borderBottomRightRadius: isIT ? "4px" : "20px",
          borderBottomLeftRadius: isIT ? "20px" : "4px",
          position: 'relative'
        }}
      >
        {isImage && msg.content.startsWith('http') ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={msg.content}
              alt="Attachment"
              style={{ maxWidth: "100%", maxHeight: "350px", borderRadius: "14px", cursor: "zoom-in", display: 'block' }}
              onClick={() => setSelectedImage(msg.content)}
            />
            {!isIT && (
              <button
                onClick={(e) => { e.stopPropagation(); setAnnotationImage(msg.content); }}
                title="Draw and send back"
                style={{
                  position: 'absolute', bottom: '8px', right: '8px',
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px',
                  color: 'white', padding: '0.35rem 0.7rem',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '0.3rem'
                }}
              >
                ✏️ Edit
              </button>
            )}
          </div>
        ) : isVideo && msg.content.startsWith('http') ? (
          <video
            src={msg.content}
            controls
            style={{ maxWidth: "100%", maxHeight: "350px", borderRadius: "14px" }}
          />
        ) : (
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            lineHeight: '1.5'
          }}>
            {msg.content}
          </div>
        )}

        <div style={{
          fontSize: '0.7rem',
          color: isIT ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
          marginTop: isImage || isVideo ? '0.4rem' : '0.6rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          justifyContent: isIT ? 'flex-end' : 'flex-start'
        }}>
          <span>{new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
          {msg.message_type !== 'text' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              {msg.message_type === 'image' && <ImageIcon size={10} />}
              {msg.message_type === 'video' && <Video size={10} />}
              {msg.message_type === 'sticker' && <FileText size={10} />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
