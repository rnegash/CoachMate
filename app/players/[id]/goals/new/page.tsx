import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { GoalDraftForm } from "@/components/GoalDraftForm";
import { getPlayer } from "@/lib/players";

export default async function AddGoalPage({ params }: PageProps<"/players/[id]/goals/new">) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-space-6 px-space-4 py-space-6">
      <AppHeader
        back={{ href: `/players/${encodeURIComponent(id)}`, label: `Back to ${player.name}` }}
        title="Add goal"
        subtitle={player.name}
      />
      <GoalDraftForm playerId={player.id} />
    </main>
  );
}
