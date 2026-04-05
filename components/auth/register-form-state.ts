export type RegisterFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  login?: string;
  values?: {
    login?: string;
    phone?: string;
    email?: string;
    fullName?: string;
  };
  fieldErrors?: Partial<
    Record<"login" | "phone" | "email" | "fullName" | "password" | "confirmPassword", string[]>
  >;
};

export const initialRegisterFormState: RegisterFormState = {
  status: "idle",
};
