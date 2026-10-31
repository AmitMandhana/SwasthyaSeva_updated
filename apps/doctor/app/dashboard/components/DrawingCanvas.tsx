'use client';

import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Pencil, Undo2, Trash2, Save } from 'lucide-react';
import { Button } from '@swasthyaseva/ui';
import { getCloudinarySignature } from '../../../lib/api';

export interface DrawingCanvasHandle {
  uploadIfDirty: () => Promise<void>;
}

interface Props {
  drawingUrl?: string;
  onSave: (url: string) => void;
  readOnly?: boolean;
}

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas({ drawingUrl, onSave, readOnly = false }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [saving, setSaving] = useState(false);
  const isDirty = useRef(false);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (drawingUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        saveState();
      };
      img.src = drawingUrl;
    } else {
      saveState();
    }
  }, [isOpen]);

  function saveState() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    setHistory(prev => [...prev, ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)]);
  }

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (readOnly) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw() {
    if (!isDrawing) return;
    setIsDrawing(false);
    isDirty.current = true;
    saveState();
  }

  function handleUndo() {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
  }

  function handleClear() {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    saveState();
  }

  const handleSave = useCallback(async () => {
    if (!canvasRef.current || saving) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((b) => resolve(b!), 'image/png');
      });

      const { timestamp, signature, api_key, cloud_name } = await getCloudinarySignature();
      const formData = new FormData();
      formData.append('file', blob, 'drawing.png');
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('api_key', api_key);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        onSave(data.secure_url);
        isDirty.current = false;
      }
    } catch (err) {
      console.error('Drawing save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [saving, onSave]);

  useImperativeHandle(ref, () => ({
    uploadIfDirty: async () => {
      if (!isDirty.current || !canvasRef.current) return;
      await handleSave();
    },
  }), [handleSave]);

  return (
    <section className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <h2 className="text-2xl font-bold text-card-alt flex items-center gap-2">
          <Pencil className="w-6 h-6 text-primary" />
          Drawing Pad
        </h2>
        <button type="button" aria-expanded={isOpen} className="text-card-alt hover:text-card-alt transition-colors">
          <span className={`transform transition-transform duration-200 inline-block ${!isOpen ? '' : 'rotate-90'}`}>▶</span>
        </button>
      </div>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {!readOnly && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-primary scale-125' : 'border-border'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <select
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="text-xs border border-input rounded px-2 py-1 bg-background text-card-alt"
              >
                <option value={1}>Thin</option>
                <option value={2}>Medium</option>
                <option value={4}>Thick</option>
              </select>
              <button type="button" onClick={handleUndo} className="text-muted-alt hover:text-card-alt" title="Undo"><Undo2 size={16} /></button>
              <button type="button" onClick={handleClear} className="text-muted-alt hover:text-destructive" title="Clear"><Trash2 size={16} /></button>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="xs"
                icon={<Save size={14} />}
                className="ml-auto"
              >
                {saving ? 'Saving...' : 'Save Drawing'}
              </Button>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full border border-border rounded bg-white cursor-crosshair touch-none"
            style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {drawingUrl && (
            <p className="text-xs text-muted-alt">Drawing saved. It will appear on the prescription.</p>
          )}
        </div>
      )}
    </section>
  );
});

export default DrawingCanvas;
