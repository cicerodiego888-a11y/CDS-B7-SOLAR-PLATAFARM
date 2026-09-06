type Option = { value: string; label: string };

type Props = {
  id: string;
  label: string;
  value?: string;
  options: Option[];
  placeholder?: string;
  onChange?: (value: string) => void;
};

export function SelectField({ id, label, value, options, placeholder = 'Selecione', onChange }: Props) {
  return (
    <label className="ui-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange?.(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
