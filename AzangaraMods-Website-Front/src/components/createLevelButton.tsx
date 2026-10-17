"use client";

import { useState } from "react";
import LinkButton from "./kit/linkButton";
import Button from "./kit/button";
import Popup from "./kit/popup";
import useUserData from "../hooks/useUserData";
import { AuthBox, AuthMode } from "./authBox";

const newLevelPath = "/dashboard/levels/new";

// Sends logged-in users to the level editor, and asks everyone else to log in first
export default function CreateLevelButton() {
  const [authMode, setAuthMode] = useState<AuthMode|null>(null);
  const {token} = useUserData();

  const closeAuthBox = () => setAuthMode(null);

  if (token) return <LinkButton variant="outlined" icon="add" href={newLevelPath}>Create a level</LinkButton>;

  return (
    <>
      <Button variant="outlined" icon="add" click={()=>setAuthMode("login")}>Create a level</Button>
      {authMode &&
        <Popup title={authMode === "register" ? "Create your account" : "Log in"} closeCallback={closeAuthBox}>
          <AuthBox mode={authMode} setMode={setAuthMode} onSuccess={closeAuthBox} redirect={newLevelPath}/>
        </Popup>
      }
    </>
  );
}
