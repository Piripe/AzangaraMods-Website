'use client';
import styles from "./page.module.css";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useUserData from "@/hooks/useUserData";
import fetchApi from "@/utils/fetchApi";
import errorAlert from "@/utils/errorAlert";
import downloadLevelFile from "@/utils/downloadLevelFile";
import { useBackTarget } from "@/utils/backTarget";
import { LevelVerificationStatus } from "@/enums";
import BigTextBox from "@/components/kit/bigTextbox";
import MarkdownTextBox from "@/components/kit/markdownTextbox";
import Button, { buttonClass } from "@/components/kit/button";
import Card from "@/components/kit/card";
import Chip from "@/components/kit/chip";
import ComboBox from "@/components/kit/combobox";
import TagsInput from "@/components/kit/tagsInput";
import TextBox from "@/components/kit/textbox";
import IconButton from "@/components/kit/iconButton";
import EmptyState from "@/components/kit/emptyState";
import Lightbox from "@/components/kit/lightbox";
import Markdown from "@/components/kit/markdown";
import LinkButton from "@/components/kit/linkButton";
import Menu from "@/components/kit/menu";
import Popup from "@/components/kit/popup";
import Spinner from "@/components/kit/spinner";
import Avatar from "@/components/kit/avatar";
import SvgIcon, { SvgIconName } from "@/components/kit/svgIcon";
import Tabs, { Tab, TabPanel } from "@/components/kit/tabs";
import formatBytes from "@/utils/fileSize";
import { markdownHint } from "@/utils/markdown";
import { difficultyNames, formatCount, formatRelativeDate, galleryImageUrl, getRoomsText, levelFileDownloadUrl } from "@/utils/levelLabels";
import LevelFileUploadPopup from "@/components/dashboard/levelFileUploadPopup";
import GalleryUploadPopup from "@/components/dashboard/galleryUploadPopup";
import ReportPopup from "@/components/levels/reportPopup";

type LevelTab = "description" | "gallery" | "versions";
type LevelAction = "publish" | "verification" | "approve" | "reject" | "delete" | "save";
// Edited fields; rooms keep the raw text so the field can be validated while typing
type LevelDraft = { name: string, description: string, difficulty: LevelDifficulties, roomAmount: string, tags: string[] };

const difficulties = Object.keys(difficultyNames).map(Number) as LevelDifficulties[];

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);
  const { user, setUser, token, tokenLoaded, updateLevel } = useUserData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const backTarget = useBackTarget();

  const [level, setLevel] = useState<Level|null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<LevelTab>("description");
  const [lightboxIndex, setLightboxIndex] = useState<number|null>(null);
  const [uploadPopup, setUploadPopup] = useState<"file"|"gallery"|null>(null);
  const [dialog, setDialog] = useState<"delete"|"reject"|null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [reportFile, setReportFile] = useState<LevelFile|null>(null);
  // The management action whose request is running, and the label its button shows meanwhile
  const [busy, setBusy] = useState<{ action: LevelAction, label: string }|null>(null);
  // Set while the level is edited in place
  const [draft, setDraft] = useState<LevelDraft|null>(null);

  // Waits for the token to be loaded, so authors can preview their unpublished levels
  useEffect(()=>{
    if (!tokenLoaded) return;
    let cancelled = false;
    fetchApi("/levels/" + id, token ?? "").then(async res=>{
      if (cancelled) return;
      if (res.ok) {
        setLevel(await res.json());
        setFailed(false);
      } else {
        setFailed(true);
      }
    }).catch(()=>{
      if (!cancelled) setFailed(true);
    });
    return ()=>{ cancelled = true; };
  }, [id, token, tokenLoaded]);

  const saveLevel = (data: Level) => {
    setLevel(data);
    updateLevel(data);
  };

  // Reloads the level after an upload or a deletion changed its files or room count
  const reloadLevel = async () => {
    const res = await fetchApi("/levels/" + id, token!);
    const data = await res.json();
    if (!res.ok) {
      errorAlert(data);
      return;
    }
    // An upload during editing recounts the rooms, which replaces the count unless the user changed it
    setDraft(d => d && level && d.roomAmount === level.roomAmount.toString() ? { ...d, roomAmount: data.roomAmount.toString() } : d);
    saveLevel(data);
  };

  // Runs a management request while its button shows `label`. Publish and verification responses leave out
  // the files, gallery and author, so those are kept from the loaded level. `onSuccess` replaces that update,
  // `onSaved` runs after it
  const levelRequest = async (action: LevelAction, label: string, path: string, method: string, body: BodyInit | null = null, onSuccess?: () => void, onSaved?: () => void) => {
    setBusy({ action, label });
    try {
      const res = await fetchApi(path, token!, method, body);
      const data = await res.json();
      if (!res.ok) {
        errorAlert(data);
      } else if (onSuccess) {
        onSuccess();
      } else if (level) {
        saveLevel({ ...level, ...data, levelFiles: level.levelFiles, galleryFiles: level.galleryFiles, author: level.author, downloads: level.downloads });
        onSaved?.();
      }
    } catch {
      alert("The server didn't answer.");
    } finally {
      setBusy(null);
    }
  };

  const deleteFile = async (f: LevelFile) => {
    const res = await fetchApi(`/levels/${id}/files/${f.id}`, token!, "DELETE");
    if (res.ok) await reloadLevel();
    else errorAlert(await res.json());
  };

  const deleteGalleryFile = async (f: GalleryFile) => {
    const res = await fetchApi(`/levels/${id}/gallery/${f.id}`, token!, "DELETE");
    if (res.ok) await reloadLevel();
    else errorAlert(await res.json());
  };

  const startEditing = (l: Level) => {
    setDraft({
      name: l.name,
      description: l.description,
      difficulty: l.difficulty,
      roomAmount: l.roomAmount.toString(),
      tags: l.tags?.filter(t=>t.length > 0) ?? [],
    });
    setTab("description");
  };

  const editDraft = (changes: Partial<LevelDraft>) => setDraft(d => d && { ...d, ...changes });

  // Only the fields that differ from the level, so an unchanged level keeps its last edit date
  const draftChanges = (l: Level, d: LevelDraft) => {
    const changes: Partial<Pick<Level, "name" | "description" | "difficulty" | "roomAmount" | "tags">> = {};
    if (d.name.trim() !== l.name) changes.name = d.name.trim();
    if (d.description !== l.description) changes.description = d.description;
    if (d.difficulty !== l.difficulty) changes.difficulty = d.difficulty;
    if (Number(d.roomAmount) !== l.roomAmount) changes.roomAmount = Number(d.roomAmount);
    const oldTags = l.tags?.filter(t=>t.length > 0) ?? [];
    if (d.tags.length !== oldTags.length || d.tags.some((t, i)=>t !== oldTags[i])) changes.tags = d.tags;
    return changes;
  };

  const dirty = level != null && draft != null && Object.keys(draftChanges(level, draft)).length > 0;

  // Admin pages link to ?edit to open the level straight in edit mode
  const editRequested = searchParams.has("edit");
  const [editRequestHandled, setEditRequestHandled] = useState(false);
  // Waits for the level and, when logged in, for the user
  if (editRequested && !editRequestHandled && level && tokenLoaded && (user || !token)) {
    setEditRequestHandled(true);
    if (user && (user.id === level.authorId || user.admin)) startEditing(level);
  }
  useEffect(()=>{
    if (editRequested && editRequestHandled) router.replace("/levels/" + id, { scroll: false });
  }, [editRequested, editRequestHandled, router, id]);

  // Warns before leaving the page with unsaved changes
  useEffect(()=>{
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return ()=>window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const saveDraft = () => {
    if (!level || !draft) return;
    const changes = draftChanges(level, draft);
    if (Object.keys(changes).length === 0) {
      setDraft(null);
      return;
    }
    levelRequest("save", "Saving…", "/levels/" + id, "PATCH", JSON.stringify(changes), undefined, ()=>setDraft(null));
  };

  if (!level) {
    if (!failed) return <Spinner/>;
    return (
      <EmptyState
        icon="map"
        title="Level not found"
        text="This level doesn't exist or isn't published."
        action={<LinkButton variant="filled" icon="search" href="/levels">Browse levels</LinkButton>}
      />
    );
  }

  const tags = level.tags?.filter(t=>t.length > 0) ?? [];
  const files = [...level.levelFiles ?? []].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  const gallery = [...level.galleryFiles ?? []].sort((a, b) => new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime());
  const latest = files[0];
  const isAuthor = user != null && user.id === level.authorId;
  const isAdmin = user?.admin ?? false;
  const canEdit = isAuthor || isAdmin;
  // Authors who aren't Verified Modders need an admin to verify the level before publishing it
  const canPublish = level.published || user?.verifiedModder || isAdmin || level.verification === LevelVerificationStatus.Verified;
  const pending = !level.published && level.verification === LevelVerificationStatus.Pending;
  const rejected = !level.published && level.verification === LevelVerificationStatus.Rejected;
  // Drafts only download with the token, which a plain link doesn't send
  const download = (f: LevelFile) => downloadLevelFile(level.id, f.id, f.fileName, token!);
  const downloads = level.downloads ?? 0;

  const nameError = draft && draft.name.trim() === "" ? "Give your level a name" : null;
  const descriptionError = draft && draft.description.trim() === "" ? "Write a short description of your level" : null;
  const draftRooms = draft ? Number(draft.roomAmount) : 0;
  const roomsError = draft && (draft.roomAmount.trim() === "" || !Number.isInteger(draftRooms) || draftRooms < 0 || draftRooms > 32767)
    ? "Enter a whole number between 0 and 32767"
    : null;
  const draftValid = !nameError && !descriptionError && !roomsError;

  const details: [SvgIconName, string, string, string?][] = [
    ["terrain", "Difficulty", difficultyNames[level.difficulty] ?? "Unknown"],
    ["rooms", "Rooms", getRoomsText(level.roomAmount)],
    ["download", "Downloads", downloads.toLocaleString()],
    ["event", "Created", formatRelativeDate(level.created), new Date(level.created).toLocaleString()],
    ["history", "Updated", formatRelativeDate(level.lastEdit), new Date(level.lastEdit).toLocaleString()],
  ];

  const tabs: Tab<LevelTab>[] = [
    { id: "description", label: "Description", icon: "article" },
    { id: "gallery", label: "Gallery", icon: "image", count: gallery.length },
    { id: "versions", label: "Versions", icon: "file", count: files.length },
  ];

  // A title only where the chip next to the level name doesn't already say it
  const [statusIcon, statusTitle, statusText]: [SvgIconName, string | null, string] =
    pending ? ["schedule", "Waiting for review", isAuthor
      ? "An admin will check your level soon. It is published as soon as they approve it."
      : `${level.author?.username ?? "The author"} asked for this level to be verified${level.verificationRequested ? " " + formatRelativeDate(level.verificationRequested) : ""}.`]
    : rejected ? ["warning", "Review rejected", isAuthor
      ? "An admin didn't approve this level. Fix what they asked, then submit it again."
      : "This level was rejected. The author can submit it again."]
    : !isAuthor ? ["visibilityOff", null, "Only the author and admins can see this level."]
    : canPublish ? ["visibilityOff", null, "Only you and admins can see this level. Publish it when it's ready."]
    : files.length > 0 ? ["flag", "Review required", "Your first levels are checked by an admin before they go public. Submit this level when it is ready, and it is published once approved."]
    : ["flag", "Review required", "Your first levels are checked by an admin before they go public. Upload a file, then submit the level for review."];

  // Goes back to the list the user came from, or to the level browser
  const back = backTarget ?? "/levels";
  const backPath = back.split("?")[0];
  const backLabel =
    backPath === "/" ? "Home"
    : backPath === "/dashboard/admin" ? "Admin levels"
    : backPath.startsWith("/users/") ? (backPath !== `/users/${level.authorId}` ? "Author's levels" : isAuthor ? "Your levels" : level.author ? `${level.author.username}'s levels` : "Author's levels")
    : "Level browser";

  const busyLabel = (action: LevelAction, label: string) => busy?.action === action ? busy.label : label;

  return (
    <div className={styles.container}>
      <div className={styles.backLink}>
        <LinkButton variant="text" icon="arrowBack" href={back}>{backLabel}</LinkButton>
      </div>

      {draft ?
        <div className={`${styles.status} ${styles.editing}`} role="status">
          <span className={styles.statusIcon}><SvgIcon name="edit" size={20}/></span>
          <div className={styles.statusText}>
            <h2>Editing level</h2>
            <p>Change the name, difficulty, tags, description and room count where they appear, then save.{isAuthor && " Screenshots and files are managed in the Gallery and Versions tabs."}</p>
          </div>
        </div>
      : canEdit && !level.published &&
        <div className={styles.status} role="status">
          <span className={styles.statusIcon}><SvgIcon name={statusIcon} size={20}/></span>
          <div className={styles.statusText}>
            {statusTitle && <h2>{statusTitle}</h2>}
            <p>{statusText}</p>
            {rejected && level.verificationNote && <blockquote>{level.verificationNote}</blockquote>}
          </div>
        </div>
      }
      
      <header className={styles.header}>
        <div className={styles.thumbnail}>
          {gallery.length > 0 ?
            <button type="button" onClick={()=>setLightboxIndex(0)} aria-label="Open gallery">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={galleryImageUrl(level.id, gallery[0].id)} alt=""/>
            </button>
          :
            <SvgIcon name="image" size={40}/>
          }
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            {draft ?
              <TextBox label="Level name" placeholder="My level" className={styles.nameInput} maxLength={64} autoFocus
                defaultValue={draft.name} error={nameError} onChange={name=>editDraft({ name })}/>
            :
              <h1>{level.name}</h1>
            }
            {pending ?
              <Chip small variant="highlight" icon="schedule">Pending review</Chip>
            : !level.published &&
              <Chip small variant="highlight" icon="lock">Draft</Chip>
            }
          </div>
          {level.author && <p className={styles.author}><SvgIcon name="person" size={16}/>by <Link href={`/users/${level.authorId}`} className={styles.authorLink}>{level.author.username}</Link></p>}
          <div className={styles.stats}>
            <span title={`${downloads} downloads`}><SvgIcon name="download" size={18}/><strong>{formatCount(downloads)}</strong> downloads</span>
            <span title={new Date(level.lastEdit).toLocaleString()}><SvgIcon name="history" size={18}/>Updated {formatRelativeDate(level.lastEdit)}</span>
          </div>
          {draft ?
            <div className={styles.editFields}>
              <TagsInput label="Tags" supportingText="Press Enter, Space or comma to add a tag" defaultValue={draft.tags} onChange={tags=>editDraft({ tags })}/>
            </div>
          :
            <div className={styles.chips}>
              <Chip small icon="terrain">{difficultyNames[level.difficulty] ?? "Unknown"}</Chip>
              {tags.map(t=>(
                  <Link key={t} href={`/levels?tag=${encodeURIComponent(t)}`} className={styles.tagLink}><Chip small icon="tag">{t}</Chip></Link>
              ))}
            </div>
          }
        </div>
        <div className={styles.headerActions}>
          {draft ? <>
            <Button variant="text" disabled={busy !== null} click={()=>setDraft(null)}>Cancel</Button>
            <Button variant="filled" icon="check" disabled={busy !== null || !draftValid} click={saveDraft}>{busyLabel("save", dirty ? "Save changes" : "Done")}</Button>
          </> : <>
          {canEdit && <>
            {isAuthor ?
              canPublish ?
                <Button variant="tonal" icon={level.published ? "lock" : "public"} disabled={busy !== null} click={()=>
                  levelRequest("publish", level.published ? "Unpublishing…" : "Publishing…", "/levels/" + id, "PATCH", JSON.stringify({ published: !level.published }))
                }>{busyLabel("publish", level.published ? "Unpublish" : "Publish")}</Button>
              : pending ?
                <Button variant="tonal" icon="close" disabled={busy !== null} click={()=>levelRequest("verification", "Cancelling…", `/levels/${id}/verification`, "DELETE")}>{busyLabel("verification", "Cancel review")}</Button>
              :
                <Button variant="tonal" icon="flag" disabled={busy !== null || files.length === 0} click={()=>levelRequest("verification", "Submitting…", `/levels/${id}/verification`, "POST")}>{busyLabel("verification", "Submit for review")}</Button>
            : pending && <>
              <Button variant="tonal" icon="close" disabled={busy !== null} click={()=>{
                setRejectNote("");
                setDialog("reject");
              }}>{busyLabel("reject", "Reject")}</Button>
              <Button variant="tonal" icon="check" disabled={busy !== null} click={()=>levelRequest("approve", "Approving…", `/admin/levels/${id}/verification/approve`, "POST")}>{busyLabel("approve", "Approve and publish")}</Button>
            </>}
            <Button variant="outlined" icon="edit" disabled={busy !== null} click={()=>startEditing(level)}>Edit</Button>
            <Button variant="text" icon="delete" disabled={busy !== null} click={()=>setDialog("delete")}>{busyLabel("delete", "Delete")}</Button>
          </>}
          {latest && !isAuthor &&
            <Button variant="text" icon="flag" click={()=>setReportFile(latest)}>Report</Button>
          }
          {!latest ?
            <span className={buttonClass("filled", true)} aria-disabled="true"><SvgIcon name="download" size={18}/>No files yet</span>
          : level.published ?
            <a className={buttonClass("filled", true)} href={levelFileDownloadUrl(level.id, latest.id)} download>
              <SvgIcon name="download" size={18}/>Download
            </a>
          :
            <Button variant="filled" icon="download" click={()=>download(latest)}>Download</Button>
          }
          </>}
        </div>
      </header>

      <div className={styles.columns}>
        <div className={styles.main}>
          <Tabs<LevelTab> value={tab} onChange={setTab} tabs={tabs}/>

          <TabPanel tabs={tabs} value={tab}>
            {tab === "description" && (draft ?
              <Card className={styles.descriptionEdit}>
                <MarkdownTextBox label="Description" placeholder="Tell players what your level is about" maxLength={8192}
                  supportingText={markdownHint} defaultValue={draft.description} error={descriptionError} onChange={description=>editDraft({ description })}/>
              </Card>
            :
              <Card>
                <Markdown>{level.description}</Markdown>
              </Card>
            )}

            {(tab === "gallery" || tab === "versions") && isAuthor &&
              <div className={styles.tabToolbar}>
                {tab === "gallery" ?
                  <Button variant="filled" icon="image" click={()=>setUploadPopup("gallery")}>Add screenshot</Button>
                :
                  <Button variant="filled" icon="upload" click={()=>setUploadPopup("file")}>Upload file</Button>
                }
              </div>
            }

            {tab === "gallery" && (gallery.length > 0 ?
              <div className={styles.gallery}>
                {gallery.map((f, i)=>(
                  <figure key={f.id} className={styles.galleryItem}>
                    <button type="button" onClick={()=>setLightboxIndex(i)} aria-label={`Open ${f.description || f.fileName}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={galleryImageUrl(level.id, f.id)} alt={f.description || f.fileName} loading="lazy"/>
                    </button>
                    {isAuthor &&
                      <span className={styles.galleryDelete}>
                        <IconButton icon="delete" label="Delete" variant="tonal" click={()=>deleteGalleryFile(f)}/>
                      </span>
                    }
                    {f.description && <figcaption>{f.description}</figcaption>}
                  </figure>
                ))}
              </div>
            :
              <Card>
                <EmptyState icon="image" title="No screenshots yet" text={isAuthor ? "Screenshots show players what your level looks like." : undefined}/>
              </Card>
            )}

            {tab === "versions" &&
              <Card>
                {files.length > 0 ?
                  <ul className={styles.versions}>
                    {files.map(f=>(
                      <li key={f.id} className={styles.version}>
                        <span className={styles.versionIcon}><SvgIcon name="file"/></span>
                        <div className={styles.versionText}>
                          <p className={styles.versionName}>
                            <span>{f.fileName}</span>
                            {f === latest && <Chip small variant="success">Latest</Chip>}
                          </p>
                          <p className={styles.versionMeta}>
                            <span title={new Date(f.uploadDate).toLocaleString()}>{formatRelativeDate(f.uploadDate)}</span>
                            <span>{formatBytes(f.fileSize)}</span>
                            <span>{(f.downloads ?? 0).toLocaleString()} download{f.downloads === 1 ? "" : "s"}</span>
                          </p>
                        </div>
                        <div className={styles.versionActions}>
                          {level.published ?
                            <a className={buttonClass("tonal", true)} href={levelFileDownloadUrl(level.id, f.id)} download>
                              <SvgIcon name="download" size={18}/>.pak
                            </a>
                          :
                            <Button icon="download" click={()=>download(f)}>.pak</Button>
                          }
                          <Menu items={[
                            { label: "Download .pak.zip", icon: "download", href: levelFileDownloadUrl(level.id, f.id, "zip"), download: true, disabled: !level.published },
                            "divider",
                            { label: "Copy link", icon: "link", click: ()=>navigator.clipboard.writeText(levelFileDownloadUrl(level.id, f.id)) },
                            { label: "Report", icon: "flag", click: ()=>setReportFile(f) },
                            ...(isAuthor ? ["divider", { label: "Delete", icon: "delete", click: ()=>deleteFile(f) }] as const : []),
                          ]}/>
                        </div>
                      </li>
                    ))}
                  </ul>
                :
                  <EmptyState icon="file" title="No files yet" text={isAuthor ? "Upload a .pak or .zip of your level." : "The author hasn't uploaded this level's files yet."}/>
                }
              </Card>
            }
          </TabPanel>
        </div>

        <aside className={styles.sidebar}>
          <Card title="Details">
            <dl className={styles.details}>
              {details.map(([icon, label, value, title])=>{
                const input = !draft ? null
                  : label === "Difficulty" ?
                    <ComboBox values={difficulties.map(d=>difficultyNames[d])} defaultValue={difficulties.indexOf(draft.difficulty)}
                      onChange={i=>editDraft({ difficulty: difficulties[i] })}/>
                  : label === "Rooms" ?
                    <TextBox key={level.roomAmount} type="number" placeholder="Number of rooms" min={0} max={32767} defaultValue={draft.roomAmount}
                      error={roomsError} supportingText="Counted from your latest upload. Uploading a file counts them again."
                      onChange={roomAmount=>editDraft({ roomAmount })}/>
                  : null;
                return input ?
                  <div key={label} className={`${styles.detail} ${styles.detailEdit}`}>
                    <dt><SvgIcon name={icon} size={18}/>{label}</dt>
                    <dd>{input}</dd>
                  </div>
                :
                  <div key={label} className={styles.detail}>
                    <dt><SvgIcon name={icon} size={18}/>{label}</dt>
                    <dd title={title}>{value}</dd>
                  </div>;
              })}
            </dl>
          </Card>
          {level.author &&
            <Card title="Creator">
              <Link href={`/users/${level.authorId}`} className={styles.creator}>
                <Avatar user={level.author}/>
                <div>
                  <p className={styles.creatorName}>{level.author.username}</p>
                  <p className={styles.creatorMeta}>Author</p>
                </div>
              </Link>
            </Card>
          }
        </aside>
      </div>

      {lightboxIndex !== null && gallery.length > 0 &&
        <Lightbox
          images={gallery.map(f=>({ src: galleryImageUrl(level.id, f.id), caption: f.description || undefined }))}
          index={Math.min(lightboxIndex, gallery.length - 1)}
          onChange={setLightboxIndex}
          onClose={()=>setLightboxIndex(null)}
        />
      }

      {uploadPopup === "file" &&
        <LevelFileUploadPopup levelId={id} token={token!} onClose={()=>setUploadPopup(null)} onChanged={reloadLevel}/>
      }
      {uploadPopup === "gallery" &&
        <GalleryUploadPopup levelId={id} token={token!} onClose={()=>setUploadPopup(null)} onUploaded={()=>reloadLevel()}/>
      }

      {reportFile &&
        <ReportPopup levelId={level.id} file={reportFile} onClose={()=>setReportFile(null)}/>
      }

      {dialog === "delete" &&
        <Popup title="Delete level?" closeCallback={()=>setDialog(null)}>
          <div className={styles.dialog}>
            <p>&quot;{level.name}&quot; will be deleted with all its files and screenshots. This can&apos;t be undone.</p>
            <div className={styles.dialogActions}>
              <Button variant="text" click={()=>setDialog(null)}>Cancel</Button>
              <Button variant="filled" click={()=>{
                setDialog(null);
                levelRequest("delete", "Deleting…", "/levels/" + id, "DELETE", null, ()=>{
                  if (user) setUser({ ...user, levels: user.levels?.filter(l=>l.id !== id) });
                  router.push(isAuthor ? `/users/${level.authorId}` : "/dashboard/admin");
                });
              }}>Delete</Button>
            </div>
          </div>
        </Popup>
      }

      {dialog === "reject" &&
        <Popup title="Reject verification?" closeCallback={()=>setDialog(null)}>
          <div className={styles.dialog}>
            <p>&quot;{level.name}&quot; stays a draft. The author sees your reason and can ask again.</p>
            <BigTextBox placeholder="Reason (optional)" maxLength={1024} onChange={setRejectNote}/>
            <div className={styles.dialogActions}>
              <Button variant="text" click={()=>setDialog(null)}>Cancel</Button>
              <Button variant="filled" click={()=>{
                setDialog(null);
                levelRequest("reject", "Rejecting…", `/admin/levels/${id}/verification/reject`, "POST", JSON.stringify({ note: rejectNote }));
              }}>Reject</Button>
            </div>
          </div>
        </Popup>
      }
    </div>
  );
}
