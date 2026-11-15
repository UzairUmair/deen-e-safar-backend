import { lessonById } from '../config/catalog.js';
export async function importGuest(repo, userId, payload) {
  return repo.withOwner(userId, async session => {
    const counts = { bookmarks: 0, reading: 0, lessons: 0 };
    for (const bookmark of payload.bookmarks) {
      await repo.upsert('Bookmark', { userId, ...bookmark }, { userId, ...bookmark }, session);
      counts.bookmarks++;
    }
    for (const position of payload.reading) {
      const filter = { userId, surahNumber: position.surah };
      if (!await repo.one('ReadingProgress', filter, session)) {
        await repo.insert('ReadingProgress', { ...filter, ayahNumber: position.ayah, version: 1 }, session);
        counts.reading++;
      }
    }
    for (const item of payload.lessons) {
      const filter = { userId, lessonId: item.lessonId };
      const existing = await repo.one('LearningProgress', filter, session);
      if (!existing) await repo.insert('LearningProgress', { ...filter, courseId: lessonById(item.lessonId).courseId, status: item.completed ? 'completed' : 'in_progress', note: item.note || '', completedAt: item.completed ? new Date() : null, lastAccessedAt: new Date(), version: 1 }, session);
      else {
        const patch = {};
        if (item.completed && existing.status !== 'completed') { patch.status = 'completed'; patch.completedAt = new Date(); }
        if (item.note && !existing.note) patch.note = item.note;
        if (Object.keys(patch).length) await repo.optimistic('LearningProgress', filter, patch, {}, {}, session);
      }
      counts.lessons++;
    }
    return { imported: true, localCopyRetained: true, policy: 'Union bookmarks and completions; existing account positions and notes win.', processed: counts };
  });
}
