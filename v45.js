
(() => {
  'use strict';
  const D=window.__GOLD_DEBUG__, G=window.__GOLD_3D__;
  if(!D||!G)return;
  const state=D.state,$=s=>document.querySelector(s),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  state.v45=state.v45||{negotiations:{},stats:{consults:0,discounts:0,accepted:0,rejected:0},autoAssist:true};
  const fmt=n=>new Intl.NumberFormat('vi-VN').format(Math.round(Number(n)||0))+'đ';
  const short=n=>{n=Number(n)||0;const a=Math.abs(n);if(a>=1e9)return (n/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ';if(a>=1e6)return (n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' triệu';return fmt(n)};
  const eligible=new Set(['sale','exchangeSame','exchangeCross']);
  let lastSig='';

  function selectedAgent(){
    const sel=G.selected?.(); if(!sel||sel.type!=='agent')return null;
    return G.agents.get(sel.id)||null;
  }
  function scheduleItemFor(agent){return (state.liveStore?.schedule||[]).find(x=>'cust:'+x.id===agent?.id)||null}
  function eventFor(item){
    if(!item)return state.currentEvent||null;
    const served=(state.liveStore?.schedule||[])[Math.max(0,state.situationsToday-1)];
    if(state.currentEvent&&!state.currentEvent.done&&served?.id===item.id)return state.currentEvent;
    return state.dayQueue?.[item.index]||null;
  }
  function skuFor(ev){if(!ev)return null;const id=ev.data?.skuId||ev.data?.newSku;return state.inventoryItems?.find(x=>x.sku===id)||null}
  function customerRec(ev,agent){return state.customers?.find(c=>c.id===ev?.customer?.customerId||c.name===ev?.customer?.name||c.name===agent?.name)||null}
  function patience(item){return item?clamp(100-Math.max(0,(state.clockMinutes||0)-item.arrival)*.55,0,100):100}
  function keyFor(ev,item){return `${state.day}:${item?.index??state.situationsToday}:${ev?.type||'none'}:${ev?.customer?.name||item?.name||'npc'}`}
  function record(ev,item){const k=keyFor(ev,item);return state.v45.negotiations[k]||(state.v45.negotiations[k]={goodwill:0,accepted:false,rejected:0,consulted:false,laborDiscount:false,feeDiscount:false,hold:false})}
  function bestStaff(){return [...(state.staff||[])].sort((a,b)=>((b.skill||0)+(b.trust||0)+(b.energy||100)*.2)-((a.skill||0)+(a.trust||0)+(a.energy||100)*.2))[0]||null}
  function intent(agent,item,ev){
    const sku=skuFor(ev),rec=customerRec(ev,agent),r=record(ev,item);let cmp=null,score=62;
    if(sku&&D.compareOffer){cmp=D.compareOffer(sku,ev?.type==='exchangeSame'?'exchange':'sale');score=cmp.conversion*100}
    if(ev?.type==='lostCustomer')score=18;
    const p=patience(item),loyalty=Number(rec?.loyalty??50),staff=bestStaff(),skill=Number(staff?.skill??65),rep=Number(state.reputation??50);
    score+=(p-50)*.18+(loyalty-50)*.16+(skill-65)*.13+(rep-50)*.12+(r.goodwill||0);
    const persona=agent?.profile?.persona;
    if(persona==='price'&&cmp?.priceGap>0)score-=Math.min(18,cmp.priceGap*95);
    if(persona==='vip'&&rep>=75)score+=6;
    if(persona==='urgent'&&p<55)score-=8;
    if(persona==='careful'&&r.consulted)score+=4;
    if(r.accepted)score=99;
    return {score:clamp(score,5,99),cmp,p,loyalty,staff,rec,r};
  }
  function recomputeExpected(ev){
    if(!ev)return;
    const sku=skuFor(ev);if(!sku)return;
    const r=D.retailComponents(sku);
    if(ev.type==='sale')ev.data.expected=r.total;
    if(ev.type==='exchangeSame'||ev.type==='exchangeCross'){
      const oldValue=(Number(ev.data.oldWeight)||0)*(state.market?.[ev.data.oldType]?.buy||0);
      const fee=(Number(ev.data.oldWeight)||0)*(Number(ev.data.fee)||0);
      ev.data.expected=r.total+fee-oldValue;
    }
  }
  function syncCore(){D.renderAll?.();G.renderSide?.();D.save?.(true)}
  function action(type,agent,item,ev){
    if(!ev)return;const data=intent(agent,item,ev),r=data.r,sku=skuFor(ev),staff=data.staff,rec=data.rec;
    if(type==='consult'){
      if(!r.consulted){r.consulted=true;r.goodwill+=7;state.v45.stats.consults++;if(staff)staff.energy=clamp((staff.energy||100)-2,0,100);if(rec)rec.loyalty=clamp((rec.loyalty||50)+1.5,0,100);state.reputation=clamp((state.reputation||50)+.08,0,100)}
    }
    if(type==='labor'&&sku&&!r.laborDiscount){
      const old=Number(sku.laborSell||sku.laborAsk||0),floor=Math.max(Number(sku.laborCost||0)*1.08,0);sku.laborSell=Math.round(Math.max(floor,old*.90)/10000)*10000;sku.laborAsk=sku.laborSell;r.laborDiscount=true;r.goodwill+=9;state.v45.stats.discounts++;recomputeExpected(ev)
    }
    if(type==='fee'&&ev.type==='exchangeSame'&&!r.feeDiscount){ev.data.fee=Math.round((Number(ev.data.fee)||0)*.90/5000)*5000;r.feeDiscount=true;r.goodwill+=8;state.v45.stats.discounts++;recomputeExpected(ev)}
    if(type==='hold'){r.hold=true;r.goodwill-=2}
    if(type==='close'){
      const now=intent(agent,item,ev),roll=Math.random()*100;
      if(roll<=now.score){r.accepted=true;r.goodwill+=4;state.v45.stats.accepted++;if(rec)rec.loyalty=clamp((rec.loyalty||50)+1,0,100);state.reputation=clamp((state.reputation||50)+.05,0,100)}
      else {r.rejected=(r.rejected||0)+1;r.goodwill-=4;state.v45.stats.rejected++;if(staff)staff.energy=clamp((staff.energy||100)-1,0,100)}
    }
    syncCore();render();
  }
  function statusClass(n){return n>=70?'v45-deal-ok':n>=42?'v45-deal-warn':'v45-deal-bad'}
  function renderCard(agent,item,ev){
    if(!agent||agent.kind!=='customer'||!ev)return '';
    const d=intent(agent,item,ev),cmp=d.cmp,r=d.r,sku=skuFor(ev),eligibleDeal=eligible.has(ev.type);
    const reasons=[];
    if(cmp?.phrases?.[0])reasons.push(['Thị trường',cmp.phrases[0]]);
    if(d.p<35)reasons.push(['Chờ lâu',`Kiên nhẫn chỉ còn ${Math.round(d.p)}%.`]);
    if(d.loyalty>=70)reasons.push(['Khách quen',`Tin tưởng CRM ${Math.round(d.loyalty)}/100.`]);
    if(d.staff)reasons.push(['Nhân viên',`${d.staff.name} kỹ năng ${d.staff.skill}/100.`]);
    if(!reasons.length)reasons.push(['Tín hiệu', 'Khách đang cân nhắc khá bình thường.']);
    const compare=cmp?`<div class="v45-compare"><div><span>Giá bên mình</span><strong>${fmt(cmp.ours.total)}</strong></div><div><span>Rẻ nhất đối thủ</span><strong>${fmt(cmp.bestTotal?.total||0)}</strong></div><div><span>Chênh</span><strong>${cmp.priceGap>0?'+':''}${(cmp.priceGap*100).toFixed(1)}%</strong></div></div>`:'';
    const actions=eligibleDeal&&!r.accepted?`<div class="v45-ai-actions"><button class="btn ghost" data-v45="consult" type="button">💬 Tư vấn kỹ</button>${sku&&!r.laborDiscount?'<button class="btn ghost" data-v45="labor" type="button">✂ Giảm công 10%</button>':''}${ev.type==='exchangeSame'&&!r.feeDiscount?'<button class="btn ghost" data-v45="fee" type="button">↘ Giảm phí đổi 10%</button>':''}<button class="btn ghost" data-v45="hold" type="button">🧱 Giữ giá</button><button class="btn primary" data-v45="close" type="button">🤝 CHỐT VỚI KHÁCH</button></div>`:'';
    const badge=r.accepted?'<span class="v45-chip v45-deal-ok">ĐÃ CHỐT</span>':r.rejected?`<span class="v45-chip v45-deal-warn">Từ chối ${r.rejected} lần</span>`:'<span class="v45-chip">AI Deal</span>';
    return `<div class="v45-ai-card" data-v45-card><div class="v45-ai-head"><div><strong>🧠 AI NPC · Ý định chốt</strong><small>${agent.profile?.personaLabel||'Khách'} · ${agent.profile?.budgetTier||''}</small></div><div style="text-align:right"><strong class="v45-intent-score ${statusClass(d.score)}">${Math.round(d.score)}%</strong>${badge}</div></div><div class="v45-meter"><i style="width:${d.score}%"></i></div><div class="v45-reasons">${reasons.slice(0,3).map(x=>`<div class="v45-reason"><b>${x[0]}:</b><span>${x[1]}</span></div>`).join('')}</div>${compare}${actions}</div>`;
  }
  function render(){
    const agent=selectedAgent(),item=scheduleItemFor(agent),ev=eventFor(item),body=$('#v3InteractBody');if(!body)return;
    body.querySelectorAll('[data-v45-card]').forEach(x=>x.remove());
    if(agent&&agent.kind==='customer'&&ev)body.insertAdjacentHTML('beforeend',renderCard(agent,item,ev));
    renderDirector();
  }
  function renderDirector(){
    const wrap=$('#v3CanvasWrap');if(!wrap)return;let el=$('#v45Director');if(!el){el=document.createElement('div');el.id='v45Director';el.className='v45-director';wrap.appendChild(el)}
    const q=G.queueItems?.()||[],best=bestStaff(),avgEnergy=state.staff?.length?state.staff.reduce((s,x)=>s+(x.energy||100),0)/state.staff.length:100;
    const risk=q.filter(x=>patience(x)<30).length;
    el.innerHTML=`<div class="v45-director-head"><div><strong>🧠 AI FLOOR DIRECTOR</strong><small>V1.0 · hỗ trợ vận hành</small></div><span class="v45-chip">${state.v45.autoAssist?'AUTO':'MANUAL'}</span></div><div class="v45-director-line">${q.length} khách đang chờ · ${risk} khách có rủi ro bỏ đi · năng lượng NV ${Math.round(avgEnergy)}%.</div><div class="v45-director-line">${best?`Nên để ${best.name} ưu tiên khách tiếp theo (${best.skill}/100 kỹ năng).`:'Chưa có nhân viên phù hợp.'}</div><button id="v45AutoAssist" type="button">${state.v45.autoAssist?'Tắt':'Bật'} gợi ý tự động</button>`;
    el.querySelector('#v45AutoAssist')?.addEventListener('click',()=>{state.v45.autoAssist=!state.v45.autoAssist;D.save?.(true);renderDirector()});
  }
  function canCheckout(ev){if(!ev||!eligible.has(ev.type))return true;const agent=selectedAgent()||[...G.agents.values()].find(a=>a.kind==='customer');const item=scheduleItemFor(agent);return !!record(ev,item).accepted}
  function promptNegotiation(){
    const agent=selectedAgent();const item=scheduleItemFor(agent);const ev=eventFor(item)||state.currentEvent;
    if(agent&&ev){render();const card=$('[data-v45-card]');card?.scrollIntoView({behavior:'smooth',block:'nearest'})}
    const b=$('#v3SpeechBubble');if(b){b.textContent='Khách chưa chốt đề nghị. Hãy tư vấn / điều chỉnh rồi bấm “CHỐT VỚI KHÁCH” trước khi sang POS.';b.classList.remove('hidden');setTimeout(()=>b.classList.add('hidden'),5200)}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-v45]');if(!b)return;const agent=selectedAgent(),item=scheduleItemFor(agent),ev=eventFor(item)||state.currentEvent;action(b.dataset.v45,agent,item,ev)});
  const mo=new MutationObserver(()=>{clearTimeout(render.t);render.t=setTimeout(render,30)});const target=$('#v3InteractBody');if(target)mo.observe(target,{childList:true,subtree:true});
  setInterval(()=>{if(state.started&&state.v45.autoAssist){const q=G.queueItems?.()||[],first=q[0],staff=bestStaff();if(first&&staff&&patience(first)<55&&(staff.energy||100)>48){const k=`assist:${state.day}:${first.id}`;state.v45.negotiations[k]=state.v45.negotiations[k]||{goodwill:0};if(!state.v45.negotiations[k].assisted){state.v45.negotiations[k].assisted=true;staff.energy=clamp((staff.energy||100)-.6,0,100);state.reputation=clamp((state.reputation||50)+.03,0,100);D.save?.(true)}}}renderDirector()},4500);
  window.__GOLD_V45__={canCheckout,promptNegotiation,intent,render,action};
  setTimeout(render,120);
})();
