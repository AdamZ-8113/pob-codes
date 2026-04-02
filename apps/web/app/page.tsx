import { BuildCodeForm } from "../components/build-code-form";
import { RecentBuildsPanel } from "../components/recent-builds-panel";

export default function HomePage() {
  return (
    <main>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>PoB Codes</h1>
      </div>
      <BuildCodeForm />
      <RecentBuildsPanel />
    </main>
  );
}
