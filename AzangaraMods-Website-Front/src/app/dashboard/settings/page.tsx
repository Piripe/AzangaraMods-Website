'use client';
import styles from "./page.module.css";
import Card from "@/components/kit/card";
import PageHeader from "@/components/kit/pageHeader";
import Spinner from "@/components/kit/spinner";
import Button from "@/components/kit/button";
import IconButton from "@/components/kit/iconButton";
import TextBox from "@/components/kit/textbox";
import FileSelect from "@/components/kit/fileSelect";
import Popup from "@/components/kit/popup";
import Chip from "@/components/kit/chip";
import Avatar from "@/components/kit/avatar";
import SvgIcon, { SvgIconName } from "@/components/kit/svgIcon";
import useUserData from "@/hooks/useUserData";
import fetchApi from "@/utils/fetchApi";
import { formatRelativeDate } from "@/utils/levelLabels";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type Status = { error: boolean, text: string } | null;

async function errorStatus(res: Response): Promise<Status> {
  try {
    const data = await res.json() as ErrorResponse;
    return { error: true, text: data.error };
  } catch {
    return { error: true, text: `Request failed (${res.status})` };
  }
}

function StatusText({status}:{status:Status}) {
  if (!status) return null;
  return <p className={status.error ? styles.error : styles.success} role="status">{status.text}</p>;
}

// Rough "Browser on OS" label from a user agent
function describeUserAgent(userAgent: string|null) {
  if (!userAgent) return "Unknown device";
  const browser =
    /Edg\//.test(userAgent) ? "Edge" :
    /OPR\//.test(userAgent) ? "Opera" :
    /Firefox\//.test(userAgent) ? "Firefox" :
    /Chrome\//.test(userAgent) ? "Chrome" :
    /Safari\//.test(userAgent) ? "Safari" :
    null;
  const os =
    /Windows/.test(userAgent) ? "Windows" :
    /Android/.test(userAgent) ? "Android" :
    /iPhone|iPad/.test(userAgent) ? "iOS" :
    /Mac OS X/.test(userAgent) ? "macOS" :
    /Linux/.test(userAgent) ? "Linux" :
    null;
  if (!browser && !os) return userAgent.slice(0, 64);
  return [browser ?? "Unknown browser", os].filter(Boolean).join(" on ");
}

function Section({title, icon, description, children, className}:{title:string, icon:SvgIconName, description?:ReactNode, children:ReactNode, className?:string}) {
  return (
    <Card className={`${styles.section} ${className ?? ""}`} title={<h2 className={styles.sectionTitle}><SvgIcon name={icon} size={22}/>{title}</h2>}>
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </Card>
  );
}

export default function Page() {
  const router = useRouter();
  const {user, setUser, token, setToken, avatarVersion, bumpAvatarVersion} = useUserData();

  // Logs out locally once the server has dropped every token (disabled or deleted account)
  const logOutLocally = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    router.push("/");
  };

  return (
    (!user || !token) ? <Spinner/> :
      <div>
        <PageHeader title="Settings" subtitle="Manage your profile, account and data"/>
        <div className={styles.sections}>
          <ProfileSection user={user} token={token} setUser={setUser} avatarVersion={avatarVersion} bumpAvatarVersion={bumpAvatarVersion}/>
          <EmailSection user={user} token={token} setUser={setUser}/>
          <PasswordSection token={token} setUser={setUser}/>
          <SessionsSection token={token}/>
          <DataSection token={token}/>
          <DangerSection user={user} token={token} onDone={logOutLocally}/>
        </div>
      </div>
  );
}

function ProfileSection({user, token, setUser, avatarVersion, bumpAvatarVersion}:{user:User, token:string, setUser:(u:User)=>void, avatarVersion:number, bumpAvatarVersion:()=>void}) {
  const [username, setUsername] = useState(user.username);
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);
  const [avatarPopup, setAvatarPopup] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File|null>(null);
  const [avatarStatus, setAvatarStatus] = useState<Status>(null);

  const saveUsername = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetchApi("/users/@me/username", token, "PATCH", JSON.stringify({ username }));
    if (res.ok) {
      setUser(await res.json());
      setStatus({ error: false, text: "Username updated." });
    } else {
      setStatus(await errorStatus(res));
    }
    setLoading(false);
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setLoading(true);
    setAvatarStatus(null);
    const form = new FormData();
    form.append("file", avatarFile);
    const res = await fetchApi("/users/@me/avatar", token, "PUT", form, null);
    if (res.ok) {
      setUser(await res.json());
      bumpAvatarVersion();
      setAvatarPopup(false);
      setAvatarFile(null);
    } else {
      setAvatarStatus(res.status === 413 ? { error: true, text: "This image is too big (5 MB max)." } : await errorStatus(res));
    }
    setLoading(false);
  };

  const removeAvatar = async () => {
    setLoading(true);
    const res = await fetchApi("/users/@me/avatar", token, "DELETE");
    if (res.ok) {
      setUser(await res.json());
      bumpAvatarVersion();
    } else {
      setStatus(await errorStatus(res));
    }
    setLoading(false);
  };

  return (
    <Section title="Profile" icon="person" description="Your username and profile picture are shown on your levels.">
      <div className={styles.avatarRow}>
        <Avatar user={user} size={88} version={avatarVersion}/>
        <div className={styles.actions}>
          <Button icon="upload" click={()=>{ setAvatarStatus(null); setAvatarPopup(true); }} disabled={loading}>Change picture</Button>
          {user.hasProfilePicture && <Button variant="text" click={removeAvatar} disabled={loading}>Remove</Button>}
        </div>
      </div>
      <div className={styles.field}>
        <TextBox placeholder="Username" icon="person" usernameEntry={true} defaultValue={user.username} maxLength={32} supportingText="3 to 32 characters" onChange={setUsername}/>
        <Button variant="filled" click={saveUsername} disabled={loading || username.trim() === user.username || username.trim().length < 3}>Save</Button>
      </div>
      <StatusText status={status}/>

      {avatarPopup &&
        <Popup title="Change profile picture" closeCallback={()=>setAvatarPopup(false)}>
          <div className={styles.dialog}>
            <p>PNG, JPEG, WebP or AVIF, up to 5 MB. It will be cropped to a square.</p>
            <FileSelect accept=".png, .jpg, .jpeg, .webp, .avif" onChange={setAvatarFile} disabled={loading}/>
            <StatusText status={avatarStatus}/>
            <div className={styles.dialogActions}>
              <Button variant="text" click={()=>setAvatarPopup(false)}>Cancel</Button>
              <Button variant="filled" click={uploadAvatar} disabled={loading || !avatarFile}>Upload</Button>
            </div>
          </div>
        </Popup>
      }
    </Section>
  );
}

function EmailSection({user, token, setUser}:{user:User, token:string, setUser:(u:User)=>void}) {
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);
  // Remounts the password box to clear it
  const [formKey, setFormKey] = useState(0);

  const save = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetchApi("/users/@me/email", token, "PATCH", JSON.stringify({ email: email.trim(), password }));
    if (res.ok) {
      setUser(await res.json());
      setPassword("");
      setFormKey(k => k + 1);
      setStatus({ error: false, text: "Email updated." });
    } else {
      setStatus(await errorStatus(res));
    }
    setLoading(false);
  };

  return (
    <Section title="Email" icon="mail" description="The address you log in with.">
      <div className={styles.stack} key={formKey}>
        <TextBox placeholder="Email" icon="mail" defaultValue={user.email} maxLength={256} onChange={setEmail}/>
        <TextBox placeholder="Current password" icon="lock" password={true} onChange={setPassword}/>
      </div>
      <StatusText status={status}/>
      <div className={styles.formActions}>
        <Button variant="filled" click={save} disabled={loading || !password || email.trim() === user.email || !email.trim()}>Change email</Button>
      </div>
    </Section>
  );
}

function PasswordSection({token, setUser}:{token:string, setUser:(u:User)=>void}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const save = async () => {
    if (newPassword !== confirmPassword) {
      setStatus({ error: true, text: "The new passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setStatus({ error: true, text: "The new password must be at least 8 characters long." });
      return;
    }
    setLoading(true);
    setStatus(null);
    const res = await fetchApi("/users/@me/password", token, "PATCH", JSON.stringify({ currentPassword, newPassword }));
    if (res.ok) {
      setUser(await res.json());
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFormKey(k => k + 1);
      setStatus({ error: false, text: "Password changed. Your other sessions were logged out." });
    } else {
      setStatus(await errorStatus(res));
    }
    setLoading(false);
  };

  return (
    <Section title="Password" icon="lock" description="Changing your password logs out every other session.">
      <div className={styles.stack} key={formKey}>
        <TextBox placeholder="Current password" icon="lock" password={true} onChange={setCurrentPassword}/>
        <TextBox placeholder="New password" password={true} newPassword={true} supportingText="At least 8 characters" onChange={setNewPassword}/>
        <TextBox placeholder="Confirm new password" password={true} newPassword={true} onChange={setConfirmPassword}/>
      </div>
      <StatusText status={status}/>
      <div className={styles.formActions}>
        <Button variant="filled" click={save} disabled={loading || !currentPassword || !newPassword || !confirmPassword}>Change password</Button>
      </div>
    </Section>
  );
}

function SessionsSection({token}:{token:string}) {
  const [sessions, setSessions] = useState<Session[]|null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    (async ()=>{
      const res = await fetchApi("/users/@me/sessions", token);
      if (res.ok) setSessions(await res.json());
      else setStatus(await errorStatus(res));
    })();
  }, [token]);

  const revoke = async (session: Session) => {
    setBusy(true);
    const res = await fetchApi("/users/@me/sessions/" + session.id, token, "DELETE");
    if (res.ok) setSessions(s => s?.filter(x => x.id !== session.id) ?? null);
    else setStatus(await errorStatus(res));
    setBusy(false);
  };

  const revokeOthers = async () => {
    setBusy(true);
    const res = await fetchApi("/users/@me/sessions", token, "DELETE");
    if (res.ok) setSessions(s => s?.filter(x => x.current) ?? null);
    else setStatus(await errorStatus(res));
    setBusy(false);
  };

  const others = sessions?.filter(x => !x.current).length ?? 0;

  return (
    <Section title="Sessions" icon="devices" description="Devices where you are logged in. Log out any session you don't recognize.">
      {!sessions ? <Spinner/> :
        <ul className={styles.sessions}>
          {sessions.map(session => (
            <li key={session.id} className={styles.session}>
              <span className={styles.sessionIcon}><SvgIcon name="devices" size={20}/></span>
              <div className={styles.sessionInfo}>
                <p className={styles.sessionName} title={session.userAgent ?? undefined}>
                  {describeUserAgent(session.userAgent)}
                  {session.current && <Chip small variant="highlight">This device</Chip>}
                </p>
                <p className={styles.sessionMeta}>
                  {[
                    session.ipAddress,
                    "Active " + formatRelativeDate(session.lastUsed),
                    "Logged in " + new Date(session.created).toLocaleDateString(),
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
              {!session.current && <IconButton icon="logout" label="Log out" variant="danger" click={()=>revoke(session)} disabled={busy}/>}
            </li>
          ))}
        </ul>
      }
      <StatusText status={status}/>
      <div className={styles.formActions}>
        <Button variant="outlined" icon="logout" click={revokeOthers} disabled={busy || others === 0}>Log out other sessions</Button>
      </div>
    </Section>
  );
}

function DataSection({token}:{token:string}) {
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  // The endpoint needs the token header, so the archive is fetched then saved from a blob URL
  const download = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetchApi("/users/@me/data", token);
    if (res.ok) {
      const url = URL.createObjectURL(await res.blob());
      const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1];
      const link = document.createElement("a");
      link.href = url;
      link.download = name ? decodeURIComponent(name) : "azangaramods-data.zip";
      link.click();
      URL.revokeObjectURL(url);
    } else {
      setStatus(await errorStatus(res));
    }
    setLoading(false);
  };

  return (
    <Section title="Your data" icon="download" description={<>
      Download a copy of everything Azangara Mods stores about you: your account details, sessions, levels with their uploaded files and screenshots, and your profile picture. The archive contains JSON files you can open in any text editor.
    </>}>
      <StatusText status={status}/>
      <div className={styles.formActions}>
        <Button variant="tonal" icon="download" click={download} disabled={loading}>{loading ? "Preparing archive…" : "Download my data"}</Button>
      </div>
    </Section>
  );
}

function DangerSection({user, token, onDone}:{user:User, token:string, onDone:()=>void}) {
  const [action, setAction] = useState<"disable"|"delete"|null>(null);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  const open = (a: "disable"|"delete") => {
    setAction(a);
    setPassword("");
    setConfirmText("");
    setStatus(null);
  };

  const confirm = async () => {
    setLoading(true);
    setStatus(null);
    const res = action === "disable"
      ? await fetchApi("/users/@me/disable", token, "POST", JSON.stringify({ password }))
      : await fetchApi("/users/@me", token, "DELETE", JSON.stringify({ password }));
    setLoading(false);
    if (res.ok) {
      setAction(null);
      onDone();
    } else {
      setStatus(await errorStatus(res));
    }
  };

  const levelCount = user.levels?.length ?? 0;

  return (
    <Section title="Danger zone" icon="warning" className={styles.danger}>
      <div className={styles.dangerRow}>
        <div>
          <p className={styles.dangerTitle}>Disable account</p>
          <p className={styles.description}>Hides your levels and profile picture and logs you out everywhere. Log in again at any time to restore everything.</p>
        </div>
        <Button variant="danger" icon="block" click={()=>open("disable")}>Disable</Button>
      </div>
      <div className={styles.dangerRow}>
        <div>
          <p className={styles.dangerTitle}>Delete account</p>
          <p className={styles.description}>Permanently deletes your account, your {levelCount} level{levelCount === 1 ? "" : "s"} with their files and screenshots, and your profile picture. This can&apos;t be undone.</p>
        </div>
        <Button variant="danger" icon="delete" click={()=>open("delete")}>Delete</Button>
      </div>

      {action &&
        <Popup title={action === "disable" ? "Disable your account?" : "Delete your account?"} closeCallback={()=>setAction(null)}>
          <div className={styles.dialog}>
            {action === "disable" ?
              <p>Your levels will be hidden and you will be logged out of every device. Logging in again re-enables your account.</p>
            :
              <p>Your account and all your levels will be deleted for good. Consider downloading your data first. Type <strong>{user.username}</strong> to confirm.</p>
            }
            <div className={styles.stack}>
              {action === "delete" && <TextBox placeholder="Username" onChange={setConfirmText}/>}
              <TextBox placeholder="Password" icon="lock" password={true} onChange={setPassword}/>
            </div>
            <StatusText status={status}/>
            <div className={styles.dialogActions}>
              <Button variant="text" click={()=>setAction(null)}>Cancel</Button>
              <Button variant="danger" click={confirm} disabled={loading || !password || (action === "delete" && confirmText !== user.username)}>
                {action === "disable" ? "Disable account" : "Delete account"}
              </Button>
            </div>
          </div>
        </Popup>
      }
    </Section>
  );
}
