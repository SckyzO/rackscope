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

export const useAvatar = () => {
  const [avatar, setAvatar] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AVATAR_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        setAvatar(localStorage.getItem(AVATAR_KEY));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(AVATAR_EVENT, sync);
    return () => window.removeEventListener(AVATAR_EVENT, sync);
  }, []);

  const updateAvatar = (dataUrl: string | null) => {
    try {
      if (dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl);
      else localStorage.removeItem(AVATAR_KEY);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(AVATAR_EVENT));
  };

  return { avatar, updateAvatar };
};
