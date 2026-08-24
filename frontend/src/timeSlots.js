export const SLOTS_PER_DAY = 48;

export function slotToTime(slot) {
  const totalMinutes = slot * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export const ALL_SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);
