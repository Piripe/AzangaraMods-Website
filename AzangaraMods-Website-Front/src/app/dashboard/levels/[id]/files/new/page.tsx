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
import LinkButton from "@/app/components/kit/linkButton";

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

  const [files, setFiles] = useState<string[]|null>(null);
  const [fileId, setFileId] = useState<string|null>(null);
  const [entryPoint, setEntryPoint] = useState<string|null>(null);

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
        <div className={styles.headerButtons}>
          <LinkButton href={"/dashboard/levels/" + id}>{"Back"}</LinkButton>
        </div>
      <h1>{levelData?.name}</h1>

      {files == null ?
      <>
        <h2>Upload File:</h2>
        <FileSelect disabled={loading} accept=".pak, .zip" onChange={(file) => {
          setSelectedFile(file);
        }} />
        
        <Button disabled={loading || selectedFile == null} click={()=>{
          setLoading(true);
          const formData = new FormData();
          formData.append("file", selectedFile!);
          fetchApi(
            "/levels/" + id + "/files",
            token!,
            "PUT",
            formData,
            null
          ).then(res=>{
            if (res.ok) {
              res.json().then((data:LevelFileUploadResponseData)=>{
                setLoading(false);
                setFiles(data.files);
                setFileId(data.id);
              });
            } else {
              alert("Failed to upload file");
              setLoading(false);
            }
          });
        }}>Upload file</Button>
      </>
      :
      <>
        <h2>Entry point:</h2>
        <select onChange={(e)=>{
          setEntryPoint(e.target.value);
        }}>
          <option value="/">/</option>
          {files.map(f=>(
            <option key={f} value={f}>/{f}</option>
          ))}
        </select>

        <Button disabled={loading || entryPoint == null} click={()=>{
          setLoading(true);
          fetchApi(
            "/levels/" + id + "/files/" + fileId,
            token!,
            "PATCH",
            JSON.stringify({
              entryPoint
            })
          ).then(res=>{
            if (res.ok) {
              res.json().then((data:LevelFile)=>{
                setLoading(false);
                levelData!.levelFiles = [...(levelData!.levelFiles ?? []), data];
                levelData!.lastEdit = new Date().toString();
                updateLevel(levelData!);
                router.push(`/dashboard/levels/${id}`);
              });
            } else {
              alert("Failed to patch file");
              setLoading(false);
            }
          });
        }}>Select</Button>
      </>
      }
    </div>
  );
}
