'use client';

interface DateInputProps {
  id?: string;
  name?: string;
  value: string; // YYYY-MM-DD
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * DateInput — shows DD/MM/YYYY in the visible area while using the
 * native browser/mobile date picker underneath.
 *
 * Pass the same className you would give a normal <input type="date">.
 * A transparent native input is absolutely positioned on top so all
 * click/tap interactions open the native calendar/wheel.
 */
export default function DateInput({
  id,
  name,
  value,
  onChange,
  required,
  placeholder = 'DD/MM/YYYY',
  className = '',
}: DateInputProps) {
  // Convert stored YYYY-MM-DD to display DD/MM/YYYY
  const display = value ? value.split('-').reverse().join('/') : '';

  return (
    <div className={`relative ${className}`}>
      {/* Native date input — transparent, covers entire box, handles all input events */}
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        onChange={onChange}
        required={required}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      {/* Visual display — shows DD/MM/YYYY or placeholder */}
      <span className="pointer-events-none select-none">
        {display || (
          <span className="text-gray-400 uppercase tracking-wide">{placeholder}</span>
        )}
      </span>
    </div>
  );
}
