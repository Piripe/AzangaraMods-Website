"use client";

import { useState } from "react";
import Button from "./kit/button";
import { createPortal } from "react-dom";
import UserButtonMenu from "./userButtonMenu";
import Popup from "./kit/popup";
import { LoginBox } from "./loginBox";
import useUserData from "../hooks/useUserData";
import { RegisterBox } from "./registerBox";
import styles from "./userButton.module.css";
import SvgIcon from "./kit/svgIcon";

export default function UserButton() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [loginBoxVisible, setLoginBoxVisible] = useState(false);
  const [registerBoxVisible, setRegisterBoxVisible] = useState(false);

  const toggleMenu = () => setMenuVisible(!menuVisible);
  const toggleLoginBox = () => {
    setLoginBoxVisible(!loginBoxVisible);
    setRegisterBoxVisible(false);
  };
  const toggleRegisterBox = () => {
    setRegisterBoxVisible(!registerBoxVisible);
    setLoginBoxVisible(false);
  };

  const {user, token} = useUserData();

  return (

    <div>
      {user || token ?
        (<Button click={toggleMenu}>
          <>
            <span className={styles.avatar}>{(user?.username ?? "?").charAt(0)}</span>
            <span className={styles.name}>{user ? user.username : "User"}</span>
            <SvgIcon name="expandMore" size={18}/>
          </>
        </Button>)
      :
        <div className={styles.buttons}>
          <Button variant="text" click={toggleLoginBox}>{"Log in"}</Button>
          <Button variant="filled" click={toggleRegisterBox}>{"Sign up"}</Button>
        </div>
      }
      {menuVisible &&
        createPortal(
          <UserButtonMenu closeCallback={toggleMenu}/>,
          document.body
        )
      }
      {loginBoxVisible && 
        <Popup title="Log in" closeCallback={toggleLoginBox}><LoginBox/></Popup>
      }
      {registerBoxVisible && 
        <Popup title="Create account" closeCallback={toggleRegisterBox}><RegisterBox/></Popup>
      }
    </div>
  );
}