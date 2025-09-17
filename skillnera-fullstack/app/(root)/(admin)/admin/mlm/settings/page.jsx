"use client";
import { useEffect, useState } from "react";

export default function MLMSettingsPage() {
  const [form, setForm] = useState({
    isEnabled: true,
    minOrderAmount: 0,
    preventSelfReferral: true,
    oneCommissionPerOrder: true,
    levels: [
      { level: 1, percent: 5 },
      { level: 2, percent: 3 },
      { level: 3, percent: 2 },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/mlm/settings", { cache: "no-store" });
    const data = await res.json();
    if (data?.data?.settings) setForm(data.data.settings);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateLevel(idx, key, value) {
    setForm((f) => {
      const levels = [...(f.levels || [])];
      levels[idx] = { ...levels[idx], [key]: value };
      return { ...f, levels };
    });
  }

  function addLevel() {
    setForm((f) => ({
      ...f,
      levels: [...(f.levels || []), { level: (f.levels?.length || 0) + 1, percent: 0 }],
    }));
  }

  function removeLevel(idx) {
    setForm((f) => ({ ...f, levels: (f.levels || []).filter((_, i) => i !== idx) }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/mlm/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled: !!form.isEnabled,
          minOrderAmount: Number(form.minOrderAmount || 0),
          preventSelfReferral: !!form.preventSelfReferral,
          oneCommissionPerOrder: !!form.oneCommissionPerOrder,
          levels: (form.levels || []).map((lv, i) => ({
            level: Number(lv.level ?? i + 1),
            percent: Number(lv.percent || 0),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      await load();
      alert("Saved");
    } catch (e) {
      console.error(e);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 sm:p-6 md:p-8">Loading…</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-full overflow-x-hidden space-y-6">
      <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">MLM Settings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6">
        <label className="flex items-center gap-3 text-sm sm:text-base">
          <input
            type="checkbox"
            checked={!!form.isEnabled}
            onChange={(e) => updateField("isEnabled", e.target.checked)}
            className="h-5 w-5"
          />
          <span>Enable MLM</span>
        </label>

        <label className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm sm:text-base">
          <span className="whitespace-nowrap">Min Order Amount</span>
          <input
            className="border rounded px-3 py-2 w-full sm:w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="number"
            value={form.minOrderAmount ?? 0}
            onChange={(e) => updateField("minOrderAmount", e.target.value)}
          />
        </label>

        <label className="flex items-center gap-3 text-sm sm:text-base">
          <input
            type="checkbox"
            checked={!!form.preventSelfReferral}
            onChange={(e) => updateField("preventSelfReferral", e.target.checked)}
            className="h-5 w-5"
          />
          <span>Prevent self-referral</span>
        </label>

        <label className="flex items-center gap-3 text-sm sm:text-base">
          <input
            type="checkbox"
            checked={!!form.oneCommissionPerOrder}
            onChange={(e) => updateField("oneCommissionPerOrder", e.target.checked)}
            className="h-5 w-5"
          />
          <span>One commission per order</span>
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="font-medium text-sm sm:text-base">Levels</h2>
          <button
            className="border rounded px-4 py-2 text-sm sm:text-base bg-blue-500 text-white hover:bg-blue-600 w-full sm:w-auto"
            onClick={addLevel}
          >
            Add level
          </button>
        </div>
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-xs sm:text-sm divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 sm:p-3 text-left font-medium">Level</th>
                <th className="p-2 sm:p-3 text-left font-medium">Percent %</th>
                <th className="p-2 sm:p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(form.levels || []).map((lv, idx) => (
                <tr className="border-t hover:bg-gray-50" key={idx}>
                  <td className="p-2 sm:p-3">
                    <input
                      className="border rounded px-3 py-2 w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="number"
                      value={lv.level}
                      onChange={(e) => updateLevel(idx, "level", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2 sm:p-3">
                    <input
                      className="border rounded px-3 py-2 w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="number"
                      value={lv.percent}
                      onChange={(e) => updateLevel(idx, "percent", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2 sm:p-3">
                    <button
                      className="border rounded px-4 py-2 text-sm sm:text-base bg-red-500 text-white hover:bg-red-600 w-full sm:w-auto"
                      onClick={() => removeLevel(idx)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {(!form.levels || form.levels.length === 0) && (
                <tr>
                  <td className="p-2 sm:p-3 text-center" colSpan={3}>
                    No levels defined
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <button
          className="border rounded px-4 py-2 text-sm sm:text-base bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 w-full sm:w-auto"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}