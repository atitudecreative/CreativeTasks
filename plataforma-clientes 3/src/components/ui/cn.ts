/** Junta classes ignorando falsy. Deliberadamente minúsculo — não vale
 *  puxar clsx/tailwind-merge pra isso; os componentes daqui colocam as
 *  classes do chamador SEMPRE por último, então sobrescrita já funciona. */
export function cn(...parts: Array<string | false | null | undefined | 0 | 0n>): string {
  return parts.filter(Boolean).join(" ");
}
