'use client';

interface DateInputProps {
  id?: string;
  name?: string;
  value: string; // YYYY-MM-DD
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  className?: string; // Standard input classes
}

/**
 * DateInput — shows DD/MM/YYYY in the visible area while using the
 * native browser/mobile date picker underneath.
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
    <div className={`relative inline-flex items-center ${className || 'w-full'} group`}>
      {/* Native date input — transparent, covers entire box, handles all input events */}
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        onChange={onChange}
        required={required}
        onClick={(e) => {
          try {
            (e.target as HTMLInputElement).showPicker?.();
          } catch (err) { }
        }}
        className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 outline-none`}
      />
      {/* Visual display — mimics a standard input looks */}
      <div className="flex items-center w-full bg-white border rounded-lg px-3 py-2.5 text-sm transition-all group-focus-within:ring-2 group-focus-within:ring-blue-400 group-focus-within:border-transparent">
        <span className={display ? 'text-gray-800' : 'text-gray-400'}>
          {display || placeholder}
        </span>
        <div className="ml-auto pointer-events-none opacity-40">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
