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

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">MLM Settings</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={!!form.isEnabled}
            onChange={(e) => updateField("isEnabled", e.target.checked)}
          />
          <span>Enable MLM</span>
        </label>

        <label className="flex items-center gap-3">
          <span>Min Order Amount</span>
          <input
            className="border rounded px-2 py-1 w-32"
            type="number"
            value={form.minOrderAmount ?? 0}
            onChange={(e) => updateField("minOrderAmount", e.target.value)}
          />
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={!!form.preventSelfReferral}
            onChange={(e) => updateField("preventSelfReferral", e.target.checked)}
          />
          <span>Prevent self-referral</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={!!form.oneCommissionPerOrder}
            onChange={(e) => updateField("oneCommissionPerOrder", e.target.checked)}
          />
          <span>One commission per order</span>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Levels</h2>
          <button className="border rounded px-3 py-1" onClick={addLevel}>Add level</button>
        </div>
        <div className="overflow-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Level</th>
                <th className="p-3 text-left">Percent %</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(form.levels || []).map((lv, idx) => (
                <tr className="border-t" key={idx}>
                  <td className="p-3">
                    <input
                      className="border rounded px-2 py-1 w-24"
                      type="number"
                      value={lv.level}
                      onChange={(e) => updateLevel(idx, "level", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      className="border rounded px-2 py-1 w-24"
                      type="number"
                      value={lv.percent}
                      onChange={(e) => updateLevel(idx, "percent", Number(e.target.value))}
                    />
                  </td>
                  <td className="p-3">
                    <button className="border rounded px-3 py-1" onClick={() => removeLevel(idx)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {(!form.levels || form.levels.length === 0) && (
                <tr><td className="p-3" colSpan={3}>No levels defined</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <button className="border rounded px-4 py-2" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
