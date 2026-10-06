import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";

export default function CoachPage() {
  return (
    <>
      <AppHeader title="Coach" />
      <EmptyState
        headline="Assistant Coach isn't available yet"
        support="The coaching chat will open here."
      />
    </>
  );
}
