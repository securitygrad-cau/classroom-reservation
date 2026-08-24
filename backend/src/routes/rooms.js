import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

// GET /api/rooms - 강의실 목록 (시간표 컬럼용)
router.get("/", async (req, res) => {
  const rooms = await prisma.room.findMany({ orderBy: { order: "asc" } });
  res.json(rooms);
});

export default router;
