import { isLocalDataKey } from "@/lib/local-data-contract";
import { getLocalDatabasePath, getLocalDatabaseSnapshots, putLocalDatabaseSnapshot } from "@/lib/local-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ snapshots:getLocalDatabaseSnapshots(),storage:"sqlite",databaseFile:getLocalDatabasePath().replace(process.cwd(), "<project>") });
}

export async function PUT(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 10_000_000) return Response.json({ message:"حجم البيانات أكبر من المسموح." }, { status:413 });
  const body = await request.json() as { key?: unknown; version?: unknown; data?: unknown };
  if (!isLocalDataKey(body.key) || !Number.isSafeInteger(body.version) || Number(body.version) < 1 || body.data === undefined) return Response.json({ message:"بيانات الحفظ غير صالحة." }, { status:400 });
  return Response.json(putLocalDatabaseSnapshot(body.key, Number(body.version), body.data));
}
