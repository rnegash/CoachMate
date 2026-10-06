import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";

export default function AttendancePage() {
  return (
    <>
      <AppHeader title="Attendance" />
      <EmptyState
        headline="No sessions yet"
        support="Training sessions from the attendance Sheet will be listed here."
      />
    </>
  );
}
