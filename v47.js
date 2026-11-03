
(() => {
  'use strict';
  const D=window.__GOLD_DEBUG__; if(!D||!D.state)return;
  const state=D.state, q=s=>document.querySelector(s);
  function ensure(){
    const controls=q('.immersive-run-controls');
    if(controls&&!q('#v47CinemaBtn')){const b=document.createElement('button');b.id='v47CinemaBtn';b.className='hud-btn v47-cinema-btn';b.type='button';b.title='Ẩn bớt HUD để xem cửa hàng';b.textContent='🎬';controls.appendChild(b);b.addEventListener('click',()=>{document.body.classList.toggle('cinematic-store');b.classList.toggle('active',document.body.classList.contains('cinematic-store'));});}
    const wrap=q('#v3CanvasWrap');
    if(wrap&&!q('#v47StatusStrip')){const s=document.createElement('div');s.id='v47StatusStrip';s.className='v47-status-strip';wrap.appendChild(s);}
  }
  function update(){
    ensure();
    const sub=q('.brand-sub');if(sub)sub.textContent=state.started?`${state.ownerName?`Chủ: ${state.ownerName} · `:''}V1.0 Full 3D`:'V1.0 · Final Visual Real 3D';
    const title=q('.brand-title');if(title&&state.started)title.textContent=state.storeName||'TIỆM VÀNG CỦA BẠN';
    const strip=q('#v47StatusStrip');if(strip){
      const qn=window.__GOLD_3D__?.queueItems?.().length||0, staff=state.staff||[], energy=staff.length?Math.round(staff.reduce((a,s)=>a+(s.energy||100),0)/staff.length):100;
      const live=state.liveStore?.running?'Đang mở cửa':'Tạm dừng';
      strip.innerHTML=`<span><b>${live}</b></span><span>Khách chờ <b>${qn}</b></span><span>Năng lượng NV <b>${energy}%</b></span><span>Uy tín <b>${Math.round(state.reputation||0)}/100</b></span>`;
    }
  }
  setInterval(update,500);setTimeout(update,80);
})();
