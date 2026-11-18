const $ = id => document.getElementById(id);
const num = n => String(n).padStart(2,'0');
const menuLabel = i => drinks[i].selection || 'NO. '+num(i+1);
const icon = name => '<svg class="ico" aria-hidden="true"><use href="#'+name+'"/></svg>';
const photo = (i,small=false) => './assets/classics/'+(small?'cards/':'')+drinks[i].slug+'.webp';
const drinkUrl = i => '#drink/'+drinks[i].slug;
const indexFor = hash => drinks.findIndex(note=>hash==='#drink/'+note.slug);
const homeTitle = "Cain's Homebar · 酒单";
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let featured=-1, activeFlavor='all', lastRandom=-1;
let displayedHash=null, routeVersion=0, flight=null;
history.scrollRestoration='manual';
const ratingLabels = ['酒精感','甜度','酸度'];

// Stock is matched against the current recipe. Generic orange liqueur is covered by Cointreau.
const unavailableIngredients = new Set([
  '金巴利','阿佩罗','甜红味美思','都灵甜红味美思','丽叶白开胃酒',
  '咖啡利口酒','杏仁利口酒','百香果利口酒','黑莓利口酒','紫罗兰利口酒',
  '马拉斯奇诺樱桃利口酒','马拉斯奇诺利口酒','橙味库拉索','法勒南香料糖酒',
  '绿查特酒','黄查特酒','诺尼诺阿玛罗苦酒','本笃草本利口酒',
  '白兰地','干邑','皮斯科白兰地','冰镇香槟'
]);
const soldOut = drinks.map(drink=>drink.ingredients.some(([name])=>unavailableIngredients.has(name)));
const available = drinks.map((_,i)=>i).filter(i=>!soldOut[i]);
const soldOutMask = '<span class="stock-mask"><span class="stock-label">卖完了</span></span>';

function availablePick(...exclude){
  const eligible=available.filter(i=>!exclude.includes(i));
  const pool=eligible.length?eligible:available;
  return pool[Math.floor(Math.random()*pool.length)];
}

function starRating(value){
  const stars = Array.from({length:5}, (_,index)=>{
    const fill = value >= index+1 ? '#69cfaa' : value > index ? 'url(#half-fill)' : '#424a48';
    return `<use href="#flavor-star" x="${index*21}" width="20" height="20" fill="${fill}"/>`;
  }).join('');
  return `<svg class="rating-stars" viewBox="0 0 104 20" role="img" aria-label="五颗星中的 ${value} 颗"><title>${value} / 5</title>${stars}</svg>`;
}
function flavorProfile(i){
  const {tastes,styles,ratings} = drinks[i];
  const tags = styles.map(style=>`<span>${style}</span>`).join('');
  const scores = ratingLabels.map((label,index)=>
    `<div class="score"><dt>${label}</dt><dd>${starRating(ratings[index])}</dd></div>`
  ).join('');
  return `<div class="flavor-profile">
    <dl class="profile-notes">
      <dt>口味</dt><dd class="taste-notes">${tastes.join('、')}</dd>
      <dt>风格</dt><dd class="style-tags">${tags}</dd>
    </dl>
    <dl class="scores">${scores}</dl>
  </div>`;
}
function glassStyle(i){
  const {ratio,foot,mat}=drinks[i].glass;
  return `--ratio:${ratio};--foot:${foot}%;--mat:${mat}%`;
}
function scene(i,id=''){
  return `<div class="studio-scene" style="${glassStyle(i)}"><div class="glass-stand"><span class="coaster" aria-hidden="true"></span><img class="glass" ${id?'id="'+id+'"':''} data-drink="${drinks[i].slug}" src="${photo(i,!id)}" alt="${drinks[i].name}" ${id?'fetchpriority="high"':'loading="lazy" decoding="async"'}></div></div>`;
}
function card(i){
  const d=drinks[i];
  return `<article class="card${soldOut[i]?' is-sold-out':''}"><a href="${drinkUrl(i)}" class="card-main"><div class="card-pic"><span class="card-no">${menuLabel(i)}</span>${scene(i)}${soldOut[i]?soldOutMask:''}</div><div class="card-body"><div class="card-title"><h3>${d.name}</h3><div class="card-info"><small>${d.flavor}</small></div></div>${flavorProfile(i)}</div></a></article>`;
}
function renderMenu(){
  $('cards').innerHTML=drinks.map((d,i)=>activeFlavor==='all'||activeFlavor===d.flavor?card(i):'').join('');
}
function showFeatured(index,direction=0){
  featured=index;
  const d=drinks[index];
  const words=d.name.split(' ');
  $('hero-last').textContent=words.pop()+'.';
  $('hero-first').textContent=words.join(' ');
  $('hero-profile').innerHTML=flavorProfile(index);
  const img=$('hero-img');
  img.closest('.studio-scene').style.cssText=glassStyle(index);
  img.dataset.drink=d.slug;
  img.src=photo(index);
  img.alt=d.name;
  $('hero-detail').href=drinkUrl(index);
  $('slide-no').textContent=num(index+1);
  try{sessionStorage.setItem('homebar-last-pick',d.slug);}catch{}
  if(direction && !reducedMotion.matches){
    img.animate([
      {transform:'translate3d('+direction*22+'px,-6px,0)',opacity:0},
      {transform:'none',opacity:1}
    ],{duration:460,easing:'cubic-bezier(.22,.75,.23,1)'});
    $('hero-copy').classList.remove('fade-in');
    void $('hero-copy').offsetWidth;
    $('hero-copy').classList.add('fade-in');
  }
}
function randomFeatured(){
  let previous=featured;
  if(previous<0){
    try{previous=drinks.findIndex(d=>d.slug===sessionStorage.getItem('homebar-last-pick'));}catch{}
  }
  if(available.length) showFeatured(availablePick(previous));
}
function stepFeatured(direction){
  if(!available.length) return;
  const position=available.indexOf(featured);
  const next=(position+direction+available.length)%available.length;
  showFeatured(available[next],direction);
}
function renderDrink(i){
  const d=drinks[i];
  const words=d.name.split(' '), last=words.pop();
  $('reader').innerHTML=`
    <div class="reading-bar"><a class="return-link" data-return href="#menu">${icon('arrow')} 返回酒单</a>
      <div class="page-turn"><span class="mono">${num(i+1)} <i>/</i> ${drinks.length}</span>
      <a class="circle prev" href="${drinkUrl((i+drinks.length-1)%drinks.length)}" aria-label="上一杯酒">${icon('arrow')}</a><a class="circle" href="${drinkUrl((i+1)%drinks.length)}" aria-label="下一杯酒">${icon('arrow')}</a></div></div>
    <article class="spread">
      <figure class="drink-figure">${scene(i,'reading-photo')}${soldOut[i]?soldOutMask:''}<figcaption><span>Cain's Homebar</span><span class="mono">${menuLabel(i)}</span></figcaption></figure>
      <div class="story-copy"><div class="story-topline"><div class="eyebrow"><i></i> CLASSIC COCKTAIL · ${d.selection || num(i+1)}</div>
      <button type="button" class="like-button">${icon('like-heart')}<span class="like-label">点赞</span><span class="like-count" aria-live="polite">…</span></button></div>
      <h1 tabindex="-1" id="reading-title">${words.join(' ')} <em>${last}.</em></h1>
      ${soldOut[i]?'<div class="story-sub"><span class="stock-badge">卖完了</span></div>':''}
      ${flavorProfile(i)}
      <section class="story-section"><h3>背景</h3>${d.story.map(p=>`<p>${p}</p>`).join('')}</section>
      </div>
    </article>
    <details class="recipe"><summary><span>调制手记 <em>Recipe Notes</em></span><span class="recipe-plus" aria-hidden="true">+</span></summary><div class="recipe-inner"><section><h3>一杯份</h3><ul class="ingredients">${d.ingredients.map(([k,v])=>`<li>${k}<span>${v}</span></li>`).join('')}</ul></section><section><h3>调制方法</h3><p>${d.method}</p></section></div></details>`;
  drinkLikes.attach(d, document.querySelector('#reader .like-button'));
}
function finishFlight(){
  if(!flight) return;
  const current=flight;
  flight=null;
  current.animation?.cancel();
  current.clone.remove();
  current.source.style.visibility='';
  current.source.closest('.glass-stand')?.classList.remove('lifted');
  if(current.target) current.target.style.visibility='';
}
function glassInView(img){
  if(!img || !img.complete || !img.naturalWidth) return false;
  const r=img.getBoundingClientRect();
  return r.width>0 && r.bottom>0 && r.top<innerHeight;
}
function liftGlass(source){
  if(reducedMotion.matches || !glassInView(source) || !source.animate) return null;
  const start=source.getBoundingClientRect();
  const clone=new Image();
  clone.src=source.currentSrc;
  clone.alt='';
  clone.setAttribute('aria-hidden','true');
  clone.className='travelling-glass';
  clone.classList.toggle('is-sold-out',!!source.closest('.is-sold-out'));
  Object.assign(clone.style,{left:start.x+'px',top:start.y+'px',width:start.width+'px',height:start.height+'px'});
  document.body.append(clone);
  source.style.visibility='hidden';
  source.closest('.glass-stand')?.classList.add('lifted');
  const lift=Math.min(25,start.height*.1);
  const raised='translate3d(0,-'+lift+'px,0) scale(1.045)';
  const animation=clone.animate([{transform:'none'},{transform:raised}],{duration:145,easing:'cubic-bezier(.23,.72,.32,1)',fill:'forwards'});
  flight={clone,source,start,raised,lift,animation,target:null};
  return flight;
}
function settleGlass(moving,target){
  if(!moving || flight!==moving) return;
  if(!target || !target.getBoundingClientRect().width){finishFlight();return;}
  const end=target.getBoundingClientRect();
  if(end.bottom<=0 || end.top>=innerHeight){finishFlight();return;}
  const same=moving.source.dataset.drink===target.dataset.drink;
  const {start,clone,raised}=moving;
  let frames;
  if(same){
    moving.target=target;
    target.style.visibility='hidden';
    const dx=end.x+end.width/2-start.x-start.width/2, dy=end.bottom-start.bottom;
    const scale=end.height/start.height;
    const arc=Math.min(60,Math.max(20,Math.abs(dx)*.1));
    frames=[{transform:raised},{offset:.68,transform:`translate3d(${dx*.88}px,${dy*.86-arc}px,0) scale(${1+(scale-1)*.9})`,easing:'cubic-bezier(.16,.7,.2,1)'},{transform:`translate3d(${dx}px,${dy}px,0) scale(${scale})`}];
  }else{
    frames=[{transform:raised,opacity:1},{transform:'translate3d(-64px,-24px,0) scale(.96)',opacity:0}];
    target.animate([{transform:'translate3d(65px,-13px,0) scale(.96)',opacity:0},{transform:'none',opacity:1}],{duration:580,easing:'cubic-bezier(.2,.76,.2,1)'});
  }
  moving.animation.cancel();
  moving.animation=clone.animate(frames,{duration:same?660:350,easing:'cubic-bezier(.32,.03,.18,1)',fill:'forwards'});
  moving.animation.onfinish=()=>{if(flight===moving) finishFlight()};
}
let requestedHash=null;
async function route(source=null,restore=false){
  const version=++routeVersion;
  finishFlight();
  const hash=location.hash, i=indexFor(hash), previous=indexFor(displayedHash);
  requestedHash=hash;
  const oldGlass=source || (previous>=0?$('reading-photo'):null);
  const moving=liftGlass(oldGlass);
  if(moving){
    await moving.animation.finished.catch(()=>{});
    if(version!==routeVersion) return;
  }
  const home=i<0;
  if(home && (displayedHash===null || previous>=0 || (hash==='#top' && displayedHash!==hash))){
    randomFeatured();
  }
  const state=history.state||{};
  $('top').hidden=!home;
  $('reader').hidden=home;
  $('reader').classList.toggle('is-sold-out',i>=0 && soldOut[i]);
  document.body.classList.toggle('reading',i>=0);
  if(i>=0) renderDrink(i);
  else $('reader').replaceChildren();
  document.title=i>=0?drinks[i].name+" · Cain's Homebar":homeTitle;
  const destination=restore&&Number.isFinite(state.y)?state.y:hash==='#menu'?$('menu').offsetTop:0;
  window.scrollTo({top:destination,behavior:'instant'});
  const target=i>=0?$('reading-photo'):previous>=0?(state.fromHero?$('hero-img'):document.querySelector('#cards a[href="'+drinkUrl(previous)+'"] .glass')):null;
  if(displayedHash!==null){
    if(i>=0) $('reading-title').focus({preventScroll:true});
    else if(target) (state.fromHero?$('hero-detail'):target.closest('a'))?.focus({preventScroll:true});
    settleGlass(moving,target);
    if(!moving && i>=0 && !reducedMotion.matches && target.animate){
      target.animate([{transform:'translate3d(12px,-21px,0)',opacity:0},{transform:'none',opacity:1}],{duration:560,easing:'cubic-bezier(.18,.76,.2,1)'});
    }
  }
  displayedHash=hash;
}
function navigate(hash,trigger=null){
  if(hash===location.hash){
    if(hash==='#menu') $('menu').scrollIntoView();
    if(hash==='#top'){randomFeatured();window.scrollTo({top:0,behavior:'auto'});}
    return;
  }
  const old=history.state||{}, fromHero=trigger===$('hero-detail');
  const withinStory=indexFor(location.hash)>=0 && indexFor(hash)>=0;
  const source=fromHero?$('hero-img'):trigger?.querySelector('img');
  if(withinStory) history.replaceState({...old,y:0},'',hash);
  else{
    history.replaceState({...old,y:scrollY,fromHero},'');
    history.pushState({hasOrigin:true},'',hash);
  }
  route(source);
}
document.addEventListener('click',e=>{
  const anchor=e.target.closest('a[href^="#"]');
  if(anchor && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button===0){
    e.preventDefault();
    if(anchor.hasAttribute('data-return') && history.state?.hasOrigin) history.back();
    else navigate(anchor.hash,anchor);
    return;
  }
  const btn=e.target.closest('button');
  if(!btn) return;
  if(btn.hasAttribute('data-filter')){
    activeFlavor=btn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    renderMenu();
  }
});
window.addEventListener('popstate',()=>route(null,true));
window.addEventListener('hashchange',()=>{if(location.hash!==requestedHash)route(null,true)});
window.addEventListener('resize',finishFlight);
window.addEventListener('pageshow',e=>{if(e.persisted && indexFor(location.hash)<0) randomFeatured()});
$('prev').onclick=()=>stepFeatured(-1);
$('next').onclick=()=>stepFeatured(1);
$('random').onclick=()=>{
  if(!available.length) return;
  lastRandom=availablePick(lastRandom,indexFor(location.hash));
  navigate(drinkUrl(lastRandom));
};
$('random').disabled=!available.length;
document.querySelector('.hero').hidden=!available.length;
$('menu-total').textContent=drinks.length;
$('hero-total').textContent=drinks.length;
renderMenu();
route(null,true);
const hero=document.querySelector('.hero');
let swipeStart;
hero.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'||!e.isPrimary||e.target.closest('button,a')) return;
  swipeStart={id:e.pointerId,x:e.clientX,y:e.clientY};
  hero.setPointerCapture(e.pointerId);
});
hero.addEventListener('pointerup',e=>{
  if(!swipeStart||swipeStart.id!==e.pointerId) return;
  const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;
  swipeStart=null;
  if(Math.abs(dx)>48 && Math.abs(dx)>Math.abs(dy)*1.5) stepFeatured(dx<0?1:-1);
});
hero.addEventListener('pointercancel',()=>{swipeStart=null});
