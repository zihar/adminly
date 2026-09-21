"use client";

import * as React from "react";

export type FormMode = "edit" | "detail";

const FormModeContext = React.createContext<FormMode>("edit");

export function FormModeProvider({ mode, children }: React.PropsWithChildren<{ mode: FormMode }>) {
  return <FormModeContext.Provider value={mode}>{children}</FormModeContext.Provider>;
}

export function useFormMode(): FormMode {
  return React.useContext(FormModeContext);
}
