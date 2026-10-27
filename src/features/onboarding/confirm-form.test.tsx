// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMPETITORS_MAX } from "@/core/company/fields";
import { formatNitWithDv } from "@/core/company/nit";
import { buildConfirmValues, type ConfirmValues } from "@/core/onboarding/confirm";
import { ConfirmForm } from "./confirm-form";

afterEach(cleanup);

function setup(competitors: ConfirmValues["competitors"] = []) {
  const onSubmit = vi.fn();
  const defaultValues = { ...buildConfirmValues({ name: "Acme SAS" }, {}), competitors };
  render(<ConfirmForm defaultValues={defaultValues} submitLabel="Crear empresa" onSubmit={onSubmit} />);
  return { onSubmit };
}

const submitted = async (onSubmit: ReturnType<typeof vi.fn>): Promise<ConfirmValues> => {
  await userEvent.click(screen.getByRole("button", { name: "Crear empresa" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  return onSubmit.mock.calls[0][0] as ConfirmValues;
};

const openMenu = async (name: string, action: string) => {
  await userEvent.click(screen.getByRole("button", { name: `Acciones de ${name}` }));
  await userEvent.click(await screen.findByRole("menuitem", { name: action }));
};

describe("ConfirmForm competitors", () => {
  it("lists each competitor with its formatted NIT, or says it has none", () => {
    setup([
      { name: "Alpina", nit: "860025900" },
      { name: "Colanta", nit: "" },
    ]);
    const list = screen.getByRole("list", { name: "Competidores" });
    const [alpina, colanta] = within(list).getAllByRole("listitem");
    expect(within(alpina).getByText("Alpina")).toBeInTheDocument();
    expect(within(alpina).getByText(formatNitWithDv("860025900"))).toBeInTheDocument();
    expect(within(colanta).getByText("Sin NIT")).toBeInTheDocument();
    expect(screen.getByText("2 competidores")).toBeInTheDocument();
  });

  it("shows an empty state when there are none", () => {
    setup();
    expect(screen.getByText("Aún no hay competidores")).toBeInTheDocument();
  });

  it("adds a competitor from the dialog, only when it is valid", async () => {
    const { onSubmit } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Agregar competidor" }));
    const dialog = await screen.findByRole("dialog");
    const save = within(dialog).getByRole("button", { name: "Agregar" });
    expect(save).toBeDisabled();
    await userEvent.type(within(dialog).getByRole("textbox", { name: /Nombre/ }), "Colanta");
    await userEvent.type(within(dialog).getByRole("textbox", { name: /NIT/ }), "890904478");
    await waitFor(() => expect(save).toBeEnabled());
    await userEvent.click(save);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(screen.getByRole("list", { name: "Competidores" })).getByText("Colanta")).toBeInTheDocument();
    const values = await submitted(onSubmit);
    expect(values.competitors).toEqual([{ name: "Colanta", nit: "890904478" }]);
    expect(values.newsGroups.company).toContain("Colanta");
  });

  it("keeps the save button disabled for an invalid NIT", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Agregar competidor" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByRole("textbox", { name: /Nombre/ }), "Colanta");
    await userEvent.type(within(dialog).getByRole("textbox", { name: /NIT/ }), "12");
    expect(within(dialog).getByRole("button", { name: "Agregar" })).toBeDisabled();
  });

  it("edits a competitor with the dialog prefilled", async () => {
    const { onSubmit } = setup([{ name: "Alpina", nit: "" }]);
    await openMenu("Alpina", "Editar");
    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByRole("textbox", { name: /Nombre/ });
    expect(name).toHaveValue("Alpina");
    await userEvent.clear(name);
    await userEvent.type(name, "Alpina SA");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const values = await submitted(onSubmit);
    expect(values.competitors).toEqual([{ name: "Alpina SA", nit: "" }]);
  });

  it("removes a competitor", async () => {
    const { onSubmit } = setup([
      { name: "Alpina", nit: "" },
      { name: "Colanta", nit: "" },
    ]);
    await openMenu("Alpina", "Quitar");
    expect(within(screen.getByRole("list", { name: "Competidores" })).queryByText("Alpina")).not.toBeInTheDocument();
    const values = await submitted(onSubmit);
    expect(values.competitors).toEqual([{ name: "Colanta", nit: "" }]);
  });

  it("disables adding when the schema limit is reached", () => {
    setup(Array.from({ length: COMPETITORS_MAX }, (_, index) => ({ name: `Rival ${index + 1}`, nit: "" })));
    expect(screen.getByRole("button", { name: "Agregar competidor" })).toBeDisabled();
  });
});

describe("ConfirmForm sections", () => {
  it("marks sections required or optional from the schema", () => {
    setup();
    const badgeOf = (title: string) => within(screen.getByRole("region", { name: title })).getByTestId("section-badge");
    expect(badgeOf("Empresa")).toHaveTextContent("Obligatorio");
    expect(badgeOf("Competidores")).toHaveTextContent("Opcional");
    expect(badgeOf("Objetivos")).toHaveTextContent("Opcional");
  });
});
