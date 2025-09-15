'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import UserPanelLayout from "@/components/Application/Website/UserPanelLayout";
import WebsiteBreadcrumb from "@/components/Application/Website/WebsiteBreadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { showToast } from "@/lib/showToast";

// same unsigned upload helper as create page
async function uploadToCloudinaryUnsigned(file, folder = "support") {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);
  fd.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const out = await res.json();
  return {
    url: out.secure_url,
    public_id: out.public_id,
    type: out.resource_type || file.type,
    name: out.original_filename,
    size: file.size,
  };
}

export default function TicketDetails() {
  const { id } = useParams();
  const [t, setT] = useState(null);
  const [load, setLoad] = useState(true);

  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [posting, setPosting] = useState(false);

  const breadCrumbData = { title: "Ticket", links: [{ label: "Support", href: "/my-account/support" }, { label: "Ticket" }] };

  const fetchData = async () => {
    setLoad(true);
    try {
      const { data } = await axios.get(`/api/support/tickets/${id}`);
      if (!data?.success) throw new Error(data?.message || "Failed");
      setT(data.data);
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setLoad(false);
    }
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const onFileSelect = (e) => setFiles(Array.from(e.target.files || []));

  const sendReply = async () => {
    if (!message.trim()) return showToast("error", "Please write a message.");
    setPosting(true);
    try {
      let attachments = [];
      for (const f of files) {
        attachments.push(await uploadToCloudinaryUnsigned(f));
      }
      const payload = { message: message.trim(), attachments };
      const { data } = await axios.post(`/api/support/tickets/${id}/reply`, payload);
      if (!data?.success) throw new Error(data?.message || "Failed");
      setMessage("");
      setFiles([]);
      showToast("success", "Reply sent.");
      await fetchData();
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setPosting(false);
    }
  };

  if (load) return <div className="p-6">Loading…</div>;
  if (!t) return <div className="p-6">Not found.</div>;

  return (
    <div>
      <WebsiteBreadcrumb props={breadCrumbData} />
      <UserPanelLayout>
        <div className="space-y-6">
          <div className="border rounded p-4">
            <div className="flex flex-wrap gap-4 justify-between">
              <div>
                <div className="text-sm opacity-70">Ticket</div>
                <div className="font-semibold">{t.ticketNumber}</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Status</div>
                <div className="font-semibold">{t.status}</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Category</div>
                <div className="font-semibold">{t.category}</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Priority</div>
                <div className="font-semibold">{t.priority}</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Created</div>
                <div className="font-semibold">{new Date(t.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm opacity-70">Due</div>
                <div className={`font-semibold ${new Date(t.dueAt) < new Date() ? "text-rose-600" : ""}`}>
                  {new Date(t.dueAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm opacity-70">Subject</div>
              <div className="font-medium">{t.subject}</div>
            </div>

            <div className="mt-3">
              <div className="text-sm opacity-70">Description</div>
              <div className="whitespace-pre-wrap text-sm">{t.description}</div>
            </div>

            {Array.isArray(t.attachments) && t.attachments.length > 0 && (
              <div className="mt-3">
                <div className="text-sm opacity-70">Attachments</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {t.attachments.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" className="underline text-blue-600">
                      {a.name || a.type || "file"}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conversation (member-visible notes only) */}
          <div className="border rounded p-4">
            <div className="font-semibold mb-3">Conversation</div>
            {(!t.notes || t.notes.length === 0) ? (
              <div className="text-sm opacity-70">No messages yet.</div>
            ) : (
              <div className="space-y-4">
                {t.notes.map((n, idx) => (
                  <div key={idx} className="border rounded p-3">
                    <div className="text-xs opacity-70 mb-1">{new Date(n.createdAt).toLocaleString()}</div>
                    <div className="text-sm whitespace-pre-wrap">{n.message}</div>
                    {Array.isArray(n.attachments) && n.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {n.attachments.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" className="underline text-blue-600">
                            {a.name || a.type || "file"}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reply box */}
            <div className="mt-4 grid md:grid-cols-6 gap-3 items-start">
              <div className="md:col-span-5">
                <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your reply…" />
                <div className="mt-2">
                  <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} accept="image/*,.pdf" />
                  {files.length > 0 && (
                    <ul className="text-xs mt-2 list-disc pl-5">
                      {files.map((f, i) => <li key={i}>{f.name}</li>)}
                    </ul>
                  )}
                </div>
              </div>
              <div className="md:col-span-1">
                <Button type="button" onClick={sendReply} disabled={posting} className="w-full">
                  {posting ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </UserPanelLayout>
    </div>
  );
}
