(() => {
  'use strict';
  const D=window.__GOLD_DEBUG__; if(!D||!D.state)return;
  const state=D.state, q=s=>document.querySelector(s);
  function thresholds(){return [0,100,250,450,700,1000,1400,1900,2500,3300,4200,5200]}
  function ensureOverlays(){
    const wrap=q('#v3CanvasWrap'); if(!wrap)return;
    if(!q('#v46LevelCard')){
      const lv=document.createElement('div');lv.id='v46LevelCard';lv.className='v46-level-card';lv.innerHTML='<div class="row"><span>Cấp độ nghề</span><strong id="v46Level">Lv.1</strong></div><small id="v46XpText">0 / 100 XP</small><div class="v46-xp"><i id="v46XpBar" style="width:0%"></i></div>';wrap.appendChild(lv);
    }
    if(!q('#v46MissionCard')){
      const m=document.createElement('div');m.id='v46MissionCard';m.className='v46-mission-card';wrap.appendChild(m);
    }
  }
  function update(){
    ensureOverlays();
    const title=q('.brand-title');if(title)title.textContent=state.started?(state.storeName||'TIỆM VÀNG CỦA BẠN'):'GOLD SHOP SIMULATOR';
    const sub=q('.brand-sub');if(sub)sub.textContent=state.started?`${state.ownerName?`Chủ: ${state.ownerName} · `:''}Gold Shop Simulator V1.0`:'V1.0 · Complete 3D';
    const lv=q('#v46Level'),xpText=q('#v46XpText'),bar=q('#v46XpBar');
    const arr=thresholds(),base=arr[state.level-1]||0,next=arr[state.level]||base+600,p=(state.xp-base)/Math.max(1,next-base)*100;
    if(lv)lv.textContent=`Lv.${state.level||1}`; if(xpText)xpText.textContent=`${state.xp||0} / ${next} XP`; if(bar)bar.style.width=Math.max(0,Math.min(100,p))+'%';
    const mc=q('#v46MissionCard'); if(mc){const handled=state.daily?.handled||0,need=Math.min(8,state.dayQueue?.length||8),customers=(state.liveStore?.schedule||[]).filter(x=>x.arrival<=state.clockMinutes&&x.index>=state.situationsToday&&!x.penalized).length;mc.innerHTML=`<h4>Nhiệm vụ hôm nay</h4><div class="mission-line"><span>Phục vụ tình huống</span><b class="${handled>=need?'ok':'wait'}">${handled}/${need}</b></div><div class="mission-line"><span>Khách đang chờ</span><b class="${customers?'wait':'ok'}">${customers}</b></div><div class="mission-line"><span>Uy tín cửa hàng</span><b>${Math.round(state.reputation||0)}/100</b></div>`;}
  }
  q('#storeNameInput')?.addEventListener('input',e=>{const value=e.target.value.trim();const brand=q('.brand-title');if(brand&&!state.started)brand.textContent=value||'GOLD SHOP SIMULATOR';});
  setInterval(update,600);setTimeout(update,60);
})();
