import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { isOverlapping } from "../utils/timeSlots.js";
import { JWT_SECRET, getAdminFromRequest } from "../utils/auth.js";

const router = Router();

// 관리자 인증 미들웨어 (반드시 로그인 필요한 라우트에서 사용)
function requireAdmin(req, res, next) {
  const admin = getAdminFromRequest(req);
  if (!admin) return res.status(401).json({ error: "로그인이 필요합니다." });
  req.admin = admin;
  next();
}

// POST /api/admin/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) return res.status(401).json({ error: "아이디 또는 비밀번호가 틀렸습니다." });

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return res.status(401).json({ error: "아이디 또는 비밀번호가 틀렸습니다." });

  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, {
    expiresIn: "12h",
  });
  res.json({ token, name: admin.name });
});

// GET /api/admin/reservations?status=PENDING
// GET /api/admin/reservations?status=APPROVED&month=2026-08        ← 월 단위 필터링
// GET /api/admin/reservations?status=APPROVED&from=2026-08-11&to=2026-08-17  ← 주 단위 등 날짜 범위 필터링
// 승인 대기 목록은 교수 요청(isPriority)을 먼저 보여주고, 확정 목록은 날짜순으로 보여준다.
router.get("/reservations", requireAdmin, async (req, res) => {
  const status = req.query.status || "PENDING";
  const { month, from, to } = req.query; // month: "YYYY-MM", from/to: "YYYY-MM-DD"

  const where = { status };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  } else if (month) {
    where.date = { startsWith: month }; // date는 "YYYY-MM-DD" 문자열로 저장되어 있음
  }

  const orderBy =
    status === "PENDING"
      ? [{ isPriority: "desc" }, { createdAt: "asc" }]
      : [{ date: "asc" }, { startSlot: "asc" }];

  const list = await prisma.reservation.findMany({
    where,
    include: { room: true },
    orderBy,
  });
  res.json(list);
});

// PATCH /api/admin/reservations/:id/approve
// 승인 시, 같은 강의실/날짜/시간대에 겹치는 다른 PENDING 신청은 자동 거절 처리
router.patch("/reservations/:id/approve", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const target = await prisma.reservation.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: "예약을 찾을 수 없습니다." });

  const overlappingPending = await prisma.reservation.findMany({
    where: {
      id: { not: id },
      roomId: target.roomId,
      date: target.date,
      status: "PENDING",
    },
  });
  const toReject = overlappingPending.filter((r) =>
    isOverlapping(target.startSlot, target.endSlot, r.startSlot, r.endSlot)
  );

  const [approved] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
    ...toReject.map((r) =>
      prisma.reservation.update({
        where: { id: r.id },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewNote: "동일 시간대 다른 예약이 확정되어 자동 거절되었습니다.",
        },
      })
    ),
  ]);

  res.json({ approved, autoRejectedCount: toReject.length });
});

// PATCH /api/admin/reservations/:id/reject
router.patch("/reservations/:id/reject", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { reviewNote } = req.body;
  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewNote: reviewNote || null },
  });
  res.json(updated);
});

// PATCH /api/admin/reservations/:id/cancel
// 이미 확정(APPROVED)된 예약을 관리자가 취소한다.
// 취소되면 status가 CANCELLED로 바뀌어 GET /api/reservations 목록(PENDING+APPROVED만 조회)에서
// 자동으로 빠지므로, 시간표에서는 다시 '신청 가능(빈 시간)'으로 보이게 된다.
router.patch("/reservations/:id/cancel", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { reviewNote } = req.body;

  const target = await prisma.reservation.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: "예약을 찾을 수 없습니다." });
  if (target.status !== "APPROVED") {
    return res.status(400).json({ error: "확정된 예약만 취소할 수 있습니다." });
  }

  const cancelled = await prisma.reservation.update({
    where: { id },
    data: {
      status: "CANCELLED",
      reviewedAt: new Date(),
      reviewNote: reviewNote || "관리자에 의해 취소되었습니다.",
    },
  });

  res.json(cancelled);
});

export default router;
