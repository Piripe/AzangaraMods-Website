'use client';
import Image from "next/image";
import styles from "./page.module.css";
import NavBar from "@/components/navBar";
import fetchApi from "@/utils/fetchApi";
import { use, useEffect, useState } from "react";
import useUserData from "@/hooks/useUserData";
import Link from "next/link";
import Button from "@/components/kit/button";
import TextBox from "@/components/kit/textbox";
import Slider from "@/components/kit/silder";
import { useRouter } from "next/navigation";
import BigTextBox from "@/components/kit/bigTextbox";
import Stars from "@/components/kit/stars";
import LinkButton from "@/components/kit/linkButton";
import errorAlert from "@/utils/errorAlert";
import ComboBox from "@/components/kit/combobox";
import { LevelDifficulties } from "@/enums";

export default  function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params);

  const [name, setName] = useState(null as string|null);
  const [description, setDescription] = useState(null as string|null);
    const [difficulty, setDifficulty] = useState(null as LevelDifficulties|null);
  const [tags, setTags] = useState(null as string|null);

  const router = useRouter();

  const {user, setUser, token, updateLevel} = useUserData();

  const levelIndex = user?.levels?.findIndex(l=>l.id === id) ?? -1;

  const [levelData, setLevelData] = useState(null as Level|null);

  useEffect(()=>{
    if (token != null) {
      (async ()=>{
        let res = await fetchApi(
          "/levels/" + id,
          token
        );
        var data = await res.json();
        if (res.ok) {
          setLevelData(data);
        } else {
          errorAlert(data);
        }
      })();
    }
  }, [user]);

  const difficulties = [10,20,30,40,50,60];
  
  return (
    (!levelData) ? <p>Loading...</p> :
      <div>
        <div className={styles.headerButtons}>
          <LinkButton href={"/dashboard/levels/" + id}>{"Back"}</LinkButton>
        </div>
        <p>Name</p>
        <TextBox onChange={(e)=>setName(e)} defaultValue={levelData?.name} maxLength={64}/>
        <p>Description</p>
        <BigTextBox onChange={(e)=>setDescription(e)} defaultValue={levelData?.description} maxLength={8192}/>
        <p>Difficulty</p>
        <ComboBox onChange={(e)=>setDifficulty(difficulties[e])} values={["Very Easy", "Easy", "Normal", "Hard", "Very Hard", "Expert"]} defaultValue={difficulties.indexOf(levelData?.difficulty ?? 10)}/>   
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
                  updateLevel(data);
                  router.push("/dashboard/levels/"+data.id);
                });
              } else {
                res.json().then((data:ErrorResponse)=>{errorAlert(data)});
              }
            });
          }}>
            Update Level
          </Button>
        </div>
      </div>
  );
}
