'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../components/auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingState } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { SelectField } from '../../components/ui/SelectField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TextField } from '../../components/ui/TextField';
import { ApiError, fetchApi } from '../../lib/api';
import { can, RECORD_STATUS_OPTIONS, recordStatusLabel } from '../../lib/operational';

type Customer = {
  id: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  _count?: { plants: number };
};

const emptyForm = { name: '', document: '', email: '', phone: '', status: 'ACTIVE' };

export default function ClientesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError('');
      setRows(await fetchApi<Customer[]>('/customers'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os clientes.');
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (rows || []).filter((row) =>
      [row.name, row.document, row.email, row.phone].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [rows, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: Customer) {
    setEditing(row);
    setForm({
      name: row.name,
      document: row.document || '',
      email: row.email || '',
      phone: row.phone || '',
      status: row.status,
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        await fetchApi(`/customers/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ name: form.name, document: form.document, email: form.email, phone: form.phone }) });
      } else {
        await fetchApi('/customers', { method: 'POST', body: JSON.stringify(form) });
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o cliente.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: Customer) {
    const status = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await fetchApi(`/customers/${row.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await load();
  }

  return (
    <div className="shell">
      <PageHeader title="Clientes" description="Cadastro operacional dos clientes da B7 Solar." />
      {error ? <ErrorMessage message={error} /> : null}
      {!rows && !error ? <LoadingState message="Carregando clientes..." /> : null}
      {rows ? (
        <section className="panel">
          <div className="toolbar">
            <div className="toolbar-filters">
              <TextField id="busca-cliente" label="Buscar" value={search} onChange={setSearch} placeholder="Nome, documento ou e-mail" />
            </div>
            {can(user, 'CUSTOMERS_CREATE') ? <Button onClick={openCreate}>Novo cliente</Button> : null}
          </div>
          <DataTable
            rows={filtered}
            rowKey={(row) => row.id}
            columns={[
              { key: 'name', header: 'Cliente', render: (row) => <Link href={`/clientes/${row.id}`}>{row.name}</Link> },
              { key: 'document', header: 'Documento', render: (row) => row.document || '—' },
              { key: 'phone', header: 'Telefone', render: (row) => row.phone || '—' },
              { key: 'email', header: 'E-mail', render: (row) => row.email || '—' },
              { key: 'plants', header: 'Usinas', render: (row) => row._count?.plants ?? 0 },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge label={recordStatusLabel(row.status)} status={row.status} /> },
              {
                key: 'actions',
                header: 'Ações',
                render: (row) => (
                  <div className="actions-cell">
                    {can(user, 'CUSTOMERS_UPDATE') ? <Button variant="secondary" onClick={() => openEdit(row)}>Editar</Button> : null}
                    {can(user, 'CUSTOMERS_UPDATE') ? <Button variant="ghost" onClick={() => void toggleStatus(row)}>{row.status === 'ACTIVE' ? 'Inativar' : 'Ativar'}</Button> : null}
                  </div>
                ),
              },
            ]}
            empty={<EmptyState title="Nenhum registro encontrado" description="Cadastre o primeiro cliente para vincular usinas." />}
          />
        </section>
      ) : null}

      <Modal open={open} title={editing ? 'Editar cliente' : 'Novo cliente'} onClose={() => setOpen(false)} onConfirm={() => void save()} confirmLabel={saving ? 'Salvando...' : 'Salvar'}>
        <div className="form-grid">
          <TextField id="nome" label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
          <TextField id="documento" label="CPF/CNPJ" value={form.document} onChange={(document) => setForm({ ...form, document })} />
          <TextField id="email" label="E-mail" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <TextField id="telefone" label="Telefone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          {!editing ? <SelectField id="status" label="Status" value={form.status} options={RECORD_STATUS_OPTIONS} onChange={(status) => setForm({ ...form, status })} /> : null}
        </div>
      </Modal>
    </div>
  );
}
