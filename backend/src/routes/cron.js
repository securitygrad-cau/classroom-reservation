import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

// GET /api/cron/cleanup
// Vercel Cron이 매일 정해진 시각에 자동으로 호출한다 (vercel.json 참고).
// "강의실을 사용한 날짜(date)" 기준으로 6개월이 지난 예약(개인정보 포함)을 DB에서 완전히 삭제한다.
// (신청한 시점이 아니라, 실제 사용일 기준. 예: 미리 신청해둔 먼 미래 예약은 그 사용일로부터 6개월 뒤 삭제됨)
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
  // date 필드가 "YYYY-MM-DD" 문자열이므로, 같은 형식의 문자열로 비교 기준을 만든다.
  const cutoffDateStr = sixMonthsAgo.toISOString().slice(0, 10);

  const result = await prisma.reservation.deleteMany({
    where: { date: { lt: cutoffDateStr } },
  });

  console.log(`[cron/cleanup] ${result.count}건의 6개월 경과(사용일 기준) 예약 삭제됨 (기준일: ${cutoffDateStr})`);

  res.json({ deletedCount: result.count, cutoff: cutoffDateStr });
});

export default router;
