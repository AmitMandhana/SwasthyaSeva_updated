"use client";

import { useState, useRef, useCallback } from "react";
import { validateForm, type FormSchema, type FieldErrors } from "./validators";

type FocusableElement = HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement;

export function useFormValidation(schema: FormSchema) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const refsMap = useRef<Map<string, React.RefObject<FocusableElement | null>>>(new Map());

  const registerRef = useCallback((fieldName: string) => {
    if (!refsMap.current.has(fieldName)) {
      refsMap.current.set(fieldName, { current: null });
    }
    const ref = refsMap.current.get(fieldName)!;
    return { inputRef: ref, textareaRef: ref, buttonRef: ref };
  }, []);

  const validateAndFocus = useCallback((data: Record<string, string>): boolean => {
    const errors = validateForm(schema, data);
    setFieldErrors(errors);

    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return true;

    const schemaKeys = Object.keys(schema);
    const firstErrorField = schemaKeys.find(k => errors[k]);
    if (firstErrorField) {
      const ref = refsMap.current.get(firstErrorField);
      if (ref?.current) {
        ref.current.focus();
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    return false;
  }, [schema]);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors(prev => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  return { fieldErrors, setFieldErrors, registerRef, validateAndFocus, clearErrors, clearFieldError };
}
