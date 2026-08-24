import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const rooms = ["506호", "512호", "B1 105-1호", "721호"];

  for (let i = 0; i < rooms.length; i++) {
    await prisma.room.upsert({
      where: { name: rooms[i] },
      update: {},
      create: { name: rooms[i], order: i },
    });
  }

  // 기본 관리자 계정 (조교) - 최초 1회만 생성, 운영 시 비밀번호 꼭 변경하세요
  const existing = await prisma.admin.findUnique({ where: { username: "admin" } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("changeme123", 10);
    await prisma.admin.create({
      data: { username: "admin", passwordHash, name: "조교" },
    });
  }

  console.log("시드 완료: 강의실 4개, 관리자 계정 1개 생성됨");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
