/** Up to two uppercase letters that stand for a company in an avatar; "?" when the name is empty. */
export function companyInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
  return letters || "?";
}
