"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./adminLevels.module.css";
import Button from "../kit/button";
import Card from "../kit/card";
import Chip from "../kit/chip";
import ComboBox from "../kit/combobox";
import EmptyState from "../kit/emptyState";
import Menu from "../kit/menu";
import Pagination from "../kit/pagination";
import Popup from "../kit/popup";
import RadioList from "../kit/radioList";
import Spinner from "../kit/spinner";
import SvgIcon from "../kit/svgIcon";
import useUserData from "@/hooks/useUserData";
import fetchApi from "@/utils/fetchApi";
import errorAlert from "@/utils/errorAlert";
import downloadLevelFile from "@/utils/downloadLevelFile";
import { ReportStatus } from "@/enums";
import { formatRelativeDate, reportCategoryNames } from "@/utils/levelLabels";

const statusOptions: { status: ReportStatus|null, label: string }[] = [
  { status: ReportStatus.Open, label: "Open" },
  { status: ReportStatus.Resolved, label: "Resolved" },
  { status: ReportStatus.Dismissed, label: "Dismissed" },
  { status: null, label: "All" },
];
const pageSize = 20;

type Confirm = { title: string, text: string, label: string, action: () => void };

// Reports tab of the admin panel. onChanged tells the panel to refresh the open report count
export default function AdminReports({onChanged}:{onChanged:()=>void}) {
  const {token} = useUserData();

  const [statusIndex, setStatusIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<LevelReportList|null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Confirm|null>(null);
  const [settings, setSettings] = useState<SiteSettings|null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const status = statusOptions[statusIndex].status;
  const params = new URLSearchParams();
  if (status !== null) params.set("status", status.toString());
  params.set("offset", ((page - 1) * pageSize).toString());
  params.set("limit", pageSize.toString());
  const apiQuery = params.toString();

  useEffect(()=>{
    if (!token) return;
    let cancelled = false;
    fetchApi("/admin/reports?" + apiQuery, token).then(async res=>{
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
  }, [apiQuery, token, reloadKey]);

  useEffect(()=>{
    let cancelled = false;
    fetchApi("/settings", token ?? "").then(async res=>{
      if (!cancelled && res.ok) setSettings(await res.json());
    }).catch(()=>{});
    return ()=>{ cancelled = true; };
  }, [token]);

  async function setRequireAccount(reportsRequireAccount: boolean) {
    setSettingsBusy(true);
    try {
      const res = await fetchApi("/admin/settings", token!, "PATCH", JSON.stringify({ reportsRequireAccount }));
      const data = await res.json();
      if (res.ok) setSettings(data);
      else errorAlert(data);
    } catch {
      alert("The server didn't answer.");
    } finally {
      setSettingsBusy(false);
    }
  }

  // Runs a request for one report while its row shows `label`, then reloads the list
  async function runReportTask(report: AdminLevelReport, label: string, request: () => Promise<Response>) {
    setBusy(b=>({...b, [report.id]: label}));
    try {
      const res = await request();
      if (!res.ok) errorAlert(await res.json());
    } catch {
      alert("The server didn't answer.");
    } finally {
      setBusy(b=>{
        const next = {...b};
        delete next[report.id];
        return next;
      });
      setReloadKey(k=>k + 1);
      onChanged();
    }
  }

  function setStatus(report: AdminLevelReport, newStatus: ReportStatus, label: string) {
    runReportTask(report, label,
      ()=>fetchApi(`/admin/reports/${report.id}/status`, token!, "POST", JSON.stringify({ status: newStatus })));
  }

  function deleteReport(report: AdminLevelReport) {
    runReportTask(report, "Deleting…", ()=>fetchApi(`/admin/reports/${report.id}`, token!, "DELETE"));
  }

  function deleteLevel(report: AdminLevelReport) {
    const name = report.level?.name ?? "This level";
    setConfirm({
      title: "Delete level?",
      text: `"${name}" by ${report.level?.author?.username ?? "unknown"} will be deleted with all its files, screenshots and reports. This can't be undone.`,
      label: "Delete",
      action: ()=>runReportTask(report, "Deleting level…", ()=>fetchApi(`/admin/levels/${report.levelId}`, token!, "DELETE")),
    });
  }

  function download(report: AdminLevelReport) {
    downloadLevelFile(report.levelId, report.levelFileId, report.levelFile?.fileName ?? report.level?.name ?? "level", token!);
  }

  const pageCount = result ? Math.ceil(result.totalHits / pageSize) : 0;

  return <>
    <Card title="Who can report">
      {settings ?
        <RadioList
          label="Who can report"
          value={settings.reportsRequireAccount ? "account" : "anyone"}
          disabled={settingsBusy}
          onChange={v=>setRequireAccount(v === "account")}
          options={[
            { value: "anyone", label: "Anyone", description: "Visitors without an account can report files too." },
            { value: "account", label: "Logged-in users only", description: "Use this if anonymous reports get spammy." },
          ]}
        />
      :
        <Spinner/>
      }
    </Card>

    <div className={styles.toolbar}>
      <ComboBox label="Show" values={statusOptions.map(s=>s.label)} defaultValue={statusIndex} onChange={i=>{
        setStatusIndex(i);
        setPage(1);
      }}/>
    </div>

    {failed ?
      <EmptyState icon="flag" title="Couldn't load reports" text="The server didn't answer. Try again in a moment."/>
    : !result ?
      <Spinner/>
    : result.hits.length === 0 ?
      status === ReportStatus.Open ?
        <EmptyState icon="check" title="No open reports" text="Every report has been handled."/>
      :
        <EmptyState icon="flag" title="No reports" text="There are no reports here."/>
    :
      <>
        <Card className={styles.list}>
          {result.hits.map(report=>(
            <div key={report.id} className={`${styles.row} ${busy[report.id] ? styles.busy : ""}`} aria-busy={!!busy[report.id]}>
              <div className={styles.thumbnail}>
                <SvgIcon name="flag" size={24}/>
              </div>
              <div className={styles.info}>
                <p className={styles.title}>
                  <Link href={`/levels/${report.levelId}`} className={styles.name}>{report.level?.name ?? "Deleted level"}</Link>
                  <span className={styles.author}>by {report.level?.author?.username ?? "unknown"}</span>
                </p>
                <p className={styles.meta}>
                  <span><SvgIcon name="file" size={14}/>{report.levelFile?.fileName ?? "Deleted file"}</span>
                  <span title={report.ipAddress ?? undefined}><SvgIcon name="person" size={14}/>{report.reporter?.username ?? "Anonymous"}</span>
                  <span title={new Date(report.created).toLocaleString()}><SvgIcon name="schedule" size={14}/>{formatRelativeDate(report.created)}</span>
                </p>
                {report.message && <p className={styles.message}>{report.message}</p>}
              </div>
              <div className={styles.chips}>
                {busy[report.id] ?
                  <Chip small variant="highlight" icon="schedule">{busy[report.id]}</Chip>
                : report.status === ReportStatus.Open ? <>
                  <Chip small variant="highlight" icon="flag">{reportCategoryNames[report.category] ?? "Unknown"}</Chip>
                  <Button variant="text" icon="close" click={()=>setStatus(report, ReportStatus.Dismissed, "Dismissing…")}>Dismiss</Button>
                  <Button variant="filled" icon="check" click={()=>setStatus(report, ReportStatus.Resolved, "Resolving…")}>Resolve</Button>
                </> : <>
                  <Chip small icon="flag">{reportCategoryNames[report.category] ?? "Unknown"}</Chip>
                  {report.status === ReportStatus.Resolved ?
                    <Chip small variant="success" icon="check">Resolved</Chip>
                  :
                    <Chip small icon="close">Dismissed</Chip>
                  }
                </>}
              </div>
              <Menu items={[
                { label: "Open level page", icon: "openInNew", href: `/levels/${report.levelId}` },
                { label: "Edit level", icon: "edit", href: `/levels/${report.levelId}?edit` },
                { label: "Download reported file", icon: "download", click: ()=>download(report) },
                "divider",
                ...(report.status === ReportStatus.Open ? [
                  { label: "Resolve", icon: "check", click: ()=>setStatus(report, ReportStatus.Resolved, "Resolving…"), disabled: !!busy[report.id] },
                  { label: "Dismiss", icon: "close", click: ()=>setStatus(report, ReportStatus.Dismissed, "Dismissing…"), disabled: !!busy[report.id] },
                ] as const : [
                  { label: "Reopen", icon: "refresh", click: ()=>setStatus(report, ReportStatus.Open, "Reopening…"), disabled: !!busy[report.id] },
                ] as const),
                { label: "Delete report", icon: "delete", click: ()=>deleteReport(report), disabled: !!busy[report.id] },
                "divider",
                { label: "Delete level", icon: "delete", click: ()=>deleteLevel(report), disabled: !!busy[report.id] },
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
  </>;
}
