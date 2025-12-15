// Guest mode: Device ID stored in localStorage (no auth in Stage 1)

const DEVICE_ID_KEY = 'unwalk-device-id';

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate UUID v4
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
}

export function getGuestDisplayName(): string {
  const deviceId = getDeviceId();
  // Take last 4 characters of device ID for display name
  const suffix = deviceId.slice(-4);
  return `Guest_${suffix}`;
}
