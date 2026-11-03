(() => {
  'use strict';
  const D=window.__GOLD_DEBUG__;
  if(!D||!D.state)return;
  const state=D.state;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt=n=>new Intl.NumberFormat('vi-VN').format(Math.round(Number(n)||0))+'đ';
  const short=n=>{n=Number(n)||0;const a=Math.abs(n);if(a>=1e9)return (n/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ';if(a>=1e6)return (n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' tr';return fmt(n)};
  const pct=x=>(Number(x||0)*100).toFixed(Number(x||0)*100%1?1:0)+'%';
  const moneyInput=v=>Number(String(v??'').replace(/[^0-9-]/g,''))||0;
  let G=null,RT=null,root=null,modal=null,lastEventKey='',visualInstalled=false,ambient=[],animRaf=0,lastPaint=0;

  function ensure(){
    state.v9=state.v9||{};
    state.v9.flow=state.v9.flow||{};
    state.v9.inspect=state.v9.inspect||{};
    state.v9.skuPick=state.v9.skuPick||{};
    state.settings=state.settings||{};
    state.settings.fx=false; // no repetitive beep by default
  }
  function clockText(){const m=Math.max(0,Number(state.clockMinutes)||0);return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(Math.floor(m%60)).padStart(2,'0')}`}
  function queue(){try{if(G?.queueItems)return G.queueItems();const l=state.liveStore||{};if(!Array.isArray(l.schedule))return[];return l.schedule.filter(x=>x.index>=state.situationsToday&&x.arrival<=state.clockMinutes&&!x.penalized)}catch{return[]}}
  function servedItem(){if(!state.currentEvent||state.currentEvent.done)return null;return state.liveStore?.schedule?.[Math.max(0,state.situationsToday-1)]||null}
  function eventKey(ev=state.currentEvent){return ev?`${state.day}:${state.situationsToday-1}:${ev.type}:${ev.customer?.name||''}`:''}
  function currentAgent(){const it=servedItem();return it?G?.agents?.get?.('cust:'+it.id)||null:null}
  function currentSchedule(){return servedItem()||queue()[0]||null}
  function patience(item){return item?clamp(100-Math.max(0,(state.clockMinutes||0)-Number(item.arrival||0))*.55,0,100):100}
  function avgEnergy(){const a=state.staff||[];return a.length?a.reduce((s,x)=>s+(Number(x.energy)||100),0)/a.length:100}
  function stockCount(){return state.inventoryItems?.filter(x=>x.status==='in_stock').length||0}
  function revenueToday(){const d=state.daily||{};return (d.salesRevenue||0)+(d.serviceRevenue||0)+(d.pawnIncome||0)}
  function isBetweenDays(){const last=state.history?.[0];return !!(state.started&&last&&last.day===state.day-1&&state.daily?.auditDone)}
  function allHandled(){return !!(state.started&&state.dayQueue?.length&&state.daily?.handled>=Math.min(8,state.dayQueue.length)&&state.daily?.auditDone)}

  function stepsFor(ev){
    if(!ev)return[];
    const numeric=['sale','buyback','exchangeSame','exchangeCross','pawnOpen'].includes(ev.type);
    if(ev.type==='sale')return[{k:'customer',l:'Gặp khách',st:null},{k:'browse',l:'Tủ trưng bày',st:'showcase'},{k:'calc',l:'Tính giá',st:'pos'},{k:'pos',l:'Thanh toán',st:'pos'}];
    if(ev.type==='buyback')return[{k:'customer',l:'Gặp khách'},{k:'weigh',l:'Cân & tuổi vàng',st:'scale'},{k:'calc',l:'Báo giá',st:'pos'},{k:'pos',l:'Chi tiền',st:'pos'}];
    if(ev.type==='exchangeSame'||ev.type==='exchangeCross')return[{k:'customer',l:'Gặp khách'},{k:'weigh',l:'Cân vàng cũ',st:'scale'},{k:'browse',l:'Chọn món mới',st:'showcase'},{k:'calc',l:'Tính chênh lệch',st:'pos'},{k:'pos',l:'Thu / chi',st:'pos'}];
    if(ev.type==='pawnOpen')return[{k:'customer',l:'Gặp khách'},{k:'weigh',l:'Kiểm tài sản',st:'scale'},{k:'pawn',l:'Lập hợp đồng',st:'pawn'},{k:'calc',l:'Tính kỳ cầm',st:'pos'},{k:'pos',l:'Giải ngân',st:'pos'}];
    if(ev.type==='pawnDue')return[{k:'customer',l:'Gặp khách'},{k:'choice',l:'Xử lý hợp đồng',st:'pawn'}];
    if(ev.type==='supplier')return[{k:'choice',l:'Nhập hàng',st:'warehouse'}];
    if(ev.type==='priceShock')return[{k:'choice',l:'Điều chỉnh giá',st:'office'}];
    if(ev.type==='service')return[{k:'customer',l:'Gặp khách'},{k:'choice',l:'Nhận sửa / từ chối',st:'showcase'}];
    if(ev.type==='staffError')return[{k:'choice',l:'Đối soát POS',st:'pos'}];
    if(ev.type==='chanh')return[{k:'choice',l:'Quy chành',st:'warehouse'}];
    if(ev.type==='audit')return[{k:'choice',l:'Kiểm quỹ cuối ngày',st:'pos'}];
    if(ev.type==='info')return[{k:'choice',l:'Xử lý kho',st:'warehouse'}];
    if(ev.type==='quietDay'||ev.type==='lostCustomer')return[{k:'choice',l:'Ghi nhận',st:'office'}];
    return numeric?[{k:'calc',l:'Tính tiền',st:'pos'}]:[{k:'choice',l:'Xử lý',st:'office'}];
  }
  function flowState(ev){
    const key=eventKey(ev);if(!key)return{index:0};
    if(!state.v9.flow[key])state.v9.flow[key]={index:0,startedAt:Date.now()};
    return state.v9.flow[key];
  }
  function setStep(i){const ev=state.currentEvent;if(!ev)return;const f=flowState(ev),steps=stepsFor(ev);f.index=clamp(i,0,Math.max(0,steps.length-1));const step=steps[f.index];state.v3=state.v3||{};state.v3.flowStage=step?.k==='weigh'?'scale':step?.k==='browse'?'showcase':step?.k==='pawn'?'pawn':step?.k==='calc'||step?.k==='pos'?'pos':step?.k==='choice'?(step.st==='warehouse'?'showcase':step.st==='pawn'?'pawn':'pos'):'customer';D.save?.(true);paint()}
  function advance(){const ev=state.currentEvent;if(!ev)return;const f=flowState(ev),steps=stepsFor(ev);f.index=Math.min(steps.length-1,f.index+1);setStep(f.index)}

  function build(){
    const wrap=$('#v3CanvasWrap');if(!wrap||$('#v9Root'))return false;
    root=document.createElement('div');root.id='v9Root';root.className='v9-root';root.innerHTML=`
      <div class="v9-top">
        <div class="v9-brand v9-glass"><div class="v9-brand-logo">◇</div><div class="v9-brand-copy"><b id="v9Store">TIỆM VÀNG CỦA BẠN</b><span id="v9Owner">Gold Shop Simulator · Playable 3D</span></div></div>
        <div class="v9-stat v9-glass"><i>👑</i><div><span>Cấp độ</span><strong id="v9Level">Lv.1</strong></div></div>
        <div class="v9-stat v9-glass"><i>🗓</i><div><span>Ngày / giờ</span><strong id="v9Clock">N1 · 08:00</strong></div></div>
        <div class="v9-stat v9-glass good"><i>💵</i><div><span>Tiền mặt</span><strong id="v9Cash">0đ</strong></div></div>
        <div class="v9-stat v9-glass"><i>👤</i><div><span>Khách chờ</span><strong id="v9Customers">0</strong></div></div>
        <div class="v9-stat v9-glass"><i>🧑‍💼</i><div><span>Nhân viên</span><strong id="v9Staff">0</strong></div></div>
        <div class="v9-stat v9-glass good"><i>⚡</i><div><span>Năng lượng</span><strong id="v9Energy">100%</strong></div></div>
      </div>
      <div class="v9-left">
        <button class="v9-glass" data-v9-drawer="report"><b>⌂</b><span>Tổng quan</span></button>
        <button class="v9-glass" data-v9-drawer="management"><b>♟</b><span>Nhân viên</span></button>
        <button class="v9-glass" data-v9-drawer="inventory"><b>◆</b><span>Kho hàng</span></button>
        <button class="v9-glass" data-v9-drawer="pawn"><b>⚖</b><span>Cầm đồ</span></button>
        <button class="v9-glass" data-v9-drawer="finance"><b>▥</b><span>Tài chính</span></button>
        <button class="v9-glass" data-v9-drawer="customers"><b>👥</b><span>Khách</span></button>
        <button class="v9-glass" data-v9-drawer="campaign"><b>🏆</b><span>Sự nghiệp</span></button>
        <button class="v9-glass" data-v9-drawer="map"><b>🗺</b><span>Thị trường</span></button>
        <button class="v9-glass" data-v9-drawer="academy"><b>◈</b><span>Học nghề</span></button>
        <button class="v9-glass" data-v9-drawer="kbl"><b>▣</b><span>Chành / Đối tác</span></button>
        <button class="v9-glass" data-v9-drawer="startup"><b>⚙</b><span>Thiết lập</span></button>
      </div>
      <div class="v9-right">
        <section class="v9-panel v9-glass"><div class="v9-panel-head"><b>KHÁCH ĐANG CHỜ</b><span id="v9QueueCount">0</span></div><div id="v9Queue" class="v9-queue"></div><button id="v9Serve" class="primary" style="margin:0 8px 9px;width:calc(100% - 16px);height:40px" type="button">PHỤC VỤ KHÁCH TIẾP THEO</button></section>
        <section class="v9-panel v9-glass"><div class="v9-panel-head"><b>NHIỆM VỤ HÔM NAY</b><span id="v9Rep">Uy tín 0</span></div><div id="v9Missions" class="v9-missions"></div></section>
      </div>
      <div class="v9-scene-label stock">KHO / TỒN</div><div class="v9-scene-label scale">KIỂM ĐỊNH / CÂN VÀNG</div><div class="v9-scene-label pawn">THU MUA / CẦM ĐỒ</div><div class="v9-scene-label pos">THU NGÂN / POS</div>
      <div class="v9-bottom">
        <section class="v9-task v9-glass"><div><div class="v9-task-label" id="v9TaskLabel">CA LÀM VIỆC</div><h3 id="v9TaskTitle">Mở cửa và đón khách</h3><p id="v9TaskText">Nhấn ▶ chạy thời gian. Khi khách tới, chọn Phục vụ để bắt đầu một giao dịch thật.</p><div id="v9Flow" class="v9-flow"></div></div><div id="v9TaskActions" class="v9-task-actions"></div></section>
        <div class="v9-timebox v9-glass"><button id="v9Play" class="primary wide" type="button">▶ CHẠY CA</button><button id="v9Pause" type="button">Ⅱ</button><button data-v9-speed="1" class="active" type="button">x1</button><button data-v9-speed="2" type="button">x2</button><button data-v9-speed="4" type="button">x4</button><button id="v9Camera" type="button">⟳ CAM</button></div>
      </div>
      <div id="v9ModalBack" class="v9-modal-back hidden"><section class="v9-modal v9-glass"><header class="v9-modal-head"><div><small id="v9ModalStep">NGHIỆP VỤ</small><h2 id="v9ModalTitle">Tương tác</h2></div><button class="v9-close" id="v9Close" type="button">×</button></header><div id="v9ModalBody" class="v9-modal-body"></div></section></div>
    `;
    wrap.appendChild(root);modal=$('#v9ModalBack');bind();return true;
  }
  function bind(){
    root.addEventListener('click',e=>{
      const d=e.target.closest('[data-v9-drawer]');if(d){window.__GOLD_UI__?.open?.(d.dataset.v9Drawer);return}
      const qrow=e.target.closest('[data-v9-q]');if(qrow){serveNext();return}
      const a=e.target.closest('[data-v9-action]');if(a){handleAction(a.dataset.v9Action,a);return}
    });
    $('#v9Serve')?.addEventListener('click',serveNext);
    $('#v9Play')?.addEventListener('click',()=>{if(!state.started)return;state.liveStore=state.liveStore||{};state.liveStore.running=true;paint()});
    $('#v9Pause')?.addEventListener('click',()=>{state.liveStore.running=false;paint()});
    $$('[data-v9-speed]').forEach(b=>b.addEventListener('click',()=>{state.liveStore.speed=Number(b.dataset.v9Speed)||1;$$('[data-v9-speed]').forEach(x=>x.classList.toggle('active',x===b));paint()}));
    $('#v9Camera')?.addEventListener('click',()=>$('#v3CameraBtn')?.click());
    $('#v9Close')?.addEventListener('click',closeModal);
    modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});
  }
  function activeGame(){return $('#view-store3d')?.classList.contains('active')&&state.started}
  function syncBody(){document.body.classList.toggle('v9-game-active',activeGame());const wrap=$('#v3CanvasWrap');if(wrap)wrap.classList.remove('v8-photo-mode')}

  function serveNext(){
    if(!state.started){D.showView?.('setup');return}
    if(state.currentEvent&&!state.currentEvent.done){paint();return}
    const q=queue();if(!q.length){toastLocal('Chưa có khách tới. Nhấn ▶ và chạy thời gian thêm.');return}
    D.nextSituation();const ev=state.currentEvent;if(!ev)return;const f=flowState(ev);f.index=0;setStep(0);moveForCurrent();
  }
  function stationForStep(step){return step?.st?G?.stationDefs?.find?.(x=>x.id===step.st):null}
  function moveForCurrent(){const ev=state.currentEvent;if(!ev)return;const steps=stepsFor(ev),f=flowState(ev),step=steps[f.index];const st=stationForStep(step);if(st&&G?.movePlayerTo){G.movePlayerTo(st.approach.x,st.approach.z,()=>{openCurrentStep()})}else if(step?.k==='customer'){const a=currentAgent();if(a&&G?.movePlayerTo)G.movePlayerTo(a.x-.55,a.z+.4,()=>openCurrentStep());else openCurrentStep()}else openCurrentStep()}
  function handleAction(action,el){
    if(action==='serve'){serveNext();return}
    if(action==='go'){moveForCurrent();return}
    if(action==='open'){openCurrentStep();return}
    if(action==='next'){closeModal();advance();moveForCurrent();return}
    if(action==='newday'){D.beginDay?.();D.showView?.('store3d');state.liveStore.running=false;closeModal();paint();return}
    if(action==='endday'){const before=state.history?.length||0;D.endDay?.();setTimeout(()=>{D.showView?.('store3d');if((state.history?.length||0)>before)showDaySummary();paint()},60);return}
  }
  function taskText(ev,step){
    if(!ev)return 'Nhấn ▶ chạy thời gian. Khi khách tới, chọn Phục vụ để bắt đầu một giao dịch thật.';
    if(ev.done)return 'Giao dịch đã hoàn tất, sổ sách và CRM đã cập nhật. Hãy phục vụ lượt tiếp theo.';
    const map={customer:'Đi tới khách, nghe nhu cầu rồi bắt đầu xử lý.',browse:'Tới tủ kính, lấy đúng SKU khách chọn và tư vấn/chốt.',weigh:'Tới cân, hiệu chỉnh cân và xác nhận tuổi vàng trước khi báo giá.',pawn:'Tới bàn cầm đồ, kiểm điều khoản và lập hợp đồng.',calc:'Tới POS, dùng máy tính quầy để tính đúng số tiền.',pos:'Nhận/chi tiền, tính tiền thối và in phiếu.',choice:'Tới đúng khu nghiệp vụ rồi quyết định phương án xử lý.'};return map[step?.k]||ev.desc;
  }
  function paint(){
    ensure();syncBody();if(!activeGame())return;
    const q=queue(),ev=state.currentEvent&&!state.currentEvent.done?state.currentEvent:null;
    $('#v9Store').textContent=(state.storeName||'TIỆM VÀNG CỦA BẠN').toUpperCase();$('#v9Owner').textContent=`${state.ownerName?`Chủ: ${state.ownerName} · `:''}${state.location?.name||''}`;
    $('#v9Level').textContent=`Lv.${state.level||1}`;$('#v9Clock').textContent=`N${state.day||1} · ${clockText()}`;$('#v9Cash').textContent=short(state.cash);$('#v9Customers').textContent=String(q.length);$('#v9Staff').textContent=String(state.staff?.length||0);$('#v9Energy').textContent=Math.round(avgEnergy())+'%';$('#v9QueueCount').textContent=`${q.length}/12`;$('#v9Rep').textContent=`Uy tín ${Math.round(state.reputation||0)}`;
    renderQueue(q);renderMissions();renderTask(ev);$$('[data-v9-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.v9Speed)===(state.liveStore?.speed||1)));$('#v9Play').textContent=state.liveStore?.running?'▶ ĐANG CHẠY':'▶ CHẠY CA';
  }
  function renderQueue(list){const el=$('#v9Queue');if(!el)return;el.innerHTML=list.length?list.slice(0,6).map((it,i)=>{const wait=Math.max(0,Math.round((state.clockMinutes||480)-(it.arrival||480)));return `<div class="v9-q" data-v9-q="${esc(it.id)}"><div class="avatar">${esc((it.name||'?').split(/\s+/).pop()?.[0]||'?')}</div><div><strong>${esc(it.name)}</strong><small>${esc(it.title)}</small></div><em style="color:${wait>12?'#ff8976':wait>7?'#f1c85d':'#76e29a'}">${wait||1}p</em></div>`}).join(''):'<div class="v9-empty">Chưa có khách tới.<br><small>Nhấn ▶ để chạy ca.</small></div>'}
  function renderMissions(){const required=Math.min(8,state.dayQueue?.length||8),handled=state.daily?.handled||0,items=[['Xử lý tình huống',handled,required],['Doanh thu ngày',revenueToday(),500e6],['Kiểm quỹ',state.daily?.auditDone?1:0,1],['Giữ uy tín',Math.round(state.reputation||0),75]];$('#v9Missions').innerHTML=items.map(([n,v,t])=>{const done=v>=t,p=clamp(v/t*100,0,100);return `<div class="v9-mission ${done?'done':''}"><i>${done?'✓':'○'}</i><b>${esc(n)}</b><div class="bar"><span style="width:${p}%"></span></div></div>`}).join('')}
  function renderTask(ev){const label=$('#v9TaskLabel'),title=$('#v9TaskTitle'),text=$('#v9TaskText'),flow=$('#v9Flow'),actions=$('#v9TaskActions');if(!label)return;
    if(isBetweenDays()){label.textContent='NGÀY ĐÃ KHÓA SỔ';title.textContent=`Sẵn sàng mở ngày ${state.day}`;text.textContent='Báo cáo ngày trước đã được lưu. Bắt đầu ngày mới để thị trường, khách và hợp đồng tiếp tục chạy.';flow.innerHTML='';actions.innerHTML='<button class="primary" data-v9-action="newday" type="button">MỞ CỬA NGÀY MỚI</button>';return}
    if(!ev){label.textContent='CA LÀM VIỆC';title.textContent=qTitle();text.textContent=queue().length?'Có khách đang chờ. Chọn Phục vụ khách tiếp theo.':'Nhấn ▶ để thời gian chạy; khách sẽ đi vào cửa hàng theo nhu cầu thị trường.';flow.innerHTML='';actions.innerHTML=allHandled()?'<button class="primary" data-v9-action="endday" type="button">KHÓA SỔ & KẾT THÚC NGÀY</button>':queue().length?'<button class="primary" data-v9-action="serve" type="button">PHỤC VỤ NGAY</button>':'<button data-v9-action="go" type="button" disabled>CHỜ KHÁCH</button>';return}
    const steps=stepsFor(ev),f=flowState(ev),idx=f.index,step=steps[idx];label.textContent=`${ev.customer?.name||'Nghiệp vụ'} · ${ev.type.toUpperCase()}`;title.textContent=ev.title;text.textContent=taskText(ev,step);flow.innerHTML=steps.map((s,i)=>`<span class="${i<idx?'done':i===idx?'active':''}">${i+1}. ${esc(s.l)}</span>`).join('');actions.innerHTML=ev.done?'<button class="primary" data-v9-action="serve" type="button">KHÁCH TIẾP THEO</button>':`<button class="primary" data-v9-action="go" type="button">${step?.st?'ĐI TỚI '+esc(stationForStep(step)?.name||'KHU XỬ LÝ'):'THỰC HIỆN BƯỚC NÀY'}</button><button data-v9-action="open" type="button">MỞ NGHIỆP VỤ</button>`;
  }
  function qTitle(){return state.liveStore?.running?`Cửa hàng đang hoạt động · ${clockText()}`:'Mở cửa và đón khách'}

  function openCurrentStep(){const ev=state.currentEvent;if(!ev||ev.done){closeModal();paint();return}const steps=stepsFor(ev),f=flowState(ev),step=steps[f.index];if(!step)return;$('#v9ModalStep').textContent=`BƯỚC ${f.index+1}/${steps.length} · ${step.l.toUpperCase()}`;$('#v9ModalTitle').textContent=ev.title;modal.classList.remove('hidden');renderModal(ev,step)}
  function closeModal(){modal?.classList.add('hidden')}
  function modalBody(html){$('#v9ModalBody').innerHTML=html}
  function eventDialogue(ev){return `<div class="v9-dialogue"><b>${esc(ev.customer?.name||'Khách')}:</b> ${esc(ev.desc||ev.customer?.mood||ev.title)}</div>`}
  function renderModal(ev,step){
    if(step.k==='customer')return renderCustomer(ev);
    if(step.k==='browse')return renderBrowse(ev);
    if(step.k==='weigh')return renderWeigh(ev);
    if(step.k==='pawn')return renderPawnStep(ev);
    if(step.k==='calc')return renderCalc(ev);
    if(step.k==='pos')return renderPos(ev);
    if(step.k==='choice')return renderChoice(ev);
  }
  function renderCustomer(ev){const it=servedItem(),agent=currentAgent();const p=Math.round(patience(it));modalBody(`${eventDialogue(ev)}<div class="v9-info-grid"><div class="v9-info"><span>Loại khách</span><strong>${esc(ev.customer?.type||'Khách')}</strong></div><div class="v9-info"><span>Kiên nhẫn</span><strong>${p}/100</strong></div><div class="v9-info"><span>Uy tín tiệm</span><strong>${Math.round(state.reputation||0)}/100</strong></div></div><div class="v9-modal-actions"><button id="v9Listen" type="button">🔊 Nghe khách</button><button class="primary" id="v9Continue" type="button">BẮT ĐẦU PHỤC VỤ</button></div>`);$('#v9Listen')?.addEventListener('click',()=>{if(state.settings?.voice&&'speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(ev.desc);u.lang='vi-VN';speechSynthesis.speak(u)}});$('#v9Continue')?.addEventListener('click',()=>{closeModal();advance();moveForCurrent()})}
  function targetSku(ev){const id=ev.data?.skuId||ev.data?.newSku;return id?state.inventoryItems?.find(x=>x.sku===id):null}
  function renderBrowse(ev){const target=targetSku(ev);if(!target){modalBody(eventDialogue(ev)+'<div class="v9-feedback bad">Không tìm thấy SKU trong kho. Hãy kiểm kho hoặc nhập hàng.</div><div class="v9-modal-actions"><button class="primary" id="v9Ack" type="button">MỞ KHO</button></div>');$('#v9Ack')?.addEventListener('click',()=>window.__GOLD_UI__?.open?.('inventory'));return}
    const pool=state.inventoryItems.filter(x=>x.status==='in_stock'&&x.sku!==target.sku).slice(0,12);const decoys=[...pool].sort(()=>Math.random()-.5).slice(0,2),items=[target,...decoys].sort(()=>Math.random()-.5);const key=eventKey(ev);const confirmed=state.v9.skuPick[key]===target.sku;modalBody(`${eventDialogue(ev)}<div class="v9-sku-grid">${items.map(x=>`<button class="v9-sku ${x.sku===target.sku&&confirmed?'correct':''}" data-v9-sku="${esc(x.sku)}" type="button"><b>${esc(x.name)}</b><span>${esc(x.sku)} · ${x.goldType}</span><small>${x.netChi} chỉ · công bán ${fmt(x.laborSell||x.laborAsk||0)}</small></button>`).join('')}</div><div id="v9BrowseFeedback" class="v9-feedback ${confirmed?'ok':''}">${confirmed?'Đúng món khách chọn. Có thể tư vấn và chốt giao dịch.':'Chọn đúng SKU theo yêu cầu khách.'}</div><div id="v9Negotiation"></div><div class="v9-modal-actions"><button id="v9BrowseNext" class="primary" type="button" ${confirmed?'':'disabled'}>TIẾP TỤC</button></div>`);
    $$('[data-v9-sku]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.v9Sku===target.sku){state.v9.skuPick[key]=target.sku;renderBrowse(ev)}else{$('#v9BrowseFeedback').textContent='Sai món. Khách đang chọn đúng SKU được mô tả trong yêu cầu.';$('#v9BrowseFeedback').className='v9-feedback bad'}}));renderNegotiation(ev);$('#v9BrowseNext')?.addEventListener('click',()=>{if(['sale','exchangeSame','exchangeCross'].includes(ev.type)&&window.__GOLD_V45__?.canCheckout&&!window.__GOLD_V45__.canCheckout(ev)){const f=$('#v9BrowseFeedback');f.textContent='Khách chưa đồng ý. Hãy tư vấn/chốt trước khi sang bước tiếp.';f.className='v9-feedback bad';return}closeModal();advance();moveForCurrent()})}
  function renderNegotiation(ev){const box=$('#v9Negotiation');if(!box||!['sale','exchangeSame','exchangeCross'].includes(ev.type)||!window.__GOLD_V45__)return;const a=currentAgent(),it=servedItem();if(!a||!it)return;const data=window.__GOLD_V45__.intent?.(a,it,ev);if(!data)return;box.innerHTML=`<div class="v9-info-grid" style="grid-template-columns:1fr 1fr"><div class="v9-info"><span>Ý định chốt</span><strong>${Math.round(data.score)}%</strong><div class="v9-meter"><i style="width:${data.score}%"></i></div></div><div class="v9-info"><span>Khách</span><strong>${esc(a.profile?.personaLabel||'Đang cân nhắc')}</strong></div></div><div class="v9-negotiation"><button data-v9-deal="consult" type="button">💬 Tư vấn kỹ</button><button data-v9-deal="labor" type="button">✂ Giảm công 10%</button><button data-v9-deal="fee" type="button" ${ev.type==='exchangeSame'?'':'disabled'}>↘ Giảm phí đổi</button><button class="primary" data-v9-deal="close" type="button">🤝 CHỐT</button></div>`;$$('[data-v9-deal]').forEach(b=>b.addEventListener('click',()=>{window.__GOLD_V45__.action?.(b.dataset.v9Deal,a,it,ev);renderNegotiation(ev)}))}
  function inspectionTarget(ev){const d=ev.data||{};return {weight:Number(d.weight??d.oldWeight??d.collateralWeight??0),purity:String(d.goldType??d.oldType??'610')}}
  function renderWeigh(ev){const t=inspectionTarget(ev),key=eventKey(ev);state.v9.inspect[key]=state.v9.inspect[key]||{cal:42,purity:''};const r=state.v9.inspect[key],reading=Math.max(0,t.weight+(Number(r.cal)-50)*.002);const calibrated=Math.abs(Number(r.cal)-50)<=3,purityOk=r.purity===t.purity;modalBody(`${eventDialogue(ev)}<div class="v9-scale"><div class="v9-scale-display">${reading.toFixed(3)} chỉ</div><div class="v9-field"><label>Hiệu chỉnh cân về đúng tâm</label><input id="v9Cal" type="range" min="0" max="100" value="${Number(r.cal)}"></div><div class="v9-purity"><button data-purity="610" type="button">610</button><button data-purity="980" type="button">980</button><button data-purity="9999" type="button">9999</button></div><div id="v9InspectFeedback" class="v9-feedback ${calibrated&&purityOk?'ok':''}">${calibrated&&purityOk?`Đã xác nhận ${t.weight} chỉ · vàng ${t.purity}.`:'Cân đúng trọng lượng và chọn đúng tuổi vàng.'}</div></div><div class="v9-modal-actions"><button id="v9InspectNext" class="primary" type="button" ${calibrated&&purityOk?'':'disabled'}>XÁC NHẬN KIỂM ĐỊNH</button></div>`);$('#v9Cal')?.addEventListener('input',e=>{r.cal=Number(e.target.value);renderWeigh(ev)});$$('[data-purity]').forEach(b=>{b.style.borderColor=b.dataset.purity===r.purity?'#efca67':'';b.addEventListener('click',()=>{r.purity=b.dataset.purity;renderWeigh(ev)})});$('#v9InspectNext')?.addEventListener('click',()=>{closeModal();advance();moveForCurrent()})}
  function renderPawnStep(ev){const d=ev.data||{},ltv=d.collateralValue?d.principal/d.collateralValue*100:0;modalBody(`${eventDialogue(ev)}<div class="v9-info-grid"><div class="v9-info"><span>Giải ngân</span><strong>${fmt(d.principal)}</strong></div><div class="v9-info"><span>Tài sản</span><strong>${d.collateralWeight} chỉ ${d.goldType}</strong></div><div class="v9-info"><span>LTV</span><strong>${ltv.toFixed(0)}%</strong></div><div class="v9-info"><span>Mức tổng</span><strong>${pct(d.rate)}/tháng</strong></div><div class="v9-info"><span>Kỳ hạn</span><strong>${d.termDays} ngày</strong></div><div class="v9-info"><span>Định giá</span><strong>${fmt(d.collateralValue)}</strong></div></div><div class="v9-dialogue">Mức ${pct(d.rate)}/tháng là <b>tổng lãi + phí</b>, không cộng thêm phí lần nữa.</div><div class="v9-modal-actions"><button class="primary" id="v9PawnNext" type="button">LẬP HỢP ĐỒNG & TIẾP TỤC</button></div>`);$('#v9PawnNext')?.addEventListener('click',()=>{closeModal();advance();moveForCurrent()})}
  function calcSpec(ev){const d=ev.data||{};if(ev.type==='sale'){const sku=targetSku(ev),r=sku?D.retailComponents?.(sku):null;return r?{expr:`(${sku.netChi}*${r.perChi})+${r.service}`,explain:`${sku.netChi} chỉ × ${fmt(r.perChi)}/chỉ + công bán ${fmt(r.service)}`,expected:r.total}:null}if(ev.type==='buyback'){const buy=state.market?.[d.goldType]?.buy||0;return{expr:`${d.weight}*${buy}`,explain:`${d.weight} chỉ × giá mua ${fmt(buy)}/chỉ`,expected:d.expected}}if(ev.type==='exchangeSame'||ev.type==='exchangeCross'){const sku=targetSku(ev),r=sku?D.retailComponents?.(sku):null,buy=state.market?.[d.oldType]?.buy||0;if(!r)return null;return{expr:`((${sku.netChi}*${r.perChi})+${r.service})+(${d.oldWeight}*${d.fee||0})-(${d.oldWeight}*${buy})`,explain:`Bán món mới ${fmt(r.total)}${d.fee?` + phí đổi ${fmt(d.oldWeight*(d.fee||0))}`:''} − mua vàng cũ ${fmt(d.oldWeight*buy)}`,expected:d.expected}}if(ev.type==='pawnOpen')return{expr:`${d.principal}*(${d.rate}/30)*${d.termDays}`,explain:`Gốc ${fmt(d.principal)} × (${pct(d.rate)} / 30) × ${d.termDays} ngày`,expected:d.charge};return null}
  function safeCalc(expr){const c=String(expr||'').replace(/,/g,'').trim();if(!c||c.length>220||!/^[0-9+\-*/().\s]+$/.test(c))return NaN;try{const v=Function(`"use strict";return (${c})`)();return Number.isFinite(v)?v:NaN}catch{return NaN}}
  function renderCalc(ev){const spec=calcSpec(ev);if(!spec){modalBody('<div class="v9-feedback bad">Không có công thức cho nghiệp vụ này.</div>');return}modalBody(`${eventDialogue(ev)}<div class="v9-formula">${esc(spec.explain)}</div><div class="v9-field"><label>Máy tính quầy</label><input id="v9Expr" class="v9-input" value="" placeholder="Nhập phép tính hoặc nạp công thức"></div><div class="v9-modal-actions"><button id="v9LoadFormula" type="button">NẠP CÔNG THỨC</button><button id="v9Calc" type="button">= TÍNH</button></div><div class="v9-field"><label>Kết quả báo khách</label><input id="v9Answer" class="v9-input" inputmode="numeric" placeholder="0"></div><div id="v9CalcFeedback" class="v9-feedback">Tự tính để học nghiệp vụ; game kiểm tra sai số trước khi mở POS.</div><div class="v9-modal-actions"><button class="primary" id="v9Check" type="button">KIỂM TRA & SANG POS</button></div>`);$('#v9LoadFormula')?.addEventListener('click',()=>{$('#v9Expr').value=spec.expr});$('#v9Calc')?.addEventListener('click',()=>{const v=safeCalc($('#v9Expr').value);const f=$('#v9CalcFeedback');if(!Number.isFinite(v)){f.textContent='Phép tính chưa hợp lệ.';f.className='v9-feedback bad';return}$('#v9Answer').value=Math.round(v).toLocaleString('vi-VN');f.textContent=`Kết quả máy tính: ${fmt(v)}`;f.className='v9-feedback ok'});$('#v9Check')?.addEventListener('click',()=>{const v=moneyInput($('#v9Answer').value);const old=$('#answerInput');if(old)old.value=String(Math.round(v));D.checkAnswer?.();if(state.pendingSettlement){closeModal();advance();moveForCurrent()}else{const f=$('#v9CalcFeedback');f.textContent='Chưa đúng. Kiểm tra lại công thức/giá trị.';f.className='v9-feedback bad'}})}
  function renderPos(ev){const p=state.pendingSettlement;if(!p){modalBody('<div class="v9-feedback bad">POS chưa có số tiền. Hãy hoàn thành bước tính giá trước.</div><div class="v9-modal-actions"><button id="v9BackCalc" type="button">QUAY LẠI TÍNH</button></div>');$('#v9BackCalc')?.addEventListener('click',()=>{const f=flowState(ev);f.index=Math.max(0,f.index-1);renderModal(ev,stepsFor(ev)[f.index])});return}const collect=p.direction==='collect';modalBody(`${eventDialogue(ev)}<div class="v9-info-grid"><div class="v9-info"><span>${collect?'Phải thu':'Phải chi'}</span><strong>${fmt(p.amount)}</strong></div><div class="v9-info"><span>Hình thức</span><strong>${collect?'Thu khách':'Xuất tiền'}</strong></div><div class="v9-info"><span>Quầy</span><strong>POS / tiền mặt</strong></div></div>${collect?`<div class="v9-field"><label>Tiền khách đưa</label><input id="v9Tender" class="v9-input" inputmode="numeric" placeholder="0"></div><div id="v9Change" class="v9-feedback">Nhập tiền khách đưa để tính tiền thối.</div>`:''}<div class="v9-modal-actions">${collect?'<button id="v9Exact" type="button">KHÁCH ĐƯA ĐỦ</button>':''}<button class="primary" id="v9ConfirmPos" type="button">${collect?'THU TIỀN':'CHI TIỀN'} & IN PHIẾU</button></div>`);if(collect){const update=()=>{const t=moneyInput($('#v9Tender').value),c=t-p.amount;$('#v9Change').textContent=t<p.amount?`Còn thiếu ${fmt(p.amount-t)}`:`Tiền thối: ${fmt(Math.max(0,c))}`;$('#v9Change').className='v9-feedback '+(t>=p.amount?'ok':'bad')};$('#v9Tender')?.addEventListener('input',update);$('#v9Exact')?.addEventListener('click',()=>{$('#v9Tender').value=Math.round(p.amount).toLocaleString('vi-VN');update()})}$('#v9ConfirmPos')?.addEventListener('click',()=>{if(collect){const t=moneyInput($('#v9Tender')?.value);if(t<p.amount){$('#v9Change').textContent='Tiền khách đưa chưa đủ.';$('#v9Change').className='v9-feedback bad';return}const hidden=$('#tenderInput');if(hidden)hidden.value=String(Math.round(t))}D.confirmSettlement?.();if(ev.done){renderReceipt(ev)}else toastLocal('Giao dịch chưa hoàn tất. Kiểm tra tiền mặt/quỹ.')})}
  function renderReceipt(ev){const r=state.receipts?.[0];modalBody(`<div class="v9-receipt"><b>${esc(r?.id||'PHIẾU')} · ${esc(ev.title)}</b><small>${esc(ev.customer?.name||'Khách')} · Ngày ${state.day} ${clockText()}</small><strong>${r?(r.direction==='collect'?'THU ':'CHI ')+fmt(r.amount):'Đã hoàn tất'}</strong>${r?.change?`<small>Tiền thối ${fmt(r.change)}</small>`:''}</div><div class="v9-feedback ok">Đã cập nhật kho, tiền, CRM và sổ kế toán.</div><div class="v9-modal-actions"><button class="primary" id="v9ReceiptDone" type="button">HOÀN TẤT</button></div>`);$('#v9ReceiptDone')?.addEventListener('click',()=>{closeModal();paint()})}
  function choiceRows(ev){if(ev.type==='pawnDue')return[['payCharge','ĐÓNG KỲ','Chỉ thu khoản kỳ, giữ nguyên gốc'],['partialPrincipal','BỚT 5 TRIỆU GỐC','Giảm dư nợ cầm'],['redeem','CHUỘC TOÀN BỘ','Trả gốc + khoản thu']];if(ev.type==='priceShock')return[['updatePrice','CẬP NHẬT GIÁ','Đồng bộ bảng giá'],['holdPrice','GIỮ GIÁ CŨ','Chấp nhận rủi ro']];if(ev.type==='supplier')return[['supplierCash','NHẬP TIỀN MẶT','Giảm tiền, tăng kho'],['supplierCredit','NHẬP CÔNG NỢ','Tăng kho, tăng phải trả'],['supplierDecline','TỪ CHỐI','Không thay đổi vốn']];if(ev.type==='service')return[['acceptService','NHẬN VIỆC','Thu phí và chịu chi phí kỹ thuật'],['declineService','TỪ CHỐI','Không nhận rủi ro']];if(ev.type==='staffError')return[['auditNow','ĐỐI SOÁT NGAY','Ghi sai lệch vào sổ'],['auditLater','ĐỂ CUỐI NGÀY','Treo tới kiểm quỹ']];if(ev.type==='chanh')return[['applyChanh','GHI NHẬN HAO','Giảm giá trị SKU'],['skipChanh','CHƯA ĐƯA CHÀNH','Giữ món trong kho']];if(ev.type==='audit')return[['countCash','KIỂM QUỸ','Khóa quỹ và xử lý chênh lệch'],['skipAudit','BỎ KIỂM','Bị giảm uy tín']];return[['ack','ĐÃ HIỂU','Tiếp tục']]} 
  function renderChoice(ev){const rows=choiceRows(ev);modalBody(`${eventDialogue(ev)}${ev.hint?`<div class="v9-formula">${esc(ev.hint)}</div>`:''}<div class="v9-modal-actions">${rows.map(([id,t,d])=>`<button ${id===rows[0][0]?'class="primary"':''} data-v9-choice="${id}" type="button"><b>${esc(t)}</b><br><small>${esc(d)}</small></button>`).join('')}</div>`);$$('[data-v9-choice]').forEach(b=>b.addEventListener('click',()=>{D.processChoice?.(b.dataset.v9Choice);if(ev.done){modalBody(`<div class="v9-feedback ok">Đã xử lý: ${esc(ev.title)}. Sổ và trạng thái đã cập nhật.</div><div class="v9-modal-actions"><button class="primary" id="v9ChoiceDone" type="button">HOÀN TẤT</button></div>`);$('#v9ChoiceDone')?.addEventListener('click',()=>{closeModal();paint()})}else renderChoice(ev)}))}
  function showDaySummary(){const h=state.history?.[0];if(!h)return;$('#v9ModalStep').textContent='BÁO CÁO CUỐI NGÀY';$('#v9ModalTitle').textContent=`Ngày ${h.day}: ${h.net>=0?'CÓ LÃI':'ĐANG LỖ'}`;modal.classList.remove('hidden');modalBody(`<div class="v9-info-grid"><div class="v9-info"><span>Lợi nhuận</span><strong style="color:${h.net>=0?'#76e599':'#ff9280'}">${h.net>=0?'+':''}${fmt(h.net)}</strong></div><div class="v9-info"><span>Tiền mặt</span><strong>${short(h.cash)}</strong></div><div class="v9-info"><span>Kho</span><strong>${short(h.inventory)}</strong></div><div class="v9-info"><span>Uy tín</span><strong>${Math.round(h.rep||state.reputation)}/100</strong></div><div class="v9-info"><span>Khách mất</span><strong>${h.daily?.lostCustomers||0}</strong></div><div class="v9-info"><span>Chi nhánh</span><strong>${short(h.branchNet||0)}</strong></div></div><div class="v9-modal-actions"><button class="primary" data-v9-action="newday" type="button">MỞ CỬA NGÀY ${state.day}</button></div>`)}
  function toastLocal(text){const t=$('#toast');if(t){t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}}

  function installVisual(){
    if(visualInstalled)return true;
    RT=window.__GOLD_REAL3D__;G=window.__GOLD_3D__;
    if(!RT?.scene||!RT?.renderer||!G?.agents)return false;
    visualInstalled=true;
    const T=window.THREE;
    RT.renderer.toneMapping=T.ACESFilmicToneMapping;
    RT.renderer.toneMappingExposure=1.03;
    RT.renderer.outputColorSpace=T.SRGBColorSpace;
    RT.camera.near=.1;
    RT.camera.far=100;
    RT.camera.updateProjectionMatrix();
    // V1 Complete: the premium showroom now lives in v1-real3d.js.
    // Do not layer the old procedural decoration/NPC pass on top of it.
    const legacy=RT.scene.getObjectByName('V1_GAMEPLAY_POLISH');
    if(legacy) legacy.visible=false;
    return true;
  }
  function makeAmbient(){return null}
  function animateVisual(){return null}

  function fixLabels(){const sub=$('.brand-sub');if(sub&&!state.started)sub.textContent='V1.2 · Character Motion & Accuracy';const nav=$('.v3-nav');if(nav)nav.textContent='◆ V1.2 CỬA HÀNG 3D';const v8=$('#v8PremiumStage');if(v8)v8.style.display='none'}
  function loop(){G=window.__GOLD_3D__||G;RT=window.__GOLD_REAL3D__||RT;if(!root)build();installVisual();syncBody();fixLabels();const now=performance.now();if(now-lastPaint>240){lastPaint=now;paint()}requestAnimationFrame(loop)}
  ensure();setTimeout(()=>{if(build()){}requestAnimationFrame(loop)},260);
  window.__GOLD_V9__={paint,serveNext,openCurrentStep,stepsFor,moveForCurrent};
})();
