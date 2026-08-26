import React, { useState } from "react";

/**
 * 신청자 본인이 비밀번호를 입력해 자신의 예약을 취소하는 모달
 * props
 *  reservation: {id, purpose, status, hasCancelPassword}
 *  onSubmit: (password) => Promise
 *  onClose: () => void
 */
export default function CancelModal({ reservation, onSubmit, onClose }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const STATUS_LABEL = { PENDING: "승인 대기 중", APPROVED: "예약 확정" };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-1">예약 취소</h2>
        <p className="text-sm text-gray-500 mb-4">
          {STATUS_LABEL[reservation.status] || reservation.status} · {reservation.purpose}
        </p>

        {!reservation.hasCancelPassword ? (
          <>
            <p className="text-sm text-gray-700 mb-4">
              이 예약은 취소용 비밀번호가 설정되어 있지 않습니다. 취소가 필요하시면 학과
              사무실(02-820-5730)로 문의해주세요.
            </p>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 rounded border">
                닫기
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">신청 시 설정한 비밀번호</label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded border"
                disabled={submitting}
              >
                닫기
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? "취소 처리 중..." : "예약 취소하기"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
