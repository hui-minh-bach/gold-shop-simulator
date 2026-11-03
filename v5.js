(() => {
  'use strict';
  const D=window.__GOLD_DEBUG__; if(!D||!D.state)return;
  const state=D.state, q=s=>document.querySelector(s);
  const acc=()=>window.__GOLD_AUTH__?.active?.();
  const activeId=()=>localStorage.getItem('goldShopActiveAccount')||'guest';
  const onboardingKey=()=>`goldShopOnboardingV5:${activeId()}`;
  let onboardingShown=false;

  function ensureSceneBadge(){
    const wrap=q('#v3CanvasWrap'); if(!wrap||q('#v5SceneBadge'))return;
    const el=document.createElement('div');el.id='v5SceneBadge';el.className='v5-scene-badge';wrap.appendChild(el);
  }
  function ensureOnboarding(){
    if(q('#v5Onboarding'))return q('#v5Onboarding');
    const el=document.createElement('div');el.id='v5Onboarding';el.className='v5-onboarding hidden';
    el.innerHTML=`<div class="v5-onboarding-card"><span class="eyebrow">HƯỚNG DẪN NHANH</span><h2>Ngày đầu làm chủ tiệm</h2><p>Mọi nghiệp vụ nằm trong một cửa hàng: đi tới khách, xử lý đúng khu, tính tiền và khóa sổ.</p><div class="v5-tutorial-grid"><div><b>1</b><strong>Tap để di chuyển</strong><span>Chạm sàn hoặc vật thể để chủ tiệm tự đi tới.</span></div><div><b>2</b><strong>Tiếp khách</strong><span>Khách có nhu cầu, kiên nhẫn và phản ứng theo giá của bạn.</span></div><div><b>3</b><strong>Làm nghiệp vụ</strong><span>Tủ vàng, cân, POS, cầm đồ, kho và két đều dùng engine thật.</span></div><div><b>4</b><strong>Giữ doanh nghiệp sống</strong><span>Cuối ngày kiểm quỹ, trả nợ, giữ thanh khoản và lợi nhuận.</span></div></div><div class="v5-onboarding-actions"><button id="v5SkipTutorial" class="btn ghost" type="button">BỎ QUA</button><button id="v5StartTutorial" class="btn primary" type="button">BẮT ĐẦU NGÀY ĐẦU</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click',e=>{if(e.target.id==='v5SkipTutorial'||e.target.id==='v5StartTutorial'){localStorage.setItem(onboardingKey(),'1');el.classList.add('hidden');if(e.target.id==='v5StartTutorial'){state.liveStore=state.liveStore||{};state.liveStore.running=true;D.save?.(true)}}});
    return el;
  }
  function maybeShowOnboarding(){
    if(onboardingShown||!state.started||localStorage.getItem(onboardingKey())==='1'||state.settings?.tutorial===false)return;
    onboardingShown=true;setTimeout(()=>ensureOnboarding().classList.remove('hidden'),350);
  }
  function updateProfileUI(){
    const a=acc();
    const badge=q('#setupAccountBadge'); if(badge)badge.textContent=`Hồ sơ người chơi: ${a?.displayName||state.ownerName||'Local'}${a?.username?` · @${a.username}`:''}`;
    const btn=q('#accountBtn'); if(btn)btn.textContent=`👤 ${a?.displayName||'Tài khoản'}`;
    ensureSceneBadge();
    const scene=q('#v5SceneBadge'); if(scene&&state.started){const waiting=window.__GOLD_3D__?.queueItems?.().length||0;scene.innerHTML=`<span class="v5-profile-chip"><i class="v5-profile-dot">${String(a?.displayName||state.ownerName||'B').slice(0,1).toUpperCase()}</i><b>${state.storeName||'Tiệm của bạn'}</b></span><span>Khách chờ <b>${waiting}</b></span><span>Uy tín <b>${Math.round(state.reputation||0)}/100</b></span>`;scene.style.display='flex'}else if(scene)scene.style.display='none';
  }
  function ensureAccountDefaults(){
    const a=acc(); if(a&&!state.started&&!String(state.ownerName||'').trim())state.ownerName=a.displayName||'';
    const owner=q('#ownerNameInput');if(owner&&document.activeElement!==owner&&!owner.value&&state.ownerName)owner.value=state.ownerName;
  }
  function updateVersionLabels(){
    const sub=q('.brand-sub');if(sub&&!state.started)sub.textContent='V1.0 · Complete 3D';
    const n=q('.v3-nav');if(n)n.textContent='◆ V1.0 CỬA HÀNG 3D';
  }
  function updateSetupStepper(){
    const a=acc(), required=[...(state.equipment||[])];
    const statuses={account:!!a,identity:!!String(state.storeName||'').trim(),location:!!(state.location&&state.tier),equipment:required.length>=6,capital:!!(state.allocations&&state.allocations.inventory>0&&state.allocations.pawn>0),policy:!!state.policies};
    const order=['account','identity','location','equipment','capital','policy'];let currentFound=false;
    document.querySelectorAll('#setupStepper [data-step]').forEach(el=>{const k=el.dataset.step,done=!!statuses[k];el.classList.toggle('done',done);el.classList.remove('current');if(!done&&!currentFound){el.classList.add('current');currentFound=true}});
  }
  function tick(){ensureAccountDefaults();updateProfileUI();updateVersionLabels();updateSetupStepper();maybeShowOnboarding()}
  q('#accountBtn')?.addEventListener('click',()=>window.__GOLD_UI__?.open?.('startup'));
  setInterval(tick,600);setTimeout(tick,80);
})();
