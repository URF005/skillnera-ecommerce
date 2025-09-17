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
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">MLM Commissions</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <select
            className="border rounded px-3 py-2 text-sm sm:text-base w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="border rounded px-4 py-2 text-sm sm:text-base bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 w-full sm:w-auto"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-xs sm:text-sm divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 sm:p-3 text-left font-medium">Created</th>
              <th className="p-2 sm:p-3 text-left font-medium">Order</th>
              <th className="p-2 sm:p-3 text-left font-medium">Buyer</th>
              <th className="p-2 sm:p-3 text-left font-medium">Earner</th>
              <th className="p-2 sm:p-3 text-left font-medium">Level</th>
              <th className="p-2 sm:p-3 text-left font-medium">Base</th>
              <th className="p-2 sm:p-3 text-left font-medium">% </th>
              <th className="p-2 sm:p-3 text-left font-medium">Amount</th>
              <th className="p-2 sm:p-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="p-2 sm:p-3 text-center" colSpan={9}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-2 sm:p-3 text-center" colSpan={9}>
                  No commissions
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="border-t hover:bg-gray-50">
                  <td className="p-2 sm:p-3 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2 sm:p-3">
                    <div className="font-medium text-xs sm:text-sm">
                      {r.order?.order_id || r.order?._id}
                    </div>
                    <div className="text-xs opacity-70">{r.order?.status}</div>
                  </td>
                  <td className="p-2 sm:p-3">
                    <div className="text-xs sm:text-sm">
                      {r.buyer?.name} ({r.buyer?.email})
                    </div>
                    <div className="text-xs opacity-70">
                      Phone: {r.buyer?.phone || "-"}
                    </div>
                    <div className="text-xs opacity-70">
                      Code: {r.buyer?.referralCode || "-"}
                    </div>
                  </td>
                  <td className="p-2 sm:p-3">
                    <div className="text-xs sm:text-sm">
                      {r.earner?.name} ({r.earner?.email})
                    </div>
                    <div className="text-xs opacity-70">
                      Phone: {r.earner?.phone || "-"}
                    </div>
                    <div className="text-xs opacity-70">
                      Code: {r.earner?.referralCode || "-"}
                    </div>
                  </td>
                  <td className="p-2 sm:p-3">{r.level}</td>
                  <td className="p-2 sm:p-3">{r.baseAmount}</td>
                  <td className="p-2 sm:p-3">{r.percent}%</td>
                  <td className="p-2 sm:p-3 font-semibold">{r.amount}</td>
                  <td className="p-2 sm:p-3">
                    <select
                      className="border rounded px-2 py-1 text-xs sm:text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
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