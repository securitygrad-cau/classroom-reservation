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
    affiliation: "학생",
    department: "",
    purpose: "",
    contact: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.requesterName || !form.purpose || !form.contact) {
      setError("필수 항목을 모두 입력해주세요.");
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
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
            <label className="block text-sm font-medium mb-1">소속/직책 *</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.affiliation}
              onChange={(e) => update("affiliation", e.target.value)}
            >
              <option value="학생">학생</option>
              <option value="교수">교수</option>
              <option value="교직원">교직원</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">소속 학과(선택)</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
              placeholder="예: 융합보안학과"
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
            <label className="block text-sm font-medium mb-1">연락처 *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.contact}
              onChange={(e) => update("contact", e.target.value)}
              placeholder="전화번호 또는 이메일"
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
