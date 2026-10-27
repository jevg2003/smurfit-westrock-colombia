import { CompanyPicker } from "./company-picker";

export default function CompaniesPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-4 py-10 sm:px-6">
      <CompanyPicker />
    </main>
  );
}
