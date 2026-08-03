'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { atomicJson, atomicWrite, readManifest } = require('./store');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function reviewHash(manifest) {
  const material = manifest.runs.map(run => `${run.id}:${run.artifact_hash || ''}:${run.status}`).join('|');
  return crypto.createHash('sha256').update(material).digest('hex');
}

function renderComparisonHtml(manifest, variants, feedback) {
  const data = JSON.stringify({
    slug: manifest.slug,
    displayMode: manifest.display_mode,
    variants: variants.map(run => ({
      id: run.id,
      label: run.label,
      host: manifest.display_mode === 'blind' ? null : run.host,
      model: manifest.display_mode === 'blind' ? null : (run.model_resolved || run.model_requested),
      src: `runs/${run.id}/prototype.html`,
      warnings: run.warnings || []
    })),
    feedback
  }).replace(/</g, '\\u003c');
  const cards = variants.map((run, index) => {
    const identity = manifest.display_mode === 'blind'
      ? escapeHtml(run.label)
      : `${escapeHtml(run.label)} · ${escapeHtml(run.host)}/${escapeHtml(run.model_resolved || run.model_requested)}`;
    return `<button class="variant${index === 0 ? ' active' : ''}" data-id="${escapeHtml(run.id)}"><span>${identity}</span><small>${escapeHtml(run.status)}</small></button>`;
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(manifest.title)} — exploration review</title>
<!-- aioson:visual-exploration-review -->
<style>
:root{color-scheme:dark;--bg:#0a0b0f;--panel:#12141b;--line:#2a2e3a;--text:#f4f6fb;--muted:#9299aa;--accent:#7c9cff}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 Inter,system-ui,sans-serif;height:100vh;overflow:hidden}.app{display:grid;grid-template-columns:280px 1fr;height:100vh}.sidebar{border-right:1px solid var(--line);background:var(--panel);padding:18px;overflow:auto}.sidebar h1{font-size:17px;margin:0 0 4px}.sidebar p{color:var(--muted);margin:0 0 18px}.variants{display:grid;gap:8px}.variant{width:100%;border:1px solid var(--line);background:#0d0f15;color:var(--text);padding:11px 12px;border-radius:9px;text-align:left;cursor:pointer;display:grid;gap:3px}.variant.active{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}.variant small{color:var(--muted)}.section{border-top:1px solid var(--line);margin-top:18px;padding-top:18px}.section label{display:block;color:var(--muted);font-size:12px;margin:0 0 6px}.section textarea{width:100%;min-height:90px;resize:vertical;background:#0b0d12;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:10px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.actions button,.toolbar button{border:1px solid var(--line);background:#171a23;color:var(--text);border-radius:8px;padding:9px;cursor:pointer}.actions .primary{background:var(--accent);border-color:var(--accent);color:#081022}.main{min-width:0;display:grid;grid-template-rows:auto 1fr}.toolbar{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line);background:#0e1016}.toolbar strong{margin-right:auto}.toolbar button.active{border-color:var(--accent);color:#bed0ff}.stage{position:relative;min-height:0;background:#1a1d25;padding:12px}.frame{width:100%;height:100%;border:0;border-radius:10px;background:white}.comment-layer{display:none;position:absolute;inset:12px;cursor:crosshair;background:rgba(124,156,255,.04);border:1px dashed var(--accent);border-radius:10px}.comment-layer.active{display:block}.comment-dot{position:absolute;width:18px;height:18px;border-radius:50%;background:#ffcb6b;color:#201600;display:grid;place-items:center;font-size:11px;font-weight:700;transform:translate(-50%,-50%)}.composer{display:none;position:fixed;right:24px;bottom:24px;width:min(360px,calc(100vw - 48px));padding:14px;background:#141720;border:1px solid var(--line);border-radius:12px;box-shadow:0 18px 60px #0008;z-index:4}.composer.open{display:block}.composer textarea{width:100%;min-height:90px;background:#0b0d12;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:9px}.composer footer{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}.toast{position:fixed;top:16px;right:16px;background:#182031;border:1px solid #33456e;padding:10px 14px;border-radius:9px;opacity:0;transform:translateY(-8px);transition:.2s;pointer-events:none}.toast.show{opacity:1;transform:none}@media(max-width:800px){.app{grid-template-columns:1fr;grid-template-rows:auto 1fr}.sidebar{border-right:0;border-bottom:1px solid var(--line);padding:10px}.sidebar h1,.sidebar p,.section{display:none}.variants{display:flex;overflow:auto}.variant{min-width:150px}.main{min-height:0}}
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <h1>${escapeHtml(manifest.title)}</h1>
    <p>${escapeHtml(manifest.strategy)} · ${escapeHtml(manifest.display_mode)} review</p>
    <div class="variants">${cards}</div>
    <div class="section">
      <label for="notes">Overall notes</label>
      <textarea id="notes" placeholder="What worked, what should change, and why?"></textarea>
      <div class="actions">
        <button id="copy">Copy JSON</button>
        <button id="download">Download</button>
        <button id="save">Save to file</button>
        <button class="primary" id="select">Select variant</button>
      </div>
    </div>
  </aside>
  <main class="main">
    <div class="toolbar"><strong id="current"></strong><button id="comments">Comment mode</button><button id="reload">Reload</button><button id="open">Open prototype</button></div>
    <div class="stage"><iframe class="frame" id="frame" title="Prototype preview"></iframe><div class="comment-layer" id="layer"></div></div>
  </main>
</div>
<div class="composer" id="composer"><strong>Comment on this region</strong><textarea id="commentText" placeholder="Describe the exact visual or interaction change"></textarea><footer><button id="cancelComment">Cancel</button><button id="addComment">Add comment</button></footer></div>
<div class="toast" id="toast"></div>
<script>
const DATA=${data};
let active=DATA.variants[0]?.id||null;let pendingPoint=null;const comments=[];
const q=id=>document.getElementById(id),frame=q('frame'),layer=q('layer'),composer=q('composer');
function variant(){return DATA.variants.find(v=>v.id===active)}
function identity(v){return DATA.displayMode==='blind'?v.label:v.label+' · '+v.host+'/'+v.model}
function show(id){active=id;const v=variant();document.querySelectorAll('.variant').forEach(b=>b.classList.toggle('active',b.dataset.id===id));frame.src=v.src;q('current').textContent=identity(v);renderDots()}
function toast(text){const el=q('toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
function payload(){return{version:1,exploration:DATA.slug,source_hash:DATA.feedback.source_hash,selected_run:active,notes:q('notes').value,comments,exported_at:new Date().toISOString()}}
function renderDots(){layer.querySelectorAll('.comment-dot').forEach(el=>el.remove());comments.filter(c=>c.run===active).forEach((c,i)=>{const el=document.createElement('span');el.className='comment-dot';el.style.left=c.x+'%';el.style.top=c.y+'%';el.textContent=String(i+1);el.title=c.text;layer.appendChild(el)})}
document.querySelectorAll('.variant').forEach(button=>button.addEventListener('click',()=>show(button.dataset.id)));
q('comments').onclick=()=>{layer.classList.toggle('active');q('comments').classList.toggle('active');};
layer.onclick=event=>{const rect=layer.getBoundingClientRect();pendingPoint={run:active,x:+(((event.clientX-rect.left)/rect.width)*100).toFixed(2),y:+(((event.clientY-rect.top)/rect.height)*100).toFixed(2),viewport:{width:frame.clientWidth,height:frame.clientHeight}};q('commentText').value='';composer.classList.add('open');q('commentText').focus()};
q('cancelComment').onclick=()=>{pendingPoint=null;composer.classList.remove('open')};
q('addComment').onclick=()=>{const text=q('commentText').value.trim();if(!text||!pendingPoint)return;comments.push({...pendingPoint,text});pendingPoint=null;composer.classList.remove('open');renderDots();toast('Comment added')};
q('reload').onclick=()=>{frame.src=frame.src};q('open').onclick=()=>window.open(variant().src,'_blank');
q('copy').onclick=async()=>{await navigator.clipboard.writeText(JSON.stringify(payload(),null,2));toast('Feedback JSON copied')};
q('download').onclick=()=>{const blob=new Blob([JSON.stringify(payload(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='exploration-feedback.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
q('save').onclick=async()=>{if(!window.showSaveFilePicker){q('download').click();return}const handle=await showSaveFilePicker({suggestedName:'exploration-feedback.json',types:[{description:'JSON',accept:{'application/json':['.json']}}]});const writable=await handle.createWritable();await writable.write(JSON.stringify(payload(),null,2));await writable.close();toast('Feedback saved')};
q('select').onclick=()=>{toast('Export feedback, then run exploration:select with '+active)};
if(active)show(active);
</script>
</body></html>`;
}

async function writeComparisonReview(projectDir, slug) {
  const loaded = await readManifest(projectDir, slug);
  if (!loaded.ok) return loaded;
  const variants = loaded.manifest.runs.filter(run => ['completed', 'completed-with-warnings', 'selected'].includes(run.status));
  if (!variants.length) return { ok: false, reason: 'no_reviewable_runs' };
  for (const run of variants) {
    try {
      await fs.access(path.join(loaded.root, 'runs', run.id, 'prototype.html'));
    } catch {
      return { ok: false, reason: 'prototype_missing', run: run.id };
    }
  }
  const feedback = {
    version: 1,
    exploration: loaded.manifest.slug,
    source_hash: reviewHash(loaded.manifest),
    selected_run: loaded.manifest.selected_run,
    notes: '',
    comments: [],
    exported_at: null
  };
  const html = renderComparisonHtml(loaded.manifest, variants, feedback);
  const htmlPath = path.join(loaded.root, 'comparison.html');
  const feedbackPath = path.join(loaded.root, 'exploration-feedback.json');
  await atomicWrite(htmlPath, html);
  await atomicJson(feedbackPath, feedback);
  return { ok: true, slug: loaded.manifest.slug, variants: variants.length, review_path: htmlPath, feedback_path: feedbackPath, source_hash: feedback.source_hash };
}

module.exports = { escapeHtml, renderComparisonHtml, reviewHash, writeComparisonReview };
