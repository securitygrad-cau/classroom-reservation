import { PrismaClient } from "@prisma/client";

// 개발 중 핫리로드로 인한 커넥션 중복 생성을 방지하는 싱글턴 패턴
export const prisma = new PrismaClient();
