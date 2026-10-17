import Link from "next/link";
import styles from "./levelSearchCard.module.css";
import Chip from "../kit/chip";
import SvgIcon from "../kit/svgIcon";
import { markdownToText, parseMarkdown } from "@/utils/markdown";
import { difficultyNames, formatCount, formatRelativeDate, galleryImageUrl, getRoomsText } from "@/utils/levelLabels";

export default function LevelSearchCard({level}:{level:LevelSearchHit}) {
  const tags = level.tags?.filter(t=>t.length > 0) ?? [];

  return (
    <Link href={`/levels/${level.id}`} className={styles.card}>
      <div className={styles.thumbnail}>
        {level.thumbnailId ?
          // eslint-disable-next-line @next/next/no-img-element
          <img src={galleryImageUrl(level.id, level.thumbnailId)} alt="" loading="lazy"/>
        :
          <SvgIcon name="image" size={32}/>
        }
      </div>
      <div className={styles.body}>
        <p className={styles.title}>
          <span className={styles.name}>{level.name}</span>
          {level.author && <span className={styles.author}>by {level.author.username}</span>}
        </p>
        <p className={styles.description}>{markdownToText(parseMarkdown(level.description))}</p>
        <div className={styles.chips}>
          <Chip small icon="terrain">{difficultyNames[level.difficulty] ?? "Unknown"}</Chip>
          {level.roomAmount > 0 && <Chip small icon="rooms">{getRoomsText(level.roomAmount)}</Chip>}
          {tags.map(t=><Chip key={t} small icon="tag">{t}</Chip>)}
        </div>
      </div>
      <div className={styles.stats}>
        <span className={styles.downloads} title={`${level.downloads} downloads`}>
          <SvgIcon name="download" size={18}/><strong>{formatCount(level.downloads)}</strong> downloads
        </span>
        <span title={new Date(level.lastEdit).toLocaleString()}>
          <SvgIcon name="history" size={16}/>Updated {formatRelativeDate(level.lastEdit)}
        </span>
      </div>
    </Link>
  );
}
