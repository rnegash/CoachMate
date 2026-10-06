import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { from } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-space-6 p-space-6">
      <h1 className="text-display-lg">CoachMate</h1>
      <LoginForm from={typeof from === "string" ? from : "/"} />
    </main>
  );
}
