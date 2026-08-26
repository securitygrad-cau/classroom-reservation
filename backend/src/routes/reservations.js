import { Router } from "express";
import { prisma } from "../db.js";
import { isOverlapping, isValidSlotRange } from "../utils/timeSlots.js";
import { getAdminFromRequest } from "../utils/auth.js";

const router = Router();

// GET /api/reservations?date=2026-08-12
// 해당 날짜의 모든 예약(PENDING+APPROVED) 반환 → 시간표 렌더링용
// (REJECTED/CANCELLED는 화면에 표시할 필요 없으므로 제외)
//
// 개인정보 보호: 관리자 토큰이 없는 일반 요청은 이름/소속/연락처를 제외하고
// 상태(status)와 사용 목적(purpose)만 내려준다. 관리자 토큰이 있으면 전체 정보를 내려준다.
router.get("/", async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date 쿼리 파라미터가 필요합니다." });

  const isAdmin = !!getAdminFromRequest(req);

  const reservations = await prisma.reservation.findMany({
    where: { date, status: { in: ["PENDING", "APPROVED"] } },
    include: { room: true },
    orderBy: { startSlot: "asc" },
  });

  if (isAdmin) {
    return res.json(reservations);
  }

  // 일반 사용자용: 개인정보(이름/소속/연락처) 제거, 상태+목적만 노출
  const publicShaped = reservations.map((r) => ({
    id: r.id,
    roomId: r.roomId,
    date: r.date,
    startSlot: r.startSlot,
    endSlot: r.endSlot,
    status: r.status,
    purpose: r.purpose,
  }));
  res.json(publicShaped);
});

// POST /api/reservations - 예약 신청 (학생/교수/교직원 누구나)
// 상태는 항상 PENDING으로 생성됨 → 조교 승인 필요
router.post("/", async (req, res) => {
  const {
    roomId,
    date,
    startSlot,
    endSlot,
    requesterName,
    affiliation,
    department,
    purpose,
    contact,
  } = req.body;

  // 1) 입력 검증
  if (!roomId || !date || !requesterName || !affiliation || !department || !purpose || !contact) {
    return res.status(400).json({ error: "필수 항목이 누락되었습니다." });
  }
  if (!isValidSlotRange(startSlot, endSlot)) {
    return res.status(400).json({ error: "선택한 시간대가 올바르지 않습니다." });
  }

  // 2) 이미 '확정(APPROVED)'된 예약과 겹치는지만 막는다.
  //    PENDING끼리는 겹칠 수 있게 허용 → 조교가 우선순위(교수 요청 등)를 보고 직접 판단
  const confirmedInRoom = await prisma.reservation.findMany({
    where: { roomId, date, status: "APPROVED" },
  });
  const conflict = confirmedInRoom.some((r) =>
    isOverlapping(startSlot, endSlot, r.startSlot, r.endSlot)
  );
  if (conflict) {
    return res.status(409).json({ error: "이미 확정된 예약과 시간이 겹칩니다." });
  }

  // 3) 교수 요청은 우선순위 플래그 자동 부여 (조교가 승인 목록에서 우선 검토하도록)
  const isPriority = affiliation === "교수";

  const reservation = await prisma.reservation.create({
    data: {
      roomId,
      date,
      startSlot,
      endSlot,
      requesterName,
      affiliation,
      department,
      purpose,
      contact,
      isPriority,
      status: "PENDING",
    },
  });

  res.status(201).json(reservation);
});

export default router;
