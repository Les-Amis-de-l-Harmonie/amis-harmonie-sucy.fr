import { env } from "cloudflare:workers";
import { verifySession } from "@/app/api/auth";
import { invalidateCache } from "./cache";

export interface CrudConfig<T> {
  tableName: string;
  requiredFields: (keyof T)[];
  requireAuth?: boolean;
  requireAdminAuth?: boolean;
}

export type CrudHandlers = {
  handleGet: (request: Request) => Promise<Response>;
  handlePost: (request: Request) => Promise<Response>;
  handlePut: (request: Request) => Promise<Response>;
  handleDelete: (request: Request) => Promise<Response>;
};

async function checkAuth(
  request: Request,
  requireAdmin: boolean = false
): Promise<Response | null> {
  const user = await verifySession(request, requireAdmin ? "admin" : undefined);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (requireAdmin && user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export function createCrudApi<T extends Record<string, unknown>>(
  config: CrudConfig<T>
): CrudHandlers {
  const { tableName, requiredFields, requireAuth = true, requireAdminAuth = true } = config;

  const handleGet = async (request: Request): Promise<Response> => {
    if (requireAuth) {
      const authError = await checkAuth(request, requireAdminAuth);
      if (authError) return authError;
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    try {
      if (id) {
        const item = await env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(id)
          .first<T>();
        return new Response(JSON.stringify(item), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const items = await env.DB.prepare(`SELECT * FROM ${tableName} ORDER BY id DESC`).all<T>();
      return new Response(JSON.stringify(items.results), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  const handlePost = async (request: Request): Promise<Response> => {
    if (requireAuth) {
      const authError = await checkAuth(request, requireAdminAuth);
      if (authError) return authError;
    }

    try {
      const data = (await request.json()) as Partial<T>;

      for (const field of requiredFields) {
        if (!data[field]) {
          return new Response(JSON.stringify({ error: `${String(field)} is required` }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      const fields = Object.keys(data);
      const placeholders = fields.map(() => "?").join(", ");
      const values = fields.map((f) => data[f as keyof T]);

      const result = await env.DB.prepare(
        `INSERT INTO ${tableName} (${fields.join(", ")}) VALUES (${placeholders})`
      )
        .bind(...values)
        .run();

      await invalidateCache();

      return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`Error creating ${tableName}:`, error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  const handlePut = async (request: Request): Promise<Response> => {
    if (requireAuth) {
      const authError = await checkAuth(request, requireAdminAuth);
      if (authError) return authError;
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const data = (await request.json()) as Partial<T>;
      const fields = Object.keys(data);
      const setClause = fields.map((f) => `${f} = ?`).join(", ");
      const values = [...fields.map((f) => data[f as keyof T]), id];

      await env.DB.prepare(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`)
        .bind(...values)
        .run();

      await invalidateCache();

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`Error updating ${tableName}:`, error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  const handleDelete = async (request: Request): Promise<Response> => {
    if (requireAuth) {
      const authError = await checkAuth(request, requireAdminAuth);
      if (authError) return authError;
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ?`).bind(id).run();

      await invalidateCache();

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`Error deleting ${tableName}:`, error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  return {
    handleGet,
    handlePost,
    handlePut,
    handleDelete,
  };
}
