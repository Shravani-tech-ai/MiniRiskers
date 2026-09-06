import { Link } from "react-router-dom";

function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">

      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-8 py-4">

          <Link
            to="/"
            className="text-xl font-bold text-slate-900"
          >
            MiniRiskers
          </Link>

          <div className="text-sm text-slate-500">
            FCRM Risk Assessment Workbench
          </div>

        </div>
      </header>

      <main>
        {children}
      </main>

    </div>
  );
}

export default MainLayout;