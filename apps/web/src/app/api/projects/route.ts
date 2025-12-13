import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { shortId, slugify } from "@/lib/slug";

const CreateProjectSchema = z.object({
  projectName: z.string().min(1).max(120),
  primaryUrl: z.string().url(),
  orgName: z.string().min(1).max(120).optional(),
});

export async function GET() {
  const session = await getSession();
  const email = session?.user?.email ?? undefined;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: {
      organization: {
        members: { some: { userId: user.id } },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryUrl: true,
      createdAt: true,
      activeBrandDnaId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const session = await getSession();
  const email = session?.user?.email ?? undefined;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, memberships: { select: { organizationId: true } } },
  });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const orgId =
    user.memberships[0]?.organizationId ??
    (
      await prisma.organization.create({
        data: {
          name: parsed.data.orgName ?? "My Workspace",
          slug: `${slugify(parsed.data.orgName ?? "my-workspace")}-${shortId(5)}`,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
        select: { id: true },
      })
    ).id;

  const projectSlug = `${slugify(parsed.data.projectName)}-${shortId(5)}`;
  const project = await prisma.project.create({
    data: {
      organizationId: orgId,
      ownerId: user.id,
      name: parsed.data.projectName,
      slug: projectSlug,
      primaryUrl: parsed.data.primaryUrl,
    },
    select: { id: true, name: true, slug: true, primaryUrl: true, createdAt: true },
  });

  return NextResponse.json({ project }, { status: 201 });
}

