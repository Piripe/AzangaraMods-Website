"use client";

import { useState } from "react";
import Button from "./kit/button";
import { createPortal } from "react-dom";
import UserButtonMenu from "./userButtonMenu";
import Popup from "./kit/popup";
import { LoginBox } from "./loginBox";
import useUserData from "../hooks/useUserData";
import { RegisterBox } from "./registerBox";

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

  const {user} = useUserData();

  return (

    <div>
      {user ?
        (<Button click={toggleMenu}>{user.username}</Button>)
      :
        <>
          <Button click={toggleLoginBox}>{"Login"}</Button>
          <Button click={toggleRegisterBox}>{"Register"}</Button>
        </>
      }
      {menuVisible &&
        createPortal(
          <UserButtonMenu closeCallback={toggleMenu}/>,
          document.body
        )
      }
      {loginBoxVisible && 
        <Popup title="Login box" closeCallback={toggleLoginBox}><LoginBox/></Popup>
      }
      {registerBoxVisible && 
        <Popup title="Register box" closeCallback={toggleRegisterBox}><RegisterBox/></Popup>
      }
    </div>
  );
}