"use client";

import { Suspense } from "react";
import JoinInvitePage from "./join-client";

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInvitePage />
    </Suspense>
  );
}
