import { JSX } from "react";

export default function TextBox(
  {
    onChange=()=>{}, 
  placeholder, 
  password, 
  newPassword,
  usernameEntry}:{
    onChange?:(e:string)=>void, placeholder?:string|undefined, password?:boolean|undefined,newPassword?:boolean|undefined, usernameEntry?:boolean|undefined}) {

  return (
    <input type={password ? "password" : "text"} autoComplete={newPassword ? "new-password" : undefined} name={password ? "password" :  usernameEntry ? "username" : undefined} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)}/>
  );
}