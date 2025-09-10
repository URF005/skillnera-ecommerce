"use client";
import { useEffect, useState } from "react";

export default function MLMCommissionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    const url = "/api/mlm/commissions" + (filter ? `?status=${filter}` : "");
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    setRows(data?.data?.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function updateStatus(id, status) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/mlm/commissions/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed");
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">MLM Commissions</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
          <button
            className="border rounded px-3 py-1"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Order</th>
              <th className="p-3 text-left">Buyer</th>
              <th className="p-3 text-left">Earner</th>
              <th className="p-3 text-left">Level</th>
              <th className="p-3 text-left">Base</th>
              <th className="p-3 text-left">% </th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={9}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-3" colSpan={9}>No commissions</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="border-t">
                  <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.order?.order_id || r.order?._id}</div>
                    <div className="text-xs opacity-70">{r.order?.status}</div>
                  </td>

                  <td className="p-3">
                    <div>{r.buyer?.name} ({r.buyer?.email})</div>
                    <div className="text-xs opacity-70">Phone: {r.buyer?.phone || "-"}</div>
                    <div className="text-xs opacity-70">Code: {r.buyer?.referralCode || "-"}</div>
                  </td>
                  <td className="p-3">
                    <div>{r.earner?.name} ({r.earner?.email})</div>
                    <div className="text-xs opacity-70">Phone: {r.earner?.phone || "-"}</div>
                    <div className="text-xs opacity-70">Code: {r.earner?.referralCode || "-"}</div>
                  </td>

                  <td className="p-3">{r.level}</td>
                  <td className="p-3">{r.baseAmount}</td>
                  <td className="p-3">{r.percent}%</td>
                  <td className="p-3 font-semibold">{r.amount}</td>
                  <td className="p-3">
                    <select
                      className="border rounded px-2 py-1"
                      defaultValue={r.status}
                      onChange={(e) => updateStatus(r._id, e.target.value)}
                      disabled={updatingId === r._id}
                    >
                      <option value="pending">pending</option>
                      <option value="approved">approved</option>
                      <option value="paid">paid</option>
                      <option value="void">void</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
