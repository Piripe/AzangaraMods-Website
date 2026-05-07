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
                user?.levels?.map(level => (
                    <Link key={level.id} href={`/dashboard/levels/${level.id}`} className={styles.levelItem}>
                        {level.name} <Icon size={18} icon={level.published ? IconType.LockOpen : IconType.LockClosed} alt={level.published ? "Published" : "Not published"} />
                    </Link>
                ))
            }
        </div>
    );
}