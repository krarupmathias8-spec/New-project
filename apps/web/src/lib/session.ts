import { getServerSession } from "next-auth/next";

import { authConfig } from "@/auth";

export function getSession() {
  return getServerSession(authConfig);
}

