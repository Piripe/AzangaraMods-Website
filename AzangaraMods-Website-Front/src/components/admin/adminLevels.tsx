"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./adminLevels.module.css";
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
import Tabs from "../kit/tabs";
import TextBox from "../kit/textbox";
import useUserData from "@/hooks/useUserData";
import fetchApi from "@/utils/fetchApi";
import errorAlert from "@/utils/errorAlert";
import { formatCount, formatRelativeDate, galleryImageUrl } from "@/utils/levelLabels";

type StatusFilter = "all" | "published" | "drafts";
const statusTabs: { id: StatusFilter, label: string, icon: "map" | "public" | "lock" }[] = [
  { id: "all", label: "All", icon: "map" },
  { id: "published", label: "Published", icon: "public" },
  { id: "drafts", label: "Drafts", icon: "lock" },
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

export default function AdminLevels() {
  const {user, token} = useUserData();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortIndex, setSortIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [result, setResult] = useState<LevelSearchResult<AdminLevelHit>|null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [bulkBusy, setBulkBusy] = useState<string|null>(null);
  const [notice, setNotice] = useState<Notice|null>(null);
  const [confirm, setConfirm] = useState<Confirm|null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "all") params.set("published", (status === "published").toString());
  params.set("sort", sortOptions[sortIndex].id);
  params.set("offset", ((page - 1) * pageSize).toString());
  params.set("limit", pageSize.toString());
  const apiQuery = params.toString();

  const isAdmin = user?.admin ?? false;

  useEffect(()=>{
    if (!token || !isAdmin) return;
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
  }, [apiQuery, token, isAdmin, reloadKey]);

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
        subtitle="Every level on the site, drafts included"
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

      <div className={styles.toolbar}>
        <TextBox className={styles.search} label="Search levels" placeholder="Name or description" onChange={search}/>
        <ComboBox label="Sort by" values={sortOptions.map(s=>s.label)} defaultValue={sortIndex} onChange={i=>{
          setSortIndex(i);
          setPage(1);
        }}/>
      </div>
      <Tabs tabs={statusTabs.map(t=>({...t, count: t.id === status ? result?.totalHits : undefined}))} value={status} onChange={s=>{
        setStatus(s);
        setPage(1);
      }}/>

      {failed ?
        <EmptyState icon="map" title="Couldn't load levels" text="The server didn't answer. Try again in a moment."/>
      : !result ?
        <Spinner/>
      : result.hits.length === 0 ?
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
                    <Link href={`/dashboard/levels/${level.id}`} className={styles.name}>{level.name}</Link>
                    <span className={styles.author}>by {level.author?.username ?? "unknown"}</span>
                  </p>
                  <p className={styles.meta}>
                    <span><SvgIcon name="file" size={14}/>{level.fileCount} file{level.fileCount === 1 ? "" : "s"}</span>
                    <span title={`${level.downloads} downloads`}><SvgIcon name="download" size={14}/>{formatCount(level.downloads)}</span>
                    <span title={new Date(level.lastEdit).toLocaleString()}><SvgIcon name="history" size={14}/>{formatRelativeDate(level.lastEdit)}</span>
                  </p>
                </div>
                <div className={styles.chips}>
                  {busy[level.id] ?
                    <Chip small variant="highlight" icon="schedule">{busy[level.id]}</Chip>
                  : <>
                    {level.published ?
                      <Chip small variant="success" icon="public">Published</Chip>
                    :
                      <Chip small variant="highlight" icon="lock">Draft</Chip>
                    }
                    {level.published && !level.hasDiscordMessage && <Chip small icon="forum">No Discord post</Chip>}
                  </>}
                </div>
                <Menu items={[
                  { label: "Open public page", icon: "openInNew", href: `/levels/${level.id}` },
                  { label: "Edit", icon: "edit", href: `/dashboard/levels/${level.id}` },
                  "divider",
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
