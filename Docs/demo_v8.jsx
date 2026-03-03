import { useState, useCallback } from "react";

// ═══ DESIGN TOKENS ═══
const C = {
  navy: "#1B3A5C", navyD: "#132B45", navyL: "#2C5282",
  gold: "#F0A500", goldL: "#FFF8E1",
  bg: "#ECEEF1", card: "#FFFFFF",
  txt: "#1A202C", sub: "#5A6272", muted: "#A0AAB8",
  ok: "#1A7F5A", okBg: "#E6F7F1",
  warn: "#B45309", warnBg: "#FEF3C7",
  err: "#C0392B", errBg: "#FEE8E8",
  blue: "#0A6EBD", blueBg: "#EBF4FF",
  purple: "#553C9A", purpleBg: "#F0EBFF",
  bdr: "#D9DDE6", inp: "#F7F8FA", rowAlt: "#F9FAFB",
};

const stC = { Borrador: C.muted, Enviada: C.blue, "En Proceso": C.warn, Programada: C.purple, "En Ejecución": C.gold, Completada: C.ok, Parcial: C.purple, Cancelada: "#95A5A6" };

// ═══ REAL ICONSA DATA ═══
const PROYECTOS = [
  { id: 1, codigo: "25-506", nombre: "Muelle 14", gerente: "Franklin Marciaga" },
  { id: 2, codigo: "25-505", nombre: "Paraíso", gerente: "César Caballero" },
  { id: 3, codigo: "25-504", nombre: "ASTIBAL", gerente: "Ariel González" },
  { id: 4, codigo: "24-404", nombre: "Costa Norte", gerente: "César Caballero" },
];
const PERSONAS = ["Edward Rodríguez","Jenniffer Troetsch","Hector Pino","Juan Jácome","David Ríos","Madeleine Lange","Carlos Charris","José Miguel","Yoseph Caballero"];
const CONDUCTORES = ["Coco","Bonilla","Monchi","Rafael","Pedro"];
const EQUIPOS = [
  { codigo: "CRN001", desc: "Grúa 318 – Liebherr LTM 1060", tipo: "Grúa" },
  { codigo: "CRN002", desc: "Grúa 108 – Grove GMK 3050", tipo: "Grúa" },
  { codigo: "EXC001", desc: "Excavadora CAT 320", tipo: "Equipo Pesado" },
  { codigo: "BOM413", desc: "Vibro-compactador Bomag", tipo: "Equipo Pesado" },
  { codigo: "CPR654", desc: "Compresor Atlas 250 CFM", tipo: "Equipo Liviano" },
  { codigo: "GEN021", desc: "Generador CAT 200KW", tipo: "Equipo Pesado" },
  { codigo: "MAR003", desc: "Barcaza IBC-03 Flexifloat", tipo: "Equipo Marino" },
];
const VEHICULOS = [
  { codigo: "CAB930", desc: "Cabezal Mack 350HP", tipo: "Cabezal" },
  { codigo: "CAB444", desc: "Cabezal Mack 450HP", tipo: "Cabezal" },
  { codigo: "CAM430", desc: "Camión Plataforma 4T – Hino", tipo: "Plataforma" },
  { codigo: "CAM823", desc: "Camión Grúa – Internacional", tipo: "Camión Grúa" },
  { codigo: "REM001", desc: "Cama Baja 50 Ton", tipo: "Remolque" },
  { codigo: "REM002", desc: "Cama Baja 75 Ton", tipo: "Remolque" },
  { codigo: "REM003", desc: "Tilt-Top", tipo: "Remolque" },
  { codigo: "PLT001", desc: "Canter Plataforma", tipo: "Plataforma" },
];
const UBICACIONES = ["Taller Chilibre","Almacén Central","Muelle 14","Proyecto Paraíso","ASTIBAL","Costa Norte","Gamboa","Oficina Central"];
const UNIDADES = ["und","ml","m²","m³","kg","ton","gal","juegos","pzas","ft","qq"];
const FASES = [
  { code: "01-7113", desc: "Movilización" },
  { code: "01-3100", desc: "Gestión de Proyecto" },
  { code: "01-3110", desc: "Personal de Campo" },
  { code: "01-5200", desc: "Campamento" },
  { code: "01-3526", desc: "Seguridad Ocupacional" },
  { code: "02-4116", desc: "Demolición" },
  { code: "03-0000", desc: "Concreto" },
];
const CATEGORIAS = ["ICS","EQI","EQA","MAT","SAL","OTR","CON","SUB"];
const TARIFAS = [
  { cod: "MVG108", desc: "Mov. Grúa 108", tarifa: 2000 },
  { cod: "MVG318", desc: "Mov. Grúa 318", tarifa: 3000 },
  { cod: "MVPLAT", desc: "Mov. Canter Plataforma", tarifa: 200 },
  { cod: "MVTTOP", desc: "Mov. Tilt-Top", tarifa: 350 },
  { cod: "MVCALT", desc: "Mov. Cama Alta", tarifa: 425 },
  { cod: "MVCB50", desc: "Mov. Cama Baja 50", tarifa: 500 },
  { cod: "MVCB75", desc: "Mov. Cama Baja 75", tarifa: 600 },
  { cod: "MVCEXT", desc: "Mov. Mesa Extendible", tarifa: 550 },
  { cod: "MVLPUP", desc: "Mov. Pick-up", tarifa: 75 },
  { cod: "MVCGRU", desc: "Mov. Camión Grúa", tarifa: 300 },
  { cod: "MVGSNY", desc: "Mov. Grúa Sany", tarifa: 11000 },
];
const OC_DATA = [
  { num: "OC-29721", prov: "Tubotec S.A.", lineas: [
    { n:1, desc:"Tubos tremi 12m", cantOrd:10, cantAten:10, und:"und", done:true },
    { n:2, desc:"Tubos tremi 8m", cantOrd:10, cantAten:5, und:"und", done:false },
    { n:3, desc:"Jaula armada ø600mm", cantOrd:5, cantAten:0, und:"und", done:false },
  ]},
  { num: "OC-29685", prov: "Ferretería Panamá", lineas: [
    { n:1, desc:"Cemento Portland 50kg", cantOrd:300, cantAten:100, und:"und", done:false },
    { n:2, desc:"Varilla 5/8\"", cantOrd:50, cantAten:0, und:"qq", done:false },
  ]},
];

// ═══ SAMPLE TRANSACTIONAL DATA ═══
const SOLICITUDES = [
  { id:"25-506-SM-023", proy:"25-506", proyNom:"Muelle 14", sol:"Edward Rodríguez", fCreada:"15/02/2026", fReq:"20/02/2026", st:"Enviada", notas:"Urgente para inicio pilotaje", adjuntos:["plano_muelle14.pdf"],
    lineas: [
      { n:1, tipo:"Equipo", equipo:"CRN001", desc:"Grúa 318 – Liebherr", desde:"Taller Chilibre", hasta:"Muelle 14", cant:1, und:"und", fase:"01-7113", cat:"EQI", cod:"25-506-01.7113-EQI", oc:null, nota:"", stLinea:"Pendiente", cantProg:0 },
      { n:2, tipo:"Material", equipo:null, desc:"Boom 40ft para Grúa 318", desde:"Taller Chilibre", hasta:"Muelle 14", cant:1, und:"und", fase:"01-7113", cat:"EQI", cod:"25-506-01.7113-EQI", oc:null, nota:"Va en el mismo viaje que la grúa", stLinea:"Pendiente", cantProg:0 },
      { n:3, tipo:"Material", equipo:null, desc:"Tubos tremi 8m", desde:"Taller Chilibre", hasta:"Muelle 14", cant:5, und:"und", fase:"01-7113", cat:"MAT", cod:"25-506-01.7113-MAT", oc:"OC-29721 Lín.2", nota:"", stLinea:"Pendiente", cantProg:0 },
    ]},
  { id:"25-506-SM-022", proy:"25-506", proyNom:"Muelle 14", sol:"Hector Pino", fCreada:"13/02/2026", fReq:"18/02/2026", st:"En Proceso", notas:"", adjuntos:[],
    lineas: [
      { n:1, tipo:"Equipo", equipo:"EXC001", desc:"Excavadora CAT 320", desde:"ASTIBAL", hasta:"Muelle 14", cant:1, und:"und", fase:"01-7113", cat:"EQI", cod:"25-506-01.7113-EQI", oc:null, nota:"", stLinea:"Programada", cantProg:1 },
      { n:2, tipo:"Material", equipo:null, desc:"Contrapesos para excavadora", desde:"ASTIBAL", hasta:"Muelle 14", cant:4, und:"und", fase:"01-7113", cat:"EQI", cod:"25-506-01.7113-EQI", oc:null, nota:"", stLinea:"Programada", cantProg:4 },
    ]},
  { id:"25-505-SM-019", proy:"25-505", proyNom:"Paraíso", sol:"David Ríos", fCreada:"10/02/2026", fReq:"14/02/2026", st:"Completada", notas:"", adjuntos:[],
    lineas: [
      { n:1, tipo:"Equipo", equipo:"GEN021", desc:"Generador CAT 200KW", desde:"Taller Chilibre", hasta:"Proyecto Paraíso", cant:1, und:"und", fase:"01-7113", cat:"EQI", cod:"25-505-01.7113-EQI", oc:null, nota:"", stLinea:"Entregada", cantProg:1 },
    ]},
  { id:"25-506-SM-018", proy:"25-506", proyNom:"Muelle 14", sol:"Edward Rodríguez", fCreada:"07/02/2026", fReq:"12/02/2026", st:"Completada", notas:"", adjuntos:["oc_29685.pdf"],
    lineas: [
      { n:1, tipo:"Material", equipo:null, desc:"Cemento Portland 50kg", desde:"Almacén Central", hasta:"Muelle 14", cant:100, und:"und", fase:"03-0000", cat:"MAT", cod:"25-506-03.0000-MAT", oc:"OC-29685 Lín.1", nota:"", stLinea:"Entregada", cantProg:100 },
    ]},
  { id:"25-504-SM-012", proy:"25-504", proyNom:"ASTIBAL", sol:"Juan Jácome", fCreada:"01/02/2026", fReq:"05/02/2026", st:"Parcial", notas:"2 de 3 líneas completadas", adjuntos:[],
    lineas: [
      { n:1, tipo:"Equipo", equipo:"CPR654", desc:"Compresor Atlas 250 CFM", desde:"Taller Chilibre", hasta:"ASTIBAL", cant:1, und:"und", fase:"01-7113", cat:"EQI", cod:"25-504-01.7113-EQI", oc:null, nota:"", stLinea:"Entregada", cantProg:1 },
      { n:2, tipo:"Material", equipo:null, desc:"Mangueras de aire 50ft", desde:"Almacén Central", hasta:"ASTIBAL", cant:6, und:"und", fase:"01-7113", cat:"MAT", cod:"25-504-01.7113-MAT", oc:null, nota:"", stLinea:"Entregada", cantProg:6 },
      { n:3, tipo:"Material", equipo:null, desc:"Acoples rápidos 2\"", desde:"Almacén Central", hasta:"ASTIBAL", cant:20, und:"pzas", fase:"01-7113", cat:"MAT", cod:"25-504-01.7113-MAT", oc:null, nota:"Pendiente reposición en almacén", stLinea:"Pendiente", cantProg:0 },
    ]},
  { id:"24-404-SM-008", proy:"24-404", proyNom:"Costa Norte", sol:"César Caballero", fCreada:"25/01/2026", fReq:"30/01/2026", st:"Cancelada", notas:"Cancelada por cambio de scope", adjuntos:[],
    lineas: [
      { n:1, tipo:"Equipo", equipo:"MAR003", desc:"Barcaza IBC-03 Flexifloat", desde:"Gamboa", hasta:"Costa Norte", cant:1, und:"und", fase:"01-7113", cat:"EQI", cod:"24-404-01.7113-EQI", oc:null, nota:"", stLinea:"Cancelada", cantProg:0 },
    ]},
];

// ═══ TRIPS (Movilizaciones) — The many-to-many assignment ═══
const VIAJES = [
  { id:"MOV-2026-042", fecha:"19/02/2026", vehiculo:"CAB930 – Cabezal Mack 350HP", remolque:"REM001 – Cama Baja 50T", conductor:"Coco", tarifa:"MVCB50", costo:500, st:"Programado", permisoATT:true, escolta:false,
    asignaciones: [
      { smId:"25-506-SM-022", linea:1, desc:"Excavadora CAT 320", cant:1, und:"und", desde:"ASTIBAL", hasta:"Muelle 14" },
      { smId:"25-506-SM-022", linea:2, desc:"Contrapesos para excavadora", cant:4, und:"und", desde:"ASTIBAL", hasta:"Muelle 14" },
    ]},
  { id:"MOV-2026-043", fecha:"20/02/2026", vehiculo:"CAB444 – Cabezal Mack 450HP", remolque:"REM002 – Cama Baja 75T", conductor:"Bonilla", tarifa:"MVCB75", costo:600, st:"Programado", permisoATT:true, escolta:true,
    asignaciones: [
      { smId:"25-506-SM-023", linea:1, desc:"Grúa 318 – Liebherr", cant:1, und:"und", desde:"Taller Chilibre", hasta:"Muelle 14" },
    ]},
  { id:"MOV-2026-044", fecha:"20/02/2026", vehiculo:"CAM430 – Plataforma Hino 4T", remolque:"—", conductor:"Monchi", tarifa:"MVPLAT", costo:200, st:"Programado", permisoATT:false, escolta:false,
    asignaciones: [
      { smId:"25-506-SM-023", linea:2, desc:"Boom 40ft para Grúa 318", cant:1, und:"und", desde:"Taller Chilibre", hasta:"Muelle 14" },
      { smId:"25-506-SM-023", linea:3, desc:"Tubos tremi 8m", cant:5, und:"und", desde:"Taller Chilibre", hasta:"Muelle 14" },
    ]},
  { id:"MOV-2026-038", fecha:"13/02/2026", vehiculo:"CAM430 – Plataforma Hino 4T", remolque:"—", conductor:"Rafael", tarifa:"MVPLAT", costo:200, st:"Completado",
    permisoATT:false, escolta:false,
    asignaciones: [
      { smId:"25-505-SM-019", linea:1, desc:"Generador CAT 200KW", cant:1, und:"und", desde:"Taller Chilibre", hasta:"Proyecto Paraíso" },
    ],
    eventos: [
      { tipo:"Salida", hora:"06:30", registroPor:"Rafael", ubicacion:"Taller Chilibre" },
      { tipo:"Llegada", hora:"08:15", registroPor:"Rafael", ubicacion:"Proyecto Paraíso" },
      { tipo:"Entrega", hora:"08:45", registroPor:"David Ríos", ubicacion:"Proyecto Paraíso" },
      { tipo:"Retorno", hora:"10:30", registroPor:"Rafael", ubicacion:"Taller Chilibre" },
    ]},
  { id:"MOV-2026-035", fecha:"10/02/2026", vehiculo:"CAM823 – Camión Grúa", remolque:"—", conductor:"Coco", tarifa:"MVCGRU", costo:300, st:"Completado",
    permisoATT:false, escolta:false,
    asignaciones: [
      { smId:"25-504-SM-012", linea:1, desc:"Compresor Atlas 250 CFM", cant:1, und:"und", desde:"Taller Chilibre", hasta:"ASTIBAL" },
      { smId:"25-504-SM-012", linea:2, desc:"Mangueras de aire 50ft", cant:6, und:"und", desde:"Almacén Central", hasta:"ASTIBAL" },
    ],
    eventos: [
      { tipo:"Salida", hora:"07:00", registroPor:"Coco", ubicacion:"Taller Chilibre" },
      { tipo:"Llegada", hora:"09:00", registroPor:"Coco", ubicacion:"ASTIBAL" },
      { tipo:"Entrega", hora:"09:30", registroPor:"Juan Jácome", ubicacion:"ASTIBAL" },
      { tipo:"Retorno", hora:"11:45", registroPor:"Coco", ubicacion:"Taller Chilibre" },
    ]},
];

// ═══ INSPECTION ITEMS (42 items IC-EQ-F-01-02) ═══
const INSP_SECTIONS = [
  { sec:"Motor", items:["Nivel aceite motor","Nivel refrigerante","Correas/bandas","Mangueras","Filtro aire"] },
  { sec:"Sistema Hidráulico", items:["Nivel aceite hidráulico","Mangueras hidráulicas","Cilindros (fugas)","Filtros hidráulicos","Conexiones"] },
  { sec:"Sistema Eléctrico", items:["Batería","Alternador/carga","Luces delanteras","Luces traseras","Alarma retroceso","Bocina"] },
  { sec:"Tren de Rodaje/Llantas", items:["Estado de llantas/orugas","Presión de aire","Tensión de orugas","Rodillos/ruedas guía"] },
  { sec:"Cabina/Estructura", items:["Espejo retrovisor","Cinturón seguridad","Limpiaparabrisas","Asiento operador","Vidrios/ventanas","Extinguidor","Botiquín"] },
  { sec:"Implementos", items:["Balde/cucharón","Cables/eslingas","Gancho de carga","Pluma/boom","Estabilizadores"] },
  { sec:"Documentación", items:["Manual de operación","Certificados vigentes","Inspección anterior","Horómetro/Odómetro","Nivel combustible"] },
];

// ═══ USERS / ROLES ═══
const USERS = [
  { name:"Edward Rodríguez", role:"pm", label:"Ing. Proyecto", proy:["25-506","25-505"] },
  { name:"Carlos Charris", role:"logistica", label:"Coord. Logística", proy:["all"] },
  { name:"Coco", role:"campo", label:"Conductor", proy:["all"] },
  { name:"Yoseph Caballero", role:"almacen", label:"Almacenista", proy:["all"] },
  { name:"James Cucalón", role:"admin", label:"Administrador", proy:["all"] },
];

// ═══ UI PRIMITIVES ═══
const Badge = ({ children, color=C.blue, sm }) => (
  <span style={{ background:`${color}18`, color, padding:sm?"1px 5px":"2px 8px", borderRadius:"10px", fontSize:sm?"9px":"10px", fontWeight:700, whiteSpace:"nowrap", display:"inline-block" }}>{children}</span>
);
const Lbl = ({children,req}) => <div style={{fontSize:"10px",fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"3px"}}>{children}{req&&<span style={{color:C.err}}> *</span>}</div>;
const Inp = ({v,ph,icon,h,dis,mono}) => (
  <div style={{border:`1px solid ${C.bdr}`,borderRadius:"6px",padding:"7px 10px",fontSize:"12px",color:v?C.txt:C.muted,background:dis?"#f0f0f0":C.inp,display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:h||"auto",opacity:dis?.6:1,fontFamily:mono?"'JetBrains Mono',monospace":"inherit"}}>
    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v||ph||"Seleccionar..."}</span>
    {icon&&<span style={{color:C.muted,fontSize:"11px",flexShrink:0,marginLeft:"4px"}}>{icon}</span>}
  </div>
);
const Btn = ({children,color=C.navy,outline,onClick,full,sm,dis}) => (
  <button onClick={dis?undefined:onClick} style={{background:dis?"#ccc":outline?"transparent":color,color:dis?"#999":outline?color:"#fff",border:outline?`1.5px solid ${dis?"#ccc":color}`:"none",borderRadius:"6px",padding:sm?"5px 10px":"9px 16px",fontSize:sm?"11px":"12px",fontWeight:700,cursor:dis?"not-allowed":"pointer",width:full?"100%":"auto",whiteSpace:"nowrap"}}>{children}</button>
);
const Card = ({children,s}) => <div style={{background:C.card,borderRadius:"8px",border:`1px solid ${C.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",...s}}>{children}</div>;
const FBToggle = ({on}) => <label style={{fontSize:"10px",color:C.blue,cursor:"pointer",display:"flex",alignItems:"center",gap:"3px",marginTop:"2px"}}><span style={{width:"12px",height:"12px",border:`1.5px solid ${on?C.blue:C.bdr}`,borderRadius:"2px",display:"inline-flex",alignItems:"center",justifyContent:"center",background:on?`${C.blue}12`:"#fff",fontSize:"8px"}}>{on?"✓":""}</span>No está en lista</label>;

// ═══ SCREEN: DASHBOARD ═══
const ScrDashboard = ({user,goTo}) => {
  const pendientes = SOLICITUDES.filter(s=>s.st==="Enviada"||s.st==="En Proceso").length;
  const completadas = SOLICITUDES.filter(s=>s.st==="Completada").length;
  const viajesHoy = VIAJES.filter(v=>v.st==="Programado").length;
  const linPend = SOLICITUDES.flatMap(s=>s.lineas).filter(l=>l.stLinea==="Pendiente").length;
  return (
    <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
      <div style={{fontSize:"18px",fontWeight:800,color:C.navy}}>Buenos días, {user.name.split(" ")[0]}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"8px"}}>
        {[
          {n:pendientes,l:"Solicitudes\nPendientes",c:C.blue,ic:"📋"},
          {n:linPend,l:"Líneas sin\nProgramar",c:C.warn,ic:"⚠️"},
          {n:viajesHoy,l:"Viajes\nProgramados",c:C.purple,ic:"🚛"},
          {n:completadas,l:"Completadas\nEste Mes",c:C.ok,ic:"✅"},
        ].map((k,i)=>(
          <Card key={i} s={{padding:"12px",borderLeft:`3px solid ${k.c}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontSize:"24px",fontWeight:800,color:k.c}}>{k.n}</div><div style={{fontSize:"10px",color:C.sub,whiteSpace:"pre-line",lineHeight:"1.3",marginTop:"2px"}}>{k.l}</div></div>
              <span style={{fontSize:"20px"}}>{k.ic}</span>
            </div>
          </Card>
        ))}
      </div>
      {/* Recent Activity */}
      <Card s={{padding:"14px"}}>
        <div style={{fontSize:"12px",fontWeight:700,color:C.navy,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Actividad Reciente</div>
        {[
          {t:"📋 Nueva solicitud 25-506-SM-023 creada por Edward Rodríguez",d:"Hace 2 días",c:C.blue},
          {t:"🚛 MOV-2026-042 programado: Excavadora a Muelle 14",d:"Hace 1 día",c:C.purple},
          {t:"✅ MOV-2026-038 completado: Generador entregado en Paraíso",d:"Hace 5 días",c:C.ok},
          {t:"⚠️ SM-012 ASTIBAL: 1 línea pendiente (acoples sin stock)",d:"Hace 8 días",c:C.warn},
        ].map((a,i)=>(
          <div key={i} style={{padding:"6px 0",borderBottom:i<3?`1px solid ${C.bdr}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:"11px",color:C.txt}}>{a.t}</span>
            <span style={{fontSize:"9px",color:C.muted,whiteSpace:"nowrap",marginLeft:"8px"}}>{a.d}</span>
          </div>
        ))}
      </Card>
      {/* Quick access by project */}
      <Card s={{padding:"14px"}}>
        <div style={{fontSize:"12px",fontWeight:700,color:C.navy,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Proyectos Activos</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
          {PROYECTOS.map(p=>{
            const sols = SOLICITUDES.filter(s=>s.proy===p.codigo);
            const pend = sols.filter(s=>s.st==="Enviada"||s.st==="En Proceso").length;
            return (
              <div key={p.id} style={{padding:"8px 10px",borderRadius:"6px",border:`1px solid ${C.bdr}`,cursor:"pointer",background:C.inp}} onClick={()=>goTo("solicitudes")}>
                <div style={{fontFamily:"monospace",fontWeight:700,fontSize:"13px",color:C.navy}}>{p.codigo}</div>
                <div style={{fontSize:"11px",color:C.sub}}>{p.nombre}</div>
                <div style={{fontSize:"10px",color:C.muted,marginTop:"2px"}}>{sols.length} sol. · {pend} pend.</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ═══ SCREEN: MIS SOLICITUDES ═══
const ScrSolicitudes = ({user,goTo,setSelectedSol}) => {
  const [filtSt,setFiltSt]=useState("Todos");
  const [filtPr,setFiltPr]=useState("Todos");
  const filtered = SOLICITUDES.filter(s=>(filtSt==="Todos"||s.st===filtSt)&&(filtPr==="Todos"||s.proy===filtPr));
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"8px 12px",display:"flex",gap:"6px",flexWrap:"wrap",background:"#fff",borderBottom:`1px solid ${C.bdr}`}}>
        <div style={{flex:1,minWidth:"140px"}}><Inp ph="🔍 Buscar ID, proyecto..." /></div>
        <select value={filtPr} onChange={e=>setFiltPr(e.target.value)} style={{padding:"7px",borderRadius:"6px",border:`1px solid ${C.bdr}`,fontSize:"11px",background:C.inp,fontWeight:600}}>
          <option value="Todos">📂 Todos</option>
          {PROYECTOS.map(p=><option key={p.id} value={p.codigo}>{p.codigo} – {p.nombre}</option>)}
        </select>
        <select value={filtSt} onChange={e=>setFiltSt(e.target.value)} style={{padding:"7px",borderRadius:"6px",border:`1px solid ${C.bdr}`,fontSize:"11px",background:C.inp,fontWeight:600}}>
          {["Todos","Borrador","Enviada","En Proceso","Completada","Parcial","Cancelada"].map(e=><option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div style={{flex:1,overflow:"auto",padding:"8px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          {filtered.map(s=>(
            <Card key={s.id} s={{padding:"10px 12px",cursor:"pointer",borderLeft:`3px solid ${stC[s.st]||C.muted}`}} onClick={()=>{setSelectedSol(s);goTo("detalleSol");}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <span style={{fontFamily:"monospace",fontWeight:700,color:C.navy,fontSize:"13px"}}>{s.id}</span>
                  <span style={{fontSize:"10px",color:C.muted,marginLeft:"6px"}}>{s.proyNom}</span>
                </div>
                <Badge color={stC[s.st]}>{s.st}</Badge>
              </div>
              <div style={{fontSize:"10px",color:C.sub,marginTop:"3px"}}>
                {s.lineas.length} líneas · Sol: {s.sol} · Req: {s.fReq}
              </div>
              {s.notas&&<div style={{fontSize:"10px",color:C.muted,fontStyle:"italic",marginTop:"2px"}}>💬 {s.notas}</div>}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══ SCREEN: DETALLE SOLICITUD (single-document view / edit) ═══
const ScrDetalleSol = ({sol,goTo,isNew}) => {
  const [showAddLine,setShowAddLine]=useState(false);
  const [tipoLinea,setTipoLinea]=useState("Equipo");
  const [showOC,setShowOC]=useState(false);
  const [selOC,setSelOC]=useState(null);
  const s = sol || { id:"25-506-SM-024 (nuevo)", proy:"25-506", proyNom:"Muelle 14", sol:"Edward Rodríguez", fCreada:"23/02/2026", fReq:"", st:"Borrador", notas:"", adjuntos:[], lineas:[] };
  const editable = isNew || s.st==="Borrador" || s.st==="Enviada";
  
  return (
    <div style={{padding:"12px",overflow:"auto",display:"flex",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:"680px"}}>
        {/* === ID & STATUS BAR === */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontFamily:"monospace",fontSize:"16px",fontWeight:800,color:C.navy,background:`${C.navy}08`,padding:"4px 12px",borderRadius:"6px"}}>{s.id}</span>
            <Badge color={stC[s.st]||C.muted}>{s.st}</Badge>
          </div>
          {editable && <span style={{fontSize:"9px",color:C.muted}}>Auto-generado al guardar</span>}
        </div>

        {/* === HEADER FIELDS === */}
        <Card s={{padding:"14px",marginBottom:"10px"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:C.navy,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"10px"}}>Datos de Solicitud</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <div><Lbl req>Proyecto</Lbl>{editable?<Inp v={`${s.proy} – ${s.proyNom}`} icon="🔍"/>:<div style={{fontSize:"13px",fontWeight:600}}>{s.proy} – {s.proyNom}</div>}</div>
            <div><Lbl req>Solicitante</Lbl>{editable?<Inp v={s.sol} icon="🔍"/>:<div style={{fontSize:"13px"}}>{s.sol}</div>}</div>
            <div><Lbl req>Fecha Requerida</Lbl>{editable?<Inp v={s.fReq||""} ph="dd/mm/yyyy" icon="📅"/>:<div style={{fontSize:"13px"}}>{s.fReq}</div>}</div>
            <div><Lbl>Fecha Creada</Lbl><div style={{fontSize:"13px",color:C.sub}}>{s.fCreada}</div></div>
          </div>
          <div style={{marginTop:"10px"}}><Lbl>Notas Generales</Lbl>{editable?<Inp v={s.notas} ph="Observaciones (opcional)" h="48px"/>:s.notas&&<div style={{fontSize:"12px",color:C.sub,fontStyle:"italic"}}>{s.notas}</div>}</div>
          {/* Adjuntos */}
          <div style={{marginTop:"10px"}}>
            <Lbl>Adjuntos</Lbl>
            {editable&&<div style={{border:`2px dashed ${C.bdr}`,borderRadius:"6px",padding:"10px",textAlign:"center",marginBottom:"4px"}}>
              <div style={{fontSize:"11px",color:C.muted}}>📎 Arrastra archivos o toca para adjuntar</div>
              <div style={{fontSize:"9px",color:C.muted}}>PDF, Imágenes, Word, Excel — max 10MB</div>
            </div>}
            {s.adjuntos.length>0&&<div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>{s.adjuntos.map((a,i)=><span key={i} style={{background:C.inp,border:`1px solid ${C.bdr}`,borderRadius:"4px",padding:"2px 7px",fontSize:"10px",display:"inline-flex",alignItems:"center",gap:"3px"}}>📄 {a}{editable&&<span style={{color:C.err,cursor:"pointer"}}>✕</span>}</span>)}</div>}
          </div>
        </Card>

        {/* === LÍNEAS === */}
        <Card s={{padding:"14px",marginBottom:"10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div style={{fontSize:"11px",fontWeight:700,color:C.navy,textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.lineas.length} Líneas de Solicitud</div>
            {editable&&<Btn sm color={C.ok} onClick={()=>setShowAddLine(!showAddLine)}>{showAddLine?"✕ Cerrar":"+ Agregar Línea"}</Btn>}
          </div>

          {/* Add line panel */}
          {showAddLine&&(
            <div style={{background:`${C.blue}06`,border:`1px solid ${C.blue}20`,borderRadius:"8px",padding:"12px",marginBottom:"10px"}}>
              <div style={{fontSize:"12px",fontWeight:700,color:C.navy,marginBottom:"8px"}}>➕ Nueva Línea</div>
              {/* Tipo toggle */}
              <div style={{display:"flex",marginBottom:"8px"}}>
                {["Equipo","Material"].map(t=>(
                  <button key={t} onClick={()=>{setTipoLinea(t);setShowOC(false);}} style={{flex:1,padding:"7px",fontSize:"11px",fontWeight:600,cursor:"pointer",background:tipoLinea===t?(t==="Equipo"?C.blue:C.gold):"#f5f5f5",color:tipoLinea===t?"#fff":C.sub,border:`1px solid ${tipoLinea===t?"transparent":C.bdr}`,borderRadius:t==="Equipo"?"6px 0 0 6px":"0 6px 6px 0"}}>{t==="Equipo"?"🔧 Equipo":"📦 Material"}</button>
                ))}
              </div>
              {tipoLinea==="Equipo"?(
                <div><Lbl req>Equipo</Lbl><Inp v="CRN001 – Grúa 318 Liebherr" icon="🔍"/><FBToggle /></div>
              ):(
                <div>
                  <Lbl req>Descripción del Material</Lbl><Inp ph="Describir material..." />
                  {/* OC Integration */}
                  <div style={{marginTop:"6px",background:`${C.purple}06`,borderRadius:"6px",padding:"8px",border:`1px solid ${C.purple}15`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:"10px",fontWeight:700,color:C.purple}}>📋 Orden de Compra</span>
                      <button onClick={()=>setShowOC(!showOC)} style={{background:"none",border:"none",color:C.purple,fontSize:"10px",cursor:"pointer",fontWeight:600}}>{showOC?"✕ Cerrar":"+ Vincular"}</button>
                    </div>
                    {showOC&&(
                      <div style={{marginTop:"6px"}}>
                        <Inp v="" ph="Buscar OC..." icon="🔍"/>
                        <div style={{marginTop:"4px",display:"flex",flexDirection:"column",gap:"3px"}}>
                          {OC_DATA.map((oc,i)=>(
                            <div key={i} onClick={()=>setSelOC(selOC===i?null:i)} style={{padding:"6px 8px",borderRadius:"4px",border:`1px solid ${selOC===i?C.purple:C.bdr}`,cursor:"pointer",background:selOC===i?C.purpleBg:"#fff"}}>
                              <div style={{fontSize:"11px",fontWeight:600,color:C.navy}}>{oc.num} — {oc.prov}</div>
                              {selOC===i&&(
                                <div style={{marginTop:"4px"}}>
                                  {oc.lineas.map((l,j)=>(
                                    <div key={j} style={{display:"flex",alignItems:"center",gap:"6px",padding:"3px 0",fontSize:"10px",opacity:l.done?.5:1}}>
                                      <input type="checkbox" disabled={l.done} defaultChecked={!l.done&&j===1} style={{accentColor:C.purple}} />
                                      <span style={{flex:1}}>{l.desc}</span>
                                      <span style={{color:C.sub}}>{l.cantAten}/{l.cantOrd} {l.und}</span>
                                      <Badge sm color={l.done?C.ok:l.cantAten>0?C.warn:C.err}>{l.done?"Completo":l.cantAten>0?"Parcial":"Pend."}</Badge>
                                      {!l.done&&<input type="number" defaultValue={l.cantOrd-l.cantAten} style={{width:"35px",padding:"2px 4px",border:`1px solid ${C.purple}`,borderRadius:"3px",fontSize:"11px",fontWeight:700,textAlign:"center"}} />}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Desde / Hasta */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginTop:"8px"}}>
                <div><Lbl req>Desde</Lbl><Inp v="Taller Chilibre" icon="▾"/><FBToggle /></div>
                <div><Lbl req>Hasta</Lbl><Inp v="Muelle 14" icon="▾"/><FBToggle /></div>
              </div>
              {/* Cant / Unidad */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginTop:"8px"}}>
                <div><Lbl req>Cantidad</Lbl><Inp v="1" /></div>
                <div><Lbl req>Unidad</Lbl><Inp v="und" icon="▾"/><FBToggle /></div>
              </div>
              {/* Fase + Categoría → Código Costo */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 90px",gap:"6px",marginTop:"8px"}}>
                <div><Lbl req>Fase / Código Costo</Lbl><Inp v="01-7113 – Movilización" icon="🔍"/><FBToggle /></div>
                <div><Lbl>Categoría</Lbl><Inp v="" icon="▾" ph="(opc)"/></div>
              </div>
              {/* Cost code preview */}
              <div style={{marginTop:"6px",background:`${C.navy}08`,borderRadius:"5px",padding:"5px 10px",display:"inline-flex",alignItems:"center",gap:"5px"}}>
                <span style={{fontSize:"10px"}}>📋</span>
                <span style={{fontSize:"12px",fontWeight:700,color:C.navy,fontFamily:"monospace"}}>25-506-01.7113-EQI</span>
              </div>
              <div style={{marginTop:"8px"}}><Lbl>Nota de línea</Lbl><Inp ph="Nota específica (opcional)" /></div>
              <Btn color={C.ok} full sm onClick={()=>setShowAddLine(false)} style={{marginTop:"8px"}}>+ Agregar Línea</Btn>
            </div>
          )}

          {/* Lines list */}
          <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
            {s.lineas.map((l,i)=>(
              <div key={i} style={{borderLeft:`3px solid ${l.tipo==="Equipo"?C.blue:C.gold}`,border:`1px solid ${C.bdr}`,borderRadius:"6px",padding:"8px 10px",background:"#fff"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"4px",flexWrap:"wrap"}}>
                      <span style={{fontSize:"11px"}}>{l.tipo==="Equipo"?"🔧":"📦"}</span>
                      <span style={{fontSize:"12px",fontWeight:600,color:C.txt}}>{l.desc}</span>
                      {l.oc&&<Badge sm color={C.purple}>{l.oc}</Badge>}
                    </div>
                    <div style={{fontSize:"10px",color:C.sub,marginTop:"2px"}}>{l.desde} → {l.hasta} · {l.cant} {l.und}</div>
                    <div style={{display:"flex",gap:"4px",marginTop:"2px",alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{fontFamily:"monospace",fontSize:"9px",fontWeight:700,color:C.navy,background:`${C.navy}08`,padding:"1px 5px",borderRadius:"3px"}}>{l.cod}</span>
                      <Badge sm color={stC[l.stLinea==="Entregada"?"Completada":l.stLinea==="Programada"?"En Proceso":"Enviada"]}>{l.stLinea}</Badge>
                    </div>
                    {l.nota&&<div style={{fontSize:"9px",color:C.muted,marginTop:"2px",fontStyle:"italic"}}>💬 {l.nota}</div>}
                  </div>
                  {editable&&<span style={{color:"#ccc",cursor:"pointer",fontSize:"13px",padding:"0 2px"}}>✕</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* === ACTIONS === */}
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"6px"}}>
          <Btn outline sm onClick={()=>goTo("solicitudes")}>← Volver</Btn>
          <div style={{display:"flex",gap:"6px"}}>
            {editable&&<><Btn color="#7F8C8D" outline sm>💾 Guardar Borrador</Btn><Btn color={C.ok} sm>✉ Enviar Solicitud</Btn></>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══ SCREEN: PROGRAMACIÓN (Charris's view — LINE LEVEL) ═══
const ScrProgramacion = ({goTo,setSelectedViaje}) => {
  const [tab,setTab]=useState("backlog");
  const [filtPr,setFiltPr]=useState("Todos");
  
  // Flatten all pending lines across all solicitudes
  const allLines = SOLICITUDES.filter(s=>s.st!=="Completada"&&s.st!=="Cancelada").flatMap(s=>
    s.lineas.filter(l=>l.stLinea==="Pendiente"||l.stLinea==="Programada").map(l=>({...l,smId:s.id,smProy:s.proy,smProyNom:s.proyNom,smSol:s.sol,smFReq:s.fReq}))
  ).filter(l=>filtPr==="Todos"||l.smProy===filtPr);
  
  const pendLines = allLines.filter(l=>l.stLinea==="Pendiente");
  const progLines = allLines.filter(l=>l.stLinea==="Programada");

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Tabs */}
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bdr}`}}>
        {[["backlog","📋 Backlog de Líneas"],["viajes","🚛 Viajes Programados"],["calendario","📅 Look-Ahead"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"8px",fontSize:"11px",fontWeight:600,background:tab===k?C.card:`${C.bg}`,color:tab===k?C.navy:C.sub,border:"none",borderBottom:tab===k?`2px solid ${C.navy}`:"2px solid transparent",cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"6px 10px",display:"flex",gap:"6px",alignItems:"center",background:"#fff",borderBottom:`1px solid ${C.bdr}`}}>
        <select value={filtPr} onChange={e=>setFiltPr(e.target.value)} style={{padding:"5px",borderRadius:"4px",border:`1px solid ${C.bdr}`,fontSize:"10px",fontWeight:600}}>
          <option value="Todos">Todos los proyectos</option>
          {PROYECTOS.map(p=><option key={p.id} value={p.codigo}>{p.codigo}</option>)}
        </select>
        <span style={{fontSize:"10px",color:C.sub}}>{pendLines.length} pendientes · {progLines.length} programadas</span>
      </div>

      <div style={{flex:1,overflow:"auto",padding:"8px"}}>
        {tab==="backlog"&&(
          <div>
            {/* PENDIENTES — lines Charris needs to assign */}
            <div style={{fontSize:"11px",fontWeight:700,color:C.err,textTransform:"uppercase",marginBottom:"6px"}}>⚠️ Sin Programar ({pendLines.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:"4px",marginBottom:"14px"}}>
              {pendLines.map((l,i)=>{
                const daysDiff = Math.floor(Math.random()*8)-2;
                const prioridad = daysDiff<0?"Vencida":daysDiff<=3?"Urgente":daysDiff<=7?"Próxima":"Normal";
                const pColor = {Vencida:C.err,Urgente:C.warn,Próxima:C.blue,Normal:C.ok}[prioridad];
                return (
                  <Card key={i} s={{padding:"8px 10px",borderLeft:`3px solid ${pColor}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:"4px",alignItems:"center",flexWrap:"wrap"}}>
                          <span style={{fontSize:"11px"}}>{l.tipo==="Equipo"?"🔧":"📦"}</span>
                          <span style={{fontSize:"12px",fontWeight:600}}>{l.desc}</span>
                          <Badge sm color={pColor}>{prioridad}</Badge>
                        </div>
                        <div style={{fontSize:"10px",color:C.sub,marginTop:"2px"}}>
                          <span style={{fontFamily:"monospace",fontWeight:600}}>{l.smId}</span> · {l.smProyNom} · {l.cant} {l.und}
                        </div>
                        <div style={{fontSize:"10px",color:C.sub}}>{l.desde} → {l.hasta} · Req: {l.smFReq} · Sol: {l.smSol}</div>
                      </div>
                      <Btn sm color={C.purple} onClick={()=>{}}>📅 Asignar</Btn>
                    </div>
                  </Card>
                );
              })}
            </div>
            {/* PROGRAMADAS */}
            <div style={{fontSize:"11px",fontWeight:700,color:C.purple,textTransform:"uppercase",marginBottom:"6px"}}>📅 Programadas ({progLines.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              {progLines.map((l,i)=>(
                <Card key={i} s={{padding:"8px 10px",borderLeft:`3px solid ${C.purple}`,opacity:.8}}>
                  <div style={{display:"flex",gap:"4px",alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:"11px"}}>{l.tipo==="Equipo"?"🔧":"📦"}</span>
                    <span style={{fontSize:"12px",fontWeight:600}}>{l.desc}</span>
                    <Badge sm color={C.purple}>Programada</Badge>
                  </div>
                  <div style={{fontSize:"10px",color:C.sub,marginTop:"2px"}}>
                    <span style={{fontFamily:"monospace",fontWeight:600}}>{l.smId}</span> · {l.smProyNom} · {l.cant} {l.und} · {l.desde} → {l.hasta}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tab==="viajes"&&(
          <div>
            <div style={{fontSize:"11px",fontWeight:700,color:C.navy,textTransform:"uppercase",marginBottom:"8px"}}>
              Viajes (Movilizaciones) — Agrupación de líneas en viajes
            </div>
            <div style={{background:C.warnBg,border:`1px solid ${C.warn}30`,borderRadius:"6px",padding:"8px 10px",fontSize:"10px",color:C.warn,marginBottom:"10px",fontWeight:600}}>
              💡 Un viaje puede transportar líneas de MÚLTIPLES solicitudes. Una solicitud puede requerir MÚLTIPLES viajes.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {VIAJES.map((v,i)=>(
                <Card key={i} s={{padding:"10px 12px",borderLeft:`3px solid ${v.st==="Completado"?C.ok:C.purple}`,cursor:"pointer"}} onClick={()=>{setSelectedViaje(v);goTo("detalleViaje");}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                        <span style={{fontFamily:"monospace",fontWeight:700,fontSize:"13px",color:C.navy}}>{v.id}</span>
                        <Badge color={v.st==="Completado"?C.ok:C.purple}>{v.st}</Badge>
                      </div>
                      <div style={{fontSize:"11px",color:C.sub,marginTop:"3px"}}>
                        📅 {v.fecha} · 🚛 {v.vehiculo.split("–")[0].trim()} · 👤 {v.conductor}
                      </div>
                      {v.remolque!=="—"&&<div style={{fontSize:"10px",color:C.muted}}>🔗 {v.remolque}</div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:700,color:C.navy,fontSize:"14px"}}>${v.costo.toLocaleString()}</div>
                      <div style={{fontSize:"9px",color:C.muted}}>{v.tarifa}</div>
                    </div>
                  </div>
                  {/* Lines in this trip */}
                  <div style={{marginTop:"6px",borderTop:`1px solid ${C.bdr}`,paddingTop:"6px"}}>
                    <div style={{fontSize:"9px",fontWeight:700,color:C.sub,textTransform:"uppercase",marginBottom:"3px"}}>
                      Carga ({v.asignaciones.length} líneas de {[...new Set(v.asignaciones.map(a=>a.smId))].length} solicitud{[...new Set(v.asignaciones.map(a=>a.smId))].length>1?"es":""}):
                    </div>
                    {v.asignaciones.map((a,j)=>(
                      <div key={j} style={{fontSize:"10px",color:C.sub,display:"flex",gap:"4px",alignItems:"center",padding:"1px 0"}}>
                        <span style={{fontFamily:"monospace",fontSize:"9px",color:C.purple,fontWeight:600}}>{a.smId}·L{a.linea}</span>
                        <span>{a.desc}</span>
                        <span style={{color:C.muted}}>×{a.cant} {a.und}</span>
                      </div>
                    ))}
                  </div>
                  {v.permisoATT&&<Badge sm color={C.warn}>🔒 Permiso ATT</Badge>}
                  {v.escolta&&<Badge sm color={C.err}>🚨 Escolta</Badge>}
                </Card>
              ))}
            </div>
            <Btn full color={C.purple} onClick={()=>{}} style={{marginTop:"10px"}}>+ Crear Nuevo Viaje</Btn>
          </div>
        )}

        {tab==="calendario"&&(
          <div>
            <div style={{fontSize:"11px",fontWeight:700,color:C.navy,textTransform:"uppercase",marginBottom:"8px"}}>Two-Week Look-Ahead</div>
            {["17/02","18/02","19/02","20/02","21/02","22/02","23/02","24/02"].map((d,i)=>{
              const trips = VIAJES.filter(v=>{
                const dd = parseInt(v.fecha.split("/")[0]);
                return dd===parseInt(d.split("/")[0]);
              });
              const isToday = d==="23/02";
              return (
                <div key={i} style={{display:"flex",gap:"8px",padding:"6px 0",borderBottom:`1px solid ${C.bdr}`,background:isToday?C.goldL:"transparent"}}>
                  <div style={{width:"55px",fontSize:"11px",fontWeight:isToday?700:500,color:isToday?C.navy:C.sub}}>{d}{isToday&&" ★"}</div>
                  <div style={{flex:1}}>
                    {trips.length>0?trips.map((t,j)=>(
                      <div key={j} style={{fontSize:"10px",color:C.txt,display:"flex",alignItems:"center",gap:"4px",padding:"1px 0"}}>
                        <span style={{width:"6px",height:"6px",borderRadius:"50%",background:t.st==="Completado"?C.ok:C.purple,flexShrink:0}}/>
                        <span style={{fontWeight:600}}>{t.id}</span>
                        <span style={{color:C.sub}}>— {t.conductor} — {t.asignaciones.map(a=>a.desc).join(", ").substring(0,40)}...</span>
                      </div>
                    )):<div style={{fontSize:"10px",color:C.muted,fontStyle:"italic"}}>Sin viajes programados</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══ SCREEN: DETALLE VIAJE (Execution view) ═══
const ScrDetalleViaje = ({viaje,goTo}) => {
  const v = viaje;
  if(!v) return <div style={{padding:"20px",textAlign:"center",color:C.muted}}>Selecciona un viaje</div>;
  const solicitudes = [...new Set(v.asignaciones.map(a=>a.smId))];
  
  return (
    <div style={{padding:"12px",overflow:"auto",display:"flex",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:"680px"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
          <div>
            <span style={{fontFamily:"monospace",fontSize:"16px",fontWeight:800,color:C.navy}}>{v.id}</span>
            <Badge color={v.st==="Completado"?C.ok:C.purple} style={{marginLeft:"8px"}}>{v.st}</Badge>
          </div>
          <Btn sm outline onClick={()=>goTo("programacion")}>← Viajes</Btn>
        </div>
        
        {/* Trip info */}
        <Card s={{padding:"14px",marginBottom:"10px"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:C.navy,textTransform:"uppercase",marginBottom:"8px"}}>Datos del Viaje</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",fontSize:"12px"}}>
            <div><span style={{color:C.sub,fontSize:"10px"}}>FECHA:</span><div style={{fontWeight:600}}>{v.fecha}</div></div>
            <div><span style={{color:C.sub,fontSize:"10px"}}>CONDUCTOR:</span><div style={{fontWeight:600}}>{v.conductor}</div></div>
            <div><span style={{color:C.sub,fontSize:"10px"}}>VEHÍCULO:</span><div style={{fontWeight:600}}>{v.vehiculo}</div></div>
            <div><span style={{color:C.sub,fontSize:"10px"}}>REMOLQUE:</span><div style={{fontWeight:600}}>{v.remolque}</div></div>
            <div><span style={{color:C.sub,fontSize:"10px"}}>TARIFA:</span><div style={{fontWeight:600}}>{v.tarifa} — ${v.costo}</div></div>
            <div style={{display:"flex",gap:"6px",alignItems:"flex-end"}}>{v.permisoATT&&<Badge sm color={C.warn}>🔒 ATT</Badge>}{v.escolta&&<Badge sm color={C.err}>🚨 Escolta</Badge>}</div>
          </div>
        </Card>

        {/* Assigned cargo — from multiple solicitudes */}
        <Card s={{padding:"14px",marginBottom:"10px"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:C.navy,textTransform:"uppercase",marginBottom:"8px"}}>
            Carga Asignada — {v.asignaciones.length} líneas de {solicitudes.length} solicitud{solicitudes.length>1?"es":""}
          </div>
          {solicitudes.map(smId=>(
            <div key={smId} style={{marginBottom:"6px"}}>
              <div style={{fontSize:"10px",fontWeight:700,color:C.purple,marginBottom:"3px"}}>{smId}</div>
              {v.asignaciones.filter(a=>a.smId===smId).map((a,j)=>(
                <div key={j} style={{padding:"5px 8px",borderLeft:`2px solid ${C.blue}`,marginLeft:"8px",marginBottom:"3px",fontSize:"11px"}}>
                  <span style={{fontWeight:600}}>{a.desc}</span> · {a.cant} {a.und}
                  <div style={{fontSize:"10px",color:C.sub}}>{a.desde} → {a.hasta}</div>
                </div>
              ))}
            </div>
          ))}
        </Card>

        {/* Events timeline */}
        <Card s={{padding:"14px",marginBottom:"10px"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:C.navy,textTransform:"uppercase",marginBottom:"8px"}}>Eventos de Ejecución</div>
          {v.eventos?(
            <div style={{display:"flex",flexDirection:"column",gap:"0"}}>
              {v.eventos.map((e,i)=>{
                const ec = {Salida:C.blue,Llegada:C.warn,Entrega:C.ok,Retorno:C.purple,Incidencia:C.err}[e.tipo];
                const eIcon = {Salida:"🚛",Llegada:"📍",Entrega:"✅",Retorno:"🏠",Incidencia:"⚠️"}[e.tipo];
                return (
                  <div key={i} style={{display:"flex",gap:"10px",paddingBottom:"8px",marginBottom:"8px",borderBottom:i<v.eventos.length-1?`1px solid ${C.bdr}`:"none"}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"20px"}}>
                      <span style={{fontSize:"14px"}}>{eIcon}</span>
                      {i<v.eventos.length-1&&<div style={{width:"2px",flex:1,background:C.bdr,marginTop:"4px"}}/>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"12px",fontWeight:700,color:ec}}>{e.tipo}</div>
                      <div style={{fontSize:"11px",color:C.sub}}>⏰ {e.hora} · 👤 {e.registroPor} · 📍 {e.ubicacion}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ):(
            <div>
              <div style={{textAlign:"center",padding:"12px",color:C.muted,fontSize:"12px"}}>Sin eventos registrados aún</div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                <Btn full color={C.blue}>🚛 Registrar Salida</Btn>
                <Btn full color={C.warn} dis>📍 Registrar Llegada</Btn>
                <Btn full color={C.ok} dis>✅ Confirmar Entrega</Btn>
                <Btn full color={C.purple} dis>🏠 Registrar Retorno</Btn>
              </div>
            </div>
          )}
        </Card>

        {/* Inspection required for equipment */}
        {v.asignaciones.some(a=>SOLICITUDES.flatMap(s=>s.lineas).find(l=>l.desc===a.desc)?.tipo==="Equipo")&&(
          <Card s={{padding:"14px",marginBottom:"10px",borderTop:`3px solid ${C.warn}`}}>
            <div style={{fontSize:"11px",fontWeight:700,color:C.warn,textTransform:"uppercase",marginBottom:"4px"}}>⚠️ Inspección Requerida</div>
            <div style={{fontSize:"11px",color:C.sub}}>Este viaje incluye equipo. Se requiere inspección de salida (IC-EQ-F-01-02) antes de partir.</div>
            <Btn sm color={C.warn} onClick={()=>goTo("inspeccion")} style={{marginTop:"6px"}}>📋 Llenar Inspección</Btn>
          </Card>
        )}
      </div>
    </div>
  );
};

// ═══ SCREEN: NOTA DE ENTREGA ═══
const ScrNotaEntrega = ({goTo}) => {
  const v = VIAJES[4]; // Completed trip for demo
  return (
    <div style={{padding:"12px",overflow:"auto",display:"flex",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:"680px"}}>
        <Card s={{padding:"16px",border:`2px solid ${C.navy}`}}>
          {/* Letterhead */}
          <div style={{textAlign:"center",borderBottom:`2px solid ${C.navy}`,paddingBottom:"10px",marginBottom:"10px"}}>
            <div style={{fontSize:"16px",fontWeight:800,color:C.navy,letterSpacing:"1px"}}>ICONSA</div>
            <div style={{fontSize:"11px",color:C.sub}}>Ingeniería de Construcción S.A.</div>
            <div style={{fontSize:"14px",fontWeight:700,color:C.navy,marginTop:"6px"}}>NOTA DE ENTREGA DE MATERIAL</div>
            <div style={{fontSize:"10px",color:C.sub}}>IC-LOG-F-06-04</div>
          </div>
          
          {/* Note header */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",fontSize:"11px",marginBottom:"12px"}}>
            <div><span style={{color:C.sub,fontWeight:600}}>N° Nota:</span> <span style={{fontWeight:700,fontFamily:"monospace"}}>NE-2026-035</span></div>
            <div><span style={{color:C.sub,fontWeight:600}}>Fecha:</span> 10/02/2026</div>
            <div><span style={{color:C.sub,fontWeight:600}}>Movilización:</span> <span style={{fontFamily:"monospace"}}>{v.id}</span></div>
            <div><span style={{color:C.sub,fontWeight:600}}>Hora:</span> 09:30</div>
          </div>
          
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",fontSize:"11px",marginBottom:"12px",padding:"8px",background:C.inp,borderRadius:"6px"}}>
            <div><span style={{color:C.sub,fontWeight:600}}>Entregado por:</span> {v.conductor}</div>
            <div><span style={{color:C.sub,fontWeight:600}}>Recibido por:</span> Juan Jácome</div>
            <div><span style={{color:C.sub,fontWeight:600}}>Hacia:</span> ASTIBAL</div>
            <div><span style={{color:C.sub,fontWeight:600}}>Proyecto:</span> 25-504</div>
          </div>

          {/* Equipment used for mobilization */}
          <div style={{fontSize:"10px",fontWeight:700,color:C.navy,textTransform:"uppercase",marginBottom:"4px"}}>Equipo Utilizado para Movilización</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",fontSize:"11px",marginBottom:"12px",padding:"8px",background:C.blueBg,borderRadius:"6px",border:`1px solid ${C.blue}20`}}>
            <div><span style={{color:C.sub}}>Vehículo:</span> {v.vehiculo}</div>
            <div><span style={{color:C.sub}}>Código:</span> CAM823</div>
            <div><span style={{color:C.sub}}>Placa:</span> AE-4823</div>
            <div><span style={{color:C.sub}}>Tarifa:</span> {v.tarifa} (${v.costo})</div>
          </div>

          {/* Items delivered */}
          <div style={{fontSize:"10px",fontWeight:700,color:C.navy,textTransform:"uppercase",marginBottom:"4px"}}>Material/Equipo Entregado</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px",marginBottom:"12px"}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.navy}`}}>
                {["#","Solicitud","Descripción","Cant","Und","Código Costo"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"4px 6px",fontSize:"9px",fontWeight:700,color:C.sub,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.asignaciones.map((a,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${C.bdr}`}}>
                  <td style={{padding:"5px 6px",color:C.muted}}>{i+1}</td>
                  <td style={{padding:"5px 6px",fontFamily:"monospace",fontSize:"10px",fontWeight:600}}>{a.smId}</td>
                  <td style={{padding:"5px 6px",fontWeight:500}}>{a.desc}</td>
                  <td style={{padding:"5px 6px",fontWeight:600}}>{a.cant}</td>
                  <td style={{padding:"5px 6px"}}>{a.und}</td>
                  <td style={{padding:"5px 6px",fontFamily:"monospace",fontSize:"10px"}}>25-504-01.7113-EQI</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px",marginTop:"16px"}}>
            {["Entregado por","Transportado por","Recibido por"].map((l,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{borderBottom:`1px solid ${C.navy}`,height:"40px",marginBottom:"4px",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
                  <span style={{fontSize:"12px",color:C.blue,fontStyle:"italic"}}>{i===0?"Yoseph C.":i===1?"Coco":"Juan Jácome"}</span>
                </div>
                <div style={{fontSize:"9px",color:C.sub,fontWeight:600,textTransform:"uppercase"}}>{l}</div>
              </div>
            ))}
          </div>
        </Card>
        <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
          <Btn outline sm onClick={()=>goTo("programacion")}>← Volver</Btn>
          <Btn sm color={C.navy}>📄 Exportar PDF</Btn>
        </div>
      </div>
    </div>
  );
};

// ═══ SCREEN: INSPECCIÓN DE EQUIPO ═══
const ScrInspeccion = ({goTo}) => {
  const vals = ["✓","R","A","N/A"];
  return (
    <div style={{padding:"12px",overflow:"auto",display:"flex",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:"680px"}}>
        <Card s={{padding:"14px"}}>
          <div style={{textAlign:"center",marginBottom:"12px"}}>
            <div style={{fontSize:"14px",fontWeight:700,color:C.navy}}>Inspección de Equipo — Entrada/Salida</div>
            <div style={{fontSize:"10px",color:C.sub}}>IC-EQ-F-01-02 · 42 ítems</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",fontSize:"11px",marginBottom:"12px"}}>
            <div><Lbl>Equipo</Lbl><Inp v="CRN001 – Grúa 318" dis/></div>
            <div><Lbl>Tipo Inspección</Lbl><Inp v="Salida" dis/></div>
            <div><Lbl>Horómetro</Lbl><Inp ph="Ej: 12,450 hrs"/></div>
            <div><Lbl>Operador</Lbl><Inp v="Coco"/></div>
          </div>
          <div style={{fontSize:"9px",color:C.sub,marginBottom:"8px",display:"flex",gap:"8px"}}>
            <span>✓ = Bueno</span><span style={{color:C.warn}}>R = Requiere atención</span><span style={{color:C.err}}>A = Averiado</span><span>N/A = No aplica</span>
          </div>
          {INSP_SECTIONS.map((sec,si)=>(
            <div key={si} style={{marginBottom:"8px"}}>
              <div style={{fontSize:"11px",fontWeight:700,color:C.navy,padding:"4px 8px",background:`${C.navy}08`,borderRadius:"4px",marginBottom:"4px"}}>{sec.sec} ({sec.items.length})</div>
              {sec.items.map((item,ii)=>(
                <div key={ii} style={{display:"flex",alignItems:"center",gap:"4px",padding:"3px 8px",borderBottom:`1px solid ${C.bdr}40`,fontSize:"11px"}}>
                  <span style={{flex:1,color:C.txt}}>{item}</span>
                  <div style={{display:"flex",gap:"2px"}}>
                    {vals.map((v,vi)=>(
                      <button key={vi} style={{width:"26px",height:"22px",border:`1px solid ${vi===0?C.ok:C.bdr}`,borderRadius:"3px",fontSize:"9px",fontWeight:700,cursor:"pointer",background:vi===0?C.okBg:"#fff",color:vi===0?C.ok:vi===1?C.warn:vi===2?C.err:C.muted}}>{v}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div style={{marginTop:"10px"}}><Lbl>Observaciones</Lbl><Inp ph="Notas adicionales..." h="50px"/></div>
          <div style={{marginTop:"8px"}}><Lbl>Fotos</Lbl><div style={{border:`2px dashed ${C.bdr}`,borderRadius:"6px",padding:"10px",textAlign:"center",fontSize:"11px",color:C.muted}}>📷 Tomar foto o adjuntar imagen</div></div>
          <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
            <Btn outline sm onClick={()=>goTo("detalleViaje")}>← Volver</Btn>
            <Btn color={C.ok} sm>✅ Guardar Inspección</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ═══ SCREEN: FACTURACIÓN MENSUAL ═══
const ScrFacturacion = () => {
  const completados = VIAJES.filter(v=>v.st==="Completado");
  const porProy = {};
  completados.forEach(v=>{
    v.asignaciones.forEach(a=>{
      const p = a.smId.split("-SM-")[0];
      if(!porProy[p]) porProy[p]={proy:p,nombre:PROYECTOS.find(pr=>pr.codigo===p)?.nombre||p,viajes:0,costo:0};
      if(!porProy[p][v.id]){porProy[p][v.id]=true;porProy[p].viajes++;porProy[p].costo+=v.costo;}
    });
  });
  const filas = Object.values(porProy);
  const total = filas.reduce((s,f)=>s+f.costo,0);

  return (
    <div style={{padding:"12px",overflow:"auto",display:"flex",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:"680px"}}>
        <Card s={{padding:"16px",border:`2px solid ${C.navy}`}}>
          <div style={{textAlign:"center",marginBottom:"12px"}}>
            <div style={{fontSize:"16px",fontWeight:800,color:C.navy}}>FACTURACIÓN MENSUAL DE MOVILIZACIONES</div>
            <div style={{fontSize:"11px",color:C.sub}}>IC-LOG-F-06-05 · Febrero 2026</div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.navy}`}}>
                {["Proyecto","Nombre","Viajes","Costo Total"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"6px 8px",fontSize:"10px",fontWeight:700,color:C.sub,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${C.bdr}`}}>
                  <td style={{padding:"6px 8px",fontFamily:"monospace",fontWeight:700,color:C.navy}}>{f.proy}</td>
                  <td style={{padding:"6px 8px"}}>{f.nombre}</td>
                  <td style={{padding:"6px 8px",textAlign:"center"}}>{f.viajes}</td>
                  <td style={{padding:"6px 8px",fontWeight:700,textAlign:"right"}}>${f.costo.toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{borderTop:`2px solid ${C.navy}`}}>
                <td colSpan={3} style={{padding:"8px",fontWeight:700,fontSize:"13px",color:C.navy}}>TOTAL</td>
                <td style={{padding:"8px",fontWeight:800,fontSize:"14px",color:C.navy,textAlign:"right"}}>${total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          {/* Detail */}
          <div style={{marginTop:"14px",fontSize:"10px",fontWeight:700,color:C.navy,textTransform:"uppercase",marginBottom:"6px"}}>Detalle por Viaje</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"10px"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${C.bdr}`}}>
                {["ID Viaje","Fecha","Vehículo","Conductor","Tarifa","Monto"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"4px 6px",color:C.sub,fontWeight:600}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {completados.map((v,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${C.bdr}40`}}>
                  <td style={{padding:"4px 6px",fontFamily:"monospace",fontWeight:600}}>{v.id}</td>
                  <td style={{padding:"4px 6px"}}>{v.fecha}</td>
                  <td style={{padding:"4px 6px"}}>{v.vehiculo.split("–")[0].trim()}</td>
                  <td style={{padding:"4px 6px"}}>{v.conductor}</td>
                  <td style={{padding:"4px 6px"}}>{v.tarifa}</td>
                  <td style={{padding:"4px 6px",fontWeight:700,textAlign:"right"}}>${v.costo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};

// ═══ SCREEN: MAPA DEL SISTEMA ═══
const ScrSistema = () => (
  <div style={{padding:"12px",overflow:"auto"}}>
    <div style={{fontSize:"14px",fontWeight:800,color:C.navy,marginBottom:"8px"}}>Mapa del Sistema — IC-LOG-PO-06</div>
    {/* Flow */}
    <Card s={{padding:"10px",marginBottom:"10px"}}>
      <div style={{display:"flex",gap:"4px",alignItems:"center",flexWrap:"wrap",justifyContent:"center",fontSize:"11px"}}>
        {[{l:"📝 Solicitud",c:C.blue,u:"Ing. Proyecto"},{l:"→"},{l:"📅 Programación",c:C.purple,u:"Charris"},{l:"→"},{l:"🚛 Ejecución",c:C.warn,u:"Conductor"},{l:"→"},{l:"📄 Nota Entrega",c:C.ok,u:"Receptor"},{l:"→"},{l:"💰 Facturación",c:C.navy,u:"Auto"}].map((s,i)=>
          s.l==="→"?<span key={i} style={{color:C.muted,fontWeight:700}}>→</span>:
          <div key={i} style={{padding:"6px 10px",borderRadius:"6px",background:`${s.c}12`,border:`1.5px solid ${s.c}30`,textAlign:"center",minWidth:"80px"}}>
            <div style={{fontWeight:700,color:s.c}}>{s.l}</div>
            <div style={{fontSize:"9px",color:C.sub}}>{s.u}</div>
          </div>
        )}
      </div>
    </Card>
    {/* Architecture */}
    <Card s={{padding:"10px",marginBottom:"10px"}}>
      <div style={{fontSize:"11px",fontWeight:700,color:C.navy,marginBottom:"6px"}}>🔑 Arquitectura Clave: Relación Many-to-Many</div>
      <div style={{fontSize:"11px",color:C.sub,lineHeight:"1.5"}}>
        <strong>Solicitud</strong> tiene Líneas → Charris agrupa Líneas en <strong>Viajes</strong> → Un viaje puede transportar líneas de <strong>múltiples solicitudes</strong> → Una línea puede requerir <strong>múltiples viajes</strong> → Tabla de asignación: "En este viaje, X cantidad de línea Y de solicitud Z"
      </div>
    </Card>
    {/* Roles */}
    <Card s={{padding:"10px"}}>
      <div style={{fontSize:"11px",fontWeight:700,color:C.navy,marginBottom:"6px"}}>👥 Roles y Permisos (Supabase RLS)</div>
      <div style={{display:"flex",flexDirection:"column",gap:"4px",fontSize:"11px"}}>
        {[
          {r:"pm",d:"Ing. Proyecto",p:"Ve/crea solicitudes de SUS proyectos"},
          {r:"logistica",d:"Charris",p:"Ve TODAS las solicitudes, programa viajes, asigna recursos"},
          {r:"campo",d:"Conductor",p:"Ve viajes asignados, registra eventos, llena inspecciones"},
          {r:"almacen",d:"Almacenista",p:"Ve notas de entrega de su ubicación, confirma recepción"},
          {r:"admin",d:"Administrador",p:"Acceso total, gestión de masters, aprobación de sugerencias"},
        ].map((u,i)=>(
          <div key={i} style={{display:"flex",gap:"8px",padding:"4px 0",borderBottom:`1px solid ${C.bdr}40`}}>
            <Badge sm color={C.navy}>{u.r}</Badge>
            <span style={{fontWeight:600,minWidth:"90px"}}>{u.d}</span>
            <span style={{color:C.sub,flex:1}}>{u.p}</span>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

// ═══ MAIN APP ═══
export default function App() {
  const [screen,setScreen]=useState("dashboard");
  const [user,setUser]=useState(USERS[4]); // James admin
  const [selectedSol,setSelectedSol]=useState(null);
  const [selectedViaje,setSelectedViaje]=useState(null);
  const [showUserMenu,setShowUserMenu]=useState(false);

  const goTo = useCallback((s) => setScreen(s), []);
  
  const nav = [
    {k:"dashboard",l:"Dashboard",ic:"📊",roles:["admin","pm","logistica"]},
    {k:"solicitudes",l:"Solicitudes",ic:"📋",roles:["admin","pm","logistica"]},
    {k:"nuevaSol",l:"+ Nueva",ic:"✏️",roles:["admin","pm"]},
    {k:"programacion",l:"Programación",ic:"📅",roles:["admin","logistica"]},
    {k:"notaEntrega",l:"Nota Entrega",ic:"📄",roles:["admin","logistica","campo","almacen"]},
    {k:"inspeccion",l:"Inspección",ic:"🔍",roles:["admin","logistica","campo"]},
    {k:"facturacion",l:"Facturación",ic:"💰",roles:["admin","logistica"]},
    {k:"sistema",l:"Sistema",ic:"🗺️",roles:["admin"]},
  ].filter(n=>n.roles.includes(user.role));

  return (
    <div style={{fontFamily:"'Segoe UI',-apple-system,system-ui,sans-serif",height:"100vh",display:"flex",flexDirection:"column",background:C.bg}}>
      {/* TOP BAR */}
      <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyL})`,padding:"0 12px",height:"48px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",flexShrink:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <span style={{fontWeight:800,color:C.gold,fontSize:"15px",letterSpacing:"1px"}}>ICONSA</span>
          <span style={{color:"rgba(255,255,255,0.4)",fontSize:"11px"}}>Sistema de Movilizaciones</span>
        </div>
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowUserMenu(!showUserMenu)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"}}>
            👤 {user.name.split(" ")[0]} <span style={{fontSize:"9px",color:C.gold}}>({user.role})</span> ▾
          </button>
          {showUserMenu&&(
            <div style={{position:"absolute",top:"32px",right:0,background:"#fff",borderRadius:"8px",boxShadow:"0 4px 16px rgba(0,0,0,0.15)",padding:"4px",minWidth:"200px",zIndex:200}}>
              <div style={{padding:"6px 8px",fontSize:"9px",color:C.sub,fontWeight:700,textTransform:"uppercase"}}>Cambiar usuario (demo)</div>
              {USERS.map((u,i)=>(
                <button key={i} onClick={()=>{setUser(u);setShowUserMenu(false);setScreen("dashboard");}} style={{display:"block",width:"100%",padding:"6px 8px",border:"none",background:user.name===u.name?C.blueBg:"transparent",cursor:"pointer",fontSize:"11px",textAlign:"left",borderRadius:"4px"}}>
                  <span style={{fontWeight:600}}>{u.name}</span>
                  <span style={{color:C.sub,marginLeft:"4px"}}>— {u.label} ({u.role})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* SIDEBAR */}
        <div style={{width:"140px",background:"#fff",borderRight:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",padding:"6px",gap:"2px",flexShrink:0,overflow:"auto"}}>
          {nav.map(n=>(
            <button key={n.k} onClick={()=>{if(n.k==="nuevaSol"){setSelectedSol(null);goTo("detalleSol");}else goTo(n.k);}} style={{display:"flex",alignItems:"center",gap:"6px",padding:"8px",borderRadius:"6px",border:"none",background:screen===n.k?`${C.navy}10`:"transparent",cursor:"pointer",fontSize:"11px",fontWeight:screen===n.k?700:500,color:screen===n.k?C.navy:C.sub,textAlign:"left"}}>
              <span style={{fontSize:"14px"}}>{n.ic}</span>{n.l}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,overflow:"auto",background:C.bg}}>
          {screen==="dashboard"&&<ScrDashboard user={user} goTo={goTo}/>}
          {screen==="solicitudes"&&<ScrSolicitudes user={user} goTo={goTo} setSelectedSol={setSelectedSol}/>}
          {screen==="detalleSol"&&<ScrDetalleSol sol={selectedSol} goTo={goTo} isNew={!selectedSol}/>}
          {screen==="programacion"&&<ScrProgramacion goTo={goTo} setSelectedViaje={setSelectedViaje}/>}
          {screen==="detalleViaje"&&<ScrDetalleViaje viaje={selectedViaje} goTo={goTo}/>}
          {screen==="notaEntrega"&&<ScrNotaEntrega goTo={goTo}/>}
          {screen==="inspeccion"&&<ScrInspeccion goTo={goTo}/>}
          {screen==="facturacion"&&<ScrFacturacion/>}
          {screen==="sistema"&&<ScrSistema/>}
        </div>
      </div>
    </div>
  );
}
