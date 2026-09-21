import Link from "next/link";
import { Button, EmptyState, Icon } from "@/components/ui";

export const metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md">
        <p className="mb-4 text-center font-mono text-label uppercase text-ink-3">Erro 404</p>
        <EmptyState
          icon={<Icon.Search className="h-5 w-5" />}
          title="Esta página não existe"
          description="O endereço pode ter mudado, ou o registro que você procura foi removido."
          action={
            <Link href="/dashboard">
              <Button variant="primary" iconRight={<Icon.ArrowRight className="h-4 w-4" />}>
                Ir para o início
              </Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
