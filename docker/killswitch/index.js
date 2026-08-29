import { CloudBillingClient } from '@google-cloud/billing';

const billing = new CloudBillingClient();
const projectName = `projects/${process.env.GCP_PROJECT}`;

/**
 * Emergency brake for delayed budget notifications.
 * This reduces further spend; it cannot guarantee zero cost because billing
 * data and Pub/Sub notifications arrive after usage has occurred.
 */
export const stopBilling = async (message) => {
  const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
  console.log('budget event', data);

  if (!data.costAmount || data.costAmount <= data.budgetAmount) return;

  const [info] = await billing.getProjectBillingInfo({ name: projectName });
  if (!info.billingAccountName) return;

  await billing.updateProjectBillingInfo({
    name: projectName,
    projectBillingInfo: { billingAccountName: '' },
  });
  console.error(`Billing detached from ${projectName}. All billable services will stop.`);
};
