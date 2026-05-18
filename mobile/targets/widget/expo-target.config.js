/** @type {import('@bacons/apple-targets/app.plugin').Config} */
// Widget Extension da Live Activity (lock screen + Dynamic Island).
// O App Group é espelhado automaticamente do app.json (appGroupsByDefault).
// deploymentTarget 16.1 = mínimo do ActivityKit / Live Activities.
module.exports = {
  type: 'widget',
  name: 'RunWidget',
  deploymentTarget: '16.1',
};
