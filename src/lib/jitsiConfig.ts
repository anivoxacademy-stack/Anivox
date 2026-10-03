// Jitsi Meet Configuration and Utilities for Anivox Academy

export const JITSI_DOMAIN = 
  (import.meta.env && import.meta.env.VITE_JITSI_DOMAIN) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_JITSI_DOMAIN) ||
  'meet.jit.si';

/**
 * Generates a unique, unpredictable Jitsi room name for a live class session.
 * Pattern: anivox-{courseId}-{classId}-{randomSuffix}
 */
export function generateJitsiRoomName(courseId: string, classId: string): string {
  const cleanCourse = (courseId || 'course').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const cleanClass = (classId || 'class').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const randomSuffix = Math.random().toString(36).substring(2, 9) + Math.random().toString(36).substring(2, 6);
  return `anivox-${cleanCourse}-${cleanClass}-${randomSuffix}`;
}

/**
 * Helper to dynamically load the Jitsi External API script from the configured domain
 */
export function loadJitsiScript(domain: string = JITSI_DOMAIN): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).JitsiMeetExternalAPI) {
      resolve();
      return;
    }

    const scriptId = 'jitsi-external-api-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error(`Failed to load Jitsi Meet script from ${domain}`));
    document.body.appendChild(script);
  });
}
