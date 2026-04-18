'use client';
import { useRef, useState } from 'react';

interface Props {
  currentUrl: string;
  type: 'user' | 'club';
  id: string;
  size?: number;
  shape?: 'circle' | 'rect';
  onUploaded?: (url: string) => void;
}

export default function ImageUpload({ currentUrl, type, id, size = 80, shape = 'circle', onUploaded }: Props) {
  const [preview, setPreview] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [hovering, setHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setError('');
    setUploading(true);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    fd.append('id', id);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setPreview(data.url);
        onUploaded?.(data.url);
        setError('');
      } else {
        setError(data.error ?? 'Upload failed');
        setPreview(currentUrl); // revert
      }
    } catch {
      setError('Network error — please try again');
      setPreview(currentUrl);
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const borderRadius = shape === 'circle' ? '50%' : 10;
  const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        title="Click or drag to upload image"
        style={{
          width: size, height: size, borderRadius,
          cursor: uploading ? 'wait' : 'pointer',
          overflow: 'hidden', position: 'relative',
          border: `2px solid ${hovering && !uploading ? 'var(--purple-mid)' : 'var(--border)'}`,
          boxShadow: hovering && !uploading ? '0 0 0 3px rgba(147,51,234,0.15)' : '0 2px 8px var(--shadow)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          flexShrink: 0,
        }}
      >
        <img
          src={preview || fallback}
          alt="upload"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setPreview(fallback)}
        />
        {/* Hover/upload overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          opacity: uploading || hovering ? 1 : 0,
          transition: 'opacity 0.2s',
        }}>
          {uploading ? (
            <>
              <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: 'white', fontSize: 10, fontWeight: 600 }}>Uploading…</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 20 }}>📷</span>
              <span style={{ color: 'white', fontSize: 10, fontWeight: 600, textAlign: 'center', padding: '0 4px' }}>
                {shape === 'rect' ? 'Upload Image' : 'Upload'}
              </span>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />

      {/* Status text */}
      {uploading && (
        <span style={{ fontSize: 11, color: 'var(--purple-mid)', fontWeight: 600 }}>Uploading to cloud…</span>
      )}
      {error && (
        <div style={{
          maxWidth: Math.max(size, 160), padding: '6px 10px',
          background: 'rgba(248,113,113,0.12)', color: '#F87171',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 8, fontSize: 11, fontWeight: 500,
          textAlign: 'center', lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
