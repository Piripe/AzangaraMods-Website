"use client";

import useUserData from "@/app/hooks/useUserData";
import Link from "next/link";

export function LevelsList() {

    const {user} = useUserData();

    return (
        <div>
            {
                user?.levels?.map(level => (
                    <div key={level.id}>
                        <Link href={`/dashboard/levels/${level.id}`}>
                            {level.name}
                        </Link>
                    </div>
                ))
            }
        </div>
    );
}