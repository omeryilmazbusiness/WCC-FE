import { env } from "@/shared/config/env";
import type { AppRole } from "@/shared/config/routes";
import { FetchHttpClient } from "@/shared/api/http-client";
import type { Session, SessionUser } from "@/shared/api/session";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: AppRole;
    branch_id: string;
  };
};

export interface AuthGateway {
  login(email: string, password: string): Promise<Session>;
}

export class ApiAuthGateway implements AuthGateway {
  private http = new FetchHttpClient(env.apiBaseUrl);

  async login(email: string, password: string): Promise<Session> {
    const data = await this.http.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return mapSession(data);
  }
}

/** Local demo gateway when BE is offline — roles match BE seed. */
export class DemoAuthGateway implements AuthGateway {
  async login(email: string, password: string): Promise<Session> {
    const normalized = email.trim().toLowerCase();
    const users: Record<string, SessionUser> = {
      "gm@wodi.local": {
        id: "22222222-2222-2222-2222-222222222201",
        email: "gm@wodi.local",
        fullName: "General Manager",
        role: "gm",
        branchId: "11111111-1111-1111-1111-111111111111",
      },
      "manager@wodi.local": {
        id: "22222222-2222-2222-2222-222222222202",
        email: "manager@wodi.local",
        fullName: "Branch Manager",
        role: "manager",
        branchId: "11111111-1111-1111-1111-111111111111",
      },
      "sales@wodi.local": {
        id: "22222222-2222-2222-2222-222222222203",
        email: "sales@wodi.local",
        fullName: "Sales Employee",
        role: "employee",
        branchId: "11111111-1111-1111-1111-111111111111",
      },
      "admin@wodi.local": {
        id: "22222222-2222-2222-2222-222222222204",
        email: "admin@wodi.local",
        fullName: "System Admin",
        role: "admin",
        branchId: "11111111-1111-1111-1111-111111111111",
      },
      "finance@wodi.local": {
        id: "22222222-2222-2222-2222-222222222205",
        email: "finance@wodi.local",
        fullName: "Finance User",
        role: "finance",
        branchId: "11111111-1111-1111-1111-111111111111",
      },
      "ops@wodi.local": {
        id: "22222222-2222-2222-2222-222222222206",
        email: "ops@wodi.local",
        fullName: "Operations User",
        role: "operations",
        branchId: "11111111-1111-1111-1111-111111111111",
      },
    };
    const user = users[normalized];
    if (!user || password !== "ChangeMe123!") {
      throw new Error("Invalid credentials");
    }
    return {
      accessToken: `demo.${user.role}`,
      refreshToken: "demo-refresh",
      expiresIn: 3600,
      user,
    };
  }
}

function mapSession(data: LoginResponse): Session {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.full_name,
      role: data.user.role,
      branchId: data.user.branch_id,
    },
  };
}

export function createAuthGateway(): AuthGateway {
  if (process.env.NEXT_PUBLIC_USE_DEMO_AUTH === "false") {
    return new ApiAuthGateway();
  }
  // Prefer live API; fall back handled in UI on failure → demo optional
  return new ApiAuthGateway();
}
