"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./adminLevels.module.css";
import Avatar from "../kit/avatar";
import Button from "../kit/button";
import Card from "../kit/card";
import Chip from "../kit/chip";
import ComboBox from "../kit/combobox";
import EmptyState from "../kit/emptyState";
import Menu from "../kit/menu";
import Pagination from "../kit/pagination";
import Popup from "../kit/popup";
import Spinner from "../kit/spinner";
import SvgIcon from "../kit/svgIcon";
import TextBox from "../kit/textbox";
import useUserData from "@/hooks/useUserData";
import fetchApi from "@/utils/fetchApi";
import errorAlert from "@/utils/errorAlert";
import { formatRelativeDate } from "@/utils/levelLabels";

const sortOptions = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "username", label: "Username" },
  { id: "levels", label: "Most levels" },
  { id: "lastLogin", label: "Last login" },
];
const pageSize = 20;

type Confirm = { title: string, text: string, label: string, action: () => void };
type UserPatch = { username?: string, email?: string, password?: string, verifiedModder?: boolean, admin?: boolean, suspended?: boolean };

// Users tab of the admin panel
export default function AdminUsers() {
  const {user: currentUser, setUser: setCurrentUser, token} = useUserData();

  const [query, setQuery] = useState("");
  const [sortIndex, setSortIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<AdminUserList|null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Confirm|null>(null);
  const [editing, setEditing] = useState<AdminUser|null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("sort", sortOptions[sortIndex].id);
  params.set("offset", ((page - 1) * pageSize).toString());
  params.set("limit", pageSize.toString());
  const apiQuery = params.toString();

  useEffect(()=>{
    if (!token) return;
    let cancelled = false;
    fetchApi("/admin/users?" + apiQuery, token).then(async res=>{
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

  function search(text: string) {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(()=>{
      setQuery(text.trim());
      setPage(1);
    }, 300);
  }

  // Runs a request for one user while its row shows `label`, then reloads the list
  async function runUserTask(target: AdminUser, label: string, request: () => Promise<Response>) {
    setBusy(b=>({...b, [target.id]: label}));
    try {
      const res = await request();
      if (!res.ok) errorAlert(await res.json());
    } catch {
      alert("The server didn't answer.");
    } finally {
      setBusy(b=>{
        const next = {...b};
        delete next[target.id];
        return next;
      });
      setReloadKey(k=>k + 1);
    }
  }

  function patch(target: AdminUser, label: string, body: UserPatch) {
    runUserTask(target, label, ()=>fetchApi(`/admin/users/${target.id}`, token!, "PATCH", JSON.stringify(body)));
  }

  function confirmTask(confirmData: Omit<Confirm, "action">, target: AdminUser, label: string, request: () => Promise<Response>) {
    setConfirm({...confirmData, action: ()=>runUserTask(target, label, request)});
  }

  function toggleSuspended(target: AdminUser) {
    if (target.suspended) {
      patch(target, "Lifting suspension…", { suspended: false });
      return;
    }
    confirmTask({
      title: "Suspend account?",
      text: `${target.username} is logged out everywhere and can't log in again until you lift the suspension. Their levels, downloads, profile picture and Discord posts are hidden meanwhile.`,
      label: "Suspend",
    }, target, "Suspending…", ()=>fetchApi(`/admin/users/${target.id}`, token!, "PATCH", JSON.stringify({ suspended: true })));
  }

  function toggleAdmin(target: AdminUser) {
    confirmTask({
      title: target.admin ? "Remove admin rights?" : "Make admin?",
      text: target.admin
        ? `${target.username} loses access to the admin panel.`
        : `${target.username} gets full access to the admin panel: every level, report and user.`,
      label: target.admin ? "Remove" : "Make admin",
    }, target, "Saving…", ()=>fetchApi(`/admin/users/${target.id}`, token!, "PATCH", JSON.stringify({ admin: !target.admin })));
  }

  function logOut(target: AdminUser) {
    confirmTask({
      title: "Log out everywhere?",
      text: `Every session of ${target.username} is closed. They can log in again right away.`,
      label: "Log out",
    }, target, "Logging out…", ()=>fetchApi(`/admin/users/${target.id}/sessions`, token!, "DELETE"));
  }

  function removeAvatar(target: AdminUser) {
    confirmTask({
      title: "Remove profile picture?",
      text: `The profile picture of ${target.username} is deleted. They can upload a new one.`,
      label: "Remove",
    }, target, "Removing picture…", ()=>fetchApi(`/admin/users/${target.id}/avatar`, token!, "DELETE"));
  }

  function deleteUser(target: AdminUser) {
    confirmTask({
      title: "Delete account?",
      text: `${target.username} is deleted with their ${target.levelCount} level${target.levelCount === 1 ? "" : "s"}, files and screenshots. This can't be undone.`,
      label: "Delete",
    }, target, "Deleting…", ()=>fetchApi(`/admin/users/${target.id}`, token!, "DELETE"));
  }

  const pageCount = result ? Math.ceil(result.totalHits / pageSize) : 0;

  return <>
    <div className={styles.toolbar}>
      <TextBox className={styles.search} icon="search" placeholder="Search by username, email or ID…" onChange={search}/>
      <ComboBox label="Sort by" values={sortOptions.map(s=>s.label)} defaultValue={sortIndex} onChange={i=>{
        setSortIndex(i);
        setPage(1);
      }}/>
    </div>

    {failed ?
      <EmptyState icon="person" title="Couldn't load users" text="The server didn't answer. Try again in a moment."/>
    : !result ?
      <Spinner/>
    : result.hits.length === 0 ?
      <EmptyState icon="search" title="No users found" text={query ? "Try another search." : "Nobody has registered yet."}/>
    :
      <>
        <Card className={styles.list}>
          {result.hits.map(u=>{
            const isSelf = u.id === currentUser?.id;
            const isBusy = !!busy[u.id];
            return (
              <div key={u.id} className={`${styles.row} ${styles.userRow} ${isBusy ? styles.busy : ""}`} aria-busy={isBusy}>
                <Avatar user={u} size={40} className={styles.avatar}/>
                <div className={styles.info}>
                  <p className={styles.title}>
                    {u.disabled ?
                      <span className={styles.name}>{u.username}</span>
                    :
                      <Link href={`/users/${u.id}`} className={styles.name}>{u.username}</Link>
                    }
                    {isSelf && <span className={styles.author}>(you)</span>}
                  </p>
                  <p className={styles.meta}>
                    <span><SvgIcon name="mail" size={14}/>{u.email}</span>
                    <span title={`${u.publishedLevelCount} published`}><SvgIcon name="map" size={14}/>{u.levelCount} level{u.levelCount === 1 ? "" : "s"}{u.levelCount > 0 && ` · ${u.publishedLevelCount} published`}</span>
                    <span title={new Date(u.creation).toLocaleString()}><SvgIcon name="event" size={14}/>Joined {formatRelativeDate(u.creation)}</span>
                    <span title={new Date(u.lastLogin).toLocaleString()}><SvgIcon name="history" size={14}/>Last login {formatRelativeDate(u.lastLogin)}</span>
                  </p>
                </div>
                <div className={styles.chips}>
                  {isBusy ?
                    <Chip small variant="highlight" icon="schedule">{busy[u.id]}</Chip>
                  : <>
                    {u.admin && <Chip small variant="highlight" icon="settings">Admin</Chip>}
                    {u.verifiedModder && <Chip small variant="success" icon="shield">Verified modder</Chip>}
                    {u.suspended ?
                      <Chip small icon="block">Suspended</Chip>
                    : u.disabled &&
                      <Chip small icon="lock">Disabled</Chip>
                    }
                  </>}
                </div>
                <Menu items={[
                  { label: "Open profile", icon: "openInNew", href: `/users/${u.id}`, disabled: u.disabled },
                  { label: "Edit account", icon: "edit", click: ()=>setEditing(u), disabled: isBusy },
                  "divider",
                  { label: u.verifiedModder ? "Remove verified modder" : "Make verified modder", icon: "shield", click: ()=>patch(u, "Saving…", { verifiedModder: !u.verifiedModder }), disabled: isBusy },
                  { label: u.admin ? "Remove admin rights" : "Make admin", icon: "settings", click: ()=>toggleAdmin(u), disabled: isBusy || isSelf },
                  { label: "Remove profile picture", icon: "image", click: ()=>removeAvatar(u), disabled: isBusy || !u.hasProfilePicture },
                  { label: "Log out everywhere", icon: "logout", click: ()=>logOut(u), disabled: isBusy || isSelf },
                  "divider",
                  { label: u.suspended ? "Lift suspension" : "Suspend account", icon: "block", click: ()=>toggleSuspended(u), disabled: isBusy || isSelf },
                  { label: "Delete account", icon: "delete", click: ()=>deleteUser(u), disabled: isBusy || isSelf },
                ]}/>
              </div>
            );
          })}
        </Card>
        <Pagination page={page} pageCount={pageCount} onChange={setPage}/>
      </>
    }

    {editing &&
      <EditUserPopup
        target={editing}
        token={token!}
        close={()=>setEditing(null)}
        onSaved={saved=>{
          setEditing(null);
          setReloadKey(k=>k + 1);
          if (currentUser && saved.id === currentUser.id) setCurrentUser({...currentUser, username: saved.username, email: saved.email});
        }}
      />
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

function EditUserPopup({target, token, close, onSaved}:{target:AdminUser, token:string, close:()=>void, onSaved:(user:AdminUser)=>void}) {
  const [username, setUsername] = useState(target.username);
  const [email, setEmail] = useState(target.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    // Only the changed fields are sent
    const body: UserPatch = {};
    if (username.trim() !== target.username) body.username = username.trim();
    if (email.trim() !== target.email) body.email = email.trim();
    if (password) body.password = password;
    if (Object.keys(body).length === 0) {
      close();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetchApi(`/admin/users/${target.id}`, token, "PATCH", JSON.stringify(body));
      const data = await res.json();
      if (res.ok) onSaved(data);
      else setError((data as ErrorResponse).error);
    } catch {
      setError("The server didn't answer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popup title={`Edit ${target.username}`} closeCallback={close}>
      <form className={styles.dialog} onSubmit={e=>{ e.preventDefault(); save(); }} noValidate>
        <TextBox label="Username" defaultValue={target.username} maxLength={32} autoComplete="off" onChange={setUsername}/>
        <TextBox label="Email" type="email" defaultValue={target.email} maxLength={256} autoComplete="off" onChange={setEmail}/>
        <TextBox label="New password" password newPassword supportingText="Leave empty to keep the current password. Changing it logs the user out everywhere." onChange={setPassword}/>
        {error && <p className={styles.formError} role="alert">{error}</p>}
        <div className={styles.dialogActions}>
          <Button variant="text" click={close}>Cancel</Button>
          <Button variant="filled" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Popup>
  );
}
