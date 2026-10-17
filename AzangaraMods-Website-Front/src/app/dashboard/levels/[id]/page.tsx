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
import downloadLevelFile from "@/utils/downloadLevelFile";
import { LevelVerificationStatus } from "@/enums";
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

  // Runs a publish or verification request and keeps the loaded files, which those responses may leave out
  const levelRequest = (path: string, method: string, body: BodyInit | null = null) => {
    fetchApi(path, token!, method, body).then(res=>{
      if (res.ok) {
        res.json().then((data:Level)=>{
          const newLevelData = { ...data, levelFiles: levelData?.levelFiles, galleryFiles: levelData?.galleryFiles };
          setLevelData(newLevelData);
          updateLevel(newLevelData);
        });
      } else {
        res.json().then((data: ErrorResponse)=>errorAlert(data));
      }
    });
  };

  if (!levelData) return <Spinner/>;

  const tags = levelData.tags?.filter(t=>t.length > 0) ?? [];
  // Authors who aren't Verified Modders need an admin to verify the level before publishing it
  const canPublish = levelData.published || user?.verifiedModder || user?.admin || levelData.verification === LevelVerificationStatus.Verified;
  const pending = levelData.verification === LevelVerificationStatus.Pending;

  return (
    <div className={styles.container}>
      <PageHeader
        backHref="/dashboard/levels"
        title={levelData.name}
        subtitle={"Last edited " + new Date(levelData.lastEdit).toLocaleString()}
        badge={levelData.published ?
          <Chip variant="success" icon="public">Published</Chip>
        : pending ?
          <Chip variant="highlight" icon="schedule">Pending review</Chip>
        :
          <Chip variant="highlight" icon="lock">Draft</Chip>
        }
        actions={<>
          <LinkButton variant="outlined" icon="edit" href={`/dashboard/levels/${id}/edit`}>Edit</LinkButton>
{canPublish ?
            <Button variant={levelData.published ? "tonal" : "filled"} icon={levelData.published ? "lock" : "public"} click={()=>
              levelRequest("/levels/" + id, "PATCH", JSON.stringify({ published: !levelData.published }))
            }>{levelData.published ? "Unpublish" : "Publish"}</Button>
          : pending ?
            <Button variant="tonal" icon="close" click={()=>levelRequest(`/levels/${id}/verification`, "DELETE")}>Cancel review</Button>
          :
            <Button variant="filled" icon="flag" disabled={!levelData.levelFiles?.length} click={()=>levelRequest(`/levels/${id}/verification`, "POST")}>Submit for review</Button>
          }
        </>}
      />

      {!canPublish &&
        <Card title={pending ? "Waiting for review" : levelData.verification === LevelVerificationStatus.Rejected ? "Review rejected" : "Review required"}>
          <p className={styles.description}>
            {pending ?
              "An admin will check your level soon. It is published as soon as they approve it."
            : levelData.verification === LevelVerificationStatus.Rejected ?
              "An admin didn't approve this level. Fix what they asked, then submit it again."
            : levelData.levelFiles?.length ?
              "Your first levels are checked by an admin before they go public. Submit this level when it is ready, and it is published once approved."
            :
              "Your first levels are checked by an admin before they go public. Upload a file, then submit the level for review."
            }
          </p>
          {levelData.verification === LevelVerificationStatus.Rejected && levelData.verificationNote &&
            <p className={styles.description}><strong>Reason:</strong> {levelData.verificationNote}</p>
          }
        </Card>
      }

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
                  <IconButton icon="download" label="Download" click={()=>downloadLevelFile(id, f.id, f.fileName, token!)}/>
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
