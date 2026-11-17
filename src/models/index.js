import { Schema } from 'mongoose';
import { academyLesson } from '../services/academyCatalog.js';
import { defaultPreferences, preferences } from '../validation.js';
import { validReference, validVerse, lessonById } from '../config/catalog.js';
const opts = { timestamps: true, strict: 'throw', versionKey: false, bufferCommands: false };
const owner = { type: Schema.Types.ObjectId, required: true, index: true, immutable: true };
const text = (max, required = false) => ({ type: String, maxlength: max, required });
const version = { version: { type: Number, default: 0, min: 0 }, lastMutationId: text(80) };
export function createModels(connection) {
  const schemas = {
    User: new Schema({ firebaseUid: { ...text(128, true), unique: true, immutable: true }, name: text(120), email: text(320), photoURL: text(2000), role: { type: String, enum: ['user', 'admin'], default: 'user' }, status: { type: String, enum: ['active', 'deleting'], default: 'active' }, dataRevision: { type: Number, default: 0 }, preferences: { type: Object, default: defaultPreferences, validate: v => preferences.safeParse(v).success }, ...version }, opts),
    Bookmark: new Schema({ userId: owner, contentType: { type: String, enum: ['quran', 'dua', 'hadith', 'lesson'], required: true }, contentRef: text(80, true) }, opts),
    ReadingProgress: new Schema({ userId: owner, surahNumber: { type: Number, min: 1, max: 114, required: true }, ayahNumber: { type: Number, min: 1, max: 286, required: true }, ...version }, opts),
    LearningProgress: new Schema({ userId: owner, courseId: text(80, true), lessonId: text(80, true), status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' }, note: { ...text(4000), default: '' }, lastAccessedAt: Date, completedAt: Date, currentStep: { type: Number, min: 0, default: 0 }, selectedLanguage: { type: String, enum: ['en', 'ur', 'roman-ur'], default: 'en' }, selectedDifficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' }, mode: { type: String, enum: ['guided', 'ask', 'story'], default: 'guided' }, assessment: { type: Object, default: null }, ...version }, opts),
    QuizAttempt: new Schema({ userId: owner, quizId: text(80, true), answers: { type: [Number], required: true }, score: { type: Number, min: 0, required: true }, total: { type: Number, min: 1, required: true }, submissionId: { ...text(80, true), required: true } }, opts),
    AIConversation: new Schema({ userId: owner, title: { ...text(160, true), default: 'New conversation' }, ...version }, opts),
    AIMessage: new Schema({ userId: owner, conversationId: { type: Schema.Types.ObjectId, required: true, index: true, immutable: true }, role: { type: String, enum: ['user', 'assistant'], required: true }, content: text(8000, true), sourceRefs: { type: [String], default: [] } }, opts),
    SourcePassage: new Schema({ sourceId: { ...text(120, true), unique: true, immutable: true }, sourceType: { type: String, enum: ['quran', 'hadith', 'tafsir', 'seerah', 'history', 'scholarly-opinion'], required: true }, collection: text(160, true), title: text(250), author: text(250), topicTags: { type: [String], default: [] }, academyScopes:{ type:[new Schema({lessonId:text(80,true),stepId:text(20,true)},{_id:false,strict:'throw'})],default:[] }, reference: text(200, true), language: { type: String, enum: ['en', 'ur', 'ar'], required: true }, text: text(16000, true), sourceURL: text(1000, true), edition: text(200, true), authenticity: text(1000), contentHash: text(64, true), reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, licenseMetadata: { status: { type: String, enum: ['unverified', 'approved'], default: 'unverified' }, license: text(500), attribution: text(1200), url: text(1000) }, reviewedBy: text(128), reviewedAt: Date, reviewNote: text(2000), terms: { type: [String], default: [], validate: v => v.length <= 2000 } }, opts),
    ContentReport: new Schema({ userId: owner, targetType: { type: String, enum: ['quran', 'dua', 'hadith', 'ai-message', 'source'], required: true }, targetId: text(120, true), reason: text(2000, true), status: { type: String, enum: ['open', 'reviewed', 'resolved', 'rejected'], default: 'open' }, adminNote: text(2000), reviewedBy: text(128), reviewedAt: Date }, opts),
    RateBucket: new Schema({ userId: owner, scope: text(40, true), window: { type: Number, required: true }, count: { type: Number, default: 0, min: 0 }, expiresAt: { type: Date, required: true } }, opts),
  };
  schemas.Bookmark.pre('validate', function () { if (!validReference(this.contentType, this.contentRef)) this.invalidate('contentRef', 'Unknown content reference'); });
  schemas.ReadingProgress.pre('validate', function () { if (!validVerse(this.surahNumber, this.ayahNumber)) this.invalidate('ayahNumber', 'Invalid Quran position'); });
  schemas.LearningProgress.pre('validate', function () { if ((academyLesson(this.lessonId)?.trackId || lessonById(this.lessonId)?.courseId) !== this.courseId) this.invalidate('lessonId', 'Invalid lesson/course'); });
  schemas.QuizAttempt.pre('validate', function () { if (this.score > this.total) this.invalidate('score', 'Score exceeds total'); });
  for (const name of ['Bookmark', 'ReadingProgress', 'LearningProgress', 'QuizAttempt', 'AIConversation', 'AIMessage', 'ContentReport']) schemas[name].index({ userId: 1, _id: -1 });
  schemas.Bookmark.index({ userId: 1, contentType: 1, contentRef: 1 }, { unique: true });
  schemas.ReadingProgress.index({ userId: 1, surahNumber: 1 }, { unique: true });
  schemas.ReadingProgress.index({ userId: 1, updatedAt: -1 });
  schemas.LearningProgress.index({ userId: 1, lessonId: 1 }, { unique: true });
  schemas.QuizAttempt.index({ userId: 1, submissionId: 1 }, { unique: true });
  schemas.AIMessage.index({ userId: 1, conversationId: 1, _id: -1 });
  schemas.SourcePassage.index({ reviewStatus: 1, 'licenseMetadata.status': 1, terms: 1 });
  schemas.SourcePassage.index({ 'academyScopes.lessonId':1, reviewStatus:1 });
  schemas.SourcePassage.index({ text: 'text', reference: 'text' }, { default_language: 'none', language_override: '_indexLanguage' });
  schemas.ContentReport.index({ status: 1, _id: -1 });
  schemas.RateBucket.index({ userId: 1, scope: 1, window: 1 }, { unique: true });
  schemas.RateBucket.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, connection.models[name] || connection.model(name, schema)]));
}
