"use client";

import { CopyablePassword } from "./CopyablePassword";
import { Button } from "./Button";

export interface TempPasswordRevealProps {
  password: string;
  message?: string;
  onDone: () => void;
  "data-testid"?: string;
}

export function TempPasswordReveal({
  password,
  message = "Entity created successfully. Save the temporary password below — it will not be shown again.",
  onDone,
  "data-testid": testId,
}: TempPasswordRevealProps) {
  return (
    <div>
      <p className="text-sm mb-3 text-muted-alt">{message}</p>
      <CopyablePassword password={password} data-testid={testId} />
      <Button variant="accent" size="md" className="mt-4 w-full" onClick={onDone}>Done</Button>
    </div>
  );
}
