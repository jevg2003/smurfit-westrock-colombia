// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OnboardingDraft } from "@/core/onboarding/draft";
import type { Answer, OnboardingResponse, Question } from "@/core/onboarding/schemas";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { profileToPatch, profileToSeed } from "@/core/onboarding/confirm";
import { useCompaniesStore } from "@/stores/companies.store";
import { useHydrationStore } from "@/stores/hydration.store";
import { useOnboardingDraftStore } from "@/stores/onboarding-draft.store";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const requestStep = vi.fn();
vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  requestOnboardingStep: (...args: unknown[]) => requestStep(...args),
}));

import { OnboardingRequestError } from "./api";
import { OnboardingFlow } from "./onboarding-flow";
import { useOnboardingFlow } from "./use-onboarding-flow";

const sectorQuestion: Question = { id: "ai-empresa-1", block: "empresa", kind: "single", prompt: "¿En qué sector trabaja?", why: "Define las búsquedas.", options: ["Alimentos", "Energía"], allowOther: true };
const clientsQuestion: Question = { id: "ai-empresa-2", block: "empresa", kind: "text", prompt: "¿Quiénes son sus clientes?", why: "Define el mercado.", maxChars: 300 };
const goalQuestion: Question = { id: "ai-objetivos-1", block: "objetivos", kind: "multi", prompt: "¿Qué le preocupa?", why: "Agrega términos.", options: ["Tipo de cambio", "Energía"], allowOther: true };

const reply = (nextQuestion: Question | null, profilePatch: OnboardingResponse["profilePatch"] = {}): OnboardingResponse => ({ nextQuestion, profilePatch, source: "ai" });
const answerTo = (question: Question, patch: Partial<Answer> = {}): Answer => ({
  questionId: question.id,
  block: question.block,
  prompt: question.prompt,
  selected: [],
  text: "",
  skipped: false,
  ...patch,
});

const baseDraft = (patch: Partial<OnboardingDraft> = {}): OnboardingDraft => ({
  seed: { name: "Acme SAS" },
  stage: "questions",
  questions: [],
  answers: {},
  cursor: 0,
  blocksDone: { empresa: false, objetivos: false },
  patch: {},
  updatedAt: "2026-10-27T10:00:00.000Z",
  ...patch,
});

function renderFlow(props: { askAboutDraft?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OnboardingFlow askAboutDraft={props.askAboutDraft ?? false} />
    </QueryClientProvider>,
  );
}

describe("OnboardingFlow", () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    requestStep.mockReset();
    window.localStorage.clear();
    useCompaniesStore.setState({ companies: [], activeCompanyId: null });
    useOnboardingDraftStore.setState({ draft: null });
    useHydrationStore.setState({ hasHydrated: true });
  });
  afterEach(cleanup);

  it("starts a draft and shows the seed form at step 1 of 3", async () => {
    renderFlow();
    expect(await screen.findByRole("textbox", { name: /Nombre de la empresa/ })).toBeInTheDocument();
    expect(screen.getByText("Paso 1 de 3")).toBeInTheDocument();
    expect(useOnboardingDraftStore.getState().draft?.stage).toBe("seed");
  });

  it("requires the name and a NIT with enough digits", async () => {
    renderFlow();
    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Escriba el nombre de la empresa.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: /Nombre de la empresa/ }), "Acme SAS");
    await userEvent.type(screen.getByRole("textbox", { name: /NIT/ }), "900");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText(/entre 5 y 10 dígitos/)).toBeInTheDocument();
    expect(requestStep).not.toHaveBeenCalled();
  });

  it("rejects a pasted NIT whose verification digit does not match, and accepts the right one", async () => {
    requestStep.mockResolvedValue(reply(sectorQuestion));
    renderFlow();
    await userEvent.type(await screen.findByRole("textbox", { name: /Nombre de la empresa/ }), "Acme SAS");
    await userEvent.click(screen.getByRole("textbox", { name: "NIT" }));
    await userEvent.paste("900.123.456-7");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText(/no coincide/)).toBeInTheDocument();
    expect(requestStep).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByRole("textbox", { name: "NIT" }));
    await userEvent.paste("900.123.456-8");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByRole("heading", { name: "¿En qué sector trabaja?" });
    expect(useOnboardingDraftStore.getState().draft?.seed?.nit).toBe("900123456");
  });

  it("saves the seed, asks the AI for the first question and shows it", async () => {
    requestStep.mockResolvedValue(reply(sectorQuestion));
    renderFlow();
    await userEvent.type(await screen.findByRole("textbox", { name: /Nombre de la empresa/ }), "Acme SAS");
    await userEvent.type(screen.getByRole("textbox", { name: /NIT/ }), "900123456");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("heading", { name: "¿En qué sector trabaja?" })).toBeInTheDocument();
    expect(screen.getByText(/Define las búsquedas\./)).toBeInTheDocument();
    expect(requestStep.mock.calls[0][0]).toMatchObject({ seed: { name: "Acme SAS", nit: "900123456" }, block: "empresa", answers: [] });
    expect(useOnboardingDraftStore.getState().draft?.seed?.nit).toBe("900123456");
  });

  it("answers a single-choice question, stores it at once and asks for the next one with all answers", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion] }) });
    requestStep.mockResolvedValue(reply(clientsQuestion, { sector: "Alimentos" }));
    renderFlow();

    await userEvent.click(await screen.findByRole("radio", { name: "Alimentos" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("heading", { name: "¿Quiénes son sus clientes?" })).toBeInTheDocument();
    expect(useOnboardingDraftStore.getState().draft?.answers["ai-empresa-1"]).toMatchObject({ selected: ["Alimentos"], skipped: false });
    expect(requestStep.mock.calls[0][0].answers).toHaveLength(1);
    expect(useOnboardingDraftStore.getState().draft?.patch.sector).toBe("Alimentos");
  });

  it("lets the user write another answer with Otra", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion] }) });
    requestStep.mockResolvedValue(reply(clientsQuestion));
    renderFlow();

    await userEvent.click(await screen.findByRole("radio", { name: "Otra" }));
    await userEvent.type(await screen.findByRole("textbox", { name: "Otra respuesta" }), "Cosmética");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await screen.findByRole("heading", { name: "¿Quiénes son sus clientes?" });
    expect(useOnboardingDraftStore.getState().draft?.answers["ai-empresa-1"]).toMatchObject({ selected: [], text: "Cosmética" });
  });

  it("does not continue without an answer, but skips when asked", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion] }) });
    requestStep.mockResolvedValue(reply(clientsQuestion));
    renderFlow();

    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Elija una opción o escriba otra respuesta.")).toBeInTheDocument();
    expect(requestStep).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Saltar" }));
    await screen.findByRole("heading", { name: "¿Quiénes son sus clientes?" });
    expect(useOnboardingDraftStore.getState().draft?.answers["ai-empresa-1"].skipped).toBe(true);
  });

  it("offers Saltar only the first time a question is shown", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion] }) });
    renderFlow();
    expect(await screen.findByRole("button", { name: "Saltar" })).toBeInTheDocument();
  });

  it("hides Saltar when the user comes back to a question that already has an answer", async () => {
    useOnboardingDraftStore.setState({
      draft: baseDraft({
        questions: [sectorQuestion, clientsQuestion],
        cursor: 1,
        answers: { [sectorQuestion.id]: answerTo(sectorQuestion, { selected: ["Energía"] }) },
      }),
    });
    renderFlow();
    expect(await screen.findByRole("button", { name: "Saltar" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(await screen.findByRole("radio", { name: "Energía" })).toBeChecked();
    expect(screen.queryByRole("button", { name: "Saltar" })).not.toBeInTheDocument();
  });

  it("hides Saltar on a question that was skipped before", async () => {
    useOnboardingDraftStore.setState({
      draft: baseDraft({ questions: [sectorQuestion, clientsQuestion], cursor: 0, answers: { [sectorQuestion.id]: answerTo(sectorQuestion, { skipped: true }) } }),
    });
    renderFlow();
    await screen.findByRole("radio", { name: "Energía" });
    expect(screen.queryByRole("button", { name: "Saltar" })).not.toBeInTheDocument();
  });

  it("rejects a skip for a question that already has an answer", async () => {
    const stored = answerTo(sectorQuestion, { selected: ["Energía"] });
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion], answers: { [sectorQuestion.id]: stored } }) });
    const client = new QueryClient();
    const { result } = renderHook(() => useOnboardingFlow(), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    act(() => result.current.submitAnswer(answerTo(sectorQuestion, { skipped: true })));
    expect(useOnboardingDraftStore.getState().draft?.answers[sectorQuestion.id]).toEqual(stored);
    expect(requestStep).not.toHaveBeenCalled();
  });

  it("counts characters in an open question", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [clientsQuestion] }) });
    renderFlow();
    await userEvent.type(await screen.findByRole("textbox", { name: "¿Quiénes son sus clientes?" }), "Retail");
    expect(screen.getByText("6/300")).toBeInTheDocument();
  });

  it("goes back, shows the saved answer and moves forward without asking the AI again", async () => {
    const draft = baseDraft({
      questions: [sectorQuestion, clientsQuestion],
      cursor: 1,
      answers: { [sectorQuestion.id]: answerTo(sectorQuestion, { selected: ["Energía"] }), [clientsQuestion.id]: answerTo(clientsQuestion, { text: "Retail" }) },
    });
    useOnboardingDraftStore.setState({ draft });
    renderFlow();

    await userEvent.click(await screen.findByRole("button", { name: "Atrás" }));
    expect(await screen.findByRole("radio", { name: "Energía" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Alimentos" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("textbox", { name: "¿Quiénes son sus clientes?" })).toHaveValue("Retail");
    expect(requestStep).not.toHaveBeenCalled();
    expect(useOnboardingDraftStore.getState().draft?.answers[sectorQuestion.id].selected).toEqual(["Alimentos"]);
    expect(useOnboardingDraftStore.getState().draft?.answers[clientsQuestion.id].text).toBe("Retail");
  });

  it("goes back from the first question to the seed form", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion] }) });
    renderFlow();
    await userEvent.click(await screen.findByRole("button", { name: "Atrás" }));
    expect(await screen.findByRole("textbox", { name: /Nombre de la empresa/ })).toHaveValue("Acme SAS");
  });

  it("resumes exactly where the user was after a reload", async () => {
    useOnboardingDraftStore.setState({
      draft: baseDraft({
        questions: [sectorQuestion, goalQuestion],
        cursor: 1,
        blocksDone: { empresa: true, objetivos: false },
        answers: { [sectorQuestion.id]: answerTo(sectorQuestion, { selected: ["Alimentos"] }) },
      }),
    });
    renderFlow();
    expect(await screen.findByRole("heading", { name: "¿Qué le preocupa?" })).toBeInTheDocument();
    expect(screen.getByText("Paso 2 de 3")).toBeInTheDocument();
    expect(requestStep).not.toHaveBeenCalled();
  });

  it("asks again for the first question when the page reloaded right after saving the seed", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft() });
    requestStep.mockResolvedValue(reply(sectorQuestion));
    renderFlow();
    expect(await screen.findByRole("heading", { name: "¿En qué sector trabaja?" })).toBeInTheDocument();
    expect(requestStep).toHaveBeenCalledTimes(1);
  });

  it("keeps the answers and offers to retry when the connection fails", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion] }) });
    requestStep.mockRejectedValueOnce(new OnboardingRequestError("offline")).mockResolvedValueOnce(reply(clientsQuestion));
    renderFlow();

    await userEvent.click(await screen.findByRole("radio", { name: "Alimentos" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Sin conexión\. Sus respuestas están guardadas\./)).toBeInTheDocument();
    expect(useOnboardingDraftStore.getState().draft?.answers[sectorQuestion.id].selected).toEqual(["Alimentos"]);

    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "¿Quiénes son sus clientes?" })).toBeInTheDocument();
    expect(requestStep).toHaveBeenCalledTimes(2);
  });

  it("tells the user when the built-in questions replaced the AI", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion] }) });
    requestStep.mockResolvedValue({ ...reply(clientsQuestion), source: "fallback", notice: { code: "ai_unavailable", message: "La IA no respondió. Se usan las preguntas básicas." } });
    renderFlow();
    await userEvent.click(await screen.findByRole("radio", { name: "Alimentos" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText(/Se usan las preguntas básicas/)).toBeInTheDocument();
  });

  it("moves from empresa to objetivos and then to the confirm step when the AI has enough", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [clientsQuestion] }) });
    requestStep.mockResolvedValueOnce(reply(null, { sector: "Alimentos" })).mockResolvedValueOnce(reply(goalQuestion));
    renderFlow();

    await userEvent.type(await screen.findByRole("textbox", { name: "¿Quiénes son sus clientes?" }), "Retail");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("heading", { name: "¿Qué le preocupa?" })).toBeInTheDocument();
    expect(requestStep.mock.calls.map((call) => call[0].block)).toEqual(["empresa", "objetivos"]);
    expect(screen.getByText("Paso 2 de 3")).toBeInTheDocument();

    requestStep.mockResolvedValueOnce(reply(null, { goals: { currentSituation: "Crece", target: "Exportar", priorities: [] } }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Tipo de cambio" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("heading", { name: "Confirme su empresa" })).toBeInTheDocument();
    expect(screen.getByText("Paso 3 de 3")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Meta" })).toHaveValue("Exportar");
  });

  it("offers to continue or start over when a draft exists and the user asked for a new company", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion] }) });
    renderFlow({ askAboutDraft: true });

    expect(await screen.findByRole("button", { name: "Continuar" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" }));

    expect(useOnboardingDraftStore.getState().draft).toMatchObject({ seed: null, questions: [], stage: "seed" });
    expect(await screen.findByRole("textbox", { name: /Nombre de la empresa/ })).toHaveValue("");
    expect(replace).toHaveBeenCalledWith("/onboarding");
  });

  it("continues the saved draft from the prompt", async () => {
    useOnboardingDraftStore.setState({ draft: baseDraft({ questions: [sectorQuestion] }) });
    renderFlow({ askAboutDraft: true });
    await userEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    expect(await screen.findByRole("heading", { name: "¿En qué sector trabaja?" })).toBeInTheDocument();
  });

  it("does not ask anything when there is no draft to lose", async () => {
    renderFlow({ askAboutDraft: true });
    expect(await screen.findByRole("textbox", { name: /Nombre de la empresa/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Empezar de nuevo" })).not.toBeInTheDocument();
  });
});

describe("OnboardingFlow confirm step", () => {
  beforeEach(() => {
    push.mockClear();
    requestStep.mockReset();
    window.localStorage.clear();
    useCompaniesStore.setState({ companies: [], activeCompanyId: null });
    useHydrationStore.setState({ hasHydrated: true });
    useOnboardingDraftStore.setState({
      draft: baseDraft({
        stage: "confirm",
        seed: { name: "Acme SAS", city: "Cali" },
        questions: [clientsQuestion],
        blocksDone: { empresa: true, objetivos: true },
        patch: {
          sector: "Alimentos",
          competitors: [{ name: "Alpina" }],
          goals: { currentSituation: "Crece", target: "Exportar", priorities: ["Costos"] },
        },
      }),
    });
  });
  afterEach(cleanup);

  it("creates the company with the edited values, activates it and clears the draft", async () => {
    renderFlow();
    const name = await screen.findByRole("textbox", { name: "Nombre de la empresa" });
    await userEvent.clear(name);
    await userEvent.type(name, "Acme Colombia");
    await userEvent.click(screen.getByRole("button", { name: "Crear empresa" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/resumen"));
    const { companies, activeCompanyId } = useCompaniesStore.getState();
    expect(companies).toHaveLength(1);
    expect(companies[0]).toMatchObject({ name: "Acme Colombia", sector: "Alimentos", city: "Cali", goals: { target: "Exportar" } });
    expect(companies[0].competitors).toEqual([{ name: "Alpina" }]);
    expect(activeCompanyId).toBe(companies[0].id);
    expect(useOnboardingDraftStore.getState().draft).toBeNull();
  });

  it("adds and removes competitors", async () => {
    renderFlow();
    await userEvent.click(await screen.findByRole("button", { name: "Acciones de Alpina" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Quitar" }));
    await userEvent.click(screen.getByRole("button", { name: "Agregar competidor" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByRole("textbox", { name: /Nombre/ }), "Colanta");
    await userEvent.type(within(dialog).getByRole("textbox", { name: /NIT/ }), "890904478");
    await userEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));
    await userEvent.click(screen.getByRole("button", { name: "Crear empresa" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    const [company] = useCompaniesStore.getState().companies;
    expect(company.competitors).toEqual([{ name: "Colanta", nit: "890904478" }]);
    expect(company.newsGroups.company.terms).toEqual(["Acme SAS", "Colanta"]);
  });

  it("does not create the company with an invalid NIT", async () => {
    renderFlow();
    await userEvent.type(await screen.findByRole("textbox", { name: "NIT" }), "12");
    await userEvent.click(screen.getByRole("button", { name: "Crear empresa" }));
    expect(await screen.findByText(/entre 5 y 10 dígitos/)).toBeInTheDocument();
    expect(useCompaniesStore.getState().companies).toHaveLength(0);
  });

  it("goes back to the last question without losing the draft", async () => {
    renderFlow();
    await userEvent.click(await screen.findByRole("button", { name: "Atrás" }));
    expect(await screen.findByRole("heading", { name: "¿Quiénes son sus clientes?" })).toBeInTheDocument();
    expect(useOnboardingDraftStore.getState().draft?.stage).toBe("questions");
  });
});

describe("OnboardingFlow re-answering an existing company", () => {
  beforeEach(() => {
    push.mockClear();
    requestStep.mockReset();
    window.localStorage.clear();
    useCompaniesStore.setState({ companies: [TEST_COMPANY], activeCompanyId: null });
    useHydrationStore.setState({ hasHydrated: true });
    useOnboardingDraftStore.setState({
      draft: baseDraft({
        companyId: TEST_COMPANY.id,
        stage: "confirm",
        seed: profileToSeed(TEST_COMPANY),
        patch: profileToPatch(TEST_COMPANY),
        blocksDone: { empresa: true, objetivos: true },
      }),
    });
  });
  afterEach(cleanup);

  it("prefills the confirm form with the company and offers to save, not to create", async () => {
    renderFlow();
    expect(await screen.findByRole("textbox", { name: "Nombre de la empresa" })).toHaveValue(TEST_COMPANY.name);
    expect(screen.queryByRole("button", { name: "Crear empresa" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("updates the same company, keeps its thresholds, makes it active and clears the draft", async () => {
    renderFlow();
    const sector = within(await screen.findByRole("region", { name: "Empresa" })).getByRole("textbox", { name: "Sector" });
    await userEvent.type(sector, "Metalmecánica");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/configuracion?tab=empresa"));
    const { companies, activeCompanyId } = useCompaniesStore.getState();
    expect(companies).toHaveLength(1);
    expect(companies[0]).toMatchObject({ id: TEST_COMPANY.id, sector: "Metalmecánica", thresholds: TEST_COMPANY.thresholds, createdAt: TEST_COMPANY.createdAt });
    expect(activeCompanyId).toBe(TEST_COMPANY.id);
    expect(useOnboardingDraftStore.getState().draft).toBeNull();
  });

  it("sends the previous profile to the AI so the questions build on it, and none for a new company", async () => {
    requestStep.mockResolvedValue(reply(sectorQuestion));
    useOnboardingDraftStore.setState({ draft: baseDraft({ companyId: TEST_COMPANY.id, stage: "questions", seed: profileToSeed(TEST_COMPANY) }) });
    renderFlow();
    await screen.findByRole("heading", { name: "¿En qué sector trabaja?" });
    const sent = requestStep.mock.calls[0][0] as { previous?: { name: string; competitors?: string[] } };
    expect(sent.previous).toMatchObject({ name: TEST_COMPANY.name, competitors: ["Competidora Uno", "Competidora Dos", "Competidora Tres"] });
    expect(JSON.stringify(sent)).not.toContain("900000002");
  });
});
