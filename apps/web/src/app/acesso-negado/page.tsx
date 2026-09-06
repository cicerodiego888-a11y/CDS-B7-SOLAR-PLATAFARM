import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';

export default function AcessoNegadoPage() {
  return (
    <div className="shell">
      <PageHeader title="Acesso negado" description="Você não possui permissão para acessar este recurso." />
      <section className="panel">
        <EmptyState
          title="Acesso negado"
          description="Você não possui permissão para acessar este recurso."
        />
      </section>
    </div>
  );
}
