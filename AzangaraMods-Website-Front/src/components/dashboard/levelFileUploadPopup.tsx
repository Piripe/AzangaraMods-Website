"use client";

import { useState } from "react";
import styles from "./uploadPopup.module.css";
import Popup from "../kit/popup";
import Button from "../kit/button";
import FileSelect from "../kit/fileSelect";
import ComboBox from "../kit/combobox";
import ProgressBar from "../kit/progressBar";
import RadioList, { RadioOption } from "../kit/radioList";
import SvgIcon from "../kit/svgIcon";
import fetchApi from "@/utils/fetchApi";
import uploadApi from "@/utils/uploadApi";
import formatBytes from "@/utils/fileSize";
import { ErrorCodes } from "@/enums";

// Matches the RequestSizeLimit on PUT /levels/{id}/files
const MAX_SIZE = 20 * 1024 * 1024;
const OTHER = "\0other";

type Upload = { id: string, entryPoints: string[], otherFiles: string[] };

function uploadErrorText(data: ErrorResponse) {
  switch (data.errorCode) {
    case ErrorCodes.LevelFilePutNull:
      return `The file is missing or bigger than ${formatBytes(MAX_SIZE)}.`;
    case ErrorCodes.LevelFilePutInvalidFileType:
      return "Only .pak and .zip archives are accepted.";
    case ErrorCodes.LevelFilePutPakTooBig:
    case ErrorCodes.LevelFilePutZipTooBig:
      return "The archive is bigger than 1 GB once extracted.";
    case ErrorCodes.LevelFilePutZipTooManyFiles:
      return "The zip holds more than 1000 files. Pack it as a .pak instead.";
    case ErrorCodes.LevelFilePutPakError:
    case ErrorCodes.LevelFilePutZipError:
    case ErrorCodes.LevelFilePutPakWriteError:
      return `The archive couldn't be read: ${data.additionalData ?? data.error}`;
    default:
      return data.error;
  }
}

async function responseError(res: Response, format: (data: ErrorResponse) => string = d => d.error) {
  try {
    return format(await res.json() as ErrorResponse);
  } catch {
    return `Request failed (${res.status})`;
  }
}

function entryPointOption(path: string): RadioOption {
  return {
    value: path,
    label: path,
    description: path.endsWith(".exec") ? "Script, run with exec" : "Level, loaded with level",
  };
}

// Uploads a level archive, then lets the author confirm which file the game loads.
// onChanged runs whenever the level's files changed on the server, so the caller can reload them.
export default function LevelFileUploadPopup({levelId, token, onClose, onChanged}:{levelId:string, token:string, onClose:()=>void, onChanged:()=>void}) {
  const [file, setFile] = useState<File|null>(null);
  const [progress, setProgress] = useState<number|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [upload, setUpload] = useState<Upload|null>(null);
  const [entryPoint, setEntryPoint] = useState<string>("");
  const [otherFile, setOtherFile] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);

  const uploading = progress !== null;

  const invalid =
    file && !/\.(pak|zip)$/i.test(file.name) ? "Only .pak and .zip archives are accepted." :
    file && file.size > MAX_SIZE ? `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_SIZE)}.` :
    null;

  const selectFile = (f: File|null) => {
    setFile(f);
    setError(null);
  };

  const startUpload = async () => {
    if (!file) return;
    setError(null);
    setProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await uploadApi(`/levels/${levelId}/files`, token, "PUT", formData, setProgress);
      if (res.ok) {
        const data = await res.json() as LevelFileUploadResponseData;
        setUpload({ id: data.id, entryPoints: data.files, otherFiles: data.otherFiles });
        // The server already saved the first detected entry point
        setEntryPoint(data.files[0] ?? "");
        setOtherFile(data.otherFiles[0] ?? null);
      } else {
        setError(await responseError(res, uploadErrorText));
      }
    } catch {
      setError("The upload failed. Check your connection and try again.");
    }
    setProgress(null);
  };

  // Keeps the uploaded file with the entry point the server picked
  const close = () => {
    if (uploading || saving) return;
    if (upload) onChanged();
    onClose();
  };

  const finish = async () => {
    if (!upload) return;
    const chosen = entryPoint === OTHER ? otherFile : entryPoint;
    const detected = upload.entryPoints[0] ?? "";
    if (chosen && chosen !== detected) {
      setSaving(true);
      const res = await fetchApi(`/levels/${levelId}/files/${upload.id}`, token, "PATCH", JSON.stringify({ entryPoint: chosen }));
      setSaving(false);
      if (!res.ok) {
        setError(await responseError(res));
        return;
      }
    }
    onChanged();
    onClose();
  };

  const discard = async () => {
    if (!upload) return;
    setSaving(true);
    const res = await fetchApi(`/levels/${levelId}/files/${upload.id}`, token, "DELETE");
    setSaving(false);
    if (!res.ok) {
      setError(await responseError(res));
      return;
    }
    onChanged();
    onClose();
  };

  if (upload) {
    const options = upload.entryPoints.length > 0 ?
      upload.entryPoints.map(entryPointOption)
    :
      [{ value: "", label: "No entry point", description: "Players will have to load the level themselves" }];
    if (upload.otherFiles.length > 0) options.push({ value: OTHER, label: "Another file", description: "Pick any file from the archive" });

    return (
      <Popup title="Choose the entry point" closeCallback={close}>
        <div className={styles.dialog}>
          <div className={styles.uploaded}>
            <span className={styles.uploadedIcon}><SvgIcon name="check" size={20}/></span>
            <div className={styles.uploadedText}>
              <p className={styles.uploadedName}>{file?.name}</p>
              <p className={styles.uploadedMeta}>Uploaded · {formatBytes(file?.size ?? 0)}</p>
            </div>
          </div>

          {upload.entryPoints.length === 0 ?
            <p className={styles.warning}><SvgIcon name="warning" size={18}/>No level or script was found in this archive.</p>
          :
            <p>This is the file the game loads to start your level.{upload.entryPoints.length > 1 && " Several were found, pick the right one."}</p>
          }

          <RadioList label="Entry point" options={options} value={entryPoint} onChange={setEntryPoint} disabled={saving}/>

          {entryPoint === OTHER &&
            <ComboBox label="File" values={upload.otherFiles} onChange={i=>setOtherFile(upload.otherFiles[i])}/>
          }

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.dialogActions}>
            <Button variant="text" click={discard} disabled={saving}>Discard upload</Button>
            <Button variant="filled" icon="check" click={finish} disabled={saving}>{saving ? "Saving…" : "Done"}</Button>
          </div>
        </div>
      </Popup>
    );
  }

  return (
    <Popup title="Upload a level file" closeCallback={close}>
      <div className={styles.dialog}>
        <p>A .pak or .zip archive of your level, up to {formatBytes(MAX_SIZE)}. Players download the newest one.</p>
        <FileSelect accept=".pak, .zip" onChange={selectFile} disabled={uploading}/>

        {uploading &&
          <div className={styles.progress}>
            <ProgressBar label="Upload progress" value={progress < 1 ? progress : undefined}/>
            <p className={styles.progressText}>{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : "Reading the archive…"}</p>
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
