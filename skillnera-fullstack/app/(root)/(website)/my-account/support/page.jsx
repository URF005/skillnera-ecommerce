'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import UserPanelLayout from "@/components/Application/Website/UserPanelLayout";
import WebsiteBreadcrumb from "@/components/Application/Website/WebsiteBreadcrumb";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SUPPORT_CATEGORIES } from "@/lib/support";
import { showToast } from "@/lib/showToast";

const breadCrumbData = { title: "Support", links: [{ label: "Support" }] };

export default function MyTickets() {
  const [rows, setRows] = useState([]);
  const [load, setLoad] = useState(true);
  const [status, setStatus] = useState("");     // optional filter
  const [category, setCategory] = useState(""); // optional filter

  const loadTickets = async () => {
    setLoad(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      const { data } = await axios.get(`/api/support/tickets?${params.toString()}`);
      if (!data?.success) throw new Error(data?.message || "Failed");
      setRows(data.data || []);
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setLoad(false);
    }
  };

  useEffect(() => { loadTickets(); }, [status, category]);

  return (
    <div>
      <WebsiteBreadcrumb props={breadCrumbData} />
      <UserPanelLayout>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">My Tickets</h2>
          <Link href="/my-account/support/new">
            <Button type="button">New Ticket</Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          <select className="border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="open">open</option>
            <option value="in_process">in_process</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>
          <select className="border rounded px-3 py-2" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {SUPPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {load ? (
          <div className="p-6">Loading…</div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="p-6">No tickets yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {rows.map(t => (
              <Card key={t._id} className="border rounded">
                <CardHeader className="pt-3 px-3 border-b [.border-b]:pb-2">
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <div className="font-semibold">{t.ticketNumber}</div>
                      <div className="opacity-70">{t.subject}</div>
                    </div>
                    <Link className="text-violet-700 underline" href={`/my-account/support/${t._id}`}>View</Link>
                  </div>
                </CardHeader>
                <CardContent className="p-3 text-sm">
                  <div className="flex flex-wrap gap-4">
                    <div>Status: <b>{t.status}</b></div>
                    <div>Category: <b>{t.category}</b></div>
                    <div>Priority: <b>{t.priority}</b></div>
                    <div>Created: <b>{new Date(t.createdAt).toLocaleString()}</b></div>
                    <div>Due: <b>{new Date(t.dueAt).toLocaleString()}</b></div>
                    {t.relatedOrderId ? <div>Order: <b>{t.relatedOrderId}</b></div> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </UserPanelLayout>
    </div>
  );
}
