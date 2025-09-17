'use client';

import { useState } from "react";
import axios from "axios";
import UserPanelLayout from "@/components/Application/Website/UserPanelLayout";
import WebsiteBreadcrumb from "@/components/Application/Website/WebsiteBreadcrumb";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from "@/lib/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/lib/showToast";
import { useRouter } from "next/navigation";

const breadCrumbData = { title: "New Support Ticket", links: [{ label: "Support" }, { label: "New Ticket" }] };

// Unsigned Cloudinary uploader (uses your env)
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

export default function NewTicket() {
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(SUPPORT_CATEGORIES[0]);
  const [priority, setPriority] = useState("Medium");
  const [relatedOrderId, setRelatedOrderId] = useState("");

  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const onFileSelect = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const submit = async () => {
    if (!subject.trim() || !description.trim()) {
      return showToast("error", "Please enter subject and description.");
    }
    setSubmitting(true);
    try {
      // upload attachments (if any)
      let attachments = [];
      for (const f of files) {
        const uploaded = await uploadToCloudinaryUnsigned(f);
        attachments.push(uploaded);
      }

      const payload = {
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        relatedOrderId: relatedOrderId || undefined,
        attachments,
      };

      const { data } = await axios.post("/api/support/tickets", payload);
      if (!data?.success) throw new Error(data?.message || "Failed");
      showToast("success", "Ticket created.");
      router.push("/my-account/support");
    } catch (e) {
      showToast("error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <WebsiteBreadcrumb props={breadCrumbData} />
      <UserPanelLayout>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-6 bg-white shadow-sm rounded-lg p-4 sm:p-6 lg:p-6">
          <div>
            <label className="block text-xs sm:text-sm text-slate-500 mb-1 sm:mb-2">Subject</label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary"
              className="text-xs sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-slate-500 mb-1 sm:mb-2">Category</label>
            <select
              className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {SUPPORT_CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-slate-500 mb-1 sm:mb-2">Priority</label>
            <select
              className="w-full border rounded px-3 py-2 text-xs sm:text-sm"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              {SUPPORT_PRIORITIES.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-slate-500 mb-1 sm:mb-2">Related Order ID (optional)</label>
            <Input
              value={relatedOrderId}
              onChange={e => setRelatedOrderId(e.target.value)}
              placeholder="Order.order_id"
              className="text-xs sm:text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm text-slate-500 mb-1 sm:mb-2">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your issue…"
              className="min-h-[120px] sm:min-h-[150px] text-xs sm:text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm text-slate-500 mb-1 sm:mb-2">Attachments (images/PDFs)</label>
            <Input
              type="file"
              multiple
              onChange={onFileSelect}
              accept="image/*,.pdf"
              className="block mt-1 text-xs sm:text-sm"
            />
            {files.length > 0 && (
              <ul className="text-xs sm:text-sm mt-2 sm:mt-3 list-disc pl-5">
                {files.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="sm:col-span-2">
            <Button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="w-full sm:w-auto min-w-[140px] text-xs sm:text-sm py-2 sm:py-2.5"
            >
              {submitting ? "Submitting…" : "Submit Ticket"}
            </Button>
          </div>
        </div>
      </UserPanelLayout>
    </div>
  );
}