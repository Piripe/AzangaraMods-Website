"use client";
import Button from "@/app/components/kit/button";
import Slider from "@/app/components/kit/silder";
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
      <TextBox onChange={(e)=>setDescription(e)} maxLength={8192}/>
      <p>Difficulty</p>
      <Slider onChange={(e)=>setDifficulty(e)} min={0} max={10} step={0.01} defaultValue={0}/>
      <p>Tags (max 10)</p>
      <TextBox onChange={(e)=>setTags(e)}/>
      <div>
        <Button click={()=>{
          if (name.length === 0) {
            alert("Name cannot be empty");
            return;
          }
          if (description.length === 0) {
            alert("Description cannot be empty");
            return;
          }
          if (tags.split(" ").length > 10) {
            alert("Too many tags (max 10)");
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
