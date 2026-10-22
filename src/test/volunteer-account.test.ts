import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), from: vi.fn(),
  update: vi.fn(), eq: vi.fn(), select: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { resetPasswordForEmail: api.resetPasswordForEmail, updateUser: api.updateUser },
  from: api.from,
} }));
import { requestPasswordReset, saveRecoveryPassword, saveVolunteerProfile, cancelVolunteerCommitment } from "@/lib/volunteer-account";

beforeEach(() => {
  vi.clearAllMocks();
  const chain = { update: api.update, eq: api.eq, select: api.select };
  api.from.mockReturnValue(chain);
  api.update.mockReturnValue(chain);
  api.eq.mockReturnValue(chain);
  api.select.mockResolvedValue({ data: [{ id: "entry" }], error: null });
  api.resetPasswordForEmail.mockResolvedValue({ error: null });
  api.updateUser.mockResolvedValue({ error: null });
});

describe("Volunteer self-service rules", () => {
  it("sends the email recovery link to the public new-password page", async () => {
    await requestPasswordReset(" volunteer@example.com ");
    expect(api.resetPasswordForEmail).toHaveBeenCalledWith("volunteer@example.com", { redirectTo: `${window.location.origin}/reset-password` });
  });
  it("sets a recovery password without requesting the forgotten current password", async () => {
    await saveRecoveryPassword("new-secure-password");
    expect(api.updateUser).toHaveBeenCalledWith({ password: "new-secure-password" });
  });
  it("updates the phone and names only on the signed-in volunteer's profile", async () => {
    await saveVolunteerProfile("own-user", { vezeteknev: " Kovács ", keresztnev: " Anna ", telefonszam: " +36 20 123 4567 " });
    expect(api.from).toHaveBeenCalledWith("profiles");
    expect(api.update).toHaveBeenCalledWith({ vezeteknev: "Kovács", keresztnev: "Anna", telefonszam: "+36 20 123 4567" });
    expect(api.eq).toHaveBeenCalledWith("user_id", "own-user");
  });
  it("cancels only the own commitment by deactivation, preserving history", async () => {
    await cancelVolunteerCommitment("own-user", "recurring-commitment");
    expect(api.from.mock.calls).toEqual([["rescue_commitments"]]);
    expect(api.update).toHaveBeenCalledWith({ aktiv: false });
    expect(api.eq.mock.calls).toEqual([["id", "recurring-commitment"], ["user_id", "own-user"]]);
  });
  it("does not report success when no own commitment was changed", async () => {
    api.select.mockResolvedValue({ data: [], error: null });
    await expect(cancelVolunteerCommitment("own-user", "other-commitment")).rejects.toThrow();
  });
});