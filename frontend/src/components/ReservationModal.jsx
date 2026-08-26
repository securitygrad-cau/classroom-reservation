import React, { useState } from "react";
import { slotToTime } from "../timeSlots.js";

/**
 * 예약 신청 입력 폼
 * props
 *  roomName, startSlot, endSlot: 선택된 강의실/시간대 (표시용)
 *  onSubmit: (formData) => Promise
 *  onClose: () => void
 */
export default function ReservationModal({ roomName, startSlot, endSlot, onSubmit, onClose }) {
  const [form, setForm] = useState({
    requesterName: "",
    affiliation: "학부생",
    department: "",
    purpose: "",
    contact: "",
    cancelPassword: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.requesterName || !form.department || !form.purpose || !form.contact) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }
    if (!agreed) {
      setError("개인정보 보관 안내에 동의해야 예약이 가능합니다.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-1">강의실 예약 신청</h2>
        <p className="text-sm text-gray-500 mb-4">
          {roomName} · {slotToTime(startSlot)} ~ {slotToTime(endSlot)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">이름 *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.requesterName}
              onChange={(e) => update("requesterName", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">신분 *</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.affiliation}
              onChange={(e) => update("affiliation", e.target.value)}
            >
              <option value="학부생">학부생</option>
              <option value="대학원생">대학원생</option>
              <option value="교수">교수</option>
              <option value="교직원">교직원</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">소속 학과 *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
              placeholder="예: 산업보안학과, 융합보안학과"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">사용 목적 *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value)}
              placeholder="예: 세미나, 스터디, 강의 보강"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">학번 또는 내선번호 *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.contact}
              onChange={(e) => update("contact", e.target.value)}
              placeholder="예: 20231234 또는 1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">취소용 비밀번호 (선택)</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={form.cancelPassword}
              onChange={(e) => update("cancelPassword", e.target.value)}
              placeholder="설정하면 사무실 문의 없이 본인이 직접 예약을 취소할 수 있어요"
            />
          </div>

          <div className="flex items-start gap-2 text-xs bg-gray-50 border rounded p-3">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <label htmlFor="agree" className="text-gray-600">
              예약 시 입력한 정보(이름, 신분, 소속 학과, 사용 목적, 학번/내선번호 등)는{" "}
              <b>6개월간</b> 보관되며, 이후 자동으로 삭제됩니다. 이에 동의합니다. *
            </label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border"
              disabled={submitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "신청 중..." : "신청하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
