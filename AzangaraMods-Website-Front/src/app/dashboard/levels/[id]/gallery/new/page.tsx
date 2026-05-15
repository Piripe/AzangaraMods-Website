'use client';
import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/components/navBar";
import fetchApi from "@/utils/fetchApi";
import { use, useEffect, useState } from "react";
import useUserData from "@/hooks/useUserData";
import Link from "next/link";
import Button from "@/components/kit/button";
import FileSelect from "@/components/kit/fileSelect";
import { useRouter } from "next/navigation";
import LinkButton from "@/components/kit/linkButton";
import errorAlert from "@/utils/errorAlert";
import { ErrorCodes } from "@/enums";

export default  function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);

  const {user, setUser, token, updateLevel} = useUserData();

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
        var data = await res.json();
        if (res.ok) {
          setLevelData(data);
        } else {
          errorAlert(data);
        }
      })();
    }
  }, [user]);

  
  return (
    <div>
        <div className={styles.headerButtons}>
          <LinkButton href={"/dashboard/levels/" + id}>{"Back"}</LinkButton>
        </div>
      <h1>{levelData?.name}</h1>
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
              levelData!.lastEdit = new Date().toString();
              updateLevel(levelData!);
              setLoading(false);
              router.push("/dashboard/levels/"+id);
            });
          } else {
            res.json().then((data:ErrorResponse)=>{
              switch (data.errorCode) {
                case ErrorCodes.LevelGalleryPutInvalidFileType:
                  alert("Invalid file type: " + data.additionalData);
                  break;
                default:
                  errorAlert(data);
                  break;
              }
            });
            setLoading(false);
          }
        });
      }}>Upload image</Button>
    </div>
  );
}
