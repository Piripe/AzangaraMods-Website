'use client';
import styles from "./page.module.css";
import { Suspense, use, useEffect, useState } from "react";
import fetchApi from "@/utils/fetchApi";
import Avatar from "@/components/kit/avatar";
import Chip from "@/components/kit/chip";
import EmptyState from "@/components/kit/emptyState";
import LinkButton from "@/components/kit/linkButton";
import PageHeader from "@/components/kit/pageHeader";
import Spinner from "@/components/kit/spinner";
import LevelBrowser from "@/components/levels/levelBrowser";
import useUserData from "@/hooks/useUserData";
import { formatCount, formatRelativeDate } from "@/utils/levelLabels";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);
  const {user} = useUserData();

  const [author, setAuthor] = useState<UserProfile|null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(()=>{
    let cancelled = false;
    fetchApi("/users/" + id, "").then(async res=>{
      if (cancelled) return;
      if (res.ok) {
        setAuthor(await res.json());
        setFailed(false);
      } else {
        setFailed(true);
      }
    }).catch(()=>{
      if (!cancelled) setFailed(true);
    });
    return ()=>{ cancelled = true; };
  }, [id]);

  if (!author) {
    if (!failed) return <Spinner/>;
    return (
      <EmptyState
        icon="person"
        title="Author not found"
        text="This account doesn't exist or isn't public."
        action={<LinkButton variant="filled" icon="search" href="/levels">Browse levels</LinkButton>}
      />
    );
  }

  return (
    <div>
      <div className={styles.profile}>
        <Avatar user={author} size={64}/>
        <PageHeader
          title={author.username}
          subtitle={`${author.levelCount} level${author.levelCount === 1 ? "" : "s"} · ${formatCount(author.downloads)} downloads · Joined ${formatRelativeDate(author.creation)}`}
          badge={author.verifiedModder && <Chip small variant="success" icon="shield">Verified modder</Chip>}
          actions={user?.id === author.id && <LinkButton variant="filled" icon="add" href="/dashboard/levels/new">New level</LinkButton>}
        />
      </div>
      {/* The browser reads its filters from the URL, so it renders on the client only */}
      <Suspense fallback={<Spinner/>}>
        <LevelBrowser authorId={author.id}/>
      </Suspense>
    </div>
  );
}
