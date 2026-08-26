import React, { useEffect, useState } from "react";
import Timetable from "./components/Timetable.jsx";
import ReservationModal from "./components/ReservationModal.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import { createReservation, getReservations, getRooms } from "./api.js";

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const [tab, setTab] = useState("user"); // "user" | "admin"
  const [date, setDate] = useState(todayStr());
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selection, setSelection] = useState(null); // {roomId, startSlot, endSlot}
  const [modalOpen, setModalOpen] = useState(false);

  // 관리자 로그인 상태를 최상위(App)에서 관리한다.
  // → 시간표(예약 신청 탭)를 그릴 때도 로그인 여부를 알아야
  //   서버에 관리자 토큰을 같이 보내 상세 정보를 받아올 수 있기 때문.
  const [adminToken, setAdminToken] = useState(localStorage.getItem("adminToken") || "");

  useEffect(() => {
    getRooms().then(setRooms);
  }, []);

  useEffect(() => {
    loadReservations();
  }, [date, adminToken]);

  async function loadReservations() {
    const data = await getReservations(date, adminToken);
    setReservations(data);
  }

  // 셀 클릭: 첫 클릭은 시작점, 같은 강의실에서 두 번째 클릭은 범위를 확장
  function handleCellClick(roomId, slot) {
    if (!selection || selection.roomId !== roomId) {
      setSelection({ roomId, startSlot: slot, endSlot: slot + 1 });
      return;
    }
    const start = Math.min(selection.startSlot, slot);
    const end = Math.max(selection.endSlot, slot + 1);
    setSelection({ roomId, startSlot: start, endSlot: end });
  }

  async function handleSubmitReservation(form) {
    await createReservation({ ...form, ...selection, date });
    setSelection(null);
    setModalOpen(false);
    await loadReservations();
  }

  const selectedRoom = rooms.find((r) => r.id === selection?.roomId);

  return (
    <div className="max-w-5xl mx-auto p-4 pb-20">
      <h1 className="text-xl font-bold mb-4">산업보안학과/융합보안학과 강의실 예약</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("user")}
          className={`px-4 py-2 rounded ${tab === "user" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
        >
          예약 신청
        </button>
        <button
          onClick={() => setTab("admin")}
          className={`px-4 py-2 rounded ${tab === "admin" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
        >
          조교 승인 관리
        </button>
      </div>

      {tab === "user" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelection(null);
              }}
              className="border rounded px-3 py-1.5"
            />
            <div className="flex gap-3 text-xs items-center">
              <Legend color="bg-white border" label="신청 가능" />
              <Legend color="bg-yellow-200" label="승인 대기 중" />
              <Legend color="bg-red-300" label="예약 확정" />
              <Legend color="bg-blue-300" label="선택 중" />
            </div>
          </div>

          <Timetable
            rooms={rooms}
            reservations={reservations}
            selection={selection}
            onCellClick={handleCellClick}
          />

          {selection && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                선택한 시간대로 예약 신청하기
              </button>
            </div>
          )}

          {modalOpen && selection && (
            <ReservationModal
              roomName={selectedRoom?.name}
              startSlot={selection.startSlot}
              endSlot={selection.endSlot}
              onClose={() => setModalOpen(false)}
              onSubmit={handleSubmitReservation}
            />
          )}
        </>
      )}

      {tab === "admin" && (
        <AdminPanel
          adminToken={adminToken}
          setAdminToken={setAdminToken}
          onReservationChanged={loadReservations}
          rooms={rooms}
        />
      )}

      {/* 하단 고정 문의사항 안내 */}
      <footer className="fixed bottom-0 left-0 w-full bg-gray-800 text-white text-center text-sm py-2 z-40">
        문의사항: 산업보안학과/융합보안학과 사무실 (02-820-5730)
      </footer>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-3 h-3 rounded ${color}`} />
      {label}
    </span>
  );
}
