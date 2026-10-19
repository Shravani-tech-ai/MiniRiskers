import { useEffect, useState } from "react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ROLES, roleLabel } from "../../utils/rolePermissions";
import { formatShortDate } from "../../utils/riskDisplay";
import { Panel, errorText } from "./ui";

function UsersPanel() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/admin/users")
      .then((r) => setUsers(r.data.users))
      .catch(() => setError("Unable to load users."));

  useEffect(() => {
    load();
  }, []);

  const update = async (user, changes) => {
    try {
      setBusyId(user.id);
      setError("");
      const response = await api.patch(`/admin/users/${user.id}`, changes);
      setUsers((list) => list.map((u) => (u.id === user.id ? response.data : u)));
    } catch (err) {
      setError(errorText(err, "Could not update the user."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel
      title="Users"
      subtitle="Change a user's role or deactivate their account. Users signed in with an old role are signed out on their next request."
    >
      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-xs uppercase text-slate-400 dark:text-slate-500">
            <tr>
              <th className="py-2 text-left">User</th>
              <th className="py-2 text-left">Role</th>
              <th className="py-2 text-left">Joined</th>
              <th className="py-2 text-right">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const self = user.id === me?.id;
              return (
                <tr key={user.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {user.full_name} {self && <span className="text-xs text-slate-500">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.username} · {user.email}</p>
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      aria-label={`Role for ${user.username}`}
                      value={user.role_retired ? "" : user.role}
                      disabled={self || busyId === user.id}
                      onChange={(e) => update(user, { role: e.target.value })}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900"
                    >
                      {user.role_retired && <option value="">{user.role} (retired, choose a role)</option>}
                      {Object.values(ROLES).map((role) => (
                        <option key={role} value={role}>{roleLabel(role)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{formatShortDate(user.created_at)}</td>
                  <td className="py-2 text-right">
                    <input
                      type="checkbox"
                      aria-label={`${user.username} active`}
                      checked={user.is_active}
                      disabled={self || busyId === user.id}
                      onChange={(e) => update(user, { is_active: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default UsersPanel;
