import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/app/components/navBar";
import { LevelsList } from "@/app/components/dashboard/levelsList";
import Link from "next/link";

export default function Page() {
    
  return (
    <div>
      <Link href={`/dashboard/levels/new`}>
          Create New Level
      </Link>
      <LevelsList />
    </div>
  );
}
