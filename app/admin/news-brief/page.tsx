import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper } from "lucide-react";
import NewsBriefComposer from "./news-brief-composer";

export default async function NewsBriefPage() {
  const admin = createAdminClient();
  const { data: categories } = await admin
    .from("forum_categories")
    .select("id, name, slug")
    .order("sort_order");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <Newspaper className="size-4.5 text-[#E8503A]" />
          TA News Brief
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Research the last 24 hours of Talent Acquisition news, then edit and post it to the forum
          yourself. Nothing is posted automatically — you review every draft first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Draft a Post</CardTitle>
        </CardHeader>
        <CardContent>
          <NewsBriefComposer categories={categories ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
