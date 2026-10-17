"use client";

import { useState } from "react";
import styles from "./uploadPopup.module.css";
import Popup from "../kit/popup";
import Button from "../kit/button";
import FileSelect from "../kit/fileSelect";
import ProgressBar from "../kit/progressBar";
import uploadApi from "@/utils/uploadApi";
import formatBytes from "@/utils/fileSize";
import { ErrorCodes } from "@/enums";

// Matches the RequestSizeLimit on PUT /levels/{id}/gallery
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = "image/avif, image/jpeg, image/png, image/webp, image/tiff";

export default function GalleryUploadPopup({levelId, token, onClose, onUploaded}:{levelId:string, token:string, onClose:()=>void, onUploaded:(file:GalleryFile)=>void}) {
  const [file, setFile] = useState<File|null>(null);
  const [progress, setProgress] = useState<number|null>(null);
  const [error, setError] = useState<string|null>(null);

  const uploading = progress !== null;

  const invalid =
    file && !/\.(avif|jpe?g|png|webp|tiff?)$/i.test(file.name) ? "Only AVIF, JPEG, PNG, WebP and TIFF images are accepted." :
    file && file.size > MAX_SIZE ? `This image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_SIZE)}.` :
    null;

  const close = () => {
    if (!uploading) onClose();
  };

  const startUpload = async () => {
    if (!file) return;
    setError(null);
    setProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await uploadApi(`/levels/${levelId}/gallery`, token, "PUT", formData, setProgress);
      if (res.ok) {
        onUploaded(await res.json() as GalleryFile);
        onClose();
        return;
      }
      try {
        const data = await res.json() as ErrorResponse;
        setError(
          data.errorCode === ErrorCodes.LevelGalleryPutNull ? `The image is missing or bigger than ${formatBytes(MAX_SIZE)}.` :
          data.errorCode === ErrorCodes.LevelGalleryPutInvalidFileType ? "Only AVIF, JPEG, PNG, WebP and TIFF images are accepted." :
          data.error
        );
      } catch {
        setError(`Request failed (${res.status})`);
      }
    } catch {
      setError("The upload failed. Check your connection and try again.");
    }
    setProgress(null);
  };

  return (
    <Popup title="Add a screenshot" closeCallback={close}>
      <div className={styles.dialog}>
        <p>AVIF, JPEG, PNG, WebP or TIFF, up to {formatBytes(MAX_SIZE)}. The first image is used as the level&apos;s thumbnail.</p>
        <FileSelect accept={ACCEPT} onChange={f=>{ setFile(f); setError(null); }} disabled={uploading}/>

        {uploading &&
          <div className={styles.progress}>
            <ProgressBar label="Upload progress" value={progress < 1 ? progress : undefined}/>
            <p className={styles.progressText}>{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : "Processing the image…"}</p>
          </div>
        }

        {(invalid ?? error) && <p className={styles.error} role="alert">{invalid ?? error}</p>}

        <div className={styles.dialogActions}>
          <Button variant="text" click={close} disabled={uploading}>Cancel</Button>
          <Button variant="filled" icon="upload" click={startUpload} disabled={uploading || !file || invalid !== null}>Upload</Button>
        </div>
      </div>
    </Popup>
  );
}
