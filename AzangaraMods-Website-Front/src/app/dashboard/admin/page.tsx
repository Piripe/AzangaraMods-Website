import AdminLevels from "@/components/admin/adminLevels";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // The admin webhook links to ?tab=pending and ?tab=reports
  const { tab } = await searchParams;
  return <AdminLevels initialStatus={tab === "pending" || tab === "reports" || tab === "users" ? tab : "all"}/>;
}
