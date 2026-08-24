import React, { useMemo } from "react";
import { ALL_SLOTS, slotToTime } from "../timeSlots.js";

/**
 * 시간표 그리드
 * - 가로축: 강의실 (rooms)
 * - 세로축: 00:00 ~ 24:00, 30분 단위 (ALL_SLOTS)
 * - 셀 클릭으로 연속 시간대 선택 → 부모(App)가 선택 상태를 관리
 *
 * props
 *  rooms: [{id, name}]
 *  reservations: [{id, roomId, startSlot, endSlot, status, requesterName, purpose, isPriority}]
 *  selection: {roomId, startSlot, endSlot} | null
 *  onCellClick: (roomId, slot) => void
 */
export default function Timetable({ rooms, reservations, selection, onCellClick }) {
  // 빠른 조회를 위해 (roomId, slot) -> reservation 매핑 생성
  const cellMap = useMemo(() => {
    const map = new Map();
    for (const r of reservations) {
      for (let s = r.startSlot; s < r.endSlot; s++) {
        map.set(`${r.roomId}-${s}`, r);
      }
    }
    return map;
  }, [reservations]);

  function getCellStatus(roomId, slot) {
    // 현재 사용자가 선택 중인 셀인지 먼저 확인
    if (
      selection &&
      selection.roomId === roomId &&
      slot >= selection.startSlot &&
      slot < selection.endSlot
    ) {
      return { type: "SELECTING", reservation: null };
    }
    const res = cellMap.get(`${roomId}-${slot}`);
    if (!res) return { type: "EMPTY", reservation: null };
    return { type: res.status, reservation: res }; // PENDING | APPROVED
  }

  const cellStyle = {
    EMPTY: "bg-white hover:bg-gray-100 cursor-pointer",
    SELECTING: "bg-blue-300 cursor-pointer",
    PENDING: "bg-yellow-200 cursor-not-allowed",
    APPROVED: "bg-red-300 cursor-not-allowed",
  };

  return (
    <div className="overflow-auto border rounded-lg max-h-[70vh]">
      <table className="border-collapse w-full text-sm">
        <thead className="sticky top-0 bg-gray-50 z-10">
          <tr>
            <th className="border px-2 py-1 w-16 sticky left-0 bg-gray-50 z-20">시간</th>
            {rooms.map((room) => (
              <th key={room.id} className="border px-2 py-1 min-w-[120px]">
                {room.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="border px-2 py-1 text-xs text-gray-500 sticky left-0 bg-white z-10">
                {slotToTime(slot)}
              </td>
              {rooms.map((room) => {
                const { type, reservation } = getCellStatus(room.id, slot);
                // 관리자로 로그인한 상태로 응답을 받으면 서버가 requesterName 등 상세 정보를 포함해서 내려준다.
                // 그렇지 않으면(일반 사용자) 서버가 애초에 이름/소속/연락처를 빼고 내려주므로
                // 상태 텍스트 + 목적만 표시한다.
                const STATUS_LABEL = { PENDING: "승인 대기 중", APPROVED: "예약 확정" };
                const title = reservation
                  ? reservation.requesterName
                    ? `${reservation.requesterName} (${reservation.affiliation}) - ${reservation.purpose}${
                        reservation.isPriority ? " [교수 요청]" : ""
                      }`
                    : `${STATUS_LABEL[reservation.status] || reservation.status} - ${reservation.purpose}`
                  : "클릭하여 예약 신청";
                return (
                  <td
                    key={room.id}
                    title={title}
                    onClick={() => (type === "EMPTY" || type === "SELECTING") && onCellClick(room.id, slot)}
                    className={`border h-6 ${cellStyle[type]}`}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
