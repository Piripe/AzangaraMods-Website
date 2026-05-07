'use client';
import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/app/components/navBar";
import fetchApi from "@/app/utils/fetchApi";
import { use, useEffect, useState } from "react";
import useUserData from "@/app/hooks/useUserData";
import Link from "next/link";
import Button from "@/app/components/kit/button";
import TextBox from "@/app/components/kit/textbox";
import Slider from "@/app/components/kit/silder";
import { useRouter } from "next/navigation";
import BigTextBox from "@/app/components/kit/bigTextbox";
import Stars from "@/app/components/kit/stars";

export default  function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);

  const [name, setName] = useState(null as string|null);
  const [description, setDescription] = useState(null as string|null);
  const [difficulty, setDifficulty] = useState(null as number|null);
  const [tags, setTags] = useState(null as string|null);

  const router = useRouter();

  const {user, setUser, token} = useUserData();

  const levelIndex = user?.levels?.findIndex(l=>l.id === id) ?? -1;

  const [levelData, setLevelData] = useState(null as Level|null);

  useEffect(()=>{
    if (token != null) {
      (async ()=>{
        let res = await fetchApi(
          "/levels/" + id,
          token
        );
        if (res.ok) {
          setLevelData(await res.json());
        }
      })();
    }
  }, [user]);

  
  return (
    (!levelData) ? <p>Loading...</p> :
      <div>
        <p>Name</p>
        <TextBox onChange={(e)=>setName(e)} defaultValue={levelData?.name} maxLength={64}/>
        <p>Description</p>
        <BigTextBox onChange={(e)=>setDescription(e)} defaultValue={levelData?.description} maxLength={8192}/>
        <p>Difficulty</p>
        <Stars value={difficulty??levelData?.difficulty ?? 0} size={14.3} alt={`Difficulty ${Math.round((difficulty??levelData?.difficulty ?? 0)*100)/100}/10`}/>
        <Slider onChange={(e)=>setDifficulty(e)} min={0} max={10} step={0.01} defaultValue={levelData?.difficulty ?? 0}/>
        <p>Tags (max 10)</p>
        <TextBox onChange={(e)=>setTags(e)} defaultValue={levelData?.tags?.join(" ")} />
        <div>
          <Button click={()=>{
            fetchApi("/levels/" + id, token!, "PATCH",
              JSON.stringify({
                name,
                description,
                difficulty,
                tags: tags?.split(" ") || null
              })
            ).then(res=>{
              if (res.ok) {
                res.json().then((data:Level)=>{
                  router.push("/dashboard/levels/"+data.id);
                });
              } else {
                alert("Failed to update level");
              }
            });
          }}>
            Update Level
          </Button>
        </div>
      </div>
  );
}
