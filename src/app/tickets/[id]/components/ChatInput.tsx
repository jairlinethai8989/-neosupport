"use client";

import { useState, useRef } from "react";
import { Send, Image as ImageIcon, X, Paperclip, FileText } from "lucide-react";

interface ChatInputProps {
  ticketId: string;
  onSendMessage: (content: string, file?: File) => void;
  isLoading: boolean;
  value: string;
  onChange: (val: string) => void;
}

export default function ChatInput({ onSendMessage, isLoading, value, onChange }: ChatInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl("file-icon"); // Placeholder string for non-image files
      }
    }
  };

  const handleSend = () => {
    if ((!value.trim() && !selectedFile) || isLoading) return;
    onSendMessage(value.trim(), selectedFile || undefined);
    onChange("");
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="input-container">
      {/* Zero-Cost Warning */}
      <div className="quota-warning">
        <span className="warning-icon">⚠️</span> 
        โหมดประหยัดโควต้า: การตอบแชทที่นี่จะเสียโควต้า LINE 
        <a href="https://manager.line.biz" target="_blank" rel="noreferrer" className="link-oa">
          [ เปิด LINE OA Manager เพื่อแชทฟรี ]
        </a>
      </div>

      {/* File Preview Context */}
      {previewUrl && (
        <div className="preview-overlay">
          <div className="preview-card">
            {previewUrl === "file-icon" ? (
              <div className="preview-file-placeholder">
                 <FileText size={32} />
                 <span>{selectedFile?.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
              </div>
            ) : (
              <img src={previewUrl} alt="Preview" className="preview-img" />
            )}
            <button onClick={clearFile} className="btn-clear-preview">
              <X size={12} />
            </button>
            <div className="preview-tag">{selectedFile?.type.startsWith("image/") ? "พร้อมส่งรูปภาพ" : "พร้อมส่งไฟล์แนบ"}</div>
          </div>
        </div>
      )}

      {/* Main Input Controls */}
      <div className="input-row">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="btn-action"
          title="Attach Media"
        >
          <Paperclip size={20} />
        </button>
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
          onChange={handleFileSelect} 
          disabled={isLoading} 
          style={{ display: 'none' }} 
        />

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ข้อความของคุณที่นี่..."
          disabled={isLoading}
          rows={1}
          className="text-input"
        />

        <button
          onClick={handleSend}
          disabled={isLoading || (!value.trim() && !selectedFile)}
          className="btn-send"
        >
          {isLoading ? <div className="spinner-mini" /> : <Send size={18} />}
        </button>
      </div>

      <style jsx>{`
        .input-container {
          background: var(--bg-surface);
          padding: 1rem 1.25rem;
          width: 100%;
          position: relative;
          border-top: 1px solid var(--border-color);
        }

        .preview-overlay {
          position: absolute;
          bottom: 100%;
          left: 1.25rem;
          margin-bottom: 1rem;
          z-index: 20;
          animation: slide-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .preview-card {
          position: relative;
          background: white;
          padding: 8px;
          border: 1px solid var(--primary);
          border-radius: var(--radius-main);
          box-shadow: var(--shadow-lg);
        }
        
        .preview-img {
          max-width: 160px;
          max-height: 160px;
          display: block;
          border-radius: 12px;
        }

        .preview-file-placeholder {
          width: 120px;
          height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border-radius: 12px;
          color: var(--primary);
          gap: 8px;
        }

        .preview-file-placeholder span {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--text-muted);
        }

        .preview-tag {
          font-size: 0.6rem;
          color: var(--primary);
          font-weight: 800;
          text-align: center;
          margin-top: 6px;
          letter-spacing: 0.5px;
        }

        .btn-clear-preview {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
        }

        .input-row {
          display: flex;
          align-items: flex-end;
          background: #f8fafc;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-main);
          padding: 0.5rem;
          gap: 0.5rem;
          transition: var(--transition);
        }
        .input-row:focus-within {
          border-color: var(--primary);
          background: white;
          box-shadow: 0 0 20px var(--primary-glow);
        }

        .btn-action {
          width: 44px;
          height: 44px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          border-radius: 12px;
        }
        .btn-action:hover { background: var(--bg-surface-hover); color: var(--primary); }

        .text-input {
          flex: 1;
          padding: 0.75rem 0.5rem;
          border: none;
          background: transparent;
          color: var(--text-heading);
          font-size: 0.95rem;
          font-weight: 600;
          resize: none;
          minHeight: 44px;
          maxHeight: 150px;
          outline: none;
          font-family: inherit;
        }

        .btn-send {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: none;
          background: var(--primary);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-send:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 8px 20px var(--primary-glow);
        }
        .btn-send:disabled {
          background: var(--border-color);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        .spinner-mini {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0,0,0,0.1);
          border-top-color: black;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .quota-warning {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-sharp);
          margin-bottom: 0.75rem;
          font-size: 0.75rem;
          color: #f59e0b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: inherit;
        }
        .warning-icon {
          font-size: 1rem;
        }
        .link-oa {
          color: #10b981;
          text-decoration: underline;
          font-weight: bold;
          margin-left: 4px;
        }
        .link-oa:hover {
          color: #06c755;
        }
      `}</style>
    </div>
  );
}
