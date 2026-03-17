"use client";

import { useState, useRef } from "react";
import { Send, Image as ImageIcon, X } from "lucide-react";

interface ChatInputProps {
  ticketId: string;
  onSendMessage: (content: string, file?: File) => void;
  isLoading: boolean;
  value: string;
  onChange: (val: string) => void;
}

export default function ChatInput({ ticketId, onSendMessage, isLoading, value, onChange }: ChatInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: '24px 24px 0 0',
      border: '1px solid var(--border-color)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* File Preview */}
      {previewUrl && (
        <div style={{
          position: 'relative',
          display: 'inline-block',
          maxWidth: '200px'
        }}>
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              width: '100%',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}
          />
          <button
            onClick={clearFile}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: 'var(--status-escalated-text)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-end'
      }}>
        {/* File Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          style={{
            padding: '0.75rem',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            color: 'var(--text-muted)',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="Attach file"
        >
          <ImageIcon size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          disabled={isLoading}
          style={{ display: 'none' }}
        />

        {/* Text Input */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="พิมพ์ข้อความ... (Enter เพื่อส่ง, Shift+Enter เพื่อขึ้นบรรทัดใหม่)"
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-color)',
            color: 'var(--text-heading)',
            fontSize: '0.95rem',
            resize: 'none',
            minHeight: '44px',
            maxHeight: '120px',
            outline: 'none'
          }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isLoading || (!value.trim() && !selectedFile)}
          className="btn-primary"
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            border: 'none',
            fontWeight: 600,
            cursor: isLoading || (!value.trim() && !selectedFile) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: isLoading || (!value.trim() && !selectedFile) ? 0.6 : 1
          }}
        >
          {isLoading ? (
            <div className="spinner-mini" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
