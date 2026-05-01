import Link from "next/link";

export function DashboardNav() {
    return (
        <div>
            <Link href="/">Home</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/dashboard/levels">Levels</Link>
        </div>
    );
}