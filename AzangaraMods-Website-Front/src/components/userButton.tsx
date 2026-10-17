"use client";

import { useState } from "react";
import Button from "./kit/button";
import { createPortal } from "react-dom";
import UserButtonMenu from "./userButtonMenu";
import Popup from "./kit/popup";
import useUserData from "../hooks/useUserData";
import { AuthBox, AuthMode } from "./authBox";
import styles from "./userButton.module.css";
import SvgIcon from "./kit/svgIcon";
import Avatar from "./kit/avatar";

export default function UserButton() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode|null>(null);

  const toggleMenu = () => setMenuVisible(!menuVisible);
  const closeAuthBox = () => setAuthMode(null);

  const {user, token, avatarVersion} = useUserData();

  return (

    <div>
      {user || token ?
        (<Button click={toggleMenu}>
          <>
            <Avatar className={styles.avatar} user={user} size={28} version={avatarVersion}/>
            <span className={styles.name}>{user ? user.username : "User"}</span>
            <SvgIcon name="expandMore" size={18}/>
          </>
        </Button>)
      :
        <div className={styles.buttons}>
          <Button variant="text" click={()=>setAuthMode("login")}>{"Log in"}</Button>
          <Button variant="filled" click={()=>setAuthMode("register")}>{"Sign up"}</Button>
        </div>
      }
      {menuVisible &&
        createPortal(
          <UserButtonMenu closeCallback={toggleMenu}/>,
          document.body
        )
      }
      {authMode &&
        <Popup title={authMode === "register" ? "Create your account" : "Log in"} closeCallback={closeAuthBox}>
          <AuthBox mode={authMode} setMode={setAuthMode} onSuccess={closeAuthBox}/>
        </Popup>
      }
    </div>
  );
}