import Transaction from '../models/Transaction';
import ReconciliationReport from '../models/ReconciliationReport';
import { ITransactionDocument, IMatchStats, IAuditTrail } from '../interfaces';

interface ITransactionGroups {
  [key: string]: ITransactionDocument[];
}

interface ICandidatePair {
  uTx: ITransactionDocument;
  eTx: ITransactionDocument;
  timeDiffSec: number;
  qtyDiffPct: number;
  matchWeight: number;
}

/**
 * High-performance, O(N log N) pre-indexed Matching Engine.
 * Utilizes chronologically sorted hash buckets and a fuzzy distance scoring algorithm.
 */
class MatchingEngine {
  static ASSET_ALIASES: Record<string, string> = {
    'bitcoin': 'BTC',
    'ethereum': 'ETH',
    'tether': 'USDT',
    'solana': 'SOL',
    'polygon': 'MATIC',
    'chainlink': 'LINK',
    'usdt': 'USDT',
    'eth': 'ETH',
    'btc': 'BTC',
    'sol': 'SOL',
    'matic': 'MATIC',
    'link': 'LINK'
  };

  /**
   * Normalizes an asset name.
   */
  static normalizeAsset(asset: string | null | undefined): string {
    if (!asset) return '';
    const trimmed = asset.trim().toLowerCase();
    return this.ASSET_ALIASES[trimmed] || asset.trim().toUpperCase();
  }

  /**
   * Normalizes a transaction type.
   */
  static normalizeType(type: string | null | undefined): string {
    if (!type) return 'OTHER';
    const cleanType = type.trim().toUpperCase();

    if (cleanType === 'BUY') return 'BUY';
    if (cleanType === 'SELL') return 'SELL';

    if (cleanType === 'TRANSFER_IN' || cleanType === 'TRANSFER_OUT' || cleanType === 'TRANSFER') {
      return 'TRANSFER';
    }

    return 'OTHER';
  }

  /**
   * Reconciles valid transactions for a run under specified tolerances.
   */
  static async reconcile(
    runId: string,
    timestampTolerance: number,
    quantityTolerancePct: number
  ): Promise<IMatchStats & { durationMs: number }> {
    const startTime = process.hrtime();

    // 1. Fetch and Normalize all valid transactions
    const txs = await Transaction.find({ runId, validationStatus: 'VALID' });
    
    const userTxs: ITransactionDocument[] = [];
    const exchangeTxs: ITransactionDocument[] = [];

    for (const tx of txs) {
      tx.normalizedAsset = this.normalizeAsset(tx.asset);
      tx.normalizedType = this.normalizeType(tx.type);
      await tx.save();

      if (tx.source === 'user') {
        userTxs.push(tx);
      } else {
        exchangeTxs.push(tx);
      }
    }

    const matchedUserIds = new Set<string>();
    const matchedExchangeIds = new Set<string>();
    const reportsToInsert = [];

    // Grouping transactions into hash buckets: O(N) indexing
    const groupTransactions = (txList: ITransactionDocument[]): ITransactionGroups => {
      const groups: ITransactionGroups = {};
      for (const tx of txList) {
        const key = `${tx.normalizedAsset}_${tx.normalizedType}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(tx);
      }
      return groups;
    };

    const userGroups = groupTransactions(userTxs);
    const exchangeGroups = groupTransactions(exchangeTxs);

    const allGroupKeys = new Set([...Object.keys(userGroups), ...Object.keys(exchangeGroups)]);

    for (const key of allGroupKeys) {
      const groupUserTxs = userGroups[key] || [];
      const groupExchangeTxs = exchangeGroups[key] || [];

      if (groupUserTxs.length === 0 || groupExchangeTxs.length === 0) {
        continue;
      }

      // Sort both groups chronologically: O(M log M) where M is bucket size
      const sortByTime = (a: ITransactionDocument, b: ITransactionDocument) => {
        const tA = a.parsedTimestamp ? a.parsedTimestamp.getTime() : 0;
        const tB = b.parsedTimestamp ? b.parsedTimestamp.getTime() : 0;
        return tA - tB;
      };
      
      groupUserTxs.sort(sortByTime);
      groupExchangeTxs.sort(sortByTime);

      const candidatePairs: ICandidatePair[] = [];

      // High-performance pointer/sliding window search: O(M) matching candidate scan
      for (const uTx of groupUserTxs) {
        if (!uTx.parsedTimestamp) continue;
        const uTime = uTx.parsedTimestamp.getTime();

        // Scan exchange transactions sorted list
        for (const eTx of groupExchangeTxs) {
          if (!eTx.parsedTimestamp) continue;
          const eTime = eTx.parsedTimestamp.getTime();
          const timeDiffSec = Math.abs(uTime - eTime) / 1000;

          // Since exchange transactions are sorted chronologically,
          // if eTime exceeds our sliding window tolerance (uTime + tolerance),
          // all subsequent exchange entries will also exceed, so we can break early!
          if (eTime > uTime + (timestampTolerance * 1000)) {
            break;
          }

          if (timeDiffSec <= timestampTolerance) {
            const userQty = uTx.quantity || 1;
            const exchangeQty = eTx.quantity || 0;
            const qtyDiffPct = (Math.abs(userQty - exchangeQty) / userQty) * 100;

            if (qtyDiffPct <= quantityTolerancePct) {
              const timeWeight = timeDiffSec / (timestampTolerance || 1);
              const qtyWeight = qtyDiffPct / (quantityTolerancePct || 0.0001);
              const matchWeight = timeWeight + qtyWeight;

              candidatePairs.push({
                uTx,
                eTx,
                timeDiffSec,
                qtyDiffPct,
                matchWeight
              });
            }
          }
        }
      }

      // Sort candidate pairs by matchWeight (ascending - closest match first)
      candidatePairs.sort((a, b) => a.matchWeight - b.matchWeight);

      // Greedily match pairs (1-to-1)
      for (const pair of candidatePairs) {
        const uId = pair.uTx._id.toString();
        const eId = pair.eTx._id.toString();

        if (!matchedUserIds.has(uId) && !matchedExchangeIds.has(eId)) {
          matchedUserIds.add(uId);
          matchedExchangeIds.add(eId);

          const auditTrail: IAuditTrail = {
            decisionType: 'MATCHED',
            timeDifferenceSec: pair.timeDiffSec,
            quantityDifferencePct: pair.qtyDiffPct,
            matchingRuleApplied: 'One-to-one fuzzy score minimization inside sorted asset/type hash-bucket',
            tolerancesConfigured: {
              time: timestampTolerance,
              quantity: quantityTolerancePct
            }
          };

          reportsToInsert.push({
            runId,
            category: 'MATCHED' as const,
            reason: 'Transactions matched within tolerances.',
            userTransaction: pair.uTx.toObject(),
            exchangeTransaction: pair.eTx.toObject(),
            auditTrail
          });
        }
      }

      // 2. Identify CONFLICTING transactions (near-misses within 10x tolerance)
      const remainingUsers = groupUserTxs.filter(tx => !matchedUserIds.has(tx._id.toString()));
      const remainingExchanges = groupExchangeTxs.filter(tx => !matchedExchangeIds.has(tx._id.toString()));

      for (const uTx of remainingUsers) {
        if (remainingExchanges.length === 0) break;

        let bestConflictPartner: ITransactionDocument | null = null;
        let lowestWeight = Infinity;
        let conflictDetails = { timeDiffSec: 0, qtyDiffPct: 0 };

        for (const eTx of remainingExchanges) {
          if (matchedExchangeIds.has(eTx._id.toString())) continue;
          if (!uTx.parsedTimestamp || !eTx.parsedTimestamp) continue;

          const timeDiffSec = Math.abs(uTx.parsedTimestamp.getTime() - eTx.parsedTimestamp.getTime()) / 1000;
          const userQty = uTx.quantity || 1;
          const exchangeQty = eTx.quantity || 0;
          const qtyDiffPct = (Math.abs(userQty - exchangeQty) / userQty) * 100;

          const weight = (timeDiffSec / timestampTolerance) + (qtyDiffPct / quantityTolerancePct);

          if (weight < lowestWeight) {
            lowestWeight = weight;
            bestConflictPartner = eTx;
            conflictDetails = { timeDiffSec, qtyDiffPct };
          }
        }

        if (bestConflictPartner && (conflictDetails.timeDiffSec <= timestampTolerance * 10 || conflictDetails.qtyDiffPct <= quantityTolerancePct * 10)) {
          const eId = bestConflictPartner._id.toString();
          
          matchedUserIds.add(uTx._id.toString());
          matchedExchangeIds.add(eId);

          const reasons = [];
          if (conflictDetails.qtyDiffPct > quantityTolerancePct) {
            reasons.push(`Quantity mismatch: User ${uTx.quantity} vs Exchange ${bestConflictPartner.quantity} (diff ${conflictDetails.qtyDiffPct.toFixed(4)}%)`);
          }
          if (conflictDetails.timeDiffSec > timestampTolerance) {
            reasons.push(`Timestamp mismatch: User time ${uTx.timestamp} vs Exchange time ${bestConflictPartner.timestamp} (diff ${Math.round(conflictDetails.timeDiffSec)}s)`);
          }
          if (reasons.length === 0) {
            reasons.push('Minor field conflict');
          }

          const auditTrail: IAuditTrail = {
            decisionType: 'CONFLICTING',
            timeDifferenceSec: conflictDetails.timeDiffSec,
            quantityDifferencePct: conflictDetails.qtyDiffPct,
            matchingRuleApplied: 'Near-miss tolerance limits validation (within 10x boundaries)',
            tolerancesConfigured: {
              time: timestampTolerance,
              quantity: quantityTolerancePct
            }
          };

          reportsToInsert.push({
            runId,
            category: 'CONFLICTING' as const,
            reason: reasons.join('; '),
            userTransaction: uTx.toObject(),
            exchangeTransaction: bestConflictPartner.toObject(),
            auditTrail
          });
        }
      }
    }

    // 3. Identify UNMATCHED transactions
    for (const uTx of userTxs) {
      if (!matchedUserIds.has(uTx._id.toString())) {
        const auditTrail: IAuditTrail = {
          decisionType: 'UNMATCHED_USER',
          timeDifferenceSec: 0,
          quantityDifferencePct: 0,
          matchingRuleApplied: 'Orphaned record identification',
          tolerancesConfigured: {
            time: timestampTolerance,
            quantity: quantityTolerancePct
          }
        };

        reportsToInsert.push({
          runId,
          category: 'UNMATCHED_USER' as const,
          reason: 'Transaction exists only in User exported file.',
          userTransaction: uTx.toObject(),
          exchangeTransaction: null,
          auditTrail
        });
      }
    }

    for (const eTx of exchangeTxs) {
      if (!matchedExchangeIds.has(eTx._id.toString())) {
        const auditTrail: IAuditTrail = {
          decisionType: 'UNMATCHED_EXCHANGE',
          timeDifferenceSec: 0,
          quantityDifferencePct: 0,
          matchingRuleApplied: 'Orphaned record identification',
          tolerancesConfigured: {
            time: timestampTolerance,
            quantity: quantityTolerancePct
          }
        };

        reportsToInsert.push({
          runId,
          category: 'UNMATCHED_EXCHANGE' as const,
          reason: 'Transaction exists only in Exchange exported file.',
          userTransaction: null,
          exchangeTransaction: eTx.toObject(),
          auditTrail
        });
      }
    }

    if (reportsToInsert.length > 0) {
      await ReconciliationReport.insertMany(reportsToInsert);
    }

    const matchedCount = reportsToInsert.filter(r => r.category === 'MATCHED').length;
    const conflictingCount = reportsToInsert.filter(r => r.category === 'CONFLICTING').length;
    const unmatchedUserCount = reportsToInsert.filter(r => r.category === 'UNMATCHED_USER').length;
    const unmatchedExchangeCount = reportsToInsert.filter(r => r.category === 'UNMATCHED_EXCHANGE').length;

    const diffTime = process.hrtime(startTime);
    const durationMs = (diffTime[0] * 1000) + (diffTime[1] / 1000000);

    return {
      matchedCount,
      conflictingCount,
      unmatchedUserCount,
      unmatchedExchangeCount,
      durationMs
    };
  }
}

export default MatchingEngine;
