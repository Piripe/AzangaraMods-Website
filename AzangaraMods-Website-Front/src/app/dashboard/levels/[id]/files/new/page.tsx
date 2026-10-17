'use client';
import Image from "next/image";
import styles from "./page.module.css";
import Card from "@/components/kit/card";
import PageHeader from "@/components/kit/pageHeader";
import ComboBox from "@/components/kit/combobox";
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

  const {user, token, updateLevel} = useUserData();

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
      <PageHeader backHref={"/dashboard/levels/" + id} title="Upload a file" subtitle={levelData?.name}/>

      <Card className={styles.form}>
      <ol className={styles.steps}>
        <li className={files == null ? styles.activeStep : styles.doneStep}><span>1</span>Upload</li>
        <li className={files == null ? undefined : styles.activeStep}><span>2</span>Entry point</li>
      </ol>
      {files == null ?
      <>
        <p className={styles.hint}>Upload your level as a .pak or a .zip archive.</p>
        <FileSelect disabled={loading} accept=".pak, .zip" onChange={(file) => {
          setSelectedFile(file);
        }} />
        
        <div className={styles.formActions}>
        <Button variant="filled" icon="upload" disabled={loading || selectedFile == null} click={()=>{
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
              res.json().then((data: ErrorResponse) => {
                switch (data.errorCode) {
                  case ErrorCodes.LevelFilePutInvalidFileType:
                    alert("Invalid file type: " + data.additionalData);
                    break;
                  case ErrorCodes.LevelFilePutPakError:
                  case ErrorCodes.LevelFilePutZipError:
                  case ErrorCodes.LevelFilePutPakWriteError:
                    alert(`Error during file processing: ${data.additionalData} (${data.errorCode})`);
                    break;
                  default:
                    errorAlert(data);
                    break;
                }
              });
              setLoading(false);
            }
          });
        }}>{loading ? "Uploading…" : "Upload file"}</Button>
        </div>
      </>
      :
      <>
        <p className={styles.hint}>Pick the folder the game should load the level from.</p>
        <ComboBox label="Entry point" values={["/", ...files.map(f=>"/" + f)]} onChange={(i)=>{
          setEntryPoint(i === 0 ? "/" : files[i - 1]);
        }}/>

        <div className={styles.formActions}>
        <Button variant="filled" disabled={loading || entryPoint == null} click={()=>{
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
              res.json().then((data: ErrorResponse) => errorAlert(data))
              setLoading(false);
            }
          });
        }}>Select</Button>
        </div>
      </>
      }
      </Card>
    </div>
  );
}
