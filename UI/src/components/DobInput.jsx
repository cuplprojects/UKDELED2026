import React, { useState, useEffect, useRef } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import {
  formatDateToDDMMYYYY,
  parseDDMMYYYYToISO,
  maskDDMMYYYYInput,
} from "../utils/dateUtils";

/**
 * Locale-independent Date of Birth input that always displays and accepts dd-mm-yyyy,
 * while emitting ISO YYYY-MM-DD values to parent form state.
 */
export default function DobInput({
  value = "",
  onChange,
  disabled = false,
  required = false,
  className = "",
  min = "1940-01-01",
  max,
  id,
  name = "dob",
}) {
  const inputRef = useRef(null);
  const pickerRef = useRef(null);
  const [displayValue, setDisplayValue] = useState(() => formatDateToDDMMYYYY(value));

  const todayISO = new Date().toISOString().split("T")[0];
  const effectiveMax = max || todayISO;

  // Keep display in sync when parent resets or updates value externally
  useEffect(() => {
    const formatted = formatDateToDDMMYYYY(value);
    if (value && formatted) {
      setDisplayValue(formatted);
      if (inputRef.current) inputRef.current.setCustomValidity("");
    } else if (!value) {
      // Only clear display if current text was already valid or empty (avoid wiping mid-typing)
      setDisplayValue((prev) => {
        if (!prev || parseDDMMYYYYToISO(prev)) return "";
        return prev;
      });
    }
  }, [value]);

  const validateAndEmit = (formattedText) => {
    if (!formattedText) {
      if (inputRef.current) inputRef.current.setCustomValidity("");
      onChange?.("");
      return;
    }

    if (formattedText.length < 10) {
      if (inputRef.current) {
        inputRef.current.setCustomValidity("Please enter Date of Birth in dd-mm-yyyy format (e.g. 15-08-2000).");
      }
      onChange?.("");
      return;
    }

    const iso = parseDDMMYYYYToISO(formattedText);
    if (!iso) {
      if (inputRef.current) {
        inputRef.current.setCustomValidity("Invalid date. Please use dd-mm-yyyy format (e.g. 15-08-2000).");
      }
      onChange?.("");
      return;
    }

    if (inputRef.current) inputRef.current.setCustomValidity("");
    onChange?.(iso);
  };

  const handleTextChange = (e) => {
    const masked = maskDDMMYYYYInput(e.target.value);
    setDisplayValue(masked);
    validateAndEmit(masked);
  };

  const handlePickerChange = (e) => {
    const iso = e.target.value;
    if (!iso) return;
    const formatted = formatDateToDDMMYYYY(iso);
    setDisplayValue(formatted);
    if (inputRef.current) inputRef.current.setCustomValidity("");
    onChange?.(iso);
  };

  const handleCalendarClick = () => {
    if (disabled || !pickerRef.current) return;
    try {
      if (typeof pickerRef.current.showPicker === "function") {
        pickerRef.current.showPicker();
      } else {
        pickerRef.current.focus();
        pickerRef.current.click();
      }
    } catch {
      pickerRef.current.focus();
      pickerRef.current.click();
    }
  };

  const currentIsoForPicker = parseDDMMYYYYToISO(displayValue) || "";

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="dd-mm-yyyy"
        maxLength={10}
        required={required}
        disabled={disabled}
        value={displayValue}
        onChange={handleTextChange}
        className={`${className} pr-10`}
      />

      {/* Calendar Picker Trigger + Invisible Native Date Picker Overlay */}
      <button
        type="button"
        onClick={handleCalendarClick}
        disabled={disabled}
        tabIndex={-1}
        aria-label="Open calendar to select date of birth"
        title="Select Date of Birth from Calendar"
        className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-600 hover:text-blue-700 disabled:opacity-40 cursor-pointer bg-transparent border-0"
      >
        <FaCalendarAlt className="w-4 h-4 pointer-events-none" />
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          min={min}
          max={effectiveMax}
          value={currentIsoForPicker}
          onChange={handlePickerChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </button>
    </div>
  );
}

