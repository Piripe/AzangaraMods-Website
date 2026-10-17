"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./trendingLevels.module.css";
import SvgIcon from "../kit/svgIcon";
import fetchApi from "@/utils/fetchApi";
import { difficultyNames, formatCount, galleryImageUrl } from "@/utils/levelLabels";

const levelCount = 12;
// Scrolling speed in pixels per second
const speed = 40;

// Most downloaded published levels, scrolling in an endless loop on the home page.
// The set of cards is repeated enough times to fill the row, and the track moves by one set per cycle.
export default function TrendingLevels() {
  const [levels, setLevels] = useState<LevelSearchHit[]>([]);
  const [copies, setCopies] = useState(2);
  const [setWidth, setSetWidth] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);

  useEffect(()=>{
    fetchApi(`/levels?sort=downloads&limit=${levelCount}`, "").then(async res=>{
      if (res.ok) setLevels((await res.json() as LevelSearchResult).hits);
    }).catch(()=>{});
  }, []);

  useEffect(()=>{
    const row = rowRef.current, set = setRef.current;
    if (!row || !set) return;
    const measure = ()=>{
      const width = set.offsetWidth;
      if (width === 0) return;
      setSetWidth(width);
      setCopies(Math.ceil(row.clientWidth / width) + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(set);
    return ()=>observer.disconnect();
  }, [levels]);

  if (levels.length === 0) return null;

  const style = {
    "--copies": copies,
    "--duration": `${Math.max(1, setWidth / speed)}s`,
  } as CSSProperties;

  return (
    <div ref={rowRef} className={styles.row}>
      <div className={styles.track} style={style}>
        {Array.from({length: copies}, (_, copy)=>(
          <ul key={copy} ref={copy === 0 ? setRef : undefined} className={styles.set} aria-hidden={copy > 0}>
            {levels.map(level=>(
              <li key={level.id}>
                {/* Copies stay clickable but are skipped by keyboard navigation */}
                <Link href={`/levels/${level.id}`} className={styles.card} tabIndex={copy > 0 ? -1 : undefined}>
                  <div className={styles.thumbnail}>
                    {level.thumbnailId ?
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={galleryImageUrl(level.id, level.thumbnailId)} alt=""/>
                    :
                      <SvgIcon name="image" size={24}/>
                    }
                  </div>
                  <div className={styles.body}>
                    <p className={styles.name}>{level.name}</p>
                    {level.author && <p className={styles.author}>by {level.author.username}</p>}
                    <p className={styles.stats}>
                      <span className={styles.downloads} title={`${level.downloads} downloads`}>
                        <SvgIcon name="download" size={14}/>{formatCount(level.downloads)}
                      </span>
                      <span><SvgIcon name="terrain" size={14}/>{difficultyNames[level.difficulty] ?? "Unknown"}</span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
