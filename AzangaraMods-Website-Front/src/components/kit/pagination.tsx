import styles from "./pagination.module.css";
import SvgIcon from "./svgIcon";

// Pages to show around the current one; gaps are rendered as "…"
function visiblePages(page:number, pageCount:number) {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  return [...pages].filter(p=>p >= 1 && p <= pageCount).sort((a, b)=>a - b);
}

export default function Pagination({page, pageCount, onChange}:{page:number, pageCount:number, onChange:(page:number)=>void}) {
  if (pageCount <= 1) return null;
  const pages = visiblePages(page, pageCount);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button type="button" className={styles.page} disabled={page <= 1} onClick={()=>onChange(page - 1)} aria-label="Previous page">
        <SvgIcon name="chevronLeft" size={20}/>
      </button>
      {pages.map((p, i)=>(
        <span key={p} style={{ display: "contents" }}>
          {i > 0 && p - pages[i - 1] > 1 && <span className={styles.gap}>…</span>}
          <button type="button" className={`${styles.page} ${p === page ? styles.current : ""}`} aria-current={p === page ? "page" : undefined} onClick={()=>onChange(p)}>{p}</button>
        </span>
      ))}
      <button type="button" className={styles.page} disabled={page >= pageCount} onClick={()=>onChange(page + 1)} aria-label="Next page">
        <SvgIcon name="chevronRight" size={20}/>
      </button>
    </nav>
  );
}
