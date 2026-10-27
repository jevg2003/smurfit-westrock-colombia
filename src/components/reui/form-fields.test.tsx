// @vitest-environment jsdom
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { optionalNitInputSchema } from "@/core/company/nit";
import { AutoTextareaField, ChipListField, NitField, NumberField, TextField } from "./form-fields";

afterEach(cleanup);

const schema = z.object({
  name: z.string().trim().min(1, "Escriba el nombre.").max(20, "Muy largo."),
  city: z.string().trim().max(10),
  nit: optionalNitInputSchema,
  about: z.string().trim().max(50),
  tags: z.array(z.string()).max(3, "Hasta 3."),
});

function Harness({ onSubmit = () => {} }: { onSubmit?: (value: z.infer<typeof schema>) => void }) {
  const form = useForm({
    defaultValues: { name: "", city: "", nit: "", about: "", tags: [] as string[] },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    onSubmit: ({ value }) => onSubmit(value),
  });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">{(field) => <TextField field={field} label="Nombre" />}</form.Field>
      <form.Field name="city">{(field) => <TextField field={field} label="Ciudad" />}</form.Field>
      <form.Field name="nit">{(field) => <NitField field={field} label="NIT" />}</form.Field>
      <form.Field name="about">{(field) => <AutoTextareaField field={field} label="Acerca" />}</form.Field>
      <form.Field name="tags">{(field) => <ChipListField field={field} label="Etiquetas" />}</form.Field>
      <button type="submit">Enviar</button>
    </form>
  );
}

describe("schema-driven fields", () => {
  it("marks a required field and an optional one from the schema", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("Ciudad")).not.toHaveAttribute("aria-required");
    expect(screen.getByText("Ciudad").parentElement).toHaveTextContent("(opcional)");
    expect(screen.getByText("Nombre").parentElement).not.toHaveTextContent("(opcional)");
  });

  it("takes maxLength from the schema", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("maxlength", "20");
    expect(screen.getByLabelText("Ciudad")).toHaveAttribute("maxlength", "10");
  });

  it("shows the character counter of a textarea with the limit of the schema", async () => {
    render(<Harness />);
    expect(screen.getByText("0/50")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Acerca"), "hola");
    expect(screen.getByText("4/50")).toBeInTheDocument();
    expect(screen.getByLabelText("Acerca")).toHaveAttribute("maxlength", "50");
  });

  it("reports the message of the schema when a required field is empty", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("Escriba el nombre.")).toBeInTheDocument();
  });
});

describe("NitField", () => {
  it("ignores letters and groups the digits with dots", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("NIT"), "abc900x123456");
    expect(screen.getByLabelText("NIT")).toHaveValue("900.123.456");
  });

  it("shows the computed verification digit as a read-only suffix", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("NIT"), "900123456");
    expect(screen.getByText("-8")).toBeInTheDocument();
  });

  it("shows no suffix before the number is long enough", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("NIT"), "90");
    expect(screen.queryByText(/^-\d$/)).not.toBeInTheDocument();
  });

  it("normalizes a pasted NIT with dots and a matching verification digit", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Nombre"), "Acme");
    await userEvent.click(screen.getByLabelText("NIT"));
    await userEvent.paste("900.123.456-8");
    expect(screen.getByLabelText("NIT")).toHaveValue("900.123.456");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it("reports a pasted verification digit that does not match", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Nombre"), "Acme");
    await userEvent.click(screen.getByLabelText("NIT"));
    await userEvent.paste("900.123.456-7");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText(/no coincide/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("drops a pasted verification digit as soon as the user edits the number", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByLabelText("NIT"));
    await userEvent.paste("900.123.456-7");
    await userEvent.type(screen.getByLabelText("NIT"), "{Backspace}");
    await userEvent.type(screen.getByLabelText("NIT"), "6");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.queryByText(/no coincide/)).not.toBeInTheDocument();
  });

  it("limits the digits to ten", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("NIT"), "123456789012345");
    expect(screen.getByLabelText("NIT")).toHaveValue("1.234.567.890");
  });
});

describe("NumberField", () => {
  function NumberHarness({ onSubmit }: { onSubmit: (value: { pct: number | undefined; days: number | undefined }) => void }) {
    const schema = z.object({ pct: z.number("Escriba un número.").positive().max(50, "Muy alto."), days: z.int().positive().max(730) });
    const form = useForm({
      defaultValues: { pct: undefined as number | undefined, days: undefined as number | undefined },
      validationLogic: revalidateLogic(),
      validators: { onDynamic: schema },
      onSubmit: ({ value }) => onSubmit(value),
    });
    return (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="pct">{(field) => <NumberField field={field} label="Porcentaje" unit="%" />}</form.Field>
        <form.Field name="days">{(field) => <NumberField field={field} label="Días" />}</form.Field>
        <button type="submit">Enviar</button>
      </form>
    );
  }

  it("accepts a decimal comma and stores a number", async () => {
    const onSubmit = vi.fn();
    render(<NumberHarness onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Porcentaje"), "1,5");
    await userEvent.type(screen.getByLabelText("Días"), "45");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ pct: 1.5, days: 45 }));
  });

  it("does not allow decimals where the schema asks for whole numbers", async () => {
    render(<NumberHarness onSubmit={() => {}} />);
    await userEvent.type(screen.getByLabelText("Días"), "4,5");
    expect(screen.getByLabelText("Días")).toHaveValue("45");
  });

  it("shows the message of the schema for a value out of range or empty", async () => {
    render(<NumberHarness onSubmit={() => {}} />);
    await userEvent.type(screen.getByLabelText("Porcentaje"), "80");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("Muy alto.")).toBeInTheDocument();
  });
});

describe("ChipListField", () => {
  const tagSchema = z.object({ tags: z.array(z.string().max(8, "Muy larga.")).max(3, "Hasta 3.") });

  function ChipHarness({ initial = [], suggestions }: { initial?: string[]; suggestions?: string[] }) {
    const form = useForm({
      defaultValues: { tags: initial },
      validationLogic: revalidateLogic(),
      validators: { onDynamic: tagSchema },
    });
    return (
      <form.Field name="tags">
        {(field) => <ChipListField field={field} label="Etiquetas" placeholder="Escriba" suggestions={suggestions} />}
      </form.Field>
    );
  }

  const chips = () => screen.queryAllByRole("button", { name: /^Quitar /, hidden: true }).map((button) => button.getAttribute("aria-label"));

  it("adds the typed term with Enter", async () => {
    render(<ChipHarness />);
    await userEvent.type(screen.getByLabelText("Etiquetas"), "gas{Enter}");
    expect(chips()).toEqual(["Quitar gas"]);
    expect(screen.getByLabelText("Etiquetas")).toHaveValue("");
  });

  it("splits a pasted list on commas and new lines", async () => {
    render(<ChipHarness />);
    await userEvent.click(screen.getByLabelText("Etiquetas"));
    await userEvent.paste("uno, dos\ntres");
    expect(chips()).toEqual(["Quitar uno", "Quitar dos", "Quitar tres"]);
  });

  it("ignores a duplicate regardless of case", async () => {
    render(<ChipHarness initial={["Gas"]} />);
    await userEvent.type(screen.getByLabelText("Etiquetas"), "gAS{Enter}");
    expect(chips()).toEqual(["Quitar Gas"]);
  });

  it("blocks adding past the item limit of the schema and shows the count", async () => {
    render(<ChipHarness initial={["a", "b", "c"]} />);
    expect(screen.getByText("3/3")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Etiquetas"), "d{Enter}");
    expect(chips()).toHaveLength(3);
    expect(await screen.findByText("Hasta 3.")).toBeInTheDocument();
  });

  it("rejects a term longer than the schema allows with the schema message", async () => {
    render(<ChipHarness />);
    await userEvent.type(screen.getByLabelText("Etiquetas"), "demasiado largo{Enter}");
    expect(chips()).toHaveLength(0);
    expect(await screen.findByText("Muy larga.")).toBeInTheDocument();
  });

  it("removes the last chip with Backspace on an empty input", async () => {
    render(<ChipHarness initial={["uno", "dos"]} />);
    await userEvent.click(screen.getByLabelText("Etiquetas"));
    await userEvent.keyboard("{Backspace}");
    expect(chips()).toEqual(["Quitar uno"]);
  });

  it("offers suggestions that can be picked", async () => {
    render(<ChipHarness suggestions={["Energía", "Gas"]} />);
    await userEvent.click(screen.getByLabelText("Etiquetas"));
    await userEvent.click(await screen.findByRole("option", { name: "Gas" }));
    expect(chips()).toEqual(["Quitar Gas"]);
  });
});
