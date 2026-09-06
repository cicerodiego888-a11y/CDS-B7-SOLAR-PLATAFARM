import type { ReactNode } from 'react';
import { Button } from './Button';

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
};

export function Modal({
  open,
  title,
  children,
  confirmLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="ui-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="ui-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="modal-title">{title}</h2>
        <div className="ui-modal-body">{children}</div>
        <div className="ui-modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            {cancelLabel}
          </Button>
          {onConfirm ? (
            <Button type="button" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
