(() => {
  'use strict';
  if (!window.THREE) return;
  const D = window.__GOLD_DEBUG__;
  if (!D?.state) return;

  const state = D.state;
  const THREE = window.THREE;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt = n => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n)||0)) + 'đ';
  const short = n => {
    n = Number(n)||0; const a=Math.abs(n);
    if (a>=1e9) return (n/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ';
    if (a>=1e6) return (n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' triệu';
    return fmt(n);
  };
  const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const hashStr = v => { let h=2166136261; for(const ch of String(v||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)} return h>>>0; };
  // Frame-rate independent damping helpers. These keep camera, movement and animation
  // feeling the same at 30, 60 or 120 Hz instead of depending on a fixed per-frame lerp.
  const dampAlpha = (lambda,dt)=>1-Math.exp(-Math.max(0,lambda)*Math.max(0,dt));
  const damp = (current,target,lambda,dt)=>current+(target-current)*dampAlpha(lambda,dt);
  const shortestAngle = (from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
  const dampAngle = (from,to,lambda,dt)=>from+shortestAngle(from,to)*dampAlpha(lambda,dt);

  const agents = new Map();
  const stationObjects = new Map();
  const interactive = [];
  const disposables = [];
  let renderer, scene, camera, stage, floor, raycaster, pointer, composer=null;
  let selected=null, brandSign=null, clock=new THREE.Clock(), raf=0;
  let cameraTarget=new THREE.Vector3(0,1.0,-.45);
  let cameraGoal=new THREE.Vector3(11.8,10.8,14.2);
  let cameraLookGoal=cameraTarget.clone();
  let cameraPreset='overview', ambientTimer=7;
  let fpsFrames=0,fpsLast=performance.now(),fps=60,lastUiTick=0;
  let qualityDpr=Math.min(1.6,window.devicePixelRatio||1),qualityTimer=0;
  let qualityLabel='HIGH';
  let materials;
  let resizeObs=null;

  const FLOOR={minX:-9.5,maxX:9.5,minZ:-6.3,maxZ:6.15};
  const DOOR={x:0,z:5.95};

  const stations=[
    {id:'warehouse',name:'Kho hàng',icon:'📦',view:'inventory',x:-7.25,z:-3.55,w:2.6,d:3.4,approach:{x:-5.55,z:-3.05},desc:'SKU, nhập hàng, công nợ chành và kiểm kho.'},
    {id:'scale',name:'Kiểm định / Cân vàng',icon:'⚖',view:'shop',x:-2.55,z:-4.48,w:2.85,d:1.55,approach:{x:-2.55,z:-3.02},desc:'Cân trọng lượng, xác định tuổi vàng và đối chiếu trước khi báo giá.'},
    {id:'pawn',name:'Thu mua / Cầm đồ',icon:'🤝',view:'pawn',x:2.15,z:-4.42,w:3.05,d:1.65,approach:{x:2.15,z:-2.98},desc:'Định giá, giải ngân, đóng kỳ, chuộc và xử lý hợp đồng.'},
    {id:'pos',name:'Thu ngân / POS',icon:'🧮',view:'shop',x:6.35,z:-4.00,w:3.15,d:1.65,approach:{x:5.35,z:-2.60},desc:'Máy tính quầy, thu/chi, tiền thối và in phiếu.'},
    {id:'showcase',name:'Tủ bán vàng',icon:'💍',view:'shop',x:-3.60,z:.15,w:4.15,d:1.65,approach:{x:-3.60,z:1.52},desc:'Tư vấn mẫu, lấy SKU, bán/đổi và đưa sản phẩm cho khách xem.'},
    {id:'showcase2',name:'Tủ trung tâm',icon:'💎',view:'shop',x:1.40,z:1.15,w:4.05,d:1.75,approach:{x:1.40,z:2.62},desc:'Tủ sản phẩm nổi bật và hàng giá trị cao.'},
    {id:'office',name:'Văn phòng quản trị',icon:'📊',view:'management',x:-7.05,z:3.25,w:2.45,d:1.75,approach:{x:-5.65,z:3.20},desc:'Giá bán, công bán, nhân sự, chính sách và mở rộng chuỗi.'},
    {id:'safe',name:'Két tiền',icon:'🔐',view:'finance',x:7.90,z:3.60,w:1.25,d:1.20,approach:{x:6.65,z:3.25},desc:'Thanh khoản, tiền mặt, nợ và khóa quỹ.'},
    {id:'camera',name:'Camera an ninh',icon:'📹',view:'management',x:-8.55,z:5.05,w:.85,d:.65,approach:{x:-7.55,z:4.48},desc:'Quan sát vận hành và giảm rủi ro thất thoát.'}
  ];
  const obstacles=stations.filter(s=>s.id!=='camera').map(s=>({x:s.x-s.w/2-.2,z:s.z-s.d/2-.2,w:s.w+.4,d:s.d+.4,id:s.id}));
  const staffTargets={
    'Tư vấn bán hàng':{x:-3.05,z:1.25},
    'Thu ngân / POS':{x:5.35,z:-2.70},
    'Cầm đồ':{x:2.25,z:-3.0},
    'Kho / kiểm hàng':{x:-5.55,z:-3.0},
    'An ninh / camera':{x:-7.55,z:4.45}
  };
  const eventTargets={
    sale:{x:-3.55,z:1.55},buyback:{x:-2.55,z:-3.0},exchangeSame:{x:-2.55,z:-3.0},exchangeCross:{x:-2.55,z:-3.0},
    pawnOpen:{x:2.15,z:-3.0},pawnDue:{x:2.15,z:-3.0},service:{x:-3.55,z:1.55},lostCustomer:{x:-3.55,z:1.55},
    quietDay:{x:1.0,z:4.55},supplier:{x:-5.55,z:-3.0},chanh:{x:-5.55,z:-3.0},audit:{x:5.35,z:-2.7},
    staffError:{x:5.35,z:-2.7},priceShock:{x:-5.6,z:3.2},info:{x:-5.55,z:-3.0}
  };
  const PUBLIC_TYPES=new Set(['sale','buyback','exchangeSame','exchangeCross','pawnOpen','pawnDue','service','lostCustomer']);
  const CUSTOMER_PERSONAS=[
    {key:'price',label:'Săn giá',color:0x9d3453},{key:'vip',label:'VIP kỹ tính',color:0x314a7d},
    {key:'trend',label:'Thích mẫu đẹp',color:0xa35e2f},{key:'careful',label:'Cân nhắc kỹ',color:0x47735f},
    {key:'urgent',label:'Khách vội',color:0x6a4e88},{key:'pawn',label:'Cần xoay tiền',color:0x76512f}
  ];

  const cameraPresets={
    overview:{pos:new THREE.Vector3(11.9,7.9,14.8),target:new THREE.Vector3(0,1.05,-.35),fov:35},
    showcase:{pos:new THREE.Vector3(7.8,5.8,8.9),target:new THREE.Vector3(-2.4,1.1,.35),fov:33},
    scale:{pos:new THREE.Vector3(4.9,5.2,4.7),target:new THREE.Vector3(-2.55,1.08,-4.15),fov:32},
    pawn:{pos:new THREE.Vector3(7.2,5.1,4.3),target:new THREE.Vector3(2.2,1.08,-4.12),fov:32},
    pos:{pos:new THREE.Vector3(9.2,5.15,3.9),target:new THREE.Vector3(6.05,1.08,-3.86),fov:31},
    lounge:{pos:new THREE.Vector3(-8.9,5.6,9.5),target:new THREE.Vector3(-5.4,1.0,3.1),fov:32}
  };
  let zoomFactor=1;

  const avatarAssets={loading:false,ready:false,clone:null,templates:{male:null,female:null},clips:{male:[],female:[]},sources:{male:'fallback',female:'fallback'},error:null};
  const CHARACTER_URLS={
    male:['./assets/characters/owner_m.glb','https://raw.githubusercontent.com/programasweights/avatar/main/public/assets/gangnam-character.glb','https://raw.githubusercontent.com/Ashen-Skool/Aot-Fable-5.1/122378c422148390c781adc6d7019eda7b5d07f3/assets/staged/anim/UBC_Superhero_Male_FullBody.glb'],
    female:['./assets/characters/owner_f.glb','https://raw.githubusercontent.com/Ashen-Skool/Aot-Fable-5.1/122378c422148390c781adc6d7019eda7b5d07f3/assets/staged/anim/UBC_Superhero_Female_FullBody.glb']
  };
  const decorAssets={loading:false,ready:false,loader:null,cache:new Map(),error:null};
  const DECOR_URLS={
    chair:'https://raw.githubusercontent.com/sijun-kevin-hu/break-my-house/main/public/models/house-interior/Chair.glb',
    couch:'https://raw.githubusercontent.com/sijun-kevin-hu/break-my-house/main/public/models/house-interior/Couch%20Small-X9msj0gtb5.glb',
    plant:'https://raw.githubusercontent.com/sijun-kevin-hu/break-my-house/main/public/models/house-interior/Houseplant.glb',
    lamp:'https://raw.githubusercontent.com/sijun-kevin-hu/break-my-house/main/public/models/house-interior/Lamp.glb',
    shelf:'https://raw.githubusercontent.com/sijun-kevin-hu/break-my-house/main/public/models/house-interior/Shelf%20Large.glb',
    table:'https://raw.githubusercontent.com/sijun-kevin-hu/break-my-house/main/public/models/house-interior/Table%20Round%20Small.glb',
    luxuryChair:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb',
    luxurySofa:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/GlamVelvetSofa/glTF-Binary/GlamVelvetSofa.glb',
    flowerVase:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/GlassVaseFlowers/glTF-Binary/GlassVaseFlowers.glb'
  };

  function ensureState(){
    state.v3=state.v3||{};
    state.v3.flowStage=state.v3.flowStage||'idle';
    state.v3.heldItem=!!state.v3.heldItem;
    state.v6=state.v6||{};
    state.v6.player=state.v6.player||{x:0,z:4.65,path:[]};
    state.v6.labels=typeof state.v6.labels==='boolean'?state.v6.labels:false;
    state.v6.cameraPreset=state.v6.cameraPreset||'overview';
    state.v6.zoomFactor=clamp(Number(state.v6.zoomFactor)||1,.84,1.18);
    cameraPreset=state.v6.cameraPreset;
    zoomFactor=state.v6.zoomFactor;
  }

  function queueItems(){
    const live=state.liveStore||{};
    if(!Array.isArray(live.schedule)) return [];
    return live.schedule.filter(x=>x.index>=state.situationsToday && x.arrival<=state.clockMinutes && !x.penalized);
  }
  function servedItem(){
    if(!state.currentEvent || state.currentEvent.done || state.situationsToday<1) return null;
    return (state.liveStore?.schedule||[]).find(x=>x.index===state.situationsToday-1)||null;
  }
  function patience(item){return item?clamp(100-Math.max(0,(state.clockMinutes||0)-item.arrival)*.55,0,100):100}
  function clockText(){const m=Math.max(0,Number(state.clockMinutes)||0);return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(Math.floor(m%60)).padStart(2,'0')}`}
  function log3(text){state.v3.log=Array.isArray(state.v3.log)?state.v3.log:[];state.v3.log.unshift({day:state.day,t:clockText(),text});state.v3.log=state.v3.log.slice(0,80)}
  function personaFor(id){return CUSTOMER_PERSONAS[hashStr(id)%CUSTOMER_PERSONAS.length]}

  function textureCanvas(size,draw,repeatX=1,repeatY=1){
    const c=document.createElement('canvas'); c.width=c.height=size;
    const g=c.getContext('2d'); draw(g,size);
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(repeatX,repeatY); t.anisotropy=8; return t;
  }
  function marbleTexture(){return textureCanvas(512,(g,s)=>{
    const gr=g.createLinearGradient(0,0,s,s);gr.addColorStop(0,'#f8f4ea');gr.addColorStop(.45,'#d8cbb8');gr.addColorStop(.7,'#f7efe1');gr.addColorStop(1,'#cbbda7');g.fillStyle=gr;g.fillRect(0,0,s,s);
    for(let i=0;i<38;i++){g.globalAlpha=.12+Math.random()*.12;g.strokeStyle=i%4===0?'#7d6f60':'#ae9a82';g.lineWidth=.5+Math.random()*1.4;g.beginPath();let y=Math.random()*s;g.moveTo(-20,y);for(let x=0;x<s+40;x+=32){y+=Math.sin((x+i*29)/47)*5+(Math.random()-.5)*7;g.lineTo(x,y)}g.stroke()}g.globalAlpha=1;
  },4.2,3.0)}
  function darkMarbleTexture(){return textureCanvas(384,(g,s)=>{
    const gr=g.createLinearGradient(0,0,s,s);gr.addColorStop(0,'#17110d');gr.addColorStop(.52,'#090806');gr.addColorStop(1,'#2a1b11');g.fillStyle=gr;g.fillRect(0,0,s,s);
    for(let i=0;i<32;i++){g.strokeStyle=i%3===0?'rgba(225,174,70,.19)':'rgba(255,255,255,.045)';g.lineWidth=.5+Math.random()*1.8;g.beginPath();let y=Math.random()*s;g.moveTo(-20,y);for(let x=0;x<s+30;x+=28){y+=(Math.random()-.5)*10;g.lineTo(x,y)}g.stroke()}
  },2.5,2.2)}
  function woodTexture(){return textureCanvas(384,(g,s)=>{g.fillStyle='#3b2115';g.fillRect(0,0,s,s);for(let i=0;i<70;i++){g.strokeStyle=`rgba(236,177,103,${.025+Math.random()*.055})`;g.lineWidth=.6+Math.random()*1.4;const y=Math.random()*s;g.beginPath();g.moveTo(0,y);for(let x=0;x<s;x+=18)g.lineTo(x,y+Math.sin((x+i)/27)*3);g.stroke()}},2.1,1.2)}
  function localTexture(path,repeatX=1,repeatY=1,isColor=true){
    const t=new THREE.TextureLoader().load(path);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=12;if(isColor)t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function makeMaterials(){
    const floorMap=localTexture('./assets/textures/marble_albedo.png',3.8,2.7,true);
    const floorRough=localTexture('./assets/textures/marble_roughness.png',3.8,2.7,false);
    const floorNormal=localTexture('./assets/textures/marble_normal.png',3.8,2.7,false);
    const darkMap=localTexture('./assets/textures/dark_marble_albedo.png',2.2,2.0,true);
    const darkRough=localTexture('./assets/textures/dark_marble_roughness.png',2.2,2.0,false);
    const woodMap=localTexture('./assets/textures/wood_albedo.png',2.0,1.15,true);
    const woodRough=localTexture('./assets/textures/wood_roughness.png',2.0,1.15,false);
    const fabricMap=localTexture('./assets/textures/fabric_charcoal.png',3.0,3.0,true);
    const fabricRough=localTexture('./assets/textures/fabric_roughness.png',3.0,3.0,false);
    const floorMat=new THREE.MeshPhysicalMaterial({map:floorMap,roughnessMap:floorRough,normalMap:floorNormal,normalScale:new THREE.Vector2(.22,.22),color:0xffffff,roughness:.17,metalness:.015,clearcoat:.92,clearcoatRoughness:.10,reflectivity:.92,envMapIntensity:1.18});
    const dark=new THREE.MeshPhysicalMaterial({map:darkMap,roughnessMap:darkRough,color:0xffffff,roughness:.22,metalness:.18,clearcoat:.62,clearcoatRoughness:.12,envMapIntensity:1.25});
    const gold=new THREE.MeshPhysicalMaterial({color:0xe1b252,metalness:1,roughness:.16,clearcoat:.88,clearcoatRoughness:.055,reflectivity:1,envMapIntensity:1.65});
    const goldGlow=new THREE.MeshStandardMaterial({color:0xf0c96a,metalness:.84,roughness:.22,emissive:0x633504,emissiveIntensity:.16});
    return {
      floor:floorMat,
      dark,
      darkFlat:new THREE.MeshStandardMaterial({map:darkMap,roughnessMap:darkRough,color:0xffffff,roughness:.38,metalness:.20}),
      wall:new THREE.MeshPhysicalMaterial({map:darkMap,color:0x433122,roughness:.30,metalness:.16,clearcoat:.30,clearcoatRoughness:.24,envMapIntensity:1.05}),
      wood:new THREE.MeshStandardMaterial({map:woodMap,roughnessMap:woodRough,color:0xffffff,roughness:.44,metalness:.04}),
      gold,
      goldGlow,
      goldSoft:new THREE.MeshStandardMaterial({color:0xb98b33,metalness:.88,roughness:.24}),
      champagne:new THREE.MeshPhysicalMaterial({color:0xd7b56c,metalness:.9,roughness:.20,clearcoat:.45}),
      glass:new THREE.MeshPhysicalMaterial({color:0xf7fcff,roughness:.028,metalness:0,transmission:.96,transparent:true,opacity:.22,thickness:.22,ior:1.49,side:THREE.DoubleSide,clearcoat:1,clearcoatRoughness:.035,envMapIntensity:1.45}),
      cream:new THREE.MeshStandardMaterial({color:0xeee4d4,roughness:.62}),
      green:new THREE.MeshStandardMaterial({color:0x2f6945,roughness:.7}),
      red:new THREE.MeshStandardMaterial({color:0x741b20,roughness:.64}),
      white:new THREE.MeshPhysicalMaterial({color:0xfffbf3,roughness:.22,clearcoat:.35,clearcoatRoughness:.18}),
      black:new THREE.MeshPhysicalMaterial({color:0x090a0c,roughness:.28,metalness:.28,clearcoat:.35}),
      screen:new THREE.MeshBasicMaterial({color:0x2cdab7,toneMapped:false}),
      fabric:new THREE.MeshStandardMaterial({map:fabricMap,roughnessMap:fabricRough,color:0xffffff,roughness:.76})
    };
  }
  function box(w,h,d,mat,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;disposables.push(m.geometry);return m}
  function setInteractive(obj,data){obj.userData.entity=data;obj.traverse(o=>{if(o.isMesh){o.userData.entity=data;interactive.push(o)}});return obj}
  function canvasLabel(text,sub='',w=640,h=150){
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
    const grd=g.createLinearGradient(0,0,w,h);grd.addColorStop(0,'#080705');grd.addColorStop(.55,'#191109');grd.addColorStop(1,'#080705');g.fillStyle=grd;g.fillRect(0,0,w,h);
    g.strokeStyle='#d9ad47';g.lineWidth=6;g.strokeRect(6,6,w-12,h-12);
    g.textAlign='center';g.fillStyle='#ffe28a';
    g.shadowColor='rgba(239,194,80,.45)';g.shadowBlur=18;g.font='900 50px Georgia,serif';g.fillText(String(text).slice(0,28),w/2,68);g.shadowBlur=0;
    if(sub){g.fillStyle='#cbbd9a';g.font='700 20px system-ui';g.fillText(String(sub).slice(0,60),w/2,108)}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false});return new THREE.Mesh(new THREE.PlaneGeometry(4.5,1.05),mat);
  }
  function addLabel(text,sub,x,y,z,rotY=0,scale=1){const p=canvasLabel(text,sub);p.position.set(x,y,z);p.rotation.y=rotY;p.scale.setScalar(scale);scene.add(p);return p}
  function addGoldStrip(w,d,x,z,rot=0){const q=box(w,.025,d,materials.gold,x,.03,z);q.rotation.y=rot;scene.add(q);return q}

  function jewelry(type='ring',scale=1,gem=false){
    const g=new THREE.Group(); let mesh;
    if(type==='ring'){mesh=new THREE.Mesh(new THREE.TorusGeometry(.10*scale,.018*scale,10,28),materials.gold);mesh.rotation.x=Math.PI/2}
    else if(type==='chain'){mesh=new THREE.Mesh(new THREE.TorusGeometry(.16*scale,.012*scale,8,36),materials.gold);mesh.scale.y=.62;mesh.rotation.x=Math.PI/2}
    else {mesh=new THREE.Mesh(new THREE.TorusGeometry(.16*scale,.025*scale,10,32),materials.gold);mesh.scale.y=.72;mesh.rotation.x=Math.PI/2}
    mesh.castShadow=true;g.add(mesh);
    if(gem){const d=new THREE.Mesh(new THREE.OctahedronGeometry(.035*scale),new THREE.MeshPhysicalMaterial({color:0xf7fbff,roughness:.03,transmission:.35,clearcoat:1,metalness:0}));d.position.set(.04*scale,.03*scale,.02);g.add(d)}
    return g;
  }
  function addLedLight(x,z,w,d){
    const points=[[-w/2,0], [w/2,0], [0,-d/2], [0,d/2]];
    points.forEach(([dx,dz],i)=>{const p=new THREE.PointLight(0xffd67b,i<2?1.25:.85,3.4,2);p.position.set(x+dx,1.42,z+dz);scene.add(p)});
  }
  function displayCase(def,rows=3,cols=6){
    const g=new THREE.Group();
    g.add(box(def.w,.60,def.d,materials.dark,0,.30,0));
    g.add(box(def.w+.08,.055,def.d+.08,materials.goldGlow,0,.64,0));
    g.add(box(def.w-.16,.065,def.d-.16,materials.white,0,.72,0));
    const gl=box(def.w-.10,.64,def.d-.10,materials.glass,0,1.04,0);gl.castShadow=false;g.add(gl);
    g.add(box(def.w+.09,.045,def.d+.09,materials.goldGlow,0,1.39,0));
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const px=-def.w*.38+c*(def.w*.76/Math.max(1,cols-1));
      const pz=-def.d*.27+r*(def.d*.54/Math.max(1,rows-1));
      const j=jewelry((r+c)%3===0?'chain':(r+c)%3===1?'ring':'bangle',.9,(r+c)%4===0);j.position.set(px,.79,pz);g.add(j);
    }
    g.position.set(def.x,0,def.z);scene.add(setInteractive(g,{type:'station',id:def.id}));stationObjects.set(def.id,g);addLedLight(def.x,def.z,def.w*.8,def.d*.75);return g;
  }
  function workCounter(def,kind){
    const g=new THREE.Group();g.add(box(def.w,.83,def.d,materials.dark,0,.415,0));g.add(box(def.w+.08,.07,def.d+.08,materials.goldGlow,0,.865,0));g.add(box(def.w-.05,.045,def.d-.05,materials.white,0,.925,0));
    if(kind==='pos'){
      const monitor=box(.72,.47,.08,materials.black,.28,1.28,-.06);monitor.rotation.x=-.08;g.add(monitor);const screen=box(.60,.34,.012,materials.screen,.28,1.29,-.105);screen.rotation.x=-.08;g.add(screen);g.add(box(.74,.035,.32,materials.black,.25,.99,.25));g.add(box(.30,.18,.28,materials.white,-.55,1.03,.15));
    } else if(kind==='scale'){
      const plate=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.04,36),new THREE.MeshPhysicalMaterial({color:0xd6dadd,metalness:.76,roughness:.18,clearcoat:.4}));plate.position.set(-.38,.98,0);g.add(plate);g.add(box(.60,.30,.08,materials.black,.48,1.18,-.05));const digit=box(.47,.16,.012,new THREE.MeshBasicMaterial({color:0x06291f,toneMapped:false}),.48,1.19,-.095);g.add(digit);
    } else if(kind==='pawn'){
      g.add(box(.70,.04,.46,materials.white,-.45,.98,.05));const loop=new THREE.Mesh(new THREE.TorusGeometry(.16,.025,10,28),materials.black);loop.rotation.x=Math.PI/2;loop.position.set(.42,1.18,.05);g.add(loop);const lamp=new THREE.SpotLight(0xffe0a0,4,4,Math.PI/6,.55,1.5);lamp.position.set(0,2.4,.2);lamp.target.position.set(0,.9,0);g.add(lamp,lamp.target);
    }
    g.position.set(def.x,0,def.z);scene.add(setInteractive(g,{type:'station',id:def.id}));stationObjects.set(def.id,g);addLedLight(def.x,def.z,def.w*.7,def.d*.65);return g;
  }
  function shelf(def){
    const g=new THREE.Group();g.add(box(def.w,2.85,.68,materials.dark,0,1.43,0));
    for(let i=0;i<4;i++){g.add(box(def.w-.16,.045,.56,materials.goldSoft,0,.42+i*.69,.02));for(let j=0;j<5;j++){const b=box(.32,.21,.30,j%2?materials.cream:materials.champagne,-def.w*.34+j*def.w*.17,.56+i*.69,.01);g.add(b)}}
    g.position.set(def.x,0,def.z);scene.add(setInteractive(g,{type:'station',id:def.id}));stationObjects.set(def.id,g);return g;
  }
  function plant(x,z,s=1){
    const g=new THREE.Group();const pot=new THREE.Mesh(new THREE.CylinderGeometry(.24*s,.31*s,.52*s,24),materials.champagne);pot.position.y=.26*s;g.add(pot);
    for(let i=0;i<9;i++){const leaf=new THREE.Mesh(new THREE.CapsuleGeometry(.055*s,.62*s,5,12),materials.green);leaf.position.set(Math.sin(i*.74)*.11*s,.87*s,Math.cos(i*.74)*.10*s);leaf.rotation.z=(i-4)*.12;leaf.rotation.x=.15;g.add(leaf)}g.position.set(x,0,z);scene.add(g);return g;
  }
  function wallSconce(x,z,rot=0){const g=new THREE.Group();const back=box(.20,.52,.08,materials.goldSoft,0,.26,0);g.add(back);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.08,18,12),new THREE.MeshBasicMaterial({color:0xffe2a0,toneMapped:false}));bulb.position.set(0,.28,.10);g.add(bulb);const l=new THREE.PointLight(0xffd68a,.85,3.4,2);l.position.set(0,.28,.18);g.add(l);g.position.set(x,1.7,z);g.rotation.y=rot;scene.add(g)}
  function ceilingLight(x,z,r=.45){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.025,10,48),materials.gold);ring.rotation.x=Math.PI/2;ring.position.set(x,3.90,z);scene.add(ring);const l=new THREE.PointLight(0xffd98d,1.3,4.6,2);l.position.set(x,3.72,z);scene.add(l)}
  function lounge(){
    const seat=new THREE.Group();seat.add(box(2.5,.44,.82,materials.fabric,0,.32,0));seat.add(box(2.5,.74,.18,materials.fabric,0,.80,-.34));seat.position.set(-6.15,0,3.55);scene.add(seat);
    const table=new THREE.Mesh(new THREE.CylinderGeometry(.56,.56,.07,36),materials.dark);table.position.set(-4.45,.43,3.45);table.castShadow=true;scene.add(table);plant(-7.65,4.55,.85);plant(-4.35,4.6,.70);
  }
  function stanchions(){for(let i=0;i<5;i++){const z=2.8+i*.64;const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.055,1.00,16),materials.gold);pole.position.set(7.15,.50,z);scene.add(pole);if(i<4){const rope=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.64,8),materials.red);rope.rotation.x=Math.PI/2;rope.position.set(7.15,.77,z+.32);scene.add(rope)}}}
  function jewelBust(x,z,rot=0){const g=new THREE.Group();const bust=new THREE.Mesh(new THREE.CylinderGeometry(.19,.34,.48,24),materials.black);bust.position.y=1.05;g.add(bust);const chain=new THREE.Mesh(new THREE.TorusGeometry(.23,.015,8,40,Math.PI*1.45),materials.gold);chain.position.set(0,1.17,.20);chain.rotation.x=Math.PI/2;chain.rotation.z=-.70;g.add(chain);g.position.set(x,0,z);g.rotation.y=rot;scene.add(g)}

  function mirrorPanel(x,z,w=2.2,h=2.45){
    const frame=box(w+.12,h+.12,.08,materials.goldSoft,x,h/2+.55,z);scene.add(frame);
    const mirror=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshPhysicalMaterial({color:0xa7b3b7,metalness:.82,roughness:.08,clearcoat:1,envMapIntensity:1.8}));
    mirror.position.set(x,h/2+.55,z+.047);scene.add(mirror);return mirror;
  }
  function bouquet(x,z,color=0xf4efe4,scale=1){
    const g=new THREE.Group();const vase=new THREE.Mesh(new THREE.CylinderGeometry(.12*scale,.17*scale,.42*scale,22),materials.champagne);vase.position.y=.21*scale;g.add(vase);
    const flowerMat=new THREE.MeshStandardMaterial({color,roughness:.66});
    for(let i=0;i<15;i++){
      const a=i*2.399,rad=.08+(i%5)*.025;const stem=new THREE.Mesh(new THREE.CylinderGeometry(.008*scale,.009*scale,.55*scale,7),materials.green);stem.position.set(Math.cos(a)*rad*scale,.56*scale,Math.sin(a)*rad*scale);stem.rotation.z=(Math.cos(a)*.13);g.add(stem);
      const f=new THREE.Mesh(new THREE.SphereGeometry(.065*scale,12,8),flowerMat);f.scale.set(1,.65,1);f.position.set(Math.cos(a)*rad*1.25*scale,.86*scale+(i%3)*.035,Math.sin(a)*rad*1.25*scale);g.add(f);
    }
    g.position.set(x,0,z);scene.add(g);return g;
  }
  function chandelier(x,z,scale=1){
    const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(.58*scale,.026*scale,10,56),materials.goldGlow);ring.rotation.x=Math.PI/2;ring.position.y=3.72;g.add(ring);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const rod=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.52*scale,7),materials.goldSoft);rod.position.set(Math.cos(a)*.44*scale,3.95,Math.sin(a)*.44*scale);g.add(rod);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.045*scale,12,9),new THREE.MeshBasicMaterial({color:0xffe7b0,toneMapped:false}));bulb.position.set(Math.cos(a)*.44*scale,3.67,Math.sin(a)*.44*scale);g.add(bulb)}
    const light=new THREE.PointLight(0xffddb0,1.35,6.5,2);light.position.y=3.60;g.add(light);g.position.set(x,0,z);scene.add(g);return g;
  }
  function wallCabinet(x,z,w=1.6){
    const g=new THREE.Group();g.add(box(w,2.3,.34,materials.dark,0,1.30,0));
    for(let i=0;i<3;i++){g.add(box(w-.12,.035,.28,materials.goldSoft,0,.55+i*.66,.05));for(let j=0;j<4;j++){const q=jewelry((i+j)%2?'ring':'chain',.70,(i+j)%4===0);q.position.set(-w*.34+j*w*.225,.67+i*.66,.21);g.add(q)}}
    const front=box(w-.08,2.18,.025,materials.glass,0,1.30,.18);front.castShadow=false;g.add(front);g.position.set(x,0,z);scene.add(g);return g;
  }

  function buildStore(){
    floor=new THREE.Mesh(new THREE.PlaneGeometry(20,13),materials.floor);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.userData.entity={type:'floor'};scene.add(floor);interactive.push(floor);
    // architectural shell: open towards the camera, so nothing blocks gameplay.
    const back=box(20,4.45,.22,materials.wall,0,2.225,-6.42);scene.add(back);
    const leftBack=box(.18,4.15,4.3,materials.wall,-9.78,2.075,-4.25);scene.add(leftBack);
    const rightBack=box(.18,4.15,4.3,materials.wall,9.78,2.075,-4.25);scene.add(rightBack);
    // facade glass only at the far right/left front edges, never across the camera view.
    const glL=box(.08,3.0,3.2,materials.glass,-9.50,1.50,4.45);glL.castShadow=false;scene.add(glL);
    const glR=box(.08,3.0,3.2,materials.glass,9.50,1.50,4.45);glR.castShadow=false;scene.add(glR);

    for(let x=-9.0;x<=9.0;x+=1.2) scene.add(box(.035,4.05,.09,materials.goldSoft,x,2.18,-6.25));
    for(const x of [-8.7,-5.0,-1.3,2.4,6.1,9.0]) wallSconce(x,-6.18,0);
    // Architectural rhythm closer to a luxury jewelry showroom.
    for(const x of [-8.1,-4.45,-.80,2.85,6.50]) mirrorPanel(x,-6.08,2.20,2.20);
    for(const x of [-8.1,-4.45,-.80,2.85,6.50]) wallCabinet(x,-5.86,1.58);
    brandSign=addLabel((state.storeName||'TIỆM VÀNG CỦA BẠN').toUpperCase(),'GOLD SHOP SIMULATOR · PREMIUM STORE',1.6,3.38,-6.18,0,1.18);

    // three back-of-house zones like the reference image.
    addLabel('KHO HÀNG','',-7.25,2.88,-6.16,0,.62);
    addLabel('KIỂM ĐỊNH / CÂN VÀNG','',-2.55,2.88,-6.16,0,.62);
    addLabel('THU MUA / CẦM ĐỒ','',2.25,2.88,-6.16,0,.62);
    addLabel('THU NGÂN / POS','',6.45,2.88,-6.16,0,.62);

    shelf(stations.find(s=>s.id==='warehouse'));
    workCounter(stations.find(s=>s.id==='scale'),'scale');
    workCounter(stations.find(s=>s.id==='pawn'),'pawn');
    workCounter(stations.find(s=>s.id==='pos'),'pos');
    displayCase(stations.find(s=>s.id==='showcase'),3,7);
    displayCase(stations.find(s=>s.id==='showcase2'),3,7);

    // extra front display island to create the dense showroom feeling.
    const island={id:'showcase3',x:4.65,z:1.72,w:2.65,d:1.35};
    const ig=new THREE.Group();ig.add(box(island.w,.57,island.d,materials.dark,0,.285,0));ig.add(box(island.w+.08,.05,island.d+.08,materials.gold,0,.61,0));ig.add(box(island.w-.10,.06,island.d-.10,materials.white,0,.69,0));const iglass=box(island.w-.08,.52,island.d-.08,materials.glass,0,.99,0);iglass.castShadow=false;ig.add(iglass);ig.add(box(island.w+.08,.04,island.d+.08,materials.gold,0,1.28,0));for(let i=0;i<12;i++){const j=jewelry(i%2?'ring':'chain',.8,i%5===0);j.position.set(-.95+(i%4)*.62,.77,-.35+Math.floor(i/4)*.35);ig.add(j)}ig.position.set(island.x,0,island.z);scene.add(ig);addLedLight(island.x,island.z,island.w*.75,island.d*.7);

    // Small premium island fills the foreground without blocking walking lanes.
    const island2={x:-.35,z:3.85,w:2.55,d:1.15};
    const i2=new THREE.Group();i2.add(box(island2.w,.50,island2.d,materials.dark,0,.25,0));i2.add(box(island2.w+.06,.045,island2.d+.06,materials.goldGlow,0,.54,0));i2.add(box(island2.w-.10,.055,island2.d-.10,materials.white,0,.61,0));const i2g=box(island2.w-.08,.42,island2.d-.08,materials.glass,0,.84,0);i2g.castShadow=false;i2.add(i2g);i2.add(box(island2.w+.06,.035,island2.d+.06,materials.goldGlow,0,1.07,0));for(let i=0;i<10;i++){const j=jewelry(i%3===0?'bangle':i%2?'ring':'chain',.72,i%4===0);j.position.set(-.90+(i%5)*.45,.68,-.24+Math.floor(i/5)*.44);i2.add(j)}i2.position.set(island2.x,0,island2.z);scene.add(i2);addLedLight(island2.x,island2.z,island2.w*.72,island2.d*.60);

    const office=stations.find(s=>s.id==='office');const od=workCounter(office,'office');od.add(box(.72,.43,.08,materials.black,.2,1.25,-.02));
    const safeDef=stations.find(s=>s.id==='safe');const safe=box(safeDef.w,1.72,safeDef.d,materials.black,safeDef.x,.86,safeDef.z);scene.add(setInteractive(safe,{type:'station',id:'safe'}));stationObjects.set('safe',safe);const dial=new THREE.Mesh(new THREE.TorusGeometry(.22,.03,10,30),materials.gold);dial.rotation.y=Math.PI/2;dial.position.set(safeDef.x-safeDef.w/2-.02,.92,safeDef.z);scene.add(dial);
    const camDef=stations.find(s=>s.id==='camera');const pole=box(.11,2.55,.11,materials.black,camDef.x,1.27,camDef.z);scene.add(setInteractive(pole,{type:'station',id:'camera'}));const cam=box(.40,.18,.24,materials.black,camDef.x+.16,2.36,camDef.z);scene.add(cam);

    lounge(); stanchions();
    plant(-8.4,-1.2,.86);plant(8.55,-.4,.86);plant(-4.85,-5.25,.60);plant(4.75,-5.25,.65);plant(0,4.95,.65);plant(8.25,4.55,.75);
    jewelBust(-2.25,.2,.1);jewelBust(1.05,1.15,-.15);jewelBust(4.70,1.70,.2);
    [-7,-4,-1,2,5,8].forEach(x=>ceilingLight(x,-3.6,.38));[-5.5,-2.3,.9,4.1,7.3].forEach(x=>ceilingLight(x,1.4,.40));
    chandelier(-4.5,-.2,.88);chandelier(.3,-.7,.92);chandelier(4.8,.25,.86);
    bouquet(-7.65,-4.85,0xf7f1df,.82);bouquet(3.15,-4.85,0xf2e8d2,.82);bouquet(7.65,-3.55,0xd95267,.72);bouquet(-4.55,3.45,0xf6f1e6,.65);

    // floor zoning and entrance carpet.
    for(const z of [-4.9,-2.8,-.8,1.2,3.2,5.2]) addGoldStrip(18.2,.02,0,z,0);
    for(const x of [-8,-5,-2,1,4,7]) addGoldStrip(.02,11.5,x,0,0);
    const rug=new THREE.Mesh(new THREE.PlaneGeometry(4.0,1.45),new THREE.MeshStandardMaterial({color:0x771b21,roughness:.78}));rug.rotation.x=-Math.PI/2;rug.position.set(0,.018,5.48);scene.add(rug);
    const welcome=addLabel('WELCOME','',0,.06,5.42,0,.54);welcome.rotation.x=-Math.PI/2;
  }

  function setupLights(){
    scene.add(new THREE.HemisphereLight(0xfff7e6,0x17202a,.92));
    const key=new THREE.DirectionalLight(0xfff4dc,1.10);key.position.set(-5,12,10);key.castShadow=true;const shadowSize=(navigator.hardwareConcurrency||4)>=8&&(navigator.deviceMemory||4)>=6?2048:1024;key.shadow.mapSize.set(shadowSize,shadowSize);key.shadow.camera.left=-13;key.shadow.camera.right=13;key.shadow.camera.top=13;key.shadow.camera.bottom=-13;key.shadow.bias=-.00035;scene.add(key);
    const fills=[[-7,4.0,-1],[-3,4.2,-1],[1,4.25,-1],[5,4.1,-1],[8,4.0,-1],[-5,3.9,4],[0,4.1,4],[5,3.9,4]];
    fills.forEach(([x,y,z],i)=>{const p=new THREE.PointLight(i%2?0xffd889:0xffedc4,1.05,7.4,2);p.position.set(x,y,z);scene.add(p)});
    for(const st of stations.filter(s=>['showcase','showcase2','scale','pawn','pos'].includes(s.id))){const sp=new THREE.SpotLight(0xffe4aa,3.25,9,Math.PI/6.0,.62,1.35);sp.position.set(st.x,5.4,st.z+1.1);sp.target.position.set(st.x,.5,st.z);scene.add(sp,sp.target)}
  }
  function warmEnvironment(){
    const faces=[];const colors=['#f5d28a','#7a441d','#e7c574','#2b1710','#efc96e','#5b3b21'];
    for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=192;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,192,192);gr.addColorStop(0,colors[i]);gr.addColorStop(.48,i%2?'#26150d':'#8f5b27');gr.addColorStop(1,'#070504');g.fillStyle=gr;g.fillRect(0,0,192,192);g.globalAlpha=.20;for(let k=0;k<28;k++){g.fillStyle=k%4===0?'#fff2c2':'#d9a43d';g.beginPath();g.arc((k*37+i*17)%192,(k*61+i*9)%192,1+(k%4),0,Math.PI*2);g.fill()}g.globalAlpha=1;faces.push(c)}const cube=new THREE.CubeTexture(faces);cube.colorSpace=THREE.SRGBColorSpace;cube.needsUpdate=true;scene.environment=cube;
  }

  async function loadDecorAssets(){
    if(decorAssets.loading||decorAssets.ready)return;decorAssets.loading=true;
    try{
      const [{GLTFLoader},SkeletonUtils]=await Promise.all([
        import('https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/loaders/GLTFLoader.js/+esm'),
        import('https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/utils/SkeletonUtils.js/+esm')
      ]);
      const loader=new GLTFLoader();decorAssets.loader=loader;
      await Promise.all(Object.entries(DECOR_URLS).map(async([key,url])=>{
        try{const gltf=await new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject));decorAssets.cache.set(key,gltf.scene)}catch(e){console.warn('Decor asset failed',key,e)}
      }));
      decorAssets.clone=SkeletonUtils.clone;decorAssets.ready=decorAssets.cache.size>0;decorAssets.loading=false;
      if(decorAssets.ready){applyDecorAssets();log3('Đã nạp bộ nội thất GLB CC0 cho showroom.');}
    }catch(err){decorAssets.error=String(err?.message||err);decorAssets.loading=false;console.warn('Decor assets unavailable:',err)}
  }
  function addDecorModel(key,x,z,targetSize=1,rot=0,y=0){
    if(!decorAssets.ready||!decorAssets.cache.has(key))return null;
    const m=decorAssets.clone(decorAssets.cache.get(key));m.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(m),sz=b.getSize(new THREE.Vector3());const max=Math.max(.001,sz.x,sz.y,sz.z);const sc=targetSize/max;m.scale.multiplyScalar(sc);m.rotation.y=rot;m.updateMatrixWorld(true);
    const b2=new THREE.Box3().setFromObject(m),c=b2.getCenter(new THREE.Vector3());m.position.set(x-c.x,y-b2.min.y,z-c.z);m.updateMatrixWorld(true);
    m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();if(o.material.roughness!==undefined)o.material.roughness=Math.min(.86,Math.max(.16,o.material.roughness));if('envMapIntensity'in o.material)o.material.envMapIntensity=1.35;}}});scene.add(m);return m;
  }
  function applyDecorAssets(){
    if(scene.getObjectByName('GLB_DECOR_LAYER'))return;
    const root=new THREE.Group();root.name='GLB_DECOR_LAYER';scene.add(root);
    const spawned=[];
    const push=(key,x,z,sc,rot=0)=>{const m=addDecorModel(key,x,z,sc,rot);if(m){scene.remove(m);root.add(m);spawned.push(m)}};
    // High-quality lounge where available; compact CC0 props are the fallback.
    if(decorAssets.cache.has('luxurySofa')) push('luxurySofa',-6.25,3.70,2.55,Math.PI/2); else push('couch',-6.35,3.60,2.30,Math.PI/2);
    if(decorAssets.cache.has('luxuryChair')) push('luxuryChair',-4.65,3.72,1.18,-Math.PI/2); else push('chair',-4.65,3.72,1.05,-Math.PI/2);
    push('table',-5.25,3.20,1.0,0);
    // consultation chairs
    if(decorAssets.cache.has('luxuryChair')){push('luxuryChair',2.10,-2.63,1.08,0);push('luxuryChair',6.15,-2.48,1.08,0);push('luxuryChair',-2.65,-2.58,1.08,0)}
    else {push('chair',2.10,-2.63,1.0,0);push('chair',6.15,-2.48,1.0,0);push('chair',-2.65,-2.58,1.0,0)}
    // back wall shelving and plants
    push('shelf',-7.35,-5.70,2.55,0);push('shelf',-5.85,-5.70,2.55,0);
    push('plant',-8.35,-1.15,1.45,0);push('plant',8.45,-.35,1.45,0);push('plant',4.70,-5.15,1.25,0);push('plant',-4.80,-5.12,1.25,0);push('plant',8.05,4.35,1.35,0);
    push('lamp',-4.35,3.45,1.25,0);push('lamp',7.75,-3.75,1.15,0);
    if(decorAssets.cache.has('flowerVase')){push('flowerVase',-7.55,-4.83,1.05,0);push('flowerVase',3.15,-4.82,1.0,0);push('flowerVase',7.55,-3.55,.92,0)}
    root.traverse(o=>{if(o.isMesh)o.userData.decor=true});
  }

  // ----- Character system -----
  function createFallbackCharacter(kind='customer',seed='x',gender='male'){
    const h=hashStr(seed),g=new THREE.Group(),female=gender==='female';
    const skins=[0xe6b58f,0xd39a72,0xbf815d,0xf0c8aa],hairColors=[0x0d0b0a,0x24160f,0x493025,0x080808];
    const outfitColors=[0x67283a,0x304d72,0x6c5135,0x523867,0x285b50,0x754329,0x252932];
    const skin=new THREE.MeshStandardMaterial({color:skins[h%skins.length],roughness:.58});
    const hairMat=new THREE.MeshStandardMaterial({color:hairColors[(h>>3)%hairColors.length],roughness:.82});
    const jacketColor=kind==='player'?(female?0x711f31:0x11161d):kind==='staff'?0x17212c:outfitColors[h%outfitColors.length];
    const jacket=new THREE.MeshPhysicalMaterial({color:jacketColor,roughness:.50,clearcoat:.08,clearcoatRoughness:.52});
    const shirt=new THREE.MeshStandardMaterial({color:0xf4f1eb,roughness:.72});
    const pants=new THREE.MeshStandardMaterial({color:female&&kind==='customer'&&h%3===0?0x4c3342:0x171b22,roughness:.66});
    const black=new THREE.MeshStandardMaterial({color:0x090b0e,roughness:.38,metalness:.08});
    const goldMat=new THREE.MeshStandardMaterial({color:0xd9aa45,metalness:.82,roughness:.22});
    const root=new THREE.Group();g.add(root);const pivots={};
    const mesh=(geo,mat,x,y,z,scale=[1,1,1],parent=root)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
    const shoulder=female?.245:.285,hip=female?.205:.185;
    mesh(new THREE.CapsuleGeometry(.155,.20,8,18),pants,0,.87,0,[female?1.18:1.06,1,.86]);
    mesh(new THREE.CapsuleGeometry(.185,.42,10,20),jacket,0,1.20,0,[female?1.16:1.30,1,.74]);
    mesh(new THREE.BoxGeometry(.125,.30,.024),shirt,0,1.28,.170);
    const lapL=mesh(new THREE.BoxGeometry(.055,.28,.022),black,-.078,1.29,.182);lapL.rotation.z=-.28;
    const lapR=mesh(new THREE.BoxGeometry(.055,.28,.022),black,.078,1.29,.182);lapR.rotation.z=.28;
    if(kind!=='customer'){mesh(new THREE.CylinderGeometry(.010,.010,.18,12),goldMat,0,1.30,.198);mesh(new THREE.SphereGeometry(.024,14,10),goldMat,0,1.205,.202)}
    mesh(new THREE.CylinderGeometry(.055,.060,.105,18),skin,0,1.49,0);
    mesh(new THREE.SphereGeometry(.122,24,18),skin,0,1.65,0,[female?.90:.94,1.08,.94]);
    mesh(new THREE.SphereGeometry(.026,12,8),skin,-.116,1.65,0,[.65,1,1]);mesh(new THREE.SphereGeometry(.026,12,8),skin,.116,1.65,0,[.65,1,1]);
    const eyeW=new THREE.MeshStandardMaterial({color:0xf8f4ee,roughness:.45}),eyeD=new THREE.MeshStandardMaterial({color:0x2b1d16,roughness:.38});
    for(const x of [-.043,.043]){mesh(new THREE.SphereGeometry(.015,14,10),eyeW,x,1.675,.111,[1,.72,.45]);mesh(new THREE.SphereGeometry(.0067,10,8),eyeD,x,1.675,.119)}
    const nose=mesh(new THREE.ConeGeometry(.014,.043,10),skin,0,1.640,.117);nose.rotation.x=Math.PI/2;
    const mouth=mesh(new THREE.BoxGeometry(.047,.006,.009),new THREE.MeshStandardMaterial({color:female?0x9f5254:0x7c4741,roughness:.68}),0,1.603,.120);mouth.rotation.z=(h%3-1)*.014;
    const browGeo=new THREE.BoxGeometry(.048,.007,.009);for(const x of [-.043,.043])mesh(browGeo,hairMat,x,1.704,.117);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.128,22,16,0,Math.PI*2,0,Math.PI*.60),hairMat);cap.position.set(0,1.713,-.005);cap.scale.set(1.01,1,.98);cap.castShadow=true;root.add(cap);
    if(female){for(const x of [-.095,.095]){const strand=mesh(new THREE.CapsuleGeometry(.020,.24,5,10),hairMat,x,1.555,-.028);strand.rotation.z=x<0?-.08:.08}}else{const fringe=mesh(new THREE.BoxGeometry(.145,.030,.036),hairMat,-.012,1.738,.082);fringe.rotation.z=-.10}
    const makeHand=(parent,side)=>{const palm=mesh(new THREE.BoxGeometry(.070,.095,.036),skin,0,-.315,0,[1,1,1],parent);palm.rotation.z=side==='right'?.03:-.03;const sign=side==='right'?1:-1;for(let i=0;i<4;i++){const f=mesh(new THREE.CapsuleGeometry(.009,.055,4,7),skin,(i-1.5)*.016,-.382,.002,[1,1,1],parent);f.rotation.z=(i-1.5)*.018}const thumb=mesh(new THREE.CapsuleGeometry(.010,.046,4,7),skin,sign*.043,-.345,.012,[1,1,1],parent);thumb.rotation.z=sign*.65};
    const makeArm=(side)=>{const sign=side==='right'?1:-1,p=new THREE.Group();p.position.set(sign*shoulder,1.39,0);root.add(p);pivots[side+'Arm']=p;const upper=new THREE.Mesh(new THREE.CapsuleGeometry(.050,.255,7,12),jacket);upper.position.y=-.145;upper.castShadow=true;p.add(upper);const elbow=new THREE.Group();elbow.position.y=-.315;p.add(elbow);pivots[side+'Forearm']=elbow;const fore=new THREE.Mesh(new THREE.CapsuleGeometry(.044,.235,7,12),jacket);fore.position.y=-.145;fore.castShadow=true;elbow.add(fore);makeHand(elbow,side);if(kind==='player'&&side==='left'){const watch=new THREE.Mesh(new THREE.TorusGeometry(.047,.008,7,16),goldMat);watch.rotation.x=Math.PI/2;watch.position.y=-.285;elbow.add(watch)}};
    makeArm('left');makeArm('right');
    const makeLeg=(side)=>{const sign=side==='right'?1:-1,p=new THREE.Group();p.position.set(sign*hip,.86,0);root.add(p);pivots[side+'Leg']=p;const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(.068,.315,7,12),pants);thigh.position.y=-.19;thigh.castShadow=true;p.add(thigh);const knee=new THREE.Group();knee.position.y=-.39;p.add(knee);pivots[side+'Knee']=knee;const calf=new THREE.Mesh(new THREE.CapsuleGeometry(.059,.29,7,12),pants);calf.position.y=-.18;calf.castShadow=true;knee.add(calf);const shoe=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.145,6,10),black);shoe.rotation.x=Math.PI/2;shoe.position.set(0,-.39,.072);shoe.scale.z=1.25;shoe.castShadow=true;knee.add(shoe)};
    makeLeg('left');makeLeg('right');
    if(female&&kind!=='staff'&&h%3===0){const skirt=mesh(new THREE.CylinderGeometry(.18,.235,.30,24),jacket,0,.84,0);skirt.scale.z=.82}
    if(kind==='staff')mesh(new THREE.BoxGeometry(.078,.043,.010),goldMat,.105,1.29,.198);
    if(kind==='customer'&&h%4===0){const bag=mesh(new THREE.BoxGeometry(.15,.18,.055),new THREE.MeshStandardMaterial({color:0x39231c,roughness:.55}),.27,.78,.01);bag.rotation.z=-.04}
    root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    g.userData.rig={external:false,bones:pivots,phase:(h%100)/100*Math.PI*2,motionBlend:0,talkBlend:0,gaitPhase:0};g.scale.setScalar(kind==='player'?1.02:kind==='staff'?.995:.97+(h%5)*.012);return g;
  }

  function paletteFor(kind,seed){
    const h=hashStr(seed);const jackets=[0x15191f,0x303f56,0x6e2f3f,0x6b5637,0x2f6758,0x7b4e2e,0x5a3f73];
    const skins=[0xb87754,0xd49a72,0xe2b18b,0xf0c5a2];
    return {jacket:kind==='player'?0x111318:kind==='staff'?0x151b22:jackets[h%jackets.length],skin:skins[h%skins.length],pants:kind==='customer'&&h%4===0?0x5a4839:0x14171b,hair:[0x090909,0x23160f,0x493025][h%3]};
  }
  function collectBoneMap(model){
    // Canonical keys + aliases let the runtime accept the current Quaternius rig as well as
    // common Blender/Mixamo/production-humanoid naming without changing gameplay code.
    const aliases={
      root:['root','Root','CharacterRoot','Armature'],pelvis:['pelvis','Pelvis','Hips','mixamorigHips'],
      spine_01:['spine_01','Spine','mixamorigSpine'],spine_02:['spine_02','Spine1','mixamorigSpine1'],spine_03:['spine_03','Spine2','Chest','mixamorigSpine2'],
      neck_01:['neck_01','Neck','mixamorigNeck'],Head:['Head','head','mixamorigHead'],
      clavicle_l:['clavicle_l','LeftShoulder','mixamorigLeftShoulder'],upperarm_l:['upperarm_l','LeftArm','mixamorigLeftArm'],lowerarm_l:['lowerarm_l','LeftForeArm','mixamorigLeftForeArm'],hand_l:['hand_l','LeftHand','mixamorigLeftHand'],
      clavicle_r:['clavicle_r','RightShoulder','mixamorigRightShoulder'],upperarm_r:['upperarm_r','RightArm','mixamorigRightArm'],lowerarm_r:['lowerarm_r','RightForeArm','mixamorigRightForeArm'],hand_r:['hand_r','RightHand','mixamorigRightHand'],
      thigh_l:['thigh_l','LeftUpLeg','mixamorigLeftUpLeg'],calf_l:['calf_l','LeftLeg','mixamorigLeftLeg'],foot_l:['foot_l','LeftFoot','mixamorigLeftFoot'],
      thigh_r:['thigh_r','RightUpLeg','mixamorigRightUpLeg'],calf_r:['calf_r','RightLeg','mixamorigRightLeg'],foot_r:['foot_r','RightFoot','mixamorigRightFoot']
    };
    const map={};
    for(const [key,names] of Object.entries(aliases)){
      for(const n of names){const b=model.getObjectByName(n);if(b){map[key]=b;break}}
    }
    const neutral={};for(const [k,b] of Object.entries(map))neutral[k]={q:b.quaternion.clone(),p:b.position.clone()};return {bones:map,neutral};
  }
  function setBoneDelta(r,name,rx=0,ry=0,rz=0){const b=r.bones[name],n=r.neutral[name];if(!b||!n)return;b.quaternion.copy(n.q);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'XYZ'));b.quaternion.multiply(q)}
  function animationController(model,clips){
    if(!Array.isArray(clips)||!clips.length)return null;
    const named=clips.map(c=>({clip:c,name:String(c.name||'').toLowerCase()}));
    const pick=(...rxs)=>named.find(x=>rxs.some(rx=>rx.test(x.name)))?.clip||null;
    const defs={
      idle:pick(/(^|[ _.-])(idle|stand|breath|breathing)([ _.-]|$)/,/idle/),
      walk:pick(/walk|walking|locomotion/),
      run:pick(/run|running|jog|jogging/),
      talk:pick(/talk|speak|conversation|gesture|chat/)
    };
    // A controller is only useful for locomotion when the file actually contains a locomotion clip.
    // Otherwise procedural bone motion remains active so static hero GLBs can still walk in-game.
    if(!defs.walk&&!defs.run)return null;
    if(!defs.walk)defs.walk=defs.run;
    if(!defs.idle)defs.idle=pick(/tpose|a-pose|pose/)||clips[0]||defs.walk;
    const mixer=new THREE.AnimationMixer(model),actions={};
    for(const [key,clip] of Object.entries(defs))if(clip){
      const action=mixer.clipAction(clip);action.enabled=true;action.setEffectiveWeight(1);action.setEffectiveTimeScale(1);actions[key]=action;
    }
    const current=actions.idle?'idle':actions.walk?'walk':Object.keys(actions)[0];
    if(!current)return null;
    actions[current].reset().play();
    return{model,mixer,actions,current,lastState:current};
  }
  function setAnimationState(ctrl,state,speed=0){
    if(!ctrl)return;
    if(state==='talk'&&!ctrl.actions.talk)state='idle';
    if(state==='run'&&!ctrl.actions.run)state='walk';
    if(state==='walk'&&!ctrl.actions.walk)state='idle';
    if(!ctrl.actions[state])state=ctrl.actions.idle?'idle':Object.keys(ctrl.actions)[0];
    if(ctrl.current!==state){
      const prev=ctrl.actions[ctrl.current],next=ctrl.actions[state];
      if(next){next.reset().setEffectiveWeight(1).fadeIn(.16).play();if(prev&&prev!==next)prev.fadeOut(.16);ctrl.current=state}
    }
    const a=ctrl.actions[ctrl.current];
    if(a){
      const ts=ctrl.current==='walk'?clamp(speed/1.45,.68,1.55):ctrl.current==='run'?clamp(speed/2.65,.76,1.35):1;
      a.setEffectiveTimeScale(ts);
    }
  }
  function disposeAnimator(root){
    const ctrl=root?.userData?.animator;if(!ctrl)return;
    try{ctrl.mixer.stopAllAction();ctrl.mixer.uncacheRoot(ctrl.model)}catch(_e){}
    root.userData.animator=null;
  }
  function removeInteractiveDescendants(group){const set=new Set();group.traverse(o=>{if(o.isMesh)set.add(o)});for(let i=interactive.length-1;i>=0;i--)if(set.has(interactive[i]))interactive.splice(i,1)}
  function tintPremiumModel(model,kind,seed,gender='male'){
    const p=paletteFor(kind,seed),h=hashStr(seed),female=gender==='female';
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=true;o.receiveShadow=true;o.userData.sharedGeometry=true;
      if(o.material){
        const original=o.material;o.material=Array.isArray(original)?original.map(m=>m.clone()):original.clone();
        const mats=Array.isArray(o.material)?o.material:[o.material];
        for(const m of mats){
          const n=(m.name||'').toLowerCase();
          if(/studio floor/.test(n)){o.visible=false;continue}
          // The public female Quaternius model already has a full textured body. Do not
          // multiply its single body material by a jacket colour because that also tints skin.
          if(female&&/superhero_female/.test(n)){if(m.color)m.color.setHex(0xffffff)}
          else if(/skin|peach/.test(n)){if(m.color)m.color.setHex(p.skin)}
          else if(/blue|tuxedo|wool|jacket/.test(n)){if(m.color)m.color.setHex(p.jacket)}
          else if(/trouser|pants/.test(n)){if(m.color)m.color.setHex(p.pants)}
          else if(/hair/.test(n)){if(m.color)m.color.setHex(p.hair)}
          else if(/hardware|silver/.test(n)){if(m.color)m.color.setHex(kind==='player'?0xd8ac43:0xb8a06b)}
          else if(/shirt/.test(n)){if(m.color)m.color.setHex(0xf2eee6)}
          else if(/lapel|piping|shoe/.test(n)){if(m.color)m.color.setHex(0x090b0e)}
          if(m.roughness!==undefined)m.roughness=Math.min(.78,Math.max(.18,m.roughness));
          if('envMapIntensity' in m)m.envMapIntensity=Math.min(1.5,Math.max(.65,m.envMapIntensity||1));
        }
      }
      const mn=(o.name||'').toLowerCase();
      if((/sunglass|lens/.test(mn)||/lens/.test((Array.isArray(o.material)?o.material[0]?.name:o.material?.name||'').toLowerCase()))&&(kind!=='customer'||h%4!==0))o.visible=false;
    });
  }
  function normalizePremiumModel(model,height=1.78){
    model.updateMatrixWorld(true);let box3=new THREE.Box3().setFromObject(model),size=box3.getSize(new THREE.Vector3());const scale=height/Math.max(.1,size.y);model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);box3=new THREE.Box3().setFromObject(model);const center=box3.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y-=box3.min.y;return model;
  }
  function addFemaleStyle(model,seed){
    const h=hashStr(seed),head=model.getObjectByName('Head')||model.getObjectByName('head');
    if(head&&h%2===0){
      const mat=new THREE.MeshStandardMaterial({color:paletteFor('customer',seed).hair,roughness:.88});
      for(const x of [-.085,.085]){const strand=new THREE.Mesh(new THREE.CapsuleGeometry(.018,.26,5,9),mat);strand.position.set(x,-.02,-.09);strand.rotation.z=x<0?-.08:.08;strand.castShadow=true;head.add(strand)}
    }
  }
  function addBusinessOverlay(model,kind,gender,seed){
    if(gender!=='female'||kind==='customer')return;
    // Light non-skinned business accents only; keep them close to the torso so the rigged
    // base body remains the deforming silhouette. Final owner_f.glb can replace all of this.
    const p=paletteFor(kind,seed),root=new THREE.Group();root.name='GSS_BusinessOverlay';
    const jacket=new THREE.MeshPhysicalMaterial({color:kind==='player'?0x6a1f31:p.jacket,roughness:.48,clearcoat:.08});
    const shirt=new THREE.MeshStandardMaterial({color:0xf4f0e8,roughness:.70});
    const gold=new THREE.MeshStandardMaterial({color:0xd9aa45,metalness:.86,roughness:.20});
    const panel=new THREE.Mesh(new THREE.CapsuleGeometry(.17,.30,8,16),jacket);panel.scale.set(1.05,1,.62);panel.position.set(0,1.18,-.005);panel.castShadow=true;root.add(panel);
    const inset=new THREE.Mesh(new THREE.BoxGeometry(.11,.27,.018),shirt);inset.position.set(0,1.25,.106);root.add(inset);
    const pin=new THREE.Mesh(new THREE.SphereGeometry(.018,10,8),gold);pin.position.set(.10,1.31,.121);root.add(pin);
    model.add(root);
  }
  function genderForAgent(kind,id,name=''){
    if(kind==='player')return state.ownerGender==='female'?'female':'male';
    if(kind==='staff'){
      const row=(state.staff||[]).find(x=>'staff:'+x.id===id);
      if(row?.gender==='female'||row?.gender==='male')return row.gender;
    }
    const n=String(name||'').trim().toLowerCase();
    if(n.startsWith('chị ')||n.startsWith('cô ')||n.startsWith('bà '))return'female';
    if(n.startsWith('anh ')||n.startsWith('chú ')||n.startsWith('ông '))return'male';
    return hashStr(id+'|'+name)%2?'female':'male';
  }
  function loadGLTF(loader,url){return new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject))}
  async function loadFirstGLTF(loader,urls){
    let lastErr=null;
    for(const url of urls){
      try{return{gltf:await loadGLTF(loader,url),url}}catch(err){lastErr=err;console.warn('Character source failed:',url,err?.message||err)}
    }
    throw lastErr||new Error('No character source available');
  }
  async function loadPremiumAvatars(){
    if(avatarAssets.loading)return;avatarAssets.loading=true;
    try{
      const [{GLTFLoader},SkeletonUtils]=await Promise.all([
        import('https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/loaders/GLTFLoader.js/+esm'),
        import('https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/utils/SkeletonUtils.js/+esm')
      ]);
      const manager=new THREE.LoadingManager();manager.setURLModifier(url=>url.replace(/_png(\.[^./?]+)(\?.*)?$/,'$1$2'));
      const loader=new GLTFLoader(manager);avatarAssets.clone=SkeletonUtils.clone;
      const tasks=['male','female'].map(async gender=>{
        try{const {gltf,url}=await loadFirstGLTF(loader,CHARACTER_URLS[gender]);avatarAssets.templates[gender]=gltf.scene;avatarAssets.clips[gender]=Array.isArray(gltf.animations)?gltf.animations:[];avatarAssets.sources[gender]=url.startsWith('./')?'local-final':'public-rig'}
        catch(err){avatarAssets.sources[gender]='fallback';console.warn(`No ${gender} rigged character loaded; keeping local humanoid fallback.`,err)}
      });
      await Promise.all(tasks);avatarAssets.ready=!!(avatarAssets.templates.male||avatarAssets.templates.female);avatarAssets.loading=false;
      for(const a of agents.values())upgradeAgentModel(a,true);
      const loaded=['male','female'].filter(g=>avatarAssets.templates[g]).map(g=>`${g}:${avatarAssets.sources[g]}`).join(' · ');
      log3(loaded?`Nhân vật rigged đã sẵn sàng (${loaded}).`:'Đang dùng humanoid local tối ưu; không phụ thuộc mannequin cũ.');
    }catch(err){avatarAssets.error=String(err?.message||err);avatarAssets.loading=false;console.warn('Premium avatar loader unavailable, using built-in humanoid rig:',err)}
  }
  function clearAgentVisual(root){
    removeInteractiveDescendants(root);disposeAnimator(root);
    while(root.children.length){const c=root.children.pop();c.parent=null;disposeObject(c)}
    root.userData.premium=false;
  }
  function installFallbackVisual(a){
    const donor=createFallbackCharacter(a.kind,a.id,a.gender);const rig=donor.userData.rig;
    while(donor.children.length){const c=donor.children.shift();a.group.add(c)}
    a.group.userData.rig=rig;a.group.userData.premium=false;a.group.userData.assetSource='local-humanoid';attachEntity(a.group,{type:'agent',id:a.id});
  }
  function upgradeAgentModel(a,force=false){
    if(!a?.group)return false;const tpl=avatarAssets.templates[a.gender];if(!tpl)return false;
    if(a.group.userData.premium&&!force&&a.group.userData.premiumGender===a.gender)return true;
    const root=a.group;clearAgentVisual(root);
    const model=avatarAssets.clone(tpl);tintPremiumModel(model,a.kind,a.id,a.gender);normalizePremiumModel(model,a.kind==='player'?(a.gender==='female'?1.68:1.78):a.kind==='staff'?(a.gender==='female'?1.65:1.73):(a.gender==='female'?1.63:1.70));
    if(a.kind==='customer'&&a.gender==='female')addFemaleStyle(model,a.id);addBusinessOverlay(model,a.kind,a.gender,a.id);root.add(model);
    const rig=collectBoneMap(model);root.userData.rig={external:true,bones:rig.bones,neutral:rig.neutral,phase:(hashStr(a.id)%100)/100*Math.PI*2,motionBlend:0,talkBlend:0,gaitPhase:0};
    root.userData.animator=animationController(model,avatarAssets.clips[a.gender]||[]);
    root.userData.premium=true;root.userData.premiumGender=a.gender;root.userData.assetSource=avatarAssets.sources[a.gender];attachEntity(root,{type:'agent',id:a.id});return true;
  }
  function rebuildAgentVisual(a){
    if(!a?.group)return;clearAgentVisual(a.group);a.gender=genderForAgent(a.kind,a.id,a.name);installFallbackVisual(a);if(avatarAssets.templates[a.gender])upgradeAgentModel(a,true);
  }
  function makeCharacter(kind,id,gender){const g=createFallbackCharacter(kind,id,gender);g.userData.kind=kind;g.userData.assetSource='local-humanoid';return g}
  function animateCharacter(group,dt,time,moving=false,talking=false,energy=100,speed=0){
    const r=group.userData.rig;if(!r)return;const phase=r.phase||0,fatigue=clamp(energy/100,.48,1);
    const ctrl=group.userData.animator;
    if(ctrl){
      const next=talking&&ctrl.actions.talk?'talk':moving?(speed>2.35&&ctrl.actions.run?'run':'walk'):'idle';
      setAnimationState(ctrl,next,speed);ctrl.mixer.update(dt);group.position.y=0;return;
    }
    r.motionBlend=damp(r.motionBlend||0,moving?1:0,moving?8.5:11.5,dt);
    r.talkBlend=damp(r.talkBlend||0,talking?1:0,talking?10:13,dt);
    const speedNorm=clamp(speed/2.2,0,1),stride=r.motionBlend*(.18+.32*speedNorm)*fatigue;
    r.gaitPhase=(r.gaitPhase||0)+dt*(2.6+5.0*speedNorm)*Math.max(.15,r.motionBlend);
    const s=r.gaitPhase+phase,idle=Math.sin(time*1.15+phase),talk=r.talkBlend;
    if(r.external){
      const swing=Math.sin(s),kneeL=Math.max(0,-swing),kneeR=Math.max(0,swing);
      setBoneDelta(r,'thigh_l',swing*stride,0,0);setBoneDelta(r,'thigh_r',-swing*stride,0,0);
      setBoneDelta(r,'calf_l',kneeL*.34*r.motionBlend,0,0);setBoneDelta(r,'calf_r',kneeR*.34*r.motionBlend,0,0);
      setBoneDelta(r,'upperarm_l',-swing*stride*.52,0,.025*idle*(1-r.motionBlend));
      setBoneDelta(r,'upperarm_r',swing*stride*.52-talk*.10,0,-talk*.18+.025*idle*(1-r.motionBlend));
      setBoneDelta(r,'lowerarm_l',-.08*r.motionBlend,0,0);setBoneDelta(r,'lowerarm_r',-.08*r.motionBlend-talk*.25,0,-talk*.12);
      setBoneDelta(r,'spine_01',.012*idle*(1-r.motionBlend),0,0);
      setBoneDelta(r,'spine_03',0,talk*Math.sin(time*2.0+phase)*.055+(1-talk)*Math.sin(time*.62+phase)*.010,0);
      setBoneDelta(r,'neck_01',.008*idle,Math.sin(time*.48+phase)*.055+talk*Math.sin(time*1.7+phase)*.035,0);
      group.position.y=r.motionBlend*Math.abs(Math.sin(s))*0.014+(1-r.motionBlend)*Math.sin(time*1.25+phase)*.004;
      return;
    }
    const b=r.bones,amp=Math.max(.015,stride),swing=Math.sin(s),liftL=Math.max(0,-swing),liftR=Math.max(0,swing);
    b.leftLeg.rotation.x=swing*amp;b.rightLeg.rotation.x=-swing*amp;
    if(b.leftKnee)b.leftKnee.rotation.x=liftL*amp*.92;if(b.rightKnee)b.rightKnee.rotation.x=liftR*amp*.92;
    b.leftArm.rotation.x=-swing*amp*.68;b.rightArm.rotation.x=swing*amp*.68+talk*.16;b.rightArm.rotation.z=-talk*.18;
    if(b.leftForearm)b.leftForearm.rotation.x=-.05*r.motionBlend;if(b.rightForearm)b.rightForearm.rotation.x=-.05*r.motionBlend-talk*.22;
    group.position.y=r.motionBlend*Math.abs(Math.sin(s))*.014+(1-r.motionBlend)*Math.sin(time*1.3+phase)*.004;
  }

  function attachEntity(group,data){group.userData.entity=data;group.traverse(o=>{if(o.isMesh){o.userData.entity=data;interactive.push(o)}})}
  function addAgent(id,kind,name,x,z){
    const gender=genderForAgent(kind,id,name),g=makeCharacter(kind,id,gender);g.position.set(x,0,z);scene.add(g);
    const a={id,kind,name,gender,group:g,x,z,target:null,path:[],navPath:[],navGoal:null,navRepath:0,stuckTime:0,lastNavX:x,lastNavZ:z,moving:false,eventIndex:null,profile:kind==='customer'?personaFor(id):null,lastSpeak:0,vel:{x:0,z:0},motionSpeed:0,desiredYaw:g.rotation.y,radius:kind==='player'?.30:.26,animTick:0};
    attachEntity(g,{type:'agent',id});agents.set(id,a);if(avatarAssets.templates[gender])upgradeAgentModel(a);return a;
  }
  function separationFor(a){
    let x=0,z=0;
    for(const o of agents.values()){
      if(o===a||!o.group?.parent)continue;const dx=a.x-o.x,dz=a.z-o.z,d2=dx*dx+dz*dz,min=(a.radius||.25)+(o.radius||.25)+.08;
      if(d2>.0001&&d2<min*min){const d=Math.sqrt(d2),w=(min-d)/min;x+=dx/d*w;z+=dz/d*w}
    }
    return{x,z};
  }
  function moveAgent(a,target,dt,maxSpeed=1.9){
    if(!target)return false;a.vel=a.vel||{x:0,z:0};
    const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz),arrive=.055;
    if(d<arrive&&Math.hypot(a.vel.x,a.vel.z)<.22){a.x=target.x;a.z=target.z;a.vel.x=a.vel.z=0;a.motionSpeed=0;a.group.position.x=a.x;a.group.position.z=a.z;a.moving=false;return true}
    const inv=d>.0001?1/d:0,sep=separationFor(a),slow=clamp(d/.62,.12,1),desiredSpeed=maxSpeed*slow;
    let vx=dx*inv*desiredSpeed+sep.x*.48,vz=dz*inv*desiredSpeed+sep.z*.48;
    const vm=Math.hypot(vx,vz);if(vm>maxSpeed){vx=vx/vm*maxSpeed;vz=vz/vm*maxSpeed}
    a.vel.x=damp(a.vel.x,vx,d>.45?8.5:12.5,dt);a.vel.z=damp(a.vel.z,vz,d>.45?8.5:12.5,dt);
    let nx=a.x+a.vel.x*dt,nz=a.z+a.vel.z*dt;
    if(isBlocked(nx,nz,a.radius||.25)){
      const tryX=!isBlocked(nx,a.z,a.radius||.25),tryZ=!isBlocked(a.x,nz,a.radius||.25);
      if(tryX)nz=a.z;else if(tryZ)nx=a.x;else{nx=a.x;nz=a.z;a.vel.x*=.18;a.vel.z*=.18}
    }
    const rdx=target.x-nx,rdz=target.z-nz;if(dx*rdx+dz*rdz<0&&!isBlocked(target.x,target.z,a.radius||.25)){nx=target.x;nz=target.z;a.vel.x=a.vel.z=0}
    a.x=nx;a.z=nz;a.group.position.x=nx;a.group.position.z=nz;a.motionSpeed=Math.hypot(a.vel.x,a.vel.z);a.moving=a.motionSpeed>.055;
    if(a.motionSpeed>.025){a.desiredYaw=Math.atan2(a.vel.x,a.vel.z);a.group.rotation.y=dampAngle(a.group.rotation.y,a.desiredYaw,11.5,dt)}
    return false;
  }
  function isBlocked(x,z,radius=.24){
    if(x<FLOOR.minX+radius||x>FLOOR.maxX-radius||z<FLOOR.minZ+radius||z>FLOOR.maxZ-radius)return true;
    return obstacles.some(o=>x>=o.x-radius&&x<=o.x+o.w+radius&&z>=o.z-radius&&z<=o.z+o.d+radius);
  }
  function findPath(sx,sz,gx,gz,radius=.25){
    if(isBlocked(gx,gz,radius))return[];
    const cell=.38,cols=Math.ceil((FLOOR.maxX-FLOOR.minX)/cell),rows=Math.ceil((FLOOR.maxZ-FLOOR.minZ)/cell);
    const toCell=(x,z)=>({c:clamp(Math.floor((x-FLOOR.minX)/cell),0,cols-1),r:clamp(Math.floor((z-FLOOR.minZ)/cell),0,rows-1)}),toWorld=(c,r)=>({x:FLOOR.minX+c*cell+cell/2,z:FLOOR.minZ+r*cell+cell/2});
    const nearestFree=(base,tx,tz)=>{const bw=toWorld(base.c,base.r);if(!isBlocked(bw.x,bw.z,radius))return base;let best=null,bestD=Infinity;for(let ring=1;ring<=7;ring++){for(let dc=-ring;dc<=ring;dc++)for(let dr=-ring;dr<=ring;dr++){if(Math.max(Math.abs(dc),Math.abs(dr))!==ring)continue;const c=base.c+dc,r=base.r+dr;if(c<0||r<0||c>=cols||r>=rows)continue;const w=toWorld(c,r);if(isBlocked(w.x,w.z,radius))continue;const d=(w.x-tx)**2+(w.z-tz)**2;if(d<bestD){bestD=d;best={c,r}}}if(best)return best}return base};
    const S0=toCell(sx,sz),G0=toCell(gx,gz),S=nearestFree(S0,sx,sz),G=nearestFree(G0,gx,gz),key=(c,r)=>`${c},${r}`,open=[{...S,g:0,f:0}],came=new Map(),best=new Map([[key(S.c,S.r),0]]),dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];let found=null,guard=0;
    while(open.length&&guard++<9000){open.sort((a,b)=>a.f-b.f);const n=open.shift();if(n.c===G.c&&n.r===G.r){found=n;break}for(const [dc,dr] of dirs){const c=n.c+dc,r=n.r+dr;if(c<0||r<0||c>=cols||r>=rows)continue;const w=toWorld(c,r);if(isBlocked(w.x,w.z,radius))continue;if(dc&&dr){const a1=toWorld(n.c+dc,n.r),a2=toWorld(n.c,n.r+dr);if(isBlocked(a1.x,a1.z,radius)||isBlocked(a2.x,a2.z,radius))continue}const ng=n.g+(dc&&dr?1.414:1),k=key(c,r);if(ng>=(best.get(k)??Infinity))continue;best.set(k,ng);came.set(k,{c:n.c,r:n.r});open.push({c,r,g:ng,f:ng+Math.hypot(G.c-c,G.r-r)})}}
    if(!found)return[];const cells=[];let cur={c:found.c,r:found.r};while(!(cur.c===S.c&&cur.r===S.r)){cells.push(cur);cur=came.get(key(cur.c,cur.r));if(!cur)break}cells.reverse();const raw=cells.map(c=>toWorld(c.c,c.r));raw.push({x:gx,z:gz});return smoothPath({x:sx,z:sz},raw,radius);
  }
  function segmentClear(a,b,radius=.25){
    const d=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(d/.12));
    for(let i=1;i<steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(isBlocked(x,z,radius))return false}return true;
  }
  function smoothPath(start,pts,radius=.25){
    if(!pts?.length)return[];const out=[];let anchor=start,i=0;
    while(i<pts.length){let far=i;for(let j=pts.length-1;j>=i;j--){if(segmentClear(anchor,pts[j],radius)){far=j;break}}out.push(pts[far]);anchor=pts[far];i=far+1}
    return out;
  }
  function moveAgentSmart(a,target,dt,maxSpeed=1.9){
    if(!a||!target)return false;
    a.navRepath=Math.max(0,(a.navRepath||0)-dt);
    const radius=a.radius||.25,goalDelta=a.navGoal?Math.hypot(a.navGoal.x-target.x,a.navGoal.z-target.z):Infinity;
    const direct=segmentClear({x:a.x,z:a.z},target,radius);
    if(goalDelta>.34||(!direct&&(!a.navPath?.length||a.navRepath<=0))){
      a.navGoal={x:target.x,z:target.z};a.navPath=direct?[{x:target.x,z:target.z}]:findPath(a.x,a.z,target.x,target.z,radius);a.navRepath=.55+(hashStr(a.id)%17)/100;
    }else if(direct&&(!a.navPath?.length||a.navPath.length>2)){
      a.navPath=[{x:target.x,z:target.z}];a.navGoal={x:target.x,z:target.z};
    }
    const node=a.navPath?.length?a.navPath[0]:(direct?target:null);
    if(!node){a.vel.x=damp(a.vel.x,0,10,dt);a.vel.z=damp(a.vel.z,0,10,dt);a.motionSpeed=Math.hypot(a.vel.x,a.vel.z);a.moving=a.motionSpeed>.055;return false}
    const bx=a.x,bz=a.z,done=moveAgent(a,node,dt,maxSpeed),moved=Math.hypot(a.x-bx,a.z-bz);
    if(done&&a.navPath?.length)a.navPath.shift();
    if(a.moving&&moved<.0015)a.stuckTime=(a.stuckTime||0)+dt;else a.stuckTime=Math.max(0,(a.stuckTime||0)-dt*2);
    if(a.stuckTime>.38){a.navPath=[];a.navGoal=null;a.navRepath=0;a.stuckTime=0}
    const finalDist=Math.hypot(target.x-a.x,target.z-a.z);
    if(finalDist<.07&&a.motionSpeed<.23){a.x=target.x;a.z=target.z;a.group.position.x=a.x;a.group.position.z=a.z;a.navPath=[];a.navGoal={x:target.x,z:target.z};a.moving=false;return true}
    return false;
  }
  function movePlayerTo(x,z,onArrive=null){
    if(isBlocked(x,z,.30)){const st=stations.find(s=>x>=s.x-s.w/2-.25&&x<=s.x+s.w/2+.25&&z>=s.z-s.d/2-.25&&z<=s.z+s.d/2+.25);if(st){x=st.approach.x;z=st.approach.z}else return}
    const p=state.v6.player;p.path=findPath(p.x,p.z,x,z,.30);p.onArrive=p.path.length?onArrive:null;$('#v3PathStatus')&&($('#v3PathStatus').textContent=p.path.length?'Đang di chuyển…':'Không có lối đi an toàn');
  }
  function updatePlayer(dt){const p=state.v6.player,a=agents.get('player');if(!a)return;if(!p.path?.length){a.moving=false;return}const t=p.path[0],done=moveAgent(a,t,dt,2.75);p.x=a.x;p.z=a.z;if(done){p.path.shift();if(!p.path.length){a.moving=false;$('#v3PathStatus')&&($('#v3PathStatus').textContent='Đã tới nơi');const cb=p.onArrive;p.onArrive=null;if(typeof cb==='function')cb()}}}
  function disposeObject(o){o.traverse(x=>{if(x.geometry&&!x.userData?.sharedGeometry)x.geometry.dispose?.();if(x.material){const ms=Array.isArray(x.material)?x.material:[x.material];ms.forEach(m=>m.dispose?.())}})}

  function ensureAmbientCrowd(){
    if(!state.started)return;
    const target=6;
    for(let i=0;i<target;i++){
      const id='ambient:'+i;if(agents.has(id))continue;
      const spots=[[-6.2,1.0],[-1.8,2.4],[3.0,2.5],[6.2,1.2],[-4.2,4.0],[4.4,4.0]];
      const sp=spots[i%spots.length];const a=addAgent(id,'customer',['Khách tham quan','Khách quen','Khách xem mẫu','Khách VIP','Khách gia đình','Khách mới'][i],sp[0],sp[1]);a.ambient=true;a.wanderTimer=2+i*.7;
    }
  }
  function updateAmbientCrowd(dt){
    ensureAmbientCrowd();
    const bounds=[[-6.8,-.4],[-4.2,2.5],[-1.1,3.0],[2.4,3.2],[5.7,.5],[6.2,3.8]];
    for(const a of agents.values())if(a.ambient){
      a.wanderTimer=(a.wanderTimer||0)-dt;
      if(!a.target&&a.wanderTimer<=0){const t=bounds[(hashStr(a.id+Math.floor(performance.now()/7000)))%bounds.length];a.target={x:t[0]+(Math.random()-.5)*.8,z:t[1]+(Math.random()-.5)*.7};a.wanderTimer=5+Math.random()*6}
      if(a.target&&moveAgentSmart(a,a.target,dt,.52)){a.target=null;a.wanderTimer=3+Math.random()*5}
    }
  }
  function syncAgents(dt){
    if(!state.started)return;
    const waiting=queueItems(),served=servedItem(),all=served?[served,...waiting.filter(x=>x.id!==served.id)]:waiting;const active=new Set(['player']);
    all.slice(0,12).filter(i=>PUBLIC_TYPES.has(i.type)).forEach((item,i)=>{
      const id='cust:'+item.id;active.add(id);let a=agents.get(id);if(!a){a=addAgent(id,'customer',item.name,DOOR.x+(Math.random()-.5)*.6,DOOR.z+.1);a.eventIndex=item.index;log3(`${item.name} bước vào cửa hàng.`)}
      let base=eventTargets[item.type]||{x:0,z:2.5};
      if(served&&item.id===served.id){const st=state.v3.flowStage;base=st==='scale'?stations.find(s=>s.id==='scale').approach:st==='pawn'?stations.find(s=>s.id==='pawn').approach:st==='pos'||st==='settlement'?stations.find(s=>s.id==='pos').approach:st==='showcase'?stations.find(s=>s.id==='showcase').approach:base}
      else{const browse=[{x:-4.0,z:1.65},{x:1.4,z:2.7},{x:4.7,z:2.6},{x:-5.3,z:3.7},{x:6.55,z:3.9},{x:-.2,z:4.4}];base=browse[i%browse.length]}
      const off=served&&item.id===served.id?0:Math.max(0,i-(served?1:0));const target={x:clamp(base.x+(off%3-1)*.34,-9,9),z:clamp(base.z+Math.floor(off/3)*.40,-5.8,5.6)};a.target=target;moveAgentSmart(a,target,dt,1.42);
    });
    for(const [id,a] of [...agents]){if(a.ambient)continue;if(a.kind==='customer'&&!active.has(id)){if(moveAgentSmart(a,{x:DOOR.x,z:DOOR.z+.35},dt,1.95)){scene.remove(a.group);removeInteractiveDescendants(a.group);disposeObject(a.group);agents.delete(id)}}}
    (state.staff||[]).forEach((s,i)=>{
      const id='staff:'+s.id;active.add(id);let a=agents.get(id);if(!a)a=addAgent(id,'staff',s.name,-1+i*.8,4.45);
      const home=staffTargets[s.v2Role]||{x:-.8+i*.75,z:3.2};const servedNow=servedItem(),need={sale:'Tư vấn bán hàng',buyback:'Tư vấn bán hàng',exchangeSame:'Tư vấn bán hàng',exchangeCross:'Tư vấn bán hàng',service:'Tư vấn bán hàng',lostCustomer:'Tư vấn bán hàng',pawnOpen:'Cầm đồ',pawnDue:'Cầm đồ',audit:'Thu ngân / POS',staffError:'Thu ngân / POS',priceShock:'Thu ngân / POS',supplier:'Kho / kiểm hàng',chanh:'Kho / kiểm hàng'}[state.currentEvent?.type];
      const cust=servedNow?agents.get('cust:'+servedNow.id):null;const serving=need&&s.v2Role===need&&cust;const tgt=serving?{x:cust.x-.62,z:cust.z+.38}:{x:home.x+Math.sin(performance.now()/4500+i)*.16,z:home.z+Math.cos(performance.now()/3900+i)*.13};a.energy=s.energy||100;moveAgentSmart(a,tgt,dt,1.10);if(serving&&Math.hypot(a.x-cust.x,a.z-cust.z)<1.05){facePoint(a,cust.x,cust.z);facePoint(cust,a.x,a.z)}
    });
  }

  function facePoint(a,x,z,instant=false){if(!a)return;const yaw=Math.atan2(x-a.x,z-a.z);a.desiredYaw=yaw;if(instant)a.group.rotation.y=yaw}
  function hitEntity(object){let o=object;while(o){if(o.userData?.entity)return o.userData.entity;o=o.parent}return null}
  function pointerFromEvent(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1}
  function onPointer(e){
    if(!state.started)return;pointerFromEvent(e);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(interactive,true);if(!hits.length)return;const h=hits[0],ent=hitEntity(h.object);if(!ent)return;
    if(ent.type==='floor'){selected={type:'floor',x:h.point.x,z:h.point.z};movePlayerTo(h.point.x,h.point.z);renderSide();return}
    if(ent.type==='station'){const s=stations.find(x=>x.id===ent.id);if(!s)return;selected={type:'station',id:s.id};movePlayerTo(s.approach.x,s.approach.z,()=>{const p=agents.get('player');facePoint(p,s.x,s.z,true);renderSide();log3(`Đã tới ${s.name}.`)});renderSide();return}
    if(ent.type==='agent'){const a=agents.get(ent.id);if(!a)return;selected={type:'agent',id:a.id};const p=agents.get('player'),vx=(p?.x??0)-a.x,vz=(p?.z??1)-a.z,len=Math.max(.001,Math.hypot(vx,vz)),dist=.72,tx=clamp(a.x+vx/len*dist,-9,9),tz=clamp(a.z+vz/len*dist,-5.8,5.7);movePlayerTo(tx,tz,()=>{const owner=agents.get('player');facePoint(owner,a.x,a.z,true);facePoint(a,owner?.x??tx,owner?.z??tz,true);showSpeech(a);renderSide()});renderSide()}
  }

  function speechText(a){
    if(a.kind==='staff'){const s=(state.staff||[]).find(x=>'staff:'+x.id===a.id);const mood=(s?.energy||100)<50?'Em hơi mệt, cho em nghỉ một chút nếu quầy vắng.':'Em sẵn sàng tiếp khách.';return `${a.name}: ${mood}`}
    const item=(state.liveStore?.schedule||[]).find(x=>'cust:'+x.id===a.id),ev=item?state.dayQueue?.[item.index]:null,p=a.profile||personaFor(a.id),wait=item?Math.max(0,state.clockMinutes-item.arrival):0;
    let line=p.key==='price'?'Bên kia báo giá mềm hơn, tiệm mình có hỗ trợ thêm không?':p.key==='vip'?'Tôi ưu tiên tay nghề và minh bạch, tư vấn kỹ giúp tôi.':p.key==='trend'?'Cho tôi xem mẫu đẹp, sáng và sang hơn chút.':p.key==='careful'?'Tôi muốn nghe rõ công thức tính trước khi quyết.':p.key==='urgent'?'Tôi đang hơi vội, giúp tôi làm nhanh nhé.':'Tôi cần mức thu rõ ràng và dễ hiểu.';
    if(['pawnOpen','pawnDue'].includes(ev?.type))line+=' Mức cầm này đã gồm cả lãi và phí đúng không?';if(wait>20)line+=' Tôi đợi hơi lâu rồi đó.';return `${a.name}: ${line}`;
  }
  function showSpeech(a,speakAudio=true){const el=$('#v3SpeechBubble');if(!el)return;const msg=speechText(a);el.textContent=msg;el.classList.remove('hidden');clearTimeout(showSpeech.t);showSpeech.t=setTimeout(()=>el.classList.add('hidden'),6200);if(speakAudio&&state.settings?.voice&&'speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.lang='vi-VN';u.rate=.98;speechSynthesis.speak(u)}}
  function stageForEvent(e){if(!e)return'idle';if(['buyback','exchangeSame','exchangeCross'].includes(e.type))return'scale';if(['pawnOpen','pawnDue'].includes(e.type))return'pawn';if(['sale','service','lostCustomer'].includes(e.type))return'showcase';if(['audit','staffError'].includes(e.type))return'pos';if(['supplier','chanh','info'].includes(e.type))return'showcase';if(e.type==='priceShock')return'office';return'showcase'}
  function serveNext(){if(!state.started)return;if(state.currentEvent&&!state.currentEvent.done){state.v3.flowStage=stageForEvent(state.currentEvent);renderSide();return}const q=queueItems();if(!q.length){log3('Chưa có khách tới lượt. Hãy chạy ca thêm.');return}const next=q[0];D.nextSituation();state.v3.flowStage=stageForEvent(state.currentEvent);state.v3.heldItem=false;log3(`Bắt đầu phục vụ ${next.name}: ${next.title}.`);renderSide();D.save(true)}
  function progressFlow(kind){const e=state.currentEvent;if(!e||e.done)return;if(kind==='showcase'){state.v3.heldItem=true;state.v3.flowStage='pos';log3('Đã tư vấn/lấy món. Tiếp theo tới POS.')}if(kind==='scale'){state.v3.heldItem=true;state.v3.flowStage='pos';log3('Đã cân/kiểm vàng. Tiếp theo tới POS.')}if(kind==='pawn'){state.v3.flowStage='pos';log3('Đã định giá tài sản. Tiếp theo tới POS.')}renderSide();D.save(true)}
  function openPos(){if(window.__GOLD_V45__?.canCheckout&&!window.__GOLD_V45__.canCheckout(state.currentEvent)){window.__GOLD_V45__.promptNegotiation?.();return}state.v3.flowStage='settlement';(window.__GOLD_UI__?.open||D.showView)('shop');log3('Mở máy tính quầy và POS.');D.save(true)}
  function openView(v){(window.__GOLD_UI__?.open||D.showView)(v)}
  function playerNear(x,z,range=.82){const p=agents.get('player');return !!p&&Math.hypot(p.x-x,p.z-z)<=range}
  function nearStation(s){return !!s&&playerNear(s.approach.x,s.approach.z,.62)}
  function nearAgent(a){return !!a&&playerNear(a.x,a.z,1.08)}

  function interactionHtml(){
    if(!selected)return{title:'Chọn khách hoặc quầy',body:'<div class="v3-empty">Tap khách, nhân viên hoặc một khu nghiệp vụ trong cửa hàng.</div>',actions:''};
    if(selected.type==='floor')return{title:'Di chuyển',body:'<div class="v3-object-card"><div class="v3-object-icon">👣</div><div><h4>Điểm trên sàn</h4><p>Chủ tiệm đang đi tới vị trí bạn chọn.</p></div></div>',actions:''};
    if(selected.type==='station'){
      const s=stations.find(x=>x.id===selected.id);if(!s)return{title:'Khu vực',body:'',actions:''};const st=state.v3.flowStage,e=state.currentEvent,near=nearStation(s);let flow='';
      if(near&&e&&!e.done){if((s.id==='showcase'||s.id==='showcase2')&&st==='showcase')flow='<button class="btn gold" data-v6="showcase" type="button">💍 LẤY MÓN / TƯ VẤN</button>';if(s.id==='scale'&&st==='scale')flow='<button class="btn gold" data-v6="scale" type="button">⚖ CÂN & KIỂM VÀNG</button>';if(s.id==='pawn'&&st==='pawn')flow='<button class="btn gold" data-v6="pawn" type="button">🤝 ĐỊNH GIÁ / HỢP ĐỒNG</button>';if(s.id==='pos'&&st==='pos')flow='<button class="btn gold" data-v6="pos" type="button">🧮 MÁY TÍNH + THU / CHI</button>'}
      const status=near?'Đã đứng đúng vị trí thao tác':'Đang đi tới vị trí thao tác…';
      return{title:s.name,body:`<div class="v3-object-card"><div class="v3-object-icon">${s.icon}</div><div><h4>${esc(s.name)}</h4><p>${esc(s.desc)}</p><div class="real3d-material-note">${status}</div></div></div>`,actions:near?`${flow}<button class="btn primary" data-v6="open" data-view="${s.view}" type="button">MỞ ${esc(s.name.toUpperCase())}</button>`:'<button class="btn ghost" disabled>ĐANG DI CHUYỂN…</button>'};
    }
    if(selected.type==='agent'){
      const a=agents.get(selected.id);if(!a)return{title:'Nhân vật',body:'',actions:''};
      const near=nearAgent(a);
      if(a.kind==='staff'){const s=(state.staff||[]).find(x=>'staff:'+x.id===a.id);return{title:a.name,body:`<div class="v3-object-card"><div class="v3-object-icon">🧑‍💼</div><div><h4>${esc(a.name)}</h4><p>${esc(s?.v2Role||s?.role||'Nhân viên')} · kỹ năng ${s?.skill||0}/100 · năng lượng ${Math.round(s?.energy||100)}%</p><span class="real3d-character-chip">${near?'Đủ gần để tương tác':'Đang tiếp cận nhân viên…'}</span></div></div>`,actions:near?'<button class="btn ghost" data-v6="speak" type="button">🔊 NÓI CHUYỆN</button><button class="btn primary" data-v6="open" data-view="management" type="button">QUẢN LÝ NHÂN VIÊN</button>':'<button class="btn ghost" disabled>ĐANG TIẾP CẬN…</button>'}}
      const item=(state.liveStore?.schedule||[]).find(x=>'cust:'+x.id===a.id),isNext=item&&!state.currentEvent&&queueItems()[0]?.id===item.id,being=item&&servedItem()?.id===item.id;
      const actions=near?`<button class="btn ghost" data-v6="speak" type="button">🔊 NGHE YÊU CẦU</button>${being?'<button class="btn ghost" disabled>ĐANG PHỤC VỤ</button>':isNext?'<button class="btn primary" data-v6="serve" type="button">PHỤC VỤ KHÁCH NÀY</button>':'<button class="btn ghost" disabled>ĐANG CHỜ</button>'}`:'<button class="btn ghost" disabled>ĐANG TIẾP CẬN…</button>';
      return{title:a.name,body:`<div class="v3-object-card"><div class="v3-object-icon">👤</div><div><h4>${esc(a.name)}</h4><p>${esc(speechText(a).replace(a.name+': ',''))}</p><div class="v3-object-meta"><span>${esc(a.profile?.label||item?.title||'Khách')}</span><span>Kiên nhẫn ${Math.round(patience(item))}%</span></div><span class="real3d-character-chip">${near?'Đủ gần để tương tác':'Đang tiếp cận khách…'}</span></div></div>`,actions};
    }
    return{title:'Tương tác',body:'',actions:''};
  }

  function renderQueue(){const el=$('#v3Queue');if(!el)return;const q=queueItems();el.innerHTML=q.length?q.slice(0,6).map((x,i)=>`<div class="v3-q"><div class="face">${x.avatar||'👤'}</div><div><strong>${esc(x.name)}</strong><small>${esc(x.title)}</small></div><b>${i?'#'+(i+1):Math.round(patience(x))+'%'}</b></div>`).join(''):'<div class="v3-empty">Chưa có khách tới quầy.</div>'}
  function renderWorkflow(){const el=$('#v3Workflow');if(!el)return;const e=state.currentEvent,steps=e?[['Gặp khách','Tap khách'],[e.type==='pawnOpen'||e.type==='pawnDue'?'Cầm đồ':(['buyback','exchangeSame','exchangeCross'].includes(e.type)?'Cân vàng':'Tủ trưng bày'),'Nghiệp vụ'],['POS','Tính tiền'],['Hoàn tất','Phiếu + CRM']]:[['Đón khách','Chạy ca'],['Tiếp cận','Tap nhân vật'],['Nghiệp vụ','Tap quầy'],['Thanh toán','POS']];const st=state.v3.flowStage||'idle',idx=st==='customer'?0:['showcase','scale','pawn'].includes(st)?1:st==='pos'||st==='settlement'?2:st==='done'?3:0;el.innerHTML=steps.map((x,i)=>`<div class="v3-step ${e&&!e.done&&i===idx?'active':''} ${(e?.done||i<idx)?'done':''}"><i>${i+1}</i><div><strong>${x[0]}</strong><small>${x[1]}</small></div></div>`).join('')}
  function renderSide(){if(!state.started)return;$('#v3Clock')&&($('#v3Clock').textContent=clockText());$('#v3Cash')&&($('#v3Cash').textContent=short(state.cash));$('#v3Stock')&&($('#v3Stock').textContent=`${state.inventoryItems?.filter(x=>x.status==='in_stock').length||0} SKU`);$('#v3CustomerCount')&&($('#v3CustomerCount').textContent=String(queueItems().length));$('#v3StaffCount')&&($('#v3StaffCount').textContent=String(state.staff?.length||0));const running=!!state.liveStore?.running;if($('#v3OpenBadge')){$('#v3OpenBadge').textContent=running?`ĐANG CHẠY x${state.liveStore.speed||1}`:'TẠM DỪNG';$('#v3OpenBadge').className='v3-open-badge '+(running?'running':'paused')}if($('#v3StoreTitle'))$('#v3StoreTitle').textContent=`${state.storeName||'TIỆM VÀNG CỦA BẠN'} · 3D`;$$('.v3-speed').forEach(b=>b.classList.toggle('active',Number(b.dataset.v3Speed)===(state.liveStore?.speed||1)));const d=interactionHtml();if($('#v3InteractTitle'))$('#v3InteractTitle').textContent=d.title;if($('#v3InteractBody'))$('#v3InteractBody').innerHTML=d.body;if($('#v3InteractActions'))$('#v3InteractActions').innerHTML=d.actions;renderQueue();renderWorkflow()}
  function updateBrand(){if(!brandSign)return;const name=(state.storeName||'TIỆM VÀNG CỦA BẠN').toUpperCase();const newSign=canvasLabel(name,'GOLD SHOP SIMULATOR · PREMIUM STORE');newSign.position.copy(brandSign.position);newSign.rotation.copy(brandSign.rotation);newSign.scale.copy(brandSign.scale);scene.remove(brandSign);brandSign.material.map.dispose();brandSign.material.dispose();brandSign=newSign;scene.add(brandSign)}

  function applyCameraPreset(name='overview',instant=false){
    const p=cameraPresets[name]||cameraPresets.overview;cameraPreset=name;state.v6.cameraPreset=name;cameraLookGoal.copy(p.target);cameraTarget.copy(p.target);const relative=p.pos.clone().sub(p.target).multiplyScalar(1/zoomFactor);cameraGoal.copy(p.target).add(relative);camera.fov=p.fov;camera.updateProjectionMatrix();if(instant){camera.position.copy(cameraGoal);camera.lookAt(cameraTarget)}D.save?.(true);
  }
  function setZoom(next){zoomFactor=clamp(next,.84,1.18);state.v6.zoomFactor=zoomFactor;applyCameraPreset(cameraPreset,false)}
  function focusStation(id){const map={showcase:'showcase',showcase2:'showcase',scale:'scale',pawn:'pawn',pos:'pos',warehouse:'overview',office:'overview',safe:'overview'};applyCameraPreset(map[id]||'overview',false)}
  function updateCamera(){applyCameraPreset(state.v6.cameraPreset||'overview',false)}

  function ambientSpeech(dt){if(!state.liveStore?.running)return;ambientTimer-=dt*(state.liveStore.speed||1);if(ambientTimer>0)return;ambientTimer=8+Math.random()*10;const pool=[...agents.values()].filter(a=>a.kind==='customer'||a.kind==='staff');if(!pool.length)return;const a=pool[Math.floor(Math.random()*pool.length)];showSpeech(a,false)}
  function animate(dt,time){
    const player=agents.get('player'),wanted=state.ownerGender==='female'?'female':'male';if(player&&player.gender!==wanted)rebuildAgentVisual(player);
    updatePlayer(dt);syncAgents(dt);updateAmbientCrowd(dt);ambientSpeech(dt);
    for(const a of agents.values()){
      const energy=a.kind==='staff'?((state.staff||[]).find(x=>'staff:'+x.id===a.id)?.energy||100):100,talking=selected?.type==='agent'&&selected.id===a.id;
      const dx=a.x-cameraTarget.x,dz=a.z-cameraTarget.z,far=dx*dx+dz*dz>90;a.animTick=(a.animTick||0)+dt;if(!far||a.kind==='player'||a.animTick>.066){animateCharacter(a.group,far?a.animTick:dt,time,a.moving,talking,energy,a.motionSpeed||0);a.animTick=0}
    }
    if(state.currentEvent?.done&&state.v3.flowStage!=='done'){state.v3.flowStage='done';state.v3.heldItem=false}
  }
  async function setupPostFX(){
    const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4,small=Math.min(window.innerWidth||1280,window.innerHeight||720)<640;
    if(cores<4||mem<4||small){composer=null;qualityLabel='PERFORMANCE';log3('PostFX đã tự giảm để giữ FPS ổn định trên thiết bị này.');return}
    try{
      const [{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass}]=await Promise.all([
        import('https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/postprocessing/EffectComposer.js/+esm'),
        import('https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/postprocessing/RenderPass.js/+esm'),
        import('https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/postprocessing/UnrealBloomPass.js/+esm'),
        import('https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/postprocessing/OutputPass.js/+esm')
      ]);
      composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
      const bloom=new UnrealBloomPass(new THREE.Vector2(1200,700),.22,.28,.88);bloom.threshold=.86;bloom.strength=.22;bloom.radius=.22;composer.addPass(bloom);composer.addPass(new OutputPass());resize();
      log3('Cinematic post-processing đã bật.');
    }catch(err){composer=null;console.warn('PostFX unavailable',err)}
  }

  function resize(){if(!renderer||!stage)return;const r=stage.getBoundingClientRect(),w=Math.max(320,r.width),h=Math.max(360,r.height);renderer.setPixelRatio(qualityDpr);renderer.setSize(w,h,false);composer?.setSize?.(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
  function updateAdaptiveQuality(dt){
    qualityTimer+=dt;if(qualityTimer<1.25)return;qualityTimer=0;
    const native=Math.min(1.6,window.devicePixelRatio||1),prev=qualityDpr;
    if(fps<46)qualityDpr=Math.max(.80,qualityDpr-.14);else if(fps>58)qualityDpr=Math.min(native,qualityDpr+.07);
    qualityLabel=qualityDpr>=1.5?'HIGH':qualityDpr>=1.1?'BALANCED':'PERFORMANCE';
    if(Math.abs(prev-qualityDpr)>.02)resize();
  }
  function frame(){
    // Keep simulation speed correct when the renderer falls below 30 FPS. Instead of throwing
    // away elapsed time, split a long frame into small deterministic simulation steps.
    const rawDt=Math.min(.075,clock.getDelta()),time=performance.now()/1000;
    if(!document.hidden){
      const steps=Math.min(4,Math.max(1,Math.ceil(rawDt/.020))),step=rawDt/steps;
      for(let i=0;i<steps;i++)animate(step,time-rawDt+step*(i+1));
      const camA=dampAlpha(7.5,rawDt),lookA=dampAlpha(9.5,rawDt);camera.position.lerp(cameraGoal,camA);cameraTarget.lerp(cameraLookGoal,lookA);camera.lookAt(cameraTarget);(composer?composer.render():renderer.render(scene,camera));
      fpsFrames++;const now=performance.now();if(now-fpsLast>1000){fps=Math.round(fpsFrames*1000/(now-fpsLast));fpsFrames=0;fpsLast=now;updateAdaptiveQuality(1.0);const p=$('#real3dPerf');if(p){const pl=agents.get('player'),src=pl?.group?.userData?.assetSource||'local-humanoid';p.textContent=`${fps} FPS · ${qualityLabel} · ${src==='local-final'?'FINAL GLB':src==='public-rig'?'RIGGED GLB':'LOCAL RIG'}`}}if(now-lastUiTick>500){lastUiTick=now;renderSide();}
    }
    raf=requestAnimationFrame(frame)
  }

  function bind(){
    renderer.domElement.addEventListener('pointerdown',onPointer);
    window.addEventListener('resize',resize);
    document.addEventListener('visibilitychange',()=>{clock.getDelta();fpsFrames=0;fpsLast=performance.now()});
    if('ResizeObserver' in window){resizeObs=new ResizeObserver(resize);resizeObs.observe(stage)}
    $('#v3PlayBtn')?.addEventListener('click',()=>{if(!state.started)return;state.liveStore.running=true;renderSide()});$('#v3PauseBtn')?.addEventListener('click',()=>{state.liveStore.running=false;renderSide()});
    $$('.v3-speed').forEach(b=>b.addEventListener('click',()=>{state.liveStore.speed=Number(b.dataset.v3Speed)||1;renderSide()}));
    $('#v3CameraBtn')?.addEventListener('click',()=>{const order=['overview','showcase','scale','pawn','pos'];const i=order.indexOf(cameraPreset);applyCameraPreset(order[(i+1)%order.length])});
    $('#v3ZoomIn')?.addEventListener('click',()=>setZoom(zoomFactor+.045));$('#v3ZoomOut')?.addEventListener('click',()=>setZoom(zoomFactor-.045));
    renderer.domElement.addEventListener('wheel',e=>{if(!state.started)return;e.preventDefault();setZoom(zoomFactor+(e.deltaY<0?.045:-.045))},{passive:false});
    $('#v3ServeNext')?.addEventListener('click',serveNext);$('#v3CenterPlayer')?.addEventListener('click',()=>{const a=agents.get('player');if(a){cameraLookGoal.set(a.x,1.15,a.z);const base=cameraPresets.overview.pos.clone().sub(cameraPresets.overview.target).normalize().multiplyScalar(10.5);cameraGoal.copy(cameraLookGoal).add(base)}});
    $('#v3BriefBtn')?.addEventListener('click',()=>{const msg=`Ngày ${state.day}, ${clockText()}. Cửa hàng ${state.storeName||''} có ${queueItems().length} khách chờ, ${state.staff?.length||0} nhân viên, tiền mặt ${short(state.cash)}.`;if(state.settings?.voice&&'speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.lang='vi-VN';speechSynthesis.speak(u)}});
    $('#v3InteractActions')?.addEventListener('click',e=>{const b=e.target.closest('[data-v6]');if(!b)return;const a=b.dataset.v6;if(selected?.type==='station'){const st=stations.find(x=>x.id===selected.id);if(st&&!nearStation(st))return}if(selected?.type==='agent'){const ag=agents.get(selected.id);if(ag&&!nearAgent(ag))return}if(a==='open')openView(b.dataset.view);if(a==='showcase')progressFlow('showcase');if(a==='scale')progressFlow('scale');if(a==='pawn')progressFlow('pawn');if(a==='pos')openPos();if(a==='serve')serveNext();if(a==='speak'&&selected?.type==='agent'){const ag=agents.get(selected.id);if(ag)showSpeech(ag)}});
    $('#saveBtn')?.addEventListener('click',()=>setTimeout(updateBrand,50));$('#storeNameInput')?.addEventListener('change',()=>setTimeout(updateBrand,60));
  }

  function init(){
    ensureState();stage=document.createElement('div');stage.id='threeStage';const wrap=$('#v3CanvasWrap');if(!wrap)return;wrap.prepend(stage);const loader=document.createElement('div');loader.className='real3d-loader';loader.textContent='ĐANG DỰNG SHOWROOM 3D…';stage.appendChild(loader);
    scene=new THREE.Scene();scene.background=new THREE.Color(0x24170e);scene.fog=new THREE.Fog(0x2a1b10,34,72);
    camera=new THREE.PerspectiveCamera(31,1,.1,100);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});qualityDpr=Math.min(1.6,window.devicePixelRatio||1);renderer.setPixelRatio(qualityDpr);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;if('useLegacyLights'in renderer)renderer.useLegacyLights=false;stage.appendChild(renderer.domElement);
    raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();materials=makeMaterials();warmEnvironment();setupLights();buildStore();
    const player=addAgent('player','player',state.ownerName||'BẠN',state.v6.player.x,state.v6.player.z);attachEntity(player.group,{type:'agent',id:'player'});
    applyCameraPreset(state.v6.cameraPreset||'overview',true);resize();bind();
    const badge=document.createElement('div');badge.className='real3d-badge';badge.innerHTML='<i></i><span>V1.2 · MOTION ACCURACY · ANIM MIXER · NAV</span>';wrap.appendChild(badge);const perf=document.createElement('div');perf.id='real3dPerf';perf.className='real3d-perf';perf.textContent='Cửa hàng đang hoạt động';wrap.appendChild(perf);
    document.body.classList.add('real3d-ready');loader.remove();renderSide();
    window.__GOLD_3D__={agents,queueItems,renderSide,selected:()=>selected,movePlayerTo,stationDefs:stations,renderer,scene,camera,serveNext,focusStation};
    window.__GOLD_REAL3D__={renderer,scene,camera,stations,updateBrand,updateCamera,cameraTarget,cameraGoal,cameraPresets,applyCameraPreset,setZoom,focusStation};
    raf=requestAnimationFrame(frame);log3('V1.2 Character Motion & Accuracy runtime đã khởi tạo.');
    setTimeout(loadPremiumAvatars,250);setTimeout(loadDecorAssets,550);setTimeout(setupPostFX,900);
  }

  try{init()}catch(err){
    console.error('Premium Real3D init failed',err);window.__REAL3D_ENABLED__=false;const wrap=$('#v3CanvasWrap');if(wrap){const n=document.createElement('div');n.className='real3d-loader';n.innerHTML='Không thể khởi tạo WebGL. Đang chuyển renderer dự phòng…';wrap.appendChild(n);setTimeout(()=>n.remove(),1800)}const fallback=document.createElement('script');fallback.src='./v3.js';document.body.appendChild(fallback);
  }
})();
