/**
 * Generates the Element Picker bookmarklet script.
 * When run on any page, it highlights elements on hover and
 * captures a unique CSS selector on click, copying it to clipboard.
 */
export function generatePickerScript(sessionId: string): string {
  return `javascript:void((function(){
if(window.__wt_picker){window.__wt_picker.destroy();delete window.__wt_picker;return;}
var s=document.createElement('style');
s.id='__wt_picker_style';
s.textContent='.__wt_picker_highlight{outline:2px solid #1e6b45 !important;outline-offset:2px !important;cursor:crosshair !important;}.__wt_picker_bar{position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#1e6b45;color:#fff;font:14px/1.4 system-ui;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 -4px 20px rgba(0,0,0,.2);}.__wt_picker_bar button{background:#fff;color:#1e6b45;border:none;padding:6px 14px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;}.__wt_picker_bar .wt-sel{font-family:monospace;font-size:12px;background:rgba(255,255,255,.15);padding:4px 8px;border-radius:4px;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}';
document.head.appendChild(s);
var bar=document.createElement('div');
bar.className='__wt_picker_bar';
bar.innerHTML='<div><strong>WalkThru Picker</strong> — Hover & click an element</div><div style="display:flex;gap:8px;align-items:center"><span class="wt-sel">—</span><button id="__wt_cancel">Cancel</button></div>';
document.body.appendChild(bar);
var selSpan=bar.querySelector('.wt-sel');
var lastEl=null;
function getSelector(el){
  var orig=el;
  function tryUnique(sel){try{return document.querySelectorAll(sel).length===1;}catch(e){return false;}}
  function esc(v){return CSS.escape(v);}
  function attrSel(el){
    var tag=el.tagName.toLowerCase();
    var al=el.getAttribute('aria-label');
    if(al){var s=tag+'[aria-label="'+al+'"]';if(tryUnique(s))return s;}
    var ph=el.getAttribute('placeholder');
    if(ph){var s=tag+'[placeholder="'+ph+'"]';if(tryUnique(s))return s;}
    var nm=el.getAttribute('name');
    if(nm){var s=tag+'[name="'+nm+'"]';if(tryUnique(s))return s;}
    var tt=el.getAttribute('title');
    if(tt){var s=tag+'[title="'+tt+'"]';if(tryUnique(s))return s;}
    var rl=el.getAttribute('role');
    var tp=el.getAttribute('type');
    if(rl&&tp){var s=tag+'[role="'+rl+'"][type="'+tp+'"]';if(tryUnique(s))return s;}
    var das=Array.from(el.attributes).filter(function(a){return a.name.startsWith('data-')&&a.value&&a.value.length<80;});
    for(var i=0;i<das.length;i++){var s=tag+'['+das[i].name+'="'+das[i].value+'"]';if(tryUnique(s))return s;}
    if(el.id){var s='#'+esc(el.id);if(tryUnique(s))return s;}
    return null;
  }
  var direct=attrSel(orig);
  if(direct)return direct;
  if(orig.id)return'#'+esc(orig.id);
  var path=[];
  while(el&&el!==document.body&&el!==document.documentElement){
    var tag=el.tagName.toLowerCase();
    var found=attrSel(el);
    if(found){path.unshift(found);break;}
    if(el.id){path.unshift('#'+esc(el.id));break;}
    var classes=Array.from(el.classList).filter(function(c){return!c.startsWith('__wt_')&&c.length<40;}).map(function(c){return'.'+esc(c);}).join('');
    if(classes&&el.parentElement&&el.parentElement.querySelectorAll(tag+classes).length===1){path.unshift(tag+classes);break;}
    var parent=el.parentElement;
    if(parent){var siblings=Array.from(parent.children).filter(function(c){return c.tagName===el.tagName;});
    if(siblings.length>1){var idx=siblings.indexOf(el)+1;path.unshift(tag+':nth-of-type('+idx+')');}else{path.unshift(tag+(classes||''));}}
    else{path.unshift(tag);}
    el=parent;
  }
  return path.join(' > ');
}
function onMove(e){
  if(e.target===bar||bar.contains(e.target))return;
  if(lastEl)lastEl.classList.remove('__wt_picker_highlight');
  lastEl=e.target;
  lastEl.classList.add('__wt_picker_highlight');
  selSpan.textContent=getSelector(lastEl);
}
function onClick(e){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(e.target===bar||bar.contains(e.target))return;
  var sel=getSelector(e.target);
  navigator.clipboard.writeText(sel).then(function(){
    selSpan.textContent='✓ Copied: '+sel;
    selSpan.style.background='rgba(255,255,255,.3)';
    try{localStorage.setItem('__wt_picked_selector',JSON.stringify({selector:sel,sessionId:'${sessionId}',ts:Date.now()}));}catch(ex){}
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
