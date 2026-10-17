'use client';
import Image from "next/image";
import styles from "./page.module.css";
import Card from "@/components/kit/card";
import PageHeader from "@/components/kit/pageHeader";
import Spinner from "@/components/kit/spinner";
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
import TagsInput from "@/components/kit/tagsInput";
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
  const [tags, setTags] = useState(null as string[]|null);
  // Raw text of the rooms field, null while untouched so the PATCH leaves the room count alone
  const [roomAmount, setRoomAmount] = useState(null as string|null);

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

  const parsedRoomAmount = roomAmount === null ? null : Number(roomAmount);
  const roomAmountError = parsedRoomAmount !== null && (roomAmount!.trim() === "" || !Number.isInteger(parsedRoomAmount) || parsedRoomAmount < 0 || parsedRoomAmount > 32767)
    ? "Enter a whole number between 0 and 32767"
    : null;
  
  return (
    (!levelData) ? <Spinner/> :
      <div>
        <PageHeader backHref={"/dashboard/levels/" + id} title="Edit level" subtitle={levelData.name}/>
        <Card className={styles.form}>
        <TextBox placeholder="Name" onChange={(e)=>setName(e)} defaultValue={levelData?.name} maxLength={64}/>
        <BigTextBox placeholder="Description" onChange={(e)=>setDescription(e)} defaultValue={levelData?.description} maxLength={8192}/>
        <ComboBox label="Difficulty" onChange={(e)=>setDifficulty(difficulties[e])} values={["Very Easy", "Easy", "Normal", "Hard", "Very Hard", "Expert"]} defaultValue={difficulties.indexOf(levelData?.difficulty ?? 10)}/>   
        <TextBox placeholder="Rooms" type="number" min={0} max={32767} onChange={(e)=>setRoomAmount(e)} defaultValue={levelData?.roomAmount?.toString()} error={roomAmountError} supportingText="Counted automatically from your latest upload. Uploading a new file counts it again."/>
        <TagsInput label="Tags" supportingText="Press Enter, Space or comma to add" onChange={(e)=>setTags(e)} defaultValue={levelData?.tags} />
        <div className={styles.formActions}>
          <LinkButton variant="text" href={"/dashboard/levels/" + id}>Cancel</LinkButton>
          <Button variant="filled" disabled={roomAmountError !== null} click={()=>{
            fetchApi("/levels/" + id, token!, "PATCH",
              JSON.stringify({
                name,
                description,
                difficulty,
                roomAmount: parsedRoomAmount,
                tags
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
            Save changes
          </Button>
        </div>
        </Card>
      </div>
  );
}
