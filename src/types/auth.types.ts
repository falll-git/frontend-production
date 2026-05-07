import type { Role } from "@/lib/rbac";

export type OnboardingStatus =
  | "ACTIVE"
  | "PENDING_ACTIVATION"
  | "NOT_ACTIVATED";

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: Role;
  role_id: string;
  division_id: string;
  is_restrict: boolean;
  is_active: boolean;
}

export interface StoredUser extends User {
  password?: string;
}

export interface AuthApiResponse<T> {
  status: boolean;
  success?: boolean;
  message: string;
  data: T;
}

export interface AuthFlowUser {
  id: string;
  name: string;
  email: string;
  username: string;
}

export interface PasswordTokenVerificationData {
  user: AuthFlowUser;
  expires_at: string;
  path: string;
  url: string | null;
}

export interface LoginResponse {
  status: boolean;
  message: string;
  data: {
    data: {
      id: string;
      name: string;
      username: string;
      email: string;
      role_id: string;
      division_id: string;
      phone?: string;
      is_active: boolean;
      is_restrict: boolean;
      created_at: string;
      updated_at: string;
      role?: {
        id?: string;
        name?: string;
        role_name?: string;
      };
      division?: {
        id?: string;
        name?: string;
        division_name?: string;
      };
    };
    token: string;
    refreshToken: string;
  };
}

export interface RefreshResponse {
  status: boolean;
  message: string;
  data: {
    token: string;
    refreshToken?: string;
    user?: {
      id: string;
      name: string;
      username: string;
      email: string;
      role_id: string;
      division_id: string;
      phone?: string;
      is_active: boolean;
      is_restrict: boolean;
      email_verified_at?: string | null;
      password_set_at?: string | null;
      invitation_pending?: boolean;
      onboarding_status?: OnboardingStatus;
      created_at?: string;
      updated_at?: string;
      role?: {
        id?: string;
        name?: string;
        role_name?: string;
      };
      division?: {
        id?: string;
        name?: string;
        division_name?: string;
      };
    };
  };
}

export type ForgotPasswordResponse = AuthApiResponse<null>;

export type PasswordTokenVerificationResponse =
  AuthApiResponse<PasswordTokenVerificationData>;

export type PasswordMutationResponse = AuthApiResponse<{
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    role_id: string;
    division_id: string;
    phone?: string;
    is_active: boolean;
    is_restrict: boolean;
    invitation_pending?: boolean;
    onboarding_status?: OnboardingStatus;
    email_verified_at?: string | null;
    password_set_at?: string | null;
    created_at?: string;
    updated_at?: string;
    role?: {
      id?: string;
      name?: string;
      role_name?: string;
    };
    division?: {
      id?: string;
      name?: string;
      division_name?: string;
    };
  };
}>;

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  name: string;
  role_id: string;
  division_id: string;
  is_restrict: boolean;
  is_active: boolean;
  phone?: string;
  phone_number?: string;
  role_name?: string;
  division_name?: string;
  email_verified_at?: string | null;
  password_set_at?: string | null;
  invitation_pending?: boolean;
  onboarding_status?: OnboardingStatus;
}

export interface InvitationDelivery {
  channel?: string;
  status?: string;
  reason?: string;
  error?: string;
  message_id?: string | null;
  accepted?: string[];
  rejected?: string[];
}

export interface InvitationRecord {
  type: "INVITE";
  token?: string;
  path?: string;
  url?: string | null;
  expires_at?: string;
  delivery?: InvitationDelivery;
}

export interface UserMutationResult {
  user: UserRecord;
  invitation: InvitationRecord | null;
}

export interface UserPayload {
  name: string;
  username: string;
  email: string;
  password?: string;
  phone?: string;
  is_active?: boolean;
  is_restrict?: boolean;
  role_id: string;
  division_id: string;
}
