"use client";
import BigTextBox from "@/components/kit/bigTextbox";
import Button from "@/components/kit/button";
import Slider from "@/components/kit/silder";
import Stars from "@/components/kit/stars";
import TextBox from "@/components/kit/textbox";
import useUserData from "@/hooks/useUserData";
import fetchApi from "@/utils/fetchApi";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css"
import Card from "@/components/kit/card";
import PageHeader from "@/components/kit/pageHeader";
import errorAlert from "@/utils/errorAlert";
import { LevelDifficulties } from "@/enums";
import ComboBox from "@/components/kit/combobox";

export default function Page() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(LevelDifficulties.VeryEasy);
  const [tags, setTags] = useState("");
  const {token, pushLevel} = useUserData();

  const router = useRouter();
    
  return (
    <div>
      <PageHeader backHref="/dashboard/levels" title="New level" subtitle="You can upload files and screenshots once it's created"/>
      <Card className={styles.form}>
      <TextBox label="Name" onChange={(e)=>setName(e)} maxLength={64}/>
      <BigTextBox label="Description" onChange={(e)=>setDescription(e)} maxLength={8192}/>
      <ComboBox label="Difficulty" onChange={(e)=>setDifficulty([10,20,30,40,50,60][e])} values={["Very Easy", "Easy", "Normal", "Hard", "Very Hard", "Expert"]} defaultValue={0}/>
      <TextBox label="Tags" supportingText="Space-separated, up to 10" onChange={(e)=>setTags(e)}/>
      <div className={styles.formActions}>
        <Button variant="filled" icon="add" click={()=>{
          if (name.length === 0) {
            alert("Name cannot be empty");
            return;
          }
          if (name.length > 64) {
            alert("Name cannot be longer than 64 characters");
            return;
          }
          if (description.length === 0) {
            alert("Description cannot be empty");
            return;
          }
          if (description.length > 8192) {
            alert("Description cannot be longer than 8192 characters");
            return;
          }
          const tagsArray = tags.split(" ");
          if (tagsArray.length > 10) {
            alert("Too many tags (max 10)");
            return;
          }
          if (tagsArray.some(t=>t.length>32)) {
            alert("Tags must be less than 32 characters");
            return;
          }
          fetchApi("/levels", token!, "PUT",
            JSON.stringify({
              name,
              description,
              difficulty,
              tags
            })
          ).then(res=>{
            if (res.ok) {
              res.json().then((data:Level)=>{
                pushLevel(data);
                router.push("/dashboard/levels/"+data.id);
              });
            } else {
              res.json().then((data:ErrorResponse)=>errorAlert(data));
            }
          });
        }}>
          Create Level
        </Button>
      </div>
      </Card>
    </div>
  );
}
