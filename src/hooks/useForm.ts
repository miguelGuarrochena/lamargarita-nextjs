import { useState, useMemo, ChangeEvent } from 'react';

export const useForm = <T extends Record<string, any>>(
  initialForm: T,
  formValidations: Partial<Record<keyof T, [(value: any) => boolean, string]>> = {}
) => {
  const [formState, setFormState] = useState<T>(initialForm);
  const [formValidation, setFormValidation] = useState<Record<string, string | null>>({});

  const onInputChange = ({ target }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = target;
    setFormState({
      ...formState,
      [name]: value,
    });
  };

  const onResetForm = () => {
    setFormState(initialForm);
  };

  const isFormValid = useMemo(() => {
    for (const formField of Object.keys(formValidations)) {
      if (formValidation[formField] !== null) return false;
    }
    return true;
  }, [formValidation]);

  const createValidators = () => {
    const formCheckedValues: Record<string, string | null> = {};

    for (const formField of Object.keys(formValidations)) {
      const validation = formValidations[formField];
      if (validation) {
        const [fn, errorMessage] = validation;
        formCheckedValues[`${formField}Valid`] = fn(formState[formField]) ? null : errorMessage;
      }
    }

    setFormValidation(formCheckedValues);
  };

  return {
    ...formState,
    formState,
    onInputChange,
    onResetForm,
    ...formValidation,
    isFormValid,
    createValidators,
  };
};
