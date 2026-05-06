'use client';
import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/app/components/navBar";
import fetchApi from "@/app/utils/fetchApi";
import { use, useEffect, useState } from "react";
import useUserData from "@/app/hooks/useUserData";
import Link from "next/link";
import Button from "@/app/components/kit/button";
import FileSelect from "@/app/components/kit/fileSelect";
import { useRouter } from "next/navigation";

export default  function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);

  const {user, setUser, token} = useUserData();

  const levelIndex = user?.levels?.findIndex(l=>l.id === id) ?? -1;

  const [levelData, setLevelData] = useState(user?.levels?.[levelIndex]);

  const [selectedFile, setSelectedFile] = useState<File|null>(null);

  const [loading, setLoading] = useState(false);

  const router = useRouter();

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
      <h1>{levelData?.name} ({levelData?.id})</h1>
      <p>{levelData?.published ? "Published" : "Not published"}</p>
      <p>{levelData?.difficulty}/10</p>
      <p>{levelData?.description}</p>

      <h2>Upload Image:</h2>
      <FileSelect disabled={loading} accept="image/avif, image/jpeg, image/png, image/webp, image/tiff" onChange={(file) => {
        setSelectedFile(file);
      }} />
      
      <Button disabled={loading || selectedFile == null} click={()=>{
        setLoading(true);
        const formData = new FormData();
        formData.append("file", selectedFile!);
        fetchApi(
          "/levels/" + id + "/gallery",
          token!,
          "PUT",
          formData,
          null
        ).then(res=>{
          if (res.ok) {
            res.json().then((data:GalleryFile)=>{
              levelData!.galleryFiles = [...(levelData?.galleryFiles ?? []), data];
              setLoading(false);
              router.push("/dashboard/levels/"+id);
            });
          } else {
            alert("Failed to upload image");
            setLoading(false);
          }
        });
      }}>Upload image</Button>
    </div>
  );
}
