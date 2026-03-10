import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AvatarUploader } from "../AvatarUploader";

vi.mock("@/app/components/CircularCropper", () => ({
  CircularCropper: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: (blob: Blob) => void }) =>
    isOpen ? (
      <button type="button" onClick={() => onConfirm(new Blob(["avatar"], { type: "image/jpeg" }))}>
        Confirmer recadrage
      </button>
    ) : null,
}));

describe("AvatarUploader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders current avatar and instructions", () => {
    render(
      <AvatarUploader
        avatar="/images/avatar.jpg"
        onUpload={vi.fn()}
        uploadEndpoint="/api/upload/avatar"
      />
    );

    expect(screen.getByRole("img", { name: "Avatar" })).toHaveAttribute(
      "src",
      "/images/avatar.jpg"
    );
    expect(screen.getByText("Photo de profil")).toBeInTheDocument();
    expect(screen.getByText("Cliquez pour changer")).toBeInTheDocument();
  });

  it("calls onError when selected file type is not allowed", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onError = vi.fn();

    const { container } = render(
      <AvatarUploader
        onUpload={vi.fn()}
        uploadEndpoint="/api/upload/avatar"
        onError={onError}
        allowedTypes={["image/png"]}
      />
    );

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).toBeTruthy();

    if (!input) {
      throw new Error("Expected file input to exist");
    }

    const invalidFile = new File(["bad"], "avatar.jpg", { type: "image/jpeg" });
    await user.upload(input, invalidFile);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("Format non supporté. Formats acceptés : PNG");
  });

  it("uploads cropped image and calls callbacks", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const onSuccess = vi.fn();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://cdn.example.com/avatar.jpg" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(
      <AvatarUploader
        onUpload={onUpload}
        uploadEndpoint="/api/upload/avatar"
        onSuccess={onSuccess}
      />
    );

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).toBeTruthy();

    if (!input) {
      throw new Error("Expected file input to exist");
    }

    const validFile = new File(["avatar"], "avatar.png", { type: "image/png" });
    await user.upload(input, validFile);

    const confirmButton = await screen.findByRole("button", { name: "Confirmer recadrage" });
    await user.click(confirmButton);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/upload/avatar",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) })
    );
    expect(onUpload).toHaveBeenCalledWith("https://cdn.example.com/avatar.jpg");
    expect(onSuccess).toHaveBeenCalledWith("Photo de profil mise à jour");
  });
});
