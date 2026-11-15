import { ApiError } from '../utils/apiError.js';
import { defaultPreferences, mergePreferences } from '../validation.js';
export const publicProfile = user => ({ id: String(user._id), name: user.name || '', email: user.email || '', photoURL: user.photoURL || '', role: user.role, preferences: user.preferences, version: user.version, createdAt: user.createdAt, updatedAt: user.updatedAt });
export function userService(repo, firebase) {
  return {
    async ensure(identity, allowDeleting = false) {
      let user = await repo.one('User', { firebaseUid: identity.uid });
      if (!user) {
        const prefs = defaultPreferences(); prefs.displayName = (identity.name || '').slice(0, 60);
        user = await repo.upsert('User', { firebaseUid: identity.uid }, { firebaseUid: identity.uid, name: (identity.name || '').slice(0, 120), email: identity.email || '', photoURL: identity.picture || '', role: identity.admin === true ? 'admin' : 'user', preferences: prefs, status: 'active', version: 0, dataRevision: 0 });
      }
      if (user.status !== 'active' && !allowDeleting) throw new ApiError(409, 'ACCOUNT_DELETING', 'This account is being deleted. Retry deletion from Account.');
      const trusted = { email: identity.email || '', photoURL: identity.picture || '', role: identity.admin === true ? 'admin' : 'user' };
      if (!user.name && identity.name) trusted.name = identity.name.slice(0, 120);
      if (Object.entries(trusted).some(([key, value]) => user[key] !== value)) user = await repo.update('User', { _id: user._id }, trusted);
      return user;
    },
    async update(user, patch) {
      return repo.withOwner(user._id, async session => {
        const fresh = await repo.one('User', { _id: user._id }, session);
        const fields = {};
        if (patch.name !== undefined) fields.name = patch.name;
        if (patch.preferences) fields.preferences = mergePreferences(fresh.preferences, patch.preferences);
        return repo.optimistic('User', { _id: user._id }, fields, patch, {}, session);
      });
    },
    async delete(user, identity) {
      const age = Date.now() / 1000 - identity.auth_time;
      if (!Number.isFinite(age) || age < -60 || age > 300) throw new ApiError(409, 'REAUTH_REQUIRED', 'Sign in again before deleting your account.');
      await repo.update('User', { _id: user._id }, { status: 'deleting' });
      await repo.transaction(async session => {
        for (const name of ['Bookmark', 'ReadingProgress', 'LearningProgress', 'QuizAttempt', 'AIMessage', 'AIConversation', 'ContentReport', 'RateBucket']) await repo.remove(name, { userId: user._id }, session);
      });
      try { await firebase.deleteUser(identity.uid); }
      catch (error) { if (error.code !== 'auth/user-not-found') throw new ApiError(503, 'DELETION_PENDING', 'Account deletion is pending. Reauthenticate and retry from Account.'); }
      await repo.remove('User', { _id: user._id });
      return { deleted: true };
    },
  };
}
