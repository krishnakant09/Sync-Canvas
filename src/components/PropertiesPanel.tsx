import React from 'react';
import {
  Trash2,
  Copy,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { CanvasElement } from '../types/canvas';

interface PropertiesPanelProps {
  selectedElements: CanvasElement[];
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElements: () => void;
  onDuplicateElements: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
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
  selectedElements,
  onUpdateElement,
  onDeleteElements,
  onDuplicateElements,
  onBringToFront,
  onSendToBack,
}) => {
  if (selectedElements.length === 0) return null;

  const firstElem = selectedElements[0];
  const isMulti = selectedElements.length > 1;
  const isSticky = firstElem.type === 'sticky';
  const hasText = firstElem.type === 'text' || firstElem.type === 'sticky';

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    selectedElements.forEach((el) => {
      onUpdateElement(el.id, updates);
    });
  };

  return (
    <aside
      className="glass-panel animate-fade-in"
      aria-label="Element Properties"
      style={{
        position: 'absolute',
        top: '76px',
        left: '24px',
        width: '260px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        zIndex: 40,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          {isMulti ? `${selectedElements.length} Items Selected` : `${firstElem.type.toUpperCase()}`}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="icon-btn"
            style={{ width: '28px', height: '28px' }}
            onClick={onDuplicateElements}
            data-tooltip="Duplicate (Ctrl+D)"
          >
            <Copy size={14} />
          </button>
          <button
            className="icon-btn"
            style={{ width: '28px', height: '28px', color: 'var(--accent-rose)' }}
            onClick={onDeleteElements}
            data-tooltip="Delete (Del)"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

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
              />
            ))}
          </div>
        </div>
      )}

      {/* Stroke Width & Style */}
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
    </aside>
  );
};
