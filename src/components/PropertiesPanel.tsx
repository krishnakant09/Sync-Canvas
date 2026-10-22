import React from 'react';
import {
  Trash2,
  Copy,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sliders,
  X,
} from 'lucide-react';
import type { CanvasElement } from '../types/canvas';

interface PropertiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElements: CanvasElement[];
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElements: () => void;
  onDuplicateElements: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  isMobile?: boolean;
}

const FILL_PALETTE = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'Slate', value: '#1e293b' },
  { name: 'Indigo', value: '#4338ca' },
  { name: 'Cyan', value: '#0891b2' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Purple', value: '#7c3aed' },
];

const STICKY_PALETTE = [
  { name: 'Canary Yellow', value: '#fef08a' },
  { name: 'Pastel Mint', value: '#bbf7d0' },
  { name: 'Coral Pink', value: '#fecdd3' },
  { name: 'Sky Blue', value: '#bae6fd' },
  { name: 'Lavender', value: '#e9d5ff' },
  { name: 'Paper White', value: '#f8fafc' },
];

const STROKE_PALETTE = [
  { name: 'White', value: '#ffffff' },
  { name: 'Slate', value: '#94a3b8' },
  { name: 'Indigo', value: '#818cf8' },
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Amber', value: '#fbbf24' },
  { name: 'Rose', value: '#fb7185' },
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  isOpen,
  onClose,
  selectedElements,
  onUpdateElement,
  onDeleteElements,
  onDuplicateElements,
  onBringToFront,
  onSendToBack,
  isMobile = false,
}) => {
  // Never render automatically if the drawer is closed
  if (!isOpen) return null;

  const hasSelection = selectedElements.length > 0;
  const firstElem = selectedElements[0];
  const isMulti = selectedElements.length > 1;
  const isSticky = hasSelection && firstElem.type === 'sticky';
  const hasText = hasSelection && (firstElem.type === 'text' || firstElem.type === 'sticky');

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    selectedElements.forEach((el) => {
      onUpdateElement(el.id, updates);
    });
  };

  return (
    <aside
      className="glass-panel animate-fade-in"
      role="complementary"
      aria-label="Style and Properties Drawer"
      style={{
        position: 'absolute',
        top: isMobile ? '56px' : '68px',
        left: isMobile ? '12px' : '20px',
        width: isMobile ? 'calc(100vw - 24px)' : '270px',
        maxWidth: isMobile ? '340px' : '270px',
        padding: isMobile ? '12px' : '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '10px' : '14px',
        zIndex: 45,
        maxHeight: isMobile ? '65vh' : 'calc(100vh - 120px)',
        overflowY: 'auto',
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
      }}
    >
      {/* Drawer Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sliders size={14} color="var(--primary)" />
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)' }}>
            {hasSelection
              ? isMulti
                ? `${selectedElements.length} Items Selected`
                : `${firstElem.type.toUpperCase()}`
              : 'Style & Properties'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {hasSelection && (
            <>
              <button
                className="icon-btn"
                style={{ width: '28px', height: '28px' }}
                onClick={onDuplicateElements}
                data-tooltip="Duplicate (Ctrl+D)"
                aria-label="Duplicate"
              >
                <Copy size={14} />
              </button>
              <button
                className="icon-btn"
                style={{ width: '28px', height: '28px', color: 'var(--accent-rose)' }}
                onClick={onDeleteElements}
                data-tooltip="Delete (Del)"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}

          {/* Close Drawer Button */}
          <button
            className="icon-btn"
            style={{ width: '28px', height: '28px' }}
            onClick={onClose}
            data-tooltip="Close Drawer"
            aria-label="Close Drawer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Case 1: Empty Selection Guide */}
      {!hasSelection ? (
        <div style={{ textAlign: 'center', padding: '14px 6px', color: 'var(--text-muted)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
          >
            <Sliders size={18} color="var(--primary)" />
          </div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', marginBottom: '4px' }}>
            No Element Selected
          </div>
          <div style={{ fontSize: '12px', lineHeight: '1.45', color: 'var(--text-dim)', marginBottom: '14px' }}>
            Click on any shape, line, text, or note on the canvas to inspect and customize its properties.
          </div>

          <div style={{ textAlign: 'left', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Swatches
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginTop: '6px' }}>
              {STROKE_PALETTE.map((c) => (
                <div
                  key={c.value}
                  style={{
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: c.value,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: Selected Element Styling Controls */
        <>
          {/* Color / Fill */}
          {isSticky ? (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Note Color
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                {STICKY_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => handleUpdate({ fill: c.value })}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      backgroundColor: c.value,
                      border: firstElem.fill === c.value ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.15)',
                      boxShadow: firstElem.fill === c.value ? '0 0 8px var(--primary-glow)' : 'none',
                    }}
                    data-tooltip={c.name}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>
          ) : (
            firstElem.type !== 'draw' && firstElem.type !== 'arrow' && firstElem.type !== 'text' && (
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Fill Color
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {FILL_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => handleUpdate({ fill: c.value })}
                      style={{
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: c.value === 'transparent' ? 'transparent' : c.value,
                        border: firstElem.fill === c.value ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        backgroundImage: c.value === 'transparent' ? 'linear-gradient(45deg, #222 25%, transparent 25%, transparent 75%, #222 75%), linear-gradient(45deg, #222 25%, transparent 25%, transparent 75%, #222 75%)' : 'none',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 4px 4px',
                      }}
                      data-tooltip={c.name}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
            )
          )}

          {/* Stroke Color */}
          {!isSticky && (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                {firstElem.type === 'text' ? 'Text Color' : 'Stroke Color'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {STROKE_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => handleUpdate(firstElem.type === 'text' ? { stroke: c.value, textColor: c.value } : { stroke: c.value })}
                    style={{
                      height: '24px',
                      borderRadius: '6px',
                      backgroundColor: c.value,
                      border: firstElem.stroke === c.value ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                    data-tooltip={c.name}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stroke Width */}
          {firstElem.type !== 'sticky' && firstElem.type !== 'text' && (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Stroke Width
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 4, 8].map((w) => (
                  <button
                    key={w}
                    className={`icon-btn ${firstElem.strokeWidth === w ? 'active' : ''}`}
                    style={{ flex: 1, height: '30px', fontSize: '12px', fontWeight: 600 }}
                    onClick={() => handleUpdate({ strokeWidth: w })}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Typography settings for Text & Sticky */}
          {hasText && (
            <>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Font Size
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[14, 18, 24, 32].map((s) => (
                    <button
                      key={s}
                      className={`icon-btn ${firstElem.fontSize === s ? 'active' : ''}`}
                      style={{ flex: 1, height: '30px', fontSize: '12px', fontWeight: 600 }}
                      onClick={() => handleUpdate({ fontSize: s })}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Alignment
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      className={`icon-btn ${firstElem.textAlign === align ? 'active' : ''}`}
                      style={{ flex: 1, height: '30px' }}
                      onClick={() => handleUpdate({ textAlign: align })}
                      aria-label={`Align ${align}`}
                    >
                      {align === 'left' && <AlignLeft size={14} />}
                      {align === 'center' && <AlignCenter size={14} />}
                      {align === 'right' && <AlignRight size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Opacity Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Opacity</label>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                {Math.round(firstElem.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={firstElem.opacity}
              onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
          </div>

          {/* Layer Ordering */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Layering
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="icon-btn"
                style={{ flex: 1, height: '32px', fontSize: '12px', gap: '6px' }}
                onClick={onBringToFront}
              >
                <ArrowUpToLine size={14} /> Front
              </button>
              <button
                className="icon-btn"
                style={{ flex: 1, height: '32px', fontSize: '12px', gap: '6px' }}
                onClick={onSendToBack}
              >
                <ArrowDownToLine size={14} /> Back
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
