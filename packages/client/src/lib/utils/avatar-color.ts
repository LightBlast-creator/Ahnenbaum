/** Deterministic HSL gradient from a name string */
export function avatarGradient(name: string): string {
  const hash = simpleHash(name);
  const hue = hash % 360;
  const hue2 = (hue + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 55%, 50%), hsl(${hue2}, 55%, 40%))`;
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
