(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const D = window.__GOLD_DEBUG__;
  if (!D?.state) return;
  const state = D.state;
  let dock = null, actions = null, status = null, lastActive = false;

  function active() {
    return !!(state.started && $('#view-store3d')?.classList.contains('active'));
  }
  function R(){ return window.__GOLD_REAL3D__; }
  function G(){ return window.__GOLD_3D__; }
  function station(id){ return G()?.stationDefs?.find?.(s => s.id === id); }
  function focus(id){
    const r=R(),g=G(),s=station(id);
    if(!r || !g || !s) return false;
    r.focusStation?.(id);
    if(s.approach) g.movePlayerTo?.(s.approach.x,s.approach.z);
    return true;
  }
  function open(view){ window.__GOLD_UI__?.open?.(view); }

  function buildCameraDock(){
    if(dock || !$('#v3CanvasWrap')) return;
    dock=document.createElement('div');
    dock.className='v1-camera-dock';
    dock.setAttribute('aria-label','Góc nhìn cửa hàng');
    dock.innerHTML=`
      <button type="button" data-cam="overview" class="active">TOÀN CẢNH</button>
      <button type="button" data-cam="showcase">TỦ VÀNG</button>
      <button type="button" data-cam="scale">CÂN</button>
      <button type="button" data-cam="pawn">CẦM ĐỒ</button>
      <button type="button" data-cam="pos">POS</button>
`;
    $('#v3CanvasWrap').appendChild(dock);
    dock.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      const r=R();if(!r)return;
      if(b.dataset.cam){r.applyCameraPreset?.(b.dataset.cam,false);dock.querySelectorAll('[data-cam]').forEach(x=>x.classList.toggle('active',x===b));}
    });
  }

  function buildActionDock(){
    if(actions || !$('#v3CanvasWrap')) return;
    actions=document.createElement('div');actions.className='v1-action-dock';
    actions.innerHTML=`
      <button type="button" class="primary-zone" data-zone="showcase"><i>💍</i><span>Bán vàng<br><small>Tủ trưng bày</small></span></button>
      <button type="button" data-zone="pawn"><i>🤝</i><span>Thu mua / Cầm<br><small>Định giá</small></span></button>
      <button type="button" data-zone="scale"><i>⚖</i><span>Kiểm định<br><small>Cân vàng</small></span></button>
      <button type="button" data-zone="warehouse" data-open="inventory"><i>📦</i><span>Nhập hàng<br><small>Kho / chành</small></span></button>
      <button type="button" data-zone="office" data-open="management"><i>🏪</i><span>Nâng cấp<br><small>Nhân sự / tiệm</small></span></button>`;
    $('#v3CanvasWrap').appendChild(actions);
    actions.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.zone) focus(b.dataset.zone);
      if(b.dataset.open) setTimeout(()=>open(b.dataset.open),250);
    });
  }

  function buildStatus(){
    if(status || !$('#v3CanvasWrap')) return;
    status=document.createElement('div');status.className='v1-render-status';
    status.textContent='REAL 3D · PBR · PREMIUM NPC';
    $('#v3CanvasWrap').appendChild(status);
  }

  function syncStatus(){
    if(!status)return;
    const real=!!window.__GOLD_REAL3D__?.renderer;
    status.classList.toggle('fallback',!real);
    status.textContent=real?'REAL 3D · PBR · PREMIUM NPC':'RENDERER DỰ PHÒNG';
  }

  function removeLegacyVisuals(){
    const scene=R()?.scene;if(!scene)return;
    for(const name of ['V1_GAMEPLAY_POLISH','V7_FINAL_POLISH','V61_CINEMATIC','V8_PREMIUM_DECOR']){
      const o=scene.getObjectByName?.(name);if(o)o.visible=false;
    }
  }

  function quietAudio(){
    state.settings=state.settings||{};
    state.settings.fx=false;
  }

  function bindQualityOfLife(){
    const wrap=$('#v3CanvasWrap');if(!wrap||wrap.dataset.completeBound)return;
    wrap.dataset.completeBound='1';
    wrap.addEventListener('dblclick',e=>{
      if(e.target.closest('.v9-root,.unified-drawer,.v1-action-dock,.v1-camera-dock'))return;
      R()?.applyCameraPreset?.('overview',false);
      dock?.querySelectorAll('[data-cam]').forEach(x=>x.classList.toggle('active',x.dataset.cam==='overview'));
    });
    window.addEventListener('keydown',e=>{
      if(!active() || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;
      const k=e.key.toLowerCase();
      if(k==='1')R()?.applyCameraPreset?.('overview');
      if(k==='2')R()?.applyCameraPreset?.('showcase');
      if(k==='3')R()?.applyCameraPreset?.('scale');
      if(k==='4')R()?.applyCameraPreset?.('pawn');
      if(k==='5')R()?.applyCameraPreset?.('pos');
    });
  }

  function renameSurface(){
    const sub=$('.brand-sub');if(sub)sub.textContent='V1.2 · Character Motion & Accuracy';
    const nav=$('.v3-nav');if(nav)nav.textContent='◆ V1.2 MOTION 3D';
    document.title='Gold Shop Simulator V1.2 · Character Motion & Accuracy';
  }

  function tick(){
    quietAudio();renameSurface();
    const nowActive=active();
    if(nowActive){
      buildCameraDock();buildActionDock();buildStatus();bindQualityOfLife();syncStatus();removeLegacyVisuals();
      const selected=G()?.selected?.();const card=document.querySelector('.immersive-interaction-card');if(card)card.classList.toggle('v1-no-selection',!selected);
      if(!lastActive){R()?.applyCameraPreset?.(state.v6?.cameraPreset||'overview',false);}
    }
    lastActive=nowActive;
    if(dock)dock.style.display=nowActive?'flex':'none';
    if(actions)actions.style.display=nowActive?'flex':'none';
    if(status)status.style.display=nowActive?'block':'none';
    requestAnimationFrame(tick);
  }

  quietAudio();
  setTimeout(tick,350);
  window.__GOLD_V1_COMPLETE__={focus,open,camera:(name)=>R()?.applyCameraPreset?.(name,false)};
})();
