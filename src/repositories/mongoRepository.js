import { conflict } from '../utils/apiError.js';
import { ApiError } from '../utils/apiError.js';
export class MongoRepository {
  constructor(connection, models) { this.connection = connection; this.models = models; }
  ready() { return this.connection.readyState === 1; }
  async initialize() { await Promise.all(Object.values(this.models).map(m => m.init())); }
  async find(name, filter, { limit = 50, sort = { _id: -1 }, session } = {}) { return this.models[name].find(filter).sort(sort).limit(limit).session(session || null).lean(); }
  async one(name, filter, session) { return this.models[name].findOne(filter).session(session || null).lean(); }
  async insert(name, data, session) { const [doc] = await this.models[name].create([data], { session }); return doc.toObject(); }
  async upsert(name, filter, data, session) {
    try { return await this.models[name].findOneAndUpdate(filter, { $setOnInsert: data }, { upsert: true, returnDocument: 'after', runValidators: true, session }).lean(); }
    catch (e) { if (e.code === 11000 && !session) return this.one(name, filter); throw e; }
  }
  async update(name, filter, fields, session) { return this.models[name].findOneAndUpdate(filter, { $set: fields }, { returnDocument: 'after', runValidators: true, session }).lean(); }
  async remove(name, filter, session) { return this.models[name].deleteMany(filter).session(session || null); }
  async transaction(fn) { return this.connection.transaction(session => fn(session)); }
  async withOwner(userId, fn) {
    return this.transaction(async session => {
      // Serialize writes against deletion, preventing orphan private data from an
      // already-running request after an account is marked deleting.
      const owner = await this.models.User.findOneAndUpdate({ _id: userId, status: 'active' }, { $inc: { dataRevision: 1 } }, { returnDocument: 'after', session }).lean();
      if (!owner) throw new ApiError(409, 'ACCOUNT_DELETING', 'This account is being deleted.');
      return fn(session);
    });
  }
  async optimistic(name, filter, fields, { expectedVersion, mutationId } = {}, defaults = {}, session) {
    const old = await this.one(name, filter, session);
    if (mutationId && old?.lastMutationId === mutationId) return old;
    if (expectedVersion !== undefined && (old?.version || 0) !== expectedVersion) throw conflict();
    const match = old ? { ...filter, version: old.version } : filter;
    try {
      const result = await this.models[name].findOneAndUpdate(match, {
        $set: { ...fields, ...(mutationId ? { lastMutationId: mutationId } : {}) },
        $setOnInsert: Object.fromEntries(Object.entries(defaults).filter(([key]) => !(key in fields))), $inc: { version: 1 },
      }, { upsert: !old, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: false, session }).lean();
      if (!result) throw conflict();
      return result;
    } catch (e) { if (e.code === 11000) throw conflict(); throw e; }
  }
  async consumeQuota(userId, scope, maximum, duration) {
    const now = Date.now(), window = Math.floor(now / duration);
    const filter = { userId, scope, window };
    let value;
    try { value = await this.models.RateBucket.findOneAndUpdate(filter, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * duration + 3600000) } }, { upsert: true, returnDocument: 'after' }).lean(); }
    catch (e) { if (e.code !== 11000) throw e; value = await this.models.RateBucket.findOneAndUpdate(filter, { $inc: { count: 1 } }, { returnDocument: 'after' }).lean(); }
    return { allowed: value.count <= maximum, retryAfter: Math.ceil(((window + 1) * duration - now) / 1000) };
  }
}
