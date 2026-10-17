'use client';
import styles from "./page.module.css";
import fetchApi from "@/utils/fetchApi";
import { use, useEffect, useState } from "react";
import useUserData from "@/hooks/useUserData";
import Button from "@/components/kit/button";
import LinkButton from "@/components/kit/linkButton";
import IconButton from "@/components/kit/iconButton";
import Card from "@/components/kit/card";
import Chip from "@/components/kit/chip";
import EmptyState from "@/components/kit/emptyState";
import PageHeader from "@/components/kit/pageHeader";
import Spinner from "@/components/kit/spinner";
import SvgIcon from "@/components/kit/svgIcon";
import formatBytes from "@/utils/fileSize";
import errorAlert from "@/utils/errorAlert";
import { difficultyNames, galleryImageUrl, getLevelSizeText } from "@/utils/levelLabels";

export default  function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);

  const {user, setUser, token, updateLevel} = useUserData();

  const levelIndex = user?.levels?.findIndex(l=>l.id === id) ?? -1;

  const [levelData, setLevelData] = useState(user?.levels?.[levelIndex]);

  useEffect(()=>{
    if (token != null) {
      (async ()=>{
        let res = await fetchApi(
          "/levels/" + id,
          token
        );
        var data = await res.json();
        if (res.ok) {
          setLevelData(data);
        } else {
          errorAlert(data);
        }
      })();
    }
  }, [user]);

  const deleteFile = (f: LevelFile) => {
    fetchApi(
      "/levels/" + id + "/files/" + f.id,
      token!,
      "DELETE"
    );
    const newLevelData = {...levelData!};
    newLevelData.levelFiles = levelData!.levelFiles?.filter(file=>file.id !== f.id);
    newLevelData.lastEdit = new Date().toString();
    updateLevel(newLevelData);
    setLevelData(newLevelData);
  };

  const deleteGalleryFile = (f: GalleryFile) => {
    fetchApi(
      "/levels/" + id + "/gallery/" + f.id,
      token!,
      "DELETE"
    );
    const newLevelData = {...levelData!};
    newLevelData.galleryFiles = levelData!.galleryFiles?.filter(file=>file.id !== f.id);
    newLevelData.lastEdit = new Date().toString();
    updateLevel(newLevelData);
    setLevelData(newLevelData);
  };

  if (!levelData) return <Spinner/>;

  const tags = levelData.tags?.filter(t=>t.length > 0) ?? [];

  return (
    <div className={styles.container}>
      <PageHeader
        backHref="/dashboard/levels"
        title={levelData.name}
        subtitle={"Last edited " + new Date(levelData.lastEdit).toLocaleString()}
        badge={levelData.published ?
          <Chip variant="success" icon="public">Published</Chip>
        :
          <Chip variant="highlight" icon="lock">Draft</Chip>
        }
        actions={<>
          <LinkButton variant="outlined" icon="edit" href={`/dashboard/levels/${id}/edit`}>Edit</LinkButton>
          <Button variant={levelData.published ? "tonal" : "filled"} icon={levelData.published ? "lock" : "public"} click={()=>{
            fetchApi(
              "/levels/" + id,
              token!,
              "PATCH",
              JSON.stringify({
                published: !levelData?.published
              })
            ).then(res=>{
              if (res.ok) {
                res.json().then((data:Level)=>{
                  setLevelData({ ...data, levelFiles: levelData?.levelFiles, galleryFiles: levelData?.galleryFiles });
                  updateLevel(levelData!);
                });
              } else {
                res.json().then((data: ErrorResponse)=>errorAlert(data))
              }
            });
          }}>{levelData.published ? "Unpublish" : "Publish"}</Button>
        </>}
      />

      <Card>
        <div className={styles.chips}>
          <Chip icon="terrain">{difficultyNames[levelData.difficulty ?? 10]}</Chip>
          <Chip icon="rooms">{(levelData.roomAmount ?? 0) <= 0 ? "No rooms" : `${levelData.roomAmount} room${(levelData.roomAmount == 1 ? "" : "s")} · ${getLevelSizeText(levelData.roomAmount)}`}</Chip>
          {tags.map(t=>(
            <Chip key={t} icon="tag">{t}</Chip>
          ))}
        </div>
        <p className={styles.description}>{levelData.description}</p>
      </Card>

      <div className={styles.twoColumns}>
        <Card title="Files" actions={<LinkButton icon="upload" href={`/dashboard/levels/${id}/files/new`}>Upload</LinkButton>}>
          {levelData.levelFiles?.length ?
            <ul className={styles.list}>
              {[...levelData.levelFiles].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()).map(f=>(
                <li key={f.id} className={styles.fileListItem}>
                  <span className={styles.fileIcon}><SvgIcon name="file"/></span>
                  <div className={styles.fileText}>
                    <p className={styles.fileName}>{f.fileName}</p>
                    <p className={styles.fileMeta}>{formatBytes(f.fileSize)} · {new Date(f.uploadDate).toLocaleString()}</p>
                  </div>
                  <IconButton icon="delete" label="Delete" variant="danger" click={()=>deleteFile(f)}/>
                </li>
              ))}
            </ul>
          :
            <EmptyState icon="file" title="No files yet" text="Upload a .pak or .zip of your level."/>
          }
        </Card>

        <Card title="Gallery" actions={<LinkButton icon="upload" href={`/dashboard/levels/${id}/gallery/new`}>Upload</LinkButton>}>
          {levelData.galleryFiles?.length ?
            <div className={styles.gallery}>
              {levelData.galleryFiles.map(f=>(
                <figure key={f.id} className={styles.galleryItem}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.galleryImage} src={galleryImageUrl(levelData.id, f.id)} alt={f.fileName} />
                  <span className={styles.galleryDelete}>
                    <IconButton icon="delete" label="Delete" variant="tonal" click={()=>deleteGalleryFile(f)}/>
                  </span>
                  <figcaption className={styles.galleryCaption} title={f.fileName}>{f.fileName}</figcaption>
                </figure>
              ))}
            </div>
          :
            <EmptyState icon="image" title="No screenshots yet" text="Screenshots show players what your level looks like."/>
          }
        </Card>
      </div>
    </div>
  );
}
