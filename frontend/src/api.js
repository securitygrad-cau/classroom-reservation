const BASE = "https://classroom-reservation-backend.vercel.app/api";

export async function getRooms() {
  const res = await fetch(`${BASE}/rooms`);
  return res.json();
}

// token을 넘기면(관리자 로그인 상태) 서버가 예약자 상세 정보까지 포함해서 응답한다.
// token이 없으면 서버가 자동으로 상태/목적만 남기고 개인정보는 제외해서 응답한다.
export async function getReservations(date, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE}/reservations?date=${date}`, { headers });
  return res.json();
}

export async function createReservation(payload) {
  const res = await fetch(`${BASE}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "예약 신청에 실패했습니다.");
  return data;
}

// 신청자 본인이 비밀번호로 자신의 예약을 취소
export async function cancelReservationByUser(id, password) {
  const res = await fetch(`${BASE}/reservations/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "예약 취소에 실패했습니다.");
  return data;
}

export async function adminLogin(username, password) {
  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "로그인에 실패했습니다.");
  return data;
}

export async function getPendingReservations(token) {
  const res = await fetch(`${BASE}/admin/reservations?status=PENDING`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function approveReservation(token, id) {
  const res = await fetch(`${BASE}/admin/reservations/${id}/approve`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function rejectReservation(token, id, reviewNote) {
  const res = await fetch(`${BASE}/admin/reservations/${id}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reviewNote }),
  });
  return res.json();
}

// status를 지정해서 관리자용 예약 목록을 조회 (예: "APPROVED" → 확정된 예약 목록)
export async function getReservationsByStatus(token, status, filters = {}) {
  const params = new URLSearchParams({ status });
  if (filters.month) params.set("month", filters.month);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const res = await fetch(`${BASE}/admin/reservations?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// 이미 확정된 예약을 취소 처리 (관리자용)
export async function cancelReservation(token, id, reviewNote) {
  const res = await fetch(`${BASE}/admin/reservations/${id}/cancel`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reviewNote }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "예약 취소에 실패했습니다.");
  return data;
}
