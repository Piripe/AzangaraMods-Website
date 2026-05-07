import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/app/components/navBar";
import { LevelsList } from "@/app/components/dashboard/levelsList";
import Link from "next/link";
import LinkButton from "@/app/components/kit/linkButton";

export default function Page() {
    
  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1>My Levels</h1>
        <LinkButton href={`/dashboard/levels/new`}>
            Create New Level
        </LinkButton>
      </div>
      <LevelsList />
    </div>
  );
}
