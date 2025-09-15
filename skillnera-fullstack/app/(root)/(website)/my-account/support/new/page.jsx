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
    <div>
      <WebsiteBreadcrumb props={breadCrumbData} />
      <UserPanelLayout>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500">Subject</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Category</label>
            <select className="w-full border rounded px-3 py-2" value={category} onChange={e => setCategory(e.target.value)}>
              {SUPPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Priority</label>
            <select className="w-full border rounded px-3 py-2" value={priority} onChange={e => setPriority(e.target.value)}>
              {SUPPORT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Related Order ID (optional)</label>
            <Input value={relatedOrderId} onChange={e => setRelatedOrderId(e.target.value)} placeholder="Order.order_id" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your issue…" />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Attachments (images/PDFs)</label>
            <input type="file" multiple onChange={onFileSelect} className="block mt-1" accept="image/*,.pdf" />
            {files.length > 0 && (
              <ul className="text-xs mt-2 list-disc pl-5">
                {files.map((f, i) => <li key={i}>{f.name}</li>)}
              </ul>
            )}
          </div>

          <div className="md:col-span-2">
            <Button type="button" onClick={submit} disabled={submitting} className="min-w-[140px]">
              {submitting ? "Submitting…" : "Submit Ticket"}
            </Button>
          </div>
        </div>
      </UserPanelLayout>
    </div>
  );
}
