import { JSX } from "react";
import styles from "./stars.module.css";


export default function Stars({value, alt, size=24}:{value:number, alt?:string|undefined, size?:number}) {

  return (
    <div className={styles.stars} style={{ width: size*11, height: size }}>
        {
            [...Array(10)].map((e, i) => {

                var starValue = i < value-1 ? 1 : i < value ? (value-0.001) % 1*0.5+0.5 : 0.5;
                var starSize = i < value-1 ? size : i < value ? size * ((value-0.001) % 1*0.75+0.25) : .25 * size;

                return (
                    <>
                        {/* <span className={styles.starColor} style={{ width: starSize, height: starSize, background: color }}></span> */}
                        {/*<img key={i} className={styles.star} src="/icons/star.svg" style={{ width: starSize, height: starSize, filter: `brightness(${starValue})` }}/>*/}
                        <svg key={i} className={styles.star} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: starSize, height: starSize, filter: `brightness(${starValue})`  }}>
                            <path d="M11.0489 1.92705C11.3483 1.00574 12.6517 1.00574 12.9511 1.92705L14.6942 7.2918C14.9619 8.11584 15.7298 8.67376 16.5963 8.67376H22.2371C23.2058 8.67376 23.6086 9.91338 22.8249 10.4828L18.2614 13.7984C17.5604 14.3077 17.2671 15.2104 17.5348 16.0344L19.2779 21.3992C19.5773 22.3205 18.5228 23.0866 17.7391 22.5172L13.1756 19.2016C12.4746 18.6923 11.5254 18.6923 10.8244 19.2016L6.2609 22.5172C5.47719 23.0866 4.42271 22.3205 4.72206 21.3992L6.46517 16.0344C6.73292 15.2104 6.43961 14.3077 5.73863 13.7984L1.1751 10.4828C0.391391 9.91338 0.794167 8.67376 1.76289 8.67376H7.40372C8.27017 8.67376 9.03808 8.11584 9.30583 7.2918L11.0489 1.92705Z"/> 
                        </svg>
                    </>
                );
            })
        }
        <div className={styles.infoBubble}>{alt}</div>
    </div>
  );
}