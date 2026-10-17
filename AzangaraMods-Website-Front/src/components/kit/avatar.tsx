import { useState } from "react";
import styles from "./avatar.module.css";
import { avatarUrl } from "@/utils/levelLabels";

// Profile picture, or the first letter of the username when there is none
export default function Avatar({user, size=40, version, className}:{user:{id:string, username:string, hasProfilePicture:boolean}|null|undefined, size?:number, version?:number, className?:string}) {
  const [failedSrc, setFailedSrc] = useState<string|null>(null);
  const src = user?.hasProfilePicture ? avatarUrl(user.id, version) : null;

  return (
    <span className={`${styles.avatar} ${className ?? ""}`} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {src && src !== failedSrc ?
        <img src={src} alt="" onError={()=>setFailedSrc(src)}/>
      :
        (user?.username ?? "?").charAt(0).toUpperCase()
      }
    </span>
  );
}
