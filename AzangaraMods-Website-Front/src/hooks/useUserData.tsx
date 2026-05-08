"use client";

import { useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function useUserData() {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useUserData must be used within a UserContextProvider");
  return context;
}
