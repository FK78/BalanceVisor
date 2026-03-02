"use client";

import dynamic from "next/dynamic";

const ChatPanel = dynamic(
  () => import("@/components/ChatPanel").then((m) => m.ChatPanel),
  { ssr: false },
);

export function ChatPanelWrapper() {
  return <ChatPanel />;
}
