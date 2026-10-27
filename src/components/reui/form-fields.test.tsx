// @vitest-environment jsdom
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { optionalNitInputSchema } from "@/core/company/nit";
import { AutoTextareaField, ChipListField, NitField, TextField } from "./form-fields";

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

  it("stops adding chips at the item limit of the schema", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("Etiquetas");
    for (const tag of ["a", "b", "c"]) {
      await userEvent.type(input, `${tag}{Enter}`);
    }
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar a Etiquetas" })).toBeDisabled();
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
