const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json({ error: detail }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: "Failed to reach backend: " + err.message },
      { status: 502 }
    );
  }
}
