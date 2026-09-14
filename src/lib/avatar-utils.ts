/**
 * Utility functions for user avatars and Google profile photos.
 */

/**
 * Converts a Google profile image URL from standard thumbnail resolution (=s96-c)
 * to high-definition resolution (=s400-c).
 *
 * @param url The raw Google profile photo URL
 * @returns High-resolution image URL or null if empty
 */
export function getHighResGooglePhoto(url?: string | null): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return null;
  }

  const trimmed = url.trim();

  // If it's a Google user content URL
  if (trimmed.includes('googleusercontent.com')) {
    // Replace existing size parameters like =s96-c, =s96, =s120-c, etc. with =s400-c
    if (/=s\d+(-c)?/.test(trimmed)) {
      return trimmed.replace(/=s\d+(-c)?/g, '=s400-c');
    }
    // If it has query parameters
    if (trimmed.includes('?')) {
      return `${trimmed}&sz=400`;
    }
    // Default append =s400-c
    return `${trimmed}=s400-c`;
  }

  return trimmed;
}

/**
 * Extracts initials from a user's display name or email.
 */
export function getUserInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().substring(0, 2).toUpperCase();
  }
  return 'U';
}
