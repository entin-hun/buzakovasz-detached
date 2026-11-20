// A failed request must never be mistaken for a successfully empty table.
export function requireQueryData<T>(result: { data: T | null; error: unknown }): T {
  if (result.error || result.data === null) {
    throw new Error("Az adatok jelenleg nem érhetők el. Kérjük, próbáld újra később.");
  }
  return result.data;
}