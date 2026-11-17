import { Router } from 'express';
import { z } from 'zod';
import { academyLesson } from '../services/academyCatalog.js';
import { academyService, startAcademy, changeAcademy, explainAcademy, scoreAcademy } from '../services/academyService.js';
import { parse, empty, quota } from '../middleware/security.js';
import { approvedFilter } from '../services/retrievalService.js';
import { objectId } from '../validation.js';
import { missing } from '../utils/apiError.js';
export function academyRoutes({ repo, provider, env, audit, shutdownSignal }) {
  const service=academyService(repo,provider,audit), publicRoutes=Router(), privateRoutes=Router();
  const send=(res,data)=>res.json({data});
  const language=query=>parse(z.strictObject({language:z.enum(['en','ur','roman-ur']).default('en')}),query).language;
  publicRoutes.get('/tracks',(_req,res)=>send(res,service.catalog()));
  publicRoutes.get('/tracks/:id',(req,res)=>{ const catalog=service.catalog(), track=catalog.tracks.find(t=>t.id===req.params.id); if(!track) throw missing(); send(res,{...track,lessons:catalog.lessons.filter(l=>l.trackId===track.id)}); });
  publicRoutes.get('/lessons/:id',async(req,res)=>{const lesson=academyLesson(req.params.id);if(!lesson) throw missing();send(res,await service.detail(lesson,language(req.query)));});
  publicRoutes.get('/sources/:id',async(req,res)=>{parse(empty,req.query); const row=await repo.one('SourcePassage',{sourceId:req.params.id,...approvedFilter});if(!row)throw missing(); const {sourceId,sourceType,title,author,collection,reference,language,text,sourceURL,edition,authenticity,licenseMetadata}=row;send(res,{sourceId,sourceType,title,author,collection,reference,language,text,sourceURL,edition,authenticity,licenseMetadata});});
  publicRoutes.get('/topics',(req,res)=>{const {q}=parse(z.strictObject({q:z.string().trim().min(3).max(500)}),req.query);send(res,service.select(q));});
  privateRoutes.get('/sessions',async(req,res)=>{parse(empty,req.query);const rows=await repo.find('LearningProgress',{userId:req.user._id,lessonId:/^academy:/},{limit:100,sort:{lastAccessedAt:-1}});send(res,rows.map(({_id,lessonId,currentStep,status,lastAccessedAt,selectedLanguage,selectedDifficulty})=>({id:String(_id),lessonId,currentStep,status,lastAccessedAt,selectedLanguage,selectedDifficulty})));});
  privateRoutes.post('/import',async(req,res)=>{
    const item=z.strictObject({lessonId:z.string().max(80).refine(id=>Boolean(academyLesson(id))),currentStep:z.number().int().min(0).max(100),status:z.enum(['in_progress','completed']),note:z.string().max(4000),language:z.enum(['en','ur','roman-ur']),difficulty:z.enum(['beginner','intermediate','advanced'])}).refine(row=>row.currentStep<(academyLesson(row.lessonId)?.steps.length||0),'Unknown lesson step');
    const input=parse(z.strictObject({consent:z.literal(true),lessons:z.array(item).max(100)}),req.body);
    await repo.withOwner(req.user._id,async session=>{for(const row of input.lessons){const lesson=academyLesson(row.lessonId);await repo.upsert('LearningProgress',{userId:req.user._id,lessonId:row.lessonId},{userId:req.user._id,lessonId:row.lessonId,courseId:lesson.trackId,currentStep:row.currentStep,status:row.status,note:row.note,selectedLanguage:row.language,selectedDifficulty:row.difficulty,mode:'guided',version:0,lastAccessedAt:new Date()},session);}});
    send(res,{imported:true});
  });
  privateRoutes.post('/sessions',async(req,res)=>send(res,await service.start(req.user._id,parse(startAcademy,req.body))));
  privateRoutes.get('/sessions/:id',async(req,res)=>send(res,await service.get(req.user._id,parse(objectId,req.params.id))));
  privateRoutes.patch('/sessions/:id',async(req,res)=>send(res,await service.change(req.user._id,parse(objectId,req.params.id),parse(changeAcademy,req.body))));
  privateRoutes.post('/sessions/:id/explain',(req,_res,next)=>{req.academyInput=parse(explainAcademy,req.body);req.academyId=parse(objectId,req.params.id);next();},quota(repo,env),async(req,res)=>{
    const controller=new AbortController();const disconnect=()=>{if(!res.writableEnded)controller.abort();};req.on('aborted',disconnect);res.on('close',disconnect);
    try{send(res,await service.explain(req.user._id,req.academyId,req.academyInput,AbortSignal.any([controller.signal,shutdownSignal])));}finally{req.off('aborted',disconnect);res.off('close',disconnect);}
  });
  privateRoutes.post('/sessions/:id/quiz',async(req,res)=>send(res,await service.score(req.user._id,parse(objectId,req.params.id),parse(scoreAcademy,req.body))));
  return {publicRoutes,privateRoutes};
}
