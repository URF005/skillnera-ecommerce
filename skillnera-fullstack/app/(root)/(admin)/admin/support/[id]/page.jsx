'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import BreadCrumb from "@/components/Application/Admin/BreadCrumb";
import { ADMIN_DASHBOARD, ADMIN_SUPPORT_SHOW } from "@/routes/AdminPanelRoute";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/showToast";
import Link from "next/link";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES, SUPPORT_OUTCOMES } from "@/lib/support";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_SUPPORT_SHOW, label: "Supports" },
  { href: "", label: "Ticket" },
];

export default function SupportTicketDetails() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);

  // Edit fields
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [relatedOrderId, setRelatedOrderId] = useState("");
  const [note, setNote] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);

  // Resolution
  const [outcome, setOutcome] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [replacementOrderId, setReplacementOrderId] = useState("");
  const [pointsDelta, setPointsDelta] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await axios.get(`/api/dashboard/admin/support/${id}`);
        if (!data?.success) throw new Error(data?.message || "Failed");
        setTicket(data.data);
        setStatus(data.data.status || "open");
        setPriority(data.data.priority || "Medium");
        setCategory(data.data.category || "");
        setRelatedOrderId(data.data.relatedOrderId || "");
        setLoading(false);
      } catch (e) {
        showToast("error", e.message);
        setLoading(false);
      }
    })();
  }, [id]);

  const refresh = async () => {
    const { data } = await axios.get(`/api/dashboard/admin/support/${id}`);
    setTicket(data.data);
  };

  const saveBasics = async () => {
    try {
      const payload = { status, priority, category, relatedOrderId };
      const { data } = await axios.put(`/api/dashboard/admin/support/${id}`, payload);
      if (!data?.success) throw new Error(data?.message || "Failed");
      showToast("success", "Ticket updated.");
      await refresh();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const addInternalNote = async () => {
    if (!note.trim()) return;
    try {
      const payload = { addNote: { message: note.trim(), internal: noteInternal } };
      const { data } = await axios.put(`/api/dashboard/admin/support/${id}`, payload);
      if (!data?.success) throw new Error(data?.message || "Failed");
      setNote("");
      showToast("success", "Note added.");
      await refresh();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const assignToMe = async () => {
    try {
      const payload = { assignTo: "me" };
      const { data } = await axios.put(`/api/dashboard/admin/support/${id}`, payload);
      if (!data?.success) throw new Error(data?.message || "Failed");
      showToast("success", "Assigned to you.");
      await refresh();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const markResolved = async () => {
    if (!outcome) return showToast("error", "Select an outcome to resolve.");
    try {
      const payload = {
        resolution: {
          outcome,
          details: resolutionDetails || undefined,
          refundAmount: refundAmount ? Number(refundAmount) : undefined,
          replacementOrderId: replacementOrderId || undefined,
          pointsDelta: pointsDelta ? Number(pointsDelta) : undefined,
        },
        status: "resolved",
      };
      const { data } = await axios.put(`/api/dashboard/admin/support/${id}`, payload);
      if (!data?.success) throw new Error(data?.message || "Failed");
      showToast("success", "Ticket resolved.");
      await refresh();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  const quickKycUpdate = async () => {
    if (!relatedKycId || !kycStatus) return;
    try {
      const payload = { updateKycStatus: { kycId: relatedKycId, status: kycStatus, adminNote: kycNote || undefined } };
      const { data } = await axios.put(`/api/dashboard/admin/support/${id}`, payload);
      if (!data?.success) throw new Error(data?.message || "Failed");
      showToast("success", "KYC updated.");
      await refresh();
    } catch (e) {
      showToast("error", e.message);
    }
  };

  if (loading) return <div className="p-4 sm:p-6 md:p-8">Loading…</div>;
  if (!ticket) return <div className="p-4 sm:p-6 md:p-8">Not found.</div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-full overflow-x-hidden space-y-4 sm:space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="mb-4 rounded-lg shadow-sm">
        <CardHeader className="pt-3 px-4 sm:px-6 border-b pb-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h4 className="text-lg sm:text-xl md:text-2xl font-semibold">
              {ticket.ticketNumber} — {ticket.subject}
            </h4>
            <div className="text-xs sm:text-sm flex flex-col sm:flex-row sm:gap-2">
              <span>Status: <b>{ticket.status}</b></span>
              <span>Priority: <b>{ticket.priority}</b></span>
              {ticket.assignedTo && ticket.assignedTo.name ? (
                <span>Assignee: <b>{ticket.assignedTo.name}</b></span>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Member</div>
              <div className="text-xs sm:text-sm font-medium">{ticket.user?.name}</div>
              <div className="text-xs">{ticket.user?.email}</div>
              {ticket.user?.phone ? <div className="text-xs">Phone: {ticket.user.phone}</div> : null}
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Created</div>
              <div className="text-xs sm:text-sm">{new Date(ticket.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Due (SLA)</div>
              <div className={`text-xs sm:text-sm ${new Date(ticket.dueAt) < new Date() ? "text-rose-600 font-semibold" : ""}`}>
                {new Date(ticket.dueAt).toLocaleString()}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Description</div>
            <div className="text-xs sm:text-sm whitespace-pre-wrap">{ticket.description}</div>
          </div>

          {Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Attachments</div>
              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
                {ticket.attachments.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" className="underline text-blue-600 hover:text-blue-800">
                    {a.name || a.type || "file"}
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit panel */}
      <Card className="mb-4 rounded-lg shadow-sm">
        <CardHeader className="pt-3 px-4 sm:px-6 border-b pb-2">
          <h5 className="text-base sm:text-lg font-semibold">Update</h5>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 px-4 sm:px-6">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Status</label>
            <select
              className="w-full border rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {SUPPORT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Priority</label>
            <select
              className="w-full border rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              {SUPPORT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Category</label>
            <select
              className="w-full border rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {SUPPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Related Order ID</label>
            <Input
              value={relatedOrderId}
              onChange={e => setRelatedOrderId(e.target.value)}
              placeholder="Order.order_id (optional)"
              className="text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={saveBasics}
                className="w-full sm:w-auto bg-blue-500 text-white hover:bg-blue-600 text-xs sm:text-sm"
              >
                Save
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={assignToMe}
                className="w-full sm:w-auto bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs sm:text-sm"
              >
                Assign to me
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mb-4 rounded-lg shadow-sm">
        <CardHeader className="pt-3 px-4 sm:px-6 border-b pb-2">
          <h5 className="text-base sm:text-lg font-semibold">Notes</h5>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-start">
            <div className="sm:col-span-5">
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note…"
                className="text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 text-xs sm:text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={noteInternal}
                    onChange={(e) => setNoteInternal(e.target.checked)}
                    className="h-4 w-4 sm:h-5 sm:w-5"
                  />
                  Internal note (hidden from member)
                </label>
              </div>
            </div>
            <div className="sm:col-span-1">
              <Button
                type="button"
                onClick={addInternalNote}
                className="w-full bg-blue-500 text-white hover:bg-blue-600 text-xs sm:text-sm"
              >
                Add
              </Button>
            </div>
          </div>

          {Array.isArray(ticket.notes) && ticket.notes.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-xs text-slate-500 mb-2">Timeline</div>
              <div className="space-y-3 sm:space-y-4">
                {ticket.notes.map((n, idx) => (
                  <div key={idx} className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-70">{new Date(n.createdAt).toLocaleString()}</span>
                      {(() => {
                        const isMember =
                          ticket?.user?._id && String(n.by) === String(ticket.user._id);
                        const label = n.internal ? "internal" : (isMember ? "member" : "support");
                        const cls =
                          label === "internal"
                            ? "bg-slate-200"
                            : label === "member"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-indigo-100 text-indigo-700";
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${cls}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve */}
      <Card className="mb-4 rounded-lg shadow-sm">
        <CardHeader className="pt-3 px-4 sm:px-6 border-b pb-2">
          <h5 className="text-base sm:text-lg font-semibold">Resolve</h5>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 px-4 sm:px-6">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Outcome</label>
            <select
              className="w-full border rounded px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
            >
              <option value="">Select outcome</option>
              {SUPPORT_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Refund Amount</label>
            <Input
              type="number"
              value={refundAmount}
              onChange={e => setRefundAmount(e.target.value)}
              placeholder="0"
              className="text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Replacement Order ID</label>
            <Input
              value={replacementOrderId}
              onChange={e => setReplacementOrderId(e.target.value)}
              placeholder="Order.order_id"
              className="text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Points Δ (adjustment)</label>
            <Input
              type="number"
              value={pointsDelta}
              onChange={e => setPointsDelta(e.target.value)}
              placeholder="e.g. 100"
              className="text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500 block mb-1">Resolution details</label>
            <Textarea
              value={resolutionDetails}
              onChange={e => setResolutionDetails(e.target.value)}
              placeholder="Add any details…"
              className="text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="button"
              onClick={markResolved}
              className="w-full sm:w-auto bg-blue-500 text-white hover:bg-blue-600 text-xs sm:text-sm"
            >
              Mark as Resolved
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}