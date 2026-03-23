"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { X, Pencil, Eraser, RotateCcw, Trash2, Square, Circle } from "lucide-react";

type DrawTool = 'pen' | 'eraser' | 'rect' | 'circle';

interface ImageAnnotationModalProps {
  imageUrl: string;
  onClose: () => void;
  onSend: (file: File) => Promise<void>;
}

export default function ImageAnnotationModal({ imageUrl, onClose, onSend }: ImageAnnotationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#FF3B30');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;
  const getCanvas = () => canvasRef.current;

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const initCanvas = useCallback(() => {
    const canvas = getCanvas();
    const ctx = getCtx();
    const img = imgRef.current;
    if (!canvas || !ctx || !img || !img.complete) return;
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    // Draw the base image onto the canvas so annotations composite on top
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  const pushHistory = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    setHistory(prev => [...prev.slice(-29), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const applyStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth * 1.5;
  };

  const drawShape = (ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) => {
    applyStyle(ctx);
    if (tool === 'rect') {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (tool === 'circle') {
      const rx = (end.x - start.x) / 2;
      const ry = (end.y - start.y) / 2;
      const cx = start.x + rx;
      const cy = start.y + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    pushHistory();
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
    startPosRef.current = pos;
    if (tool === 'rect' || tool === 'circle') {
      const canvas = getCanvas()!;
      snapshotRef.current = getCtx()!.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return;
    const ctx = getCtx();
    const canvas = getCanvas();
    if (!ctx || !canvas) return;

    const pos = getPos(e);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.lineWidth = lineWidth * 3;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      lastPos.current = pos;
      return;
    }

    if (tool === 'pen') {
      applyStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'rect' || tool === 'circle') {
      if (snapshotRef.current && startPosRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
        drawShape(ctx, startPosRef.current, pos);
      }
    }

    lastPos.current = pos;
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
    startPosRef.current = null;
    snapshotRef.current = null;
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    const ctx = getCtx();
    const canvas = getCanvas();
    if (!ctx || !canvas) return;
    ctx.putImageData(prev, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    const ctx = getCtx();
    const canvas = getCanvas();
    if (!ctx || !canvas) return;
    pushHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSend = async () => {
    const canvas = getCanvas();
    const img = imgRef.current;
    if (!canvas || !img) return;

    setIsSending(true);
    try {
      // Composite: base image + annotation layer onto a temp canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      // Draw original image first
      tempCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Draw annotations on top
      tempCtx.drawImage(canvas, 0, 0);

      const blob = await new Promise<Blob | null>(resolve => tempCanvas.toBlob(resolve, 'image/png', 1.0));
      if (!blob) throw new Error('Canvas to blob failed');
      const file = new File([blob], 'annotated-image.png', { type: 'image/png' });
      await onSend(file);
      onClose();
    } catch (err) {
      console.error('Failed to send annotated image:', err);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem'
      }}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          maxWidth: '92vw',
          maxHeight: '72vh',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="annotate"
            crossOrigin="anonymous"
            onLoad={initCanvas}
            style={{ display: 'block', maxWidth: '92vw', maxHeight: '72vh', userSelect: 'none', pointerEvents: 'none' }}
            draggable={false}
          />
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            cursor: tool === 'eraser' ? 'cell' : tool === 'pen' ? 'crosshair' : 'crosshair',
            touchAction: 'none'
          }}
        />
      </div>

      {/* Toolbar */}
      <div
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1.25rem',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Tools */}
        <div style={{ display: 'flex', gap: '0.5rem', borderRight: '1px solid var(--border-color)', paddingRight: '0.75rem' }}>
          <button
            onClick={() => setTool('pen')}
            style={{
              padding: '0.5rem',
              background: tool === 'pen' ? 'var(--primary)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: tool === 'pen' ? 'white' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            title="Pen"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => setTool('rect')}
            style={{
              padding: '0.5rem',
              background: tool === 'rect' ? 'var(--primary)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: tool === 'rect' ? 'white' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            title="Rectangle"
          >
            <Square size={18} />
          </button>
          <button
            onClick={() => setTool('circle')}
            style={{
              padding: '0.5rem',
              background: tool === 'circle' ? 'var(--primary)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: tool === 'circle' ? 'white' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            title="Circle"
          >
            <Circle size={18} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            style={{
              padding: '0.5rem',
              background: tool === 'eraser' ? 'var(--primary)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: tool === 'eraser' ? 'white' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>
        </div>

        {/* Color picker */}
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          title="Color"
          aria-label="Select annotation color"
        />

        {/* Line width */}
        <input
          type="range"
          min="1"
          max="10"
          value={lineWidth}
          onChange={e => setLineWidth(Number(e.target.value))}
          style={{ width: '80px' }}
          title="Line width"
          aria-label="Adjust line width"
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '0.75rem' }}>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: history.length === 0 ? 'var(--text-muted)' : 'var(--text-heading)',
              cursor: history.length === 0 ? 'not-allowed' : 'pointer',
              opacity: history.length === 0 ? 0.5 : 1
            }}
            title="Undo"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--status-escalated-text)',
              cursor: 'pointer'
            }}
            title="Clear all"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={handleSend}
            disabled={isSending}
            className="btn-primary"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              cursor: isSending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginTop: '0.7rem' }}>
        Select tool → Draw on image → Click &quot;Send&quot;
      </p>
    </div>
  );
}
