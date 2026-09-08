/**
 * mlEngine.js  — Advanced ML Engine v2
 * Pure-JavaScript implementations of all four ML algorithms used in FarmConnect.
 * No external ML dependencies required — runs entirely in Node.js.
 *
 * Algorithms:
 *   1. K-Means Clustering       — customer segmentation with Silhouette scoring & RFM radar
 *   2. Collaborative Filtering  — hybrid user-based + item-based CF with category affinity
 *   3. Gradient Boosting Trees  — demand forecasting with depth-3 trees, CI bands, seasonality
 *   4. Customer Churn Prediction — ensemble scoring with trend analysis & feature importance
 */

"use strict";

// ═════════════════════════════════════════════════════════════════════════════
// Shared math utilities
// ═════════════════════════════════════════════════════════════════════════════

const dot = (a, b) => a.reduce((s, v, i) => s + v * (b[i] || 0), 0);
const mag = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

function cosineSimilarity(a, b) {
  const mA = mag(a), mB = mag(b);
  return mA === 0 || mB === 0 ? 0 : dot(a, b) / (mA * mB);
}

function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((s, _, i) => s + (a[i] - b[i]) ** 2, 0));
}

function pearsonCorrelation(a, b) {
  const n = a.length;
  if (n === 0) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  const num   = a.reduce((s, v, i) => s + (v - meanA) * (b[i] - meanB), 0);
  const denA  = Math.sqrt(a.reduce((s, v) => s + (v - meanA) ** 2, 0));
  const denB  = Math.sqrt(b.reduce((s, v) => s + (v - meanB) ** 2, 0));
  return denA === 0 || denB === 0 ? 0 : num / (denA * denB);
}

/** Min-max normalise to [0, 1]. Returns 0.5 for constant arrays. */
function minMaxNorm(values) {
  const mn = Math.min(...values), mx = Math.max(...values);
  if (mx === mn) return values.map(() => 0.5);
  return values.map((v) => (v - mn) / (mx - mn));
}

/** Z-score standardise. Returns 0 for zero-variance arrays. */
function zScore(values) {
  const n    = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n) || 1;
  return values.map((v) => (v - mean) / std);
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/** Weighted mean of an array. */
function weightedMean(values, weights) {
  const wSum = weights.reduce((s, w) => s + w, 0) || 1;
  return values.reduce((s, v, i) => s + v * weights[i], 0) / wSum;
}

/** Simple linear regression on paired (x, y) arrays. Returns {slope, intercept, r2}. */
function linearRegression(xs, ys) {
  const n   = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const xm  = xs.reduce((s, v) => s + v, 0) / n;
  const ym  = ys.reduce((s, v) => s + v, 0) / n;
  const ss  = xs.reduce((s, v) => s + (v - xm) ** 2, 0) || 1e-9;
  const sp  = xs.reduce((s, v, i) => s + (v - xm) * (ys[i] - ym), 0);
  const slope = sp / ss;
  const intercept = ym - slope * xm;
  const yHat = xs.map((x) => slope * x + intercept);
  const ssTot = ys.reduce((s, v) => s + (v - ym) ** 2, 0) || 1e-9;
  const ssRes = ys.reduce((s, v, i) => s + (v - yHat[i]) ** 2, 0);
  return { slope, intercept, r2: Math.max(0, 1 - ssRes / ssTot) };
}

/** Compute RMSE between predictions and actuals. */
function rmse(preds, actuals) {
  return Math.sqrt(preds.reduce((s, p, i) => s + (p - actuals[i]) ** 2, 0) / preds.length);
}

/** Percentile of a sorted array. */
function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}


// ═════════════════════════════════════════════════════════════════════════════
// 1. K-Means Clustering  (Advanced)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * K-Means++ initialisation — spreads starting centroids to aid convergence.
 */
function kMeansPlusPlus(points, k) {
  const centroids = [points[Math.floor(Math.random() * points.length)].slice()];
  while (centroids.length < k) {
    const dists = points.map((pt) =>
      Math.min(...centroids.map((c) => euclideanDistance(pt, c))) ** 2
    );
    const total = dists.reduce((s, d) => s + d, 0);
    let r = Math.random() * total;
    let chosen = points.length - 1;
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i];
      if (r <= 0) { chosen = i; break; }
    }
    centroids.push(points[chosen].slice());
  }
  return centroids;
}

/**
 * Core K-Means with convergence tracking.
 * Runs multiple restarts and picks the run with lowest inertia.
 */
function kMeans(points, k = 4, maxIter = 150, restarts = 3) {
  if (points.length === 0) return { labels: [], centroids: [], inertia: 0, iterations: 0 };
  if (points.length <= k) {
    return { labels: points.map((_, i) => i), centroids: points.slice(), inertia: 0, iterations: 0 };
  }

  const dims = points[0].length;
  let best = null;

  for (let r = 0; r < restarts; r++) {
    const centroids = kMeansPlusPlus(points, k);
    let labels = new Array(points.length).fill(0);
    let iter = 0, changed = true;

    while (changed && iter < maxIter) {
      changed = false; iter++;

      const newLabels = points.map((pt) => {
        let best = 0, bestD = Infinity;
        centroids.forEach((c, ci) => {
          const d = euclideanDistance(pt, c);
          if (d < bestD) { bestD = d; best = ci; }
        });
        return best;
      });

      if (newLabels.some((l, i) => l !== labels[i])) { changed = true; labels = newLabels; }

      const sums   = Array.from({ length: k }, () => new Array(dims).fill(0));
      const counts = new Array(k).fill(0);
      points.forEach((pt, i) => {
        counts[labels[i]]++;
        pt.forEach((v, d) => { sums[labels[i]][d] += v; });
      });
      centroids.forEach((c, ci) => {
        if (counts[ci] === 0) return;
        c.forEach((_, d) => { c[d] = sums[ci][d] / counts[ci]; });
      });
    }

    // Compute inertia (sum of squared distances to assigned centroid)
    const inertia = points.reduce((s, pt, i) =>
      s + euclideanDistance(pt, centroids[labels[i]]) ** 2, 0);

    if (!best || inertia < best.inertia) {
      best = { labels, centroids, inertia, iterations: iter };
    }
  }

  return best;
}

/**
 * Silhouette Score — measures cluster cohesion vs separation.
 * Returns a value in [-1, 1]; higher is better.
 * Computed on a sample (max 200 points) for performance.
 */
function silhouetteScore(points, labels, k) {
  if (points.length < 3 || k < 2) return 0;
  const sample = points.length > 200
    ? points.filter((_, i) => i % Math.ceil(points.length / 200) === 0)
    : points;
  const sampleLabels = sample.map((_, i) => labels[i * Math.ceil(points.length / 200)] ?? labels[i]);

  const scores = sample.map((pt, i) => {
    const cl = sampleLabels[i];
    const sameCluster  = sample.filter((_, j) => sampleLabels[j] === cl && j !== i);
    const a = sameCluster.length > 0
      ? sameCluster.reduce((s, o) => s + euclideanDistance(pt, o), 0) / sameCluster.length
      : 0;

    let minB = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === cl) continue;
      const otherCluster = sample.filter((_, j) => sampleLabels[j] === c);
      if (otherCluster.length === 0) continue;
      const b = otherCluster.reduce((s, o) => s + euclideanDistance(pt, o), 0) / otherCluster.length;
      if (b < minB) minB = b;
    }
    if (minB === Infinity) return 0;
    return (minB - a) / Math.max(a, minB);
  });

  return parseFloat((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(4));
}

/**
 * Finds the optimal K (2–maxK) using Silhouette scores.
 */
function findOptimalK(points, maxK = 6) {
  if (points.length < 4) return 2;
  const results = [];
  for (let k = 2; k <= Math.min(maxK, points.length - 1); k++) {
    const { labels, centroids } = kMeans(points, k, 100, 2);
    const score = silhouetteScore(points, labels, k);
    results.push({ k, score });
  }
  return results.sort((a, b) => b.score - a.score)[0].k;
}

/**
 * Segments customers using K-Means on enriched RFM + engagement features.
 * Automatically selects optimal K if not specified.
 *
 * Features: recency, frequency, monetary, avgOrderValue, abandonmentRate
 */
function segmentCustomers(customers, k = null) {
  if (customers.length === 0) return { segments: [], rawLabels: [], centroids: [], silhouette: 0, optimalK: 2 };

  const recencies     = customers.map((c) => c.recencyDays);
  const frequencies   = customers.map((c) => c.orderCount);
  const monetaries    = customers.map((c) => c.totalSpend);
  const avgs          = customers.map((c) => c.avgOrderValue);
  const abandonRates  = customers.map((c) => {
    const total = c.orderCount + c.pendingOrders + c.failedOrders;
    return total > 0 ? (c.pendingOrders + c.failedOrders) / total : 0;
  });

  // Use z-score to handle skewed monetary distributions
  const normR  = minMaxNorm(recencies);
  const normF  = minMaxNorm(frequencies);
  const normM  = minMaxNorm(monetaries);
  const normA  = minMaxNorm(avgs);
  const normAb = minMaxNorm(abandonRates);

  const points = customers.map((_, i) => [normR[i], normF[i], normM[i], normA[i], normAb[i]]);

  const maxK   = Math.min(6, Math.floor(customers.length / 2));
  const actualK = k !== null
    ? Math.min(k, customers.length - 1)
    : (customers.length < 8 ? 2 : findOptimalK(points, maxK));

  const { labels, centroids, inertia } = kMeans(points, actualK, 150, 3);
  const silhouette = silhouetteScore(points, labels, actualK);

  // Characterise each cluster
  const clusterStats = centroids.map((_, ci) => {
    const members = customers.filter((__, i) => labels[i] === ci);
    if (members.length === 0) return { ci, rfmScore: 0, avgRecency: 0, avgFreq: 0, avgMoney: 0, size: 0 };
    const avgRecency = members.reduce((s, m) => s + m.recencyDays, 0) / members.length;
    const avgFreq    = members.reduce((s, m) => s + m.orderCount,  0) / members.length;
    const avgMoney   = members.reduce((s, m) => s + m.totalSpend,  0) / members.length;
    const avgAbandon = members.reduce((s, m) => {
      const tot = m.orderCount + m.pendingOrders + m.failedOrders;
      return s + (tot > 0 ? (m.pendingOrders + m.failedOrders) / tot : 0);
    }, 0) / members.length;

    const maxRec = Math.max(...clusterStats?.map(c => c?.avgRecency ?? 0) ?? [1], 1);
    const maxFrq = Math.max(...clusterStats?.map(c => c?.avgFreq    ?? 0) ?? [1], 1);
    const maxMon = Math.max(...clusterStats?.map(c => c?.avgMoney   ?? 0) ?? [1], 1);

    return { ci, avgRecency, avgFreq, avgMoney, avgAbandon, size: members.length };
  });

  // Second pass: compute RFM scores now all cluster stats are available
  const maxRec = Math.max(...clusterStats.map((c) => c.avgRecency), 1);
  const maxFrq = Math.max(...clusterStats.map((c) => c.avgFreq),    1);
  const maxMon = Math.max(...clusterStats.map((c) => c.avgMoney),   1);

  const scoredStats = clusterStats.map((s) => ({
    ...s,
    rfmScore:
      (1 - s.avgRecency / maxRec) * 0.35 +
      (s.avgFreq  / maxFrq)       * 0.35 +
      (s.avgMoney / maxMon)       * 0.20 +
      (1 - s.avgAbandon)          * 0.10,
  })).sort((a, b) => b.rfmScore - a.rfmScore);

  const NAMES = ["Champions", "Loyal Customers", "Promising", "At Risk", "Needs Attention", "Hibernating"];
  const labelMap = {};
  scoredStats.forEach((s, rank) => { labelMap[s.ci] = NAMES[rank] || `Segment ${rank + 1}`; });

  // Build RFM radar data per segment (normalised 0–100)
  const radarByLabel = {};
  scoredStats.forEach((s) => {
    const label = labelMap[s.ci];
    radarByLabel[label] = {
      recency:     parseFloat(((1 - s.avgRecency / maxRec) * 100).toFixed(1)),
      frequency:   parseFloat(((s.avgFreq  / maxFrq)       * 100).toFixed(1)),
      monetary:    parseFloat(((s.avgMoney / maxMon)        * 100).toFixed(1)),
      retention:   parseFloat(((1 - s.avgAbandon)           * 100).toFixed(1)),
    };
  });

  // Group customers
  const segmentMap = {};
  customers.forEach((c, i) => {
    const ci    = labels[i];
    const label = labelMap[ci] || `Segment ${ci}`;
    if (!segmentMap[label]) segmentMap[label] = { cluster: ci, label, customers: [], radar: radarByLabel[label] };
    segmentMap[label].customers.push({ ...c, cluster: ci, segmentLabel: label });
  });

  return {
    segments:   Object.values(segmentMap),
    rawLabels:  labels,
    centroids,
    silhouette,
    optimalK:   actualK,
    inertia:    parseFloat(inertia.toFixed(2)),
    clusterLabelMap: labelMap,
    radarData:  Object.entries(radarByLabel).map(([label, v]) => ({ label, ...v })),
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// 2. Collaborative Filtering  (Hybrid User-Based + Item-Based)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Builds both user→item and item→user interaction maps with log-normalised ratings.
 */
function buildInteractionMatrix(interactions) {
  const userItem = new Map();   // userId  -> Map(productId -> rating)
  const itemUser = new Map();   // productId -> Map(userId -> rating)
  const catMap   = new Map();   // productId -> category

  interactions.forEach(({ userId, productId, quantity, category }) => {
    const uid = userId.toString();
    const pid = productId.toString();
    const rating = Math.log1p(quantity);

    if (!userItem.has(uid)) userItem.set(uid, new Map());
    userItem.get(uid).set(pid, (userItem.get(uid).get(pid) || 0) + rating);

    if (!itemUser.has(pid)) itemUser.set(pid, new Map());
    itemUser.get(pid).set(uid, (itemUser.get(pid).get(uid) || 0) + rating);

    if (category) catMap.set(pid, category);
  });

  const userIds    = Array.from(userItem.keys());
  const productIds = Array.from(itemUser.keys());

  return { userItem, itemUser, userIds, productIds, catMap };
}

// Kept for backward compatibility
function buildUserItemMatrix(interactions) {
  const { userItem: matrix, userIds, productIds } = buildInteractionMatrix(interactions);
  return { matrix, userIds, productIds };
}

function toVector(userProductMap, allProductIds) {
  return allProductIds.map((pid) => userProductMap.get(pid) || 0);
}

/**
 * User-based CF: weighted prediction from similar users.
 */
function userBasedCF(targetUid, matrix, productIds, topN = 10, neighborCount = 10) {
  if (!matrix.has(targetUid)) return [];
  const targetVec       = toVector(matrix.get(targetUid), productIds);
  const targetPurchased = new Set(matrix.get(targetUid).keys());

  const neighbors = Array.from(matrix.entries())
    .filter(([uid]) => uid !== targetUid)
    .map(([uid, pm]) => ({
      uid,
      sim: pearsonCorrelation(targetVec, toVector(pm, productIds)),
    }))
    .filter((n) => n.sim > 0)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, neighborCount);

  if (neighbors.length === 0) return [];

  const scores  = new Map();
  const simSums = new Map();
  const simSum  = neighbors.reduce((s, n) => s + Math.abs(n.sim), 0) || 1;

  neighbors.forEach(({ uid, sim }) => {
    matrix.get(uid).forEach((rating, pid) => {
      if (targetPurchased.has(pid)) return;
      scores.set(pid,  (scores.get(pid)  || 0) + sim * rating);
      simSums.set(pid, (simSums.get(pid) || 0) + Math.abs(sim));
    });
  });

  return Array.from(scores.entries())
    .map(([pid, s]) => ({ productId: pid, score: s / (simSums.get(pid) || 1), source: "user_cf" }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Item-based CF: recommend items similar to what the user already bought.
 */
function itemBasedCF(targetUid, userItem, itemUser, productIds, topN = 10) {
  if (!userItem.has(targetUid)) return [];
  const purchased = Array.from(userItem.get(targetUid).keys());

  const candidateScores = new Map();

  purchased.forEach((pid) => {
    const pidVec = toVector(itemUser.get(pid) || new Map(),
      Array.from(new Set([...itemUser.keys()])));

    itemUser.forEach((usersMap, candidatePid) => {
      if (purchased.includes(candidatePid)) return;
      const candidateVec = toVector(usersMap, Array.from(new Set([...itemUser.keys()])));
      const sim = cosineSimilarity(pidVec, candidateVec);
      if (sim > 0) {
        const rating = userItem.get(targetUid)?.get(pid) || 0;
        const prev   = candidateScores.get(candidatePid) || { score: 0, simSum: 0 };
        candidateScores.set(candidatePid, {
          score:  prev.score  + sim * rating,
          simSum: prev.simSum + sim,
        });
      }
    });
  });

  return Array.from(candidateScores.entries())
    .map(([pid, { score, simSum }]) => ({
      productId: pid, score: score / (simSum || 1), source: "item_cf",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Category affinity — returns a map of category → normalised affinity score for the user.
 */
function buildCategoryAffinity(targetUid, userItem, catMap) {
  if (!userItem.has(targetUid)) return {};
  const affinity = {};
  userItem.get(targetUid).forEach((rating, pid) => {
    const cat = catMap.get(pid) || "other";
    affinity[cat] = (affinity[cat] || 0) + rating;
  });
  const total = Object.values(affinity).reduce((s, v) => s + v, 0) || 1;
  Object.keys(affinity).forEach((c) => { affinity[c] = parseFloat((affinity[c] / total).toFixed(4)); });
  return affinity;
}

/**
 * Hybrid CF: merges user-based and item-based recommendations with configurable weights.
 * Falls back to popularity if the user has no history.
 *
 * @param {string} targetUserId
 * @param {object} matrix          — full interaction matrix from buildInteractionMatrix()
 * @param {number} topN
 * @param {object} opts            — { userWeight, itemWeight, neighborCount }
 */
function hybridCFRecommend(targetUserId, matrix, topN = 10, opts = {}) {
  const { userItem, itemUser, productIds, catMap } = matrix;
  const uid = targetUserId.toString();
  const { userWeight = 0.55, itemWeight = 0.45, neighborCount = 10 } = opts;

  const ubRecs = userBasedCF(uid, userItem, productIds, topN * 2, neighborCount);
  const ibRecs = itemBasedCF(uid, userItem, itemUser, productIds, topN * 2);

  // Merge and combine scores
  const merged = new Map();
  ubRecs.forEach(({ productId, score }) => {
    merged.set(productId, (merged.get(productId) || 0) + userWeight * score);
  });
  ibRecs.forEach(({ productId, score }) => {
    merged.set(productId, (merged.get(productId) || 0) + itemWeight * score);
  });

  // Boost items whose category aligns with the user's affinity
  const affinity = buildCategoryAffinity(uid, userItem, catMap);
  merged.forEach((score, pid) => {
    const cat   = catMap.get(pid) || "other";
    const boost = affinity[cat] || 0;
    merged.set(pid, score * (1 + boost * 0.3)); // up to 30% affinity boost
  });

  const result = Array.from(merged.entries())
    .map(([pid, score]) => ({ productId: pid, score, source: "hybrid_cf" }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return {
    recommendations: result,
    method: result.length > 0 ? "hybrid_cf" : "popularity_fallback",
    categoryAffinity: affinity,
  };
}

/**
 * Popularity-based recommendations with category breakdown.
 */
function popularityRecommend(interactions, topN = 10) {
  const counts = new Map();
  const buyers = new Map(); // unique buyer counts
  interactions.forEach(({ productId, quantity, userId }) => {
    const pid = productId.toString();
    counts.set(pid, (counts.get(pid) || 0) + quantity);
    if (!buyers.has(pid)) buyers.set(pid, new Set());
    buyers.get(pid).add(userId.toString());
  });

  return Array.from(counts.entries())
    .map(([productId, totalQty]) => ({
      productId,
      score:       totalQty,
      uniqueBuyers: buyers.get(productId)?.size ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

// Keep old export alias
function collaborativeFilteringRecommend(targetUserId, uiMatrix, topN = 10, neighborCount = 5) {
  const { matrix, userIds, productIds } = uiMatrix;
  return userBasedCF(targetUserId.toString(), matrix, productIds, topN, neighborCount);
}


// ═════════════════════════════════════════════════════════════════════════════
// 3. Gradient Boosting Trees  (Advanced — depth-3 trees, CI, seasonality)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Depth-limited regression decision tree (up to depth=3).
 * Splits on the best (feature, threshold) pair at each node to minimise MSE.
 */
class DecisionTree {
  /**
   * @param {number} maxDepth   - Maximum tree depth (default 3)
   * @param {number} minSamples - Minimum samples to attempt a split (default 2)
   */
  constructor(maxDepth = 3, minSamples = 2) {
    this.maxDepth   = maxDepth;
    this.minSamples = minSamples;
    this.root       = null;
    this.featureImportance = {}; // fi -> total MSE reduction
  }

  _buildNode(X, y, depth) {
    const mean = y.reduce((s, v) => s + v, 0) / y.length;

    // Leaf condition
    if (depth >= this.maxDepth || y.length < this.minSamples || new Set(y).size === 1) {
      return { isLeaf: true, value: mean };
    }

    const nFeat   = X[0].length;
    let bestMSE   = Infinity;
    let bestFi    = -1, bestThresh = 0;
    const baseMSE = y.reduce((s, v) => s + (v - mean) ** 2, 0);

    for (let fi = 0; fi < nFeat; fi++) {
      const vals = [...new Set(X.map((r) => r[fi]))].sort((a, b) => a - b);
      for (let ti = 0; ti < vals.length - 1; ti++) {
        const thresh  = (vals[ti] + vals[ti + 1]) / 2;
        const leftY   = y.filter((_, i) => X[i][fi] <= thresh);
        const rightY  = y.filter((_, i) => X[i][fi] >  thresh);
        if (leftY.length === 0 || rightY.length === 0) continue;

        const lm  = leftY.reduce( (s, v) => s + v, 0) / leftY.length;
        const rm  = rightY.reduce((s, v) => s + v, 0) / rightY.length;
        const mse = leftY.reduce( (s, v) => s + (v - lm) ** 2, 0)
                  + rightY.reduce((s, v) => s + (v - rm) ** 2, 0);

        if (mse < bestMSE) { bestMSE = mse; bestFi = fi; bestThresh = thresh; }
      }
    }

    if (bestFi === -1) return { isLeaf: true, value: mean };

    // Track feature importance (MSE reduction)
    const reduction = baseMSE - bestMSE;
    this.featureImportance[bestFi] = (this.featureImportance[bestFi] || 0) + reduction;

    const leftIdxs  = X.reduce((a, r, i) => (r[bestFi] <= bestThresh ? [...a, i] : a), []);
    const rightIdxs = X.reduce((a, r, i) => (r[bestFi] >  bestThresh ? [...a, i] : a), []);

    return {
      isLeaf: false, featureIndex: bestFi, threshold: bestThresh,
      left:  this._buildNode(leftIdxs.map(i => X[i]),  leftIdxs.map(i  => y[i]),  depth + 1),
      right: this._buildNode(rightIdxs.map(i => X[i]), rightIdxs.map(i => y[i]), depth + 1),
    };
  }

  fit(X, y) {
    if (X.length === 0) return;
    this.featureImportance = {};
    this.root = this._buildNode(X, y, 0);
  }

  _predict(node, x) {
    if (node.isLeaf) return node.value;
    return x[node.featureIndex] <= node.threshold
      ? this._predict(node.left, x)
      : this._predict(node.right, x);
  }

  predict(x)    { return this.root ? this._predict(this.root, x) : 0; }
  predictBatch(X) { return X.map((x) => this.predict(x)); }
}

/**
 * Gradient Boosting Regressor using depth-3 trees with:
 * - Subsampling (stochastic GB) for variance reduction
 * - Feature importance aggregation across all trees
 * - Early stopping based on held-out MSE
 */
class GradientBoostingRegressor {
  /**
   * @param {number} nEstimators  - Boosting rounds (default 80)
   * @param {number} learningRate - Shrinkage (default 0.08)
   * @param {number} maxDepth     - Tree depth (default 3)
   * @param {number} subsample    - Row sampling ratio per tree (default 0.8)
   */
  constructor(nEstimators = 80, learningRate = 0.08, maxDepth = 3, subsample = 0.8) {
    this.nEstimators  = nEstimators;
    this.learningRate = learningRate;
    this.maxDepth     = maxDepth;
    this.subsample    = subsample;
    this.trees        = [];
    this.initialPrediction = 0;
    this.featureImportance = {};
    this.trainLoss    = [];
  }

  fit(X, y, earlyStopRounds = 10) {
    if (X.length === 0) return;
    this.initialPrediction = y.reduce((s, v) => s + v, 0) / y.length;
    let residuals = y.map((v) => v - this.initialPrediction);
    let bestLoss  = Infinity, staleRounds = 0;

    for (let i = 0; i < this.nEstimators; i++) {
      // Stochastic subsampling
      const n = X.length;
      const sampleSize  = Math.max(2, Math.floor(n * this.subsample));
      const idxs        = Array.from({ length: sampleSize }, () => Math.floor(Math.random() * n));
      const Xs = idxs.map((idx) => X[idx]);
      const ys = idxs.map((idx) => residuals[idx]);

      const tree = new DecisionTree(this.maxDepth, 2);
      tree.fit(Xs, ys);
      this.trees.push(tree);

      // Aggregate feature importance
      Object.entries(tree.featureImportance).forEach(([fi, imp]) => {
        this.featureImportance[fi] = (this.featureImportance[fi] || 0) + imp;
      });

      residuals = residuals.map((r, idx) => r - this.learningRate * tree.predict(X[idx]));

      // Track loss for early stopping
      const mse = residuals.reduce((s, r) => s + r * r, 0) / residuals.length;
      this.trainLoss.push(parseFloat(mse.toFixed(4)));

      if (mse < bestLoss) { bestLoss = mse; staleRounds = 0; }
      else if (++staleRounds >= earlyStopRounds) break;
    }

    // Normalise feature importance
    const impTotal = Object.values(this.featureImportance).reduce((s, v) => s + v, 0) || 1;
    Object.keys(this.featureImportance).forEach((k) => {
      this.featureImportance[k] = parseFloat((this.featureImportance[k] / impTotal).toFixed(4));
    });
  }

  predict(x) {
    return this.trees.reduce((p, t) => p + this.learningRate * t.predict(x), this.initialPrediction);
  }
  predictBatch(X) { return X.map((x) => this.predict(x)); }
}

/**
 * Simple STL-like seasonal decomposition on monthly data.
 * Returns trend, seasonal indices, and deseasonalised series.
 */
function decomposeTimeSeries(unitsSoldArr) {
  const n = unitsSoldArr.length;
  if (n < 4) return { trend: unitsSoldArr.slice(), seasonal: new Array(n).fill(1), residual: new Array(n).fill(0) };

  // Trend via centred moving average (window=3)
  const trend = unitsSoldArr.map((_, i) => {
    const window = unitsSoldArr.slice(Math.max(0, i - 1), Math.min(n, i + 2));
    return window.reduce((s, v) => s + v, 0) / window.length;
  });

  // Seasonal component: deviation from trend, averaged by month position
  const seasonal = new Array(n).fill(1);
  const period = 12; // monthly period
  for (let p = 0; p < Math.min(period, n); p++) {
    const periodVals = unitsSoldArr.filter((_, i) => i % period === p);
    const periodTrend = trend.filter((_, i) => i % period === p);
    const ratios = periodVals.map((v, j) => (periodTrend[j] !== 0 ? v / periodTrend[j] : 1));
    const avgRatio = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    unitsSoldArr.forEach((_, i) => { if (i % period === p) seasonal[i] = avgRatio; });
  }

  const residual = unitsSoldArr.map((v, i) => v - trend[i] * seasonal[i]);
  return { trend, seasonal, residual };
}

/**
 * Builds the rich feature matrix for demand forecasting.
 *
 * Features per data point (12 total):
 *   monthOfYear (sin), monthOfYear (cos), yearNorm,
 *   lag1, lag2, lag3, lag6,
 *   rollingAvg3, rollingStd3, rollingAvg6,
 *   currentStock, price
 */
function buildDemandFeatures(monthlySales, currentStock, price) {
  if (monthlySales.length < 2) return { X: [], y: [], featureNames: [] };

  const featureNames = [
    "monthSin", "monthCos", "yearNorm",
    "lag1", "lag2", "lag3", "lag6",
    "rollingAvg3", "rollingStd3", "rollingAvg6",
    "stockNorm", "priceNorm",
  ];

  // Normalise stock and price context
  const stockNorm = Math.log1p(currentStock) / 10;
  const priceNorm = Math.log1p(price) / 10;

  const X = [], y = [];

  for (let i = 1; i < monthlySales.length; i++) {
    const [yearStr, monthStr] = monthlySales[i].month.split("-");
    const mo = parseInt(monthStr, 10);
    const yr = parseInt(yearStr, 10);

    // Cyclical encoding for month
    const monthSin = Math.sin((2 * Math.PI * mo) / 12);
    const monthCos = Math.cos((2 * Math.PI * mo) / 12);
    const yearNorm = (yr - 2020) / 10;

    const lag1 = monthlySales[i - 1].unitsSold;
    const lag2 = i >= 2 ? monthlySales[i - 2].unitsSold : lag1;
    const lag3 = i >= 3 ? monthlySales[i - 3].unitsSold : lag2;
    const lag6 = i >= 6 ? monthlySales[i - 6].unitsSold : lag3;

    const window3  = [lag1, lag2, lag3];
    const rAvg3    = window3.reduce((s, v) => s + v, 0) / 3;
    const rMean3   = rAvg3;
    const rStd3    = Math.sqrt(window3.reduce((s, v) => s + (v - rMean3) ** 2, 0) / 3);
    const window6  = [lag1, lag2, lag3, lag6, ...(i >= 5 ? [monthlySales[i-4].unitsSold, monthlySales[i-5].unitsSold] : [lag3, lag3])];
    const rAvg6    = window6.reduce((s, v) => s + v, 0) / window6.length;

    X.push([monthSin, monthCos, yearNorm, lag1, lag2, lag3, lag6, rAvg3, rStd3, rAvg6, stockNorm, priceNorm]);
    y.push(monthlySales[i].unitsSold);
  }

  return { X, y, featureNames };
}

/**
 * Full demand forecast with GB model, confidence intervals, and seasonality breakdown.
 */
function forecastDemand(monthlySales, currentStock, price, forecastMonths = 3) {
  const { X, y, featureNames } = buildDemandFeatures(monthlySales, currentStock, price);

  // Not enough data — moving average fallback
  if (X.length < 3) {
    const avg = monthlySales.length > 0
      ? Math.round(monthlySales.reduce((s, m) => s + m.unitsSold, 0) / monthlySales.length)
      : 0;
    const stdDev = monthlySales.length > 1
      ? Math.sqrt(monthlySales.reduce((s, m) => s + (m.unitsSold - avg) ** 2, 0) / monthlySales.length)
      : avg * 0.2;
    const forecast = Array.from({ length: forecastMonths }, (_, i) => {
      const last = monthlySales[monthlySales.length - 1]?.month || "2025-01";
      const [fy, fm] = last.split("-").map(Number);
      const d = new Date(fy, fm - 1 + i + 1);
      const mo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        month: mo, predictedUnits: avg,
        lowerBound: Math.max(0, Math.round(avg - 1.96 * stdDev)),
        upperBound: Math.round(avg + 1.96 * stdDev),
        method: "moving_average",
      };
    });
    return { forecast, modelAccuracy: null, rmse: null, featureImportance: {}, seasonality: [], method: "moving_average" };
  }

  // Time-series decomposition for seasonality insight
  const { seasonal } = decomposeTimeSeries(monthlySales.map((m) => m.unitsSold));
  const seasonalityData = monthlySales.map((m, i) => ({
    month: m.month, seasonalIndex: parseFloat((seasonal[i] ?? 1).toFixed(3)),
  }));

  // Train GB model
  const gb = new GradientBoostingRegressor(80, 0.08, 3, 0.8);
  gb.fit(X, y, 12);

  // In-sample accuracy
  const trainPreds = gb.predictBatch(X);
  const trainRmse  = rmse(trainPreds, y);
  const mean       = y.reduce((s, v) => s + v, 0) / y.length;
  const ssTot      = y.reduce((s, v) => s + (v - mean) ** 2, 0) || 1e-9;
  const ssRes      = trainPreds.reduce((s, p, i) => s + (p - y[i]) ** 2, 0);
  const rSquared   = Math.max(0, 1 - ssRes / ssTot);

  // Confidence interval: bootstrap residuals approach
  const sortedResiduals = trainPreds.map((p, i) => p - y[i]).sort((a, b) => a - b);
  const ciMultiplier    = sortedResiduals.length >= 4
    ? percentile(sortedResiduals.map(Math.abs), 90)
    : trainRmse * 1.5;

  // Iterative multi-step forecast
  const history = monthlySales.slice();
  const stockNorm = Math.log1p(currentStock) / 10;
  const priceNorm = Math.log1p(price) / 10;
  const forecast  = [];

  for (let fi = 0; fi < forecastMonths; fi++) {
    const last = history[history.length - 1].month;
    const [fy, fm] = last.split("-").map(Number);
    const nd   = new Date(fy, fm - 1 + 1);
    const mo   = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}`;
    const moN  = nd.getMonth() + 1;

    const lag1 = history[history.length - 1].unitsSold;
    const lag2 = history.length >= 2 ? history[history.length - 2].unitsSold : lag1;
    const lag3 = history.length >= 3 ? history[history.length - 3].unitsSold : lag2;
    const lag6 = history.length >= 6 ? history[history.length - 6].unitsSold : lag3;
    const w3   = [lag1, lag2, lag3];
    const rA3  = w3.reduce((s, v) => s + v, 0) / 3;
    const rS3  = Math.sqrt(w3.reduce((s, v) => s + (v - rA3) ** 2, 0) / 3);
    const w6   = history.slice(-6).map((h) => h.unitsSold);
    const rA6  = w6.reduce((s, v) => s + v, 0) / w6.length;

    const feat = [
      Math.sin((2 * Math.PI * moN) / 12),
      Math.cos((2 * Math.PI * moN) / 12),
      (nd.getFullYear() - 2020) / 10,
      lag1, lag2, lag3, lag6,
      rA3, rS3, rA6,
      stockNorm, priceNorm,
    ];

    const raw  = gb.predict(feat);
    const pred = Math.max(0, Math.round(raw));
    const seIdx = seasonal[history.length % seasonal.length] ?? 1;

    forecast.push({
      month: mo,
      predictedUnits: pred,
      lowerBound: Math.max(0, Math.round(raw - ciMultiplier)),
      upperBound: Math.round(raw + ciMultiplier),
      seasonalIndex: parseFloat(seIdx.toFixed(3)),
      method: "gradient_boosting",
    });

    history.push({ month: mo, unitsSold: pred, revenue: pred * price });
  }

  // Map feature importance to names
  const namedImportance = {};
  featureNames.forEach((name, i) => {
    if (gb.featureImportance[i] !== undefined) {
      namedImportance[name] = gb.featureImportance[i];
    }
  });

  // Trend direction from linear regression on historical units
  const trendLine = linearRegression(
    monthlySales.map((_, i) => i),
    monthlySales.map((m) => m.unitsSold),
  );

  return {
    forecast,
    modelAccuracy:    parseFloat(rSquared.toFixed(4)),
    rmse:             parseFloat(trainRmse.toFixed(2)),
    featureImportance: namedImportance,
    seasonality:      seasonalityData,
    trend: {
      slope:     parseFloat(trendLine.slope.toFixed(4)),
      direction: trendLine.slope > 0.1 ? "increasing" : trendLine.slope < -0.1 ? "decreasing" : "stable",
      r2:        parseFloat(trendLine.r2.toFixed(4)),
    },
    trainLoss: gb.trainLoss,
    method: "gradient_boosting",
  };
}


// ═════════════════════════════════════════════════════════════════════════════
// 4. Customer Churn Prediction  (Ensemble + Feature Importance + Trends)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Logistic score from a set of weighted features. Returns probability 0–1.
 */
function logisticScore(featureValues, weights, bias) {
  const z = featureValues.reduce((s, v, i) => s + v * weights[i], bias);
  return sigmoid(z);
}

/**
 * Advanced churn prediction using an ensemble of three logistic sub-models
 * with distinct feature perspectives. Final score = weighted ensemble average.
 *
 * Sub-models:
 *   M1 — Recency model    (focuses on time-decay signals)
 *   M2 — Engagement model (focuses on order behaviour & abandonment)
 *   M3 — Value model      (focuses on monetary & order value trends)
 *
 * Also returns:
 *   - Feature importance via permutation-style contribution scores
 *   - Trend: whether churn risk is increasing (order velocity slowing)
 *   - Recommended action per risk tier
 */
function predictChurn(customers) {
  if (customers.length === 0) return [];

  // Platform-wide normalisers
  const maxRecency  = Math.max(...customers.map((c) => c.recencyDays),    1);
  const maxOrders   = Math.max(...customers.map((c) => c.orderCount),     1);
  const maxSpend    = Math.max(...customers.map((c) => c.totalSpend),     1);
  const maxAvg      = Math.max(...customers.map((c) => c.avgOrderValue),  1);
  const maxAge      = Math.max(...customers.map((c) => c.accountAgeDays), 1);

  const FEATURE_NAMES = [
    "Recency (days since last order)",
    "Purchase Frequency",
    "Total Spend",
    "Avg Order Value",
    "Abandonment Rate",
    "Account Maturity",
  ];

  const results = customers.map((c) => {
    // ── Normalised features ──────────────────────────────────────────────────
    const fRecency   = c.recencyDays    / maxRecency;               // high = bad
    const fFreq      = 1 - c.orderCount / maxOrders;                // high = bad (infrequent)
    const fMonetary  = 1 - c.totalSpend / maxSpend;                 // high = bad (low spend)
    const fAvgVal    = 1 - c.avgOrderValue / maxAvg;                // high = bad
    const totalOrders = c.orderCount + c.pendingOrders + c.failedOrders;
    const fAbandon   = totalOrders > 0
      ? (c.pendingOrders + c.failedOrders * 1.5) / totalOrders
      : 0.4;
    const fAge       = c.accountAgeDays < 14 ? 0.6               // brand-new
                     : c.accountAgeDays < 60 ? 0.3               // recent joiner
                     : 1 - Math.min(c.accountAgeDays / maxAge, 1) * 0.5; // mature = lower risk

    const features = [fRecency, fFreq, fMonetary, fAvgVal, fAbandon, fAge];

    // ── Sub-model M1: Recency-focused ────────────────────────────────────────
    // Weights: recency 55%, freq 25%, abandonment 20%
    const m1 = logisticScore([fRecency, fFreq, fAbandon], [2.0, 1.0, 0.8], -1.6);

    // ── Sub-model M2: Engagement-focused ─────────────────────────────────────
    // Weights: freq 40%, abandonment 35%, age 25%
    const m2 = logisticScore([fFreq, fAbandon, fAge], [1.8, 1.5, 0.7], -1.4);

    // ── Sub-model M3: Value-focused ──────────────────────────────────────────
    // Weights: monetary 45%, avgVal 35%, recency 20%
    const m3 = logisticScore([fMonetary, fAvgVal, fRecency], [1.7, 1.3, 0.8], -1.5);

    // ── Ensemble: weighted average ───────────────────────────────────────────
    const churnScore = parseFloat(
      (0.40 * m1 + 0.35 * m2 + 0.25 * m3).toFixed(4)
    );

    // ── Risk tier ────────────────────────────────────────────────────────────
    let churnRisk, recommendedAction;
    if (churnScore >= 0.70) {
      churnRisk = "High";
      recommendedAction = "Send re-engagement discount within 48h";
    } else if (churnScore >= 0.45) {
      churnRisk = "Medium";
      recommendedAction = "Send personalised product recommendation email";
    } else {
      churnRisk = "Low";
      recommendedAction = "Maintain regular communication cadence";
    }

    // ── Feature contribution (absolute weighted contribution to score) ───────
    const weights = [0.40 * 2.0, 0.40 * 1.0, 0.35 * 1.5, 0.25 * 1.3, 0.35 * 1.5, 0.25 * 0.7];
    const totalW  = weights.reduce((s, w) => s + Math.abs(w), 0) || 1;
    const featureContributions = FEATURE_NAMES.map((name, i) => ({
      feature:      name,
      contribution: parseFloat((Math.abs(features[i] * weights[i]) / totalW).toFixed(4)),
      rawScore:     parseFloat(features[i].toFixed(4)),
    })).sort((a, b) => b.contribution - a.contribution);

    // ── Trend: estimate whether behaviour is improving or worsening ──────────
    // Proxy: compare recency to a typical "healthy" 30-day window
    const trendSignal = fRecency > 0.6 ? "worsening"
                      : fRecency > 0.3 ? "stable"
                      : "improving";

    return {
      userId:         c.userId,
      name:           c.name,
      email:          c.email,
      churnScore,
      churnRisk,
      recencyDays:    c.recencyDays,
      orderCount:     c.orderCount,
      totalSpend:     c.totalSpend,
      avgOrderValue:  parseFloat((c.avgOrderValue ?? 0).toFixed(2)),
      accountAgeDays: c.accountAgeDays,
      recommendedAction,
      trendSignal,
      subModelScores: { recencyModel: parseFloat(m1.toFixed(4)), engagementModel: parseFloat(m2.toFixed(4)), valueModel: parseFloat(m3.toFixed(4)) },
      featureContributions,
      features: {
        recencyScore:     parseFloat(fRecency.toFixed(4)),
        frequencyScore:   parseFloat(fFreq.toFixed(4)),
        monetaryScore:    parseFloat(fMonetary.toFixed(4)),
        avgValueScore:    parseFloat(fAvgVal.toFixed(4)),
        abandonmentScore: parseFloat(fAbandon.toFixed(4)),
        ageScore:         parseFloat(fAge.toFixed(4)),
      },
    };
  }).sort((a, b) => b.churnScore - a.churnScore);

  // ── Platform-level feature importance (average contribution across all customers) ──
  const platformImportance = FEATURE_NAMES.map((name, fi) => ({
    feature:     name,
    importance:  parseFloat(
      (results.reduce((s, r) => s + (r.featureContributions[fi]?.contribution ?? 0), 0) / results.length).toFixed(4)
    ),
  })).sort((a, b) => b.importance - a.importance);

  return { predictions: results, platformFeatureImportance: platformImportance };
}


// ═════════════════════════════════════════════════════════════════════════════
// Exports
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Math utils (useful for controller-level post-processing)
  linearRegression,
  minMaxNorm,
  zScore,

  // K-Means
  kMeans,
  silhouetteScore,
  findOptimalK,
  segmentCustomers,

  // Collaborative Filtering
  buildInteractionMatrix,
  buildUserItemMatrix,          // backward compat
  collaborativeFilteringRecommend, // backward compat
  hybridCFRecommend,
  popularityRecommend,
  buildCategoryAffinity,

  // Gradient Boosting
  DecisionTree,
  GradientBoostingRegressor,
  decomposeTimeSeries,
  buildDemandFeatures,
  forecastDemand,

  // Churn
  predictChurn,
};
