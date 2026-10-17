import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./lightbox.module.css";
import IconButton from "./iconButton";

export type LightboxImage = { src:string, caption?:string };

export default function Lightbox({images, index, onChange, onClose}:{images:LightboxImage[], index:number, onChange:(index:number)=>void, onClose:()=>void}) {
  const image = images[index];
  const previous = () => onChange((index - 1 + images.length) % images.length);
  const next = () => onChange((index + 1) % images.length);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
      else if (e.key === "ArrowRight") onChange((index + 1) % images.length);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, images.length, onChange, onClose]);

  return createPortal(
    <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={image.caption || "Image"} onClick={onClose}>
      <figure className={styles.figure} onClick={(e)=>e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.image} src={image.src} alt={image.caption ?? ""}/>
        {(image.caption || images.length > 1) &&
          <figcaption className={styles.caption}>
            <span>{image.caption}</span>
            {images.length > 1 && <span className={styles.counter}>{index + 1} / {images.length}</span>}
          </figcaption>
        }
      </figure>
      <div className={styles.controls} onClick={(e)=>e.stopPropagation()}>
        {images.length > 1 && <>
          <IconButton icon="chevronLeft" label="Previous" variant="tonal" click={previous}/>
          <IconButton icon="chevronRight" label="Next" variant="tonal" click={next}/>
        </>}
        <IconButton icon="close" label="Close" variant="tonal" click={onClose}/>
      </div>
    </div>
  , document.body);
}
