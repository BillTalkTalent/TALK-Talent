import FoundersNav from "./founders-nav";

export default function FoundersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <FoundersNav />
      {children}
    </div>
  );
}
