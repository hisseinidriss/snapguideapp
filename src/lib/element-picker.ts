/**
 * Generates the Element Picker bookmarklet script.
 * When run on any page, it highlights elements on hover and
 * captures a unique CSS selector on click, copying it to clipboard.
 * 
 * Improvements:
 * - Multiple fallback selectors (primary + up to 3 alternatives)
 * - Rich metadata (aria-label, role, href, data-*, bounding box, text fingerprint)
 * - Live uniqueness badge (✅ 1 match / ⚠️ N matches) on hover
 */
export function generatePickerScript(sessionId: string): string {
  return `javascript:void((function(){
if(window.__wt_picker){window.__wt_picker.destroy();delete window.__wt_picker;return;}
var s=document.createElement('style');
s.id='__wt_picker_style';
s.textContent='.__wt_picker_highlight{outline:2px solid #1e6b45 !important;outline-offset:2px !important;cursor:crosshair !important;}.__wt_picker_bar{position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#1e6b45;color:#fff;font:14px/1.4 system-ui;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 -4px 20px rgba(0,0,0,.2);}.__wt_picker_bar button{background:#fff;color:#1e6b45;border:none;padding:6px 14px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;}.__wt_picker_bar .wt-sel{font-family:monospace;font-size:12px;background:rgba(255,255,255,.15);padding:4px 8px;border-radius:4px;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.__wt_picker_bar .wt-badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;margin-left:6px;}.__wt_picker_bar .wt-badge-ok{background:rgba(34,197,94,.25);color:#bbf7d0;}.__wt_picker_bar .wt-badge-warn{background:rgba(234,179,8,.25);color:#fef08a;}';
document.head.appendChild(s);
var bar=document.createElement('div');
bar.className='__wt_picker_bar';
bar.innerHTML='<div><strong>WalkThru Picker</strong> \\u2014 Hover & click an element</div><div style="display:flex;gap:8px;align-items:center"><span class="wt-sel">\\u2014</span><span class="wt-badge" id="__wt_badge"></span><button id="__wt_cancel">Cancel</button></div>';
document.body.appendChild(bar);
var selSpan=bar.querySelector('.wt-sel');
var badgeSpan=document.getElementById('__wt_badge');
var lastEl=null;
function countMatches(sel){try{return document.querySelectorAll(sel).length;}catch(e){return 0;}}
function tryUnique(sel){return countMatches(sel)===1;}
function esc(v){return CSS.escape(v);}
function isSapDynamic(id){return /^__[a-z]+[0-9]/.test(id)||/^__nep/.test(id)||/^__xml/.test(id)||/^__component/.test(id);}
function sapStableId(el){
  var id=el.id||'';
  if(id.indexOf('--')!==-1){var stable=id.split('--').pop();if(stable&&stable.length>2&&!/^[0-9]+$/.test(stable))return stable;}
  return null;
}
function nepTileSelector(el){
  var cur=el;var depth=0;
  while(cur&&cur!==document.body&&depth<10){
    if(cur.classList){
      var cls=Array.from(cur.classList);
      for(var i=0;i<cls.length;i++){
        var m=cls[i].match(/^nepTile([0-9a-fA-F]{20,})$/);
        if(m){var s='.'+cls[i];if(tryUnique(s))return s;
          s='.nepFCardContainer.'+cls[i];if(tryUnique(s))return s;
        }
      }
    }
    cur=cur.parentElement;depth++;
  }
  return null;
}
function nepSectionSelector(el){
  var cur=el;var depth=0;
  while(cur&&cur!==document.body&&depth<15){
    var secId=cur.getAttribute&&cur.getAttribute('data-nep-section-id');
    if(secId){var s='[data-nep-section-id="'+secId+'"]';if(tryUnique(s))return{sel:s,el:cur};}
    cur=cur.parentElement;depth++;
  }
  return null;
}
function attrSel(el){
  var tag=el.tagName.toLowerCase();
  var stId=sapStableId(el);
  if(stId){var s='[id$="--'+stId+'"]';if(tryUnique(s))return s;}
  var al=el.getAttribute('aria-label');
  if(al&&al.length<100){var s=tag+'[aria-label="'+al+'"]';if(tryUnique(s))return s;}
  var tt=el.getAttribute('title');
  if(tt&&tt.length<100){var s=tag+'[title="'+tt+'"]';if(tryUnique(s))return s;}
  var ph=el.getAttribute('placeholder');
  if(ph){var s=tag+'[placeholder="'+ph+'"]';if(tryUnique(s))return s;}
  var nm=el.getAttribute('name');
  if(nm){var s=tag+'[name="'+nm+'"]';if(tryUnique(s))return s;}
  var rl=el.getAttribute('role');
  if(rl&&al){var s='[role="'+rl+'"][aria-label="'+al+'"]';if(tryUnique(s))return s;}
  var tp=el.getAttribute('type');
  if(rl&&tp){var s=tag+'[role="'+rl+'"][type="'+tp+'"]';if(tryUnique(s))return s;}
  var sapAttrs=['data-sap-ui','data-sap-ui-type','data-sap-ui-customstyle','data-sap-ui-icon','data-help-id','data-automation-id','data-nep-section-id'];
  for(var i=0;i<sapAttrs.length;i++){var v=el.getAttribute(sapAttrs[i]);if(v&&!isSapDynamic(v)&&v.length<100){var s='['+sapAttrs[i]+'="'+v+'"]';if(tryUnique(s))return s;}}
  if(el.classList){var cls=Array.from(el.classList);for(var i=0;i<cls.length;i++){var m=cls[i].match(/^nepTile([0-9a-fA-F]{20,})$/);if(m){var s='.nepFCardContainer.'+cls[i];if(tryUnique(s))return s;var s2='.'+cls[i];if(tryUnique(s2))return s2;}}}
  var das=Array.from(el.attributes).filter(function(a){return a.name.startsWith('data-')&&a.value&&a.value.length<80&&!isSapDynamic(a.value);});
  for(var i=0;i<das.length;i++){var s=tag+'['+das[i].name+'="'+das[i].value+'"]';if(tryUnique(s))return s;}
  if(el.id&&!isSapDynamic(el.id)){var s='#'+esc(el.id);if(tryUnique(s))return s;}
  return null;
}
function stableAncestor(el){
  var p=el.parentElement;
  var depth=0;
  while(p&&p!==document.body&&depth<10){
    var secId=p.getAttribute&&p.getAttribute('data-nep-section-id');
    if(secId){var s='[data-nep-section-id="'+secId+'"]';if(tryUnique(s))return{sel:s,el:p};}
    if(p.classList){var cls=Array.from(p.classList);for(var i=0;i<cls.length;i++){var m=cls[i].match(/^nepTile([0-9a-fA-F]{20,})$/);if(m){var s='.nepFCardContainer.'+cls[i];if(tryUnique(s))return{sel:s,el:p};}}}
    var stId=sapStableId(p);
    if(stId){var s='[id$="--'+stId+'"]';if(tryUnique(s))return{sel:s,el:p};}
    if(p.id&&!isSapDynamic(p.id))return{sel:'#'+esc(p.id),el:p};
    var al=p.getAttribute('aria-label');
    if(al&&al.length<100){var s=p.tagName.toLowerCase()+'[aria-label="'+al+'"]';if(tryUnique(s))return{sel:s,el:p};}
    p=p.parentElement;depth++;
  }
  return null;
}
function getSelector(el){
  var orig=el;
  var nepTile=nepTileSelector(orig);
  if(nepTile)return nepTile;
  var direct=attrSel(orig);
  if(direct)return direct;
  var anc=stableAncestor(orig);
  if(anc){
    var tag=orig.tagName.toLowerCase();
    var childAttr=attrSel(orig);
    if(childAttr)return anc.sel+' '+childAttr;
    var txt=orig.textContent&&orig.textContent.trim();
    if(txt&&txt.length>1&&txt.length<80){
      var sameTag=Array.from(anc.el.querySelectorAll(tag));
      var textMatches=sameTag.filter(function(c){return c.textContent&&c.textContent.trim()===txt;});
      if(textMatches.length===1){
        if(sameTag.length===1)return anc.sel+' '+tag;
        var idx=sameTag.indexOf(orig);
        if(idx!==-1)return anc.sel+' '+tag+':nth-of-type('+(idx+1)+')';
      }
    }
    var siblings=Array.from(anc.el.querySelectorAll(tag));
    if(siblings.length===1)return anc.sel+' '+tag;
    var idx=siblings.indexOf(orig);
    if(idx!==-1&&siblings.length<20)return anc.sel+' '+tag+':nth-of-type('+(idx+1)+')';
  }
  var path=[];
  var cur=orig;
  while(cur&&cur!==document.body&&cur!==document.documentElement){
    var tag=cur.tagName.toLowerCase();
    var found=attrSel(cur);
    if(found){path.unshift(found);break;}
    if(cur.id&&!isSapDynamic(cur.id)){path.unshift('#'+esc(cur.id));break;}
    var nepCls=cur.classList?Array.from(cur.classList).filter(function(c){return /^nep[A-Z]/.test(c)&&c.length<40&&!/[0-9a-f]{20}/.test(c);}):[];
    var genCls=Array.from(cur.classList||[]).filter(function(c){return!c.startsWith('__wt_')&&!c.startsWith('sap')&&c.length<40;}).map(function(c){return'.'+esc(c);}).join('');
    var allCls=nepCls.length>0?'.'+nepCls.map(esc).join('.'):genCls;
    if(allCls&&cur.parentElement&&cur.parentElement.querySelectorAll(tag+allCls).length===1){path.unshift(tag+allCls);break;}
    var parent=cur.parentElement;
    if(parent){var sibs=Array.from(parent.children).filter(function(c){return c.tagName===cur.tagName;});
    if(sibs.length>1){var idx=sibs.indexOf(cur)+1;path.unshift(tag+':nth-of-type('+idx+')');}else{path.unshift(tag+(allCls||''));}}
    else{path.unshift(tag);}
    cur=parent;
  }
  return path.join(' > ');
}
/* Generate multiple alternative selectors for fallback */
function getAllSelectors(el){
  var selectors=[];
  var seen={};
  function addSel(s){if(s&&!seen[s]){seen[s]=true;selectors.push(s);}}
  /* Primary selector */
  addSel(getSelector(el));
  /* Try attribute-based alternatives */
  var tag=el.tagName.toLowerCase();
  var al=el.getAttribute('aria-label');
  if(al&&al.length<100)addSel(tag+'[aria-label="'+al+'"]');
  var tt=el.getAttribute('title');
  if(tt&&tt.length<100)addSel(tag+'[title="'+tt+'"]');
  var ph=el.getAttribute('placeholder');
  if(ph)addSel(tag+'[placeholder="'+ph+'"]');
  var nm=el.getAttribute('name');
  if(nm)addSel(tag+'[name="'+nm+'"]');
  var href=el.getAttribute('href');
  if(href&&href.length<150)addSel(tag+'[href="'+href+'"]');
  /* ID-based (non-dynamic) */
  if(el.id&&!isSapDynamic(el.id))addSel('#'+esc(el.id));
  /* SAP stable ID suffix */
  var stId=sapStableId(el);
  if(stId)addSel('[id$="--'+stId+'"]');
  /* Ancestor-scoped alternatives */
  var anc=stableAncestor(el);
  if(anc){
    if(al)addSel(anc.sel+' '+tag+'[aria-label="'+al+'"]');
    if(tt)addSel(anc.sel+' '+tag+'[title="'+tt+'"]');
    var cls=Array.from(el.classList||[]).filter(function(c){return!c.startsWith('__wt_')&&c.length<40;});
    if(cls.length>0){var clsSel=tag+'.'+cls.map(esc).join('.');addSel(anc.sel+' '+clsSel);}
  }
  /* Filter to unique selectors only, then include non-unique as last resort */
  var unique=selectors.filter(function(s){return tryUnique(s);});
  var nonUnique=selectors.filter(function(s){return!tryUnique(s)&&countMatches(s)>0;});
  var result=unique.concat(nonUnique);
  return result.slice(0,4);
}
/* Collect rich metadata for self-healing */
function collectMeta(el){
  var rect=el.getBoundingClientRect();
  var txt=(el.textContent||'').trim();
  var meta={
    tag:el.tagName.toLowerCase(),
    classes:Array.from(el.classList||[]).filter(function(c){return!c.startsWith('__wt_');}),
    text:txt.substring(0,120),
    ariaLabel:el.getAttribute('aria-label')||'',
    role:el.getAttribute('role')||'',
    href:el.getAttribute('href')||'',
    title:el.getAttribute('title')||'',
    placeholder:el.getAttribute('placeholder')||'',
    name:el.getAttribute('name')||'',
    type:el.getAttribute('type')||'',
    dataAttrs:{},
    boundingBox:{top:Math.round(rect.top),left:Math.round(rect.left),width:Math.round(rect.width),height:Math.round(rect.height)},
    parentSelector:''
  };
  /* Capture data-* attributes */
  try{Array.from(el.attributes).forEach(function(a){if(a.name.startsWith('data-')&&a.value&&a.value.length<100&&!isSapDynamic(a.value)){meta.dataAttrs[a.name]=a.value;}});}catch(ex){}
  /* Parent context */
  try{var p=el.parentElement;if(p){if(p.id)meta.parentSelector='#'+CSS.escape(p.id);else{var pal=p.getAttribute('aria-label');if(pal)meta.parentSelector=p.tagName.toLowerCase()+'[aria-label="'+pal+'"]';}}}catch(ex){}
  return meta;
}
function updateBadge(sel){
  var n=countMatches(sel);
  if(n===1){badgeSpan.textContent='\\u2705 1 match';badgeSpan.className='wt-badge wt-badge-ok';}
  else if(n===0){badgeSpan.textContent='\\u26a0\\ufe0f 0 matches';badgeSpan.className='wt-badge wt-badge-warn';}
  else{badgeSpan.textContent='\\u26a0\\ufe0f '+n+' matches';badgeSpan.className='wt-badge wt-badge-warn';}
}
function onMove(e){
  if(e.target===bar||bar.contains(e.target))return;
  if(lastEl)lastEl.classList.remove('__wt_picker_highlight');
  lastEl=e.target;
  lastEl.classList.add('__wt_picker_highlight');
  var sel=getSelector(lastEl);
  selSpan.textContent=sel;
  updateBadge(sel);
}
function onClick(e){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(e.target===bar||bar.contains(e.target))return;
  var allSels=getAllSelectors(e.target);
  var primary=allSels[0]||getSelector(e.target);
  var meta=collectMeta(e.target);
  navigator.clipboard.writeText(primary).then(function(){
    selSpan.textContent='\\u2713 Copied: '+primary;
    selSpan.style.background='rgba(255,255,255,.3)';
    updateBadge(primary);
    try{localStorage.setItem('__wt_picked_selector',JSON.stringify({selector:primary,fallbacks:allSels.slice(1),sessionId:'${sessionId}',ts:Date.now(),meta:meta}));}catch(ex){}
    setTimeout(function(){destroy();},1200);
  });
}
function destroy(){
  document.removeEventListener('mouseover',onMove,true);
  document.removeEventListener('click',onClick,true);
  if(lastEl)lastEl.classList.remove('__wt_picker_highlight');
  if(s.parentNode)s.remove();
  if(bar.parentNode)bar.remove();
  delete window.__wt_picker;
}
document.addEventListener('mouseover',onMove,true);
document.addEventListener('click',onClick,true);
document.getElementById('__wt_cancel').addEventListener('click',function(e){e.stopPropagation();destroy();});
window.__wt_picker={destroy:destroy};
})())`;
}

/**
 * Generates a console-pastable version (not bookmarklet-encoded).
 */
export function generatePickerConsoleScript(sessionId: string): string {
  return generatePickerScript(sessionId).replace('javascript:void(', '(').replace(/\)$/, ')');
}
