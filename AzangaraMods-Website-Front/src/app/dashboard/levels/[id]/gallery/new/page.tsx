'use client';
import Image from "next/image";
import styles from "./page.module.css";
import Card from "@/components/kit/card";
import PageHeader from "@/components/kit/pageHeader";
import NavBar from "@/components/navBar";
import fetchApi from "@/utils/fetchApi";
import { use, useEffect, useState } from "react";
import useUserData from "@/hooks/useUserData";
import Link from "next/link";
import Button from "@/components/kit/button";
import FileSelect from "@/components/kit/fileSelect";
import { useRouter } from "next/navigation";
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
      <PageHeader backHref={"/dashboard/levels/" + id} title="Add a screenshot" subtitle={levelData?.name}/>
      <Card className={styles.form}>
      <p className={styles.hint}>AVIF, JPEG, PNG, WebP or TIFF. The first image is used as the level&apos;s thumbnail.</p>
      <FileSelect disabled={loading} accept="image/avif, image/jpeg, image/png, image/webp, image/tiff" onChange={(file) => {
        setSelectedFile(file);
      }} />
      
      <div className={styles.formActions}>
      <Button variant="filled" icon="upload" disabled={loading || selectedFile == null} click={()=>{
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
      }}>{loading ? "Uploading…" : "Upload image"}</Button>
      </div>
      </Card>
    </div>
  );
}
