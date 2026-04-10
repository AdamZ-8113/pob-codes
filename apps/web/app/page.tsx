import Link from "next/link";

import { BuildCodeForm } from "../components/build-code-form";
import { RecentBuildsPanel } from "../components/recent-builds-panel";

export default function HomePage() {
  return (
    <main>
      <div className="home-hero">
        <div>
          <h1 style={{ margin: 0 }}>PoB Codes</h1>
          <div className="meta home-hero-copy">
            Open a PoB code directly, or walk through the guided public-profile import flow.
          </div>
        </div>
        <Link href="/import" className="btn btn-secondary home-import-link">
          Import a Character
        </Link>
      </div>
      <BuildCodeForm />
      <RecentBuildsPanel />
    </main>
  );
}
