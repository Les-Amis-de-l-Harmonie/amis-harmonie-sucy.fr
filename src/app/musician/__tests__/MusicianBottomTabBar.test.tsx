import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MusicianBottomTabBar } from "../MusicianBottomTabBar";
import { MUSICIAN_NAV_ITEMS } from "../musician-nav-items";

describe("Navigation mobile du musicien", () => {
  it("déplace Accueil à la place de Profil sans doublon", () => {
    render(<MusicianBottomTabBar pathname="/musician/" firstName="Jean" lastName="Dupont" />);

    const navigation = screen.getByRole("navigation", { name: "Navigation mobile" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Prestations",
      "Accueil",
      "Idées",
    ]);
    const home = within(navigation).getByRole("link", { name: "Accueil" });
    expect(home).toHaveAttribute("href", "/musician/");
    expect(home).toHaveAttribute("aria-current", "page");
    expect(home.querySelector("svg")).toHaveClass("lucide-house");
  });

  it("garde le profil accessible et actif dans Plus sans activer Accueil", async () => {
    const user = userEvent.setup();
    render(
      <MusicianBottomTabBar pathname="/musician/profile" firstName="Jean" lastName="Dupont" />
    );

    expect(screen.getByRole("link", { name: "Accueil" })).not.toHaveAttribute("aria-current");
    const more = screen.getByRole("button", { name: "Plus" });
    expect(more).toHaveClass("ring-2");
    await user.click(more);
    const profile = screen.getByRole("link", { name: "Mon profil" });
    expect(profile).toHaveAttribute("href", "/musician/profile");
    expect(profile).toHaveAttribute("aria-current", "page");
  });

  it("conserve les entrées et leur ordre sur desktop", () => {
    expect(MUSICIAN_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Accueil",
      "Mes prestations",
      "Mon profil",
      "Boîte à idée",
      "Assurance",
      "Trombinoscope",
      "Adhésion",
      "Partitions",
    ]);
  });
});
