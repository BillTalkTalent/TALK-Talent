import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage() {
  const supabase = await createClient();

  const { data: channels } = await supabase
    .from("chat_channels")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (channels && channels.length > 0) {
    redirect(`/chat/${channels[0].id}`);
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <p className="text-muted-foreground">No chat channels available.</p>
    </div>
  );
}
