function ChannelInformation({
  channelForm,
  setChannelForm,
  channelSaved,
  savingChannel,
  saveChannel,
  readOnly = false,
}) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 p-6">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="font-semibold text-slate-900">
              Channel Information
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Identify the channels through which the product
              will be delivered.
            </p>
          </div>

          {channelSaved && (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
              ✓ Saved
            </span>
          )}

        </div>
      </div>

      {/* Form */}
      <div className="p-6">

        {/* Channel Type */}
        <div className="mb-6">

          <label className="text-sm font-medium text-slate-700">
            Channel Type *
          </label>

          <select
            value={channelForm.channel_type}
            onChange={(e) =>
              setChannelForm({
                ...channelForm,
                channel_type: e.target.value,
              })
            }
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 md:w-1/2"
          >
            <option value="DIGITAL">Digital</option>
            <option value="BRANCH">Branch</option>
            <option value="AGENT">Agent</option>
            <option value="API">API</option>
            <option value="THIRD_PARTY">Third Party</option>
          </select>

        </div>

        {/* Channels */}
        <div>

          <p className="mb-3 text-sm font-medium text-slate-700">
            Available Channels
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

            {/* Mobile Banking */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={channelForm.mobile_banking}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    mobile_banking: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Mobile Banking
              </span>
            </label>

            {/* Internet Banking */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={channelForm.internet_banking}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    internet_banking: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Internet Banking
              </span>
            </label>

            {/* Branch */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={channelForm.branch}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    branch: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Branch
              </span>
            </label>

            {/* Agent */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={channelForm.agent}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    agent: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Agent
              </span>
            </label>

            {/* API */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={channelForm.api}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    api: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                API
              </span>
            </label>

            {/* Third Party */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={channelForm.third_party_channel}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    third_party_channel: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Third-Party Channel
              </span>
            </label>

            {/* Remote Onboarding */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={channelForm.remote_onboarding}
                onChange={(e) =>
                  setChannelForm({
                    ...channelForm,
                    remote_onboarding: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />

              <span className="text-sm text-slate-700">
                Remote Onboarding
              </span>
            </label>

          </div>

        </div>

      </div>

      {/* Footer */}
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

        <button
          onClick={saveChannel}
          disabled={readOnly || savingChannel}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingChannel
            ? "Saving..."
            : channelSaved
            ? "Update Channel"
            : "Save Channel"}
        </button>

      </div>

    </div>
  );
}

export default ChannelInformation;