"use client";

import { setActiveMinistry } from "@/app/dashboard/actions";

export function MinistrySwitcher({
  options,
  currentId,
}: {
  options: { id: string; name: string }[];
  currentId: string;
}) {
  if (options.length <= 1) return null;

  return (
    <form action={setActiveMinistry} className="mb-4">
      <label className="mb-1 block text-xs font-medium text-neutral-400">
        Ministério ativo
      </label>
      <select
        name="ministryId"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </form>
  );
}
