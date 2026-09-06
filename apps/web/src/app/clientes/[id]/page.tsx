'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ApiError, fetchApi } from '../../../lib/api';
import { plantOperationalLabel, recordStatusLabel } from '../../../lib/operational';

type Customer = {
  id: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  plants: Array<{ id: string; name: string; status: string; _count?: { inverters: number; equipment: number } }>;
};

export default function ClienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Customer | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi<Customer>(`/customers/${params.id}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o cliente.'));
  }, [params.id]);

  if (error) return <div className="shell"><ErrorMessage message={error} /></div>;
  if (!data) return <div className="shell"><LoadingState message="Carregando cliente..." /></div>;

  return (
    <div className="shell">
      <PageHeader
        title={data.name}
        description={`${data.document || 'Documento não informado'} · ${data.email || 'sem e-mail'}`}
        actions={<StatusBadge label={recordStatusLabel(data.status)} status={data.status} />}
      />
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Usinas do cliente</h2>
            <p>{data.plants.length} usina(s) vinculada(s).</p>
          </div>
          <Link href={`/usinas?cliente=${data.id}`}><Button>Ver usinas</Button></Link>
        </div>
        <DataTable
          rows={data.plants}
          rowKey={(row) => row.id}
          columns={[
            { key: 'name', header: 'Usina', render: (row) => <Link href={`/usinas/${row.id}`}>{row.name}</Link> },
            { key: 'inverters', header: 'Inversores', render: (row) => row._count?.inverters ?? 0 },
            { key: 'equipment', header: 'Equipamentos', render: (row) => row._count?.equipment ?? 0 },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge label={plantOperationalLabel(row.status)} status={row.status} /> },
          ]}
          empty={<EmptyState title="Nenhuma usina" description="Este cliente ainda não possui usinas." />}
        />
      </section>
    </div>
  );
}
