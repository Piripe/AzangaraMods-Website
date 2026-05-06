'use client';
import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/app/components/navBar";
import fetchApi from "@/app/utils/fetchApi";
import { use, useEffect, useState } from "react";
import useUserData from "@/app/hooks/useUserData";
import Link from "next/link";
import Button from "@/app/components/kit/button";

export default  function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);

  const {user, setUser, token} = useUserData();

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
    <div>
      <h1>{levelData?.name} ({levelData?.id}) <Link href={`/dashboard/levels/${id}/edit`}>Edit</Link></h1>
      <p>{levelData?.published ? "Published" : "Not published"}<Button click={()=>{
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
            });
          }
        });
      }}>{levelData?.published ? "Unpublish" : "Publish"}</Button></p>
      <p>{levelData?.difficulty}/10</p>
      <p>{levelData?.description}</p>
      <h2>Files:</h2>
      <Link href={`/dashboard/levels/${id}/files/new`}>Upload File</Link>
      {
        levelData?.levelFiles?.map(f=>(
          <div key={f.id}>
            <p>{f.fileName} ({f.fileSize} bytes) {f.uploadDate} <Button click={()=>{
              fetchApi(
                "/levels/" + id + "/files/" + f.id,
                token!,
                "DELETE"
              );
              levelData.levelFiles = levelData.levelFiles?.filter(file=>file.id !== f.id);
              setLevelData({...levelData});
            }}>Delete</Button></p>
          </div>
        ))
      }
      <h2>Gallery:</h2>
      <Link href={`/dashboard/levels/${id}/gallery/new`}>Upload Image</Link>
      {
        levelData?.galleryFiles?.map(f=>(
          <div key={f.id}>
            <img src={process.env.NEXT_PUBLIC_API_URL + "/download/level/" + levelData.id + "/gallery/" + f.id} alt={f.fileName} />
            <Button click={()=>{
              fetchApi(
                "/levels/" + id + "/gallery/" + f.id,
                token!,
                "DELETE"
              );
              levelData.galleryFiles = levelData.galleryFiles?.filter(file=>file.id !== f.id);
              setLevelData({...levelData});
            }}>Delete</Button>
          </div>
        ))
      }
    </div>
  );
}
