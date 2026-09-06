type Props = {
  message: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorMessage({
  message,
  title = 'Não foi possível concluir a operação',
  actionLabel,
  onAction,
}: Props) {
  return (
    <div className="ui-error" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
      {onAction ? (
        <button type="button" className="ui-button ui-button-primary" onClick={onAction}>
          {actionLabel || 'Tentar novamente'}
        </button>
      ) : null}
    </div>
  );
}
