type Props = {
  id: string;
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
  onChange?: (value: string) => void;
};

export function TextField({ id, label, value, placeholder, type = 'text', onChange }: Props) {
  return (
    <label className="ui-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}
