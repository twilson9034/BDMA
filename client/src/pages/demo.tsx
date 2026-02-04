import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function JsonBlock({ data }: { data: any }) {
  return (
    <pre className="whitespace-pre-wrap max-h-64 overflow-auto text-xs bg-muted p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
  );
}

export default function DemoPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function callApi(path: string) {
    setLoading(path);
    setResult(null);
    try {
      const res = await fetch(path, { method: path.includes('generate-checklist') ? 'POST' : 'GET' });
      const json = await res.json();
      setResult({ status: res.status, body: json });
    } catch (err: any) {
      setResult({ error: String(err) });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">BDMA — Interactive Demo</h1>
            <p className="text-sm text-muted-foreground">Share this link with prospects to explore key features without signing in.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Shareable URL</p>
            <input readOnly value="/demo" className="mt-1 p-2 text-sm rounded border border-border bg-card" />
          </div>
        </header>

        <section className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardContent>
              <h3 className="font-semibold mb-2">Fleet & Dashboard</h3>
              <p className="text-sm text-muted-foreground mb-4">Fetch public read-only endpoints to preview data.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => callApi('/api/dashboard/stats')} disabled={!!loading}>Dashboard Stats</Button>
                <Button onClick={() => callApi('/api/assets')} disabled={!!loading}>List Assets</Button>
                <Button onClick={() => callApi('/api/predictions')} disabled={!!loading}>All Predictions</Button>
                <Button onClick={() => callApi('/api/fleet/health')} disabled={!!loading}>Fleet Health</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="font-semibold mb-2">Operations & Inventory</h3>
              <p className="text-sm text-muted-foreground mb-4">Inspect procurement, estimates, and import status.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => callApi('/api/estimates/unfulfilled-parts')} disabled={!!loading}>Unfulfilled Parts</Button>
                <Button onClick={() => callApi('/api/parts/low-stock')} disabled={!!loading}>Low Stock Parts</Button>
                <Button onClick={() => callApi('/api/import-jobs')} disabled={!!loading}>Import Jobs</Button>
                <Button onClick={() => callApi('/api/pm-schedules')} disabled={!!loading}>PM Schedules</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardContent>
              <h3 className="font-semibold mb-2">Telematics & Faults</h3>
              <p className="text-sm text-muted-foreground mb-4">Get latest telematics for an asset id `1` if available.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => callApi('/api/assets/1/telematics/latest')} disabled={!!loading}>Latest Telematics (asset 1)</Button>
                <Button onClick={() => callApi('/api/assets/1/fault-codes')} disabled={!!loading}>Fault Codes (asset 1)</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="font-semibold mb-2">AI Features</h3>
              <p className="text-sm text-muted-foreground mb-4">Trigger AI checklist generation (may require AI env configured).</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => callApi('/api/ai/generate-checklist')} disabled={!!loading}>Generate Checklist (POST)</Button>
                <Button onClick={() => callApi('/api/smart-part-suggestions?vmrsCode=01-0010')} disabled={!!loading}>Part Suggestions (vmrs)</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Result</h3>
          <div className="space-y-2">
            {loading && <div className="text-sm text-muted-foreground">Calling {loading}…</div>}
            {result ? <JsonBlock data={result} /> : <div className="text-sm text-muted-foreground">No results yet — click a button above.</div>}
          </div>
        </section>

        <footer className="pt-8 text-sm text-muted-foreground">Note: Some demo actions are read-only and may return empty arrays depending on the demo database. Actions that create or modify data typically require authentication.</footer>
      </div>
    </div>
  );
}
