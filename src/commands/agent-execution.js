'use strict';
const path=require('node:path');
const {initManifest,loadManifest,resolveAgentExecution,resolveDevelopmentLaneExecution}=require('../agent-execution/manifest');
const {dispatch,readState}=require('../agent-execution/dispatcher');
const {openRuntimeDb,getExecutionSnapshot,listExecutionEvents}=require('../runtime-store');
const {validateFeatureSlug}=require('../verification/path-policy');
const { resolveTargetDir } = require('../lib/project-root');
const {readSignatures,findSignature,signatureState}=require('../lib/host-signature');
// --strict: every ENABLED agent/lane whose model resolved must also carry a
// valid (unexpired) host signature on this machine — the pre-run answer to
// "will this host/model actually start here?" instead of validated_at_dispatch.
async function signatureChecks(manifest,resolutions,lanes,{env=process.env,now=Date.now()}={}){
 const store=await readSignatures({env});
 const report={path:store.path,agents:{},development_lanes:{},warnings:[]};const errors=[];
 const check=(bucket,prefix,id,resolution,configured)=>{
  if(!configured||configured.enabled===false||!resolution||!resolution.ok)return;
  const host=resolution.host||configured.host||manifest.host;const model=resolution.model_resolved||resolution.model||configured.model;const effort=resolution.reasoning_effort??configured.reasoning_effort??null;
  const entry=findSignature(store,{host,model,reasoning_effort:effort});const state=signatureState(entry,now);
  report[bucket][id]={host,model,reasoning_effort:effort,state,checked_at:entry?.checked_at||null,expires_at:entry?.expires_at||null,reason:entry?.reason||null};
  if(state!=='valid')errors.push({path:`$.${prefix}.${id}.model`,message:`signature_${state}`,host,model,reasoning_effort:effort,hint:`aioson host:signature . --host=${host} --model=${model}${effort?` --effort=${effort}`:''}`});
  for(const fallback of configured.fallbacks||[]){const fallbackState=signatureState(findSignature(store,{host:fallback.host,model:fallback.model,reasoning_effort:null}),now);if(fallbackState!=='valid')report.warnings.push({path:`$.${prefix}.${id}.fallbacks`,message:`fallback_signature_${fallbackState}`,host:fallback.host,model:fallback.model})}
 };
 for(const [id,resolution] of Object.entries(resolutions))check('agents','agents',id,resolution,manifest.agents?.[id]);
 for(const [id,resolution] of Object.entries(lanes))check('development_lanes','development_lanes.lanes',id,resolution,manifest.development_lanes?.lanes?.[id]);
 return{report,errors};
}
async function resolveAllAgents(manifest,catalogLoader){
 const entries=await Promise.all(Object.keys(manifest.agents).map(async id=>[id,await resolveAgentExecution(manifest,id,{}, {catalogLoader})]));
 return Object.fromEntries(entries);
}
async function resolveAllLanes(manifest,catalogLoader){
 const lanes=manifest.development_lanes?.lanes||{};
 const entries=await Promise.all(Object.keys(lanes).map(async id=>[id,await resolveDevelopmentLaneExecution(manifest,id,{}, {catalogLoader})]));
 return Object.fromEntries(entries);
}
function resolutionErrors(resolutions,prefix='agents'){
 return Object.entries(resolutions).filter(([,value])=>!value.ok).map(([id,value])=>({path:`$.${prefix}.${id}.model`,message:value.reason,candidates:value.candidates||[],supported:value.supported||[]}));
}
async function runAgentExecution({args,options={},logger,catalogLoader,signatureEnv}){
 const projectDir=resolveTargetDir(args); const sub=options.sub||'show'; const featureInput=String(options.feature||options.slug||'').trim();
 if(!featureInput)return {ok:false,reason:'feature_required',message:'Use --feature=<slug>'};
 const featureValidation=validateFeatureSlug(featureInput);
 if(!featureValidation.ok)return{ok:false,reason:'invalid_feature_slug',feature:featureInput,message:'--feature must be a lowercase kebab-case slug'};
 const feature=featureValidation.feature_slug;
 if(sub==='init'){const created=await initManifest(projectDir,feature,String(options.host||'codex')); const result={ok:true,feature,path:path.relative(projectDir,created.path),digest:created.digest,manifest:created.manifest,created:created.created,unchanged:created.unchanged,availability:'validated_at_dispatch'}; if(!options.json)logger.log(`${result.created?'Agent execution manifest created':'Existing agent execution manifest preserved unchanged'}: ${result.path}\nValidate: aioson agent:execution:validate . --feature=${feature}`); return result;}
 const loaded=await loadManifest(projectDir,feature);
 if(sub==='validate'){
  const strict=options.strict===true;
  let resolutions={};let development_lanes={};let errors=loaded.errors||[];let signatures=null;
  if(loaded.exists&&loaded.ok){resolutions=await resolveAllAgents(loaded.manifest,catalogLoader);development_lanes=await resolveAllLanes(loaded.manifest,catalogLoader);errors=[...resolutionErrors(resolutions),...resolutionErrors(development_lanes,'development_lanes.lanes')];if(strict){const checked=await signatureChecks(loaded.manifest,resolutions,development_lanes,{env:signatureEnv||process.env});signatures=checked.report;errors=[...errors,...checked.errors]}}
  const result={ok:Boolean(loaded.exists&&loaded.ok&&!errors.length),feature,path:path.relative(projectDir,loaded.path),legacy:!loaded.exists,digest:loaded.digest||null,errors,resolutions,development_lanes,availability:strict?'validated_against_signatures':'validated_at_dispatch',...(signatures?{signatures}:{})};
  if(!options.json)(result.ok?logger.log(strict?`Valid: ${result.path} (models resolved and every enabled host/model signed on this machine).`:`Valid: ${result.path} (models resolved against the current runtime catalog).`):logger.error(JSON.stringify(result.errors,null,2)));return result;
 }
 if(sub==='show'){
  if(!loaded.exists)return {ok:true,legacy:true,feature,path:path.relative(projectDir,loaded.path),message:'Manifest absent; legacy configured-default remains active.'};
  if(!loaded.ok)return {ok:false,feature,errors:loaded.errors};
  const agents=await resolveAllAgents(loaded.manifest,catalogLoader);const development_lanes=await resolveAllLanes(loaded.manifest,catalogLoader);const errors=[...resolutionErrors(agents),...resolutionErrors(development_lanes,'development_lanes.lanes')];
  return {ok:!errors.length,feature,path:path.relative(projectDir,loaded.path),digest:loaded.digest,agents,development_lanes,errors,availability:'validated_at_dispatch'};
 }
 if(sub==='dispatch')return dispatch({projectDir,feature,agent:options.agent||'dev',lane:options.lane||null,runId:options['run-id'],promptPath:options.prompt,catalogLoader});
 if(sub==='resume'){const state=await readState(projectDir,feature);if(!state)return {ok:false,reason:'state_missing'};const last=state.attempts.at(-1);return dispatch({projectDir,feature,agent:options.agent||last?.agent||'dev',lane:options.lane||last?.lane||null,runId:state.run_id,promptPath:options.prompt,catalogLoader});}
 if(sub==='status'){const {db}=await openRuntimeDb(projectDir);try{return{ok:true,schema_version:1,feature,runs:getExecutionSnapshot(db,{feature,agent:options.agent,state:options.state,limit:options.limit})}}finally{db.close()}}
 if(sub==='events'){const state=await readState(projectDir,feature);const run=String(options.run||state?.attempts?.at(-1)?.telemetry_run_id||'');if(!run)return{ok:false,reason:'telemetry_run_required'};const {db}=await openRuntimeDb(projectDir);try{const owned=getExecutionSnapshot(db,{feature,limit:200}).some(item=>item.telemetry_run_id===run);if(!owned)return{ok:false,reason:'telemetry_run_not_found'};return{ok:true,schema_version:1,trust:'sanitized_untrusted_output',feature,telemetry_run_id:run,...listExecutionEvents(db,run,{after:options.after,limit:options.limit})}}finally{db.close()}}
 return {ok:false,reason:'invalid_subcommand',valid:['init','validate','show','dispatch','resume','status','events']};
}
module.exports={runAgentExecution};
