import React, { useState } from 'react';
import { X, User, Check } from 'lucide-react';
import type { UserProfile } from '../types/canvas';
import { USER_COLORS, saveUserProfile } from '../utils/user';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

const UserProfileDialog: React.FC<{
  currentProfile: UserProfile;
  onClose: () => void;
  onSaveProfile: (profile: UserProfile) => void;
}> = ({ currentProfile, onClose, onSaveProfile }) => {
  const [name, setName] = useState(currentProfile.name);
  const [color, setColor] = useState(currentProfile.color);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updated: UserProfile = {
      ...currentProfile,
      name: name.trim(),
      color,
    };
    saveUserProfile(updated);
    onSaveProfile(updated);
    onClose();
  };

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
          width: '400px',
          padding: '24px',
          backgroundColor: '#121622',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700 }}>
            <User size={18} color={color} />
            Collaborator Profile
          </div>
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name Field */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Your Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Alex / Krishna"
              style={{ width: '100%', height: '38px', fontSize: '14px' }}
              maxLength={30}
              required
            />
          </div>

          {/* Color Picker */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              Your Cursor & Selection Color
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
              {USER_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: c,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: color === c ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: color === c ? `0 0 12px ${c}` : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {color === c && <Check size={16} color="#ffffff" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Box */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                color: '#ffffff',
              }}
            >
              {name.trim() ? name.trim()[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                {name.trim() || 'Anonymous'} (Preview)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Visible to all collaborators in this room
              </div>
            </div>
          </div>

          <button
            type="submit"
            style={{
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              marginTop: '4px',
              boxShadow: '0 4px 12px var(--primary-glow)',
            }}
          >
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSaveProfile,
}) => {
  if (!isOpen) return null;
  return (
    <UserProfileDialog
      currentProfile={currentProfile}
      onClose={onClose}
      onSaveProfile={onSaveProfile}
    />
  );
};
