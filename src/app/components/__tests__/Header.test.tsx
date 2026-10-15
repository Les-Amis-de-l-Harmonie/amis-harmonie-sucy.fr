import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../Header";

vi.mock("../SocialIcons", () => ({
  SocialIcons: () => <div>Social Icons</div>,
}));

vi.mock("../ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Theme Toggle</button>,
}));

describe("Header", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ musician: false, admin: false }),
      })
    );
    document.body.style.overflow = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders logo and primary navigation links", () => {
    render(<Header />);

    const logos = screen.getAllByRole("img", { name: "Les Amis de l'Harmonie de Sucy" });
    expect(logos.length).toBeGreaterThan(0);

    expect(screen.getAllByRole("link", { name: "Thé Dansant" })[0]).toHaveAttribute(
      "href",
      "/sucy-dansant-2027"
    );
    expect(screen.getAllByRole("link", { name: "Adhésion" })[0]).toHaveAttribute(
      "href",
      "/adhesion"
    );
  });

  it("toggles mobile menu and closes it on Escape", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const mobileToggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    await user.click(mobileToggle);

    expect(mobileToggle).toHaveAttribute("aria-expanded", "true");
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("opens dropdown on hover and toggles mobile accordion", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const eventLinks = screen.getAllByRole("link", { name: "Évènements" });
    const desktopNavLink = eventLinks[0];
    const navItemContainer = desktopNavLink.closest("div");

    expect(navItemContainer).toBeTruthy();
    if (!navItemContainer) {
      throw new Error("Expected desktop nav container to exist");
    }

    const dropdown = navItemContainer.querySelector("div.absolute");
    expect(dropdown).toBeTruthy();
    if (!dropdown) {
      throw new Error("Expected dropdown container to exist");
    }

    expect(dropdown).toHaveClass("opacity-0");
    fireEvent.mouseEnter(navItemContainer);
    expect(dropdown).toHaveClass("opacity-100");

    const mobileToggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    await user.click(mobileToggle);

    const accordionButton = screen.getAllByRole("button", { name: "Évènements" })[0];
    expect(accordionButton).toHaveAttribute("aria-expanded", "false");

    await user.click(accordionButton);
    expect(accordionButton).toHaveAttribute("aria-expanded", "true");

    const billetterieLink = screen.getAllByRole("link", { name: "Billetterie" })[0];
    expect(billetterieLink).toHaveAttribute("href", "/billetterie");
  });

  it("affiche les éditions du Thé Dansant dans le menu déroulant dans l'ordre prévu", () => {
    render(<Header />);

    const desktopNavLink = screen.getAllByRole("link", { name: "Thé Dansant" })[0];
    const navItemContainer = desktopNavLink.closest("div");
    expect(navItemContainer).toBeTruthy();
    if (!navItemContainer) {
      throw new Error("Expected desktop nav container to exist");
    }

    fireEvent.mouseEnter(navItemContainer);

    const dropdown = navItemContainer.querySelector("div.absolute");
    expect(dropdown).toBeTruthy();
    if (!dropdown) {
      throw new Error("Expected dropdown container to exist");
    }

    const links = Array.from(dropdown.querySelectorAll("a"));
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Sucy Dansant 2027", "/sucy-dansant-2027"],
      ["Thé Dansant 2026", "/the-dansant-2026"],
    ]);
  });

  it("expose les deux éditions du Thé Dansant dans l'accordéon mobile", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    const accordionButton = screen.getAllByRole("button", { name: "Thé Dansant" })[0];
    await user.click(accordionButton);

    const accordion = accordionButton.parentElement;
    expect(accordion).toBeTruthy();
    if (!accordion) {
      throw new Error("Expected mobile accordion to exist");
    }

    const links = Array.from(accordion.querySelectorAll("a"));
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Sucy Dansant 2027", "/sucy-dansant-2027"],
      ["Thé Dansant 2026", "/the-dansant-2026"],
    ]);
  });
});
