import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstrumentEditor } from "../InstrumentEditor";

describe("InstrumentEditor", () => {
  it("renders instrument fields and values", () => {
    render(
      <InstrumentEditor
        instruments={[
          {
            instrument_name: "Clarinette",
            start_date: "2020-09-01",
            level: "Cycle 3",
          },
        ]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Instruments")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Clarinette")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2020-09-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cycle 3")).toBeInTheDocument();
  });

  it("adds a new instrument when add button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <InstrumentEditor
        instruments={[{ instrument_name: "Flute", start_date: "", level: "" }]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Ajouter un instrument" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { instrument_name: "Flute", start_date: "", level: "" },
      { instrument_name: "", start_date: "", level: "" },
    ]);
  });

  it("updates instrument fields and propagates changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { container } = render(
      <InstrumentEditor
        instruments={[{ instrument_name: "", start_date: "", level: "" }]}
        onChange={onChange}
      />
    );

    const instrumentInput = screen.getByPlaceholderText("Ex: Clarinette");
    await user.type(instrumentInput, "T");
    expect(onChange).toHaveBeenCalledWith([{ instrument_name: "T", start_date: "", level: "" }]);

    onChange.mockClear();

    const dateInput = container.querySelector<HTMLInputElement>('input[type="date"]');
    expect(dateInput).toBeTruthy();
    if (!dateInput) {
      throw new Error("Expected date input to exist");
    }

    fireEvent.change(dateInput, { target: { value: "2021-10-15" } });
    expect(onChange).toHaveBeenCalledWith([
      { instrument_name: "", start_date: "2021-10-15", level: "" },
    ]);

    onChange.mockClear();

    const levelInput = screen.getByPlaceholderText("Ex: Cycle 3");
    await user.type(levelInput, "C");
    expect(onChange).toHaveBeenCalledWith([{ instrument_name: "", start_date: "", level: "C" }]);
  });

  it("removes instrument when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <InstrumentEditor
        instruments={[
          { instrument_name: "Clarinette", start_date: "", level: "" },
          { instrument_name: "Saxophone", start_date: "", level: "" },
        ]}
        onChange={onChange}
      />
    );

    const addButton = screen.getByRole("button", { name: "Ajouter un instrument" });
    const removeButton = screen.getAllByRole("button").find((button) => button !== addButton);

    expect(removeButton).toBeTruthy();
    if (!removeButton) {
      throw new Error("Expected a remove button to exist");
    }

    await user.click(removeButton);

    expect(onChange).toHaveBeenCalledWith([
      { instrument_name: "Saxophone", start_date: "", level: "" },
    ]);
  });
});
