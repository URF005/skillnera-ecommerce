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

  // edit fields
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [relatedOrderId, setRelatedOrderId] = useState("");
  const [note, setNote] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);

  // resolution
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
      const payload = { assignTo: "me" }; // API accepts "me" to assign current admin
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

  if (loading) return <div className="p-6">Loading…</div>;
  if (!ticket) return <div className="p-6">Not found.</div>;

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="mb-4">
        <CardHeader className="pt-3 px-3 border-b [.border-b]:pb-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-semibold">
              {ticket.ticketNumber} — {ticket.subject}
            </h4>
            <div className="text-sm">
              Status: <b>{ticket.status}</b> · Priority: <b>{ticket.priority}</b>
              {ticket.assignedTo && ticket.assignedTo.name ? <> · Assignee: <b>{ticket.assignedTo.name}</b></> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Member</div>
              <div className="text-sm font-medium">{ticket.user?.name}</div>
              <div className="text-xs">{ticket.user?.email}</div>
              {ticket.user?.phone ? <div className="text-xs">Phone: {ticket.user.phone}</div> : null}
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Created</div>
              <div className="text-sm">{new Date(ticket.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Due (SLA)</div>
              <div className={`text-sm ${new Date(ticket.dueAt) < new Date() ? "text-rose-600 font-semibold" : ""}`}>
                {new Date(ticket.dueAt).toLocaleString()}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Description</div>
            <div className="text-sm whitespace-pre-wrap">{ticket.description}</div>
          </div>

          {Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Attachments</div>
              <div className="flex flex-wrap gap-3 text-sm">
                {ticket.attachments.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" className="underline text-blue-600">
                    {a.name || a.type || "file"}
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit panel */}
      <Card className="mb-4">
        <CardHeader className="pt-3 px-3 border-b [.border-b]:pb-2">
          <h5 className="font-semibold">Update</h5>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500">Status</label>
            <select className="w-full border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
              {SUPPORT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Priority</label>
            <select className="w-full border rounded px-3 py-2" value={priority} onChange={e => setPriority(e.target.value)}>
              {SUPPORT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Category</label>
            <select className="w-full border rounded px-3 py-2" value={category} onChange={e => setCategory(e.target.value)}>
              {SUPPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Related Order ID</label>
            <Input value={relatedOrderId} onChange={e => setRelatedOrderId(e.target.value)} placeholder="Order.order_id (optional)" />
          </div>


          <div className="md:col-span-2">
            <div className="flex gap-2">
              <Button type="button" onClick={saveBasics}>Save</Button>
              <Button type="button" variant="secondary" onClick={assignToMe}>Assign to me</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mb-4">
        <CardHeader className="pt-3 px-3 border-b [.border-b]:pb-2">
          <h5 className="font-semibold">Notes</h5>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-6 gap-3 items-start">
            <div className="md:col-span-5">
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…" />
              <div className="mt-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={noteInternal} onChange={(e) => setNoteInternal(e.target.checked)} />
                  Internal note (hidden from member)
                </label>
              </div>
            </div>
            <div className="md:col-span-1 flex gap-2">
              <Button type="button" onClick={addInternalNote} className="w-full">Add</Button>
            </div>
          </div>

          {Array.isArray(ticket.notes) && ticket.notes.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-xs text-slate-500 mb-2">Timeline</div>
              <div className="space-y-2">
                {ticket.notes.map((n, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="text-xs opacity-70">{new Date(n.createdAt).toLocaleString()}</span>{" "}
                    {(() => {
                      const isMember =
                        ticket?.user?._id && String(n.by) === String(ticket.user._id);
                      const label = n.internal ? "internal" : (isMember ? "member" : "support");
                      const cls =
                        label === "internal"
                          ? "bg-slate-200"
                          : label === "member"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-indigo-100 text-indigo-700"; // support
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${cls}`}>
                          {label}
                        </span>
                      );
                    })()}

                    <div className="mt-1 whitespace-pre-wrap">{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve */}
      <Card className="mb-4">
        <CardHeader className="pt-3 px-3 border-b [.border-b]:pb-2">
          <h5 className="font-semibold">Resolve</h5>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500">Outcome</label>
            <select className="w-full border rounded px-3 py-2" value={outcome} onChange={e => setOutcome(e.target.value)}>
              <option value="">Select outcome</option>
              {SUPPORT_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Refund Amount</label>
            <Input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Replacement Order ID</label>
            <Input value={replacementOrderId} onChange={e => setReplacementOrderId(e.target.value)} placeholder="Order.order_id" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Points Δ (adjustment)</label>
            <Input type="number" value={pointsDelta} onChange={e => setPointsDelta(e.target.value)} placeholder="e.g. 100" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Resolution details</label>
            <Textarea value={resolutionDetails} onChange={e => setResolutionDetails(e.target.value)} placeholder="Add any details…" />
          </div>
          <div className="md:col-span-2">
            <Button type="button" onClick={markResolved}>Mark as Resolved</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
