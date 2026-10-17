"use client";

import { useEffect, useState } from "react";
import styles from "../dashboard/uploadPopup.module.css";
import Popup from "../kit/popup";
import Button from "../kit/button";
import BigTextBox from "../kit/bigTextbox";
import RadioList from "../kit/radioList";
import Spinner from "../kit/spinner";
import { AuthBox, AuthMode } from "../authBox";
import useUserData from "@/hooks/useUserData";
import fetchApi from "@/utils/fetchApi";
import { reportCategories } from "@/utils/levelLabels";
import { ErrorCodes, ReportCategories } from "@/enums";

// Matches the limit in POST /levels/{id}/files/{fileId}/reports
const MAX_MESSAGE = 1024;

export default function ReportPopup({levelId, file, onClose}:{levelId:string, file:LevelFile, onClose:()=>void}) {
  const {user, token} = useUserData();
  // Null until GET /settings answers
  const [requireAccount, setRequireAccount] = useState<boolean|null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [category, setCategory] = useState<ReportCategories|null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(()=>{
    let cancelled = false;
    fetchApi("/settings", "").then(async res=>{
      if (!cancelled) setRequireAccount(res.ok ? (await res.json() as SiteSettings).reportsRequireAccount : false);
    }).catch(()=>{
      // The report request checks it again anyway
      if (!cancelled) setRequireAccount(false);
    });
    return ()=>{ cancelled = true; };
  }, []);

  const close = () => {
    if (!sending) onClose();
  };

  const messageMissing = category === ReportCategories.Other && message.trim().length === 0;

  const send = async () => {
    if (category === null) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetchApi(`/levels/${levelId}/files/${file.id}/reports`, token ?? "", "POST", JSON.stringify({ category, message: category === ReportCategories.Other ? message : null }));
      if (res.ok) {
        setSent(true);
      } else {
        try {
          const data = await res.json() as ErrorResponse;
          if (data.errorCode === ErrorCodes.ReportAccountRequired) setRequireAccount(true);
          setError(
            data.errorCode === ErrorCodes.ReportAccountRequired ? "Log in to report this file." :
            data.errorCode === ErrorCodes.ReportAlreadySent ? "You already reported this file. An admin will look at it soon." :
            data.errorCode === ErrorCodes.ReportRateLimited ? "You sent too many reports. Try again in an hour." :
            data.errorCode === ErrorCodes.ReportMessageRequired ? "Describe the problem." :
            data.error
          );
        } catch {
          setError(`Request failed (${res.status})`);
        }
      }
    } catch {
      setError("The server didn't answer. Try again in a moment.");
    }
    setSending(false);
  };

  return (
    <Popup title={`Report ${file.fileName}`} closeCallback={close}>
      <div className={styles.dialog}>
        {sent ? <>
          <p>Thanks for your report. An admin will look at it soon.</p>
          <div className={styles.dialogActions}>
            <Button variant="filled" click={onClose}>Close</Button>
          </div>
        </> : requireAccount === null ?
          <Spinner/>
        : requireAccount && !user ? <>
          <p>You need an account to report a file.</p>
          {/* Stays on the level page, where the form replaces this once logged in */}
          <AuthBox mode={authMode} setMode={setAuthMode} redirect={`/levels/${levelId}`}/>
        </> : <>
          <p>What&apos;s wrong with this file?</p>
          <RadioList
            label="Report category"
            options={reportCategories.map(c=>({ value: c.id.toString(), label: c.label, description: c.description }))}
            value={category?.toString() ?? null}
            disabled={sending}
            onChange={v=>{ setCategory(parseInt(v) as ReportCategories); setError(null); }}
          />
          {category === ReportCategories.Other &&
            <BigTextBox placeholder="Describe the problem" maxLength={MAX_MESSAGE} defaultValue={message} onChange={setMessage}/>
          }

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.dialogActions}>
            <Button variant="text" click={close} disabled={sending}>Cancel</Button>
            <Button variant="filled" icon="flag" click={send} disabled={sending || category === null || messageMissing}>{sending ? "Sending…" : "Send report"}</Button>
          </div>
        </>}
      </div>
    </Popup>
  );
}
