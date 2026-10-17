import { Suspense } from "react";
import PageHeader from "@/components/kit/pageHeader";
import Spinner from "@/components/kit/spinner";
import LevelBrowser from "@/components/levels/levelBrowser";

export default function Page() {
  return (
    <div>
      <PageHeader title="Browse levels" subtitle="Custom levels made by the Azangara community"/>
      {/* The browser reads its filters from the URL, so it renders on the client only */}
      <Suspense fallback={<Spinner/>}>
        <LevelBrowser/>
      </Suspense>
    </div>
  );
}
