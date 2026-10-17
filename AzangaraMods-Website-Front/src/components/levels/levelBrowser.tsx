"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./levelBrowser.module.css";
import LevelSearchCard from "./levelSearchCard";
import Button from "../kit/button";
import ComboBox from "../kit/combobox";
import EmptyState from "../kit/emptyState";
import FilterChip from "../kit/filterChip";
import Pagination from "../kit/pagination";
import Spinner from "../kit/spinner";
import SvgIcon from "../kit/svgIcon";
import TextBox from "../kit/textbox";
import fetchApi from "@/utils/fetchApi";
import { difficultyNames, levelSizes } from "@/utils/levelLabels";

const sortOptions = [
  { id: "relevance", label: "Relevance" },
  { id: "downloads", label: "Downloads" },
  { id: "newest", label: "Newest" },
  { id: "updated", label: "Recently updated" },
];
const pageSize = 20;
const shownTagsCount = 12;
const difficulties = Object.keys(difficultyNames) as `${LevelDifficulties}`[];

// authorId restricts the results to one author's levels (author page)
export default function LevelBrowser({authorId}:{authorId?:string}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const selectedDifficulties = searchParams.getAll("difficulty");
  const selectedSizes = searchParams.getAll("size");
  const selectedTags = searchParams.getAll("tag");
  const sortIndex = Math.max(0, sortOptions.findIndex(s=>s.id === searchParams.get("sort")));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);

  const apiParams = new URLSearchParams();
  if (authorId) apiParams.set("author", authorId);
  if (query) apiParams.set("q", query);
  selectedDifficulties.forEach(d=>apiParams.append("difficulty", d));
  selectedSizes.forEach(s=>apiParams.append("size", s));
  selectedTags.forEach(t=>apiParams.append("tag", t));
  apiParams.set("sort", sortOptions[sortIndex].id);
  apiParams.set("offset", ((page - 1) * pageSize).toString());
  apiParams.set("limit", pageSize.toString());
  const apiQuery = apiParams.toString();

  const [result, setResult] = useState<LevelSearchResult|null>(null);
  const [resultQuery, setResultQuery] = useState<string|null>(null);
  const [failed, setFailed] = useState(false);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(()=>{
    let cancelled = false;
    fetchApi("/levels?" + apiQuery, "").then(async res=>{
      if (cancelled) return;
      if (res.ok) {
        setResult(await res.json());
        setFailed(false);
      } else {
        setFailed(true);
      }
      setResultQuery(apiQuery);
    }).catch(()=>{
      if (!cancelled) setFailed(true);
    });
    return ()=>{ cancelled = true; };
  }, [apiQuery]);

  useEffect(()=>{
    fetchApi("/levels/tags", "").then(async res=>{
      if (res.ok) setTags(await res.json());
    }).catch(()=>{});
  }, []);

  // Filters replace the history entry; changing page pushes one so "back" returns to the previous page
  function navigate(change:(p:URLSearchParams)=>void, push = false) {
    const params = new URLSearchParams(searchParams.toString());
    change(params);
    const url = params.size > 0 ? `${pathname}?${params}` : pathname;
    if (push) router.push(url);
    else router.replace(url, { scroll: false });
  }

  function updateFilters(change:(p:URLSearchParams)=>void) {
    navigate(p=>{
      change(p);
      p.delete("page");
    });
  }

  function toggle(name:string, value:string) {
    updateFilters(p=>{
      const values = p.getAll(name);
      p.delete(name);
      (values.includes(value) ? values.filter(v=>v !== value) : [...values, value]).forEach(v=>p.append(name, v));
    });
  }

  function search(text:string) {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(()=>updateFilters(p=>{
      if (text.trim()) p.set("q", text.trim());
      else p.delete("q");
    }), 300);
  }

  function clearFilters() {
    updateFilters(p=>{
      p.delete("difficulty");
      p.delete("size");
      p.delete("tag");
    });
  }

  const filterCount = selectedDifficulties.length + selectedSizes.length + selectedTags.length;
  // Selected tags stay visible even when they fall outside the shown ones
  const tagsList = showAllTags ? tags : [
    ...tags.slice(0, shownTagsCount),
    ...tags.slice(shownTagsCount).filter(t=>selectedTags.includes(t.tag)),
  ];
  const loading = resultQuery !== apiQuery && !failed;
  const pageCount = result ? Math.ceil(result.totalHits / pageSize) : 0;

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${filtersOpen ? styles.open : ""}`}>
        <section className={styles.filterGroup}>
          <h3>Difficulty</h3>
          <div className={styles.chips}>
            {difficulties.map(d=>(
              <FilterChip key={d} small icon="terrain" selected={selectedDifficulties.includes(d)} onToggle={()=>toggle("difficulty", d)}>
                {difficultyNames[Number(d) as LevelDifficulties]}
              </FilterChip>
            ))}
          </div>
        </section>
        <section className={styles.filterGroup}>
          <h3>Size</h3>
          <div className={styles.chips}>
            {levelSizes.map(s=>(
              <FilterChip key={s.id} small icon="rooms" selected={selectedSizes.includes(s.id)} onToggle={()=>toggle("size", s.id)}>
                <span title={`${s.rooms} rooms`}>{s.label}</span>
              </FilterChip>
            ))}
          </div>
        </section>
        <section className={styles.filterGroup}>
          <h3>Tags</h3>
          {tags.length > 0 ?
            <div className={styles.chips}>
              {tagsList.map(t=>(
                <FilterChip key={t.tag} small icon="tag" count={t.count} selected={selectedTags.includes(t.tag)} onToggle={()=>toggle("tag", t.tag)}>
                  {t.tag}
                </FilterChip>
              ))}
            </div>
          :
            <p className={styles.muted}>No tags yet</p>
          }
          {tags.length > shownTagsCount &&
            <Button variant="text" click={()=>setShowAllTags(!showAllTags)}>{showAllTags ? "Show less" : `Show all ${tags.length} tags`}</Button>
          }
        </section>
        {filterCount > 0 && <Button variant="outlined" icon="close" click={clearFilters}>Clear filters</Button>}
      </aside>

      <div className={styles.main}>
        <div className={styles.toolbar}>
          <TextBox className={styles.search} icon="search" placeholder="Search levels…" defaultValue={query} onChange={search}/>
          <ComboBox key={sortIndex} label="Sort by" values={sortOptions.map(s=>s.label)} defaultValue={sortIndex} onChange={i=>updateFilters(p=>{
            if (i === 0) p.delete("sort");
            else p.set("sort", sortOptions[i].id);
          })}/>
          <span className={styles.filtersToggle}>
            <Button variant={filterCount > 0 ? "tonal" : "outlined"} icon="filter" click={()=>setFiltersOpen(!filtersOpen)}>
              Filters{filterCount > 0 ? ` (${filterCount})` : ""}
            </Button>
          </span>
        </div>

        {failed ?
          <EmptyState icon="map" title="Couldn't load levels" text="The server didn't answer. Try again in a moment."/>
        : !result ?
          <Spinner/>
        : result.hits.length === 0 ?
          <EmptyState
            icon="search"
            title="No levels found"
            text={query || filterCount > 0 ? "Try another search or remove some filters." : authorId ? "This author hasn't published a level yet." : "Nobody has published a level yet."}
            action={filterCount > 0 ? <Button variant="outlined" icon="close" click={clearFilters}>Clear filters</Button> : undefined}
          />
        :
          <>
            <p className={styles.count}>
              <SvgIcon name="map" size={16}/>
              {result.totalHits} level{result.totalHits === 1 ? "" : "s"}
            </p>
            <div className={`${styles.results} ${loading ? styles.loading : ""}`} aria-busy={loading}>
              {result.hits.map(level=><LevelSearchCard key={level.id} level={level}/>)}
            </div>
            <Pagination page={page} pageCount={pageCount} onChange={p=>navigate(params=>{
              if (p === 1) params.delete("page");
              else params.set("page", p.toString());
            }, true)}/>
          </>
        }
      </div>
    </div>
  );
}
