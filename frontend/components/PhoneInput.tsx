'use client';

import { useState, useEffect } from 'react';
import { PhoneInput as ReactPhoneInput } from 'react-international-phone';
import '../styles/phone-input.css';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  onCountryChange?: (country: string) => void;
  disabled?: boolean;
  className?: string;
  defaultCountry?: string;
  lockCountryOnSelect?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  onCountryChange,
  disabled = false,
  className,
  defaultCountry = 'bf', // Burkina Faso par défaut
  lockCountryOnSelect = true, // Verrouille l'indicatif par défaut
}: PhoneInputProps) {
  const [isCountryLocked, setIsCountryLocked] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);

  useEffect(() => {
    // Verrouille le pays dès qu'un numéro est saisi
    if (lockCountryOnSelect && value && value.length > 3) {
      setIsCountryLocked(true);
    }
  }, [value, lockCountryOnSelect]);

  const handlePhoneChange = (phone: string, meta: any) => {
    onChange(phone);
    if (onCountryChange && meta?.country) {
      setSelectedCountry(meta.country.iso2);
      onCountryChange(meta.country.iso2);
    }
  };

  return (
    <div className={cn('phone-input-wrapper', className)}>
      <ReactPhoneInput
        value={value}
        onChange={handlePhoneChange}
        defaultCountry={selectedCountry}
        disabled={disabled}
        inputClassName="w-full"
        countrySelectorStyleProps={{
          buttonClassName: `border-slate-300 ${isCountryLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50 cursor-pointer'}`,
          buttonContentWrapperClassName: isCountryLocked ? 'pointer-events-none' : '',
        }}
        disableCountryGuess={isCountryLocked}
        forceDialCode={true}
        inputProps={{
          className: 'w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition text-slate-900 pl-14',
          required: true,
        }}
      />
      {isCountryLocked && (
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Indicatif verrouillé</span>
        </div>
      )}
    </div>
  );
}
