'use client'
import React, { useEffect, useState } from "react";
import Dropzone from "react-dropzone";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/showToast";
function withPreview(setter) {
  return (files) => {
    const file = files?.[0];
    if (!file) return;
    setter((prev) => {
      // clean previous blob url
      if (prev?.preview) URL.revokeObjectURL(prev.preview);
      return { file, preview: URL.createObjectURL(file) };
    });
  };
}



const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env not set (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET). Restart dev server after setting .env.");
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPreset); // must be UNSIGNED
  fd.append("folder", "kyc");               // keep uploads organized

  // use resource_type=auto so png/jpg/webp all work
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const res = await fetch(url, { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = json?.error?.message || `Cloudinary upload failed (${res.status})`;
    throw new Error(msg);
  }
  return { url: json.secure_url, public_id: json.public_id };
}


function DocSlot({ label, value, onDrop }) {
  const hasImage = !!(value?.preview || value?.url);
  const src = value?.preview || value?.url || "";

  return (
    <div className="border rounded p-3">
      <div className="text-sm font-medium mb-2">{label}</div>
      <Dropzone
        accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
        multiple={false}
        onDrop={onDrop}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps()}
            className={`h-28 border-2 border-dashed rounded flex flex-col items-center justify-center text-sm cursor-pointer gap-1 ${isDragActive ? "bg-purple-50 border-purple-400" : "border-slate-200"
              }`}
          >
            <input {...getInputProps()} />
            {hasImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} className="h-20 object-contain" />
                <span className="text-[11px] text-slate-500">Click to replace</span>
              </>
            ) : (
              <span>{isDragActive ? "Drop it here…" : "Drop or click to upload"}</span>
            )}
          </div>
        )}
      </Dropzone>
    </div>
  );
}

export default function KycCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [extras, setExtras] = useState([]);

  // load my kyc
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/kyc/get", { cache: "no-store" });
        const json = await res.json();
        if (json?.success && json.data) {
          const k = json.data;
          setStatus(k.status);
          setIdFront(k.docs?.idFront || null);
          setIdBack(k.docs?.idBack || null);
          setSelfie(k.docs?.selfie || null);
          setExtras(k.docs?.extras || []);
        }
      } catch { }
    })();
  }, []);
  

async function handleSubmit() {
  if (status === "verified") {
    showToast("error", "KYC already verified; contact support to change.");
    return;
  }

  // ✅ accept either a selected File (pre-upload) or an existing URL
  const has = (slot) => !!(slot && (slot.file || slot.url));
  if (!has(idFront) || !has(idBack) || !has(selfie)) {
    showToast("error", "Please upload ID front, ID back, and a selfie.");
    return;
  }

  setLoading(true);
  try {
    // Upload helper (keeps already-uploaded URLs)
    async function ensureUploaded(slot) {
      if (!slot) return null;
      if (slot.url) return slot; // already uploaded
      if (slot.file) {
        const up = await uploadToCloudinary(slot.file); // unsigned upload
        return { ...up };
      }
      return null;
    }

    // Upload any new files now
    const [upFront, upBack, upSelfie] = await Promise.all([
      ensureUploaded(idFront),
      ensureUploaded(idBack),
      ensureUploaded(selfie),
    ]);

    // Build payload with final URLs
    const payload = {
      idFront: upFront || idFront,   // if idFront had url already, keep it
      idBack:  upBack  || idBack,
      selfie:  upSelfie|| selfie,
      extras:  [], // add later if needed
    };

    // Double-check we have URLs after upload
    const ok = (s) => s && s.url;
    if (!ok(payload.idFront) || !ok(payload.idBack) || !ok(payload.selfie)) {
      throw new Error("Upload failed: missing Cloudinary URL");
    }

    const res = await fetch("/api/kyc/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json?.success) throw new Error(json?.message || "Failed to submit KYC");

    setStatus(json.data?.status || "pending");
    showToast("success", "KYC submitted. We'll review it soon.");
  } catch (e) {
    showToast("error", e.message);
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="shadow rounded mt-6">
      <div className="p-5 text-xl font-semibold border-b">KYC Verification</div>
      <div className="p-5 space-y-4">
        <div className="text-sm">
          Status:&nbsp;
          <span className={`px-2 py-0.5 rounded-full text-xs ${status === "verified" ? "bg-emerald-100 text-emerald-700" :
              status === "pending" ? "bg-amber-100 text-amber-800" :
                "bg-slate-200 text-slate-700"
            }`}>
            {status || "not submitted"}
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <DocSlot label="ID Card (Front)" value={idFront} onDrop={withPreview(setIdFront)} />
          <DocSlot label="ID Card (Back)" value={idBack} onDrop={withPreview(setIdBack)} />
          <DocSlot label="Selfie holding ID" value={selfie} onDrop={withPreview(setSelfie)} />
        </div>

        <div className="text-xs text-amber-600">
          ⚠️ Upload clear images. We only accept **JPG/PNG/WEBP**. By submitting, you agree to our verification policy.
        </div>

        <div className="flex gap-2 items-center">
          <Button disabled={loading} onClick={handleSubmit} className="cursor-pointer">
            {loading ? "Submitting…" : "Submit/Update KYC"}
          </Button>
          {status === "verified" && (
            <span className="text-xs text-slate-600">Your KYC is verified. Uploads are locked.</span>
          )}
        </div>
      </div>
    </div>
  );
}
