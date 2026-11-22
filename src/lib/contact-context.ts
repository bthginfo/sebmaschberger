/** Explicit, editable context carried from a configurator into the existing contact workflow. */
export function readContactContext(search: string) {
  const params = new URLSearchParams(search);
  return {
    subject: (params.get("service") ?? params.get("thema") ?? "").slice(0, 200),
    message: (params.get("message") ?? "").slice(0, 12000),
  };
}
