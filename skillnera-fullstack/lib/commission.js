// lib/commission.js
import User from "@/models/User.model";
import MLMSettings from "@/models/MLMSettings.model";
import MLMCommission from "@/models/MLMCommission.model";

/**
 * Walk up the referrer chain up to maxLevels.
 * Returns array like [level1User, level2User, ...]
 */
async function getUplineChain(startUserId, maxLevels) {
  const visited = new Set();
  const chain = [];
  let current = await User.findById(startUserId)
    .select("_id referredBy")
    .lean();

  while (current && chain.length < maxLevels) {
    if (!current.referredBy) break;
    const refId = String(current.referredBy);
    if (visited.has(refId)) break; // loop guard
    visited.add(refId);

    const refUser = await User.findById(refId)
      .select("_id referredBy mlmActive")
      .lean();
    if (!refUser) break;

    chain.push(refUser);
    current = refUser;
  }
  return chain;
}

/**
 * Create MLM commissions for an order that just became PAID.
 * Caller supplies:
 *  - order: a Mongoose doc or plain object that includes _id, user (buyer id), etc.
 *  - eligibleAmount: number (what amount to apply percentages on; e.g., subtotal)
 */
export async function createMLMCommissionsForOrder(order, eligibleAmount) {
  // 1) Settings (with sane defaults if not configured yet)
  const s =
    (await MLMSettings.findOne().lean()) || {
      isEnabled: true,
      levels: [
        { level: 1, percent: 5 },
        { level: 2, percent: 3 },
        { level: 3, percent: 2 },
      ],
      minOrderAmount: 0,
      preventSelfReferral: true,
      oneCommissionPerOrder: true,
    };

  if (!s.isEnabled) return { created: 0, reason: "disabled" };
  if (eligibleAmount < (s.minOrderAmount || 0))
    return { created: 0, reason: "below-min" };

  // 2) Prevent duplicates per order
  if (s.oneCommissionPerOrder) {
    const exists = await MLMCommission.findOne({ order: order._id }).lean();
    if (exists) return { created: 0, reason: "already-created" };
  }

  // 3) Buyer and initial referrer
  const buyerId = order.user || order.userId || order.customer; // we will align to your actual Order model in 5b
  if (!buyerId) return { created: 0, reason: "no-buyer" };

  const buyer = await User.findById(buyerId)
    .select("_id referredBy")
    .lean();
  if (!buyer?.referredBy) return { created: 0, reason: "no-referrer" };

  if (s.preventSelfReferral && String(buyer.referredBy) === String(buyerId)) {
    return { created: 0, reason: "self-ref" };
  }

  // 4) Build upline
  const maxLevels = s.levels?.length || 0;
  if (!maxLevels) return { created: 0, reason: "no-levels" };

  const chain = await getUplineChain(buyerId, maxLevels);

  // 5) Create commissions (one per earner per order)
  let created = 0;
  for (let i = 0; i < chain.length; i++) {
    const earner = chain[i];
    if (!earner?.mlmActive) continue;

    const levelCfg = s.levels[i]; // i=0 => level 1
    if (!levelCfg) break;

    const percent = Number(levelCfg.percent || 0);
    if (percent <= 0) continue;

    const amount = Number(((eligibleAmount * percent) / 100).toFixed(2));
    if (amount <= 0) continue;

    await MLMCommission.updateOne(
      { order: order._id, earner: earner._id },
      {
        $setOnInsert: {
          buyer: buyerId,
          level: levelCfg.level,
          baseAmount: eligibleAmount,
          percent,
          amount,
          status: "pending",
        },
      },
      { upsert: true }
    );

    created++;
  }

  return { created };
}
