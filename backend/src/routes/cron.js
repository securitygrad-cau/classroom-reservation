import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

// GET /api/cron/cleanup
// Vercel Cron이 매일 정해진 시각에 자동으로 호출한다 (vercel.json 참고).
// 생성된 지 6개월이 지난 예약(개인정보 포함)을 DB에서 완전히 삭제한다.
//
// 보안: Vercel은 Cron 요청 시 Authorization 헤더에
//   Bearer {process.env.CRON_SECRET}
// 값을 자동으로 실어서 보낸다. 이 값이 서버에 등록된 CRON_SECRET과 일치하지 않으면
// (즉, 외부에서 아무나 이 URL을 호출한 경우) 거부한다.
router.get("/cleanup", async (req, res) => {
  const auth = req.headers.authorization || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;

  if (!process.env.CRON_SECRET || auth !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const result = await prisma.reservation.deleteMany({
    where: { createdAt: { lt: sixMonthsAgo } },
  });

  console.log(`[cron/cleanup] ${result.count}건의 6개월 경과 예약 삭제됨 (기준일: ${sixMonthsAgo.toISOString()})`);

  res.json({ deletedCount: result.count, cutoff: sixMonthsAgo.toISOString() });
});

export default router;
