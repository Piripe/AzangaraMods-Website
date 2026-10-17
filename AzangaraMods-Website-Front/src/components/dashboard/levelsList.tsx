"use client";

import useUserData from "@/hooks/useUserData";
import Link from "next/link";
import styles from "./levelsList.module.css";
import Chip from "../kit/chip";
import SvgIcon from "../kit/svgIcon";
import Spinner from "../kit/spinner";
import EmptyState from "../kit/emptyState";
import LinkButton from "../kit/linkButton";
import { difficultyNames, galleryImageUrl } from "@/utils/levelLabels";
import { LevelVerificationStatus } from "@/enums";

export function LevelsList() {

    const {user} = useUserData();

    if (!user) return <Spinner/>;

    if (!user.levels?.length) return (
        <EmptyState
            icon="map"
            title="No levels yet"
            text="Create your first level, then upload its files and a few screenshots."
            action={<LinkButton variant="filled" icon="add" href="/dashboard/levels/new">New level</LinkButton>}
        />
    );

    return (
        <div className={styles.container}>
            {
                [...user.levels].sort((a, b) => new Date(b.lastEdit).getTime() - new Date(a.lastEdit).getTime()).map(level => (
                    <Link key={level.id} href={`/dashboard/levels/${level.id}`} className={styles.levelItem}>
                        <div className={styles.thumbnailBox}>
                            {level.galleryFiles?.length ?
                                // eslint-disable-next-line @next/next/no-img-element
                                <img className={styles.levelThumbnail} src={galleryImageUrl(level.id, level.galleryFiles[0].id)} alt={level.name} />
                            :
                                <span className={styles.levelNoThumbnail}><SvgIcon name="image" size={40}/></span>
                            }
                            <span className={styles.status}>
                                {level.published ?
                                    <Chip small variant="success" icon="public">Published</Chip>
                                : level.verification === LevelVerificationStatus.Pending ?
                                    <Chip small variant="highlight" icon="schedule">Pending review</Chip>
                                :
                                    <Chip small variant="highlight" icon="lock">Draft</Chip>
                                }
                            </span>
                        </div>
                        <div className={styles.levelInfo}>
                            <div className={styles.levelName}>{level.name}</div>
                            <div><Chip small icon="terrain">{difficultyNames[level.difficulty] ?? "Unknown"}</Chip></div>
                            <div className={styles.levelMeta}>
                                <SvgIcon name="schedule" size={14}/>
                                {"Edited " + new Date(level.lastEdit).toLocaleString()}
                            </div>
                        </div>
                    </Link>
                ))
            }
        </div>
    );
}
