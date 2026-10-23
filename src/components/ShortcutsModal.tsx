import React from 'react';
import { X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'V', desc: 'Select Tool' },
    { key: 'H / Space', desc: 'Hand / Pan Tool' },
    { key: 'R', desc: 'Rectangle Tool' },
    { key: 'O', desc: 'Circle / Ellipse Tool' },
    { key: 'S', desc: 'Sticky Note Tool' },
    { key: 'T', desc: 'Text Tool' },
    { key: 'A', desc: 'Arrow Tool' },
    { key: 'P', desc: 'Freehand Pen Tool' },
    { key: 'E', desc: 'Eraser Tool' },
    { key: 'Ctrl + Z', desc: 'Undo' },
    { key: 'Ctrl + Y / Shift+Z', desc: 'Redo' },
    { key: 'Ctrl + D', desc: 'Duplicate Selected' },
    { key: 'Del / Backspace', desc: 'Delete Selected' },
    { key: 'Ctrl + Scroll', desc: 'Zoom In / Out' },
    { key: 'Shift + Click', desc: 'Multi-select Elements' },
    { key: '/', desc: 'Cursor Chat (Live Talk)' },
    { key: 'Esc', desc: 'Cancel / Deselect' },
  ];

  const touchGestures = [
    { gesture: 'Two-finger Pinch', desc: 'Zoom In / Zoom Out smoothly' },
    { gesture: 'Two-finger Drag', desc: 'Pan canvas in any direction' },
    { gesture: 'One-finger Drag', desc: 'Draw, select, or create shapes' },
    { gesture: 'Double Tap', desc: 'Edit text / sticky note' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '20px',
          backgroundColor: '#121622',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700 }}>
            <Command size={18} color="var(--primary)" />
            Controls & Gestures Guide
          </div>
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Mobile Touch Gestures */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            📱 Mobile & Touch Gestures
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
            {touchGestures.map((tg) => (
              <div
                key={tg.gesture}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(6, 182, 212, 0.06)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tg.desc}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {tg.gesture}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            ⌨️ Keyboard Shortcuts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            {shortcuts.map((s) => (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.desc}</span>
                <kbd
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: 'var(--text-main)',
                  }}
                >
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
