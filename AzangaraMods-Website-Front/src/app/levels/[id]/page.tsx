'use client';
import styles from "./page.module.css";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import useUserData from "@/hooks/useUserData";
import fetchApi from "@/utils/fetchApi";
import { buttonClass } from "@/components/kit/button";
import Card from "@/components/kit/card";
import Chip from "@/components/kit/chip";
import EmptyState from "@/components/kit/emptyState";
import Lightbox from "@/components/kit/lightbox";
import LinkButton from "@/components/kit/linkButton";
import Menu from "@/components/kit/menu";
import Spinner from "@/components/kit/spinner";
import Avatar from "@/components/kit/avatar";
import SvgIcon, { SvgIconName } from "@/components/kit/svgIcon";
import Tabs from "@/components/kit/tabs";
import formatBytes from "@/utils/fileSize";
import { difficultyNames, formatCount, formatRelativeDate, galleryImageUrl, getRoomsText, levelFileDownloadUrl } from "@/utils/levelLabels";

type LevelTab = "description" | "gallery" | "versions";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);
  const { user, token } = useUserData();

  const [level, setLevel] = useState<Level|null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<LevelTab>("description");
  const [lightboxIndex, setLightboxIndex] = useState<number|null>(null);

  // Refetched once the token is loaded, so authors can preview their unpublished levels
  useEffect(()=>{
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
  }, [id, token]);

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
  const downloads = level.downloads ?? 0;

  const details: [SvgIconName, string, string, string?][] = [
    ["terrain", "Difficulty", difficultyNames[level.difficulty] ?? "Unknown"],
    ["rooms", "Rooms", getRoomsText(level.roomAmount)],
    ["download", "Downloads", downloads.toLocaleString()],
    ["event", "Created", formatRelativeDate(level.created), new Date(level.created).toLocaleString()],
    ["history", "Updated", formatRelativeDate(level.lastEdit), new Date(level.lastEdit).toLocaleString()],
  ];

  return (
    <div className={styles.container}>
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
            <h1>{level.name}</h1>
            {!level.published && <Chip small variant="highlight" icon="lock">Draft</Chip>}
          </div>
          {level.author && <p className={styles.author}><SvgIcon name="person" size={16}/>by <Link href={`/users/${level.authorId}`} className={styles.authorLink}>{level.author.username}</Link></p>}
          <div className={styles.stats}>
            <span title={`${downloads} downloads`}><SvgIcon name="download" size={18}/><strong>{formatCount(downloads)}</strong> downloads</span>
            <span title={new Date(level.lastEdit).toLocaleString()}><SvgIcon name="history" size={18}/>Updated {formatRelativeDate(level.lastEdit)}</span>
          </div>
          <div className={styles.chips}>
            <Chip small icon="terrain">{difficultyNames[level.difficulty] ?? "Unknown"}</Chip>
            {tags.map(t=>(
                <Link key={t} href={`/levels?tag=${encodeURIComponent(t)}`} className={styles.tagLink}><Chip small icon="tag">{t}</Chip></Link>
            ))}
          </div>
        </div>
        <div className={styles.headerActions}>
          {latest ?
            <a className={buttonClass("filled", true)} href={levelFileDownloadUrl(level.id, latest.id)} download>
              <SvgIcon name="download" size={18}/>Download
            </a>
          :
            <span className={buttonClass("filled", true)} aria-disabled="true"><SvgIcon name="download" size={18}/>No files yet</span>
          }
          {isAuthor && <LinkButton variant="outlined" icon="edit" href={`/dashboard/levels/${level.id}`}>Manage</LinkButton>}
        </div>
      </header>

      <div className={styles.columns}>
        <div className={styles.main}>
          <Tabs<LevelTab>
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "description", label: "Description", icon: "article" },
              { id: "gallery", label: "Gallery", icon: "image", count: gallery.length },
              { id: "versions", label: "Versions", icon: "file", count: files.length },
            ]}
          />

          {tab === "description" &&
            <Card>
              <p className={styles.description}>{level.description}</p>
            </Card>
          }

          {tab === "gallery" && (gallery.length > 0 ?
            <div className={styles.gallery}>
              {gallery.map((f, i)=>(
                <figure key={f.id} className={styles.galleryItem}>
                  <button type="button" onClick={()=>setLightboxIndex(i)} aria-label={`Open ${f.description || f.fileName}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={galleryImageUrl(level.id, f.id)} alt={f.description || f.fileName} loading="lazy"/>
                  </button>
                  {f.description && <figcaption>{f.description}</figcaption>}
                </figure>
              ))}
            </div>
          :
            <Card><EmptyState icon="image" title="No screenshots yet"/></Card>
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
                        <a className={buttonClass("tonal", true)} href={levelFileDownloadUrl(level.id, f.id)} download>
                          <SvgIcon name="download" size={18}/>.pak
                        </a>
                        <Menu items={[
                          { label: "Download .pak.zip", icon: "download", href: levelFileDownloadUrl(level.id, f.id, "zip"), download: true },
                          "divider",
                          { label: "Copy link", icon: "link", click: ()=>navigator.clipboard.writeText(levelFileDownloadUrl(level.id, f.id)) },
                          // TODO: no report endpoint on the backend yet
                          { label: "Report", icon: "flag", click: ()=>{}, disabled: true },
                        ]}/>
                      </div>
                    </li>
                  ))}
                </ul>
              :
                <EmptyState icon="file" title="No files yet" text="The author hasn't uploaded this level's files yet."/>
              }
            </Card>
          }
        </div>

        <aside className={styles.sidebar}>
          <Card title="Details">
            <dl className={styles.details}>
              {details.map(([icon, label, value, title])=>(
                <div key={label} className={styles.detail}>
                  <dt><SvgIcon name={icon} size={18}/>{label}</dt>
                  <dd title={title}>{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {level.author &&
            <Card title="Creator">
              <Link href={`/users/${level.authorId}`} className={styles.creator}>
                <Avatar user={level.author}/>
                <div>
                  <p className={styles.creatorName}>{level.author.username}</p>
                  <p className={styles.creatorMeta}>See all their levels</p>
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
    </div>
  );
}
