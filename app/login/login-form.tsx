"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { login } from "./actions";

export function LoginForm({ from }: { from: string }) {
  const [error, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="flex w-full max-w-xs flex-col gap-space-2">
      <input type="hidden" name="from" value={from} />
      <label htmlFor="password" className="text-label">
        Team password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "password-error" : undefined}
        className={`h-control-md rounded-md border-[1.5px] bg-surface-raised px-space-3 text-body ${
          error ? "border-danger" : "border-border-strong"
        }`}
      />
      {error && (
        <p id="password-error" className="text-caption text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={pending} className="mt-space-2 min-h-control-lg">
        Continue
      </Button>
    </form>
  );
}
