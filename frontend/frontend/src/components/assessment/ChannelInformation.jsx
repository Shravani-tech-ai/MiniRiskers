import { SectionFooter, SectionStatus } from "./SectionControls";

function ChannelInformation({
  channelForm,
  setChannelForm,
  channelSaved,
  savingChannel,
  saveChannel,
  readOnly = false,
  section = {},
}) {
  const locked = readOnly || Boolean(section.locked);

  return (
    <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">

      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Channel Information
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Identify the channels through which the product
              will be delivered.
            </p>
          </div>

          <SectionStatus saved={channelSaved} section={section} />

        </div>
      </div>

      <fieldset disabled={locked} className="min-w-0">
      {/* Form */}
      <div className="p-6">

        {/* Channel Type */}
        <div className="mb-6">

          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
            className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40 md:w-1/2"
          >
            <option value="">Select channel type</option>
            <option value="DIGITAL">Digital</option>
            <option value="BRANCH">Branch</option>
            <option value="AGENT">Agent</option>
            <option value="API">API</option>
            <option value="THIRD_PARTY">Third Party</option>
          </select>

        </div>

        {/* Channels */}
        <div>

          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Available Channels
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

            {/* Mobile Banking */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
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

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Mobile Banking
              </span>
            </label>

            {/* Internet Banking */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
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

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Internet Banking
              </span>
            </label>

            {/* Branch */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
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

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Branch
              </span>
            </label>

            {/* Agent */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
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

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Agent
              </span>
            </label>

            {/* API */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
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

              <span className="text-sm text-slate-700 dark:text-slate-300">
                API
              </span>
            </label>

            {/* Third Party */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
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

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Third-Party Channel
              </span>
            </label>

            {/* Remote Onboarding */}
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
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

              <span className="text-sm text-slate-700 dark:text-slate-300">
                Remote Onboarding
              </span>
            </label>

          </div>

        </div>

      </div>

      </fieldset>

      {/* Footer */}
      <SectionFooter
        section={section}
        saved={channelSaved}
        saving={savingChannel}
        onSave={saveChannel}
        label="Channel"
        readOnly={readOnly}
      />

    </div>
  );
}

export default ChannelInformation;