import { ApiError, missing } from '../utils/apiError.js';
import { lessonById, quizById, validVerse } from '../config/catalog.js';
export const publicRecord = row => {
  const { _id, userId: _owner, lastMutationId: _mutation, __v: _v, ...rest } = row;
  return { ...rest, id: String(_id) };
};
export async function listPage(repo, name, filter, query, session) {
  const rows = await repo.find(name, { ...filter, ...(query.cursor ? { _id: { $lt: query.cursor } } : {}) }, { limit: query.limit + 1, session });
  const hasMore = rows.length > query.limit, page = rows.slice(0, query.limit);
  return { data: page.map(publicRecord), meta: { nextCursor: hasMore ? String(page.at(-1)._id) : null } };
}
export function accountService(repo) {
  return {
    bookmark: (userId, data, session) => repo.upsert('Bookmark', { userId, contentType: data.contentType, contentRef: data.contentRef }, { userId, ...data }, session),
    async removeBookmark(userId, id) {
      return repo.withOwner(userId, async session => {
        const row = await repo.one('Bookmark', { _id: id, userId }, session);
        if (!row) throw missing();
        await repo.remove('Bookmark', { _id: id, userId }, session);
        return { deleted: true };
      });
    },
    async reading(userId, surah, body) {
      if (!validVerse(surah, body.ayahNumber)) throw new ApiError(400, 'INVALID_POSITION', 'This ayah does not exist in the selected surah.');
      return repo.withOwner(userId, session => repo.optimistic('ReadingProgress', { userId, surahNumber: surah }, { ayahNumber: body.ayahNumber }, body, { userId, surahNumber: surah }, session));
    },
    async learning(userId, id, body) {
      const lesson = lessonById(id);
      if (!lesson) throw missing();
      return repo.withOwner(userId, async session => {
        const existing = await repo.one('LearningProgress', { userId, lessonId: id }, session);
        const fields = { lastAccessedAt: new Date(), ...(body.note !== undefined ? { note: body.note } : {}), ...(body.status ? { status: body.status, completedAt: body.status === 'completed' ? existing?.completedAt || new Date() : null } : {}) };
        return repo.optimistic('LearningProgress', { userId, lessonId: id }, fields, body, { userId, lessonId: id, courseId: lesson.courseId, status: 'in_progress', note: '' }, session);
      });
    },
    async quiz(userId, body) {
      const quiz = quizById(body.quizId);
      if (!quiz || body.answers.length !== 1 || body.answers[0] >= quiz.options.length) throw new ApiError(400, 'INVALID_ANSWERS', 'Submit answers for a known quiz.');
      return repo.withOwner(userId, session => repo.upsert('QuizAttempt', { userId, submissionId: body.submissionId }, { userId, ...body, score: Number(body.answers[0] === quiz.correct), total: 1 }, session));
    },
  };
}
