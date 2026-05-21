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
  role_name?: string;
  division_id: string;
  division_name?: string;
  can_access_restricted_documents: boolean;
  is_restrict: boolean;
  is_active: boolean;
}

export type StoredUser = User;

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
      can_access_restricted_documents?: boolean;
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
  };
}

export interface RefreshResponse {
  status: boolean;
  message: string;
  data: {
    token: string;
    user?: {
      id: string;
      name: string;
      username: string;
      email: string;
      role_id: string;
      division_id: string;
      phone?: string;
      is_active: boolean;
      can_access_restricted_documents?: boolean;
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
    can_access_restricted_documents?: boolean;
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
  can_access_restricted_documents: boolean;
  is_restrict: boolean;
  is_active: boolean;
  phone?: string;
  phone_number?: string;
  role_name?: string;
  division_name?: string;
  email_verified_at?: string | null;
  password_set_at?: string | null;
  deactivated_at?: string | null;
  deactivated_by?: string | null;
  deactivation_reason?: string | null;
  reactivated_at?: string | null;
  reactivated_by?: string | null;
  reactivation_reason?: string | null;
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

export type UserDeleteImpactReason =
  | "SELF_ACCOUNT"
  | "HAS_ACTIVITY_ACTIVE"
  | "HAS_ACTIVITY_INACTIVE"
  | "UNKNOWN"
  | null;

export interface UserDeleteImpact {
  can_delete: boolean;
  has_activity: boolean;
  dependency_count: number;
  requires_access_closure: boolean;
  can_close_access: boolean;
  reason: UserDeleteImpactReason;
  message: string;
}

export interface UserPayload {
  name: string;
  username: string;
  email: string;
  phone?: string;
  can_access_restricted_documents?: boolean;
  is_restrict?: boolean;
  role_id: string;
  division_id: string;
}
