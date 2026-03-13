import { useState, useEffect } from 'react';

const AVATAR_KEY = 'rackscope.auth.avatar';
const AVATAR_EVENT = 'rackscope:avatar:change';

/** Resize + center-crop image file to a square JPEG data URL. */
export const resizeAvatar = (file: File, size = 128): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        // Center-crop to square
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

const _localSet = (dataUrl: string | null) => {
  try {
    if (dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl);
    else localStorage.removeItem(AVATAR_KEY);
  } catch { /* ignore */ }
};

export const useAvatar = () => {
  // Initialise from localStorage for instant display (optimistic cache)
  const [avatar, setAvatar] = useState<string | null>(() => {
    try { return localStorage.getItem(AVATAR_KEY); } catch { return null; }
  });

  // On mount: fetch server-side avatar so it survives browser changes
  useEffect(() => {
    fetch('/api/auth/avatar')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const serverAvatar: string | null = data.avatar ?? null;
        setAvatar(serverAvatar);
        _localSet(serverAvatar);
        window.dispatchEvent(new Event(AVATAR_EVENT));
      })
      .catch(() => { /* network unavailable — keep localStorage value */ });
  }, []);

  // Sync across tabs / components within the same browser session
  useEffect(() => {
    const sync = () => {
      try { setAvatar(localStorage.getItem(AVATAR_KEY)); } catch { /* ignore */ }
    };
    window.addEventListener(AVATAR_EVENT, sync);
    return () => window.removeEventListener(AVATAR_EVENT, sync);
  }, []);

  const updateAvatar = async (dataUrl: string | null): Promise<void> => {
    // Optimistic local update for instant UI feedback
    setAvatar(dataUrl);
    _localSet(dataUrl);
    window.dispatchEvent(new Event(AVATAR_EVENT));

    // Persist to server
    try {
      await fetch('/api/auth/avatar', {
        method: dataUrl ? 'PUT' : 'DELETE',
        headers: dataUrl ? { 'Content-Type': 'application/json' } : undefined,
        body: dataUrl ? JSON.stringify({ avatar: dataUrl }) : undefined,
      });
    } catch {
      /* server unavailable — localStorage copy remains as fallback */
    }
  };

  return { avatar, updateAvatar };
};
