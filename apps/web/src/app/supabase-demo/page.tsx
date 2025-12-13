import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from("todos").select();

  return (
    <ul className="space-y-2 p-6">
      {(todos as Array<Record<string, unknown>> | null | undefined)?.map((todo) => (
        <li
          key={String(todo.id ?? todo.created_at ?? JSON.stringify(todo))}
          className="rounded-md border p-3"
        >
          {String(todo.title ?? todo.name ?? JSON.stringify(todo))}
        </li>
      ))}
    </ul>
  );
}

