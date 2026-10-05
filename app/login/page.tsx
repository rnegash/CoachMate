import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { from } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold">CoachMate</h1>
      <LoginForm from={typeof from === "string" ? from : "/"} />
    </main>
  );
}
