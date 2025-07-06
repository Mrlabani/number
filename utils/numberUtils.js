export function extractNumbers(text) {
  const excluded = ['+92919982882']; // numbers to skip
  const lines = text.split('\n');
  return lines
    .map((l) => l.trim())
    .filter((l) => /^\+?\d{7,15}$/.test(l))
    .filter((l) => !excluded.includes(l));
}
