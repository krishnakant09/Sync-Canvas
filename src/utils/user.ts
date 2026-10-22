import type { UserProfile } from '../types/canvas';

const USER_COLORS = [
  '#6366f1', // Electric Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

const ADJECTIVES = ['Curious', 'Swift', 'Cosmic', 'Bright', 'Clever', 'Electric', 'Noble', 'Brave', 'Astral', 'Zen'];
const ANIMALS = ['Falcon', 'Otter', 'Panda', 'Fox', 'Cheetah', 'Eagle', 'Koala', 'Lynx', 'Dolphin', 'Tiger'];

export function getRandomProfile(): UserProfile {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  const id = `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  return {
    id,
    name: `${adj} ${animal}`,
    color,
  };
}

const STORAGE_KEY = 'sync_canvas_user_profile';

export function getStoredUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }

  const generated = getRandomProfile();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(generated));
  } catch (e) {
    // ignore
  }
  return generated;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    // ignore
  }
}

export { USER_COLORS };
