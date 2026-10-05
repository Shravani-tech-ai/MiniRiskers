import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import AuthHeader from "./AuthHeader";
import { ROLE_CARDS } from "./roleCards";

function RolePicker({ onRoleSelect, notice }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <AuthHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 lg:text-2xl">
            Choose how you want to sign in
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Select your role to continue to the right workflow.
          </p>

          {notice ? (
            <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
              {notice}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ROLE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.role}
                  type="button"
                  onClick={() => onRoleSelect(card.role)}
                  className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500"
                >
                  <div className={`w-fit rounded-lg border p-2.5 ${card.tone}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {card.title}
                  </h3>
                  <p className="mt-1 flex-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
                    {card.description}
                  </p>
                  <span className="mt-5 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white group-hover:bg-blue-700">
                    Login as {card.title}
                    <ArrowRight size={14} />
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
            New here?{" "}
            <Link
              to="/signup"
              className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default RolePicker;
