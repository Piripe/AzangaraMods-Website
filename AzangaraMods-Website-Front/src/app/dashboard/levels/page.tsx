import { LevelsList } from "@/components/dashboard/levelsList";
import LinkButton from "@/components/kit/linkButton";
import PageHeader from "@/components/kit/pageHeader";

export default function Page() {
    
  return (
    <div>
      <PageHeader
        title="My Levels"
        subtitle="Levels you created, published or not"
        actions={<LinkButton variant="filled" icon="add" href={`/dashboard/levels/new`}>New level</LinkButton>}
      />
      <LevelsList />
    </div>
  );
}
