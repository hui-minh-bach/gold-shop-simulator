(() => {
  'use strict';
  const D = window.__GOLD_DEBUG__;
  if (!D || !D.state) return;
  const state = D.state;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const fmt = n => new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+'đ';
  const short = n => {n=Number(n)||0;const a=Math.abs(n);if(a>=1e9)return (n/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ';if(a>=1e6)return (n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' triệu';return fmt(n)};
  const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const roleMap = {
    'Bán hàng':'Tư vấn bán hàng','Thu ngân':'Thu ngân / POS','Kho & kiểm hàng':'Kho / kiểm hàng','Chăm khách':'Tư vấn bán hàng'
  };
  const roles = ['Tư vấn bán hàng','Thu ngân / POS','Cầm đồ','Kho / kiểm hàng','An ninh / camera'];
  const eventRole = {sale:'Tư vấn bán hàng',buyback:'Tư vấn bán hàng',exchangeSame:'Tư vấn bán hàng',exchangeCross:'Tư vấn bán hàng',pawnOpen:'Cầm đồ',pawnDue:'Cầm đồ',supplier:'Kho / kiểm hàng',supplierScenario:'Kho / kiểm hàng',chanh:'Kho / kiểm hàng',staffError:'Thu ngân / POS',audit:'Thu ngân / POS',serviceOrder:'Tư vấn bán hàng',priceShock:'Thu ngân / POS',info:'Kho / kiểm hàng'};
  let audioCtx = null;
  let lastTick = performance.now();
  let lastArrivalCount = 0;
  let autosaveElapsed = 0;

  function ensureV2(){
    state.settings = state.settings || {};
    if (typeof state.settings.fx !== 'boolean') state.settings.fx = false;
    state.liveStore = state.liveStore || {};
    const l = state.liveStore;
    if (typeof l.running !== 'boolean') l.running = false;
    if (![1,2,4].includes(l.speed)) l.speed = 1;
    if (!Array.isArray(l.schedule)) l.schedule = [];
    if (!Array.isArray(l.log)) l.log = [];
    if (!l.completed) l.completed = {};
    if (!l.warned) l.warned = {};
    if (!Number.isFinite(l.served)) l.served = 0;
    if (!Number.isFinite(l.abandoned)) l.abandoned = 0;
    if (!Number.isFinite(l.day)) l.day = state.day;
    state.staff.forEach((s,i)=>{
      if (!s.v2Role) s.v2Role = roleMap[s.role] || roles[i%roles.length];
      if (!Number.isFinite(s.energy)) s.energy = 100;
      if (!Number.isFinite(s.shiftHandled)) s.shiftHandled = 0;
    });
    syncDay(true);
    updateVersionText();
  }

  function updateVersionText(){
    document.querySelectorAll('.brand-sub').forEach(el=>el.textContent=state.started?`${state.storeName||'Tiệm của bạn'} · V1.0`:'V1.0 · Playable 3D Full');
  }

  function isBetweenDays(){
    const required=Math.min(8,state.dayQueue?.length||8);return !!(state.started && state.history?.[0]?.day === state.day-1 && state.daily?.auditDone && state.daily?.handled >= required && state.clockMinutes > 480);
  }

  function syncDay(force=false){
    if (!state.started) return;
    const l=state.liveStore;
    if (isBetweenDays()) { l.running=false; return; }
    if (!force && l.day===state.day && l.schedule.length===state.dayQueue.length) return;
    l.day=state.day; l.running=false; l.served=0; l.abandoned=0; l.completed={}; l.warned={};
    l.schedule=(state.dayQueue||[]).map((ev,i)=>({
      id:`D${state.day}-E${i}`,
      index:i,
      arrival:485+Math.round(i*(630/Math.max(1,(state.dayQueue||[]).length-1)))+(i%3)*3,
      title:ev.title,
      type:ev.type,
      name:ev.customer?.name||'Khách',
      avatar:ev.customer?.avatar||avatarFor(ev.type),
      patience:100,
      penalized:false
    }));
    state.staff.forEach(s=>{s.energy=clamp(Number(s.energy)||100,55,100);s.shiftHandled=0;});
    logLive(`Bắt đầu lịch ca ngày ${state.day}: ${l.schedule.length} tình huống dự kiến.`);
    lastArrivalCount=0;
  }

  function avatarFor(type){
    if(type==='pawnOpen'||type==='pawnDue')return '🤝';
    if(type==='supplierScenario'||type==='supplier')return '🚚';
    if(type==='audit')return '🧾';
    if(type==='staffError')return '🧑‍💼';
    if(type==='priceShock')return '📈';
    return '👤';
  }

  function clockText(){
    const mins=Math.max(0,Number(state.clockMinutes)||0),h=Math.floor(mins/60)%24,m=Math.floor(mins%60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  function queueItems(){
    syncCompletion();
    return state.liveStore.schedule.filter(x=>x.index>=state.situationsToday && x.arrival<=state.clockMinutes);
  }

  function syncCompletion(){
    const l=state.liveStore;
    l.schedule.forEach(item=>{
      const doneByIndex=item.index < state.situationsToday-1 || (item.index===state.situationsToday-1 && state.currentEvent?.done);
      if(doneByIndex && !l.completed[item.id]){
        l.completed[item.id]=true;l.served++;
        const staff=bestStaffFor(item.type); if(staff){staff.shiftHandled=(staff.shiftHandled||0)+1;staff.energy=clamp(staff.energy-2,0,100);}
        logLive(`Hoàn tất: ${item.title}.`);
        playTone('success');
      }
    });
  }

  function currentItem(){
    if(!state.currentEvent || state.currentEvent.done) return null;
    const idx=Math.max(0,state.situationsToday-1);
    return state.liveStore.schedule[idx]||null;
  }

  function patienceFor(item){
    if(item.index<state.situationsToday)return 100;
    const wait=Math.max(0,state.clockMinutes-item.arrival);
    const staff=bestStaffFor(item.type);
    const coverage=staff ? (0.28-(Math.min(100,staff.skill||60)-60)*0.0012) : .42;
    return clamp(100-wait*coverage,0,100);
  }

  function bestStaffFor(type){
    const wanted=eventRole[type]||'Tư vấn bán hàng';
    return state.staff.filter(s=>s.v2Role===wanted && (s.energy||0)>15).sort((a,b)=>(b.skill+b.energy)-(a.skill+a.energy))[0]||null;
  }

  function tick(ts){
    ensureV2();
    const delta=Math.min(3,(ts-lastTick)/1000);lastTick=ts;
    const l=state.liveStore;
    if(l.running && state.started && !isBetweenDays()){
      const simMin=delta*l.speed*3;
      state.clockMinutes=Math.min(1190,state.clockMinutes+simMin);
      state.staff.forEach(s=>s.energy=clamp((s.energy||100)-simMin*.018,0,100));
      processQueuePressure();
      if(state.clockMinutes>=1190){l.running=false;logLive('Đã đến giờ đóng cửa. Hãy hoàn tất khách còn lại, kiểm quỹ và khóa sổ.');playTone('alert');}
      autosaveElapsed+=delta;
      if(autosaveElapsed>=20){autosaveElapsed=0;D.save(true);}
    }
    renderLive();
    requestAnimationFrame(tick);
  }

  function processQueuePressure(){
    const q=queueItems();
    if(q.length>lastArrivalCount){
      const newest=q[q.length-1];
      logLive(`${newest.name} vừa vào tiệm: ${newest.title}.`);playTone('arrival');
    }
    lastArrivalCount=q.length;
    q.forEach(item=>{
      const p=patienceFor(item);
      if(p<25 && !state.liveStore.warned[item.id]){
        state.liveStore.warned[item.id]=true;
        state.reputation=clamp((state.reputation||50)-.3,0,100);
        logLive(`${item.name} đang mất kiên nhẫn vì chờ lâu.`);playTone('alert');
      }
      if(p<=1 && !item.penalized){
        item.penalized=true;state.liveStore.abandoned++;
        state.reputation=clamp((state.reputation||50)-.7,0,100);
        logLive(`${item.name} rất khó chịu vì thời gian chờ. Uy tín bị ảnh hưởng.`);
      }
    });
  }

  function renderLive(){
    const root=$('#view-live'); if(!root)return;
    syncDay(); syncCompletion();
    const l=state.liveStore;
    const running=!!l.running;
    $('#liveRunBadge').textContent=running?`ĐANG CHẠY x${l.speed}`:'TẠM DỪNG';
    $('#liveRunBadge').className=`v2-live-badge ${running?'running':'paused'}`;
    $('#liveClock').textContent=clockText();
    $('#liveFxBtn').textContent=state.settings.fx?'🔔 Âm báo: Bật':'🔕 Âm báo: Tắt';
    $$('.v2-speed').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===l.speed));
    const between=isBetweenDays();
    $('#liveNewDayBtn').classList.toggle('hidden',!between);
    $('#liveCloseDayBtn').classList.toggle('hidden',between);
    $('#livePlayBtn').disabled=!state.started||between||state.clockMinutes>=1190;
    $('#livePauseBtn').disabled=!state.started;
    $('#liveStoreName').textContent=state.started?`${state.storeName||'Tiệm của bạn'} · ${state.tier?.name||''} · ${state.location?.name||''}`:'Chưa mở tiệm';
    const q=state.started?queueItems():[],customerTypes=new Set(['sale','buyback','exchangeSame','exchangeCross','pawnOpen','pawnDue','service','lostCustomer']),customerQ=q.filter(x=>customerTypes.has(x.type));
    const avgP=customerQ.length?customerQ.reduce((s,x)=>s+patienceFor(x),0)/customerQ.length:100;
    const avgEnergy=state.staff.length?state.staff.reduce((s,x)=>s+(x.energy||0),0)/state.staff.length:0;
    const stats=[
      ['Khách đang chờ',customerQ.length],['Đã phục vụ',l.served],['Kiên nhẫn TB',`${Math.round(avgP)}/100`],['Năng lượng NV',`${Math.round(avgEnergy)}/100`],['Tiền mặt',short(state.cash||0)],['Kho',`${D.inventoryValue?short(D.inventoryValue()):'0đ'} · ${state.inventoryItems?.filter(x=>x.status==='in_stock').length||0} món`]
    ];
    $('#liveStats').innerHTML=stats.map(([a,b])=>`<div class="report-card"><span>${a}</span><strong>${b}</strong></div>`).join('');
    $('#queueCountBadge').textContent=customerQ.length;
    $('#zoneSalesCount').textContent=`${q.filter(x=>['sale','buyback','exchangeSame','exchangeCross','service','serviceOrder','lostCustomer'].includes(x.type)).length} khách`;
    $('#zonePawnCount').textContent=`${q.filter(x=>['pawnOpen','pawnDue'].includes(x.type)).length} khách`;
    $('#zoneCashText').textContent=short(state.cash||0);
    $('#zoneStockText').textContent=`${state.inventoryItems?.filter(x=>x.status==='in_stock').length||0} món`;
    $('#zoneRiskText').textContent=q.length>=4?'Đông khách':avgEnergy<45?'NV mệt':'Ổn định';
    $('#liveStoreAlert').textContent=between?'Ngày đã khóa sổ':customerQ.length>=4?'Quầy đang đông':running?(state.daily?.walkInsPlanned===0?'Tiệm mở nhưng hôm nay cực vắng':'Tiệm đang mở'):'Đang tạm dừng';
    renderQueue(q);renderCurrent();renderStaff();renderFloor(q);renderLog();
  }

  function renderQueue(q){
    const el=$('#liveQueue');if(!el)return;
    if(!state.started){el.innerHTML='<div class="v2-empty">Hãy mở tiệm ở tab Khởi nghiệp.</div>';return;}
    if(!q.length){el.innerHTML='<div class="v2-empty">Chưa có khách chờ. Chạy thời gian để đón khách tiếp theo.</div>';return;}
    el.innerHTML=q.slice(0,7).map(item=>{const p=Math.round(patienceFor(item));return `<div class="v2-queue-card ${p<25?'hot':''}"><div class="v2-q-avatar">${item.avatar}</div><div><div class="v2-q-top"><strong>${esc(item.name)}</strong><small>${toTime(item.arrival)}</small></div><small>${esc(item.title)}</small><div class="v2-patience" title="Kiên nhẫn ${p}/100"><i style="width:${p}%"></i></div></div></div>`}).join('');
  }

  function renderCurrent(){
    const item=currentItem(),ev=state.currentEvent;
    if(!item||!ev){
      $('#liveCurrentTitle').textContent='Chưa có giao dịch';
      $('#liveCurrentCustomer').innerHTML='<div class="v2-empty">Chọn “Phục vụ khách đầu hàng” hoặc bấm khu vực quầy.</div>';
      $('#openCounterBtn').disabled=true;$('#readCustomerBtn').disabled=true;return;
    }
    $('#liveCurrentTitle').textContent=item.title;
    const role=eventRole[item.type]||'Tư vấn bán hàng',staff=bestStaffFor(item.type);
    $('#liveCurrentCustomer').innerHTML=`<div class="v2-current-card"><div class="v2-current-avatar">${item.avatar}</div><div><h4>${esc(item.name)}</h4><p>${esc(ev.desc||item.title)}</p><div class="formula">Khu xử lý: <strong>${esc(role)}</strong>${staff?` · NV phù hợp: <strong>${esc(staff.name)}</strong>`:' · Chưa có NV chuyên trách'}</div></div></div>`;
    $('#openCounterBtn').disabled=false;$('#readCustomerBtn').disabled=false;
  }

  function renderStaff(){
    const el=$('#liveStaffBoard');if(!el)return;
    if(!state.started){el.innerHTML='<div class="v2-empty">Mở tiệm để phân công nhân sự.</div>';return;}
    el.innerHTML=state.staff.map(s=>`<div class="v2-staff-live"><div class="top"><strong>🧑‍💼 ${esc(s.name)}</strong><span class="tag">${Math.round(s.energy||0)}%</span></div><small>${esc(s.role)} · Kỹ năng ${s.skill}/100 · Tin cậy ${s.trust}/100</small><div class="v2-energy"><i style="width:${clamp(s.energy||0,0,100)}%"></i></div><select data-v2-role="${s.id}">${roles.map(r=>`<option value="${r}" ${s.v2Role===r?'selected':''}>${r}</option>`).join('')}</select><div class="v2-staff-actions"><small>Đã xử lý ${s.shiftHandled||0}</small><button class="btn ghost tiny" data-v2-rest="${s.id}" type="button">Nghỉ 15'</button></div></div>`).join('');
  }

  function renderFloor(q){
    const el=$('#liveFloorPeople');if(!el)return;
    const people=[];
    q.slice(0,5).forEach((x,i)=>{const left=[78,70,83,64,88][i]||75,top=[80,68,58,47,38][i]||70;people.push(`<span class="v2-person" style="left:${left}%;top:${top}%">${x.avatar}</span>`)});
    state.staff.slice(0,5).forEach((s,i)=>{const spots=[[48,38],[48,63],[18,55],[30,78],[62,78]],p=spots[i]||[40+i*7,70];people.push(`<span class="v2-person staff" title="${esc(s.name)} · ${esc(s.v2Role)}" style="left:${p[0]}%;top:${p[1]}%">🧑‍💼</span>`)});
    el.innerHTML=people.join('');
  }

  function renderLog(){
    const el=$('#liveLog');if(!el)return;
    const log=state.liveStore.log||[];
    el.innerHTML=log.length?log.slice(0,30).map(x=>`<div class="v2-log-row"><time>${esc(x.time)}</time><span>${esc(x.text)}</span></div>`).join(''):'<div class="v2-empty">Chưa có diễn biến trong ca.</div>';
  }

  function logLive(text){
    const l=state.liveStore;if(!l)return;l.log=l.log||[];l.log.unshift({day:state.day,time:clockText(),text});l.log=l.log.slice(0,80);
  }

  function toTime(mins){const h=Math.floor(mins/60)%24,m=Math.floor(mins%60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}

  function serveNext(){
    if(!state.started){D.showView('setup');return;}
    if(state.currentEvent && !state.currentEvent.done){D.showView('shop');return;}
    const q=queueItems();
    if(!q.length){logLive('Chưa có khách nào tới lượt. Hãy chạy thời gian thêm.');playTone('alert');return;}
    const next=q[0];
    const staff=bestStaffFor(next.type);if(staff)staff.energy=clamp(staff.energy-1.5,0,100);
    D.nextSituation();
    logLive(`Bắt đầu phục vụ ${next.name}: ${next.title}.`);
    D.showView('shop');
  }

  function zoneAction(zone){
    if(!state.started){D.showView('setup');return;}
    if(zone==='sales'){const q=queueItems().filter(x=>['sale','buyback','exchangeSame','exchangeCross','service','serviceOrder','lostCustomer'].includes(x.type));if(q.length&&(!state.currentEvent||state.currentEvent.done))serveNext();else D.showView('shop');}
    if(zone==='cashier')D.showView('shop');
    if(zone==='pawn'){const q=queueItems().filter(x=>['pawnOpen','pawnDue'].includes(x.type));if(q.length&&(!state.currentEvent||state.currentEvent.done))serveNext();else D.showView('pawn');}
    if(zone==='inventory')D.showView('inventory');
    if(zone==='safe')D.showView('finance');
    if(zone==='office')D.showView('management');
    if(zone==='camera')D.showView('management');
  }

  function restStaff(id){
    const s=state.staff.find(x=>x.id===id);if(!s)return;
    s.energy=clamp((s.energy||0)+22,0,100);state.clockMinutes=Math.min(1190,state.clockMinutes+15);logLive(`${s.name} nghỉ 15 phút, năng lượng hồi phục.`);renderLive();D.save(true);
  }

  function v2Speak(text){
    if(!state.settings.voice||!('speechSynthesis' in window))return;
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='vi-VN';u.rate=.98;speechSynthesis.speak(u);
  }

  function briefing(){
    if(!state.started){v2Speak('Bạn chưa mở tiệm. Hãy sang phần khởi nghiệp để bắt đầu với mười tỷ vốn.');return;}
    const q=queueItems().length,stock=state.inventoryItems?.filter(x=>x.status==='in_stock').length||0;
    v2Speak(`Briefing ngày ${state.day}. Tiệm đang có ${stock} món trong kho, ${state.staff.length} nhân viên, ${q} khách đang chờ. Tiền mặt hiện tại ${short(state.cash)}. Hãy giữ quầy không quá đông, kiểm soát cầm đồ và khóa sổ cuối ngày.`);
  }

  function playTone(kind){
    // V8: bỏ tiếng beep/oscillator lặp lại. Trạng thái vẫn được báo bằng UI, log và voice nếu người chơi bật.
    return;
  }

  function closeDayFromLive(){
    if(!state.started)return;
    const before=state.day;D.endDay();
    if(state.day!==before){state.liveStore.running=false;logLive(`Đã khóa sổ ngày ${before}.`);renderLive();}
  }

  function newDayFromLive(){
    if(!isBetweenDays())return;
    D.beginDay();state.liveStore.day=0;syncDay(true);state.liveStore.running=true;logLive(`Mở cửa ngày ${state.day}.`);D.showView('live');renderLive();D.save(true);
  }

  function bind(){
    $('#livePlayBtn')?.addEventListener('click',()=>{if(!state.started){D.showView('setup');return;}if(isBetweenDays())return;audioCtx=audioCtx||null;state.liveStore.running=true;logLive('Đã bật chế độ chạy ca liên tục.');renderLive();});
    $('#livePauseBtn')?.addEventListener('click',()=>{state.liveStore.running=false;logLive('Đã tạm dừng đồng hồ cửa hàng.');renderLive();});
    $$('.v2-speed').forEach(b=>b.addEventListener('click',()=>{state.liveStore.speed=Number(b.dataset.speed)||1;logLive(`Đổi tốc độ mô phỏng x${state.liveStore.speed}.`);renderLive();}));
    $('#serveNextBtn')?.addEventListener('click',serveNext);
    $('#openCounterBtn')?.addEventListener('click',()=>D.showView('shop'));
    $('#readCustomerBtn')?.addEventListener('click',()=>{if(state.currentEvent)v2Speak(state.currentEvent.desc||state.currentEvent.title)});
    $('#liveBriefBtn')?.addEventListener('click',briefing);
    $('#liveFxBtn')?.addEventListener('click',()=>{state.settings.fx=!state.settings.fx;renderLive();D.save(true)});
    $('#liveCloseDayBtn')?.addEventListener('click',closeDayFromLive);
    $('#liveNewDayBtn')?.addEventListener('click',newDayFromLive);
    $$('.v2-zone').forEach(b=>b.addEventListener('click',()=>zoneAction(b.dataset.zone)));
    $('#liveStaffBoard')?.addEventListener('change',e=>{const sel=e.target.closest('[data-v2-role]');if(!sel)return;const s=state.staff.find(x=>x.id===sel.dataset.v2Role);if(s){s.v2Role=sel.value;logLive(`${s.name} chuyển sang ${s.v2Role}.`);D.save(true);renderLive();}});
    $('#liveStaffBoard')?.addEventListener('click',e=>{const b=e.target.closest('[data-v2-rest]');if(b)restStaff(b.dataset.v2Rest)});
    document.querySelector('[data-view="live"]')?.addEventListener('click',()=>setTimeout(renderLive,0));
    $('#startGameBtn')?.addEventListener('click',()=>setTimeout(()=>{if(state.started){syncDay(true);state.liveStore.running=true;D.showView('live');renderLive();}},0));
    window.addEventListener('beforeunload',()=>{if(state.started)D.save(true)});
  }

  ensureV2();bind();renderLive();requestAnimationFrame(tick);
})();
