"use client";
import BigTextBox from "@/app/components/kit/bigTextbox";
import Button from "@/app/components/kit/button";
import Slider from "@/app/components/kit/silder";
import Stars from "@/app/components/kit/stars";
import TextBox from "@/app/components/kit/textbox";
import useUserData from "@/app/hooks/useUserData";
import fetchApi from "@/app/utils/fetchApi";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Page() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(0);
  const [tags, setTags] = useState("");
  const {token, pushLevel} = useUserData();

  const router = useRouter();
    
  return (
    <div>
      <p>Name</p>
      <TextBox onChange={(e)=>setName(e)} maxLength={64}/>
      <p>Description</p>
      <BigTextBox onChange={(e)=>setDescription(e)} maxLength={8192}/>
      <p>Difficulty</p>
      <Stars value={difficulty} size={14.3} alt={`Difficulty ${Math.round((difficulty ?? 0)*100)/100}/10`}/>
      <Slider onChange={(e)=>setDifficulty(e)} min={0} max={10} step={0.01} defaultValue={0}/>
      <p>Tags (max 10)</p>
      <TextBox onChange={(e)=>setTags(e)}/>
      <div>
        <Button click={()=>{
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
              alert("Failed to create level");
            }
          });
        }}>
          Create Level
        </Button>
      </div>
    </div>
  );
}
