import { MaskedInput } from './MaskedInput';

export function PhoneInput({ label = 'Telefone', placeholder = '(00) 00000-0000', ...props }) {
  return (
    <MaskedInput
      {...props}
      label={label}
      placeholder={placeholder}
      mask={[
        { mask: '(00) 0000-0000' },  // Fixo
        { mask: '(00) 00000-0000' }  // Celular
      ]}
      unmask
    />
  );
}
