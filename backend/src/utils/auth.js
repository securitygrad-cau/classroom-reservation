import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// Authorization 헤더에서 관리자 토큰을 검증한다.
// 유효하면 admin payload를, 없거나 유효하지 않으면 null을 반환한다.
// (401을 던지지 않는 "선택적" 검증 — 공개 API에서 관리자 여부만 확인할 때 사용)
export function getAdminFromRequest(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
