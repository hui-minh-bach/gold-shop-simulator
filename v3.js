(() => {
  'use strict';
  if (window.__REAL3D_ENABLED__) return;
  const D = window.__GOLD_DEBUG__;
  if (!D || !D.state) return;
  const state = D.state;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const short = n => {n=Number(n)||0;const a=Math.abs(n);if(a>=1e9)return (n/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ';if(a>=1e6)return (n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' triệu';return new Intl.NumberFormat('vi-VN').format(Math.round(n))+'đ'};
  const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const storeLabel = () => String(state.storeName||'TIỆM VÀNG CỦA BẠN').trim().slice(0,28);
  const WORLD={w:1000,h:620};
  const stationDefs=[
    {id:'showcase',name:'Tủ trưng bày',icon:'💍',x:185,y:315,w:255,d:88,h:88,kind:'sales',view:'shop',desc:'Lấy SKU, tư vấn bán/mua/đổi và đưa món cho khách xem.',approach:{x:315,y:445}},
    {id:'scale',name:'Cân & kiểm vàng',icon:'⚖',x:440,y:150,w:135,d:82,h:78,kind:'scale',view:'shop',desc:'Cân vàng cũ, kiểm trọng lượng và đối chiếu tuổi vàng trước khi báo giá.',approach:{x:510,y:270}},
    {id:'pos',name:'Thu ngân / POS',icon:'🧮',x:620,y:145,w:165,d:95,h:88,kind:'cashier',view:'shop',desc:'Máy tính quầy, tiền khách đưa, tiền thối, thu/chi và in phiếu.',approach:{x:700,y:275}},
    {id:'pawn',name:'Thu mua / Cầm đồ',icon:'🤝',x:805,y:150,w:150,d:125,h:76,kind:'pawn',view:'pawn',desc:'Định giá tài sản, giải ngân, đóng kỳ, bớt gốc, chuộc và quá hạn.',approach:{x:825,y:315}},
    {id:'safe',name:'Két tiền',icon:'🔐',x:840,y:382,w:100,d:88,h:120,kind:'safe',view:'finance',desc:'Kiểm tiền mặt, nghĩa vụ nợ, thanh khoản và khóa quỹ.',approach:{x:800,y:440}},
    {id:'warehouse',name:'Kho / SKU',icon:'📦',x:650,y:420,w:155,d:115,h:120,kind:'inventory',view:'inventory',desc:'Theo dõi từng SKU, chành, công nợ, kiểm kho và hàng tồn lâu.',approach:{x:610,y:480}},
    {id:'office',name:'Văn phòng quản trị',icon:'📊',x:390,y:450,w:145,d:96,h:88,kind:'office',view:'management',desc:'Nhân sự, giá bán, tiền công, phí đổi, chi phí và mở rộng chuỗi.',approach:{x:465,y:405}},
    {id:'camera',name:'Camera an ninh',icon:'📹',x:80,y:440,w:130,d:95,h:92,kind:'camera',view:'management',desc:'Quan sát cửa hàng, giảm thất thoát và kiểm soát vận hành.',approach:{x:240,y:470}},
  ];
  const decorDefs=[
    {id:'island-right',x:490,y:335,w:205,d:78,h:82,block:true,label:'TRANG SỨC CAO CẤP'},
    {id:'wall-left',x:55,y:76,w:240,d:62,h:108,block:false,label:'KHO / TỒN'},
    {id:'wall-right',x:690,y:72,w:235,d:60,h:108,block:false,label:'BỘ SƯU TẬP'}
  ];
  const obstacles=[...stationDefs.map(s=>({x:s.x-18,y:s.y-18,w:s.w+36,h:s.d+36})),...decorDefs.filter(s=>s.block).map(s=>({x:s.x-14,y:s.y-14,w:s.w+28,h:s.d+28}))];
  const staffTargets={
    'Tư vấn bán hàng':{x:320,y:455},'Thu ngân / POS':{x:705,y:300},'Cầm đồ':{x:850,y:330},'Kho / kiểm hàng':{x:615,y:500},'An ninh / camera':{x:240,y:495}
  };
  const eventTargets={sale:{x:325,y:470},buyback:{x:510,y:300},exchangeSame:{x:510,y:300},exchangeCross:{x:510,y:300},pawnOpen:{x:850,y:335},pawnDue:{x:850,y:335},service:{x:325,y:470},lostCustomer:{x:325,y:470},quietDay:{x:500,y:555},supplier:{x:620,y:520},chanh:{x:620,y:520},audit:{x:705,y:300},staffError:{x:705,y:300},priceShock:{x:705,y:300},info:{x:620,y:520}};
  const door={x:930,y:570};
  const browseSpots=[
    {x:210,y:315,zone:'showcase'},{x:340,y:330,zone:'showcase'},{x:465,y:350,zone:'showcase'},
    {x:625,y:345,zone:'showcase'},{x:740,y:370,zone:'browse'},{x:230,y:500,zone:'lounge'}
  ];
  const waitSpots=[{x:820,y:500},{x:855,y:520},{x:890,y:535},{x:780,y:485}];
  function needIcon(type){return ({sale:'💍',buyback:'↩',exchangeSame:'↔',exchangeCross:'⇄',pawnOpen:'🤝',pawnDue:'🧾',service:'✨',lostCustomer:'💬'})[type]||'•'}
  const PUBLIC_TYPES=new Set(['sale','buyback','exchangeSame','exchangeCross','pawnOpen','pawnDue','service','lostCustomer']);
  let canvas,ctx,dpr=1,raf=0,last=performance.now(),hoverWorld=null;
  const agents=new Map();
  let selected=null;
  let localLog=[];
  let ambientCooldown=6;
  const CUSTOMER_PERSONAS=[
    {key:'price',label:'Săn giá',lines:['Bên kia báo mềm hơn đó nha.','Nếu công tốt hơn chỗ khác thì tôi chốt.','Giá này hơi căng, giảm thêm được không?']},
    {key:'vip',label:'VIP kỹ tính',lines:['Tôi ưu tiên uy tín, làm đẹp và chuẩn.','Tôi cần món sang nhưng phải chắc tay nghề.','Tôi mua lâu dài nên cần tư vấn kỹ.']},
    {key:'trend',label:'Thích mẫu đẹp',lines:['Cho tôi xem mẫu sáng và sang hơn.','Mẫu nào đang hot và hợp đeo hằng ngày?','Nhìn đẹp là tôi xuống tiền nhanh lắm.']},
    {key:'careful',label:'Cân nhắc kỹ',lines:['Để tôi nghe kỹ công thức tính trước đã.','Tôi muốn biết rõ giá vốn, công và chi phí đổi.','Tính minh bạch giúp tôi yên tâm hơn.']},
    {key:'urgent',label:'Đến nhanh đi gấp',lines:['Tôi đang vội, làm nhanh giúp tôi nhé.','Nếu làm gọn lẹ là tôi chốt ngay.','Tôi cần xong trước khi đi việc khác.']},
    {key:'pawn',label:'Cần xoay tiền',lines:['Tôi cần cầm nhanh nhưng vẫn muốn rõ điều khoản.','Mức lãi này đã gồm phí hết rồi đúng không?','Nếu chuộc sớm thì tính thế nào?']}
  ];
  const STAFF_ARCHETYPES=[
    {key:'sales',label:'Tư vấn mềm',lines:['Em chào anh chị, mình xem mẫu nào ạ?','Để em lấy món ra cho mình xem kỹ hơn.','Em sẽ giải thích rõ giá vốn và công bán.']},
    {key:'cashier',label:'Thu ngân chắc tay',lines:['POS đã sẵn sàng, em chốt tiền cho anh chị.','Để em kiểm tra lại số tiền và in phiếu.','Mình đưa đúng công thức thì thu chi sẽ rất nhanh.']},
    {key:'pawn',label:'Cầm đồ thận trọng',lines:['Em cần kiểm món và điều khoản trước khi giải ngân.','Mình yên tâm, phí cầm đã gộp trong tỷ lệ tổng.','Em sẽ đọc lại kỳ hạn cho mình dễ theo dõi.']},
    {key:'stock',label:'Kho cẩn thận',lines:['Kho đang đủ hàng, em bổ sung SKU ngay.','Em đang rà tồn kho và công nợ chành.','Món này còn hàng, để em chuyển ra quầy.']}
  ];
  function pick(arr,key=0){return arr[(Math.abs(Math.floor(key))||0)%arr.length]}
  function ensureAgentProfile(a,kind='customer'){
    if(kind==='customer' && !a.profile){
      const h=hashStr(a.id||a.name||'cust');
      const persona=pick(CUSTOMER_PERSONAS,h);
      a.profile={persona:persona.key, personaLabel:persona.label, budgetTier:['Phổ thông','Khá','Cao','VIP'][h%4], style:['Gọn gàng','Sang trọng','Trẻ','Truyền thống'][h%4], bargain:(h%100), lines:persona.lines};
    }
    if(kind==='staff' && !a.profile){
      const s=state.staff.find(x=>'staff:'+x.id===a.id)||{};
      let role='sales';
      if(/POS|Thu ngân/i.test(s.v2Role||s.role||''))role='cashier';
      else if(/Cầm/i.test(s.v2Role||s.role||''))role='pawn';
      else if(/Kho|kiểm hàng/i.test(s.v2Role||s.role||''))role='stock';
      const p=STAFF_ARCHETYPES.find(x=>x.key===role)||STAFF_ARCHETYPES[0];
      a.profile={persona:role, personaLabel:p.label, lines:p.lines};
    }
    return a.profile;
  }
  function staffMood(s){const e=s?.energy??100,t=s?.trust??70; if(e<45)return 'Mệt'; if(t<55)return 'Căng'; if(e>82&&t>75)return 'Rất sung'; return 'Ổn định'}
  function customerSpeech(item,a,ev,full=false){
    ensureAgentProfile(a,'customer');
    const prof=a.profile||{};
    const wait=item?Math.max(0,state.clockMinutes-item.arrival):0;
    const waitLine=wait>25?'Tôi đợi cũng khá lâu rồi đó nha.':wait>12?'Nếu mình xử lý nhanh giúp tôi thì tốt quá.':'';
    const marketLine=ev?.type==='sale'?'Bên tiệm khác nói công bên đó mềm hơn một chút.':
      ['buyback','exchangeSame','exchangeCross'].includes(ev?.type)?'Tôi muốn biết phần hao hụt quy tuổi vàng và phí đổi được tính ra sao.':
      ['pawnOpen','pawnDue'].includes(ev?.type)?'Mức này đã là tổng lãi + phí rồi phải không?':'Tôi cần nghe tư vấn rõ để dễ quyết.';
    const base=pick(prof.lines||['Tôi cần được tư vấn kỹ hơn.'], hashStr((item?.id||0)+(a?.name||'')));
    const lines=[base,marketLine,waitLine].filter(Boolean);
    return full?lines.join(' '):lines[0];
  }
  function staffSpeech(a){
    ensureAgentProfile(a,'staff');
    const s=state.staff.find(x=>'staff:'+x.id===a.id)||{};
    const base=pick(a.profile?.lines||['Đang xử lý nghiệp vụ.'], hashStr(a.id||a.name));
    return `${base} Trạng thái hiện tại: ${staffMood(s)}.`;
  }
  function drawBubbleAt(text,p,opts={}){
    if(!text)return;
    ctx.save();
    ctx.font=`${opts.size||10}px system-ui`;
    const max=opts.maxWidth||240;
    let msg=String(text);
    while(ctx.measureText(msg).width>max && msg.length>16) msg=msg.slice(0,-2);
    if(msg!==text) msg=msg.trim()+'…';
    const w=Math.min(max,ctx.measureText(msg).width+18),x=clamp(p.x-w/2,8,metrics().w-w-8),y=p.y-(opts.offsetY||42);
    ctx.fillStyle=opts.bg||'rgba(255,250,238,.95)';
    ctx.strokeStyle=opts.stroke||'rgba(80,62,29,.24)';
    ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(x,y,w,28,9);ctx.fill();ctx.stroke();
    ctx.fillStyle=opts.color||'#2b2418';ctx.textAlign='center';ctx.fillText(msg,x+w/2,y+17);
    ctx.restore();
  }

  function ensureV3(){
    state.v3=state.v3||{};
    const v=state.v3;
    v.player=v.player||{x:470,y:540,targetX:470,targetY:540,path:[]};
    v.camera=Number.isFinite(v.camera)?v.camera:0;
    v.zoom=clamp(Number(v.zoom)||1.20,.86,1.58);
    v.labels=typeof v.labels==='boolean'?v.labels:false;
    v.log=Array.isArray(v.log)?v.log:[];
    v.tutorialSeen=!!v.tutorialSeen;
    v.flowStage=v.flowStage||'idle';
    v.heldItem=!!v.heldItem;
    state.settings=state.settings||{};
    if(typeof state.settings.fx!=='boolean')state.settings.fx=false;
  }

  function log3(text){
    const t=clockText();localLog.unshift({t,text});localLog=localLog.slice(0,30);state.v3.log=(state.v3.log||[]);state.v3.log.unshift({day:state.day,t,text});state.v3.log=state.v3.log.slice(0,80);renderSide();
  }
  function clockText(){const m=Math.max(0,Number(state.clockMinutes)||0);return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(Math.floor(m%60)).padStart(2,'0')}`;}
  function queueItems(){
    const l=state.liveStore||{};if(!Array.isArray(l.schedule))return [];
    return l.schedule.filter(x=>x.index>=state.situationsToday && x.arrival<=state.clockMinutes && !x.penalized);
  }
  function patience(item){const waited=Math.max(0,state.clockMinutes-item.arrival);return clamp(100-waited*.55,0,100);}
  function servedItem(){if(!state.currentEvent||state.currentEvent.done||state.situationsToday<1)return null;return (state.liveStore?.schedule||[]).find(x=>x.index===state.situationsToday-1)||null}
  function currentSchedule(){return servedItem()||queueItems()[0]||null;}

  function resize(){
    if(!canvas)return;const r=canvas.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(640,Math.round(r.width*dpr));canvas.height=Math.max(390,Math.round(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function metrics(){const r=canvas.getBoundingClientRect();const w=r.width,h=r.height,s=Math.min(w/1010,h/660)*state.v3.zoom;return {w,h,s,cx:w*.5,base:h*.69};}
  function rotate(x,y,dir){const cx=WORLD.w/2,cy=WORLD.h/2,dx=x-cx,dy=y-cy;switch((dir%4+4)%4){case 1:return {x:cx-dy,y:cy+dx};case 2:return {x:cx-dx,y:cy-dy};case 3:return {x:cx+dy,y:cy-dx};default:return{x,y}}}
  function unrotate(x,y,dir){return rotate(x,y,(4-dir)%4)}
  function project(x,y,z=0){const m=metrics(),r=rotate(x,y,state.v3.camera),dx=r.x-WORLD.w/2,dy=r.y-WORLD.h/2;return {x:m.cx+(dx-dy)*.68*m.s,y:m.base+(dx+dy)*.34*m.s-z*.88*m.s};}
  function screenToWorld(sx,sy){const m=metrics(),u=(sx-m.cx)/(.68*m.s),v=(sy-m.base)/(.34*m.s),dx=(u+v)/2,dy=(v-u)/2;const r={x:WORLD.w/2+dx,y:WORLD.h/2+dy};const p=unrotate(r.x,r.y,state.v3.camera);return {x:clamp(p.x,35,WORLD.w-35),y:clamp(p.y,35,WORLD.h-35)};}

  function poly(points,fill,stroke='rgba(255,255,255,.08)',lw=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
  function drawBox(o){
    const {x,y,w,d,h}=o;const p000=project(x,y,0),p100=project(x+w,y,0),p010=project(x,y+d,0),p110=project(x+w,y+d,0),p001=project(x,y,h),p101=project(x+w,y,h),p011=project(x,y+d,h),p111=project(x+w,y+d,h);
    const base=o.color||'#423822',top=o.top||shade(base,1.28),side1=o.side1||shade(base,.78),side2=o.side2||shade(base,.62);
    poly([p100,p110,p111,p101],side1);poly([p010,p110,p111,p011],side2);poly([p001,p101,p111,p011],top,'rgba(255,235,170,.12)');
  }
  function shade(hex,f){const m=String(hex).replace('#','');if(m.length!==6)return hex;const n=parseInt(m,16),r=clamp(Math.round(((n>>16)&255)*f),0,255),g=clamp(Math.round(((n>>8)&255)*f),0,255),b=clamp(Math.round((n&255)*f),0,255);return `rgb(${r},${g},${b})`}
  function text3(text,x,y,z,opt={}){const p=project(x,y,z);ctx.save();ctx.font=`${opt.weight||700} ${opt.size||11}px system-ui`;ctx.textAlign=opt.align||'center';ctx.textBaseline='middle';if(opt.bg){const w=ctx.measureText(text).width+12;ctx.fillStyle=opt.bg;ctx.beginPath();ctx.roundRect(p.x-w/2,p.y-10,w,20,8);ctx.fill()}ctx.fillStyle=opt.color||'#f4e6bd';ctx.fillText(text,p.x,p.y);ctx.restore();}
  function drawFloor(){
    const m=metrics();
    const corners=[project(0,0),project(WORLD.w,0),project(WORLD.w,WORLD.h),project(0,WORLD.h)];
    const floorGrad=ctx.createLinearGradient(0,m.h*.15,0,m.h);floorGrad.addColorStop(0,'#d3c39f');floorGrad.addColorStop(.42,'#8c6c43');floorGrad.addColorStop(1,'#2a190c');
    poly(corners,floorGrad,'rgba(240,205,118,.28)',1.4);
    // marble tiles
    ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle='#fff1c7';ctx.lineWidth=.72;
    for(let x=0;x<=WORLD.w;x+=70){const a=project(x,0),b=project(x,WORLD.h);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    for(let y=0;y<=WORLD.h;y+=70){const a=project(0,y),b=project(WORLD.w,y);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    ctx.restore();
    // marble veins / subtle reflection lines
    ctx.save();ctx.globalAlpha=.15;ctx.strokeStyle='#fff8e8';ctx.lineWidth=1;
    [[120,520,420,220],[300,600,700,210],[540,610,900,260],[110,300,450,80]].forEach(v=>{const a=project(v[0],v[1],1),b=project(v[2],v[3],1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2+25,(a.y+b.y)/2-12,b.x,b.y);ctx.stroke()});ctx.restore();
    // gold carpet to make the centre feel premium
    poly([project(165,115,1),project(865,115,1),project(865,510,1),project(165,510,1)],'rgba(92,48,24,.12)','rgba(255,228,158,.24)',1);
    poly([project(210,150,1),project(820,150,1),project(820,470,1),project(210,470,1)],'rgba(255,239,198,.07)','rgba(255,233,174,.14)',1);
    // walls and decorative shell
    drawBox({x:0,y:-24,w:WORLD.w,d:24,h:235,color:'#20160e',top:'#5a4023',side1:'#120d09',side2:'#0d0907'});
    drawBox({x:-24,y:0,w:24,d:WORLD.h,h:235,color:'#26170f',top:'#5d381f',side1:'#170e09',side2:'#100b08'});
    drawBox({x:982,y:0,w:24,d:WORLD.h,h:235,color:'#22150d',top:'#56331e',side1:'#140d08',side2:'#100907'});
    for(let i=0;i<5;i++)drawBox({x:75+i*175,y:-28,w:120,d:7,h:175,color:i===2?'#5b431c':'#3a2d20',top:'#a17a36',side1:'#21170f',side2:'#130d09'});
    text3(storeLabel().toUpperCase(),500,-12,173,{size:24,color:'#ffd976',bg:'rgba(6,5,4,.64)',weight:900});
    text3(`${state.ownerName?`CHỦ: ${String(state.ownerName).toUpperCase()} · `:''}GOLD SHOP SIMULATOR V1.0`,500,-10,136,{size:9,color:'#f1e0bd',weight:700});
    // chandelier / spotlight feel
    ctx.save();
    for(let i=0;i<7;i++){
      const wx=105+i*132,top=project(wx,40,215),floor=project(wx,185+(i%2)*62,0);
      const g=ctx.createLinearGradient(top.x,top.y,floor.x,floor.y);g.addColorStop(0,'rgba(255,226,151,.24)');g.addColorStop(1,'rgba(255,226,151,0)');
      ctx.strokeStyle=g;ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(floor.x,floor.y);ctx.stroke();
      ctx.fillStyle='#ffe6a4';ctx.beginPath();ctx.arc(top.x,top.y,3.8,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    // wall posters / branding frames
    for(let i=0;i<3;i++){
      const x=195+i*210;
      drawBox({x:x,y:-20,w:95,d:4,h:86,color:'#201914',top:'#463525',side1:'#17120f',side2:'#17120f'});
      text3(i===0?'610 / 622 / 625':i===1?'GIÁ VỐN · CÔNG VỐN':'UY TÍN · CHUẨN NGHỀ',x+47,-9,72,{size:7,color:'#f2ddaf',weight:800});
    }
    // entrance rug + glass doors
    const p1=project(830,535),p2=project(995,535),p3=project(995,620),p4=project(830,620);poly([p1,p2,p3,p4],'#5b221d','rgba(241,198,105,.34)',1.2);text3('WELCOME',916,575,2,{size:9,color:'#f8d89a'});
    drawGlassDoor(930,565);
  }
  function drawGlassDoor(x,y){
    const a=project(x-55,y,0),b=project(x+55,y,0),ta=project(x-55,y,145),tb=project(x+55,y,145);poly([ta,tb,b,a],'rgba(123,181,194,.06)','rgba(215,230,225,.38)',1);const mid1=project(x,y,0),mid2=project(x,y,145);ctx.strokeStyle='rgba(232,205,133,.55)';ctx.beginPath();ctx.moveTo(mid1.x,mid1.y);ctx.lineTo(mid2.x,mid2.y);ctx.stroke();
  }
  function drawFurniture(){
    const sorted=[...stationDefs].sort((a,b)=>(a.x+a.y)-(b.x+b.y));
    for(const s of sorted){
      const colors={showcase:'#8b6429',scale:'#454950',pos:'#563817',pawn:'#5a3820',safe:'#2e3339',warehouse:'#4a3520',office:'#4f3d2f',camera:'#30343b'};
      if(s.id==='showcase')drawLuxuryShowcase(s);else drawBox({...s,color:colors[s.id]||'#443a28'});
      if(s.id==='showcase')drawShowcaseJewelry(s);
      if(s.id==='scale')drawScale(s);
      if(s.id==='pos')drawPos(s);
      if(s.id==='safe')drawSafe(s);
      if(s.id==='warehouse')drawShelves(s);
      if(s.id==='pawn')drawPawnDesk(s);
      if(s.id==='office')drawOffice(s);
      if(s.id==='camera')drawCameraStation(s);
      if(state.v3.labels)text3(`${s.icon} ${s.name}`,s.x+s.w/2,s.y+s.d/2,s.h+40,{size:9,bg:'rgba(5,5,4,.72)',color:'#fff0c6'});
      if(selected?.type==='station'&&selected.id===s.id){const p=project(s.approach.x,s.approach.y,2);ctx.strokeStyle='#64e5b0';ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(100,229,176,.12)';ctx.fill()}
    }
    decorDefs.forEach(d=>drawDecorShowcase(d));
    drawJewelryBust(565,365,70,1.0);drawJewelryBust(250,335,70,.9);drawJewelryBust(760,105,82,.85);
    drawPlant(118,510);drawPlant(902,98);drawPlant(720,445);drawPlant(330,455);
    drawLounge(770,490);drawLounge(130,565);
    drawQueueRopes();drawFlowerArrangement(930,315);drawFlowerArrangement(610,120);
  }
  function drawDecorShowcase(s){
    const baseH=32;drawBox({...s,h:baseH,color:'#24160d',top:'#3b2615',side1:'#190f09',side2:'#130b07'});
    const goldA=project(s.x+5,s.y+5,baseH+2),goldB=project(s.x+s.w-5,s.y+5,baseH+2);ctx.save();ctx.strokeStyle='#e7bd5b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(goldA.x,goldA.y);ctx.lineTo(goldB.x,goldB.y);ctx.stroke();ctx.restore();
    const z0=baseH,z1=s.h+12,p1=project(s.x+8,s.y+6,z0),p2=project(s.x+s.w-8,s.y+6,z0),p3=project(s.x+s.w-8,s.y+s.d-6,z0),p4=project(s.x+8,s.y+s.d-6,z0),t1=project(s.x+8,s.y+6,z1),t2=project(s.x+s.w-8,s.y+6,z1),t3=project(s.x+s.w-8,s.y+s.d-6,z1),t4=project(s.x+8,s.y+s.d-6,z1);
    poly([p1,p2,t2,t1],'rgba(168,220,226,.055)','rgba(249,244,222,.40)',1);poly([p2,p3,t3,t2],'rgba(141,206,216,.045)','rgba(249,244,222,.23)',1);poly([t1,t2,t3,t4],'rgba(255,240,202,.07)','rgba(255,227,151,.45)',1);
    const tray=[project(s.x+13,s.y+11,baseH+5),project(s.x+s.w-13,s.y+11,baseH+5),project(s.x+s.w-13,s.y+s.d-11,baseH+5),project(s.x+13,s.y+s.d-11,baseH+5)];poly(tray,'rgba(235,220,187,.62)','rgba(226,184,80,.30)',1);
    for(let i=0;i<8;i++){const px=s.x+22+(i%4)*(s.w-44)/3,py=s.y+20+Math.floor(i/4)*24,p=project(px,py,baseH+10);ctx.save();ctx.shadowColor='rgba(255,205,79,.78)';ctx.shadowBlur=11;ctx.strokeStyle=i%3?'#f1c75d':'#ffe3a0';ctx.lineWidth=1.8;ctx.beginPath();if(i%2)ctx.arc(p.x,p.y,4,0,Math.PI*2);else ctx.ellipse(p.x,p.y,5.5,2.8,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
    if(s.label)text3(s.label,s.x+s.w/2,s.y+s.d/2,s.h+28,{size:7,bg:'rgba(8,6,4,.72)',color:'#f5dda6',weight:900});
  }
  function drawQueueRopes(){
    const pts=[[790,515],[850,515],[910,515]];const scr=pts.map(p=>project(p[0],p[1],0));ctx.save();ctx.strokeStyle='#d6b35c';ctx.lineWidth=2;for(const p of scr){ctx.fillStyle='#d0aa50';ctx.fillRect(p.x-2,p.y-22,4,22);ctx.beginPath();ctx.arc(p.x,p.y-23,4,0,Math.PI*2);ctx.fill()}ctx.strokeStyle='#8f1d19';ctx.lineWidth=3;for(let i=0;i<scr.length-1;i++){ctx.beginPath();ctx.moveTo(scr[i].x,scr[i].y-18);ctx.quadraticCurveTo((scr[i].x+scr[i+1].x)/2,(scr[i].y+scr[i+1].y)/2-10,scr[i+1].x,scr[i+1].y-18);ctx.stroke()}ctx.restore();
  }
  function drawFlowerArrangement(x,y){const p=project(x,y,0);ctx.save();ctx.fillStyle='#b79a58';ctx.beginPath();ctx.ellipse(p.x,p.y-6,8,5,0,0,Math.PI*2);ctx.fill();for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=8+(i%3)*3;ctx.strokeStyle='#4b7e47';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y-10);ctx.lineTo(p.x+Math.cos(a)*r,p.y-24-Math.sin(a)*4);ctx.stroke();ctx.fillStyle=i%2?'#f1e7ce':'#b3262f';ctx.beginPath();ctx.arc(p.x+Math.cos(a)*r,p.y-25-Math.sin(a)*4,2.5,0,Math.PI*2);ctx.fill()}ctx.restore()}
  function drawLuxuryShowcase(s){
    const baseH=34;drawBox({...s,h:baseH,color:'#22150c',top:'#392312',side1:'#180e08',side2:'#120a06'});
    const trim1=project(s.x+5,s.y+6,baseH+2),trim2=project(s.x+s.w-5,s.y+6,baseH+2);ctx.save();ctx.strokeStyle='#edc45f';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(trim1.x,trim1.y);ctx.lineTo(trim2.x,trim2.y);ctx.stroke();ctx.restore();
    const z0=baseH,z1=s.h+18,p1=project(s.x+10,s.y+8,z0),p2=project(s.x+s.w-10,s.y+8,z0),p3=project(s.x+s.w-10,s.y+s.d-8,z0),p4=project(s.x+10,s.y+s.d-8,z0),t1=project(s.x+10,s.y+8,z1),t2=project(s.x+s.w-10,s.y+8,z1),t3=project(s.x+s.w-10,s.y+s.d-8,z1),t4=project(s.x+10,s.y+s.d-8,z1);
    poly([p1,p2,t2,t1],'rgba(145,214,224,.065)','rgba(245,247,233,.42)',1.1);poly([p2,p3,t3,t2],'rgba(130,201,214,.04)','rgba(245,247,233,.27)',1.1);poly([t1,t2,t3,t4],'rgba(255,238,195,.08)','rgba(255,231,161,.45)',1.1);
    const tray=[project(s.x+14,s.y+12,baseH+6),project(s.x+s.w-14,s.y+12,baseH+6),project(s.x+s.w-14,s.y+s.d-12,baseH+6),project(s.x+14,s.y+s.d-12,baseH+6)];poly(tray,'rgba(239,225,194,.66)','rgba(232,192,96,.35)',1);
    const shine=project(s.x+s.w*.65,s.y+10,z1-3);ctx.save();ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(shine.x-30,shine.y+12);ctx.lineTo(shine.x+12,shine.y-16);ctx.stroke();ctx.restore();
  }
  function drawShowcaseJewelry(s){
    const forms=['ring','chain','ring','bangle','earring','ring','chain','bangle'];
    for(let i=0;i<8;i++){
      const x=s.x+30+(i%4)*67,y=s.y+24+Math.floor(i/4)*30,p=project(x,y,46);
      ctx.save();ctx.shadowColor='rgba(255,210,84,.58)';ctx.shadowBlur=10;ctx.strokeStyle=i%3===0?'#f7df8e':'#e3b94e';ctx.fillStyle='rgba(255,217,122,.08)';ctx.lineWidth=2;
      if(forms[i]==='ring'){ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.stroke()}
      else if(forms[i]==='chain'){ctx.beginPath();ctx.ellipse(p.x,p.y,7,3.4,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x-9,p.y+5);ctx.lineTo(p.x+9,p.y+5);ctx.stroke()}
      else if(forms[i]==='bangle'){ctx.beginPath();ctx.ellipse(p.x,p.y,8,4.2,0,0,Math.PI*2);ctx.stroke()}
      else {ctx.beginPath();ctx.arc(p.x-4,p.y,2.2,0,Math.PI*2);ctx.arc(p.x+4,p.y,2.2,0,Math.PI*2);ctx.stroke()}
      if(i%2===0){ctx.fillRect(p.x+6,p.y-7,2,2)}
      ctx.restore()
    }
  }
  function drawJewelryBust(x,y,z=56,scale=1){
    const p=project(x,y,z);ctx.save();ctx.fillStyle='#171310';ctx.strokeStyle='rgba(245,208,108,.42)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(p.x-9*scale,p.y+13*scale);ctx.quadraticCurveTo(p.x-13*scale,p.y-2*scale,p.x-6*scale,p.y-12*scale);ctx.quadraticCurveTo(p.x,p.y-18*scale,p.x+6*scale,p.y-12*scale);ctx.quadraticCurveTo(p.x+13*scale,p.y-2*scale,p.x+9*scale,p.y+13*scale);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#f2c553';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y-1*scale,7*scale,.15*Math.PI,.85*Math.PI);ctx.stroke();ctx.restore();
  }
  function drawScale(s){const p=project(s.x+s.w*.55,s.y+s.d*.5,s.h+9);ctx.save();ctx.shadowColor='rgba(83,255,163,.25)';ctx.shadowBlur=10;ctx.fillStyle='#101418';ctx.beginPath();ctx.roundRect(p.x-27,p.y-10,54,19,5);ctx.fill();ctx.fillStyle='#61e6c0';ctx.font='10px ui-monospace';ctx.textAlign='center';ctx.fillText(currentWeightText()+' chỉ',p.x,p.y+3);ctx.restore();const dish=project(s.x+s.w*.36,s.y+s.d*.53,s.h+12);ctx.fillStyle='#cfd2d5';ctx.beginPath();ctx.ellipse(dish.x,dish.y,14,5,0,0,Math.PI*2);ctx.fill()}
  function currentWeightText(){const e=state.currentEvent;if(!e)return '0.000';const d=e.data||{};const w=d.weight??d.oldWeight??d.collateralWeight;return Number.isFinite(Number(w))?Number(w).toFixed(3):'0.000'}
  function drawPos(s){const p=project(s.x+s.w*.55,s.y+s.d*.46,s.h+18);ctx.save();ctx.shadowColor='rgba(244,201,92,.18)';ctx.shadowBlur=14;ctx.fillStyle='#0e1419';ctx.beginPath();ctx.roundRect(p.x-31,p.y-20,62,36,6);ctx.fill();ctx.strokeStyle='#d9b65e';ctx.lineWidth=1.3;ctx.stroke();ctx.fillStyle='#f2d17a';ctx.font='800 8px system-ui';ctx.textAlign='center';ctx.fillText('THU NGÂN / POS',p.x,p.y-6);ctx.fillStyle='#d6e7ff';ctx.font='9px ui-monospace';ctx.fillText(clockText(),p.x,p.y+7);ctx.restore();const kb=project(s.x+s.w*.55,s.y+s.d*.55,s.h+3);ctx.fillStyle='#d8ceb8';ctx.fillRect(kb.x-21,kb.y-5,42,9)}
  function drawSafe(s){const p=project(s.x+s.w*.5,s.y+s.d*.52,s.h*.58);ctx.fillStyle='#16191c';ctx.beginPath();ctx.roundRect(p.x-22,p.y-30,44,60,6);ctx.fill();ctx.strokeStyle='#a8a693';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*4,p.y+Math.sin(a)*4);ctx.lineTo(p.x+Math.cos(a)*13,p.y+Math.sin(a)*13);ctx.stroke()}}
  function drawShelves(s){for(let i=0;i<3;i++){const a=project(s.x+18,s.y+25+i*30,s.h+10),b=project(s.x+s.w-18,s.y+25+i*30,s.h+10);ctx.strokeStyle='rgba(232,200,107,.48)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();for(let j=0;j<3;j++){const p=project(s.x+35+j*42,s.y+25+i*30,s.h+13);ctx.fillStyle=j%2?'#7a4b22':'#9a6a31';ctx.fillRect(p.x-5,p.y-5,10,8)}}}
  function drawPawnDesk(s){const p=project(s.x+s.w*.5,s.y+s.d*.35,s.h+6);ctx.save();ctx.fillStyle='#eadcbe';ctx.shadowColor='rgba(255,222,154,.18)';ctx.shadowBlur=10;ctx.fillRect(p.x-23,p.y-4,46,8);ctx.strokeStyle='#c49a43';ctx.strokeRect(p.x-23,p.y-4,46,8);ctx.restore();const c1=project(s.x-20,s.y+s.d*.75,0),c2=project(s.x+s.w+20,s.y+s.d*.75,0);drawChair(c1.x,c1.y,'#284638');drawChair(c2.x,c2.y,'#284638')}
  function drawChair(x,y,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x-10,y-16,20,18,5);ctx.fill();ctx.fillRect(x-8,y+1,3,13);ctx.fillRect(x+5,y+1,3,13)}
  function drawOffice(s){const p=project(s.x+s.w*.55,s.y+s.d*.45,s.h+10);ctx.fillStyle='#111820';ctx.fillRect(p.x-22,p.y-15,44,26);ctx.fillStyle='#d5e6ff';ctx.font='7px system-ui';ctx.textAlign='center';ctx.fillText('BUSINESS',p.x,p.y-2)}
  function drawCameraStation(s){const p=project(s.x+s.w*.55,s.y+s.d*.5,s.h+22);ctx.fillStyle='#181a1e';ctx.fillRect(p.x-18,p.y-12,36,22);ctx.fillStyle='#72d5a1';ctx.fillRect(p.x-13,p.y-7,12,7);ctx.fillStyle='#f6c968';ctx.fillRect(p.x+2,p.y-7,12,7)}
  function drawPlant(x,y){const p=project(x,y,0);ctx.fillStyle='#6b4a2b';ctx.beginPath();ctx.ellipse(p.x,p.y-7,12,6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#4d8d55';ctx.lineWidth=4;for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(p.x,p.y-12);ctx.quadraticCurveTo(p.x+(i-2.5)*8,p.y-38-Math.abs(i-2.5)*3,p.x+(i-2.5)*11,p.y-45);ctx.stroke()}}
  function drawLounge(x,y){const p=project(x,y,0);ctx.fillStyle='#3f3028';ctx.beginPath();ctx.roundRect(p.x-42,p.y-22,84,24,8);ctx.fill();ctx.fillStyle='#6b4d3d';ctx.beginPath();ctx.roundRect(p.x-38,p.y-40,76,21,8);ctx.fill()}
  function hashStr(v){let h=2166136261;for(const ch of String(v||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function drawFloorReflection(a,kind='customer'){
    const p=project(a.x,a.y,0),hsh=hashStr(a.id||a.name||kind),c=kind==='staff'?'rgba(230,201,121,.11)':kind==='player'?'rgba(255,220,125,.13)':'rgba(200,178,150,.09)';
    ctx.save();ctx.globalAlpha=.55;ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(p.x,p.y+9,11+(hsh%4),4.5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.12;ctx.fillRect(p.x-1,p.y+10,2,20);ctx.restore();
  }
  function drawPerson(a,kind='customer'){
    ensureAgentProfile(a,kind==='player'?'staff':kind);
    drawFloorReflection(a,kind);
    const base=project(a.x,a.y,0),sc=clamp(metrics().s*1.42,.96,1.72),bob=(a.bob||0)*sc,hsh=hashStr(a.id||a.name||kind),female=(hsh%2)===0;
    const outfit=['#8b3454','#3c6697','#7b653c','#644182','#2f7769','#8c5128','#2f4f82'][hsh%7],skin=['#f0c7a3','#ddb18c','#c98f68','#f4d1b3'][hsh%4],hair=['#241914','#4a2c1f','#171717','#6b442e','#513220'][hsh%5];
    const suit=kind==='player'?'#1b1d22':kind==='staff'?'#252a32':outfit,accent=kind==='player'?'#e2bf58':kind==='staff'?'#d9b45d':'#e8d2b0';
    const y=base.y+bob;
    ctx.save();ctx.globalAlpha=.34;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(base.x,base.y+5,16*sc,6*sc,0,0,Math.PI*2);ctx.fill();ctx.restore();
    // legs and shoes
    ctx.strokeStyle=kind==='customer'?shade(suit,.58):'#1e2126';ctx.lineWidth=6*sc;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(base.x-5*sc,y-28*sc);ctx.lineTo(base.x-7*sc,y-4*sc);ctx.moveTo(base.x+5*sc,y-28*sc);ctx.lineTo(base.x+7*sc,y-4*sc);ctx.stroke();
    ctx.strokeStyle='#08090a';ctx.lineWidth=4.2*sc;ctx.beginPath();ctx.moveTo(base.x-10*sc,y-2*sc);ctx.lineTo(base.x-3*sc,y-2*sc);ctx.moveTo(base.x+4*sc,y-2*sc);ctx.lineTo(base.x+11*sc,y-2*sc);ctx.stroke();
    // torso and jacket
    const bx=base.x,by=y-47*sc;
    ctx.fillStyle=suit;ctx.beginPath();ctx.moveTo(bx-13*sc,by-14*sc);ctx.quadraticCurveTo(bx,by-20*sc,bx+13*sc,by-14*sc);ctx.lineTo(bx+10*sc,by+19*sc);ctx.lineTo(bx-10*sc,by+19*sc);ctx.closePath();ctx.fill();
    ctx.fillStyle=shade(suit,1.1);ctx.beginPath();ctx.moveTo(bx-10*sc,by-10*sc);ctx.lineTo(bx,by+16*sc);ctx.lineTo(bx+10*sc,by-10*sc);ctx.lineTo(bx+5*sc,by-15*sc);ctx.lineTo(bx,by+7*sc);ctx.lineTo(bx-5*sc,by-15*sc);ctx.closePath();ctx.globalAlpha=.14;ctx.fill();ctx.globalAlpha=1;
    if(kind!=='customer'){ctx.fillStyle='#f4f0e8';ctx.beginPath();ctx.moveTo(bx-4*sc,by-14*sc);ctx.lineTo(bx,by+8*sc);ctx.lineTo(bx+4*sc,by-14*sc);ctx.fill();ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(bx-2*sc,by-9*sc);ctx.lineTo(bx+2*sc,by-9*sc);ctx.lineTo(bx+1*sc,by+6*sc);ctx.lineTo(bx-1*sc,by+6*sc);ctx.fill();}
    if(kind==='staff'){ctx.fillStyle='#f2cf71';ctx.fillRect(bx+4*sc,by-6*sc,7.5*sc,3*sc);}
    // arms / hands
    const armSwing=(a.moving||a.target)?Math.sin(performance.now()/160+hsh)*5*sc:0;ctx.strokeStyle=suit;ctx.lineWidth=5*sc;ctx.beginPath();ctx.moveTo(bx-10*sc,by-9*sc);ctx.lineTo(bx-18*sc,by+7*sc+armSwing);ctx.moveTo(bx+10*sc,by-9*sc);ctx.lineTo(bx+18*sc,by+7*sc-armSwing);ctx.stroke();ctx.fillStyle=skin;for(const xx of [bx-19*sc,bx+19*sc]){ctx.beginPath();ctx.arc(xx,by+8*sc,3.1*sc,0,Math.PI*2);ctx.fill()}
    // neck + head
    const hy=y-76*sc;ctx.fillStyle=skin;ctx.fillRect(bx-3*sc,hy+10*sc,6*sc,8*sc);ctx.beginPath();ctx.ellipse(bx,hy,10.4*sc,12*sc,0,0,Math.PI*2);ctx.fill();
    // hair
    ctx.fillStyle=hair;if(female&&kind!=='player'){ctx.beginPath();ctx.arc(bx,hy-4*sc,10.8*sc,Math.PI,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(bx-8.5*sc,hy+6*sc,4.2*sc,10.4*sc,-.18,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(bx+8.5*sc,hy+6*sc,4.2*sc,10.4*sc,.18,0,Math.PI*2);ctx.fill();}
    else{ctx.beginPath();ctx.arc(bx,hy-4*sc,10.6*sc,Math.PI,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(bx-10*sc,hy-2*sc);ctx.quadraticCurveTo(bx-1*sc,hy-15*sc,bx+9*sc,hy-4*sc);ctx.lineTo(bx+6*sc,hy-8*sc);ctx.quadraticCurveTo(bx,hy-16*sc,bx-10*sc,hy-5*sc);ctx.fill()}
    // face
    ctx.fillStyle='#2b211b';ctx.beginPath();ctx.arc(bx-3.2*sc,hy+.2*sc,1.05*sc,0,Math.PI*2);ctx.arc(bx+3.2*sc,hy+.2*sc,1.05*sc,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9b5a50';ctx.lineWidth=.9*sc;ctx.beginPath();ctx.arc(bx,hy+4*sc,3*sc,.2*Math.PI,.8*Math.PI);ctx.stroke();
    // accessory / prop
    if(kind==='player'){ctx.strokeStyle='#ffe7a0';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(bx,hy,16*sc,0,Math.PI*2);ctx.stroke();if(state.v3.heldItem){ctx.strokeStyle='#ffd969';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(bx+21*sc,by+2*sc,5.5*sc,0,Math.PI*2);ctx.stroke();}}
    if(kind==='customer' && a.profile?.budgetTier==='VIP'){ctx.strokeStyle='rgba(255,220,135,.95)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(bx,hy,14.2*sc,0,Math.PI*2);ctx.stroke();}
    if(kind==='customer'){const bagX=bx+(female?16:-16)*sc,bagY=by+15*sc;ctx.fillStyle=female?'#4a221f':'#302b28';ctx.beginPath();ctx.roundRect(bagX-5*sc,bagY-4*sc,10*sc,9*sc,2*sc);ctx.fill();ctx.strokeStyle='#c69a45';ctx.lineWidth=1;ctx.beginPath();ctx.arc(bagX,bagY-4*sc,4*sc,Math.PI,Math.PI*2);ctx.stroke();}
    if(kind==='staff'){ctx.fillStyle='#f3cf71';ctx.beginPath();ctx.arc(bx+7*sc,by-2*sc,1.8*sc,0,Math.PI*2);ctx.fill();}
    if(kind==='customer'){
      const item=(state.liveStore?.schedule||[]).find(x=>'cust:'+x.id===a.id);
      if(item){const p=project(a.x,a.y,116);text3(needIcon(item.type),a.x,a.y,116,{size:10,bg:'rgba(19,14,8,.82)',color:'#ffe19a',weight:900});}
    }
    if(state.v3.labels&&a.name)text3(a.name,a.x,a.y,101,{size:9,bg:'rgba(4,4,3,.72)',color:kind==='player'?'#ffe59b':kind==='staff'?'#f8e3a5':'#fff'});
  }
  function drawAgents(){
    const list=[];
    const pl=state.v3.player;list.push({a:{...pl,name:'BẠN',bob:pl.moving?Math.sin(performance.now()/95)*2:0},kind:'player',depth:pl.x+pl.y});
    for(const a of agents.values())list.push({a,kind:a.kind,depth:a.x+a.y});
    list.sort((a,b)=>a.depth-b.depth);list.forEach(x=>drawPerson(x.a,x.kind));
    const q=currentSchedule();if(q){const a=agents.get('cust:'+q.id);if(a){const p=project(a.x,a.y,94);drawSpeech(q,a,p)}}
    const amb=state.v3.ambientBubble; if(amb && amb.until>performance.now()){const aa=agents.get(amb.id); if(aa){drawBubbleAt(amb.text,project(aa.x,aa.y,94),{bg:'rgba(247,240,220,.96)',stroke:'rgba(109,84,27,.18)',offsetY:68,maxWidth:180})}}
  }
  function drawSpeech(item,a,p){
    const ev=state.dayQueue?.[item.index];
    drawBubbleAt(customerSpeech(item,a,ev,false),p,{bg:'rgba(255,250,238,.96)',stroke:'rgba(80,62,29,.22)',offsetY:42,maxWidth:280});
  }


  function renderScene(){
    if(!ctx||!canvas)return;const m=metrics();ctx.clearRect(0,0,m.w,m.h);
    const sky=ctx.createLinearGradient(0,0,0,m.h);sky.addColorStop(0,'#5c3c19');sky.addColorStop(.30,'#2b190b');sky.addColorStop(1,'#080504');ctx.fillStyle=sky;ctx.fillRect(0,0,m.w,m.h);
    // soft showroom glow
    const glow=ctx.createRadialGradient(m.w*.55,m.h*.28,10,m.w*.55,m.h*.28,m.w*.55);glow.addColorStop(0,'rgba(255,220,138,.24)');glow.addColorStop(1,'rgba(255,207,101,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,m.w,m.h);
    drawFloor();drawFurniture();drawAgents();drawTargetMarker();
    ctx.save();const gloss=ctx.createLinearGradient(0,m.h*.55,0,m.h);gloss.addColorStop(0,'rgba(255,255,255,0)');gloss.addColorStop(1,'rgba(255,215,140,.035)');ctx.fillStyle=gloss;ctx.fillRect(0,m.h*.48,m.w,m.h*.52);ctx.restore();
    const t=Number(state.clockMinutes)||480;let alpha=0,tint='3,9,18';if(t<570){alpha=clamp((570-t)/100*.07,0,.07);tint='255,174,83'}else if(t>1020){alpha=clamp((t-1020)/180*.30,0,.30);tint='3,9,18'}if(alpha>0){ctx.fillStyle=`rgba(${tint},${alpha})`;ctx.fillRect(0,0,m.w,m.h)}
  }
  function drawTargetMarker(){const p=state.v3.player;if(!p.path?.length)return;const t=p.path[p.path.length-1],s=project(t.x,t.y,2);ctx.strokeStyle='rgba(52,211,153,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,10+Math.sin(performance.now()/180)*3,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(52,211,153,.18)';ctx.fill()}

  function pointInRect(p,r,pad=0){return p.x>=r.x-pad&&p.x<=r.x+r.w+pad&&p.y>=r.y-pad&&p.y<=r.y+r.h+pad}
  function isBlocked(x,y){if(x<20||y<20||x>WORLD.w-20||y>WORLD.h-20)return true;return obstacles.some(o=>pointInRect({x,y},o,5))}
  function findPath(sx,sy,gx,gy){
    const cell=28,cols=Math.ceil(WORLD.w/cell),rows=Math.ceil(WORLD.h/cell),toCell=(x,y)=>({c:clamp(Math.floor(x/cell),0,cols-1),r:clamp(Math.floor(y/cell),0,rows-1)}),toWorld=(c,r)=>({x:c*cell+cell/2,y:r*cell+cell/2});
    const S=toCell(sx,sy),G=toCell(gx,gy),key=(c,r)=>c+','+r,open=[{...S,g:0,f:0}],came=new Map(),best=new Map([[key(S.c,S.r),0]]);const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    let found=null,guard=0;while(open.length&&guard++<5000){open.sort((a,b)=>a.f-b.f);const n=open.shift();if(n.c===G.c&&n.r===G.r){found=n;break}for(const [dc,dr] of dirs){const c=n.c+dc,r=n.r+dr;if(c<0||r<0||c>=cols||r>=rows)continue;const w=toWorld(c,r);if(isBlocked(w.x,w.y))continue;const ng=n.g+(dc&&dr?1.414:1),k=key(c,r);if(ng>=(best.get(k)??Infinity))continue;best.set(k,ng);came.set(k,{c:n.c,r:n.r});const h=Math.hypot(G.c-c,G.r-r);open.push({c,r,g:ng,f:ng+h})}}
    if(!found){return [{x:gx,y:gy}]}
    const cells=[];let cur={c:found.c,r:found.r};while(!(cur.c===S.c&&cur.r===S.r)){cells.push(cur);cur=came.get(key(cur.c,cur.r));if(!cur)break}cells.reverse();const pts=cells.map(z=>toWorld(z.c,z.r));pts.push({x:gx,y:gy});return pts;
  }
  function movePlayerTo(x,y,onArrive=null){
    if(isBlocked(x,y)){const st=stationDefs.find(s=>pointInRect({x,y},s,8));if(st){x=st.approach.x;y=st.approach.y}else{log3('Điểm tap đang bị vật thể chặn.');return}}
    const p=state.v3.player;p.path=findPath(p.x,p.y,x,y);p.onArrive=onArrive;p.moving=true;$('#v3PathStatus').textContent='Đang đi tới điểm đã chọn…';
  }
  function moveEntity(a,target,dt,speed=70){const dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);if(d<2){a.x=target.x;a.y=target.y;return true}const step=Math.min(d,speed*dt);a.x+=dx/d*step;a.y+=dy/d*step;a.bob=Math.sin(performance.now()/120)*1.5;return false}
  function updatePlayer(dt){const p=state.v3.player;if(!p.path?.length){p.moving=false;return}const t=p.path[0];if(moveEntity(p,t,dt,145)){p.path.shift();if(!p.path.length){p.moving=false;$('#v3PathStatus').textContent='Đã tới nơi';const cb=p.onArrive;p.onArrive=null;if(typeof cb==='function')cb()}}}

  function syncAgents(dt){
    if(!state.started)return;
    const waiting=queueItems(),served=servedItem(),all=served?[served,...waiting.filter(x=>x.id!==served.id)]:waiting;
    const activeIds=new Set();
    all.slice(0,9).filter(item=>PUBLIC_TYPES.has(item.type)).forEach((item,i)=>{
      const id='cust:'+item.id;activeIds.add(id);let a=agents.get(id);
      if(!a){a={id,kind:'customer',name:item.name,x:door.x+Math.random()*15,y:door.y+Math.random()*12,target:null,eventIndex:item.index,bob:0,phase:'enter'};ensureAgentProfile(a,'customer');agents.set(id,a);log3(`${item.name} bước vào tiệm: ${item.title}.`)}
      let target;
      if(served&&item.id===served.id){
        const st=state.v3.flowStage;
        target=st==='scale'?{x:520,y:315}:st==='pawn'?{x:840,y:340}:st==='pos'||st==='settlement'?{x:700,y:305}:st==='showcase'?{x:320,y:310}:(eventTargets[item.type]||{x:520,y:340});
        a.phase='service';
      }else{
        const offset=served?Math.max(0,i-1):i;
        const waited=Math.max(0,state.clockMinutes-item.arrival);
        if(waited>18 || offset>4){ target=waitSpots[offset%waitSpots.length]; a.phase='queue'; }
        else {
          const spot=browseSpots[(hashStr(item.id)+Math.floor((state.clockMinutes-item.arrival)/6))%browseSpots.length];
          const sway=(hashStr(item.id)%17)-8; target={x:spot.x+sway,y:spot.y+(hashStr(item.name)%13)-6}; a.phase=spot.zone;
        }
      }
      a.target=target;moveEntity(a,target,dt,a.phase==='service'?70:48);
    });
    for(const [id,a] of agents){if(a.kind==='customer'&&!activeIds.has(id)){a.phase='leave';if(moveEntity(a,door,dt,92)){agents.delete(id)}}}
    state.staff.forEach((s,i)=>{
      const id='staff:'+s.id;activeIds.add(id);let a=agents.get(id);
      if(!a){a={id,kind:'staff',name:s.name,x:500+i*20,y:520,target:null,bob:0,phase:'idle'};ensureAgentProfile(a,'staff');agents.set(id,a)}
      let target=staffTargets[s.v2Role]||{x:410+i*60,y:380};
      if(served&&state.currentEvent&&!state.currentEvent.done){
        const need={sale:'Tư vấn bán hàng',buyback:'Tư vấn bán hàng',exchangeSame:'Tư vấn bán hàng',exchangeCross:'Tư vấn bán hàng',service:'Tư vấn bán hàng',lostCustomer:'Tư vấn bán hàng',pawnOpen:'Cầm đồ',pawnDue:'Cầm đồ',audit:'Thu ngân / POS',staffError:'Thu ngân / POS',priceShock:'Thu ngân / POS',supplier:'Kho / kiểm hàng',chanh:'Kho / kiểm hàng'}[state.currentEvent.type];
        if(!need||need===s.v2Role){const cust=agents.get('cust:'+served.id);if(cust)target={x:clamp(cust.x-44-i*6,55,940),y:clamp(cust.y+28+i*5,55,560)};a.phase='assist'}else a.phase='station';
      }else{
        a.phase='station';target={x:target.x+Math.sin(performance.now()/3500+i)*18,y:target.y+Math.cos(performance.now()/3100+i)*12};
      }
      moveEntity(a,target,dt,a.phase==='assist'?44:34);
    });
  }


  function hitStation(p){return stationDefs.find(s=>pointInRect(p,s,6))||null}
  function hitAgent(p){let best=null,bd=Infinity;for(const a of agents.values()){const d=Math.hypot(a.x-p.x,a.y-p.y);if(d<42&&d<bd){best=a;bd=d}}return best}
  function onCanvasPointer(e){
    if(!state.started){D.showView('setup');return}const rect=canvas.getBoundingClientRect(),p=screenToWorld(e.clientX-rect.left,e.clientY-rect.top);const agent=hitAgent(p);if(agent){selectAgent(agent);return}const station=hitStation(p);if(station){selectStation(station);movePlayerTo(station.approach.x,station.approach.y,()=>{selected={type:'station',id:station.id};renderSide();log3(`Đã tới ${station.name}.`) });return}selected={type:'floor',x:p.x,y:p.y};renderSide();movePlayerTo(p.x,p.y)}
  function selectStation(s){selected={type:'station',id:s.id};renderSide();}
  function selectAgent(a){selected={type:'agent',id:a.id};renderSide();movePlayerTo(clamp(a.x-38,40,960),clamp(a.y+30,40,580),()=>{renderSide();showSpeechForAgent(a)})}
  function showSpeechForAgent(a){const el=$('#v3SpeechBubble'); if(a.kind==='staff'){const msg=staffSpeech(a);el.textContent=msg;el.classList.remove('hidden');clearTimeout(showSpeechForAgent.t);showSpeechForAgent.t=setTimeout(()=>el.classList.add('hidden'),5500);if(state.settings.voice&&'speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.lang='vi-VN';u.rate=.98;speechSynthesis.speak(u)}return;} if(a.kind!=='customer')return;const item=(state.liveStore?.schedule||[]).find(x=>'cust:'+x.id===a.id),ev=item?state.dayQueue?.[item.index]:null;if(!item)return;const msg=customerSpeech(item,a,ev,true);el.textContent=msg;el.classList.remove('hidden');clearTimeout(showSpeechForAgent.t);showSpeechForAgent.t=setTimeout(()=>el.classList.add('hidden'),6800);if(state.settings.voice&&'speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.lang='vi-VN';u.rate=.98;speechSynthesis.speak(u)}}

  function interactionHtml(){
    if(!selected)return {title:'Chọn một vị trí trong tiệm',body:'<div class="v3-empty">Tap khách hoặc vật thể trong cửa hàng.</div>',actions:''};
    if(selected.type==='floor')return {title:'Điểm trên sàn',body:`<div class="v3-object-card"><div class="v3-object-icon">👣</div><div><h4>Di chuyển tự do</h4><p>Nhân vật đang tìm đường tới vị trí bạn đã tap.</p><div class="v3-object-meta"><span>x ${Math.round(selected.x)}</span><span>y ${Math.round(selected.y)}</span></div></div></div>`,actions:''};
    if(selected.type==='station'){
      const s=stationDefs.find(x=>x.id===selected.id);if(!s)return {title:'Điểm tương tác',body:'',actions:''};let extra='';
      if(s.id==='scale'){const e=state.currentEvent,d=e?.data||{},w=d.weight??d.oldWeight??d.collateralWeight;extra=`<div class="v3-scale-readout">${Number.isFinite(Number(w))?Number(w).toFixed(3):'0.000'} chỉ</div><small class="muted">${e?'Đang đọc tình huống: '+esc(e.title):'Chưa có giao dịch trên cân.'}</small>`}
      if(s.id==='safe')extra=`<div class="v3-ok">Tiền mặt ${short(state.cash)} · quỹ cầm ${short(state.pawnFund)} · nợ NH ${short(state.bankDebt)}</div>`;
      if(s.id==='warehouse')extra=`<div class="v3-ok">${state.inventoryItems?.filter(x=>x.status==='in_stock').length||0} SKU đang tồn · ${state.suppliers?.length||0} nguồn/chành.</div>`;
      let flow='';const st=state.v3.flowStage,e=state.currentEvent;
      if(e&&!e.done){
        if(s.id==='showcase'&&st==='showcase')flow='<button class="btn gold" data-v3-action="progress-showcase" type="button">💍 LẤY MÓN / TƯ VẤN</button>';
        if(s.id==='scale'&&st==='scale')flow='<button class="btn gold" data-v3-action="progress-scale" type="button">⚖ ĐẶT LÊN CÂN & KIỂM</button>';
        if(s.id==='pawn'&&st==='pawn')flow='<button class="btn gold" data-v3-action="progress-pawn" type="button">🤝 ĐỊNH GIÁ / LẬP HỢP ĐỒ</button>';
        if(s.id==='pos'&&st==='pos')flow='<button class="btn gold" data-v3-action="open-pos" type="button">🧮 MÁY TÍNH + THU / CHI</button>';
      }
      const actions=`${flow}<button class="btn primary" data-v3-action="open-view" data-view="${s.view}" type="button">MỞ ${esc(s.name.toUpperCase())}</button>${s.id==='scale'?'<button class="btn ghost" data-v3-action="weigh" type="button">⚖ XEM SỐ CÂN</button>':''}`;
      return {title:s.name,body:`<div class="v3-object-card"><div class="v3-object-icon">${s.icon}</div><div><h4>${esc(s.name)}</h4><p>${esc(s.desc)}</p>${extra}</div></div>`,actions};
    }
    if(selected.type==='agent'){
      const a=agents.get(selected.id);if(!a)return {title:'Nhân vật',body:'',actions:''};
      if(a.kind==='staff'){
        const s=state.staff.find(x=>'staff:'+x.id===a.id);
        ensureAgentProfile(a,'staff');
        return {title:`Nhân viên ${a.name}`,body:`<div class="v3-object-card"><div class="v3-object-icon">🧑‍💼</div><div><h4>${esc(a.name)}</h4><p>${esc(s?.v2Role||s?.role||'Nhân viên')} · kỹ năng ${s?.skill||0}/100 · năng lượng ${Math.round(s?.energy||0)}%</p><div class="v3-object-meta"><span>${esc(a.profile?.personaLabel||'Nhân sự')}</span><span>Tâm trạng ${staffMood(s)}</span></div></div></div>`,actions:'<button class="btn ghost" data-v3-action="management" type="button">QUẢN LÝ NHÂN VIÊN</button>'}
      }
      const item=(state.liveStore?.schedule||[]).find(x=>'cust:'+x.id===a.id),ev=item?state.dayQueue?.[item.index]:null;const isNext=item&&!state.currentEvent?.done&&!state.currentEvent&&queueItems()[0]?.id===item.id;const beingServed=item&&servedItem()?.id===item.id;ensureAgentProfile(a,'customer');
      return {title:a.name,body:`<div class="v3-object-card"><div class="v3-object-icon">${item?.avatar||'👤'}</div><div><h4>${esc(a.name)}</h4><p>${esc(customerSpeech(item,a,ev,true)||ev?.desc||item?.title||'Khách đang tham quan cửa hàng.')}</p><div class="v3-object-meta"><span>${esc(a.profile?.personaLabel||item?.title||'Khách')}</span><span>Kiên nhẫn ${Math.round(item?patience(item):100)}%</span><span>${esc(a.profile?.budgetTier||'')}</span></div></div></div>`,actions:`<button class="btn ghost" data-v3-action="speak-customer" type="button">🔊 NGHE YÊU CẦU</button>${beingServed?'<button class="btn ghost" disabled type="button">ĐANG PHỤC VỤ</button>':isNext?'<button class="btn primary" data-v3-action="serve-customer" type="button">PHỤC VỤ KHÁCH NÀY</button>':'<button class="btn ghost" disabled type="button">ĐANG CHỜ TỚI LƯỢT</button>'}`};
    }
    return {title:'Tương tác',body:'',actions:''};
  }

  function renderSide(){
    if(!$('#view-store3d'))return;
    $('#v3Clock').textContent=clockText();$('#v3Cash').textContent=short(state.cash);$('#v3Stock').textContent=`${state.inventoryItems?.filter(x=>x.status==='in_stock').length||0} SKU trong kho`;$('#v3StaffCount').textContent=`${state.staff?.length||0} nhân viên`;const q=queueItems();$('#v3CustomerCount').textContent=String(q.filter(x=>PUBLIC_TYPES.has(x.type)).length);
    const running=!!state.liveStore?.running;$('#v3OpenBadge').textContent=running?`ĐANG CHẠY x${state.liveStore.speed||1}`:'TẠM DỪNG';$('#v3OpenBadge').className='v3-open-badge '+(running?'running':'paused');$('#v3StoreTitle').textContent=state.started?`${storeLabel()} · ${state.tier?.name||'Luxury Store'} · ${state.location?.name||''}`:'TIỆM VÀNG CỦA BẠN';$('#v3LabelsBtn').textContent=state.v3.labels?'🏷 Nhãn: Bật':'🏷 Nhãn: Tắt';
    $$('.v3-speed').forEach(b=>b.classList.toggle('active',Number(b.dataset.v3Speed)===(state.liveStore?.speed||1)));
    const data=interactionHtml();$('#v3InteractTitle').textContent=data.title;$('#v3InteractBody').innerHTML=data.body;$('#v3InteractActions').innerHTML=data.actions;let dist='—';if(selected?.type==='station'){const s=stationDefs.find(x=>x.id===selected.id);dist=Math.round(Math.hypot(state.v3.player.x-s.approach.x,state.v3.player.y-s.approach.y))+' px'}else if(selected?.type==='agent'){const a=agents.get(selected.id);if(a)dist=Math.round(Math.hypot(state.v3.player.x-a.x,state.v3.player.y-a.y))+' px'}$('#v3Distance').textContent=dist;
    renderQueue(q);renderWorkflow();renderStaffStrip();renderLog();
  }
  function avatarHtml(name,id){const h=hashStr(id||name||'x'),tone=h%6,initial=String(name||'?').trim().split(/\s+/).slice(-1)[0].slice(0,1).toUpperCase();return `<span class="v5-avatar tone-${tone}">${esc(initial)}</span>`}
  function renderQueue(q){const el=$('#v3Queue');if(!el)return;el.innerHTML=q.length?q.slice(0,6).map((x,i)=>{const a=agents.get('cust:'+x.id);const persona=a?.profile?.personaLabel||x.title;return `<div class="v3-q"><div class="face">${PUBLIC_TYPES.has(x.type)?avatarHtml(x.name,x.id):'⚙️'}</div><div><strong>${esc(x.name)}${PUBLIC_TYPES.has(x.type)?'':' · nội bộ'}</strong><small>${esc(persona)} · ${esc(x.title)}</small></div><b>${PUBLIC_TYPES.has(x.type)?(i?'#'+(i+1):Math.round(patience(x))+'%'):'TASK'}</b></div>`}).join(''):'<div class="v3-empty">Chưa có khách tới quầy.</div>'}
  function renderWorkflow(){const e=state.currentEvent;const steps=e?[['Gặp khách','Tap khách hoặc Phục vụ'],[e.type==='pawnOpen'||e.type==='pawnDue'?'Bàn cầm đồ':(['buyback','exchangeSame','exchangeCross'].includes(e.type)?'Cân & kiểm vàng':'Tủ trưng bày'),'Xử lý vật phẩm / nhu cầu'],['Máy tính / POS','Tính công thức và thu/chi'],['Hoàn tất','Phiếu + sổ + CRM']]:[['Đón khách','Chạy thời gian để khách vào'],['Tiếp cận','Tap khách để đi tới'],['Nghiệp vụ','Tap đúng khu xử lý'],['Thanh toán','POS và sổ kép']];const st=state.v3.flowStage||'idle';const idx=st==='customer'?0:['showcase','scale','pawn'].includes(st)?1:st==='pos'||st==='settlement'?2:st==='done'?3:0;$('#v3Workflow').innerHTML=steps.map((row,i)=>`<div class="v3-step ${e&&!e.done&&i===idx?'active':''} ${(e?.done||i<idx)?'done':''}"><i>${i+1}</i><div><strong>${row[0]}</strong><small>${row[1]}</small></div></div>`).join('')}
  function renderStaffStrip(){const el=$('#v3StaffStrip');if(!el)return;el.innerHTML=(state.staff||[]).map(s=>`<div class="v3-staff-card"><strong>🧑‍💼 ${esc(s.name)} · ${esc(s.v2Role||s.role)}</strong><small>Kỹ năng ${s.skill}/100 · tin cậy ${s.trust}/100 · ${staffMood(s)}</small><div class="v3-energy-mini"><i style="width:${clamp(s.energy||100,0,100)}%"></i></div></div>`).join('');const avg=state.staff?.length?state.staff.reduce((a,s)=>a+(s.energy||100),0)/state.staff.length:100;$('#v3StaffMood').textContent=avg<60?'Đội ngũ đang mệt':avg<80?'Nhịp ca ổn định':'Đội ngũ sung sức'}
  function renderLog(){const el=$('#v3Log');if(!el)return;const arr=localLog.length?localLog:(state.v3.log||[]).slice(0,10).map(x=>({t:x.t,text:x.text}));el.innerHTML=arr.length?arr.map(x=>`<div class="v3-log-row"><time>${esc(x.t)}</time><span>${esc(x.text)}</span></div>`).join(''):'<div class="v3-empty">Chưa có hoạt động 3D.</div>'}

  function stageForEvent(e){if(!e)return'idle';if(['buyback','exchangeSame','exchangeCross'].includes(e.type))return'scale';if(['pawnOpen','pawnDue'].includes(e.type))return'pawn';if(['sale','service','lostCustomer'].includes(e.type))return'showcase';if(['audit','staffError','priceShock'].includes(e.type))return'pos';if(['supplier','chanh','info'].includes(e.type))return'showcase';return'showcase'}
  function serveNext(){
    if(!state.started){D.showView('setup');return}if(state.currentEvent&&!state.currentEvent.done){state.v3.flowStage=stageForEvent(state.currentEvent);renderSide();return}const q=queueItems();if(!q.length){log3('Chưa có khách tới lượt. Hãy chạy ca thêm.');return}const next=q[0];D.nextSituation();const need={sale:'Tư vấn bán hàng',buyback:'Tư vấn bán hàng',exchangeSame:'Tư vấn bán hàng',exchangeCross:'Tư vấn bán hàng',service:'Tư vấn bán hàng',lostCustomer:'Tư vấn bán hàng',pawnOpen:'Cầm đồ',pawnDue:'Cầm đồ',audit:'Thu ngân / POS',staffError:'Thu ngân / POS',priceShock:'Thu ngân / POS',supplier:'Kho / kiểm hàng',chanh:'Kho / kiểm hàng'}[state.currentEvent?.type];const worker=(state.staff||[]).filter(x=>!need||x.v2Role===need).sort((a,b)=>(b.energy||0)-(a.energy||0))[0];if(worker){worker.energy=clamp((worker.energy||100)-1.8,0,100);worker.shiftHandled=(worker.shiftHandled||0)+1}state.v3.flowStage=stageForEvent(state.currentEvent);state.v3.heldItem=false;log3(`Bắt đầu phục vụ ${next.name}: ${next.title}. Hãy đi tới khu nghiệp vụ được tô trong luồng.`);renderSide();D.save(true);
  }
  function progressFlow(kind){const e=state.currentEvent;if(!e||e.done){log3('Không có giao dịch đang xử lý.');return}if(kind==='showcase'){state.v3.heldItem=true;state.v3.flowStage='pos';log3(`Đã lấy món / tư vấn cho ${e.customer?.name||'khách'}. Tiếp theo tới POS.`)}if(kind==='scale'){state.v3.heldItem=true;weighCurrent();state.v3.flowStage='pos';log3('Đã cân và kiểm vàng. Tiếp theo tới POS để tính tiền.')}if(kind==='pawn'){state.v3.flowStage='pos';log3('Đã định giá tài sản cầm. Tiếp theo tới POS để tính khoản thu/chi.')}renderSide();D.save(true)}
  function openPosFlow(){if(window.__GOLD_V45__?.canCheckout&&!window.__GOLD_V45__.canCheckout(state.currentEvent)){window.__GOLD_V45__.promptNegotiation?.();return;}state.v3.flowStage='settlement';(window.__GOLD_UI__?.open||D.showView)('shop');log3('Mở máy tính quầy và POS ngay trong cửa hàng.');D.save(true)}
  function openSelectedView(view){(window.__GOLD_UI__?.open||D.showView)(view);log3(`Mở nghiệp vụ trong cửa hàng: ${view}.`)}
  function weighCurrent(){const e=state.currentEvent;if(!e){log3('Chưa có giao dịch để đặt lên cân.');return}const w=e.data?.weight??e.data?.oldWeight??e.data?.collateralWeight;if(Number.isFinite(Number(w)))log3(`Cân hiển thị ${Number(w).toFixed(3)} chỉ cho ${e.title}.`);else log3(`Giao dịch ${e.title} không có trọng lượng cần cân.`);renderSide()}
  function speakCustomer(){const a=selected?.type==='agent'?agents.get(selected.id):null;if(a)showSpeechForAgent(a)}
  function briefing(){const q=queueItems();const text=`${storeLabel()}, ngày ${state.day}, ${clockText()}. Tiệm có ${q.length} khách đang chờ, ${state.staff?.length||0} nhân viên, ${state.inventoryItems?.filter(x=>x.status==='in_stock').length||0} món trong kho. Tiền mặt ${short(state.cash)}. Tap xuống sàn để di chuyển, tap khách để nghe nhu cầu và tap quầy để xử lý nghiệp vụ trong một màn chơi duy nhất.`;if(state.settings.voice&&'speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='vi-VN';u.rate=.96;speechSynthesis.speak(u)}log3('Đã đọc briefing ca làm.')}

  function updateAmbient(dt){
    if(!state.started || !state.liveStore?.running)return;
    ambientCooldown-=dt*(state.liveStore?.speed||1);
    if(ambientCooldown>0)return;
    ambientCooldown=7+Math.random()*7;
    const pool=[...agents.values()].filter(a=>a.kind==='customer'||a.kind==='staff');
    if(!pool.length)return;
    const agent=pool[Math.floor(Math.random()*pool.length)];
    let text='';
    if(agent.kind==='staff') text=staffSpeech(agent);
    else { const item=(state.liveStore?.schedule||[]).find(x=>'cust:'+x.id===agent.id); const ev=item?state.dayQueue?.[item.index]:null; text=customerSpeech(item,agent,ev,false); }
    if(!text)return;
    state.v3.ambientBubble={id:agent.id,text,until:performance.now()+4200};
    if(Math.random()<0.45)log3(`${agent.name}: ${text}`);
  }

  function bind(){
    canvas=$('#v3Canvas');ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;resize();window.addEventListener('resize',resize);canvas.addEventListener('pointerdown',onCanvasPointer);
    $('#v3PlayBtn')?.addEventListener('click',()=>{if(!state.started){D.showView('setup');return}state.liveStore.running=true;log3('Đã chạy ca 3D.');renderSide()});
    $('#v3PauseBtn')?.addEventListener('click',()=>{state.liveStore.running=false;log3('Đã tạm dừng ca 3D.');renderSide()});
    $$('.v3-speed').forEach(b=>b.addEventListener('click',()=>{state.liveStore.speed=Number(b.dataset.v3Speed)||1;log3(`Đổi tốc độ x${state.liveStore.speed}.`);renderSide()}));
    $('#v3CameraBtn')?.addEventListener('click',()=>{state.v3.camera=(state.v3.camera+1)%4;log3('Đã xoay camera.');D.save(true);renderSide()});
    $('#v3ZoomIn')?.addEventListener('click',()=>{state.v3.zoom=clamp(state.v3.zoom+.08,.72,1.35);D.save(true)});$('#v3ZoomOut')?.addEventListener('click',()=>{state.v3.zoom=clamp(state.v3.zoom-.08,.72,1.35);D.save(true)});
    $('#v3LabelsBtn')?.addEventListener('click',()=>{state.v3.labels=!state.v3.labels;D.save(true);renderSide()});
    $('#v3CenterPlayer')?.addEventListener('click',()=>{selected={type:'floor',x:470,y:540};movePlayerTo(470,540);renderSide()});
    $('#v3BriefBtn')?.addEventListener('click',briefing);$('#v3ServeNext')?.addEventListener('click',serveNext);$('#v3ClearLog')?.addEventListener('click',()=>{localLog=[];renderLog()});
    $('#v3InteractActions')?.addEventListener('click',e=>{const b=e.target.closest('[data-v3-action]');if(!b)return;const a=b.dataset.v3Action;if(a==='open-view')openSelectedView(b.dataset.view);if(a==='weigh')weighCurrent();if(a==='management')openSelectedView('management');if(a==='speak-customer')speakCustomer();if(a==='serve-customer')serveNext();if(a==='progress-showcase')progressFlow('showcase');if(a==='progress-scale')progressFlow('scale');if(a==='progress-pawn')progressFlow('pawn');if(a==='open-pos')openPosFlow()});
    document.querySelector('[data-view="store3d"]')?.addEventListener('click',()=>setTimeout(()=>{resize();renderSide()},0));
    $('#startGameBtn')?.addEventListener('click',()=>setTimeout(()=>{if(state.started){state.liveStore.running=true;state.v3.player={x:470,y:540,targetX:470,targetY:540,path:[]};D.showView('store3d');log3('Khai trương cửa hàng 3D. Tap sàn để bắt đầu.');renderSide();D.save(true)}},50));
  }

  function update(dt){if(!state.started)return;if(state.currentEvent?.done&&state.v3.flowStage!=='done'){state.v3.flowStage='done';state.v3.heldItem=false}updatePlayer(dt);syncAgents(dt);updateAmbient(dt)}
  function frame(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;update(dt);renderScene();if(Math.floor(ts/250)!==Math.floor((ts-dt*1000)/250))renderSide();raf=requestAnimationFrame(frame)}

  ensureV3();bind();renderSide();raf=requestAnimationFrame(frame);
  window.__GOLD_3D__={agents,movePlayerTo,stationDefs,renderSide,queueItems,selected:()=>selected};
})();
