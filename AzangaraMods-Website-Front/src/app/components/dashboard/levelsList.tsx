"use client";

import useUserData from "@/app/hooks/useUserData";
import Link from "next/link";
import styles from "./levelsList.module.css";
import Icon, { IconType } from "../kit/icon";

export function LevelsList() {

    const {user} = useUserData();

    return (
        <div className={styles.container}>
            {
                user?.levels?.sort((a, b) => new Date(b.lastEdit).getTime() - new Date(a.lastEdit).getTime()).map(level => (
                    <Link key={level.id} href={`/dashboard/levels/${level.id}`} className={styles.levelItem}>
                        {level.galleryFiles?.length??0 > 0 ? <img className={styles.levelThumbnail} src={process.env.NEXT_PUBLIC_API_URL + "/download/level/" + level.id + "/gallery/" + level.galleryFiles?.[0]?.id} alt={level.name} /> : <></>} 
                        <div className={styles.levelInfo}>
                            <div className={styles.levelName}>
                                {level.name} <Icon size={18} icon={level.published ? IconType.LockOpen : IconType.LockClosed} alt={level.published ? "Published" : "Not published"} />
                            </div>
                            <div className={styles.levelMeta}>
                                {"Last edit at " + new Date(level.lastEdit).toLocaleString()}
                            </div>
                        </div>
                    </Link>
                ))
            }
        </div>
    );
}