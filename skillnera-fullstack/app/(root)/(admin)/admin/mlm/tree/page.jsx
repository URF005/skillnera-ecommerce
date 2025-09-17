"use client";
import { useEffect, useState } from "react";

// Small chip component
function Chip({ children, className = "" }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs sm:text-sm bg-slate-100 text-slate-700 ${className}`}>
      {children}
    </span>
  );
}

function fmt(n) {
  return Number(n || 0).toFixed(2);
}

// Compact node box
function NodeBox({ node }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm px-3 py-2 min-w-[160px] sm:min-w-[190px] max-w-[200px] sm:max-w-[220px]">
      <div className="text-xs sm:text-sm font-medium truncate">{node.name || "(No name)"}</div>
      <div className="text-[10px] sm:text-[11px] text-slate-600 truncate">{node.email}</div>
      <div className="text-[10px] sm:text-[11px] text-slate-500">Code: {node.referralCode || "-"}</div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <Chip>Direct: {node.childrenCount || 0}</Chip>
        <Chip className={node.mlmActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
          {node.mlmActive ? "Active" : "Disabled"}
        </Chip>
        {node.totals && (
          <>
            <Chip className="bg-violet-100 text-violet-700">Paid: {fmt(node.totals.paidAmount)}</Chip>
            <Chip className="bg-amber-100 text-amber-800">Approved: {fmt(node.totals.approvedAmount)}</Chip>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * BinaryNode
 * Renders a node with at most 2 children (left/right) in a binary tree layout
 */
function BinaryNode({ node, level = 0, maxDepth = 3 }) {
  const children = Array.isArray(node.children) ? node.children : [];
  const left = children[0];
  const right = children[1];

  return (
    <div className="inline-block text-center align-top">
      {/* Node */}
      <div className="flex justify-center">
        <NodeBox node={node} />
      </div>

      {/* Connectors + children */}
      {(left || right) && level < maxDepth && (
        <div className="mt-2 sm:mt-3">
          {/* Vertical line down from parent */}
          <div className="w-px h-3 sm:h-4 bg-slate-300 mx-auto" />
          {/* Horizontal connector */}
          <div className="mx-4 sm:mx-8 border-t border-slate-300" />
          {/* Children row */}
          <div className="grid grid-cols-2 gap-x-8 sm:gap-x-16 mt-0">
            {/* LEFT */}
            <div className="flex flex-col items-center">
              {left ? (
                <>
                  <div className="w-px h-3 sm:h-4 bg-slate-300" />
                  <BinaryNode node={left} level={level + 1} maxDepth={maxDepth} />
                </>
              ) : (
                <div className="h-3 sm:h-4" />
              )}
            </div>
            {/* RIGHT */}
            <div className="flex flex-col items-center">
              {right ? (
                <>
                  <div className="w-px h-3 sm:h-4 bg-slate-300" />
                  <BinaryNode node={right} level={level + 1} maxDepth={maxDepth} />
                </>
              ) : (
                <div className="h-3 sm:h-4" />
              )}
            </div>
          </div>

          {/* Show overflow count if more than 2 kids */}
          {children.length > 2 && (
            <div className="mt-2 text-[10px] sm:text-[11px] text-slate-500">
              +{children.length - 2} more (increase per-level limit if needed)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReferralTreePage() {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState(3);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!query.trim()) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      // Keep it binary: per=2
      const params = new URLSearchParams({
        root: query.trim(),
        depth: String(depth),
        per: "2",
        includeTotals: "1",
      });
      const res = await fetch(`/api/mlm/referral-tree?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Failed");
      setData(json.data);
    } catch (e) {
      console.error(e);
      setData({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter") load();
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-full overflow-x-hidden space-y-4 sm:space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 flex-wrap">
        <div className="w-full sm:w-auto">
          <label className="text-xs sm:text-sm text-slate-600 block mb-1">Find root (email / referral code / user id)</label>
          <input
            className="border rounded px-3 py-2 w-full sm:w-80 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. alice@example.com or TNABC123"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-xs sm:text-sm text-slate-600 block mb-1">Depth</label>
          <select
            className="border rounded px-3 py-2 text-sm sm:text-base w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button
          className="border rounded px-4 py-2 text-sm sm:text-base bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 w-full sm:w-auto"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Loading…" : "View Binary Tree"}
        </button>
      </div>

      {/* Content */}
      {!data && <div className="text-slate-500 text-sm sm:text-base">Enter a user and click “View Binary Tree”.</div>}
      {data?.error && <div className="text-rose-600 text-sm sm:text-base">Error: {data.error}</div>}
      {data?.tree && (
        <div className="mt-4 sm:mt-6 overflow-x-auto">
          <div className="inline-block min-w-[300px]">
            <BinaryNode node={data.tree} maxDepth={data.meta?.depth ?? depth} />
          </div>
        </div>
      )}
    </div>
  );
}