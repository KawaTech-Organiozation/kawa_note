import { MaskedInput } from './MaskedInput';

export function TimeInput({ label = 'Hora', placeholder = 'HH:mm', ...props }) {
  return (
    <MaskedInput
      {...props}
      label={label}
      placeholder={placeholder}
      mask="00:00"
      unmask={false} // Mantém formato HH:mm
    />
  );
}
