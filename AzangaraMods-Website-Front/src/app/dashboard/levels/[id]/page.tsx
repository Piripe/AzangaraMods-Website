'use client';
import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/app/components/navBar";
import fetchApi from "@/app/utils/fetchApi";
import { use, useEffect, useState } from "react";
import useUserData from "@/app/hooks/useUserData";
import Link from "next/link";
import Button from "@/app/components/kit/button";
import LinkButton from "@/app/components/kit/linkButton";
import Icon, { IconType } from "@/app/components/kit/icon";
import Stars from "@/app/components/kit/stars";
import formatBytes from "@/app/utils/fileSize";

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
        if (res.ok) {
          setLevelData(await res.json());
        }
      })();
    }
  }, [user]);

  
  return (
    <div className={styles.container}>
      <div className={styles.headerButtons}>
        <LinkButton href="/dashboard/levels">{"Back"}</LinkButton>
      </div>
      <div className={styles.topBar}>
        <h1>{levelData?.name} <Icon size={22} icon={levelData?.published ? IconType.LockOpen : IconType.LockClosed} alt={levelData?.published ? "Published" : "Not published"} /></h1>
        <div className={styles.levelActions}>
          <LinkButton href={`/dashboard/levels/${id}/edit`}>Edit</LinkButton>
          <Button click={()=>{
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
          }
        });
      }}>{levelData?.published ? "Unpublish" : "Publish"}</Button>
        </div>
      </div>
      <div className={styles.info}>
      <Stars value={levelData?.difficulty ?? 0} alt={`Difficulty ${Math.round((levelData?.difficulty ?? 0)*100)/100}/10`}/>
      <p className={styles.description}>{levelData?.description}</p>
      </div>
      <div className={styles.twoColumns}>
        <div className={styles.listContainer}>
          <div className={styles.listHeader}>
            <h2 className={styles.listTitle}>Files</h2>
            <LinkButton href={`/dashboard/levels/${id}/files/new`}>Upload File</LinkButton>
          </div>
          {
            levelData?.levelFiles?.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()).map(f=>(
              <div key={f.id} className={styles.fileListItem}>
                <div className={styles.galleryImageContainer}>
                  <p>{f.fileName} ({formatBytes(f.fileSize)}) {new Date(f.uploadDate).toLocaleString()}</p>
                </div>
                <Button click={()=>{
                  fetchApi(
                    "/levels/" + id + "/files/" + f.id,
                    token!,
                    "DELETE"
                  );
                  levelData.levelFiles = levelData.levelFiles?.filter(file=>file.id !== f.id);
                  setLevelData({...levelData});
                  levelData.lastEdit = new Date().toString();
                  setLevelData({...levelData});
                  updateLevel(levelData);
                }}>Delete</Button>
              </div>
            ))
          }
      </div>
      <div className={styles.listContainer}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>Gallery</h2>
          <LinkButton href={`/dashboard/levels/${id}/gallery/new`}>Upload Image</LinkButton>
        </div>
        {
          levelData?.galleryFiles?.map(f=>(
            <div key={f.id} className={styles.galleryListItem}>
              <div className={styles.galleryImageContainer}>
                <img className={styles.galleryImage} src={process.env.NEXT_PUBLIC_API_URL + "/download/level/" + levelData.id + "/gallery/" + f.id} alt={f.fileName} />
                <div>
                  <p className={styles.ellipsis}>{f.fileName}</p>
                  <p>{new Date(f.uploadDate).toLocaleString()}</p>
                </div>
              </div>
              <Button click={()=>{
                fetchApi(
                  "/levels/" + id + "/gallery/" + f.id,
                  token!,
                  "DELETE"
                );
                levelData.galleryFiles = levelData.galleryFiles?.filter(file=>file.id !== f.id);
                setLevelData({...levelData});
                levelData.lastEdit = new Date().toString();
                setLevelData({...levelData});
                updateLevel(levelData);
              }}>Delete</Button>
            </div>
          ))
        }
        </div>
      </div>
    </div>
  );
}
