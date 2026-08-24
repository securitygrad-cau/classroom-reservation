import React, { useEffect, useMemo, useState } from "react";
import {
  adminLogin,
  approveReservation,
  cancelReservation,
  getPendingReservations,
  getReservationsByStatus,
  rejectReservation,
} from "../api.js";
import { slotToTime } from "../timeSlots.js";

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 현재 날짜의 ISO 주차 문자열 ("YYYY-Www") 계산
function currentWeekStr() {
  const d = new Date();
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // 월요일=0
  target.setDate(target.getDate() - dayNr + 3); // 그 주의 목요일로 이동
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// "YYYY-Www" 형식의 주차 문자열 → 해당 주의 월요일~일요일 날짜 범위("YYYY-MM-DD")로 변환
function getWeekRange(weekStr) {
  const [yearStr, weekPart] = weekStr.split("-W");
  const year = Number(yearStr);
  const week = Number(weekPart);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - dow + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday) };
}

// adminToken/setAdminToken을 App에서 받아 사용한다.
// rooms: App이 이미 불러온 강의실 목록 (필터 체크박스 렌더링용)
export default function AdminPanel({ adminToken, setAdminToken, onReservationChanged, rooms = [] }) {
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(false);

  // 확정된 예약 필터: "month"(월별) | "week"(주별)
  const [filterMode, setFilterMode] = useState("month");
  const [monthValue, setMonthValue] = useState(currentMonthStr());
  const [weekValue, setWeekValue] = useState(currentWeekStr());

  // 강의실 다중 선택 필터 (기본값: 전체 선택)
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  useEffect(() => {
    if (rooms.length > 0 && selectedRoomIds.length === 0) {
      setSelectedRoomIds(rooms.map((r) => r.id));
    }
  }, [rooms]);

  function toggleRoom(roomId) {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  }

  useEffect(() => {
    if (adminToken) loadAll();
  }, [adminToken, filterMode, monthValue, weekValue]);

  async function loadAll() {
    setLoading(true);
    const approvedFilters =
      filterMode === "week" ? getWeekRange(weekValue) : { month: monthValue };
    const [pendingList, approvedList] = await Promise.all([
      getPendingReservations(adminToken),
      getReservationsByStatus(adminToken, "APPROVED", approvedFilters),
    ]);
    setPending(Array.isArray(pendingList) ? pendingList : []);
    setApproved(Array.isArray(approvedList) ? approvedList : []);
    setLoading(false);
  }

  // 선택된 강의실만 남긴 뒤, 날짜별로 묶어서 보여주기 위한 그룹핑 (날짜 오름차순은 서버에서 이미 정렬되어 옴)
  const approvedByDate = useMemo(() => {
    const filtered = approved.filter((r) => selectedRoomIds.includes(r.roomId));
    const groups = {};
    for (const r of filtered) {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    }
    return Object.entries(groups); // [ [date, [reservations...]], ... ]
  }, [approved, selectedRoomIds]);

  const filteredCount = useMemo(
    () => approved.filter((r) => selectedRoomIds.includes(r.roomId)).length,
    [approved, selectedRoomIds]
  );

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const { token: t } = await adminLogin(loginForm.username, loginForm.password);
      localStorage.setItem("adminToken", t);
      setAdminToken(t);
    } catch (err) {
      setLoginError(err.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("adminToken");
    setAdminToken("");
  }

  async function handleApprove(id) {
    await approveReservation(adminToken, id);
    await loadAll();
    onReservationChanged?.();
  }

  async function handleReject(id) {
    const note = window.prompt("거절 사유를 입력하세요 (선택):", "");
    await rejectReservation(adminToken, id, note || undefined);
    await loadAll();
    onReservationChanged?.();
  }

  async function handleCancel(id) {
    const ok = window.confirm("이미 확정된 예약입니다. 정말 취소하시겠습니까?");
    if (!ok) return;
    const note = window.prompt("취소 사유를 입력하세요 (선택):", "");
    try {
      await cancelReservation(adminToken, id, note || undefined);
      await loadAll();
      onReservationChanged?.();
    } catch (err) {
      alert(err.message);
    }
  }

  if (!adminToken) {
    return (
      <form onSubmit={handleLogin} className="max-w-sm mx-auto mt-10 space-y-3">
        <h2 className="text-lg font-bold">조교 로그인</h2>
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="아이디"
          value={loginForm.username}
          onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="비밀번호"
          value={loginForm.password}
          onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
        />
        {loginError && <p className="text-sm text-red-500">{loginError}</p>}
        <button className="w-full bg-blue-600 text-white rounded px-3 py-2">로그인</button>
      </form>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <button onClick={handleLogout} className="text-sm text-gray-500 underline">
          로그아웃
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">불러오는 중...</p>}

      {/* 승인 대기 목록 */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">승인 대기 목록 ({pending.length}건)</h2>
        {pending.map((r) => (
          <div
            key={r.id}
            className={`border rounded-lg p-3 flex justify-between items-center ${
              r.isPriority ? "border-red-400 bg-red-50" : ""
            }`}
          >
            <div className="text-sm">
              {r.isPriority && (
                <span className="inline-block text-xs bg-red-500 text-white rounded px-2 py-0.5 mr-2">
                  교수 요청
                </span>
              )}
              <span className="font-semibold">{r.room.name}</span> · {r.date} ·{" "}
              {slotToTime(r.startSlot)}~{slotToTime(r.endSlot)}
              <br />
              {r.requesterName} ({r.affiliation}
              {r.department ? `, ${r.department}` : ""}) - {r.purpose}
              <br />
              <span className="text-gray-500">연락처: {r.contact}</span>
            </div>
            <div className="flex gap-2 shrink-0 ml-3">
              <button
                onClick={() => handleApprove(r.id)}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm"
              >
                승인
              </button>
              <button
                onClick={() => handleReject(r.id)}
                className="px-3 py-1.5 bg-gray-300 rounded text-sm"
              >
                거절
              </button>
            </div>
          </div>
        ))}
        {!loading && pending.length === 0 && (
          <p className="text-sm text-gray-400">승인 대기 중인 예약이 없습니다.</p>
        )}
      </div>

      {/* 확정된 예약 목록 (월별/주별 필터 + 날짜별 그룹, 취소 가능) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold">확정된 예약 ({filteredCount}건)</h2>

          <div className="flex items-center gap-2">
            {/* 월별/주별 토글 */}
            <div className="flex border rounded overflow-hidden text-sm">
              <button
                onClick={() => setFilterMode("month")}
                className={`px-3 py-1 ${filterMode === "month" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              >
                월별
              </button>
              <button
                onClick={() => setFilterMode("week")}
                className={`px-3 py-1 ${filterMode === "week" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              >
                주별
              </button>
            </div>

            {filterMode === "month" ? (
              <>
                <input
                  type="month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => setMonthValue(currentMonthStr())}
                  className="text-sm text-blue-600 underline"
                >
                  이번 달
                </button>
              </>
            ) : (
              <>
                <input
                  type="week"
                  value={weekValue}
                  onChange={(e) => setWeekValue(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => setWeekValue(currentWeekStr())}
                  className="text-sm text-blue-600 underline"
                >
                  이번 주
                </button>
              </>
            )}
          </div>
        </div>

        {/* 강의실 다중 선택 필터 */}
        <div className="flex items-center gap-3 flex-wrap text-sm bg-gray-50 border rounded px-3 py-2">
          <span className="text-gray-500">강의실:</span>
          {rooms.map((room) => (
            <label key={room.id} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRoomIds.includes(room.id)}
                onChange={() => toggleRoom(room.id)}
              />
              {room.name}
            </label>
          ))}
          <button
            onClick={() => setSelectedRoomIds(rooms.map((r) => r.id))}
            className="text-blue-600 underline ml-2"
          >
            전체 선택
          </button>
          <button onClick={() => setSelectedRoomIds([])} className="text-gray-500 underline">
            전체 해제
          </button>
        </div>

        {approvedByDate.map(([date, items]) => (
          <div key={date} className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-600 border-b pb-1">{date}</h3>
            {items.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 flex justify-between items-center">
                <div className="text-sm">
                  <span className="font-semibold">{r.room.name}</span> ·{" "}
                  {slotToTime(r.startSlot)}~{slotToTime(r.endSlot)}
                  <br />
                  {r.requesterName} ({r.affiliation}
                  {r.department ? `, ${r.department}` : ""}) - {r.purpose}
                  <br />
                  <span className="text-gray-500">연락처: {r.contact}</span>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <button
                    onClick={() => handleCancel(r.id)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-sm"
                  >
                    예약 취소
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {!loading && filteredCount === 0 && (
          <p className="text-sm text-gray-400">선택한 조건에 확정된 예약이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
