import { Router } from "express";
import bcrypt from "bcryptjs";
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
// cancelPasswordHash는 어떤 경우에도(관리자 포함) 응답에 포함하지 않는다.
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
    const shaped = reservations.map(({ cancelPasswordHash, ...r }) => r);
    return res.json(shaped);
  }

  // 일반 사용자용: 개인정보(이름/소속/연락처) 제거, 상태+목적만 노출
  // id는 유지 → 본인이 예약 취소를 신청할 때 어떤 예약인지 식별하는 용도로 필요
  const publicShaped = reservations.map((r) => ({
    id: r.id,
    roomId: r.roomId,
    date: r.date,
    startSlot: r.startSlot,
    endSlot: r.endSlot,
    status: r.status,
    purpose: r.purpose,
    hasCancelPassword: !!r.cancelPasswordHash, // 비밀번호 설정 여부만 알려줌(값 자체는 절대 노출 안 함)
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
    cancelPassword, // 선택 입력: 입력하면 본인이 나중에 이 비밀번호로 직접 취소 가능
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

  // 4) 취소용 비밀번호는 입력한 경우에만 해시로 저장 (평문 저장 절대 금지)
  const cancelPasswordHash = cancelPassword ? await bcrypt.hash(cancelPassword, 10) : null;

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
      cancelPasswordHash,
      isPriority,
      status: "PENDING",
    },
  });

  const { cancelPasswordHash: _omit, ...safeReservation } = reservation;
  res.status(201).json(safeReservation);
});

// POST /api/reservations/:id/cancel - 신청자 본인이 비밀번호로 직접 취소
// 관리자 로그인 없이도 호출 가능하지만, 예약 생성 시 설정해둔 비밀번호와 일치해야만 처리된다.
router.post("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body;

  const target = await prisma.reservation.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: "예약을 찾을 수 없습니다." });

  if (!["PENDING", "APPROVED"].includes(target.status)) {
    return res.status(400).json({ error: "이미 처리되었거나 취소된 예약입니다." });
  }

  if (!target.cancelPasswordHash) {
    return res
      .status(400)
      .json({ error: "이 예약은 취소용 비밀번호가 설정되어 있지 않습니다. 학과 사무실로 문의해주세요." });
  }

  const valid = await bcrypt.compare(password || "", target.cancelPasswordHash);
  if (!valid) {
    return res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
  }

  const cancelled = await prisma.reservation.update({
    where: { id },
    data: {
      status: "CANCELLED",
      reviewedAt: new Date(),
      reviewNote: "신청자 본인이 취소함",
    },
  });

  const { cancelPasswordHash: _omit, ...safeCancelled } = cancelled;
  res.json(safeCancelled);
});

export default router;
