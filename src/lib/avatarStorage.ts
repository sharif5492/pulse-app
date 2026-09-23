/**
 * Avatar Persistence & Optimization Service
 * Ensures user-selected/uploaded profile pictures persist across app restarts,
 * device closes, and session refreshes without reverting to AI/default avatars.
 */

const DB_NAME = 'pulse_app_storage';
const DB_STORE = 'user_avatars';

// Initialize IndexedDB helper for secondary indestructible storage
function openAvatarDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Optimizes an avatar file or dataURL to a high-resolution, lightweight standard (512x512)
 * so it saves safely within localStorage without hitting browser storage quotas.
 */
export async function optimizeAvatarImage(
  input: File | Blob | string,
  maxWidth = 512,
  maxHeight = 512,
  quality = 0.88
): Promise<string> {
  if (typeof window === 'undefined') {
    return typeof input === 'string' ? input : '';
  }

  // If input is a remote HTTP URL (not a base64 or file), return as is
  if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
    return input;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const finalizeFromImage = () => {
      try {
        let width = img.width || maxWidth;
        let height = img.height || maxHeight;

        // Crop / scale to square with max dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(typeof input === 'string' ? input : '');
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Avatar canvas optimization notice:', err);
        resolve(typeof input === 'string' ? input : '');
      }
    };

    img.onload = finalizeFromImage;
    img.onerror = () => {
      resolve(typeof input === 'string' ? input : '');
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          img.src = reader.result;
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Saves the exact user profile picture to persistent storage.
 */
export async function savePersistentAvatar(userId: string, avatarUrl: string): Promise<void> {
  if (typeof window === 'undefined' || !avatarUrl) return;

  try {
    // 1. Save user-specific and current avatar keys in localStorage
    if (userId) {
      localStorage.setItem(`pulse_user_avatar_${userId}`, avatarUrl);
      localStorage.setItem(`pulse_has_custom_avatar_${userId}`, 'true');
    }
    localStorage.setItem('pulse_user_avatar', avatarUrl);
    localStorage.setItem('pulse_has_custom_avatar', 'true');

    // 2. Also update cached profile in localStorage if present
    const profileKey = `pulse_profile_${userId}`;
    const rawProfile = localStorage.getItem(profileKey);
    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile);
        parsed.avatar = avatarUrl;
        parsed.avatar_url = avatarUrl;
        localStorage.setItem(profileKey, JSON.stringify(parsed));
      } catch {
        // ignore
      }
    }

    // 3. Update pulse_current_user in localStorage if present
    const rawCurrentUser = localStorage.getItem('pulse_current_user');
    if (rawCurrentUser) {
      try {
        const parsed = JSON.parse(rawCurrentUser);
        parsed.avatar = avatarUrl;
        localStorage.setItem('pulse_current_user', JSON.stringify(parsed));
      } catch {
        // ignore
      }
    }

    // 4. Save to IndexedDB for resilient offline backup
    const db = await openAvatarDb();
    if (db) {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      if (userId) {
        store.put(avatarUrl, `avatar_${userId}`);
      }
      store.put(avatarUrl, 'avatar_current');
    }
  } catch (err) {
    console.warn('savePersistentAvatar notice:', err);
  }
}

/**
 * Retrieves the saved persistent avatar for a user or current user.
 */
export function getPersistentAvatar(userId?: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Try user-specific avatar key
    if (userId) {
      const userAvatar = localStorage.getItem(`pulse_user_avatar_${userId}`);
      if (userAvatar && userAvatar.trim().length > 0) {
        return userAvatar;
      }
      // Try cached profile avatar
      const rawProfile = localStorage.getItem(`pulse_profile_${userId}`);
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile);
        if (parsed.avatar && typeof parsed.avatar === 'string' && parsed.avatar.trim().length > 0) {
          return parsed.avatar;
        }
      }
    }

    // 2. Try generic pulse_user_avatar
    const genericAvatar = localStorage.getItem('pulse_user_avatar');
    if (genericAvatar && genericAvatar.trim().length > 0) {
      return genericAvatar;
    }

    // 3. Try pulse_current_user
    const rawCurrentUser = localStorage.getItem('pulse_current_user');
    if (rawCurrentUser) {
      const parsed = JSON.parse(rawCurrentUser);
      if (parsed.avatar && typeof parsed.avatar === 'string' && parsed.avatar.trim().length > 0) {
        return parsed.avatar;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Checks if the user has explicitly selected or uploaded a profile picture.
 */
export function hasUserSelectedAvatar(userId?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (userId && localStorage.getItem(`pulse_has_custom_avatar_${userId}`) === 'true') {
      return true;
    }
    if (localStorage.getItem('pulse_has_custom_avatar') === 'true') {
      return true;
    }
    const avatar = getPersistentAvatar(userId);
    return Boolean(avatar);
  } catch {
    return false;
  }
}
