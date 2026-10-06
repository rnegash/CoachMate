import { TabBar } from "@/components/TabBar";

export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-space-4 px-space-4 py-space-6">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
