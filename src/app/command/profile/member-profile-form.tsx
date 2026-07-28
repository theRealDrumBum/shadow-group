"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PrivateDetails = {
  legal_name: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  health_notes: string;
  allergies: string;
  medications: string;
  blood_type: string;
};

type PublicProfile = {
  display_name: string;
  callsign: string;
  primary_role: string;
  secondary_role: string;
  short_bio: string;
  bio: string;
  portrait_url: string;
  gallery_urls: string[];
  instagram: string;
  youtube: string;
  website: string;
};

type SubmissionSummary = {
  status: string;
  review_notes: string | null;
  submitted_at: string | null;
};

const EMPTY_PRIVATE: PrivateDetails = {
  legal_name: "",
  phone: "",
  email: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relationship: "",
  health_notes: "",
  allergies: "",
  medications: "",
  blood_type: ""
};

const EMPTY_PUBLIC: PublicProfile = {
  display_name: "",
  callsign: "",
  primary_role: "",
  secondary_role: "",
  short_bio: "",
  bio: "",
  portrait_url: "",
  gallery_urls: [],
  instagram: "",
  youtube: "",
  website: ""
};

export function MemberProfileForm() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [priv, setPriv] = useState<PrivateDetails>(EMPTY_PRIVATE);
  const [pub, setPub] = useState<PublicProfile>(EMPTY_PUBLIC);
  const [latest, setLatest] = useState<SubmissionSummary | null>(null);
  const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(null);

  const [savingPrivate, setSavingPrivate] = useState(false);
  const [savingPublic, setSavingPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [privateMessage, setPrivateMessage] = useState<string | null>(null);
  const [publicMessage, setPublicMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Your session expired. Sign in again.");
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name,email,operator_id")
        .eq("id", user.id)
        .maybeSingle();

      const { data: details } = await supabase
        .from("member_private_details")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (details) {
        setPriv({ ...EMPTY_PRIVATE, ...Object.fromEntries(Object.entries(details).filter(([, v]) => v != null)) as Partial<PrivateDetails> });
      } else {
        setPriv((current) => ({ ...current, email: profile?.email ?? "", legal_name: profile?.display_name ?? "" }));
      }

      const { data: submissions } = await supabase
        .from("member_profile_submissions")
        .select("id,status,review_notes,submitted_at,display_name,callsign,primary_role,secondary_role,short_bio,bio,portrait_url,gallery_urls,social_links")
        .eq("profile_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1);
      const submission = submissions?.[0];

      let operator: Record<string, unknown> | null = null;
      if (profile?.operator_id) {
        const { data } = await supabase
          .from("operators")
          .select("display_name,callsign,primary_role,secondary_role,short_bio,long_bio,portrait_url,gallery_urls")
          .eq("id", profile.operator_id)
          .maybeSingle();
        operator = data;
      }

      const social = (submission?.social_links ?? {}) as Record<string, string>;
      const source = submission ?? operator;
      if (source) {
        setPub({
          display_name: (source.display_name as string) ?? profile?.display_name ?? "",
          callsign: (source.callsign as string) ?? "",
          primary_role: (source.primary_role as string) ?? "",
          secondary_role: (source.secondary_role as string) ?? "",
          short_bio: (source.short_bio as string) ?? "",
          bio: (submission?.bio as string) ?? (operator?.long_bio as string) ?? "",
          portrait_url: (source.portrait_url as string) ?? "",
          gallery_urls: ((source.gallery_urls as string[]) ?? []) ?? [],
          instagram: social.instagram ?? "",
          youtube: social.youtube ?? "",
          website: social.website ?? ""
        });
      } else {
        setPub((current) => ({ ...current, display_name: profile?.display_name ?? "" }));
      }

      if (submission) {
        setLatest({ status: submission.status, review_notes: submission.review_notes, submitted_at: submission.submitted_at });
        setPendingSubmissionId(submission.status === "pending" ? submission.id : null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function savePrivate() {
    setSavingPrivate(true);
    setPrivateMessage(null);
    setError(null);
    try {
      const supabase = createClient();
      if (!userId) throw new Error("Your session expired. Sign in again.");
      const { error: saveError } = await supabase
        .from("member_private_details")
        .upsert({ profile_id: userId, ...priv, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });
      if (saveError) throw saveError;
      setPrivateMessage("Saved. Your private details are stored securely and are not shown publicly.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your private details.");
    } finally {
      setSavingPrivate(false);
    }
  }

  async function uploadImage(file: File, prefix: string): Promise<string | null> {
    const supabase = createClient();
    if (!userId) throw new Error("Your session expired. Sign in again.");
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/${prefix}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("member-media")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("member-media").getPublicUrl(path);
    return data.publicUrl ?? null;
  }

  async function onPortraitSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, "portrait");
      if (url) setPub((current) => ({ ...current, portrait_url: url }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload the image.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function onGallerySelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadImage(file, "gallery");
        if (url) urls.push(url);
      }
      setPub((current) => ({ ...current, gallery_urls: [...current.gallery_urls, ...urls] }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload the images.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removeGalleryImage(url: string) {
    setPub((current) => ({ ...current, gallery_urls: current.gallery_urls.filter((item) => item !== url) }));
  }

  async function submitPublic() {
    setSavingPublic(true);
    setPublicMessage(null);
    setError(null);
    try {
      const supabase = createClient();
      if (!userId) throw new Error("Your session expired. Sign in again.");
      const record = {
        profile_id: userId,
        submission_type: "member" as const,
        display_name: pub.display_name || null,
        callsign: pub.callsign || null,
        primary_role: pub.primary_role || null,
        secondary_role: pub.secondary_role || null,
        short_bio: pub.short_bio || null,
        bio: pub.bio || null,
        portrait_url: pub.portrait_url || null,
        gallery_urls: pub.gallery_urls,
        social_links: {
          instagram: pub.instagram || undefined,
          youtube: pub.youtube || undefined,
          website: pub.website || undefined
        },
        status: "pending" as const,
        review_notes: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (pendingSubmissionId) {
        const { error: updateError } = await supabase
          .from("member_profile_submissions")
          .update(record)
          .eq("id", pendingSubmissionId);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("member_profile_submissions")
          .insert(record)
          .select("id")
          .single();
        if (insertError) throw insertError;
        setPendingSubmissionId(data.id);
      }

      setLatest({ status: "pending", review_notes: null, submitted_at: record.submitted_at });
      setPublicMessage("Submitted for review. An administrator will approve it before it appears on the public site.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your profile for review.");
    } finally {
      setSavingPublic(false);
    }
  }

  if (loading) {
    return <div className="profile-loading"><Loader2 className="spin" size={18} /> Loading your profile…</div>;
  }

  return (
    <div className="member-forms">
      {error ? <div className="notice" role="alert">{error}</div> : null}

      {/* ---------- Public profile ---------- */}
      <form
        className="command-panel member-form"
        onSubmit={(event) => { event.preventDefault(); submitPublic(); }}
      >
        <div className="panel-label">
          <span>PUBLIC PROFILE // REVIEWED BEFORE IT GOES LIVE</span>
          {latest ? <span className={`status-pill status-${latest.status}`}>{latest.status.replace(/_/g, " ")}</span> : null}
        </div>

        {latest?.status === "changes_requested" && latest.review_notes ? (
          <div className="notice" role="status">Changes requested: {latest.review_notes}</div>
        ) : null}
        {latest?.status === "rejected" && latest.review_notes ? (
          <div className="notice" role="status">Not approved: {latest.review_notes}</div>
        ) : null}
        {latest?.status === "approved" ? (
          <div className="notice" role="status"><ShieldCheck size={14} /> Your latest profile is approved and live.</div>
        ) : null}

        <p className="form-hint">
          Anything here is public once an administrator approves it. Nothing is published automatically.
        </p>

        <div className="field-grid">
          <label>Display name
            <input value={pub.display_name} onChange={(e) => setPub({ ...pub, display_name: e.target.value })} />
          </label>
          <label>Callsign
            <input value={pub.callsign} onChange={(e) => setPub({ ...pub, callsign: e.target.value })} />
          </label>
          <label>Primary role
            <input value={pub.primary_role} onChange={(e) => setPub({ ...pub, primary_role: e.target.value })} placeholder="Rifleman, Sniper, Medic…" />
          </label>
          <label>Secondary role
            <input value={pub.secondary_role} onChange={(e) => setPub({ ...pub, secondary_role: e.target.value })} />
          </label>
        </div>

        <label>Short bio (one line)
          <input value={pub.short_bio} onChange={(e) => setPub({ ...pub, short_bio: e.target.value })} maxLength={160} />
        </label>
        <label>Bio
          <textarea value={pub.bio} onChange={(e) => setPub({ ...pub, bio: e.target.value })} rows={5} />
        </label>

        <div className="field-grid">
          <label>Instagram
            <input value={pub.instagram} onChange={(e) => setPub({ ...pub, instagram: e.target.value })} placeholder="https://instagram.com/…" />
          </label>
          <label>YouTube
            <input value={pub.youtube} onChange={(e) => setPub({ ...pub, youtube: e.target.value })} placeholder="https://youtube.com/@…" />
          </label>
          <label>Website
            <input value={pub.website} onChange={(e) => setPub({ ...pub, website: e.target.value })} placeholder="https://…" />
          </label>
        </div>

        <div className="upload-row">
          <div className="portrait-preview">
            {/* Member-uploaded imagery from Supabase storage; plain img keeps upload preview simple. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {pub.portrait_url ? <img src={pub.portrait_url} alt="Your portrait preview" /> : <span className="portrait-empty">No photo yet</span>}
          </div>
          <div className="upload-actions">
            <label className="button ghost upload-button">
              <Upload size={15} /> {pub.portrait_url ? "Replace photo" : "Upload a photo of yourself"}
              <input type="file" accept="image/*" onChange={onPortraitSelected} hidden />
            </label>
            <label className="button ghost upload-button">
              <Upload size={15} /> Add gallery images
              <input type="file" accept="image/*" multiple onChange={onGallerySelected} hidden />
            </label>
            {uploading ? <span className="upload-status"><Loader2 className="spin" size={14} /> Uploading…</span> : null}
          </div>
        </div>

        {pub.gallery_urls.length ? (
          <div className="gallery-strip">
            {pub.gallery_urls.map((url) => (
              <div className="gallery-thumb" key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Gallery image" />
                <button type="button" onClick={() => removeGalleryImage(url)} aria-label="Remove image">×</button>
              </div>
            ))}
          </div>
        ) : null}

        {publicMessage ? <div className="form-success">{publicMessage}</div> : null}
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={savingPublic || uploading}>
            {savingPublic ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      </form>

      {/* ---------- Private details ---------- */}
      <form
        className="command-panel member-form"
        onSubmit={(event) => { event.preventDefault(); savePrivate(); }}
      >
        <div className="panel-label">
          <span>PRIVATE DETAILS // NEVER SHOWN PUBLICLY</span>
          <span><ShieldCheck size={13} /> ENCRYPTED AT REST</span>
        </div>
        <p className="form-hint">
          Only you and Shadow Group administrators can see this. It is never published to the website.
        </p>

        <div className="field-grid">
          <label>Legal name
            <input value={priv.legal_name} onChange={(e) => setPriv({ ...priv, legal_name: e.target.value })} />
          </label>
          <label>Phone
            <input value={priv.phone} onChange={(e) => setPriv({ ...priv, phone: e.target.value })} />
          </label>
          <label>Email
            <input value={priv.email} onChange={(e) => setPriv({ ...priv, email: e.target.value })} />
          </label>
          <label>Address
            <input value={priv.address} onChange={(e) => setPriv({ ...priv, address: e.target.value })} />
          </label>
        </div>

        <fieldset className="form-section">
          <legend>Emergency contact</legend>
          <div className="field-grid">
            <label>Contact name
              <input value={priv.emergency_contact_name} onChange={(e) => setPriv({ ...priv, emergency_contact_name: e.target.value })} />
            </label>
            <label>Contact phone
              <input value={priv.emergency_contact_phone} onChange={(e) => setPriv({ ...priv, emergency_contact_phone: e.target.value })} />
            </label>
            <label>Relationship
              <input value={priv.emergency_contact_relationship} onChange={(e) => setPriv({ ...priv, emergency_contact_relationship: e.target.value })} />
            </label>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Medical</legend>
          <p className="form-hint">
            At some point, we want to get nice cards printed for the games rather than fill it out each time —
            we&apos;re just collecting this data now for the future.
          </p>
          <div className="field-grid">
            <label>Blood type
              <input value={priv.blood_type} onChange={(e) => setPriv({ ...priv, blood_type: e.target.value })} />
            </label>
            <label>Allergies
              <input value={priv.allergies} onChange={(e) => setPriv({ ...priv, allergies: e.target.value })} />
            </label>
            <label>Medications
              <input value={priv.medications} onChange={(e) => setPriv({ ...priv, medications: e.target.value })} />
            </label>
          </div>
          <label>Health issues / notes
            <textarea value={priv.health_notes} onChange={(e) => setPriv({ ...priv, health_notes: e.target.value })} rows={4} />
          </label>
        </fieldset>

        {privateMessage ? <div className="form-success">{privateMessage}</div> : null}
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={savingPrivate}>
            {savingPrivate ? "Saving…" : "Save private details"}
          </button>
        </div>
      </form>
    </div>
  );
}
