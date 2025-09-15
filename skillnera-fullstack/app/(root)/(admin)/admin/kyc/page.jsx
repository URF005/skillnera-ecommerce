'use client';

import BreadCrumb from "@/components/Application/Admin/BreadCrumb";
import DatatableWrapper from "@/components/Application/Admin/DatatableWrapper";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ADMIN_DASHBOARD } from "@/routes/AdminPanelRoute";
import { useMemo, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { showToast } from "@/lib/showToast";
import { useRouter, useSearchParams } from "next/navigation";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: 'Home' },
  { href: "", label: 'KYC' },
];

function StatCard({ label, count, active, onClick, caption }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left w-full transition
        ${active ? "border-violet-500 ring-2 ring-violet-200" : "border-slate-200 hover:border-slate-300"}`}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{count}</div>
      {caption && <div className="text-xs text-slate-500 mt-1">{caption}</div>}
    </button>
  );
}

export default function AdminKycPage({ searchParams }) {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp.get("status") || ""; // "", "pending", "verified", "unverified"

  // fetch counts
  const [stats, setStats] = useState({ pending: 0, verified: 0, unverified: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        setLoadingStats(true);
        const { data } = await axios.get("/api/dashboard/admin/kyc/stats");
        if (data?.success) {
          setStats({
            pending: data.data.pending,
            verified: data.data.verified,
            unverified: data.data.unverified,
          });
        }
      } catch (e) {
        // not fatal for table
      } finally {
        setLoadingStats(false);
      }
    })();
  }, []);

  // columns: use FLAT keys and short link text
  const columns = useMemo(() => ([
    {
      header: "User",
      accessorKey: "userName",
      Cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.userName || "-"}</div>
          <div className="text-xs opacity-70">{row.original.userEmail || "-"}</div>
          {row.original.userPhone ? (
            <div className="text-xs opacity-70">Phone: {row.original.userPhone}</div>
          ) : null}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      Cell: ({ cell }) => {
        const v = String(cell.getValue() || "").toLowerCase();
        const cls = v === "verified"
          ? "bg-emerald-100 text-emerald-700"
          : v === "pending"
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-200 text-slate-700";
        return <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{v || "-"}</span>;
      },
    },

    // ✅ new columns
    { header: "Total Orders", accessorKey: "orderCount" },
    { header: "Delivered Orders", accessorKey: "deliveredCount" },

    {
      header: "Docs",
      accessorKey: "idFrontUrl",
      Cell: ({ row }) => {
        const f = row.original.idFrontUrl;
        const b = row.original.idBackUrl;
        const s = row.original.selfieUrl;
        return (
          <div className="flex gap-3 text-sm">
            {f ? <a className="underline text-blue-600" href={f} target="_blank" rel="noreferrer">ID</a> : <span className="opacity-50">ID</span>}
            {b ? <a className="underline text-blue-600" href={b} target="_blank" rel="noreferrer">Back</a> : <span className="opacity-50">Back</span>}
            {s ? <a className="underline text-blue-600" href={s} target="_blank" rel="noreferrer">Selfie</a> : <span className="opacity-50">Selfie</span>}
          </div>
        );
      },
    },
    {
      header: "Submitted",
      accessorKey: "createdAt",
      Cell: ({ cell }) => (cell.getValue() ? new Date(cell.getValue()).toLocaleString() : "-"),
    },
  ]), []);


  // row actions: verify / unverify
  const action = useCallback((row) => {
    const id = row.original._id;
    async function setStatus(next) {
      try {
        const { data } = await axios.put("/api/dashboard/admin/kyc/update", { _id: id, status: next });
        if (!data?.success) throw new Error(data?.message || "Failed");
        showToast("success", `KYC ${next}.`);
        // refresh table + stats
        router.refresh();
        const s = await axios.get("/api/dashboard/admin/kyc/stats");
        if (s?.data?.success) {
          setStats({
            pending: s.data.data.pending,
            verified: s.data.data.verified,
            unverified: s.data.data.unverified,
          });
        }
      } catch (e) {
        showToast("error", e.message);
      }
    }
    return [
      <button key="verify" onClick={() => setStatus("verified")} className="text-emerald-600 px-3 py-1">Mark Verified</button>,
      <button key="unverify" onClick={() => setStatus("unverified")} className="text-rose-600 px-3 py-1">Mark Unverified</button>,
    ];
  }, [router]);

  // switch table source when card clicked
  const fetchUrl = status
    ? `/api/dashboard/admin/kyc?status=${status}`
    : "/api/dashboard/admin/kyc";

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <StatCard
          label="Pending KYC"
          count={loadingStats ? "…" : stats.pending}
          caption="Waiting for admin review"
          active={status === "pending"}
          onClick={() => router.push("/admin/kyc?status=pending")}
        />
        <StatCard
          label="Verified KYC"
          count={loadingStats ? "…" : stats.verified}
          caption="Approved by admin"
          active={status === "verified"}
          onClick={() => router.push("/admin/kyc?status=verified")}
        />
        <StatCard
          label="Unverified KYC"
          count={loadingStats ? "…" : stats.unverified}
          caption="Rejected or not approved"
          active={status === "unverified"}
          onClick={() => router.push("/admin/kyc?status=unverified")}
        />
      </div>

      <Card className="py-0 rounded shadow-sm gap-0">
        <CardHeader className="pt-3 px-3 border-b [.border-b]:pb-2">
          <div className="flex justify-between items-center">
            <h4 className='text-xl font-semibold'>
              KYC {status ? `- ${status}` : ""}
            </h4>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <DatatableWrapper
            queryKey={`kyc-${status || "all"}`}
            fetchUrl={fetchUrl}
            initialPageSize={10}
            columnsConfig={columns}
            createAction={action}
            showExport={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
