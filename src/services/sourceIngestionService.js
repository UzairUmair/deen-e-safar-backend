import { proposedSource } from '../validation.js';
import { hashSource, termsOf } from './retrievalService.js';
export async function ingestSource(repo, input) {
  // Import files cannot grant review status, licensing rights or administrative claims.
  const source = proposedSource.parse(input), contentHash = hashSource(source);
  const current = await repo.one('SourcePassage', { sourceId: source.sourceId });
  if (current?.contentHash === contentHash) return 'unchanged';
  const fields = { ...source, contentHash, terms: termsOf([source.text,source.reference,source.title,source.author,...(source.topicTags||[])].filter(Boolean).join(' ')), reviewStatus: 'pending', licenseMetadata: { status: 'unverified' }, reviewNote: '', reviewedBy: '', reviewedAt: null };
  if (current) {
    // Do not overwrite a concurrent ingest/review against another text revision.
    const updated = await repo.update('SourcePassage', { _id: current._id, contentHash: current.contentHash }, fields);
    if (!updated) throw new Error('Source changed concurrently; retry ingestion.');
    return 'updated_pending';
  }
  await repo.upsert('SourcePassage', { sourceId: source.sourceId }, fields);
  return 'created_pending';
}
