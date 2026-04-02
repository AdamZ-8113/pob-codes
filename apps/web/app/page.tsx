import { BuildCodeForm } from "../components/build-code-form";
import { listSamplePobFiles } from "../lib/sample-pob-files";

export default function HomePage() {
  const sampleFiles = listSamplePobFiles();

  return (
    <main>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>PoB Codes</h1>
        <p className="meta" style={{ marginTop: 8 }}>
          Full read-only Path of Building visualization with short URLs.
        </p>
      </div>
      <BuildCodeForm sampleFiles={sampleFiles} />
    </main>
  );
}
