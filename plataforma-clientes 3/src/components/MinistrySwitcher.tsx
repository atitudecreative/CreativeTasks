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
    <form action={setActiveMinistry} className="mb-5">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-walnut-400">
        Ministério ativo
      </label>
      <select
        name="ministryId"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded-lg border border-walnut-700 bg-walnut-800 px-2 py-1.5 text-sm text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
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
