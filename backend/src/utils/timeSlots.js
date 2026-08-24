// 하루를 00:00~24:00, 30분 단위로 48개 슬롯으로 표현
export const SLOTS_PER_DAY = 48;

export function slotToTime(slot) {
  const totalMinutes = slot * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// 두 예약(slot 범위)이 겹치는지 확인
export function isOverlapping(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

export function isValidSlotRange(startSlot, endSlot) {
  return (
    Number.isInteger(startSlot) &&
    Number.isInteger(endSlot) &&
    startSlot >= 0 &&
    endSlot <= SLOTS_PER_DAY &&
    startSlot < endSlot
  );
}
