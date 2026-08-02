export async function GET() {
  return Response.json(
    {
      status: "ok",
      mode: process.env.APP_DATA_MODE ?? "demo",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
