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
    { key: 'Esc', desc: 'Cancel / Deselect' },
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
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '460px',
          padding: '24px',
          backgroundColor: '#121622',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700 }}>
            <Command size={18} color="var(--primary)" />
            Keyboard Shortcuts
          </div>
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
  );
};
