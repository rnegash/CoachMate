"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ from }: { from: string }) {
  const [error, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="flex w-full max-w-xs flex-col gap-3">
      <input type="hidden" name="from" value={from} />
      <label htmlFor="password" className="text-sm font-medium">
        Passwort
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        className="rounded border border-zinc-300 px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        Weiter
      </button>
    </form>
  );
}
