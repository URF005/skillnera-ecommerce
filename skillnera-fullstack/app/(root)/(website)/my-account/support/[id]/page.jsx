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

  if (load) return <div className="p-4 sm:p-6">Loading…</div>;
  if (!t) return <div className="p-4 sm:p-6">Not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <WebsiteBreadcrumb props={breadCrumbData} />
      <UserPanelLayout>
        <div className="space-y-6">
          <div className="border rounded-lg p-4 sm:p-6 bg-white shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <div className="text-xs sm:text-sm opacity-70">Ticket</div>
                <div className="font-semibold text-sm sm:text-base">{t.ticketNumber}</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm opacity-70">Status</div>
                <div className="font-semibold text-sm sm:text-base">{t.status}</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm opacity-70">Category</div>
                <div className="font-semibold text-sm sm:text-base">{t.category}</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm opacity-70">Priority</div>
                <div className="font-semibold text-sm sm:text-base">{t.priority}</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm opacity-70">Created</div>
                <div className="font-semibold text-sm sm:text-base">{new Date(t.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm opacity-70">Due</div>
                <div className={`font-semibold text-sm sm:text-base ${new Date(t.dueAt) < new Date() ? "text-rose-600" : ""}`}>
                  {new Date(t.dueAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6">
              <div className="text-xs sm:text-sm opacity-70">Subject</div>
              <div className="font-medium text-sm sm:text-base">{t.subject}</div>
            </div>

            <div className="mt-3 sm:mt-4">
              <div className="text-xs sm:text-sm opacity-70">Description</div>
              <div className="whitespace-pre-wrap text-sm sm:text-base">{t.description}</div>
            </div>

            {Array.isArray(t.attachments) && t.attachments.length > 0 && (
              <div className="mt-3 sm:mt-4">
                <div className="text-xs sm:text-sm opacity-70">Attachments</div>
                <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
                  {t.attachments.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" className="underline text-blue-600 hover:text-blue-800">
                      {a.name || a.type || "file"}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conversation (member-visible notes only) */}
          <div className="border rounded-lg p-4 sm:p-6 bg-white shadow-sm">
            <div className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Conversation</div>
            {(!t.notes || t.notes.length === 0) ? (
              <div className="text-xs sm:text-sm opacity-70">No messages yet.</div>
            ) : (
              <div className="space-y-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                {t.notes.map((n, idx) => (
                  <div key={idx} className="border rounded p-3 sm:p-4">
                    <div className="text-xs opacity-70 mb-1 sm:mb-2">{new Date(n.createdAt).toLocaleString()}</div>
                    <div className="text-xs sm:text-sm whitespace-pre-wrap">{n.message}</div>
                    {Array.isArray(n.attachments) && n.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 sm:gap-3 text-xs">
                        {n.attachments.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" className="underline text-blue-600 hover:text-blue-800">
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
            <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-6 gap-3 sm:gap-4 items-start">
              <div className="sm:col-span-5">
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write your reply…"
                  className="text-xs sm:text-sm min-h-[100px] sm:min-h-[120px]"
                />
                <div className="mt-2 sm:mt-3">
                  <Input
                    type="file"
                    multiple
                    onChange={onFileSelect}
                    accept="image/*,.pdf"
                    className="text-xs sm:text-sm"
                  />
                  {files.length > 0 && (
                    <ul className="text-xs mt-2 sm:mt-3 list-disc pl-5">
                      {files.map((f, i) => <li key={i}>{f.name}</li>)}
                    </ul>
                  )}
                </div>
              </div>
              <div className="sm:col-span-1">
                <Button
                  type="button"
                  onClick={sendReply}
                  disabled={posting}
                  className="w-full text-xs sm:text-sm py-2 sm:py-2.5"
                >
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