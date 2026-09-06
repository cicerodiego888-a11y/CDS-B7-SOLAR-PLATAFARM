'use client';

import { useEffect, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingState } from '../../components/ui/LoadingState';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  getInverterManufacturerName,
  getIntegrationStatusLabel,
  OFFICIAL_INVERTER_MANUFACTURERS,
} from '../../constants/inverters';
import { fetchApi } from '../../lib/api';

type Manufacturer = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  integrationStatus: string;
};

export default function ConfiguracoesPage() {
  const [rows, setRows] = useState<Manufacturer[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi<Manufacturer[]>('/manufacturers')
      .then(setRows)
      .catch((err: Error) => {
        setError(err.message);
        setRows(
          OFFICIAL_INVERTER_MANUFACTURERS.map((item) => ({
            id: item.code,
            code: item.code,
            name: item.name,
            active: true,
            integrationStatus: 'PLANNED',
          })),
        );
      });
  }, []);

  return (
    <div className="shell">
      <PageHeader
        title="Configurações"
        description="Preferências do B7 Solar Platform e base oficial de fabricantes."
      />
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Fabricantes oficiais</h2>
            <p>Catálogo central do Motor de Integrações.</p>
          </div>
        </div>
        {error ? <ErrorMessage message={`${error}. Exibindo catálogo local.`} /> : null}
        {!rows ? <LoadingState /> : (
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            columns={[
              { key: 'name', header: 'Fabricante', render: (row) => getInverterManufacturerName(row.code) },
              { key: 'active', header: 'Situação', render: (row) => (row.active ? 'Ativo' : 'Inativo') },
              {
                key: 'integration',
                header: 'Integração',
                render: (row) => (
                  <StatusBadge label={getIntegrationStatusLabel(row.integrationStatus)} status={row.integrationStatus} />
                ),
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}
