import { Suspense } from "react";
import SearchChat from "./search-chat";

export default function SearchPage() {
  return (
    <Suspense>
      <SearchChat />
    </Suspense>
  );
}
