"use client";
import { useEffect, useState } from "react";

// small chip
function Chip({ children, className = "" }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 ${className}`}>
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
    <div className="rounded-xl border bg-white shadow-sm px-3 py-2 min-w-[190px] max-w-[220px]">
      <div className="text-sm font-medium truncate">{node.name || "(No name)"}</div>
      <div className="text-[11px] text-slate-600 truncate">{node.email}</div>
      <div className="text-[11px] text-slate-500">Code: {node.referralCode || "-"}</div>
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
      {/* node */}
      <div className="flex justify-center">
        <NodeBox node={node} />
      </div>

      {/* connectors + children */}
      {(left || right) && level < maxDepth && (
        <div className="mt-2">
          {/* vertical line down from parent */}
          <div className="w-px h-4 bg-slate-300 mx-auto" />
          {/* horizontal connector */}
          <div className="mx-8 border-t border-slate-300" />
          {/* children row */}
          <div className="grid grid-cols-2 gap-x-16 mt-0">
            {/* LEFT */}
            <div className="flex flex-col items-center">
              {left ? (
                <>
                  <div className="w-px h-4 bg-slate-300" />
                  <BinaryNode node={left} level={level + 1} maxDepth={maxDepth} />
                </>
              ) : (
                <div className="h-4" />
              )}
            </div>
            {/* RIGHT */}
            <div className="flex flex-col items-center">
              {right ? (
                <>
                  <div className="w-px h-4 bg-slate-300" />
                  <BinaryNode node={right} level={level + 1} maxDepth={maxDepth} />
                </>
              ) : (
                <div className="h-4" />
              )}
            </div>
          </div>

          {/* show overflow count if more than 2 kids */}
          {children.length > 2 && (
            <div className="mt-2 text-[11px] text-slate-500">
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
      // keep it binary: per=2
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
    <div className="p-6 space-y-4">
      {/* Controls */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-sm text-slate-600">Find root (email / referral code / user id)</label>
          <input
            className="border rounded px-3 py-2 w-80"
            placeholder="e.g. alice@example.com or TNABC123"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">Depth</label>
          <select
            className="border rounded px-2 py-2 ml-2"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button className="border rounded px-4 py-2" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "View Binary Tree"}
        </button>
      </div>

      {/* Content */}
      {!data && <div className="text-slate-500">Enter a user and click “View Binary Tree”.</div>}
      {data?.error && <div className="text-rose-600">Error: {data.error}</div>}
      {data?.tree && (
        <div className="mt-4 overflow-x-auto">
          <div className="inline-block">
            <BinaryNode node={data.tree} maxDepth={data.meta?.depth ?? depth} />
          </div>
        </div>
      )}
    </div>
  );
}
