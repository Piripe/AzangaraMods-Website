"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./adminLevels.module.css";
import BigTextBox from "../kit/bigTextbox";
import Button from "../kit/button";
import Card from "../kit/card";
import Chip from "../kit/chip";
import ComboBox from "../kit/combobox";
import EmptyState from "../kit/emptyState";
import IconButton from "../kit/iconButton";
import Menu from "../kit/menu";
import PageHeader from "../kit/pageHeader";
import Pagination from "../kit/pagination";
import Popup from "../kit/popup";
import Spinner from "../kit/spinner";
import SvgIcon from "../kit/svgIcon";
import Tabs, { TabPanel } from "../kit/tabs";
import TextBox from "../kit/textbox";
import AdminReports from "./adminReports";
import AdminUsers from "./adminUsers";
import useUserData from "@/hooks/useUserData";
import fetchApi from "@/utils/fetchApi";
import errorAlert from "@/utils/errorAlert";
import downloadLevelFile from "@/utils/downloadLevelFile";
import { LevelVerificationStatus } from "@/enums";
import { formatCount, formatRelativeDate, galleryImageUrl } from "@/utils/levelLabels";

// "reports" and "users" swap the level list for the user reports and the user accounts
export type StatusFilter = "all" | "published" | "drafts" | "pending" | "reports" | "users";
const statusTabs: { id: StatusFilter, label: string, icon: "map" | "public" | "lock" | "schedule" | "flag" | "person" }[] = [
  { id: "all", label: "All", icon: "map" },
  { id: "published", label: "Published", icon: "public" },
  { id: "drafts", label: "Drafts", icon: "lock" },
  { id: "pending", label: "Pending review", icon: "schedule" },
  { id: "reports", label: "Reports", icon: "flag" },
  { id: "users", label: "Users", icon: "person" },
];
const sortOptions = [
  { id: "updated", label: "Recently updated" },
  { id: "newest", label: "Newest" },
  { id: "downloads", label: "Downloads" },
];
const pageSize = 20;

type Notice = { title: string, errors: string[] };
type Confirm = { title: string, text: string, label: string, action: () => void };

function taskSummary(verb: string, noun: string, data: AdminTaskResponseData): Notice {
  const total = data.succeeded + data.failed;
  return {
    title: data.failed > 0
      ? `${verb} ${data.succeeded}/${total} ${noun}${total === 1 ? "" : "s"}, ${data.failed} failed`
      : `${verb} ${total} ${noun}${total === 1 ? "" : "s"}`,
    errors: data.errors,
  };
}

export default function AdminLevels({initialStatus = "all"}:{initialStatus?: StatusFilter}) {
  const {user, token} = useUserData();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [sortIndex, setSortIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [result, setResult] = useState<LevelSearchResult<AdminLevelHit>|null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [bulkBusy, setBulkBusy] = useState<string|null>(null);
  const [notice, setNotice] = useState<Notice|null>(null);
  const [confirm, setConfirm] = useState<Confirm|null>(null);
  const [rejecting, setRejecting] = useState<AdminLevelHit|null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [pendingCount, setPendingCount] = useState<number|undefined>(undefined);
  const [reportCount, setReportCount] = useState<number|undefined>(undefined);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status === "pending") params.set("verification", "pending");
  else if (status !== "all") params.set("published", (status === "published").toString());
  // The review queue is always oldest request first
  params.set("sort", status === "pending" ? "verificationRequested" : sortOptions[sortIndex].id);
  params.set("offset", ((page - 1) * pageSize).toString());
  params.set("limit", pageSize.toString());
  const apiQuery = params.toString();

  const isAdmin = user?.admin ?? false;
  const isReports = status === "reports";
  const isUsers = status === "users";
  const isLevels = !isReports && !isUsers;

  useEffect(()=>{
    if (!token || !isAdmin || !isLevels) return;
    let cancelled = false;
    fetchApi("/admin/levels?" + apiQuery, token).then(async res=>{
      if (cancelled) return;
      if (res.ok) {
        setResult(await res.json());
        setFailed(false);
      } else {
        setFailed(true);
      }
    }).catch(()=>{
      if (!cancelled) setFailed(true);
    });
    return ()=>{ cancelled = true; };
  }, [apiQuery, token, isAdmin, isLevels, reloadKey]);

  // Shown on the "Pending review" tab whichever tab is open
  useEffect(()=>{
    if (!token || !isAdmin) return;
    let cancelled = false;
    fetchApi("/admin/levels?verification=pending&limit=1", token).then(async res=>{
      if (!cancelled && res.ok) setPendingCount((await res.json() as LevelSearchResult).totalHits);
    }).catch(()=>{});
    fetchApi("/admin/reports/count", token).then(async res=>{
      if (!cancelled && res.ok) setReportCount(await res.json() as number);
    }).catch(()=>{});
    return ()=>{ cancelled = true; };
  }, [token, isAdmin, reloadKey]);

  function search(text: string) {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(()=>{
      setQuery(text.trim());
      setPage(1);
    }, 300);
  }

  // Runs a request for one level while its row shows `label`, then reloads the list
  async function runLevelTask<T>(level: AdminLevelHit, label: string, request: () => Promise<Response>, onSuccess: (data: T) => void) {
    setBusy(b=>({...b, [level.id]: label}));
    try {
      const res = await request();
      const data = await res.json();
      if (res.ok) onSuccess(data);
      else errorAlert(data);
    } catch {
      alert("The server didn't answer.");
    } finally {
      setBusy(b=>{
        const next = {...b};
        delete next[level.id];
        return next;
      });
      setReloadKey(k=>k + 1);
    }
  }

  async function runBulkTask(label: string, path: string, verb: string, noun: string) {
    setBulkBusy(label);
    setNotice(null);
    try {
      const res = await fetchApi(path, token!, "POST");
      const data = await res.json();
      if (res.ok) setNotice(taskSummary(verb, noun, data));
      else errorAlert(data);
    } catch {
      alert("The server didn't answer.");
    } finally {
      setBulkBusy(null);
      setReloadKey(k=>k + 1);
    }
  }

  function togglePublished(level: AdminLevelHit) {
    runLevelTask(level, level.published ? "Unpublishing…" : "Publishing…",
      ()=>fetchApi("/levels/" + level.id, token!, "PATCH", JSON.stringify({ published: !level.published })),
      ()=>{});
  }

  function reprocess(level: AdminLevelHit) {
    runLevelTask(level, "Reprocessing…",
      ()=>fetchApi(`/admin/levels/${level.id}/reprocess`, token!, "POST"),
      (data: AdminTaskResponseData)=>setNotice(taskSummary(`${level.name}: reprocessed`, "file", data)));
  }

  function refreshDiscord(level: AdminLevelHit) {
    runLevelTask(level, "Refreshing Discord…",
      ()=>fetchApi(`/admin/levels/${level.id}/discord`, token!, "POST"),
      ()=>setNotice({ title: `${level.name}: Discord message refreshed`, errors: [] }));
  }

  function approve(level: AdminLevelHit) {
    runLevelTask(level, "Approving…",
      ()=>fetchApi(`/admin/levels/${level.id}/verification/approve`, token!, "POST"),
      ()=>setNotice({ title: `${level.name} verified and published`, errors: [] }));
  }

  function openReject(level: AdminLevelHit) {
    setRejectNote("");
    setRejecting(level);
  }

  function reject(level: AdminLevelHit, note: string) {
    runLevelTask(level, "Rejecting…",
      ()=>fetchApi(`/admin/levels/${level.id}/verification/reject`, token!, "POST", JSON.stringify({ note })),
      ()=>setNotice({ title: `${level.name} rejected`, errors: [] }));
  }

  function download(level: AdminLevelHit) {
    if (!level.latestFileId) return;
    downloadLevelFile(level.id, level.latestFileId, level.latestFileName ?? level.name, token!);
  }

  function deleteLevel(level: AdminLevelHit) {
    setConfirm({
      title: "Delete level?",
      text: `"${level.name}" by ${level.author?.username ?? "unknown"} will be deleted with all its files and screenshots. This can't be undone.`,
      label: "Delete",
      action: ()=>runLevelTask(level, "Deleting…",
        ()=>fetchApi(`/admin/levels/${level.id}`, token!, "DELETE"),
        ()=>setNotice({ title: `${level.name} deleted`, errors: [] })),
    });
  }

  if (!user) return <Spinner/>;
  if (!isAdmin) return <EmptyState icon="shield" title="Admins only" text="You need to be an admin to see this page."/>;

  const pageCount = result ? Math.ceil(result.totalHits / pageSize) : 0;

  return (
    <div className={styles.container}>
      <PageHeader
        title="Admin"
        subtitle={isReports ? "Reports sent by users on level files" : isUsers ? "Every account on the site" : "Every level on the site, drafts included"}
        actions={<>
          <Button variant="outlined" icon="forum" disabled={bulkBusy !== null} click={()=>setConfirm({
            title: "Refresh all Discord messages?",
            text: "Every published level's Discord post is rewritten from its current data. This can take a while.",
            label: "Refresh",
            action: ()=>runBulkTask("Refreshing Discord messages…", "/admin/webhook/reload_messages", "Refreshed", "Discord message"),
          })}>Refresh Discord</Button>
          <Button variant="filled" icon="refresh" disabled={bulkBusy !== null} click={()=>setConfirm({
            title: "Reprocess every level?",
            text: "Every uploaded file is parsed again (path casing, entry point, room count) and rewritten on disk. This can take a while.",
            label: "Reprocess",
            action: ()=>runBulkTask("Reprocessing every level…", "/admin/levels/reprocess", "Reprocessed", "file"),
          })}>Reprocess all</Button>
        </>}
      />

      {bulkBusy &&
        <Card>
          <p className={styles.bulkBusy}><Spinner/>{bulkBusy}</p>
        </Card>
      }

      {notice &&
        <Card title={notice.title} actions={<IconButton icon="close" label="Dismiss" click={()=>setNotice(null)}/>}>
          {notice.errors.length > 0 &&
            <ul className={styles.errors}>
              {notice.errors.map((e, i)=><li key={i}>{e}</li>)}
            </ul>
          }
        </Card>
      }

      <Tabs tabs={statusTabs.map(t=>({...t, count: t.id === "reports" ? reportCount : t.id === status ? result?.totalHits : t.id === "pending" ? pendingCount : undefined}))} value={status} onChange={s=>{
        setStatus(s);
        setPage(1);
        // The search box is remounted with each tab, so its text would be lost
        clearTimeout(searchTimeout.current);
        setQuery("");
      }}/>

      <TabPanel tabs={statusTabs} value={status}>
        {isLevels &&
          <div className={styles.toolbar}>
            <TextBox className={styles.search} icon="search" placeholder="Search levels…" onChange={search}/>
            {status !== "pending" &&
              <ComboBox label="Sort by" values={sortOptions.map(s=>s.label)} defaultValue={sortIndex} onChange={i=>{
                setSortIndex(i);
                setPage(1);
              }}/>
            }
          </div>
        }

        {isReports ?
          <AdminReports onChanged={()=>setReloadKey(k=>k + 1)}/>
        : isUsers ?
          <AdminUsers/>
        : failed ?
          <EmptyState icon="map" title="Couldn't load levels" text="The server didn't answer. Try again in a moment."/>
        : !result ?
          <Spinner/>
        : result.hits.length === 0 ?
          status === "pending" && !query ?
            <EmptyState icon="check" title="No pending verifications" text="Every verification request has been reviewed."/>
          :
            <EmptyState icon="search" title="No levels found" text={query ? "Try another search." : "There are no levels here yet."}/>
        :
          <>
            <Card className={styles.list}>
              {result.hits.map(level=>(
                <div key={level.id} className={`${styles.row} ${busy[level.id] ? styles.busy : ""}`} aria-busy={!!busy[level.id]}>
                  <div className={styles.thumbnail}>
                    {level.thumbnailId ?
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={galleryImageUrl(level.id, level.thumbnailId)} alt="" loading="lazy"/>
                    :
                      <SvgIcon name="image" size={24}/>
                    }
                  </div>
                  <div className={styles.info}>
                    <p className={styles.title}>
                      <Link href={`/levels/${level.id}`} className={styles.name}>{level.name}</Link>
                      <span className={styles.author}>by {level.author?.username ?? "unknown"}</span>
                    </p>
                    <p className={styles.meta}>
                      <span><SvgIcon name="file" size={14}/>{level.fileCount} file{level.fileCount === 1 ? "" : "s"}</span>
                      <span title={`${level.downloads} downloads`}><SvgIcon name="download" size={14}/>{formatCount(level.downloads)}</span>
                      <span title={new Date(level.lastEdit).toLocaleString()}><SvgIcon name="history" size={14}/>{formatRelativeDate(level.lastEdit)}</span>
                      {level.verification === LevelVerificationStatus.Pending && level.verificationRequested &&
                        <span title={new Date(level.verificationRequested).toLocaleString()}><SvgIcon name="schedule" size={14}/>Requested {formatRelativeDate(level.verificationRequested)}</span>
                      }
                    </p>
                  </div>
                  <div className={styles.chips}>
                    {busy[level.id] ?
                      <Chip small variant="highlight" icon="schedule">{busy[level.id]}</Chip>
                    : status === "pending" && level.verification === LevelVerificationStatus.Pending ? <>
                      <Button variant="outlined" icon="download" disabled={!level.latestFileId} click={()=>download(level)}>Download</Button>
                      <Button variant="text" icon="close" click={()=>openReject(level)}>Reject</Button>
                      <Button variant="filled" icon="check" click={()=>approve(level)}>Approve</Button>
                    </> : <>
                      {level.published ?
                        <Chip small variant="success" icon="public">Published</Chip>
                      : level.verification === LevelVerificationStatus.Pending ?
                        <Chip small variant="highlight" icon="schedule">Pending review</Chip>
                      :
                        <Chip small variant="highlight" icon="lock">Draft</Chip>
                      }
                      {!level.published && level.verification === LevelVerificationStatus.Rejected && <Chip small icon="close">Rejected</Chip>}
                      {level.published && !level.hasDiscordMessage && <Chip small icon="forum">No Discord post</Chip>}
                    </>}
                  </div>
                  <Menu items={[
                    { label: "Open level page", icon: "openInNew", href: `/levels/${level.id}` },
                    { label: "Edit", icon: "edit", href: `/levels/${level.id}?edit` },
                    { label: "Download latest file", icon: "download", click: ()=>download(level), disabled: !level.latestFileId },
                    "divider",
                    ...(level.verification === LevelVerificationStatus.Pending ? [
                      { label: "Approve and publish", icon: "check", click: ()=>approve(level), disabled: !!busy[level.id] },
                      { label: "Reject", icon: "close", click: ()=>openReject(level), disabled: !!busy[level.id] },
                      "divider",
                    ] as const : []),
                    { label: level.published ? "Unpublish" : "Publish", icon: level.published ? "lock" : "public", click: ()=>togglePublished(level), disabled: !!busy[level.id] },
                    { label: "Reprocess files", icon: "refresh", click: ()=>reprocess(level), disabled: !!busy[level.id] || level.fileCount === 0 },
                    { label: "Refresh Discord message", icon: "forum", click: ()=>refreshDiscord(level), disabled: !!busy[level.id] },
                    "divider",
                    { label: "Delete", icon: "delete", click: ()=>deleteLevel(level), disabled: !!busy[level.id] },
                  ]}/>
                </div>
              ))}
            </Card>
            <Pagination page={page} pageCount={pageCount} onChange={setPage}/>
          </>
        }
      </TabPanel>

      {rejecting &&
        <Popup title="Reject verification?" closeCallback={()=>setRejecting(null)}>
          <div className={styles.dialog}>
            <p>&quot;{rejecting.name}&quot; by {rejecting.author?.username ?? "unknown"} stays a draft. The author sees your reason and can ask again.</p>
            <BigTextBox placeholder="Reason (optional)" maxLength={1024} onChange={setRejectNote}/>
            <div className={styles.dialogActions}>
              <Button variant="text" click={()=>setRejecting(null)}>Cancel</Button>
              <Button variant="filled" click={()=>{
                setRejecting(null);
                reject(rejecting, rejectNote);
              }}>Reject</Button>
            </div>
          </div>
        </Popup>
      }

      {confirm &&
        <Popup title={confirm.title} closeCallback={()=>setConfirm(null)}>
          <div className={styles.dialog}>
            <p>{confirm.text}</p>
            <div className={styles.dialogActions}>
              <Button variant="text" click={()=>setConfirm(null)}>Cancel</Button>
              <Button variant="filled" click={()=>{
                setConfirm(null);
                confirm.action();
              }}>{confirm.label}</Button>
            </div>
          </div>
        </Popup>
      }
    </div>
  );
}
