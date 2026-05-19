import { requireUser } from "@/lib/auth/current-user";
import { CreateTenantForm } from "./form";

export const metadata = { title: "Kreisverband anlegen" };

export default async function NewTenantPage() {
  await requireUser();
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="drk-card drk-fade-in">
        <h1 className="text-2xl font-bold mb-2">Neuen Kreisverband anlegen</h1>
        <p className="mb-6" style={{ color: "var(--text-light)" }}>
          Der Antrag wird vom Super-Admin geprüft. Du wirst per E-Mail
          benachrichtigt, sobald der KV freigeschaltet ist.
        </p>
        <CreateTenantForm />
      </div>
    </div>
  );
}
