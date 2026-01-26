type InputProps = {
  placeholder: string
  suffix?: string
  label?: string
} & React.InputHTMLAttributes<HTMLInputElement>

export function Input({ placeholder, suffix, label, ...props }: InputProps) {
  return (
    <div className="flex flex-col w-full">
      {label && <label className="pl-3 text-left">{label}</label>}

      <div className="flex items-center rounded-full border-2 border-brand-accent/60 bg-white w-full shadow-sm focus-within:border-brand-accent focus-within:shadow-md focus-within:shadow-brand-accent/10 transition-all">
        <input
          type="text"
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-2 outline-none placeholder:text-brand-dark/40"
          {...props}
        />

        {suffix && (
          <span className="border-l border-brand-accent/40 px-4 py-2 text-brand-accent font-medium">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}
