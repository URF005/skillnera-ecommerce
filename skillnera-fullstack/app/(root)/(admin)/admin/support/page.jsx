'use client';

import BreadCrumb from "@/components/Application/Admin/BreadCrumb";
import DatatableWrapper from "@/components/Application/Admin/DatatableWrapper";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ADMIN_DASHBOARD, ADMIN_SUPPORT_DETAILS } from "@/routes/AdminPanelRoute";
import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ViewAction from "@/components/Application/Admin/ViewAction";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "", label: "Supports" },
];

function ViewTabs() {
  const router = useRouter();
  const sp = useSearchParams();
  const active = sp.get("view") || "all";
  const make = (label, view) => (
    <button
      onClick={() => router.push(`/admin/support${view ? `?view=${view}` : ""}`)}
      className={`px-3 py-1 rounded-full text-sm border ${
        (active === view) || (!view && active === "all")
          ? "border-violet-500 text-violet-700"
          : "border-slate-300 hover:border-slate-400"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex gap-2">
      {make("All", "all")}
      {make("In Process", "in_process")}
      {make("Resolved", "resolved")}
      {make("My Tickets", "my")}
    </div>
  );
}

export default function AdminSupportList() {
  const sp = useSearchParams();
  const view = sp.get("view") || "all";

  const fetchUrl = `/api/dashboard/admin/support${view ? `?view=${view}` : ""}`;

  const columns = useMemo(() => [
    {
      header: "Ticket",
      accessorKey: "ticketNumber",
      Cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">{row.original.ticketNumber}</div>
          <div className="text-xs opacity-70">{row.original.subject}</div>
        </div>
      ),
    },
    {
      header: "Member",
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
    { header: "Category", accessorKey: "category" },
    { header: "Priority", accessorKey: "priority" },
    {
      header: "Status",
      accessorKey: "status",
      Cell: ({ cell }) => {
        const v = String(cell.getValue() || "").toLowerCase();
        const cls =
          v === "resolved"
            ? "bg-emerald-100 text-emerald-700"
            : v === "in_process"
            ? "bg-amber-100 text-amber-800"
            : v === "open"
            ? "bg-blue-100 text-blue-800"
            : "bg-slate-200 text-slate-700";
        return <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{v}</span>;
      },
    },
    {
      header: "Due",
      accessorKey: "dueAt",
      Cell: ({ cell }) => {
        const dt = cell.getValue();
        if (!dt) return "-";
        const d = new Date(dt);
        const overdue = d.getTime() < Date.now();
        return (
          <span className={overdue ? "text-rose-600 font-medium" : ""}>
            {d.toLocaleString()}
          </span>
        );
      },
    },
    { header: "Assignee", accessorKey: "assigneeName" },
    {
      header: "Created",
      accessorKey: "createdAt",
      Cell: ({ cell }) => (cell.getValue() ? new Date(cell.getValue()).toLocaleString() : "-"),
    },
  ], []);

  const action = (row) => [
    <ViewAction key="view" href={ADMIN_SUPPORT_DETAILS(row.original._id)} />,
  ];

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm gap-0">
        <CardHeader className="pt-3 px-3 border-b [.border-b]:pb-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-semibold">Supports</h4>
            <ViewTabs />
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <DatatableWrapper
            queryKey={`support-${view}`}
            fetchUrl={fetchUrl}
            initialPageSize={10}
            columnsConfig={columns}
            // Hide delete/trash/export on Supports
            showExport={false}
            createAction={action}
          />
        </CardContent>
      </Card>
    </div>
  );
}
