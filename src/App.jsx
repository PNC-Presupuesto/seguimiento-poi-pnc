import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, ListChecks, ClipboardEdit, FileText, Plus, Trash2,
  Save, X, TrendingUp, Wallet, Target, AlertCircle, CheckCircle2,
  Calendar, Briefcase, Loader2, Edit3, Building2, Filter, Download,
  CalendarClock, MailOpen, Lock, Unlock, Send, Check, Clock, XCircle,
  User, LogOut, Shield, Eye, EyeOff, RefreshCw, FileSpreadsheet, Printer,
  Bell, History, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ComposedChart, Area, Cell,
  PieChart, Pie, LabelList
} from 'recharts';
import { storage } from './supabaseStorage.js';
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Años disponibles para programación: desde 2026 hasta 2100 (sistema de uso multianual)
const ANIO_INICIAL = 2026;
const ANIO_FINAL = 2100;
const ANIOS_DISPONIBLES = Array.from({ length: ANIO_FINAL - ANIO_INICIAL + 1 }, (_, i) => ANIO_INICIAL + i);

// Versión del seed institucional. Al incrementarse, fuerza la recarga de los datos oficiales
// PNC 2026 (actividades, programación y seguimiento) la próxima vez que se abra el sistema.
const SEED_VERSION = 'pnc-2026-oficial-v5-final';

const CENTROS_COSTO = [
  { codigo: '03.07', nombre: 'GESTIÓN PNC', desc: 'Conducción y gestión administrativa, financiera y operativa del PNC', pia: 2094363,
    resumen: 'El Centro de Costos de la Gestión y Administración del Programa Nuestras Ciudades, bajo el ámbito del Viceministerio de Vivienda y Urbanismo del MVCS, es el órgano encargado de la dirección y coordinación integral de todas las actividades del programa. Su función principal es asegurar la planificación, ejecución, monitoreo y evaluación eficiente de los proyectos de inversión pública en infraestructura urbana a nivel nacional, así como promover el crecimiento, conservación, mejoramiento, protección e integración de nuestras ciudades.' },
  { codigo: '03.07.06', nombre: 'UGEDEUS', desc: 'Unidad de Gestión del Desarrollo Urbano Sostenible', pia: 817160,
    resumen: 'El Programa Nuestras Ciudades, a través de la Unidad de Gestión del Desarrollo Urbano Sostenible (UGEDEUS), desarrolla estudios, investigaciones y planes en materias de desarrollo urbano sostenible, acondicionamiento territorial y gestión ambiental. Asimismo brinda asistencia técnica y capacitación en dichas materias, y promueve la gestión del desarrollo urbano sostenible. La UGEDEUS también brinda asistencia técnica a los gobiernos locales en la implementación de Sistemas de Información Geográfica (SIG).' },
  { codigo: '03.07.07', nombre: 'UGERDES', desc: 'Unidad de Gestión del Riesgo de Desastres', pia: 22144570,
    resumen: 'El Programa Nuestras Ciudades, a través de la Unidad de Gestión del Riesgo de Desastres (UGERDES), desarrolla acciones de estimación, prevención y reducción de riesgos de desastres en las ciudades del país, en el marco de las políticas nacionales y sectoriales, y de los instrumentos de Gestión del Riesgo de Desastres. Realiza asistencia técnica, capacitación, estudios para establecer el riesgo y fortalecimiento de capacidades de los gobiernos regionales y locales. El PNC-Maquinarias realiza trabajos de prevención, mitigación de riesgos y atención de emergencias mediante 19 Unidades Básicas Operativas (UBO) a nivel nacional.' },
  { codigo: '03.07.08', nombre: 'UNINDEUS', desc: 'Unidad de Inversiones para el Desarrollo Urbano Sostenible', pia: 0,
    resumen: 'La Unidad de Inversiones para el Desarrollo Urbano Sostenible (UNINDEUS) se encarga de la formulación, ejecución, supervisión y liquidación de los proyectos de inversión pública del programa, así como de la asistencia técnica a las unidades formuladoras y evaluadoras de los gobiernos locales y la promoción de inversiones público-privadas.' },
];

const fmtMoney = (n) => `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Semáforo visual de ejecución: verde ≥95%, amarillo ≥75%, rojo <75%
const getExecutionColor = (pct) => {
  const v = Number(pct) || 0;
  if (v >= 95) return { bg: '#D8EBD3', text: '#2D7A4E', bar: '#2D7A4E' };
  if (v >= 75) return { bg: '#FBF1D9', text: '#9C7A2B', bar: '#C9A350' };
  return { bg: '#F5D5D5', text: '#B33B3B', bar: '#B33B3B' };
};
const fmtMoneyShort = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `S/ ${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `S/ ${(v / 1e3).toFixed(1)}K`;
  return `S/ ${v.toFixed(0)}`;
};
// Número entero con separador de miles (sin decimales): 1,234,567
const fmtEntero = (n) => (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
// Número con 2 decimales y separador de miles: 1,234,567.89
const fmtDecimal = (n) => (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Abreviado en millones enteros para gráficos de barras: 5M
const fmtMillonesEnteros = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `${Math.round(v / 1e6)}M`;
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)}K`;
  return `${Math.round(v)}`;
};
const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const uid = () => Math.random().toString(36).slice(2, 10);

// Renderer de etiqueta de % sobre las barras. Recharts pasa {x, y, width, value}.
// value es el string del campo indicado en dataKey (ej "87%" o "").
function PctBarLabel(props) {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 4}
      textAnchor="middle"
      fontSize={10}
      fontWeight={700}
      fill="#1E2A3A">
      {value}
    </text>
  );
}


// Genéricas de gasto del clasificador presupuestal MEF
const GENERICAS_GASTO = [
  { codigo: '2.1', nombre: 'PERSONAL Y OBLIGACIONES SOCIALES' },
  { codigo: '2.3', nombre: 'BIENES Y SERVICIOS' },
  { codigo: '2.4', nombre: 'DONACIONES Y TRANSFERENCIAS' },
  { codigo: '2.5', nombre: 'OTROS GASTOS' },
  { codigo: '2.6', nombre: 'ADQUISICIÓN DE ACTIVOS NO FINANCIEROS' },
];

// Objetivos Estratégicos Institucionales (OEI) del PEI 2024-2030 del MVCS - PNC
const OEI_LISTA_INICIAL = [
  { codigo: 'OEI.01', nombre: 'FORTALECER LA GESTIÓN DE INVERSIONES Y PRESTACIÓN DE SERVICIOS DE AGUA POTABLE Y SANEAMIENTO EN EL ÁMBITO URBANO A LOS PRESTADORES; GOBIERNOS REGIONALES Y LOCALES.' },
  { codigo: 'OEI.05', nombre: 'PROMOVER EDIFICACIONES E INFRAESTRUCTURA URBANA SEGURA; SOSTENIBLE; CON ACCESIBILIDAD UNIVERSAL Y CONSIDERANDO LA INNOVACIÓN ACORDE A LOS AVANCES TECNOLÓGICOS EN BENEFICIO DE LA POBLACIÓN NACIONAL.' },
  { codigo: 'OEI.06', nombre: 'MEJORAR LAS CAPACIDADES EN MATERIA DE GESTIÓN TERRITORIAL Y URBANA DE LOS GOBIERNOS SUBNACIONALES Y SOCIEDAD CIVIL A NIVEL NACIONAL.' },
  { codigo: 'OEI.07', nombre: 'FORTALECER LA IMPLEMENTACIÓN DE LA GRD; LA GESTIÓN AMBIENTAL Y CAMBIO CLIMÁTICO; EN LAS ENTIDADES PÚBLICAS Y PRIVADAS EN LAS MATERIAS DEL SECTOR.' },
];

// Acciones Estratégicas Institucionales (AEI), cada una vinculada a un OEI
const AEI_LISTA_INICIAL = [
  { codigo: 'AEI.01.05', oei: 'OEI.01', nombre: 'INFRAESTRUCTURA DE AGUA POTABLE Y SANEAMIENTO SOSTENIBLE EN EL ÁMBITO URBANO; CON INTERVENCIÓN DEL MVCS A GOBIERNOS LOCALES Y PRESTADORES' },
  { codigo: 'AEI.05.06', oei: 'OEI.05', nombre: 'INFRAESTRUCTURA URBANA SOSTENIBLE Y ACCESIBLE EN BENEFICIO DE LOS CENTROS POBLADOS URBANOS DEL PAÍS' },
  { codigo: 'AEI.06.01', oei: 'OEI.06', nombre: 'MARCO TÉCNICO Y NORMATIVO POSICIONADO EN EL SECTOR PARA LA GESTIÓN TERRITORIAL Y URBANA; Y GESTIÓN DEL SUELO A NIVEL NACIONAL' },
  { codigo: 'AEI.06.03', oei: 'OEI.06', nombre: 'CAPACITACIÓN EFECTIVA EN MATERIA DE GESTIÓN TERRITORIAL Y URBANA DE LOS EQUIPOS A CARGO DE LA MATERIA EN LOS GOBIERNOS REGIONALES Y LOCALES A NIVEL NACIONAL; ASÍ COMO PROFESIONALES Y SOCIEDAD CIVIL' },
  { codigo: 'AEI.06.04', oei: 'OEI.06', nombre: 'ASISTENCIA TÉCNICA EFECTIVA EN MATERIA DE GESTIÓN TERRITORIAL Y URBANA A LOS GOBIERNOS REGIONALES Y LOCALES A NIVEL NACIONAL' },
  { codigo: 'AEI.06.05', oei: 'OEI.06', nombre: 'PLATAFORMA DE INFORMACIÓN GEOESPACIAL ACCESIBLE SOBRE LOS PROCESOS DE PLANIFICACIÓN Y GESTIÓN URBANA Y TERRITORIAL; PARA ENTIDADES PÚBLICAS; PRIVADAS; SOCIEDAD CIVIL Y ACADEMIA A NIVEL NACIONAL' },
  { codigo: 'AEI.07.02', oei: 'OEI.07', nombre: 'FORTALECIMIENTO DE CAPACIDADES EN GESTIÓN DEL RIESGO DE DESASTRES; GESTIÓN AMBIENTAL Y CAMBIO CLIMÁTICO INTEGRAL DIRIGIDO A LOS ACTORES DEL SECTOR' },
  { codigo: 'AEI.07.03', oei: 'OEI.07', nombre: 'INTERVENCIONES INTEGRALES PARA REDUCIR LAS CONDICIONES DE RIESGO DE LA POBLACIÓN' },
  { codigo: 'AEI.07.04', oei: 'OEI.07', nombre: 'ESTUDIOS DE ESTIMACIÓN DE RIESGO DE DESASTRES PERTINENTES PARA LOS TOMADORES DE DECISIONES' },
  { codigo: 'AEI.07.05', oei: 'OEI.07', nombre: 'CAPACIDAD INSTALADA ADECUADA; PARA LA PREPARACIÓN Y RESPUESTA FRENTE A EMERGENCIAS Y DESASTRES A FAVOR DE LA POBLACIÓN.' },
];

// Variables mutables (pueden ampliarse desde la interfaz y persisten en window.storage).
// El estado de React (en App) sincroniza estas referencias para que el código legado las lea actualizadas.
let OEI_LISTA = OEI_LISTA_INICIAL.map(o => ({ ...o }));
let AEI_LISTA = AEI_LISTA_INICIAL.map(a => ({ ...a }));

// Devuelve las AEI que pertenecen a un OEI dado
function aeisPorOEI(oeiCodigo) {
  return AEI_LISTA.filter(a => a.oei === oeiCodigo);
}

// Infiere el OEI/AEI por defecto según el Centro de Costo (mapeo de los POI 2026 por CC).
// El usuario puede cambiarlo manualmente en el formulario de actividad.
function inferirOeiAei(cc) {
  const c = (cc || '').toUpperCase();
  if (c.includes('GESTIÓN') || c.includes('GESTION PNC') || c === 'GESTIÓN PNC') {
    return { oei: 'OEI.06', aei: 'AEI.06.01' };  // GESTIÓN PNC → Conducción y gestión
  }
  if (c.includes('UGEDEUS') || c.includes('DESARROLLO URBANO SOSTENIBLE')) {
    return { oei: 'OEI.06', aei: 'AEI.06.04' };  // UGEDEUS → Asistencia técnica
  }
  if (c.includes('UGERDES') || c.includes('RIESGO DE DESASTRES')) {
    return { oei: 'OEI.07', aei: 'AEI.07.02' };  // UGERDES → GRD
  }
  if (c.includes('UNINDEUS') || c.includes('INVERSIONES EN DESARROLLO')) {
    return { oei: 'OEI.01', aei: 'AEI.01.05' };  // UNINDEUS → Agua potable y saneamiento
  }
  return { oei: '', aei: '' };
}

/* ============================================================
   UTILIDADES DE IMPORTACIÓN DESDE EXCEL (.xlsx)
   ============================================================ */

// Mapeo del código contable del Centro de Costo (de los Excel oficiales) al nombre corto del sistema.
const CC_ID_A_NOMBRE = {
  '03.07': 'GESTIÓN PNC',
  '03.07.06': 'UGEDEUS',
  '03.07.07': 'UGERDES',
  '03.07.08': 'UNINDEUS',
};
// Mapeo del nombre largo (de los Excel) al nombre corto del sistema.
const CC_LARGO_A_NOMBRE = {
  'PROGRAMA NUESTRAS CIUDADES': 'GESTIÓN PNC',
  'UNIDAD DE GESTION DEL DESARROLLO URBANO SOSTENIBLE': 'UGEDEUS',
  'UNIDAD DE GESTIÓN DEL DESARROLLO URBANO SOSTENIBLE': 'UGEDEUS',
  'UNIDAD DE GESTION DEL RIESGO DE DESASTRES': 'UGERDES',
  'UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES': 'UGERDES',
  'UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE': 'UNINDEUS',
};
// Mapeo del "GG ID" del clasificador MEF (p.ej. '5-21', '6-26') a la genérica del sistema (2.1, 2.6, ...)
const GG_ID_A_GENERICA = { '5-21': '2.1', '5-23': '2.3', '5-24': '2.4', '6-24': '2.4', '5-25': '2.5', '6-26': '2.6' };

// Normaliza un valor de celda Excel: quita apóstrofo inicial y espacios.
function cellStr(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/^'/, '').trim();
}
function cellNum(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
// Resuelve el nombre corto del CC a partir del id contable o el nombre largo.
function resolverCC(ccId, ccNombre) {
  const id = cellStr(ccId);
  if (CC_ID_A_NOMBRE[id]) return CC_ID_A_NOMBRE[id];
  const nm = cellStr(ccNombre).toUpperCase();
  if (CC_LARGO_A_NOMBRE[nm]) return CC_LARGO_A_NOMBRE[nm];
  // intento por nombre corto directo
  const inf = inferirOeiAei(nm);
  if (nm.includes('PROGRAMA NUESTRAS') || nm.includes('GESTIÓN PNC') || nm.includes('GESTION PNC')) return 'GESTIÓN PNC';
  if (nm.includes('UGEDEUS') || nm.includes('DESARROLLO URBANO')) return 'UGEDEUS';
  if (nm.includes('UGERDES') || nm.includes('RIESGO DE DESASTRES')) return 'UGERDES';
  if (nm.includes('UNINDEUS') || nm.includes('INVERSIONES')) return 'UNINDEUS';
  return cellStr(ccNombre);
}

// Carga la librería SheetJS (xlsx) desde CDN una sola vez (para leer archivos .xlsx en el navegador).
let _xlsxLoaderPromise = null;
function cargarSheetJS() {
  if (typeof window !== 'undefined' && window.XLSX) return Promise.resolve(window.XLSX);
  if (_xlsxLoaderPromise) return _xlsxLoaderPromise;
  _xlsxLoaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error('No se pudo cargar la librería de lectura de Excel (XLSX).'));
    document.head.appendChild(s);
  });
  return _xlsxLoaderPromise;
}

// Lee un File .xlsx y devuelve { sheetName, rows } donde rows es matriz (array de arrays).
async function leerXlsx(file) {
  const XLSX = await cargarSheetJS();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  return { sheetName, rows };
}

// Carga la librería Mammoth (lectura de .docx) desde CDN una sola vez.
let _mammothLoaderPromise = null;
function cargarMammoth() {
  if (typeof window !== 'undefined' && window.mammoth) return Promise.resolve(window.mammoth);
  if (_mammothLoaderPromise) return _mammothLoaderPromise;
  _mammothLoaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    s.onload = () => resolve(window.mammoth);
    s.onerror = () => reject(new Error('No se pudo cargar la librería de lectura de Word (Mammoth).'));
    document.head.appendChild(s);
  });
  return _mammothLoaderPromise;
}

// Lee un .docx y devuelve su texto plano (línea por línea).
async function leerDocxTexto(file) {
  const mammoth = await cargarMammoth();
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value || '';
}

const _MES_NOMBRE_IDX = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, setiembre: 9, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

// Analiza el texto del Informe mensual POI y devuelve:
//  - comments: { aoi -> { mes -> {logros, limitaciones, medidas} } }
//  - modifs:   { ccNombre -> { mes -> texto } }
function parsearComentariosInforme(texto) {
  const lineas = texto.split(/\r?\n/);
  const comments = {};
  const modifs = {};
  let curCC = null, curSection = null, curAOI = null, curMes = null, buf = [];
  const limpiar = (s) => s.replace(/\*/g, '').trim();
  const ccCorto = (cod) => CC_ID_A_NOMBRE[cod] || null;

  function flush() {
    if (!buf.length) { return; }
    const txt = buf.map(x => x.trim()).filter(Boolean).join(' ').trim();
    buf = [];
    if (!txt) return;
    if (curSection === 'modificaciones') {
      if (curCC && curMes) { (modifs[curCC] = modifs[curCC] || {})[curMes] = txt; }
    } else if (['logros', 'limitaciones', 'medidas'].includes(curSection) && curAOI && curMes) {
      const c = (comments[curAOI] = comments[curAOI] || {});
      (c[curMes] = c[curMes] || {})[curSection] = txt;
    }
  }
  function normMes(linea) {
    const s = limpiar(linea).toLowerCase();
    return _MES_NOMBRE_IDX[s] || null;
  }

  for (const raw of lineas) {
    const s = limpiar(raw);
    const mcc = s.match(/CENTRO DE COSTOS?\.?\s*(03\.07(?:\.\d+)?)/i);
    if (mcc) { flush(); curCC = ccCorto(mcc[1]); curSection = null; curAOI = null; curMes = null; continue; }
    if (/PRINCIPALES LOGROS/i.test(s)) { flush(); curSection = 'logros'; curAOI = null; curMes = null; continue; }
    if (/LIMITACIONES/i.test(s)) { flush(); curSection = 'limitaciones'; curAOI = null; curMes = null; continue; }
    if (/MEDIDAS ADOPTADAS/i.test(s)) { flush(); curSection = 'medidas'; curAOI = null; curMes = null; continue; }
    if (/\bMODIFICACIONES\b/i.test(s)) { flush(); curSection = 'modificaciones'; curAOI = null; curMes = null; continue; }
    if (/RESUMEN EJECUTIVO/i.test(s)) { flush(); curSection = 'resumen'; curAOI = null; curMes = null; continue; }
    const maoi = s.match(/^\s*AOI\s*([0-9]{8,})\s*[:\s]/);
    if (maoi) { flush(); curAOI = 'AOI' + maoi[1].replace(/\s/g, ''); curMes = null; continue; }
    const mm = normMes(raw);
    if (mm && s.length <= 12) { flush(); curMes = mm; continue; }
    if (['logros', 'limitaciones', 'medidas', 'modificaciones'].includes(curSection) && s) buf.push(s);
  }
  flush();
  return { comments, modifs };
}

// Aplica los comentarios extraídos del Word a los registros de seguimiento de un año.
// Crea el registro si no existe para esa actividad/mes.
function importarComentariosInforme({ comments, modifs }, progress, activities, anio) {
  const actByAOI = {}; activities.forEach(a => { if (a.codigoAOI) actByAOI[a.codigoAOI] = a; });
  const next = progress.map(p => ({ ...p }));
  const findReg = (actId, m) => next.find(p => p.actividadId === actId && p.anio === anio && p.mes === m);
  function asegurar(actId, m) {
    let reg = findReg(actId, m);
    if (!reg) {
      reg = { id: uid(), actividadId: actId, anio, mes: m, avanceFisico: 0, avanceFinanciero: 0, logros: '', limitaciones: '', medidas: '', modificaciones: '', fechaRegistro: new Date().toISOString() };
      next.push(reg);
    }
    return reg;
  }
  let nComent = 0, nMod = 0;
  Object.keys(comments).forEach(aoi => {
    const a = actByAOI[aoi]; if (!a) return;
    Object.keys(comments[aoi]).forEach(mStr => {
      const m = Number(mStr); const c = comments[aoi][m];
      const reg = asegurar(a.id, m);
      if (c.logros) reg.logros = c.logros;
      if (c.limitaciones) reg.limitaciones = c.limitaciones;
      if (c.medidas) reg.medidas = c.medidas;
      nComent++;
    });
  });
  // Modificaciones por CC y mes: se aplican a todas las actividades de ese CC con registro en el mes
  Object.keys(modifs).forEach(cc => {
    const actsCC = activities.filter(a => a.centroCosto === cc);
    Object.keys(modifs[cc]).forEach(mStr => {
      const m = Number(mStr); const txt = modifs[cc][m];
      actsCC.forEach(a => {
        const reg = findReg(a.id, m);
        if (reg) { reg.modificaciones = txt; nMod++; }
      });
    });
  });
  return { progress: next, resumen: `${nComent} comentarios y ${nMod} notas de modificación aplicados` };
}

// Localiza el índice de fila de encabezados buscando un texto de columna conocido.
function buscarFilaEncabezado(rows, claves) {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const fila = (rows[i] || []).map(c => cellStr(c).toUpperCase());
    if (claves.some(k => fila.some(celda => celda.includes(k)))) return i;
  }
  return -1;
}

// Detecta qué tipo de archivo POI es, según sus columnas de encabezado.
function detectarTipoExcel(rows) {
  const hdrIdx = buscarFilaEncabezado(rows, ['ACTIVIDAD OPERATIVA ID', 'ACT OPERAT', 'CENTRO DE COSTO']);
  const hdr = (rows[hdrIdx] || rows[1] || rows[0] || []).map(c => cellStr(c).toUpperCase());
  const tiene = (txt) => hdr.some(h => h.includes(txt));
  if (tiene('DEV') && (tiene('GENERICA GASTO') || tiene('ACT OPERAT'))) return { tipo: 'ejec_financiera', hdrIdx };
  if (tiene('FN(CS)') || tiene('GG ID') || tiene('GENERICA DE GASTO')) return { tipo: 'prog_financiera', hdrIdx };
  if (tiene('F(CS)') && tiene('F(RE)')) return { tipo: 'prog_fisica', hdrIdx };
  if (tiene('F(SE)')) return { tipo: 'ejec_fisica', hdrIdx };
  if (tiene('ACTIVIDAD OPERATIVA ID') && tiene('AEI')) return { tipo: 'relacion', hdrIdx };
  return { tipo: 'desconocido', hdrIdx };
}

// Devuelve un mapa { 'TÍTULO COLUMNA' -> índice } a partir de la fila de encabezado.
function mapaColumnas(rows, hdrIdx) {
  const m = {};
  (rows[hdrIdx] || []).forEach((c, i) => { const k = cellStr(c).toUpperCase(); if (k) m[k] = i; });
  return m;
}

// Crea una actividad base nueva con la estructura completa del modelo.
function nuevaActividadBase(campos) {
  return {
    id: uid(), centroCosto: '', area: '', codigoRegistro: '', codigoAOI: '', nombre: '',
    unidadMedida: '', responsable: '', oei: '', aei: '',
    activo: true, piaBloqueado: false,
    genericas: nuevasGenericas(), fisicaMensual: nuevaFisicaMensual(),
    programacion: Array.from({ length: 12 }, () => ({ fisica: 0, financiera: 0 })),
    ...campos,
  };
}

// (1) RELACIÓN ACTIVIDADES ↔ AEI/OEI: agrega/actualiza actividades con OEI/AEI, registro, nombre, UM.
function importarRelacionActividades(rows, activities) {
  const { hdrIdx } = detectarTipoExcel(rows);
  const col = mapaColumnas(rows, hdrIdx);
  const cCC = col['CENTRO COSTO ID'], cCCN = col['CENTRO DE COSTO'];
  const cOEI = col['OEI'], cAEI = col['AEI'], cReg = col['NRO REGISTRO POI'];
  const cAOI = col['ACTIVIDAD OPERATIVA ID'], cNom = col['ACTIVIDAD OPERATIVA'], cUM = col['UNIDAD DE MEDIDA'];
  const next = activities.map(a => ({ ...a }));
  const idxByAOI = {}; next.forEach((a, i) => { if (a.codigoAOI) idxByAOI[a.codigoAOI] = i; });
  let creadas = 0, actualizadas = 0;
  for (let r = hdrIdx + 1; r < rows.length; r++) {
    const fila = rows[r]; if (!fila) continue;
    const aoi = cellStr(fila[cAOI]); if (!aoi) continue;
    const cc = resolverCC(fila[cCC], fila[cCCN]);
    const datos = {
      centroCosto: cc, codigoRegistro: cellStr(fila[cReg]), codigoAOI: aoi,
      nombre: cellStr(fila[cNom]), unidadMedida: cellStr(fila[cUM]),
      oei: cellStr(fila[cOEI]), aei: cellStr(fila[cAEI]),
    };
    if (idxByAOI[aoi] !== undefined) {
      next[idxByAOI[aoi]] = { ...next[idxByAOI[aoi]], ...datos };
      actualizadas++;
    } else {
      const a = nuevaActividadBase({ ...datos, area: cc });
      idxByAOI[aoi] = next.length; next.push(a); creadas++;
    }
  }
  return { activities: next, resumen: `${creadas} creadas, ${actualizadas} actualizadas` };
}

// (2) PROGRAMACIÓN FINANCIERA: carga genéricas PIA (Fn(CS) 01-12) y PIM (Fn(RE) 01-12) por actividad.
function importarProgFinanciera(rows, activities) {
  const { hdrIdx } = detectarTipoExcel(rows);
  const col = mapaColumnas(rows, hdrIdx);
  const cAOI = col['ACTIVIDAD OPERATIVA ID'], cGG = col['GG ID'];
  const cCC = col['CENTRO COSTO ID'], cCCN = col['CENTRO DE COSTO'];
  const cOEI = col['OEI'], cAEI = col['AEI'], cReg = col['NRO REGISTRO POI'];
  const cNom = col['ACTIVIDAD OPERATIVA'], cUM = col['UNIDAD DE MEDIDA'];
  const piaCols = [], pimCols = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    if (col['FN(CS) ' + mm] !== undefined) piaCols.push(col['FN(CS) ' + mm]);
    if (col['FN(RE) ' + mm] !== undefined) pimCols.push(col['FN(RE) ' + mm]);
  }
  const next = activities.map(a => ({ ...a, genericas: JSON.parse(JSON.stringify(a.genericas || nuevasGenericas())) }));
  const idxByAOI = {}; next.forEach((a, i) => { if (a.codigoAOI) idxByAOI[a.codigoAOI] = i; });
  let tocadas = 0;
  // limpiar genéricas de las actividades que aparezcan en el archivo (para reemplazar, no acumular en reimport)
  const vistos = new Set();
  for (let r = hdrIdx + 1; r < rows.length; r++) {
    const fila = rows[r]; if (!fila) continue;
    const aoi = cellStr(fila[cAOI]); if (!aoi) continue;
    let idx = idxByAOI[aoi];
    if (idx === undefined) {
      const cc = resolverCC(fila[cCC], fila[cCCN]);
      const a = nuevaActividadBase({
        centroCosto: cc, area: cc, codigoAOI: aoi, codigoRegistro: cellStr(fila[cReg]),
        nombre: cellStr(fila[cNom]), unidadMedida: cellStr(fila[cUM]),
        oei: cellStr(fila[cOEI]), aei: cellStr(fila[cAEI]),
      });
      idx = next.length; idxByAOI[aoi] = idx; next.push(a);
    }
    if (!vistos.has(aoi)) { next[idx].genericas = nuevasGenericas(); vistos.add(aoi); tocadas++; }
    const gen = GG_ID_A_GENERICA[cellStr(fila[cGG])];
    if (!gen) continue;
    const g = next[idx].genericas[gen] || (next[idx].genericas[gen] = { pia: Array(12).fill(0), pim: Array(12).fill(0) });
    piaCols.forEach((c, i) => { g.pia[i] += cellNum(fila[c]); });
    pimCols.forEach((c, i) => { g.pim[i] += cellNum(fila[c]); });
  }
  // recalcular derivados
  next.forEach(a => {
    if (vistos.has(a.codigoAOI)) {
      a.presupuestoAnual = totalFinancieroActividad(a, 'pim');
      a.presupuestoAnualPIA = totalFinancieroActividad(a, 'pia');
      const tienePIA = totalFinancieroActividad(a, 'pia') > 0;
      if (tienePIA) a.piaBloqueado = true;
    }
  });
  return { activities: next, resumen: `${tocadas} actividades con programación financiera` };
}

// (3) PROGRAMACIÓN META FÍSICA: carga física mensual PIA (F(CS)) y PIM (F(RE)).
function importarProgFisica(rows, activities) {
  const { hdrIdx } = detectarTipoExcel(rows);
  const col = mapaColumnas(rows, hdrIdx);
  const cAOI = col['ACTIVIDAD OPERATIVA ID'];
  const piaCols = [], pimCols = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    if (col['F(CS) ' + mm] !== undefined) piaCols.push(col['F(CS) ' + mm]);
    if (col['F(RE) ' + mm] !== undefined) pimCols.push(col['F(RE) ' + mm]);
  }
  const next = activities.map(a => ({ ...a, fisicaMensual: JSON.parse(JSON.stringify(a.fisicaMensual || nuevaFisicaMensual())) }));
  const idxByAOI = {}; next.forEach((a, i) => { if (a.codigoAOI) idxByAOI[a.codigoAOI] = i; });
  let tocadas = 0;
  for (let r = hdrIdx + 1; r < rows.length; r++) {
    const fila = rows[r]; if (!fila) continue;
    const aoi = cellStr(fila[cAOI]); if (!aoi) continue;
    const idx = idxByAOI[aoi]; if (idx === undefined) continue;
    const fm = nuevaFisicaMensual();
    piaCols.forEach((c, i) => { fm.pia[i] = cellNum(fila[c]); });
    pimCols.forEach((c, i) => { fm.pim[i] = cellNum(fila[c]); });
    next[idx].fisicaMensual = fm;
    next[idx].metaAnualFisica = fm.pia.reduce((s, x) => s + x, 0);
    next[idx].metaAnualFisicaPIM = fm.pim.reduce((s, x) => s + x, 0);
    tocadas++;
  }
  return { activities: next, resumen: `${tocadas} actividades con meta física` };
}

// (4) EJECUCIÓN META FÍSICA: crea/actualiza registros de seguimiento con avance físico mensual (F(SE)).
function importarEjecFisica(rows, progress, activities, anio) {
  const { hdrIdx } = detectarTipoExcel(rows);
  const col = mapaColumnas(rows, hdrIdx);
  const cAOI = col['ACTIVIDAD OPERATIVA ID'];
  const seCols = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    if (col['F(SE) ' + mm] !== undefined) seCols.push(col['F(SE) ' + mm]);
  }
  const actByAOI = {}; activities.forEach(a => { if (a.codigoAOI) actByAOI[a.codigoAOI] = a; });
  const next = progress.map(p => ({ ...p }));
  const findReg = (actId, m) => next.find(p => p.actividadId === actId && p.anio === anio && p.mes === m);
  let tocados = 0;
  for (let r = hdrIdx + 1; r < rows.length; r++) {
    const fila = rows[r]; if (!fila) continue;
    const aoi = cellStr(fila[cAOI]); if (!aoi) continue;
    const a = actByAOI[aoi]; if (!a) continue;
    seCols.forEach((c, i) => {
      const val = cellNum(fila[c]);
      const m = i + 1;
      let reg = findReg(a.id, m);
      if (!reg) {
        if (val === 0) return;
        reg = { id: uid(), actividadId: a.id, anio, mes: m, avanceFisico: 0, avanceFinanciero: 0, logros: '', limitaciones: '', medidas: '', fechaRegistro: new Date().toISOString() };
        next.push(reg);
      }
      reg.avanceFisico = val;
      tocados++;
    });
  }
  return { progress: next, resumen: `${tocados} avances físicos cargados` };
}

// (5) EJECUCIÓN FINANCIERA: suma el devengado mensual por actividad y lo coloca como avance financiero.
function importarEjecFinanciera(rows, progress, activities, anio) {
  const { hdrIdx } = detectarTipoExcel(rows);
  const col = mapaColumnas(rows, hdrIdx);
  const cAOI = col['ACT OPERAT.'] !== undefined ? col['ACT OPERAT.'] : col['ACTIVIDAD OPERATIVA ID'];
  const MESDEV = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
  const devCols = MESDEV.map(mn => {
    const key = Object.keys(col).find(k => k.replace(/\s+/g, ' ').includes('DEV') && k.includes(mn));
    return key !== undefined ? col[key] : undefined;
  });
  const actByAOI = {}; activities.forEach(a => { if (a.codigoAOI) actByAOI[a.codigoAOI] = a; });
  // acumular devengado por actividad/mes (suma de genéricas)
  const acum = {}; // actId -> [12]
  for (let r = hdrIdx + 1; r < rows.length; r++) {
    const fila = rows[r]; if (!fila) continue;
    const aoi = cellStr(fila[cAOI]); if (!aoi) continue;
    const a = actByAOI[aoi]; if (!a) continue;
    const arr = acum[a.id] || (acum[a.id] = Array(12).fill(0));
    devCols.forEach((c, i) => { if (c !== undefined) arr[i] += cellNum(fila[c]); });
  }
  const next = progress.map(p => ({ ...p }));
  const findReg = (actId, m) => next.find(p => p.actividadId === actId && p.anio === anio && p.mes === m);
  let tocados = 0;
  Object.keys(acum).forEach(actId => {
    acum[actId].forEach((val, i) => {
      const m = i + 1;
      let reg = findReg(actId, m);
      if (!reg) {
        if (val === 0) return;
        reg = { id: uid(), actividadId: actId, anio, mes: m, avanceFisico: 0, avanceFinanciero: 0, logros: '', limitaciones: '', medidas: '', fechaRegistro: new Date().toISOString() };
        next.push(reg);
      }
      reg.avanceFinanciero = Math.round(val * 100) / 100;
      tocados++;
    });
  });
  return { progress: next, resumen: `${tocados} avances financieros (devengado) cargados` };
}

// Crea una estructura vacía de genéricas con 12 meses cada una (PIA y PIM)
function nuevasGenericas() {
  const g = {};
  GENERICAS_GASTO.forEach(gen => {
    g[gen.codigo] = {
      pia: Array.from({ length: 12 }, () => 0),
      pim: Array.from({ length: 12 }, () => 0),
    };
  });
  return g;
}

// Crea estructura vacía de física mensual PIA y PIM (12 meses cada una)
function nuevaFisicaMensual() {
  return {
    pia: Array.from({ length: 12 }, () => 0),
    pim: Array.from({ length: 12 }, () => 0),
  };
}

// Suma anual de la física mensual por tipo (pia|pim), opcionalmente hasta cierto mes
function totalFisicaActividad(a, tipo, hastaMes = 12) {
  const arr = a.fisicaMensual?.[tipo] || [];
  let total = 0;
  for (let i = 0; i < hastaMes && i < 12; i++) total += Number(arr[i]) || 0;
  return total;
}

// Migra una actividad antigua (programacion: [{fisica, financiera}]) al nuevo modelo de genéricas.
// Coloca el financiero antiguo en la genérica 2.3 BIENES Y SERVICIOS, con PIA = PIM inicialmente.
// También crea la física mensual PIA/PIM desde programacion[].fisica.
function migrarActividadGenericas(a) {
  let out = { ...a };
  // Migrar genéricas financieras
  if (!out.genericas || typeof out.genericas !== 'object') {
    const g = nuevasGenericas();
    if (Array.isArray(out.programacion)) {
      out.programacion.forEach((p, i) => {
        const fin = Number(p?.financiera) || 0;
        g['2.3'].pia[i] = fin;
        g['2.3'].pim[i] = fin;
      });
    }
    out.genericas = g;
  }
  // Migrar física mensual PIA/PIM
  if (!out.fisicaMensual || typeof out.fisicaMensual !== 'object') {
    const fm = nuevaFisicaMensual();
    if (Array.isArray(out.programacion)) {
      out.programacion.forEach((p, i) => {
        const fis = Number(p?.fisica) || 0;
        fm.pia[i] = fis;
        fm.pim[i] = fis;
      });
    }
    out.fisicaMensual = fm;
  }
  // Flag de bloqueo de PIA (default: bloqueado si ya tiene datos, abierto si es nueva)
  if (typeof out.piaBloqueado === 'undefined') {
    const tieneDatos = totalFinancieroActividad(out, 'pia') > 0 || totalFisicaActividad(out, 'pia') > 0;
    out.piaBloqueado = tieneDatos; // si ya tiene PIA cargado, queda bloqueado
  }
  // OEI / AEI: inferir por Centro de Costo si la actividad no los tiene definidos
  if (typeof out.oei === 'undefined' || typeof out.aei === 'undefined' || (!out.oei && !out.aei)) {
    const inf = inferirOeiAei(out.centroCosto);
    if (typeof out.oei === 'undefined' || !out.oei) out.oei = inf.oei;
    if (typeof out.aei === 'undefined' || !out.aei) out.aei = inf.aei;
  }
  // Sincronizar el campo legado 'programacion' (físico/financiero = PIM mensual) y totales,
  // de modo que los datos importados desde Excel queden reflejados en tableros y seguimiento.
  out.programacion = Array.from({ length: 12 }, (_, i) => ({
    fisica: Number(out.fisicaMensual?.pim?.[i]) || 0,
    financiera: financieroMesActividad(out, 'pim', i),
  }));
  out.presupuestoAnual = totalFinancieroActividad(out, 'pim');
  out.presupuestoAnualPIA = totalFinancieroActividad(out, 'pia');
  out.metaAnualFisica = totalFisicaActividad(out, 'pia');
  out.metaAnualFisicaPIM = totalFisicaActividad(out, 'pim');
  return out;
}

// Suma total financiera de una actividad para un tipo (pia|pim), opcionalmente hasta cierto mes
function totalFinancieroActividad(a, tipo, hastaMes = 12) {
  if (!a.genericas) return 0;
  let total = 0;
  GENERICAS_GASTO.forEach(gen => {
    const arr = a.genericas[gen.codigo]?.[tipo] || [];
    for (let i = 0; i < hastaMes && i < 12; i++) total += Number(arr[i]) || 0;
  });
  return total;
}

// Suma financiera de un mes específico (índice 0-11) para un tipo
function financieroMesActividad(a, tipo, mesIdx) {
  if (!a.genericas) return 0;
  let total = 0;
  GENERICAS_GASTO.forEach(gen => {
    total += Number(a.genericas[gen.codigo]?.[tipo]?.[mesIdx]) || 0;
  });
  return total;
}

// ============================================================
// AGREGADOS CONSOLIDADOS PARA REPORTES (fuente única de verdad)
// Calcula, a partir de las actividades reales y el seguimiento (progress),
// los totales financieros y físicos — programado (PIA/PIM) y ejecutado —
// para un conjunto de actividades y un periodo (acumulado hasta mesFin).
// ============================================================
function calcularAgregados(actividades, progress, anio, mesFin) {
  const acts = (actividades || []).map(a => (a && a.genericas ? a : migrarActividadGenericas(a || {})));
  const hasta = Math.max(0, Math.min(12, mesFin || 12));

  // Financiero
  const finPIA = acts.reduce((s, a) => s + totalFinancieroActividad(a, 'pia'), 0);      // PIA anual
  const finPIM = acts.reduce((s, a) => s + totalFinancieroActividad(a, 'pim'), 0);      // PIM anual
  const finPIMacum = acts.reduce((s, a) => s + totalFinancieroActividad(a, 'pim', hasta), 0); // PIM programado al periodo

  // Físico
  const fisPIA = acts.reduce((s, a) => s + totalFisicaActividad(a, 'pia'), 0);          // meta física PIA anual
  const fisPIM = acts.reduce((s, a) => s + totalFisicaActividad(a, 'pim'), 0);          // meta física PIM anual
  const fisPIMacum = acts.reduce((s, a) => s + totalFisicaActividad(a, 'pim', hasta), 0); // meta física PIM al periodo

  // Ejecutado (desde progress, acumulado hasta mesFin)
  const actIds = new Set(acts.map(a => a.id));
  let ejecFin = 0, ejecFis = 0;
  (progress || []).forEach(p => {
    if (!actIds.has(p.actividadId)) return;
    if (p.anio !== anio) return;
    if (p.mes > hasta) return;
    ejecFin += Number(p.avanceFinanciero) || 0;
    ejecFis += Number(p.avanceFisico) || 0;
  });

  const avanceFin = finPIM > 0 ? (ejecFin / finPIM) * 100 : 0;       // % ejecución financiera sobre PIM anual
  const avanceFinPeriodo = finPIMacum > 0 ? (ejecFin / finPIMacum) * 100 : 0; // % sobre PIM del periodo
  const avanceFis = fisPIM > 0 ? (ejecFis / fisPIM) * 100 : 0;       // % avance físico sobre meta PIM anual
  const avanceFisPeriodo = fisPIMacum > 0 ? (ejecFis / fisPIMacum) * 100 : 0;
  const variacion = finPIA > 0 ? ((finPIM - finPIA) / finPIA) * 100 : 0; // variación PIM vs PIA
  const totalMods = finPIM - finPIA;

  return {
    nActividades: acts.length,
    finPIA, finPIM, finPIMacum, totalMods, variacion,
    ejecFin, avanceFin, avanceFinPeriodo,
    fisPIA, fisPIM, fisPIMacum,
    ejecFis, avanceFis, avanceFisPeriodo,
  };
}

// Fecha actual del sistema (simulada para el prototipo)
const HOY = '2026-05-11';
const HORA_ACTUAL = '14:30'; // hora simulada en formato HH:mm
const AHORA = `${HOY}T${HORA_ACTUAL}`;

// Construye un timestamp comparable a partir de fecha y hora
function ts(fecha, hora) {
  if (!fecha) return null;
  return `${fecha}T${hora || '00:00'}`;
}

// Áreas dentro de cada Centro de Costo (sub-nivel jerárquico)
// Si un usuario tiene 'areas' definidas, solo accede a actividades de esas áreas dentro de su CC.
// Si no tiene areas (null), accede a todas las áreas del CC.
// NOTA: Esta es la configuración INICIAL. En tiempo de ejecución, el admin puede agregar/eliminar
// áreas y el cambio se persiste en window.storage. Ver hook useAreasPorCC.
const AREAS_POR_CC_INICIAL = {
  'GESTIÓN PNC': ['GESTIÓN'],
  'UGEDEUS': ['UGEDEUS'],
  'UGERDES': [
    'UGERDES',
    'PNC-MAQUINARIAS', // engloba EMERGENCIA-DESCOLMATACIÓN, EMERGENCIA-TRANSITABILIDAD, MAQUINARIAS PREVENCIÓN
  ],
  'UNINDEUS': ['UNINDEUS'],
};

// Compatibilidad: referencia mutable que se reemplaza dinámicamente desde el componente raíz
// para que cualquier código legado que aún lea AREAS_POR_CC obtenga las áreas actualizadas.
let AREAS_POR_CC = { ...AREAS_POR_CC_INICIAL };

// Mapeo de área lógica → áreas físicas en la programación
// Permite que un usuario con área "PNC-MAQUINARIAS" vea actividades de 3 áreas diferentes
const AREAS_AGRUPADAS = {
  'PNC-MAQUINARIAS': ['EMERGENCIA-DESCOLMATACIÓN', 'EMERGENCIA-TRANSITABILIDAD', 'MAQUINARIAS PREVENCIÓN'],
};

// Usuarios del sistema con correos institucionales reales.
// La contraseña sigue siendo el campo de validación en el prototipo.
// En la migración a Google Workspace, el campo 'email' será el identificador único (SSO).
const USUARIOS_DEMO = [
  // Administrador — Planeamiento y Presupuesto
  { id: 'admin', usuario: 'rmalaspina', password: 'admin2026', email: 'rmalaspina@vivienda.gob.pe',
    nombre: 'Planeamiento y Presupuesto', cargo: 'Administrador del Sistema',
    rol: 'admin', centroCosto: null, areas: null },

  // Responsables de Centro de Costo
  // Julian Ccanto: dual — administrador del sistema y responsable de GESTIÓN PNC
  { id: 'jccanto', usuario: 'jccanto', password: 'gestion2026', email: 'jccanto@vivienda.gob.pe',
    nombre: 'Julian Waldir Ccanto Laurente', cargo: 'Administrador / Responsable GESTIÓN PNC',
    rol: 'admin', centroCosto: 'GESTIÓN PNC', areas: null },

  { id: 'salvarado', usuario: 'salvarado', password: 'ugedeus2026', email: 'salvarado@vivienda.gob.pe',
    nombre: 'Salvador Ernesto Alvarado Tovar', cargo: 'Responsable UGEDEUS',
    rol: 'responsable_cc', centroCosto: 'UGEDEUS', areas: null },

  // UGERDES tiene 2 áreas con responsables separados
  { id: 'mayala', usuario: 'mayala', password: 'ugerdes2026', email: 'mayala@vivienda.gob.pe',
    nombre: 'Maximo Ayala Gutierrez', cargo: 'Responsable UGERDES',
    rol: 'responsable_cc', centroCosto: 'UGERDES', areas: ['UGERDES'] },

  // PNC-Maquinarias:
  // - David Edward Alcalde Poma: Coordinador Nacional de PNC-Maquinarias
  // - Juan Manuel Castro Soto: Coordinador de Monitoreo (responsable del registro de seguimiento POI)
  { id: 'dalcalde', usuario: 'dalcalde', password: 'pncmaq2026', email: 'dalcalde@vivienda.gob.pe',
    nombre: 'David Edward Alcalde Poma', cargo: 'Coordinador Nacional PNC-Maquinarias',
    rol: 'responsable_cc', centroCosto: 'UGERDES', areas: ['PNC-MAQUINARIAS'] },

  { id: 'jmcsInt', usuario: 'jmcsint', password: 'pncmaq2026', email: 'mvcs_pnc_jmcs@viviendaext.pe',
    nombre: 'Juan Manuel Castro Soto', cargo: 'Coordinador de Monitoreo PNC-Maquinarias',
    rol: 'responsable_cc', centroCosto: 'UGERDES', areas: ['PNC-MAQUINARIAS'] },

  { id: 'ljmoya', usuario: 'ljmoya', password: 'unindeus2026', email: 'ljmoya@vivienda.gob.pe',
    nombre: 'Leonardy Josmell Moya Sanizo', cargo: 'Responsable UNINDEUS',
    rol: 'responsable_cc', centroCosto: 'UNINDEUS', areas: null },

  // Director DGPP — solo lectura
  { id: 'jbarron', usuario: 'jbarron', password: 'directivo2026', email: 'jbarron@vivienda.gob.pe',
    nombre: 'Director DGPP', cargo: 'Director General',
    rol: 'lector', centroCosto: null, areas: null },
];

// Helpers de rol
const esAdmin = (u) => u?.rol === 'admin';
const esLector = (u) => u?.rol === 'lector';
const esResponsableCC = (u) => u?.rol === 'responsable_cc';
const puedeEditar = (u) => esAdmin(u) || esResponsableCC(u);
const puedeEditarCC = (u, cc) => esAdmin(u) || (esResponsableCC(u) && u.centroCosto === cc);
const ccsVisibles = (u) => {
  if (esAdmin(u) || esLector(u)) return CENTROS_COSTO.map(c => c.nombre);
  if (esResponsableCC(u)) return [u.centroCosto];
  return [];
};

// Expande las áreas lógicas del usuario a las áreas físicas que puede ver
// Ejemplo: si tiene area "PNC-MAQUINARIAS", devuelve los 3 nombres reales de las actividades
function expandirAreasUsuario(u) {
  if (!u || !u.areas || u.areas.length === 0) return null; // null = todas
  const expandidas = [];
  u.areas.forEach(a => {
    if (AREAS_AGRUPADAS[a]) {
      expandidas.push(...AREAS_AGRUPADAS[a]);
    } else {
      expandidas.push(a);
    }
  });
  return expandidas;
}

// Verifica si el usuario puede ver/editar una actividad específica
function puedeAccederActividad(u, actividad) {
  if (esAdmin(u) || esLector(u)) return true;
  if (!esResponsableCC(u)) return false;
  if (actividad.centroCosto !== u.centroCosto) return false;
  const areasUser = expandirAreasUsuario(u);
  if (!areasUser) return true; // sin restricción de área
  return areasUser.includes(actividad.area);
}

// Filtra una lista de actividades según los permisos del usuario
function filtrarActividadesUsuario(actividades, u) {
  return actividades.filter(a => puedeAccederActividad(u, a));
}

// Devuelve las áreas visibles del usuario para mostrar como etiqueta
function areasUsuarioLabel(u) {
  if (!u || !u.areas) return '';
  return u.areas.join(', ');
}

// Devuelve los usernames que deben recibir notificaciones para un CC dado
function usuariosDelCC(usuarios, cc) {
  if (!usuarios) return [];
  return usuarios
    .filter(u => u.rol === 'responsable_cc' && u.centroCosto === cc)
    .map(u => u.usuario);
}

// Devuelve los usernames de todos los administradores
function adminUsernames(usuarios) {
  if (!usuarios) return [];
  return usuarios.filter(u => u.rol === 'admin').map(u => u.usuario);
}

// Devuelve el estado de un periodo según fechas/horas y forzados
function getEstadoPeriodo(periodos, anio, mes) {
  const p = periodos.find(x => x.anio === anio && x.mes === mes);
  if (!p) return { estado: 'sin_config', config: null, motivo: 'Periodo sin configurar — registros permitidos' };

  if (p.estadoForzado === 'cerrado') return { estado: 'cerrado', config: p, motivo: 'Cierre forzado por administrador' };
  if (p.estadoForzado === 'abierto') return { estado: 'abierto', config: p, motivo: 'Apertura forzada por administrador' };

  const tsApertura = ts(p.fechaApertura, p.horaApertura);
  const tsCierre = ts(p.fechaCierre, p.horaCierre);

  if (tsApertura && AHORA < tsApertura) {
    return { estado: 'por_abrir', config: p,
      motivo: `Apertura programada: ${p.fechaApertura} ${p.horaApertura || '00:00'}` };
  }
  if (tsCierre && AHORA > tsCierre) {
    return { estado: 'cerrado', config: p,
      motivo: `Cerrado el ${p.fechaCierre} a las ${p.horaCierre || '23:59'}` };
  }
  return { estado: 'abierto', config: p,
    motivo: `Cierre programado: ${p.fechaCierre || 'sin fecha'} ${p.horaCierre || ''}`.trim() };
}

// Detecta reprogramaciones vencidas (plazo terminado) y las marca como cerradas
function aplicarCierreAutomatico(reprogs) {
  return reprogs.map(r => {
    if (r.estado !== 'aprobada') return r;
    const fin = ts(r.fechaCierre, r.horaCierre);
    if (fin && AHORA > fin) {
      return {
        ...r,
        estado: 'cerrada',
        fechaCierreReal: AHORA + ':00.000Z',
        cierreAutomatico: true,
      };
    }
    return r;
  });
}

// Formatear timestamp para mostrar
function fmtTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('es-PE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function fmtRelativo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff/86400)} d`;
  return d.toLocaleDateString('es-PE');
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [selectedYear, setSelectedYear] = useState(ANIO_INICIAL); // Año de programación seleccionable desde el Login
  const [activities, setActivities] = useState([]);
  const [progress, setProgress] = useState([]);
  const [modifs, setModifs] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [reprogramaciones, setReprogramaciones] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [areasPorCC, setAreasPorCC] = useState({ ...AREAS_POR_CC_INICIAL });
  const [oeiLista, setOeiLista] = useState(OEI_LISTA_INICIAL.map(o => ({ ...o })));
  const [aeiLista, setAeiLista] = useState(AEI_LISTA_INICIAL.map(a => ({ ...a })));
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sincroniza la referencia mutable AREAS_POR_CC para código legado
  useEffect(() => { AREAS_POR_CC = areasPorCC; }, [areasPorCC]);
  // Sincroniza las referencias mutables OEI_LISTA / AEI_LISTA
  useEffect(() => { OEI_LISTA = oeiLista; }, [oeiLista]);
  useEffect(() => { AEI_LISTA = aeiLista; }, [aeiLista]);

  async function saveAreasPorCC(next) {
  setAreasPorCC(next);
  AREAS_POR_CC = next;
  try { await storage.saveAreasConfig(next); } catch (e) { console.error(e); }
}
async function saveOeiLista(next) {
  setOeiLista(next);
  OEI_LISTA = next;
  try { await storage.saveOeiLista(next); } catch (e) { console.error(e); }
}
async function saveAeiLista(next) {
  setAeiLista(next);
  AEI_LISTA = next;
  try { await storage.saveAeiLista(next); } catch (e) { console.error(e); }
}

  // ─── Claves de storage por año ────────────────────────────────────────────
  // El año 2026 usa las claves legacy (pnc_v2_acts) para compatibilidad.
  // Los años posteriores usan claves con sufijo (pnc_v2_acts_2027, …).
  function yk(base, year) {
    return year === 2026 ? base : `${base}_${year}`;
  }

  useEffect(() => { loadAll(selectedYear); }, [selectedYear]);

  async function loadAll(year) {
  setLoading(true);
  try {
    const data = await storage.loadAll(year);
    setActivities(data.activities.length > 0 ? data.activities.map(migrarActividadGenericas) : []);
    setProgress(data.progress);
    setModifs(data.modifs);
    setPeriodos(data.periodos);
    setSolicitudes(data.solicitudes);
    setReprogramaciones(data.reprogramaciones);
    setAuditoria(data.auditoria);
    setNotificaciones(data.notificaciones);
    setUsuarios(data.usuarios);
    
    if (data.areasConfig && data.areasConfig.length > 0) {
      const areasData = data.areasConfig.find(a => a.key === 'areas_por_cc');
      if (areasData) {
        setAreasPorCC(areasData.value);
        AREAS_POR_CC = areasData.value;
      }
    }
    
    if (data.oeiLista && data.oeiLista.length > 0) {
      const base = OEI_LISTA_INICIAL.map(o => ({ ...o }));
      data.oeiLista.forEach(o => {
        if (!base.some(b => b.codigo === o.codigo)) base.push(o);
      });
      setOeiLista(base);
      OEI_LISTA = base;
    }
    
    if (data.aeiLista && data.aeiLista.length > 0) {
      const base = AEI_LISTA_INICIAL.map(a => ({ ...a }));
      data.aeiLista.forEach(a => {
        if (!base.some(b => b.codigo === a.codigo)) base.push(a);
      });
      setAeiLista(base);
      AEI_LISTA = base;
    }
    
    if (year === 2026 && data.activities.length === 0) {
      const demo = seedDemo();
      await saveActivities(demo.activities);
      await saveProgress(demo.progress);
      await saveModifs(demo.modifs);
      await savePeriodos(demo.periodos);
      setActivities(demo.activities.map(migrarActividadGenericas));
      setProgress(demo.progress);
      setModifs(demo.modifs);
      setPeriodos(demo.periodos);
    }
  } catch (e) {
    console.error('Error cargando datos:', e);
    alert('Error al conectar con Supabase. Verifica las variables de entorno.');
  }
  setLoading(false);
}

 async function saveActivities(next) {
  setActivities(next);
  try { await storage.saveActivities(next, selectedYear); } catch (e) { console.error(e); }
}
async function saveProgress(next) {
  setProgress(next);
  try { await storage.saveProgress(next, selectedYear); } catch (e) { console.error(e); }
}
async function saveModifs(next) {
  setModifs(next);
  try { await storage.saveModifs(next, selectedYear); } catch (e) { console.error(e); }
}
async function savePeriodos(next) {
  setPeriodos(next);
  try { await storage.savePeriodos(next, selectedYear); } catch (e) { console.error(e); }
}
async function saveSolicitudes(next) {
  setSolicitudes(next);
  try { await storage.saveSolicitudes(next, selectedYear); } catch (e) { console.error(e); }
}
async function saveUsuarios(next) {
  setUsuarios(next);
  try { await storage.saveUsuarios(next); } catch (e) { console.error(e); }
}
async function saveReprogramaciones(next) {
  setReprogramaciones(next);
  try { await storage.saveReprogramaciones(next); } catch (e) { console.error(e); }
}
async function saveAuditoria(next) {
  setAuditoria(next);
  try { await storage.saveAuditoria(next); } catch (e) { console.error(e); }
}
async function saveNotificaciones(next) {
  setNotificaciones(next);
  try { await storage.saveNotificaciones(next); } catch (e) { console.error(e); }
}

  // Registrar evento de auditoría
  async function logAuditoria(accion, detalle, contexto = {}) {
    if (!currentUser) return;
    const evento = {
      id: uid(),
      timestamp: new Date().toISOString(),
      usuario: currentUser.usuario,
      nombre: currentUser.nombre,
      rol: currentUser.rol,
      centroCosto: currentUser.centroCosto || '',
      accion,         // ej: 'crear_actividad', 'aprobar_reprog', etc.
      detalle,        // descripción legible
      contexto,       // datos adicionales
    };
    const next = [evento, ...auditoria].slice(0, 2000); // máximo 2000 eventos
    await saveAuditoria(next);
  }

  // Crear notificación dirigida a uno o varios usuarios
  async function notificar({ destinatarios, tipo, titulo, mensaje, link }) {
    const base = {
      id: uid(),
      timestamp: new Date().toISOString(),
      tipo,           // 'solicitud_aprobada', 'reprog_aprobada', 'solicitud_recibida', etc.
      titulo,
      mensaje,
      link: link || null,
      remitente: currentUser?.usuario || 'sistema',
      leida: false,
    };
    const nuevas = (destinatarios || []).map(usr => ({ ...base, id: uid(), destinatario: usr }));
    await saveNotificaciones([...nuevas, ...notificaciones]);
  }
  async function login(u) {
    setCurrentUser(u);
    try { await window.storage.set('pnc_v2_currentUser', JSON.stringify(u), false); } catch (e) {}
    setView('dashboard');
  }
  async function logout() {
    setCurrentUser(null);
    try { await window.storage.delete('pnc_v2_currentUser', false); } catch (e) {}
  }

  async function resetAll() {
    if (!confirm('¿Restaurar datos institucionales PNC 2026? Esto incluye actividades, registros, modificaciones, periodos y usuarios.')) return;
    const demo = seedDemo();
    await saveActivities(demo.activities);
    await saveProgress(demo.progress);
    await saveModifs(demo.modifs);
    await savePeriodos(demo.periodos);
    await saveSolicitudes(demo.solicitudes);
    await saveUsuarios(JSON.parse(JSON.stringify(USUARIOS_DEMO)));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F1E8' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#1E2A3A' }} />
      </div>
    );
  }

  if (!currentUser) {
    return <Login usuarios={usuarios} onLogin={login} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />;
  }

  const solicitudesPendientes = esAdmin(currentUser)
    ? solicitudes.filter(s => s.estado === 'pendiente').length
    : 0;
  const reprogPendientes = esAdmin(currentUser)
    ? reprogramaciones.filter(r => r.estado === 'solicitada').length
    : 0;

  // Notificaciones no leídas para el usuario actual
  const misNotifs = currentUser
    ? notificaciones.filter(n => n.destinatario === currentUser.usuario)
    : [];
  const notifsNoLeidas = misNotifs.filter(n => !n.leida).length;

  return (
    <div className="min-h-screen flex" style={{ background: '#F5F1E8', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <Sidebar
        view={view}
        setView={setView}
        onReset={resetAll}
        solicitudesPendientes={solicitudesPendientes}
        reprogPendientes={reprogPendientes}
        notifsNoLeidas={notifsNoLeidas}
        currentUser={currentUser}
        onLogout={logout}
        year={selectedYear}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-10">
          {view === 'dashboard' && <Dashboard activities={activities} progress={progress} modifs={modifs} currentUser={currentUser} year={selectedYear} />}
          {view === 'centros' && <CentrosCosto activities={activities} progress={progress} modifs={modifs} currentUser={currentUser} />}
          {view === 'programacion' && (
            <Programacion
              activities={activities}
              saveActivities={saveActivities}
              currentUser={currentUser}
              reprogramaciones={reprogramaciones}
              areasPorCC={areasPorCC}
              saveAreasPorCC={saveAreasPorCC}
              oeiLista={oeiLista}
              aeiLista={aeiLista}
              saveOeiLista={saveOeiLista}
              saveAeiLista={saveAeiLista}
              logAuditoria={logAuditoria} />
          )}
          {view === 'reprogramacion' && (
            <ReprogramacionPOI
              activities={activities}
              saveActivities={saveActivities}
              progress={progress}
              reprogramaciones={reprogramaciones}
              saveReprogramaciones={saveReprogramaciones}
              periodos={periodos}
              currentUser={currentUser}
              usuarios={usuarios}
              logAuditoria={logAuditoria}
              notificar={notificar}
            />
          )}
          {view === 'seguimiento' && (
            <Seguimiento
              activities={activities}
              progress={progress}
              saveProgress={saveProgress}
              periodos={periodos}
              solicitudes={solicitudes}
              saveSolicitudes={saveSolicitudes}
              currentUser={currentUser}
              usuarios={usuarios}
              logAuditoria={logAuditoria}
              notificar={notificar}
              soloLectura={currentUser?.rol === 'lector'}
            />
          )}
          {view === 'modificaciones' && (
            <Modificaciones activities={activities} modifs={modifs} saveModifs={saveModifs} currentUser={currentUser} />
          )}
          {view === 'reporte' && (esAdmin(currentUser) || esResponsableCC(currentUser) || currentUser?.rol === 'lector') && (
            <Reporte activities={activities} progress={progress} modifs={modifs} currentUser={currentUser}
              soloLectura={!esAdmin(currentUser)} />
          )}
          {view === 'periodos' && esAdmin(currentUser) && (
            <ConfigPeriodos periodos={periodos} savePeriodos={savePeriodos} logAuditoria={logAuditoria} />
          )}
          {view === 'solicitudes' && esAdmin(currentUser) && (
            <Solicitudes
              solicitudes={solicitudes}
              saveSolicitudes={saveSolicitudes}
              reprogramaciones={reprogramaciones}
              saveReprogramaciones={saveReprogramaciones}
              periodos={periodos}
              savePeriodos={savePeriodos}
              activities={activities}
              usuarios={usuarios}
              logAuditoria={logAuditoria}
              notificar={notificar}
            />
          )}
          {view === 'mis_solicitudes' && esResponsableCC(currentUser) && (
            <MisSolicitudes
              solicitudes={solicitudes.filter(s => s.centroCosto === currentUser.centroCosto)}
            />
          )}
          {view === 'usuarios' && esAdmin(currentUser) && (
            <GestionUsuarios usuarios={usuarios} saveUsuarios={saveUsuarios} logAuditoria={logAuditoria} />
          )}
          {view === 'auditoria' && esAdmin(currentUser) && (
            <Auditoria eventos={auditoria} />
          )}
          {view === 'notificaciones' && (
            <Notificaciones
              notificaciones={misNotifs}
              saveNotificaciones={saveNotificaciones}
              allNotificaciones={notificaciones}
              setView={setView}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   PANTALLA DE LOGIN
============================================================ */
function Login({ usuarios, onLogin, selectedYear, setSelectedYear }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);

  function handleSubmit() {
    const u = usuarios.find(x => x.usuario === usuario.trim() && x.password === password);
    if (!u) {
      setError('Usuario o contraseña incorrectos');
      return;
    }
    setError('');
    onLogin(u);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F1E8', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg mb-4" style={{ background: '#1E2A3A' }}>
            <Briefcase size={28} style={{ color: '#C9A350' }} />
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 500, color: '#1E2A3A' }}>
            POI {selectedYear}
          </div>
          <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#9C7A2B' }}>
            Programa Nuestras Ciudades
          </div>
        </div>

        <div className="rounded-lg p-8" style={{ background: '#FFFFFF', border: '1px solid #E5DDD0', boxShadow: '0 4px 12px rgba(30,42,58,0.08)' }}>
          <div className="mb-6">
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
              Iniciar sesión
            </div>
            <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
              Selecciona el año e ingresa con tu usuario asignado
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Año de Programación">
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className={inputCls}>
                {ANIOS_DISPONIBLES.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Usuario">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7A6F5C' }} />
                <input type="text" value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-9 pr-3 py-2 rounded-md border text-sm" style={{ borderColor: '#E5DDD0' }}
                  placeholder="ej. admin" autoFocus />
              </div>
            </Field>
            <Field label="Contraseña">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7A6F5C' }} />
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-9 pr-10 py-2 rounded-md border text-sm" style={{ borderColor: '#E5DDD0' }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPwd ? <EyeOff size={16} style={{ color: '#7A6F5C' }} /> : <Eye size={16} style={{ color: '#7A6F5C' }} />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md text-xs" style={{ background: '#F5D5D5', color: '#B33B3B' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button type="button" onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
              <Lock size={14} /> Ingresar
            </button>
          </div>

          <button onClick={() => setShowHint(!showHint)}
            className="mt-5 text-xs flex items-center gap-1 mx-auto"
            style={{ color: '#9C7A2B' }}>
            {showHint ? 'Ocultar' : 'Ver'} usuarios de prueba
          </button>

          {showHint && (
            <div className="mt-3 p-3 rounded-md text-xs space-y-1" style={{ background: '#FAF7F0', color: '#7A6F5C' }}>
              <div className="cursor-pointer hover:bg-stone-100 p-1 rounded"
                onClick={() => { setUsuario('rmalaspina'); setPassword('admin2026'); setError(''); }}>
                <strong>rmalaspina</strong> / admin2026 — Administrador (Planeamiento y Presupuesto)
              </div>
              <div className="cursor-pointer hover:bg-stone-100 p-1 rounded"
                onClick={() => { setUsuario('jccanto'); setPassword('gestion2026'); setError(''); }}>
                <strong>jccanto</strong> / gestion2026 — Julian Ccanto (Admin / GESTIÓN PNC)
              </div>
              <div className="cursor-pointer hover:bg-stone-100 p-1 rounded"
                onClick={() => { setUsuario('salvarado'); setPassword('ugedeus2026'); setError(''); }}>
                <strong>salvarado</strong> / ugedeus2026 — UGEDEUS (Salvador Alvarado)
              </div>
              <div className="cursor-pointer hover:bg-stone-100 p-1 rounded"
                onClick={() => { setUsuario('mayala'); setPassword('ugerdes2026'); setError(''); }}>
                <strong>mayala</strong> / ugerdes2026 — UGERDES (Maximo Ayala — área UGERDES)
              </div>
              <div className="cursor-pointer hover:bg-stone-100 p-1 rounded"
                onClick={() => { setUsuario('dalcalde'); setPassword('pncmaq2026'); setError(''); }}>
                <strong>dalcalde</strong> / pncmaq2026 — David Alcalde (Coord. Nacional PNC-Maquinarias)
              </div>
              <div className="cursor-pointer hover:bg-stone-100 p-1 rounded"
                onClick={() => { setUsuario('jmcsint'); setPassword('pncmaq2026'); setError(''); }}>
                <strong>jmcsint</strong> / pncmaq2026 — Juan Castro (Coord. de Monitoreo PNC-Maquinarias)
              </div>
              <div className="cursor-pointer hover:bg-stone-100 p-1 rounded"
                onClick={() => { setUsuario('ljmoya'); setPassword('unindeus2026'); setError(''); }}>
                <strong>ljmoya</strong> / unindeus2026 — UNINDEUS (Leonardy Moya)
              </div>
              <div className="cursor-pointer hover:bg-stone-100 p-1 rounded"
                onClick={() => { setUsuario('jbarron'); setPassword('directivo2026'); setError(''); }}>
                <strong>jbarron</strong> / directivo2026 — Director DGPP (solo lectura)
              </div>
              <div className="mt-2 pt-2 border-t text-xs italic" style={{ borderColor: '#E5DDD0', color: '#9C7A2B' }}>
                💡 Tip: haz clic en cualquier usuario para autocompletar
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs mt-6" style={{ color: '#9C9080' }}>
          Sistema POI · Programa Nuestras Ciudades · {selectedYear}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ view, setView, onReset, solicitudesPendientes, reprogPendientes, notifsNoLeidas, currentUser, onLogout, year }) {
  const items = [
    { id: 'dashboard',      label: 'Tablero general',          icon: LayoutDashboard, roles: ['admin', 'lector', 'responsable_cc'] },
    { id: 'centros',        label: 'Tablero por CC',            icon: Building2,       roles: ['admin', 'lector', 'responsable_cc'] },
    { id: 'programacion',   label: 'Programación POI',          icon: ListChecks,      roles: ['admin', 'responsable_cc'] },
    { id: 'reprogramacion', label: 'Reprogramación POI',        icon: RefreshCw,       roles: ['admin', 'responsable_cc'] },
    { id: 'seguimiento',    label: 'Seguimiento mensual',       icon: ClipboardEdit,   roles: ['admin', 'responsable_cc', 'lector'] },
    { id: 'modificaciones', label: 'Modif. presupuestales',     icon: Wallet,          roles: ['admin'] },
    { id: 'reporte',        label: 'Reporte Ejecutivo Mensual', icon: FileText,        roles: ['admin', 'lector', 'responsable_cc'] },
    { id: 'notificaciones', label: 'Notificaciones',            icon: Bell, badge: notifsNoLeidas, roles: ['admin', 'responsable_cc'] },
    { id: 'mis_solicitudes',label: 'Mis solicitudes',           icon: MailOpen,        roles: ['responsable_cc'] },
    { id: 'periodos',       label: 'Periodos de registro',      icon: CalendarClock,   roles: ['admin'] },
    { id: 'solicitudes',    label: 'Solicitudes',               icon: MailOpen, badge: solicitudesPendientes + reprogPendientes, roles: ['admin'] },
    { id: 'usuarios',       label: 'Gestión de usuarios',       icon: Shield,          roles: ['admin'] },
    { id: 'auditoria',      label: 'Bitácora auditoría',        icon: History,         roles: ['admin'] },
  ];

  const visibleItems = items.filter(it => it.roles.includes(currentUser.rol));

  // Dividir en grupos para el sidebar: POI principal, personal, administración
  const POI_IDS    = ['dashboard','centros','programacion','reprogramacion','seguimiento','modificaciones','reporte'];
  const PERSON_IDS = ['notificaciones','mis_solicitudes'];
  const ADMIN_IDS  = ['periodos','solicitudes','usuarios','auditoria'];

  const visiblePOI    = visibleItems.filter(it => POI_IDS.includes(it.id));
  const visibleUser   = visibleItems.filter(it => PERSON_IDS.includes(it.id));
  const visibleAdmin  = visibleItems.filter(it => ADMIN_IDS.includes(it.id));

  // Resetear vista si la actual no es accesible
  useEffect(() => {
    const allAccessible = visibleItems.map(i => i.id);
    if (!allAccessible.includes(view)) {
      setView(visiblePOI[0]?.id || 'dashboard');
    }
  }, [currentUser]);

  const roleLabel = {
    admin: 'Administrador',
    responsable_cc: 'Responsable',
    lector: 'Solo lectura',
  };
  const roleColor = {
    admin: '#C9A350',
    responsable_cc: '#5C9C7A',
    lector: '#7A8597',
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col" style={{ background: '#1E2A3A', minHeight: '100vh' }}>
      <div className="px-6 py-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: '#C9A350' }}>
            <Briefcase size={18} style={{ color: '#1E2A3A' }} />
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: '#F5F1E8' }}>
            POI {year}
          </div>
        </div>
        <div className="text-xs uppercase tracking-widest" style={{ color: '#C9A350' }}>
          Programa Nuestras Ciudades
        </div>
      </div>

      {/* Card de usuario */}
      <div className="mx-3 mb-4 p-3 rounded-md" style={{ background: '#0E1825', border: '1px solid #2C3A4F' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: roleColor[currentUser.rol] }}>
            {currentUser.rol === 'admin' ? <Shield size={14} style={{ color: '#1E2A3A' }} /> :
              currentUser.rol === 'lector' ? <Eye size={14} style={{ color: '#1E2A3A' }} /> :
              <User size={14} style={{ color: '#1E2A3A' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: '#F5F1E8' }}>{currentUser.nombre}</div>
            {currentUser.cargo && (
              <div className="text-xs truncate" style={{ color: '#A89878', fontStyle: 'italic' }}>{currentUser.cargo}</div>
            )}
            <div className="text-xs" style={{ color: roleColor[currentUser.rol] }}>{roleLabel[currentUser.rol]}</div>
          </div>
        </div>
        {currentUser.centroCosto && (
          <div className="text-xs px-2 py-1 rounded mt-1 text-center" style={{ background: '#1E2A3A', color: '#D5C9B0' }}>
            {currentUser.centroCosto}
          </div>
        )}
        {currentUser.areas && currentUser.areas.length > 0 && (
          <div className="text-xs px-2 py-1 rounded mt-1 text-center" style={{ background: '#C9A350', color: '#1E2A3A', fontWeight: 600 }}>
            Área: {currentUser.areas.join(', ')}
          </div>
        )}
      </div>

      <nav className="px-3 flex-1 overflow-y-auto">
        {visiblePOI.map((it) => {
          const Icon = it.icon;
          const active = view === it.id;
          return (
            <button key={it.id} onClick={() => setView(it.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 transition-colors text-left"
              style={{ background: active ? '#C9A350' : 'transparent', color: active ? '#1E2A3A' : '#D5C9B0' }}>
              <Icon size={18} />
              <span className="text-sm font-medium">{it.label}</span>
            </button>
          );
        })}

        {visibleUser.length > 0 && (
          <>
            <div className="mt-4 mb-2 px-3 text-xs uppercase tracking-widest" style={{ color: '#7A8597' }}>
              Mi cuenta
            </div>
            {visibleUser.map((it) => {
              const Icon = it.icon;
              const active = view === it.id;
              return (
                <button key={it.id} onClick={() => setView(it.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 transition-colors text-left"
                  style={{ background: active ? '#C9A350' : 'transparent', color: active ? '#1E2A3A' : '#D5C9B0' }}>
                  <Icon size={18} />
                  <span className="text-sm font-medium flex-1">{it.label}</span>
                  {it.badge > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: active ? '#1E2A3A' : '#C9A350', color: active ? '#C9A350' : '#1E2A3A' }}>
                      {it.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </>
        )}

        {visibleAdmin.length > 0 && (
          <>
            <div className="mt-4 mb-2 px-3 text-xs uppercase tracking-widest" style={{ color: '#7A8597' }}>
              Administración
            </div>
            {visibleAdmin.map((it) => {
              const Icon = it.icon;
              const active = view === it.id;
              return (
                <button key={it.id} onClick={() => setView(it.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 transition-colors text-left"
                  style={{ background: active ? '#C9A350' : 'transparent', color: active ? '#1E2A3A' : '#D5C9B0' }}>
                  <Icon size={18} />
                  <span className="text-sm font-medium flex-1">{it.label}</span>
                  {it.badge > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: active ? '#1E2A3A' : '#C9A350', color: active ? '#C9A350' : '#1E2A3A' }}>
                      {it.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: '#2C3A4F' }}>
        <button onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors"
          style={{ background: '#0E1825', color: '#D5C9B0', border: '1px solid #2C3A4F' }}>
          <LogOut size={14} /> Cerrar sesión
        </button>
        {esAdmin(currentUser) && (
          <button onClick={onReset}
            className="w-full text-xs px-3 py-2 rounded mt-2 transition-colors"
            style={{ color: '#A89878', borderColor: '#3A4A60', border: '1px solid #3A4A60' }}>
            Restaurar datos PNC
          </button>
        )}
      </div>
    </aside>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#9C7A2B' }}>{subtitle}</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 38, fontWeight: 500, color: '#1E2A3A', lineHeight: 1.1 }}>
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg ${className}`}
      style={{ background: '#FFFFFF', border: '1px solid #E5DDD0', boxShadow: '0 1px 2px rgba(30,42,58,0.04)' }}>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-md border text-sm bg-white';
function Field({ label, children, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#7A6F5C' }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function Pill({ children, color = '#1E2A3A', bg = '#F0E9D9' }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: bg, color }}>
      {children}
    </span>
  );
}

function KPI({ icon: Icon, label, value, hint, highlight }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>{label}</div>
        <Icon size={16} style={{ color: highlight ? '#C9A350' : '#7A6F5C' }} />
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 500, color: '#1E2A3A', lineHeight: 1 }}>
        {value}
      </div>
      <div className="text-xs mt-2" style={{ color: '#7A6F5C' }}>{hint}</div>
    </Card>
  );
}

function MesFiltro({ mesFiltro, setMesFiltro, modoMes, setModoMes }) {
  // modoMes:
  //   'individual' (Mensual) → mesFiltro=N → datos solo de ese mes
  //   'acumulado' (Seguimiento al mes) → mesFiltro=N → enero hasta mes N
  const modo = modoMes || 'individual';

  // Garantizar que mesFiltro nunca sea 0 (ya no existe "acumulado anual")
  useEffect(() => {
    if (mesFiltro === 0) setMesFiltro(new Date().getMonth() + 1);
  }, [mesFiltro, setMesFiltro]);

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Calendar size={16} style={{ color: '#7A6F5C' }} />
        <span className="text-xs uppercase tracking-wider font-medium mr-2" style={{ color: '#7A6F5C' }}>Modo:</span>

        <button onClick={() => { setModoMes && setModoMes('individual'); if (mesFiltro === 0) setMesFiltro(new Date().getMonth() + 1); }}
          className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
          style={{
            background: modo === 'individual' ? '#C9A350' : '#F0E9D9',
            color: '#1E2A3A',
          }}>
          Mensual
        </button>

        <button onClick={() => { setModoMes && setModoMes('acumulado'); if (mesFiltro === 0) setMesFiltro(new Date().getMonth() + 1); }}
          className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
          style={{
            background: modo === 'acumulado' ? '#2D7A4E' : '#F0E9D9',
            color: modo === 'acumulado' ? '#FFFFFF' : '#1E2A3A',
          }}>
          Seguimiento al mes
        </button>
      </div>

      {/* Selector de meses */}
      <div className="flex items-center gap-2 flex-wrap pt-2" style={{ borderTop: '1px dashed #E5DDD0' }}>
        <span className="text-xs uppercase tracking-wider font-medium mr-2" style={{ color: '#7A6F5C' }}>
          {modo === 'acumulado' ? 'Seguimiento hasta:' : 'Mes:'}
        </span>
        {MESES.map((m, i) => (
          <button key={i} onClick={() => setMesFiltro(i + 1)}
            className="text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors"
            style={{
              background: mesFiltro === i + 1
                ? (modo === 'acumulado' ? '#2D7A4E' : '#C9A350')
                : '#FAF7F0',
              color: mesFiltro === i + 1
                ? (modo === 'acumulado' ? '#FFFFFF' : '#1E2A3A')
                : '#1E2A3A',
              border: mesFiltro === i + 1
                ? `1px solid ${modo === 'acumulado' ? '#2D7A4E' : '#C9A350'}`
                : '1px solid #E5DDD0',
            }}>
            {MESES_ABR[i]}
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ============================================================
   DASHBOARD GENERAL
   Con filtro por mes: específico = solo ese mes / Todos = acumulado
============================================================ */
function Dashboard({ activities, progress, modifs, currentUser, year }) {
  const ccDisponibles = ccsVisibles(currentUser);
  const ccsVisible = CENTROS_COSTO.filter(c => ccDisponibles.includes(c.nombre));
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1); // mes actual
  const [modoMes, setModoMes] = useState('individual'); // 'individual' o 'acumulado'
  // Casos:
  // - modo individual + mesFiltro=0 → acumulado anual (todos los meses)
  // - modo individual + mesFiltro=N → solo ese mes
  // - modo acumulado + mesFiltro=N → enero hasta el mes N (inclusive)
  const esAcumuladoHasta = modoMes === 'acumulado' && mesFiltro > 0;
  const mesLabel = esAcumuladoHasta
    ? `Seguimiento al mes de ${MESES[mesFiltro - 1].toLowerCase()}`
    : `Mensual: ${MESES[mesFiltro - 1]}`;

  // Filtrar actividades según rol y área
  const actsVisibles = esResponsableCC(currentUser)
    ? filtrarActividadesUsuario(activities, currentUser)
    : activities;
  const progVisibles = esResponsableCC(currentUser)
    ? progress.filter(p => actsVisibles.some(a => a.id === p.actividadId))
    : progress;
  // Las modificaciones se filtran por CC y, si el usuario tiene áreas, también por área
  const areasUser = expandirAreasUsuario(currentUser);
  const modifsVisibles = esResponsableCC(currentUser)
    ? modifs.filter(m => {
        if (m.centroCosto !== currentUser.centroCosto) return false;
        if (!areasUser) return true;
        // Si la modificación referencia un AOI, verificar que sea de las áreas del usuario
        if (m.codigoAOI) {
          const act = activities.find(a => a.codigoAOI === m.codigoAOI);
          if (act) return areasUser.includes(act.area);
        }
        return true;
      })
    : modifs;

  // ============ CÁLCULOS SEGÚN PIA/PIM DE PROGRAMACIÓN ============
  // PIA = suma de programación PIA (genéricas) de todas las actividades visibles
  const totalPIA = actsVisibles.reduce((s, a) => s + totalFinancieroActividad(a, 'pia'), 0);
  // PIM = suma de programación PIM (genéricas) de todas las actividades visibles
  const totalPIM = actsVisibles.reduce((s, a) => s + totalFinancieroActividad(a, 'pim'), 0);
  const variacionPIM = totalPIA > 0 ? ((totalPIM - totalPIA) / totalPIA) * 100 : 0;

  // Física PIA y PIM anuales
  const totalFisPIA = actsVisibles.reduce((s, a) => s + (Number(a.metaAnualFisica) || 0), 0);
  const totalFisPIM = actsVisibles.reduce((s, a) => s + (Number(a.metaAnualFisicaPIM ?? a.metaAnualFisica) || 0), 0);

  // Ejecución financiera y física según modo
  //   - Mensual:          ejecución del mes vs programado del mes (PIM del mes)
  //   - Seguimiento al mes: ejecución acumulada (ene-mes) vs total programado PIM anual
  const progAplicable = esAcumuladoHasta
    ? progVisibles.filter(p => p.mes <= mesFiltro)
    : progVisibles.filter(p => p.mes === mesFiltro);
  const totalEjecFin = progAplicable.reduce((s, p) => s + (Number(p.avanceFinanciero) || 0), 0);
  const totalEjecFis = progAplicable.reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);

  // Programado financiero (referencia para el %)
  let totalProgFin = 0;
  if (esAcumuladoHasta) {
    // Total programado PIM anual (enero a diciembre)
    totalProgFin = totalPIM;
  } else {
    // Programado PIM del mes seleccionado
    totalProgFin = actsVisibles.reduce((s, a) => s + financieroMesActividad(a, 'pim', mesFiltro - 1), 0);
  }
  const ejecFinPct = totalProgFin > 0 ? (totalEjecFin / totalProgFin) * 100 : 0;

  // Programado físico (referencia para el %)
  let totalMetaFis = 0;
  if (esAcumuladoHasta) {
    // Total programado físico anual (enero a diciembre)
    totalMetaFis = totalFisPIM;
  } else {
    // Programado físico del mes seleccionado
    totalMetaFis = actsVisibles.reduce((s, a) => s + (Number(a.programacion?.[mesFiltro - 1]?.fisica) || 0), 0);
  }
  const ejecFisPct = totalMetaFis > 0 ? (totalEjecFis / totalMetaFis) * 100 : 0;

  // Gráfico siempre muestra los 12 meses (es la vista temporal)
  const chartData = MESES.map((mes, i) => {
    let progFin = 0, progFis = 0;
    actsVisibles.forEach(a => {
      progFin += financieroMesActividad(a, 'pim', i);
      progFis += Number(a.programacion?.[i]?.fisica) || 0;
    });
    const monthRegs = progVisibles.filter(p => p.mes === i + 1);
    const ejecFin = monthRegs.reduce((s, p) => s + (Number(p.avanceFinanciero) || 0), 0);
    const ejecFis = monthRegs.reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);
    const pFin = progFin > 0 ? (ejecFin / progFin) * 100 : 0;
    const pFis = progFis > 0 ? (ejecFis / progFis) * 100 : 0;
    return {
      mes: MESES_ABR[i],
      Programado: progFin,
      Ejecutado: ejecFin,
      ProgFis: progFis,
      EjecFis: ejecFis,
      pctFin: pFin,
      pctFis: pFis,
      pctFinLabel: ejecFin > 0 ? `${pFin.toFixed(0)}%` : '',
      pctFisLabel: ejecFis > 0 ? `${pFis.toFixed(0)}%` : '',
      seleccionado: esAcumuladoHasta ? (i + 1) <= mesFiltro : (i + 1) === mesFiltro,
      esAcumGeneral: false,
    };
  });

  // Columna "Acumulado General" al final: consolidado anual (todos los meses)
  // Financiero: PIM total anual vs Ejecutado total anual
  // Físico: Programado total anual vs Ejecutado total anual
  const totalEjecFinAnual = progVisibles.reduce((s, p) => s + (Number(p.avanceFinanciero) || 0), 0);
  const totalEjecFisAnual = progVisibles.reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);
  const totalProgFisAnual = actsVisibles.reduce((s, a) =>
    s + (a.programacion || []).reduce((ss, p) => ss + (Number(p?.fisica) || 0), 0), 0);
  const pFinAcum = totalPIM > 0 ? (totalEjecFinAnual / totalPIM) * 100 : 0;
  const pFisAcum = totalProgFisAnual > 0 ? (totalEjecFisAnual / totalProgFisAnual) * 100 : 0;
  chartData.push({
    mes: 'ACUM.',
    Programado: totalPIM,
    Ejecutado: totalEjecFinAnual,
    ProgFis: totalProgFisAnual,
    EjecFis: totalEjecFisAnual,
    pctFin: pFinAcum,
    pctFis: pFisAcum,
    pctFinLabel: totalEjecFinAnual > 0 ? `${pFinAcum.toFixed(0)}%` : '',
    pctFisLabel: totalEjecFisAnual > 0 ? `${pFisAcum.toFixed(0)}%` : '',
    seleccionado: true,
    esAcumGeneral: true,
  });

  // Resumen por CC según filtro (solo CCs visibles)
  const ccData = ccsVisible.map(cc => {
    const acts = actsVisibles.filter(a => a.centroCosto === cc.nombre);
    // PIA y PIM del CC desde las genéricas
    const piaCC = acts.reduce((s, a) => s + totalFinancieroActividad(a, 'pia'), 0);
    const pim = acts.reduce((s, a) => s + totalFinancieroActividad(a, 'pim'), 0);
    const variacion = piaCC > 0 ? ((pim - piaCC) / piaCC) * 100 : 0;

    // Ejecución financiera del CC según filtro
    const ejecFin = progAplicable
      .filter(p => acts.some(a => a.id === p.actividadId))
      .reduce((s, p) => s + (Number(p.avanceFinanciero) || 0), 0);
    // Programado de referencia: PIM del mes (Mensual) o PIM anual (Seguimiento al mes)
    let progFinCC = 0;
    acts.forEach(a => {
      if (esAcumuladoHasta) progFinCC += totalFinancieroActividad(a, 'pim');
      else progFinCC += financieroMesActividad(a, 'pim', mesFiltro - 1);
    });
    const ejecFinCCPct = progFinCC > 0 ? (ejecFin / progFinCC) * 100 : 0;

    // Físico del CC según modo
    let metaCC = 0, avCC = 0;
    if (esAcumuladoHasta) {
      metaCC = acts.reduce((s, a) => s + (Number(a.metaAnualFisicaPIM ?? a.metaAnualFisica) || 0), 0);
      avCC = progVisibles.filter(p => p.mes <= mesFiltro && acts.some(a => a.id === p.actividadId))
        .reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);
    } else {
      acts.forEach(a => {
        metaCC += Number(a.programacion?.[mesFiltro - 1]?.fisica) || 0;
      });
      avCC = progVisibles.filter(p => p.mes === mesFiltro && acts.some(a => a.id === p.actividadId))
        .reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);
    }
    const ejecFisCCPct = metaCC > 0 ? (avCC / metaCC) * 100 : 0;
    return { ...cc, pia: piaCC, pim, variacion, actividades: acts.length, ejecFin, ejecFinPct: ejecFinCCPct, ejecFisPct: ejecFisCCPct };
  });

  return (
    <>
      <PageHeader title="Tablero general" subtitle={`POI ${year} — Programa Nuestras Ciudades`} />

      <MesFiltro mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} modoMes={modoMes} setModoMes={setModoMes} />

      <div className="grid grid-cols-2 gap-4 mb-8">
        <KPI icon={Wallet} label="PIA (programación PIA)" value={`S/ ${fmtEntero(totalPIA)}`} hint="presupuesto inicial de apertura" />
        <KPI icon={TrendingUp}
          label="PIM (programación PIM)"
          value={`S/ ${fmtEntero(totalPIM)}`}
          hint={`${variacionPIM >= 0 ? '+' : ''}${variacionPIM.toFixed(2)}% vs PIA`}
          highlight />
      </div>

      {/* Gauges circulares de avance global */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
            {esAcumuladoHasta
              ? `Ejecución financiera al mes de ${MESES[mesFiltro-1].toLowerCase()} vs PIM anual`
              : `Ejecución financiera — ${MESES[mesFiltro-1]} (vs programado del mes)`}
          </div>
          <GaugeCircular
            pct={ejecFinPct}
            label={`S/ ${fmtEntero(totalEjecFin)} de S/ ${fmtEntero(totalProgFin)}`}
            sublabel="ejecutado"
            size={180}
          />
        </Card>
        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
            {esAcumuladoHasta
              ? `Ejecución física al mes de ${MESES[mesFiltro-1].toLowerCase()} vs física anual`
              : `Ejecución física — ${MESES[mesFiltro-1]} (vs programado del mes)`}
          </div>
          <GaugeCircular
            pct={ejecFisPct}
            label={`${fmtEntero(totalEjecFis)} de ${fmtEntero(totalMetaFis)} unidades`}
            sublabel="cumplido"
            size={180}
          />
        </Card>
      </div>

      {/* Ejecución financiera mensual - barra solapada */}
      <Card className="p-6 mb-6">
        <div className="mb-4">
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: '#1E2A3A' }}>
            Ejecución financiera mensual
          </div>
          <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
            Programado (PIM) vs ejecutado {!esAcumuladoHasta && `— Mes resaltado: ${MESES[mesFiltro-1]}`}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barCategoryGap="20%" barGap={-30} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#7A6F5C' }} />
            <YAxis tick={{ fontSize: 11, fill: '#7A6F5C' }} tickFormatter={fmtMillonesEnteros} />
            <Tooltip
              contentStyle={{ background: '#FFF', border: '1px solid #E5DDD0', borderRadius: 6, fontSize: 12 }}
              formatter={(v) => fmtMoney(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Programado" name="Programado" radius={[3, 3, 0, 0]} barSize={38}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.esAcumGeneral ? '#1E2A3A' : (d.seleccionado ? '#8A8A8A' : '#C9C9C9')} />
              ))}
            </Bar>
            <Bar dataKey="Ejecutado" name="Ejecutado" radius={[3, 3, 0, 0]} barSize={22}>
              {chartData.map((d, i) => {
                const pctMes = d.Programado > 0 ? (d.Ejecutado / d.Programado) * 100 : 0;
                const color = d.esAcumGeneral ? '#C9A350' : (d.seleccionado ? colorEjecucion(pctMes) : colorEjecucionTenue(pctMes));
                return <Cell key={i} fill={color} />;
              })}
              <LabelList dataKey="pctFinLabel" content={PctBarLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Ejecución física mensual - barra solapada */}
      <Card className="p-6 mb-8">
        <div className="mb-4">
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: '#1E2A3A' }}>
            Ejecución física mensual
          </div>
          <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
            Programado vs ejecutado {esAcumuladoHasta ? `— Acumulado a ${MESES[mesFiltro-1].toLowerCase()}` : `— Mes: ${MESES[mesFiltro-1]}`}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barCategoryGap="20%" barGap={-30} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#7A6F5C' }} />
            <YAxis tick={{ fontSize: 11, fill: '#7A6F5C' }} />
            <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E5DDD0', borderRadius: 6, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="ProgFis" name="Programado" radius={[3, 3, 0, 0]} barSize={38}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.esAcumGeneral ? '#1E2A3A' : (d.seleccionado ? '#8A8A8A' : '#C9C9C9')} />
              ))}
            </Bar>
            <Bar dataKey="EjecFis" name="Ejecutado" radius={[3, 3, 0, 0]} barSize={22}>
              {chartData.map((d, i) => {
                const pctMes = d.ProgFis > 0 ? (d.EjecFis / d.ProgFis) * 100 : 0;
                const color = d.esAcumGeneral ? '#C9A350' : (d.seleccionado ? colorEjecucion(pctMes) : colorEjecucionTenue(pctMes));
                return <Cell key={i} fill={color} />;
              })}
              <LabelList dataKey="pctFisLabel" content={PctBarLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: '#1E2A3A' }}>
            Resumen por centro de costo
          </div>
          <Pill bg={esAcumuladoHasta ? '#E8F2EC' : '#FBF1D9'} color={esAcumuladoHasta ? '#2D7A4E' : '#9C7A2B'}>
            {mesLabel}
          </Pill>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Centro de costo</th>
                <th className="text-right px-3 py-2 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>PIA</th>
                <th className="text-right px-3 py-2 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>PIM</th>
                <th className="text-center px-3 py-2 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Variación</th>
                <th className="text-center px-3 py-2 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Ejec. física</th>
                <th className="text-center px-3 py-2 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Ejec. financiera</th>
                <th className="text-center px-3 py-2 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Actividades</th>
              </tr>
            </thead>
            <tbody>
              {ccData.map((cc, i) => (
                <tr key={i} className="border-b last:border-b-0" style={{ borderColor: '#E5DDD0' }}>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold" style={{ color: '#1E2A3A' }}>{cc.nombre}</div>
                    <div className="text-xs font-mono" style={{ color: '#9C7A2B' }}>{cc.codigo}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: '#1E2A3A' }}>{fmtMoneyShort(cc.pia)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold" style={{ color: '#1E2A3A' }}>{fmtMoneyShort(cc.pim)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span style={{ color: cc.variacion > 0 ? '#2D7A4E' : cc.variacion < 0 ? '#B33B3B' : '#7A6F5C', fontWeight: 600 }}>
                      {cc.variacion >= 0 ? '+' : ''}{cc.variacion.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <ProgressMini pct={cc.ejecFisPct} />
                  </td>
                  <td className="px-3 py-2.5">
                    <ProgressMini pct={cc.ejecFinPct} />
                  </td>
                  <td className="px-3 py-2.5 text-center" style={{ color: '#1E2A3A' }}>{cc.actividades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function ProgressMini({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const { bar, text } = getExecutionColor(pct);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E5DDD0', minWidth: 60 }}>
        <div className="h-full rounded-full" style={{ width: `${clamped}%`, background: bar }} />
      </div>
      <span className="text-xs font-semibold whitespace-nowrap" style={{ color: text }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

/* Gauge circular de progreso (anillo) */
function GaugeCircular({ pct, label, sublabel, size = 160 }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  // Color según umbrales: ≥95% verde, ≥75% ámbar, <75% rojo
  const dynColor = colorEjecucion(pct);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Anillo de fondo */}
          <circle cx={size/2} cy={size/2} r={radius}
            fill="none" stroke="#E5DDD0" strokeWidth={stroke} />
          {/* Anillo de progreso */}
          <circle cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={dynColor} strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 500, color: '#1E2A3A', lineHeight: 1 }}>
            {clamped.toFixed(1)}%
          </div>
          {sublabel && <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>{sublabel}</div>}
        </div>
      </div>
      <div className="mt-3 text-sm font-semibold text-center" style={{ color: '#1E2A3A' }}>{label}</div>
    </div>
  );
}

// Color según porcentaje de ejecución
// Delega en getExecutionColor para mantener coherencia visual en todo el sistema
function colorEjecucion(pct) { return getExecutionColor(pct).bar; }

// Versión atenuada del color (para barras de meses no seleccionados)
function colorEjecucionTenue(pct) {
  const v = Number(pct) || 0;
  if (v >= 95) return '#A8C9B3';
  if (v >= 75) return '#F0D9A0';
  return '#E5B3B3';
}

/* ============================================================
   TABLERO POR CENTRO DE COSTOS
   Con filtro por mes: específico = solo ese mes / Todos = acumulado
============================================================ */
function CentrosCosto({ activities, progress, modifs, currentUser }) {
  const ccDisponibles = ccsVisibles(currentUser);
  const [ccSel, setCcSel] = useState(ccDisponibles[0] || CENTROS_COSTO[0].nombre);
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [modoMes, setModoMes] = useState('individual');
  const esAcumuladoHasta = modoMes === 'acumulado' && mesFiltro > 0;
  const mesLabel = esAcumuladoHasta
    ? `Seguimiento al mes de ${MESES[mesFiltro - 1].toLowerCase()}`
    : `Mensual: ${MESES[mesFiltro - 1]}`;

  const cc = CENTROS_COSTO.find(c => c.nombre === ccSel);

  // Si el usuario es responsable con áreas restringidas, solo ve esas actividades
  const acts = esResponsableCC(currentUser)
    ? filtrarActividadesUsuario(activities.filter(a => a.centroCosto === ccSel), currentUser)
    : activities.filter(a => a.centroCosto === ccSel);

  // PIA y PIM del CC desde las genéricas de programación
  const piaCC = acts.reduce((s, a) => s + totalFinancieroActividad(a, 'pia'), 0);
  const pim = acts.reduce((s, a) => s + totalFinancieroActividad(a, 'pim'), 0);
  const variacion = piaCC > 0 ? ((pim - piaCC) / piaCC) * 100 : 0;

  // Física PIA y PIM anuales del CC
  const fisPIA_CC = acts.reduce((s, a) => s + (Number(a.metaAnualFisica) || 0), 0);
  const fisPIM_CC = acts.reduce((s, a) => s + (Number(a.metaAnualFisicaPIM ?? a.metaAnualFisica) || 0), 0);

  // Datos mensuales: prog (PIM) / ejec físico y financiero por mes, con acumulados
  const data = MESES.map((mes, i) => {
    let progFis = 0, progFin = 0;
    acts.forEach(a => {
      progFis += Number(a.programacion?.[i]?.fisica) || 0;
      progFin += financieroMesActividad(a, 'pim', i);
    });
    const monthProgs = progress.filter(p => p.mes === i + 1 && acts.some(a => a.id === p.actividadId));
    const ejecFis = monthProgs.reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);
    const ejecFin = monthProgs.reduce((s, p) => s + (Number(p.avanceFinanciero) || 0), 0);
    return { mes: MESES_ABR[i], mesIdx: i + 1, progFis, progFin, ejecFis, ejecFin,
      pctFin: progFin > 0 ? (ejecFin / progFin) * 100 : 0,
      pctFis: progFis > 0 ? (ejecFis / progFis) * 100 : 0,
      pctFinLabel: ejecFin > 0 ? `${(progFin > 0 ? (ejecFin / progFin) * 100 : 0).toFixed(0)}%` : '',
      pctFisLabel: ejecFis > 0 ? `${(progFis > 0 ? (ejecFis / progFis) * 100 : 0).toFixed(0)}%` : '' };
  });
  let accProgFis = 0, accProgFin = 0, accEjecFis = 0, accEjecFin = 0;
  data.forEach(d => {
    accProgFis += d.progFis; d.accProgFis = accProgFis;
    accProgFin += d.progFin; d.accProgFin = accProgFin;
    accEjecFis += d.ejecFis; d.accEjecFis = accEjecFis;
    accEjecFin += d.ejecFin; d.accEjecFin = accEjecFin;
  });

  // Marcar el mes seleccionado o el rango acumulado
  data.forEach(d => {
    d.seleccionado = esAcumuladoHasta ? d.mesIdx <= mesFiltro : d.mesIdx === mesFiltro;
    d.esAcumGeneral = false;
  });

  // Columna "Acumulado General" al final: consolidado anual del CC
  const totProgFisAnualCC = data.reduce((s, d) => s + d.progFis, 0);
  const totProgFinAnualCC = data.reduce((s, d) => s + d.progFin, 0);
  const totEjecFisAnualCC = data.reduce((s, d) => s + d.ejecFis, 0);
  const totEjecFinAnualCC = data.reduce((s, d) => s + d.ejecFin, 0);
  data.push({
    mes: 'ACUM.',
    mesIdx: 13,
    progFis: totProgFisAnualCC,
    progFin: totProgFinAnualCC,
    ejecFis: totEjecFisAnualCC,
    ejecFin: totEjecFinAnualCC,
    pctFin: totProgFinAnualCC > 0 ? (totEjecFinAnualCC / totProgFinAnualCC) * 100 : 0,
    pctFis: totProgFisAnualCC > 0 ? (totEjecFisAnualCC / totProgFisAnualCC) * 100 : 0,
    pctFinLabel: totEjecFinAnualCC > 0 ? `${(totProgFinAnualCC > 0 ? (totEjecFinAnualCC / totProgFinAnualCC) * 100 : 0).toFixed(0)}%` : '',
    pctFisLabel: totEjecFisAnualCC > 0 ? `${(totProgFisAnualCC > 0 ? (totEjecFisAnualCC / totProgFisAnualCC) * 100 : 0).toFixed(0)}%` : '',
    seleccionado: true,
    esAcumGeneral: true,
  });

  // Cálculo de KPIs según modo
  //   - Mensual:           ejec del mes vs programado PIM del mes
  //   - Seguimiento al mes: ejec acumulada (ene-mes) vs total PIM/física anual
  let kpiProgFis, kpiProgFin, kpiEjecFis, kpiEjecFin;
  if (esAcumuladoHasta) {
    kpiProgFin = pim;          // total PIM anual del CC
    kpiProgFis = fisPIM_CC;    // total física anual del CC
    kpiEjecFis = data.slice(0, mesFiltro).reduce((s, d) => s + d.ejecFis, 0);
    kpiEjecFin = data.slice(0, mesFiltro).reduce((s, d) => s + d.ejecFin, 0);
  } else {
    const d = data[mesFiltro - 1];
    kpiProgFis = d.progFis;
    kpiProgFin = d.progFin;
    kpiEjecFis = d.ejecFis;
    kpiEjecFin = d.ejecFin;
  }
  const ejecFisPct = kpiProgFis > 0 ? (kpiEjecFis / kpiProgFis) * 100 : 0;
  const ejecFinPct = kpiProgFin > 0 ? (kpiEjecFin / kpiProgFin) * 100 : 0;

  return (
    <>
      <PageHeader title="Tablero por centro de costo" subtitle="Ejecución detallada" />

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={16} style={{ color: '#7A6F5C' }} />
          <span className="text-xs uppercase tracking-wider font-medium" style={{ color: '#7A6F5C' }}>Centro de costo:</span>
          {CENTROS_COSTO.filter(c => ccDisponibles.includes(c.nombre)).map(c => (
            <button key={c.codigo} onClick={() => setCcSel(c.nombre)}
              className="text-xs px-3 py-1 rounded-md font-medium"
              style={{
                background: ccSel === c.nombre ? '#1E2A3A' : '#F0E9D9',
                color: ccSel === c.nombre ? '#F5F1E8' : '#1E2A3A',
              }}>
              {c.nombre}
            </button>
          ))}

        </div>
      </Card>

      <MesFiltro mesFiltro={mesFiltro} setMesFiltro={setMesFiltro} modoMes={modoMes} setModoMes={setModoMes} />

      <Card className="p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="text-xs font-mono mb-1" style={{ color: '#9C7A2B' }}>{cc.codigo}</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 500, color: '#1E2A3A' }}>
              {cc.nombre}
            </div>
            <div className="text-sm mt-2" style={{ color: '#7A6F5C' }}>{cc.desc}</div>
          </div>
          <div className="text-right">
            <Pill bg={esAcumuladoHasta ? '#E8F2EC' : '#FBF1D9'} color={esAcumuladoHasta ? '#2D7A4E' : '#9C7A2B'}>
              {mesLabel}
            </Pill>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <KPI icon={Wallet} label="PIA (programación PIA)" value={`S/ ${fmtEntero(piaCC)}`} hint="Presupuesto inicial de apertura" />
        <KPI icon={TrendingUp}
          label="PIM (programación PIM)"
          value={`S/ ${fmtEntero(pim)}`}
          hint={`${variacion >= 0 ? '+' : ''}${variacion.toFixed(2)}% vs PIA`}
          highlight />
      </div>

      {/* Gauges circulares de avance */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
            {esAcumuladoHasta
              ? `Ejecución financiera al mes de ${MESES[mesFiltro-1].toLowerCase()} vs PIM anual`
              : `Ejecución financiera — ${MESES[mesFiltro-1]} (vs programado del mes)`}
          </div>
          <GaugeCircular
            pct={ejecFinPct}
            label={`S/ ${fmtEntero(kpiEjecFin)} de S/ ${fmtEntero(kpiProgFin)}`}
            sublabel="ejecutado"
            size={180}
          />
        </Card>
        <Card className="p-6 flex flex-col items-center justify-center">
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
            {esAcumuladoHasta
              ? `Ejecución física al mes de ${MESES[mesFiltro-1].toLowerCase()} vs física anual`
              : `Ejecución física — ${MESES[mesFiltro-1]} (vs programado del mes)`}
          </div>
          <GaugeCircular
            pct={ejecFisPct}
            label={`${fmtEntero(kpiEjecFis)} de ${fmtEntero(kpiProgFis)} unidades`}
            sublabel="cumplido"
            size={180}
          />
        </Card>
      </div>

      {/* Ejecución física mensual - barra solapada */}
      <Card className="p-6 mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: '#1E2A3A' }}>
              Ejecución física mensual
            </div>
            <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
              Programado vs ejecutado {esAcumuladoHasta ? `— Acumulado a ${MESES[mesFiltro-1].toLowerCase()}` : `— Mes: ${MESES[mesFiltro-1]}`}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barCategoryGap="20%" barGap={-30} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#7A6F5C' }} />
            <YAxis tick={{ fontSize: 11, fill: '#7A6F5C' }} />
            <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E5DDD0', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="progFis" name="Programado" radius={[3, 3, 0, 0]} barSize={38}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.esAcumGeneral ? '#1E2A3A' : (d.seleccionado ? '#8A8A8A' : '#C9C9C9')} />
              ))}
            </Bar>
            <Bar dataKey="ejecFis" name="Ejecutado" radius={[3, 3, 0, 0]} barSize={22}>
              {data.map((d, i) => {
                const pctMes = d.progFis > 0 ? (d.ejecFis / d.progFis) * 100 : 0;
                const color = d.esAcumGeneral ? '#C9A350' : (d.seleccionado ? colorEjecucion(pctMes) : colorEjecucionTenue(pctMes));
                return <Cell key={i} fill={color} />;
              })}
              <LabelList dataKey="pctFisLabel" content={PctBarLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Ejecución financiera mensual - barra solapada */}
      <Card className="p-6 mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: '#1E2A3A' }}>
              Ejecución financiera mensual
            </div>
            <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
              Programado (PIM) vs ejecutado {esAcumuladoHasta ? `— Acumulado a ${MESES[mesFiltro-1].toLowerCase()}` : `— Mes: ${MESES[mesFiltro-1]}`}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barCategoryGap="20%" barGap={-30} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#7A6F5C' }} />
            <YAxis tick={{ fontSize: 11, fill: '#7A6F5C' }} tickFormatter={fmtMillonesEnteros} />
            <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E5DDD0', fontSize: 12 }} formatter={(v) => fmtMoney(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="progFin" name="Programado" radius={[3, 3, 0, 0]} barSize={38}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.esAcumGeneral ? '#1E2A3A' : (d.seleccionado ? '#8A8A8A' : '#C9C9C9')} />
              ))}
            </Bar>
            <Bar dataKey="ejecFin" name="Ejecutado" radius={[3, 3, 0, 0]} barSize={22}>
              {data.map((d, i) => {
                const pctMes = d.progFin > 0 ? (d.ejecFin / d.progFin) * 100 : 0;
                const color = d.esAcumGeneral ? '#C9A350' : (d.seleccionado ? colorEjecucion(pctMes) : colorEjecucionTenue(pctMes));
                return <Cell key={i} fill={color} />;
              })}
              <LabelList dataKey="pctFinLabel" content={PctBarLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabla detalle por actividad operativa */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: '#1E2A3A' }}>
              Detalle por actividad operativa
            </div>
            <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
              {esAcumuladoHasta
                ? `Seguimiento al mes de ${MESES[mesFiltro-1].toLowerCase()} (enero – ${MESES[mesFiltro-1].toLowerCase()})`
                : `Datos del mes de ${MESES[mesFiltro-1]}`}
            </div>
          </div>
          <Pill bg={esAcumuladoHasta ? '#E8F2EC' : '#FBF1D9'} color={esAcumuladoHasta ? '#2D7A4E' : '#9C7A2B'}>
            {mesLabel}
          </Pill>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#F0E9D9' }}>
                <th className="text-left px-2 py-2 uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Código AOI</th>
                <th className="text-left px-2 py-2 uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Actividad operativa</th>
                <th className="text-center px-2 py-2 uppercase tracking-wider" style={{ color: '#7A6F5C' }}>U.M.</th>
                <th className="text-right px-2 py-2 uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Físico prog.</th>
                <th className="text-right px-2 py-2 uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Físico ejec.</th>
                <th className="text-center px-2 py-2 uppercase tracking-wider" style={{ color: '#7A6F5C' }}>% Avance fís.</th>
                <th className="text-right px-2 py-2 uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Fin. prog. (S/)</th>
                <th className="text-right px-2 py-2 uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Fin. ejec. (S/)</th>
                <th className="text-center px-2 py-2 uppercase tracking-wider" style={{ color: '#7A6F5C' }}>% Avance fin.</th>
              </tr>
            </thead>
            <tbody>
              {acts.length === 0 && (
                <tr><td colSpan={9} className="text-center py-6" style={{ color: '#7A6F5C' }}>
                  Sin actividades en este centro de costo.
                </td></tr>
              )}
              {acts.map((a) => {
                let progFis, progFin, ejecFis, ejecFin;
                if (esAcumuladoHasta) {
                  // Seguimiento al mes: programado anual PIM, ejecución acumulada ene-mes
                  progFis = Number(a.metaAnualFisicaPIM ?? a.metaAnualFisica) || 0;
                  progFin = totalFinancieroActividad(a, 'pim');
                  const regs = progress.filter(p => p.actividadId === a.id && p.mes <= mesFiltro);
                  ejecFis = regs.reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);
                  ejecFin = regs.reduce((s, p) => s + (Number(p.avanceFinanciero) || 0), 0);
                } else {
                  // Mensual: programado PIM del mes, ejecución del mes
                  progFis = Number(a.programacion?.[mesFiltro-1]?.fisica) || 0;
                  progFin = financieroMesActividad(a, 'pim', mesFiltro - 1);
                  const reg = progress.find(p => p.actividadId === a.id && p.mes === mesFiltro);
                  ejecFis = reg ? Number(reg.avanceFisico) || 0 : 0;
                  ejecFin = reg ? Number(reg.avanceFinanciero) || 0 : 0;
                }
                const pctFis = progFis > 0 ? (ejecFis / progFis) * 100 : 0;
                const pctFin = progFin > 0 ? (ejecFin / progFin) * 100 : 0;
                return (
                  <tr key={a.id} className="border-b" style={{ borderColor: '#E5DDD0' }}>
                    <td className="px-2 py-2 font-mono" style={{ color: '#1E2A3A' }}>{a.codigoAOI}</td>
                    <td className="px-2 py-2" style={{ color: '#1E2A3A' }}>
                      <div className="leading-snug" style={{ maxWidth: 320 }}>{a.nombre}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#9C7A2B' }}>{a.area}</div>
                    </td>
                    <td className="px-2 py-2 text-center" style={{ color: '#7A6F5C' }}>{a.unidadMedida}</td>
                    <td className="px-2 py-2 text-right" style={{ color: '#1E2A3A' }}>{fmtEntero(progFis)}</td>
                    <td className="px-2 py-2 text-right font-semibold" style={{ color: '#C9A350' }}>{fmtEntero(ejecFis)}</td>
                    <td className="px-2 py-2">
                      <ProgressMini pct={pctFis} />
                    </td>
                    <td className="px-2 py-2 text-right" style={{ color: '#1E2A3A' }}>{fmtEntero(progFin)}</td>
                    <td className="px-2 py-2 text-right font-semibold" style={{ color: '#C9A350' }}>{fmtEntero(ejecFin)}</td>
                    <td className="px-2 py-2">
                      <ProgressMini pct={pctFin} />
                    </td>
                  </tr>
                );
              })}
              {/* Fila de totales */}
              {acts.length > 0 && (() => {
                let totProgFis = 0, totProgFin = 0, totEjecFis = 0, totEjecFin = 0;
                acts.forEach(a => {
                  if (esAcumuladoHasta) {
                    totProgFis += Number(a.metaAnualFisicaPIM ?? a.metaAnualFisica) || 0;
                    totProgFin += totalFinancieroActividad(a, 'pim');
                    const regs = progress.filter(p => p.actividadId === a.id && p.mes <= mesFiltro);
                    totEjecFis += regs.reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);
                    totEjecFin += regs.reduce((s, p) => s + (Number(p.avanceFinanciero) || 0), 0);
                  } else {
                    totProgFis += Number(a.programacion?.[mesFiltro-1]?.fisica) || 0;
                    totProgFin += financieroMesActividad(a, 'pim', mesFiltro - 1);
                    const reg = progress.find(p => p.actividadId === a.id && p.mes === mesFiltro);
                    if (reg) {
                      totEjecFis += Number(reg.avanceFisico) || 0;
                      totEjecFin += Number(reg.avanceFinanciero) || 0;
                    }
                  }
                });
                const totPctFis = totProgFis > 0 ? (totEjecFis / totProgFis) * 100 : 0;
                const totPctFin = totProgFin > 0 ? (totEjecFin / totProgFin) * 100 : 0;
                return (
                  <tr style={{ background: '#F0E9D9' }}>
                    <td className="px-2 py-2 font-bold" style={{ color: '#1E2A3A' }} colSpan={3}>TOTAL</td>
                    <td className="px-2 py-2 text-right font-bold" style={{ color: '#1E2A3A' }}>{fmtEntero(totProgFis)}</td>
                    <td className="px-2 py-2 text-right font-bold" style={{ color: '#C9A350' }}>{fmtEntero(totEjecFis)}</td>
                    <td className="px-2 py-2 text-center font-bold" style={{ color: '#1E2A3A' }}>{fmtPct(totPctFis)}</td>
                    <td className="px-2 py-2 text-right font-bold" style={{ color: '#1E2A3A' }}>{fmtEntero(totProgFin)}</td>
                    <td className="px-2 py-2 text-right font-bold" style={{ color: '#C9A350' }}>{fmtEntero(totEjecFin)}</td>
                    <td className="px-2 py-2 text-center font-bold" style={{ color: '#1E2A3A' }}>{fmtPct(totPctFin)}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ============================================================
   PROGRAMACIÓN POI
============================================================ */
function Programacion({ activities, saveActivities, currentUser, reprogramaciones = [], areasPorCC, saveAreasPorCC, oeiLista, aeiLista, saveOeiLista, saveAeiLista, logAuditoria }) {
  const ccDisponibles = ccsVisibles(currentUser);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [filtroCC, setFiltroCC] = useState(esResponsableCC(currentUser) ? currentUser.centroCosto : 'TODOS');
  const [filtroArea, setFiltroArea] = useState('TODAS');
  const [filtroMesProg, setFiltroMesProg] = useState(0); // 0 = año completo; 1-12 = ver columna de ese mes
  const [verHistorial, setVerHistorial] = useState(null);
  const [showGestionAreas, setShowGestionAreas] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport] = useState(null);

  const canEdit = esAdmin(currentUser);

  // Importar desde Excel: detecta el tipo de archivo y aplica el cargador correspondiente.
  // Importa un archivo Excel para un tipo esperado concreto:
  //  'relacion'        → Actividades operativas (relación con AEI/OEI)
  //  'prog_fisica'     → Programación meta física
  //  'prog_financiera' → Programación financiera
  async function importarDesdeExcel(file, tipoEsperado) {
    if (!file) return;
    setImportando(true); setMsgImport(null);
    const etiquetas = {
      relacion: 'Actividades operativas (relación AEI/OEI)',
      prog_fisica: 'Programación meta física',
      prog_financiera: 'Programación financiera',
    };
    try {
      const { rows } = await leerXlsx(file);
      const { tipo } = detectarTipoExcel(rows);
      if (tipoEsperado && tipo !== tipoEsperado) {
        setMsgImport({ tipo: 'error', texto: `El archivo seleccionado no corresponde a "${etiquetas[tipoEsperado]}". Se detectó: ${etiquetas[tipo] || tipo || 'desconocido'}. Verifica que sea el Excel correcto.` });
        setImportando(false);
        return;
      }
      let res;
      if (tipo === 'relacion') {
        res = importarRelacionActividades(rows, activities);
      } else if (tipo === 'prog_financiera') {
        res = importarProgFinanciera(rows, activities);
      } else if (tipo === 'prog_fisica') {
        res = importarProgFisica(rows, activities);
      } else {
        setMsgImport({ tipo: 'error', texto: 'No se reconoció el tipo de archivo. Use los formatos oficiales de actividades, programación física o programación financiera.' });
        setImportando(false);
        return;
      }
      await saveActivities(res.activities.map(migrarActividadGenericas));
      if (logAuditoria) await logAuditoria('importar_excel_programacion', `Importó ${tipo} (${res.resumen})`, { tipo });
      setMsgImport({ tipo: 'ok', texto: `${etiquetas[tipo]}: ${res.resumen}.` });
    } catch (e) {
      setMsgImport({ tipo: 'error', texto: 'Error al leer el archivo: ' + (e?.message || e) });
    }
    setImportando(false);
  }

  // Usar areasPorCC dinámico si fue pasado por props; fallback al estático
  const areasMap = areasPorCC || AREAS_POR_CC;

  // Exportar la programación a Excel (CSV compatible con Excel, separado por ;)
  function exportarProgramacionExcel() {
    const rows = [];
    // Cabecera
    const cab = ['CC', 'Área', 'Cód. AOI', 'Actividad', 'Unidad', 'Genérica',
      'Tipo (PIA/PIM)', ...MESES, 'Total'];
    rows.push(cab);

    // Por cada actividad filtrada, una fila por genérica y tipo
    filtered.forEach(a => {
      const act = a.genericas ? a : migrarActividadGenericas(a);
      GENERICAS_GASTO.forEach(gen => {
        ['pia', 'pim'].forEach(tipo => {
          const arr = act.genericas?.[gen.codigo]?.[tipo] || Array(12).fill(0);
          const total = arr.reduce((s, v) => s + (Number(v) || 0), 0);
          if (total === 0) return; // omitir genéricas vacías
          rows.push([
            a.centroCosto, a.area || '', a.codigoAOI, a.nombre, a.unidadMedida || '',
            `${gen.codigo} ${gen.nombre}`, tipo.toUpperCase(),
            ...arr.map(v => (Number(v) || 0).toFixed(2)), total.toFixed(2),
          ]);
        });
      });
      // Fila de física
      const fis = (act.programacion || []).map(p => Number(p?.fisica) || 0);
      const totalFis = fis.reduce((s, v) => s + v, 0);
      rows.push([
        a.centroCosto, a.area || '', a.codigoAOI, a.nombre, a.unidadMedida || '',
        'META FÍSICA', 'PIM',
        ...fis.map(v => v.toFixed(0)), totalFis.toFixed(0),
      ]);
    });

    // Construir CSV con BOM para que Excel reconozca UTF-8
    const csv = '\ufeff' + rows.map(r =>
      r.map(c => {
        const s = String(c).replace(/"/g, '""');
        return /[;"\n]/.test(s) ? `"${s}"` : s;
      }).join(';')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sufijo = filtroCC === 'TODOS' ? 'TODOS' : filtroCC.replace(/\s+/g, '_');
    link.download = `Programacion_POI_${sufijo}_2026.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (logAuditoria) logAuditoria('exportar_programacion', `Exportó la programación POI (${sufijo}) a Excel`, {});
  }

  // Eliminar un área (con validación)
  async function handleEliminarArea(cc, area) {
    const conActividades = activities.filter(a => a.centroCosto === cc && a.area === area).length;
    if (conActividades > 0) {
      alert(`⚠️ No se puede eliminar el área "${area}" porque tiene ${conActividades} actividad${conActividades === 1 ? '' : 'es'} asociada${conActividades === 1 ? '' : 's'}.\n\nPrimero reasigne o elimine las actividades del área antes de continuar.`);
      return;
    }
    if (!window.confirm(`¿Eliminar el área "${area}" del centro de costo "${cc}"?\n\nEsta acción no afecta ninguna actividad existente.`)) return;
    const next = { ...areasMap, [cc]: (areasMap[cc] || []).filter(a => a !== area) };
    if (saveAreasPorCC) await saveAreasPorCC(next);
    if (filtroArea === area) setFiltroArea('TODAS');
    if (logAuditoria) await logAuditoria('eliminar_area', `Eliminó área "${area}" del CC ${cc}`, { centroCosto: cc, area });
  }

  // Agregar área nueva
  async function handleAgregarArea(cc, nuevaArea) {
    const nombre = String(nuevaArea || '').trim().toUpperCase();
    if (!nombre) { alert('Ingresa un nombre para el área'); return false; }
    const existentes = (areasMap[cc] || []).map(a => a.toUpperCase());
    if (existentes.includes(nombre)) { alert(`El área "${nombre}" ya existe en ${cc}`); return false; }
    const next = { ...areasMap, [cc]: [...(areasMap[cc] || []), nombre].sort() };
    if (saveAreasPorCC) await saveAreasPorCC(next);
    if (logAuditoria) await logAuditoria('crear_area', `Creó área "${nombre}" en el CC ${cc}`, { centroCosto: cc, area: nombre });
    return true;
  }

  // Crear un nuevo OEI (código + nombre). Devuelve el código creado o null.
  async function handleAgregarOEI(codigo, nombre) {
    const cod = String(codigo || '').trim().toUpperCase();
    const nom = String(nombre || '').trim();
    if (!cod) { alert('Ingresa el código del OEI (ej. OEI.08)'); return null; }
    if (!nom) { alert('Ingresa el nombre del OEI'); return null; }
    if ((oeiLista || OEI_LISTA).some(o => o.codigo.toUpperCase() === cod)) { alert(`El OEI "${cod}" ya existe`); return null; }
    const next = [...(oeiLista || OEI_LISTA), { codigo: cod, nombre: nom }];
    if (saveOeiLista) await saveOeiLista(next);
    if (logAuditoria) await logAuditoria('crear_oei', `Creó el OEI ${cod}`, { codigo: cod });
    return cod;
  }

  // Crear una nueva AEI (código + nombre) ligada a un OEI. Devuelve el código creado o null.
  async function handleAgregarAEI(codigo, nombre, oei) {
    const cod = String(codigo || '').trim().toUpperCase();
    const nom = String(nombre || '').trim();
    if (!oei) { alert('Primero selecciona el OEI al que pertenece la AEI'); return null; }
    if (!cod) { alert('Ingresa el código de la AEI (ej. AEI.06.06)'); return null; }
    if (!nom) { alert('Ingresa el nombre de la AEI'); return null; }
    if ((aeiLista || AEI_LISTA).some(a => a.codigo.toUpperCase() === cod)) { alert(`La AEI "${cod}" ya existe`); return null; }
    const next = [...(aeiLista || AEI_LISTA), { codigo: cod, oei, nombre: nom }];
    if (saveAeiLista) await saveAeiLista(next);
    if (logAuditoria) await logAuditoria('crear_aei', `Creó la AEI ${cod} en ${oei}`, { codigo: cod, oei });
    return cod;
  }

  const visibleActivities = esResponsableCC(currentUser)
    ? filtrarActividadesUsuario(activities, currentUser)
    : activities;

  // Áreas disponibles según el CC seleccionado (combina predefinidas + en uso)
  const areasDisponiblesFiltro = useMemo(() => {
    if (filtroCC === 'TODOS') return [];
    const predefinidas = areasMap[filtroCC] || [];
    const enUso = Array.from(new Set(
      visibleActivities.filter(a => a.centroCosto === filtroCC && a.area).map(a => a.area)
    ));
    return Array.from(new Set([...predefinidas, ...enUso])).sort();
  }, [filtroCC, visibleActivities, areasMap]);

  // Reset área al cambiar CC
  useEffect(() => {
    setFiltroArea('TODAS');
  }, [filtroCC]);

  const filtered = useMemo(() => {
    let r = filtroCC === 'TODOS' ? visibleActivities : visibleActivities.filter(a => a.centroCosto === filtroCC);
    if (filtroArea !== 'TODAS') r = r.filter(a => a.area === filtroArea);
    return r;
  }, [visibleActivities, filtroCC, filtroArea]);

  // Mapa de actividades reprogramadas
  function getReprogsByActivityId(actId) {
    return reprogramaciones.filter(r =>
      (r.estado === 'cerrada' || r.estado === 'aprobada') &&
      r.programacionNueva &&
      r.programacionNueva.some(p => p.id === actId)
    ).sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud));
  }

  function newActivity() {
    setIsNew(true);
    const ccInicial = filtroCC === 'TODOS' ? CENTROS_COSTO[0].nombre : filtroCC;
    const inf = inferirOeiAei(ccInicial);
    setEditing({
      id: uid(),
      centroCosto: ccInicial,
      area: '',
      codigoRegistro: '',
      codigoAOI: '',
      nombre: '',
      unidadMedida: '',
      responsable: '',
      oei: inf.oei,
      aei: inf.aei,
      metaAnualFisica: 0,      // física PIA (auto-calculada)
      metaAnualFisicaPIM: 0,   // física PIM (auto-calculada)
      presupuestoAnual: 0,
      activo: true,
      piaBloqueado: false,     // nueva actividad: PIA abierto para registro inicial
      genericas: nuevasGenericas(),
      fisicaMensual: nuevaFisicaMensual(),
      programacion: Array.from({ length: 12 }, () => ({ fisica: 0, financiera: 0 })),
    });
    setShowForm(true);
  }

  function editActivity(a) {
    setEditing(JSON.parse(JSON.stringify(migrarActividadGenericas(a))));
    setIsNew(false);
    setShowForm(true);
  }

  async function toggleActiveActivity(a) {
    const next = activities.map(x => x.id === a.id ? { ...x, activo: x.activo === false ? true : false } : x);
    await saveActivities(next);
    if (logAuditoria) {
      await logAuditoria(
        a.activo === false ? 'habilitar_actividad' : 'deshabilitar_actividad',
        `${a.activo === false ? 'Habilitó' : 'Deshabilitó'} actividad ${a.codigoAOI} - ${a.nombre}`,
        { actividadId: a.id, centroCosto: a.centroCosto }
      );
    }
  }

  async function handleSave() {
    if (!editing.codigoAOI || !editing.nombre) {
      alert('Código AOI y nombre son obligatorios');
      return;
    }
    // Sincronizar el campo legado 'programacion' y totales desde las genéricas/física mensual
    const finalAct = { ...editing };
    if (finalAct.genericas) {
      // Física anual PIA/PIM se calcula automáticamente desde la física mensual
      finalAct.metaAnualFisica = totalFisicaActividad(finalAct, 'pia');
      finalAct.metaAnualFisicaPIM = totalFisicaActividad(finalAct, 'pim');
      // Sincronizar programacion[] (físico = PIM mensual, financiero = PIM mensual de genéricas)
      const prog = Array.from({ length: 12 }, (_, i) => ({
        fisica: Number(finalAct.fisicaMensual?.pim?.[i]) || 0,
        financiera: financieroMesActividad(finalAct, 'pim', i),
      }));
      finalAct.programacion = prog;
      finalAct.presupuestoAnual = totalFinancieroActividad(finalAct, 'pim');
      finalAct.presupuestoAnualPIA = totalFinancieroActividad(finalAct, 'pia');
    }
    // Al guardar, si el PIA estaba abierto y ya tiene datos, se bloquea automáticamente
    // para evitar modificaciones involuntarias posteriores.
    const tienePIA = totalFinancieroActividad(finalAct, 'pia') > 0 || totalFisicaActividad(finalAct, 'pia') > 0;
    if (finalAct.piaBloqueado !== true && tienePIA) {
      finalAct.piaBloqueado = true;
    }
    const exists = activities.find(x => x.id === finalAct.id);
    const next = exists ? activities.map(x => x.id === finalAct.id ? finalAct : x) : [...activities, finalAct];
    await saveActivities(next);
    if (logAuditoria) {
      await logAuditoria(
        exists ? 'editar_actividad' : 'crear_actividad',
        `${exists ? 'Editó' : 'Creó'} actividad ${finalAct.codigoAOI} - ${finalAct.nombre}`,
        { actividadId: finalAct.id, centroCosto: finalAct.centroCosto }
      );
    }
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    const a = activities.find(x => x.id === id);
    if (!confirm('¿Eliminar esta actividad?')) return;
    await saveActivities(activities.filter(x => x.id !== id));
    if (logAuditoria && a) {
      await logAuditoria('eliminar_actividad',
        `Eliminó actividad ${a.codigoAOI} - ${a.nombre}`,
        { actividadId: id });
    }
  }

  return (
    <>
      <PageHeader title="Programación POI" subtitle="Actividades operativas"
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={exportarProgramacionExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ background: '#1F7A4D', color: '#FFFFFF' }}>
              <FileSpreadsheet size={16} /> Exportar a Excel
            </button>
            {canEdit && (
              <label
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: '#1E2A3A', color: '#F5F1E8', opacity: importando ? 0.6 : 1 }}
                title="Importar actividades operativas (relación con AEI/OEI) desde Excel">
                <Download size={16} /> Importar actividad operativa
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={importando}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; importarDesdeExcel(f, 'relacion'); }} />
              </label>
            )}
            {canEdit && (
              <label
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: '#2D7A4E', color: '#FFFFFF', opacity: importando ? 0.6 : 1 }}
                title="Importar programación de meta física (PIA/PIM) desde Excel">
                <Download size={16} /> Importar programación física
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={importando}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; importarDesdeExcel(f, 'prog_fisica'); }} />
              </label>
            )}
            {canEdit && (
              <label
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: '#9C7A2B', color: '#FFFFFF', opacity: importando ? 0.6 : 1 }}
                title="Importar programación financiera (PIA/PIM por genérica) desde Excel">
                <Download size={16} /> Importar programación financiera
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={importando}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; importarDesdeExcel(f, 'prog_financiera'); }} />
              </label>
            )}
            {canEdit && (
              <button onClick={newActivity}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
                style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
                <Plus size={16} /> Nueva actividad
              </button>
            )}
          </div>
        } />

      {msgImport && (
        <div className="mb-4 px-4 py-3 rounded-md text-sm flex items-start justify-between gap-3"
          style={{
            background: msgImport.tipo === 'ok' ? '#E8F2EC' : '#F8E8E8',
            color: msgImport.tipo === 'ok' ? '#1F7A4D' : '#B33B3B',
            border: `1px solid ${msgImport.tipo === 'ok' ? '#B7DCC4' : '#E8C0C0'}`,
          }}>
          <div>{msgImport.tipo === 'ok' ? '✓ ' : '⚠ '}{msgImport.texto}</div>
          <button onClick={() => setMsgImport(null)} className="opacity-60 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={16} style={{ color: '#7A6F5C' }} />
          <span className="text-xs uppercase tracking-wider font-medium" style={{ color: '#7A6F5C' }}>Centro de costo:</span>
          {!esResponsableCC(currentUser) && (
            <button onClick={() => setFiltroCC('TODOS')}
              className="text-xs px-3 py-1 rounded-md font-medium"
              style={{
                background: filtroCC === 'TODOS' ? '#1E2A3A' : '#F0E9D9',
                color: filtroCC === 'TODOS' ? '#F5F1E8' : '#1E2A3A',
              }}>Todos ({visibleActivities.length})</button>
          )}
          {CENTROS_COSTO.filter(c => ccDisponibles.includes(c.nombre)).map(cc => {
            const count = visibleActivities.filter(a => a.centroCosto === cc.nombre).length;
            return (
              <button key={cc.codigo} onClick={() => setFiltroCC(cc.nombre)}
                className="text-xs px-3 py-1 rounded-md font-medium"
                style={{
                  background: filtroCC === cc.nombre ? '#1E2A3A' : '#F0E9D9',
                  color: filtroCC === cc.nombre ? '#F5F1E8' : '#1E2A3A',
                }}>
                {cc.nombre} ({count})
              </button>
            );
          })}
        </div>

        {/* Selector de Área/Unidad - se habilita solo cuando hay CC seleccionado */}
        {filtroCC !== 'TODOS' && areasDisponiblesFiltro.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap mt-3 pt-3" style={{ borderTop: '1px dashed #E5DDD0' }}>
            <span className="text-xs uppercase tracking-wider font-medium" style={{ color: '#7A6F5C' }}>Área / Unidad:</span>
            <button onClick={() => setFiltroArea('TODAS')}
              className="text-xs px-3 py-1 rounded-md font-medium"
              style={{
                background: filtroArea === 'TODAS' ? '#C9A350' : '#F0E9D9',
                color: filtroArea === 'TODAS' ? '#1E2A3A' : '#1E2A3A',
              }}>
              Todas ({visibleActivities.filter(a => a.centroCosto === filtroCC).length})
            </button>
            {areasDisponiblesFiltro.map(area => {
              const count = visibleActivities.filter(a => a.centroCosto === filtroCC && a.area === area).length;
              return (
                <div key={area} className="inline-flex items-center rounded-md overflow-hidden" style={{ background: filtroArea === area ? '#C9A350' : '#F0E9D9' }}>
                  <button onClick={() => setFiltroArea(area)}
                    className="text-xs px-3 py-1 font-medium"
                    style={{ color: '#1E2A3A' }}>
                    {area} ({count})
                  </button>
                  {canEdit && (
                    <button onClick={() => handleEliminarArea(filtroCC, area)}
                      title={`Eliminar área "${area}"`}
                      className="px-1.5 py-1 hover:bg-red-200 transition-colors"
                      style={{ borderLeft: '1px solid rgba(0,0,0,0.1)', color: '#B33B3B' }}>
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            {canEdit && (
              <button onClick={() => setShowGestionAreas(true)}
                className="text-xs px-3 py-1 rounded-md font-medium ml-auto"
                style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
                ⚙ Gestionar áreas
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Selector de mes para ver la programación de un mes específico */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} style={{ color: '#7A6F5C' }} />
          <span className="text-xs uppercase tracking-wider font-medium mr-2" style={{ color: '#7A6F5C' }}>Ver mes:</span>
          <button onClick={() => setFiltroMesProg(0)}
            className="text-xs px-3 py-1.5 rounded-md font-medium"
            style={{
              background: filtroMesProg === 0 ? '#1E2A3A' : '#F0E9D9',
              color: filtroMesProg === 0 ? '#F5F1E8' : '#1E2A3A',
            }}>
            Anual (total)
          </button>
          {MESES.map((m, i) => (
            <button key={i} onClick={() => setFiltroMesProg(i + 1)}
              className="text-xs px-2.5 py-1.5 rounded-md font-medium"
              style={{
                background: filtroMesProg === i + 1 ? '#C9A350' : '#FAF7F0',
                color: '#1E2A3A',
                border: filtroMesProg === i + 1 ? '1px solid #C9A350' : '1px solid #E5DDD0',
              }}>
              {MESES_ABR[i]}
            </button>
          ))}
          {filtroMesProg > 0 && (
            <span className="text-xs ml-2 italic" style={{ color: '#9C7A2B' }}>
              Mostrando programación de <strong>{MESES[filtroMesProg - 1]}</strong>
            </span>
          )}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>CC / Área</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>AOI</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Actividad</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Unidad</th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Física PIA</th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Física PIM</th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C', background: '#FAF7F0' }}>{filtroMesProg > 0 ? `Fin. PIA ${MESES_ABR[filtroMesProg-1]}` : 'Financiera PIA'}</th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#9C7A2B', background: '#FBF1D9' }}>{filtroMesProg > 0 ? `Fin. PIM ${MESES_ABR[filtroMesProg-1]}` : 'Financiera PIM'}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-sm" style={{ color: '#7A6F5C' }}>
                  Sin actividades en este filtro.
                </td></tr>
              )}
              {filtered.map((a) => {
                const inactivo = a.activo === false;
                const finPIA = filtroMesProg > 0 ? financieroMesActividad(a, 'pia', filtroMesProg - 1) : totalFinancieroActividad(a, 'pia');
                const finPIM = filtroMesProg > 0 ? financieroMesActividad(a, 'pim', filtroMesProg - 1) : totalFinancieroActividad(a, 'pim');
                return (
                <tr key={a.id} className="border-b last:border-b-0 hover:bg-stone-50" style={{ borderColor: '#E5DDD0', opacity: inactivo ? 0.55 : 1 }}>
                  <td className="px-4 py-3">
                    <Pill>{a.centroCosto}</Pill>
                    <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>{a.area}</div>
                    {inactivo && (
                      <span className="inline-block text-[10px] mt-1 px-1.5 py-0.5 rounded font-semibold" style={{ background: '#F5D5D5', color: '#B33B3B' }}>
                        DESHABILITADA
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1E2A3A' }}>
                    <div className="flex items-center gap-2">
                      {a.codigoAOI}
                      {(() => {
                        const reprogs = getReprogsByActivityId(a.id);
                        if (reprogs.length === 0) return null;
                        return (
                          <button onClick={() => setVerHistorial({ actividad: a, reprogs })}
                            title={`Reprogramada ${reprogs.length} ${reprogs.length === 1 ? 'vez' : 'veces'}`}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: '#FBE0D0', color: '#A85D2B', fontSize: 10 }}>
                            <RefreshCw size={10} /> {reprogs.length}
                          </button>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#1E2A3A' }}>
                    <div className="text-xs leading-snug" style={{ maxWidth: 380 }}>{a.nombre}</div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>{a.unidadMedida}</td>
                  <td className="px-4 py-3 text-right" style={{ color: '#1E2A3A' }}>{fmtEntero(a.metaAnualFisica)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: '#1E2A3A' }}>{fmtEntero(a.metaAnualFisicaPIM || a.metaAnualFisica)}</td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: '#1E2A3A', background: '#FAF7F0' }}>{fmtEntero(finPIA)}</td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: '#9C7A2B', background: '#FBF1D9' }}>{fmtEntero(finPIM)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {canEdit ? (
                      <>
                        <button onClick={() => toggleActiveActivity(a)}
                          className="p-1.5 rounded hover:bg-stone-200 mr-1"
                          title={inactivo ? 'Habilitar actividad' : 'Deshabilitar actividad'}
                          style={{ color: inactivo ? '#2D7A4E' : '#9C7A2B' }}>
                          {inactivo ? '🔓' : '🔒'}
                        </button>
                        <button onClick={() => editActivity(a)} className="p-1.5 rounded hover:bg-stone-200 mr-1" title="Editar">
                          <Edit3 size={14} style={{ color: '#1E2A3A' }} />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded hover:bg-red-50" title="Eliminar">
                          <Trash2 size={14} style={{ color: '#B33B3B' }} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: '#9C9080' }}>—</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: '#1E2A3A', color: '#F5F1E8', fontWeight: 600 }}>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider" colSpan={4}>TOTAL PROGRAMADO ({filtered.length} actividades)</td>
                  <td className="px-4 py-3 text-right text-xs">{fmtEntero(filtered.reduce((s, a) => s + (Number(a.metaAnualFisica) || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs">{fmtEntero(filtered.reduce((s, a) => s + (Number(a.metaAnualFisicaPIM || a.metaAnualFisica) || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs">{fmtEntero(filtered.reduce((s, a) => s + (filtroMesProg > 0 ? financieroMesActividad(a, 'pia', filtroMesProg - 1) : totalFinancieroActividad(a, 'pia')), 0))}</td>
                  <td className="px-4 py-3 text-right text-xs" style={{ color: '#C9A350' }}>{fmtEntero(filtered.reduce((s, a) => s + (filtroMesProg > 0 ? financieroMesActividad(a, 'pim', filtroMesProg - 1) : totalFinancieroActividad(a, 'pim')), 0))}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {showForm && editing && (
        <ActivityForm activity={editing} setActivity={setEditing} isNew={isNew}
          activities={activities}
          areasMap={areasMap}
          onAgregarArea={handleAgregarArea}
          onEliminarArea={handleEliminarArea}
          oeiLista={oeiLista}
          aeiLista={aeiLista}
          onAgregarOEI={handleAgregarOEI}
          onAgregarAEI={handleAgregarAEI}
          canEdit={canEdit}
          onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}

      {verHistorial && (
        <HistorialReprogModal
          actividad={verHistorial.actividad}
          reprogs={verHistorial.reprogs}
          onClose={() => setVerHistorial(null)}
        />
      )}

      {showGestionAreas && (
        <GestionAreasModal
          areasMap={areasMap}
          activities={activities}
          onAgregarArea={handleAgregarArea}
          onEliminarArea={handleEliminarArea}
          onClose={() => setShowGestionAreas(false)}
        />
      )}
    </>
  );
}

function ActivityForm({ activity, setActivity, isNew, onSave, onClose, activities = [], areasMap, onAgregarArea, onEliminarArea, oeiLista, aeiLista, onAgregarOEI, onAgregarAEI, canEdit = false }) {
  // Asegurar estructura de genéricas y física mensual
  const act = (activity.genericas && activity.fisicaMensual) ? activity : migrarActividadGenericas(activity);
  if (!activity.genericas || !activity.fisicaMensual) {
    setTimeout(() => setActivity(act), 0);
  }

  const piaBloqueado = activity.piaBloqueado === true;

  function update(field, value) { setActivity({ ...activity, [field]: value }); }

  // Actualizar genérica financiera: si es PIA y está bloqueado, no permite
  function updateGenerica(gen, tipo, mesIdx, value) {
    if (tipo === 'pia' && piaBloqueado) return;
    const genericas = JSON.parse(JSON.stringify(activity.genericas || nuevasGenericas()));
    if (!genericas[gen]) genericas[gen] = { pia: Array(12).fill(0), pim: Array(12).fill(0) };
    genericas[gen][tipo][mesIdx] = Number(value) || 0;
    setActivity({ ...activity, genericas });
  }

  // Actualizar física mensual: si es PIA y está bloqueado, no permite
  function updateFisicaMensual(tipo, mesIdx, value) {
    if (tipo === 'pia' && piaBloqueado) return;
    const fm = JSON.parse(JSON.stringify(activity.fisicaMensual || nuevaFisicaMensual()));
    fm[tipo][mesIdx] = Number(value) || 0;
    setActivity({ ...activity, fisicaMensual: fm });
  }

  // Totales por tipo (auto-calculados, no editables)
  const sumFinPIA = totalFinancieroActividad(activity, 'pia');
  const sumFinPIM = totalFinancieroActividad(activity, 'pim');
  const sumFisPIA = totalFisicaActividad(activity, 'pia');
  const sumFisPIM = totalFisicaActividad(activity, 'pim');

  // Mapa efectivo de áreas (dinámico si fue pasado por props)
  const _areasMap = areasMap || AREAS_POR_CC;

  // Áreas disponibles para el CC seleccionado: combina predefinidas dinámicas
  // con las áreas existentes en actividades de ese CC (para mostrar todas las usadas)
  const areasDisponibles = useMemo(() => {
    const predefinidas = _areasMap[activity.centroCosto] || [];
    const enUso = Array.from(new Set(
      activities.filter(a => a.centroCosto === activity.centroCosto && a.area).map(a => a.area)
    ));
    return Array.from(new Set([...predefinidas, ...enUso])).sort();
  }, [activity.centroCosto, activities, _areasMap]);

  // Responsables existentes (en todas las actividades, deduplicados)
  const responsablesExistentes = useMemo(() => {
    return Array.from(new Set(
      activities.filter(a => a.responsable && a.responsable.trim()).map(a => a.responsable.trim())
    )).sort();
  }, [activities]);

  const [modoArea, setModoArea] = useState('select'); // 'select' | 'nuevo'
  const [modoResp, setModoResp] = useState('select'); // 'select' | 'nuevo'
  const [nuevaAreaInput, setNuevaAreaInput] = useState('');
  // Modos para crear nuevos OEI / AEI desde el formulario
  const [modoOEI, setModoOEI] = useState('select'); // 'select' | 'nuevo'
  const [modoAEI, setModoAEI] = useState('select'); // 'select' | 'nuevo'
  const [nuevoOEICod, setNuevoOEICod] = useState('');
  const [nuevoOEINom, setNuevoOEINom] = useState('');
  const [nuevoAEICod, setNuevoAEICod] = useState('');
  const [nuevoAEINom, setNuevoAEINom] = useState('');
  const _oeiLista = oeiLista || OEI_LISTA;
  const _aeiLista = aeiLista || AEI_LISTA;
  const aeisDelOEI = (_aeiLista).filter(a => a.oei === activity.oei);

  async function guardarNuevoOEI() {
    if (!onAgregarOEI) return;
    const cod = await onAgregarOEI(nuevoOEICod, nuevoOEINom);
    if (cod) {
      setActivity({ ...activity, oei: cod, aei: '' });
      setNuevoOEICod(''); setNuevoOEINom(''); setModoOEI('select');
    }
  }
  async function guardarNuevaAEI() {
    if (!onAgregarAEI) return;
    const cod = await onAgregarAEI(nuevoAEICod, nuevoAEINom, activity.oei);
    if (cod) {
      setActivity({ ...activity, aei: cod });
      setNuevoAEICod(''); setNuevoAEINom(''); setModoAEI('select');
    }
  }

  // Cuando cambia el CC, resetea el área si no está en la lista del nuevo CC
  function cambiarCC(nuevoCC) {
    const nuevasAreas = _areasMap[nuevoCC] || [];
    const enUso = Array.from(new Set(
      activities.filter(a => a.centroCosto === nuevoCC && a.area).map(a => a.area)
    ));
    const todas = Array.from(new Set([...nuevasAreas, ...enUso]));
    setActivity({
      ...activity,
      centroCosto: nuevoCC,
      area: todas.includes(activity.area) ? activity.area : (todas[0] || ''),
    });
    setModoArea('select');
  }

  // Al cambiar el OEI, se resetea la AEI (debe pertenecer al OEI elegido).
  function cambiarOEI(nuevoOEI) {
    const aeis = aeisPorOEI(nuevoOEI);
    const aeiValida = aeis.some(x => x.codigo === activity.aei) ? activity.aei : (aeis[0]?.codigo || '');
    setActivity({ ...activity, oei: nuevoOEI, aei: aeiValida });
  }

  async function guardarNuevaArea() {
    if (!onAgregarArea) {
      // Modo fallback: solo establecer en la actividad sin persistir
      if (nuevaAreaInput.trim()) update('area', nuevaAreaInput.trim().toUpperCase());
      setModoArea('select');
      return;
    }
    const ok = await onAgregarArea(activity.centroCosto, nuevaAreaInput);
    if (ok) {
      update('area', nuevaAreaInput.trim().toUpperCase());
      setNuevaAreaInput('');
      setModoArea('select');
    }
  }

  async function eliminarAreaActual() {
    if (!activity.area || !onEliminarArea) return;
    await onEliminarArea(activity.centroCosto, activity.area);
    // Si el área se eliminó exitosamente, limpiar el campo
    const conActividades = activities.filter(a => a.centroCosto === activity.centroCosto && a.area === activity.area).length;
    if (conActividades === 0 || (conActividades === 1 && !isNew && activity.id)) {
      // No-op: la advertencia ya la dio onEliminarArea
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
      <div className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#FAF7F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ background: '#FAF7F0', borderColor: '#E5DDD0' }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
            {isNew ? 'Nueva actividad operativa' : 'Editar actividad'}
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="Centro de Costo">
            <select value={activity.centroCosto} onChange={(e) => cambiarCC(e.target.value)} className={inputCls}>
              {CENTROS_COSTO.map(cc => <option key={cc.codigo} value={cc.nombre}>{cc.nombre}</option>)}
            </select>
          </Field>
          <Field label="Área / Unidad">
            {modoArea === 'select' ? (
              <div className="flex gap-1">
                <select value={activity.area} onChange={(e) => update('area', e.target.value)} className={inputCls} style={{ flex: 1 }}>
                  <option value="">— Selecciona un área —</option>
                  {areasDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <button type="button" onClick={() => { setModoArea('nuevo'); setNuevaAreaInput(''); update('area', ''); }}
                  className="px-2.5 rounded-md text-xs font-semibold whitespace-nowrap"
                  style={{ background: '#C9A350', color: '#1E2A3A' }} title="Crear nueva área/unidad">
                  + Nueva
                </button>
                {canEdit && activity.area && onEliminarArea && (
                  <button type="button" onClick={eliminarAreaActual}
                    className="px-2.5 rounded-md text-xs font-semibold whitespace-nowrap"
                    style={{ background: '#F5D5D5', color: '#B33B3B' }}
                    title={`Eliminar área "${activity.area}"`}>
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-1">
                <input type="text" value={nuevaAreaInput} onChange={(e) => setNuevaAreaInput(e.target.value.toUpperCase())}
                  placeholder="Nombre de la nueva área/unidad" className={inputCls} style={{ flex: 1 }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardarNuevaArea(); } }} />
                <button type="button" onClick={guardarNuevaArea}
                  disabled={!nuevaAreaInput.trim()}
                  className="px-2.5 rounded-md text-xs font-semibold whitespace-nowrap"
                  style={{ background: '#2D7A4E', color: '#FFF', opacity: nuevaAreaInput.trim() ? 1 : 0.5 }}>
                  ✓ Guardar
                </button>
                <button type="button" onClick={() => { setModoArea('select'); setNuevaAreaInput(''); }}
                  className="px-2.5 rounded-md text-xs font-semibold"
                  style={{ background: '#F0E9D9', color: '#1E2A3A' }} title="Cancelar">
                  ←
                </button>
              </div>
            )}
          </Field>

          <div className="col-span-2 rounded-md p-3" style={{ background: '#F0E9D9', border: '1px solid #E5DDD0' }}>
            <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#9C7A2B' }}>
              Vinculación al Plan Estratégico Institucional (PEI 2024-2030)
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* OEI */}
              <Field label="Objetivo Estratégico Institucional (OEI)">
                {modoOEI === 'select' ? (
                  <div className="flex gap-1">
                    <select value={activity.oei || ''} onChange={(e) => cambiarOEI(e.target.value)} className={inputCls} style={{ flex: 1 }}>
                      <option value="">— Selecciona un OEI —</option>
                      {_oeiLista.map(o => (
                        <option key={o.codigo} value={o.codigo}>{o.codigo} — {o.nombre}</option>
                      ))}
                    </select>
                    {onAgregarOEI && (
                      <button type="button" onClick={() => { setModoOEI('nuevo'); setNuevoOEICod(''); setNuevoOEINom(''); }}
                        className="px-2.5 rounded-md text-xs font-semibold whitespace-nowrap"
                        style={{ background: '#C9A350', color: '#1E2A3A' }} title="Crear nuevo OEI">
                        + Nuevo
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input type="text" value={nuevoOEICod} onChange={(e) => setNuevoOEICod(e.target.value.toUpperCase())}
                      placeholder="Código (ej. OEI.08)" className={inputCls} />
                    <div className="flex gap-1">
                      <input type="text" value={nuevoOEINom} onChange={(e) => setNuevoOEINom(e.target.value)}
                        placeholder="Nombre del OEI" className={inputCls} style={{ flex: 1 }} />
                      <button type="button" onClick={guardarNuevoOEI}
                        disabled={!nuevoOEICod.trim() || !nuevoOEINom.trim()}
                        className="px-2.5 rounded-md text-xs font-semibold whitespace-nowrap"
                        style={{ background: '#2D7A4E', color: '#FFF', opacity: (nuevoOEICod.trim() && nuevoOEINom.trim()) ? 1 : 0.5 }}>
                        ✓
                      </button>
                      <button type="button" onClick={() => setModoOEI('select')}
                        className="px-2.5 rounded-md text-xs font-semibold"
                        style={{ background: '#F0E9D9', color: '#1E2A3A' }} title="Cancelar">←</button>
                    </div>
                  </div>
                )}
              </Field>
              {/* AEI */}
              <Field label="Acción Estratégica Institucional (AEI)">
                {modoAEI === 'select' ? (
                  <div className="flex gap-1">
                    <select value={activity.aei || ''} onChange={(e) => update('aei', e.target.value)} className={inputCls} style={{ flex: 1 }}
                      disabled={!activity.oei}>
                      <option value="">{activity.oei ? '— Selecciona una AEI —' : '— Elige primero el OEI —'}</option>
                      {aeisDelOEI.map(a => (
                        <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.nombre}</option>
                      ))}
                    </select>
                    {onAgregarAEI && (
                      <button type="button" onClick={() => { if (!activity.oei) { alert('Primero selecciona el OEI'); return; } setModoAEI('nuevo'); setNuevoAEICod(''); setNuevoAEINom(''); }}
                        className="px-2.5 rounded-md text-xs font-semibold whitespace-nowrap"
                        style={{ background: '#C9A350', color: '#1E2A3A', opacity: activity.oei ? 1 : 0.5 }} title="Crear nueva AEI">
                        + Nueva
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input type="text" value={nuevoAEICod} onChange={(e) => setNuevoAEICod(e.target.value.toUpperCase())}
                      placeholder="Código (ej. AEI.06.06)" className={inputCls} />
                    <div className="flex gap-1">
                      <input type="text" value={nuevoAEINom} onChange={(e) => setNuevoAEINom(e.target.value)}
                        placeholder="Nombre de la AEI" className={inputCls} style={{ flex: 1 }} />
                      <button type="button" onClick={guardarNuevaAEI}
                        disabled={!nuevoAEICod.trim() || !nuevoAEINom.trim()}
                        className="px-2.5 rounded-md text-xs font-semibold whitespace-nowrap"
                        style={{ background: '#2D7A4E', color: '#FFF', opacity: (nuevoAEICod.trim() && nuevoAEINom.trim()) ? 1 : 0.5 }}>
                        ✓
                      </button>
                      <button type="button" onClick={() => setModoAEI('select')}
                        className="px-2.5 rounded-md text-xs font-semibold"
                        style={{ background: '#F0E9D9', color: '#1E2A3A' }} title="Cancelar">←</button>
                    </div>
                    <div className="text-[11px]" style={{ color: '#7A6F5C' }}>Se creará dentro de {activity.oei || '—'}</div>
                  </div>
                )}
              </Field>
            </div>
          </div>

          <Field label="Código de Registro">
            <input type="text" value={activity.codigoRegistro} onChange={(e) => update('codigoRegistro', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Código AOI">
            <input type="text" value={activity.codigoAOI} onChange={(e) => update('codigoAOI', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Nombre de la actividad" full>
            <textarea rows={2} value={activity.nombre} onChange={(e) => update('nombre', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Unidad de medida">
            <input type="text" value={activity.unidadMedida} onChange={(e) => update('unidadMedida', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Responsable">
            {modoResp === 'select' ? (
              <div className="flex gap-2">
                <select value={activity.responsable} onChange={(e) => update('responsable', e.target.value)} className={inputCls} style={{ flex: 1 }}>
                  <option value="">— Selecciona un responsable —</option>
                  {responsablesExistentes.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="button" onClick={() => { setModoResp('nuevo'); update('responsable', ''); }}
                  className="px-2.5 rounded-md text-xs font-semibold whitespace-nowrap"
                  style={{ background: '#C9A350', color: '#1E2A3A' }} title="Agregar nuevo responsable">
                  + Nuevo
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" value={activity.responsable} onChange={(e) => update('responsable', e.target.value)}
                  placeholder="Nombre del responsable" className={inputCls} style={{ flex: 1 }} />
                <button type="button" onClick={() => setModoResp('select')}
                  className="px-2.5 rounded-md text-xs font-semibold"
                  style={{ background: '#F0E9D9', color: '#1E2A3A' }} title="Volver a seleccionar">
                  ← Lista
                </button>
              </div>
            )}
          </Field>
          <Field label="Física anual PIA (auto)">
            <input type="number" value={sumFisPIA} readOnly className={inputCls} style={{ background: '#F0E9D9', cursor: 'not-allowed' }} />
          </Field>
          <Field label="Física anual PIM (auto)">
            <input type="number" value={sumFisPIM} readOnly className={inputCls} style={{ background: '#FBF1D9', cursor: 'not-allowed', color: '#9C7A2B' }} />
          </Field>
        </div>

        {/* Banner de estado del PIA */}
        <div className="px-6 pb-3">
          {piaBloqueado ? (
            <div className="p-3 rounded flex items-center justify-between" style={{ background: '#FBF1D9', border: '1px solid #C9A350' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#9C7A2B' }}>
                <Lock size={14} />
                <span><strong>PIA bloqueado.</strong> La programación PIA (física y financiera) se registra una sola vez al año (enero) y no puede modificarse. Para cambios, solicite apertura.</span>
              </div>
              <button type="button"
                onClick={() => {
                  if (window.confirm('¿Solicitar apertura del PIA para esta actividad?\n\nEsto registrará una solicitud que debe ser aprobada por un administrador antes de poder editar el PIA.')) {
                    alert('Solicitud de apertura registrada. Un administrador debe aprobarla en el módulo de Solicitudes.\n\n(Nota: en esta demo, un administrador puede desbloquear directamente con el botón "Desbloquear PIA".)');
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap"
                style={{ background: '#C9A350', color: '#1E2A3A' }}>
                <Unlock size={12} className="inline mr-1" /> Solicitar apertura
              </button>
            </div>
          ) : (
            <div className="p-3 rounded flex items-center justify-between" style={{ background: '#E8F2EC', border: '1px solid #2D7A4E' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#2D7A4E' }}>
                <Unlock size={14} />
                <span><strong>PIA abierto.</strong> Puede registrar la programación PIA inicial. Una vez guardada quedará bloqueada para evitar modificaciones involuntarias.</span>
              </div>
            </div>
          )}
          {/* El administrador puede bloquear/desbloquear manualmente (demo) */}
          {canEdit && (
            <div className="mt-2 flex justify-end">
              <button type="button"
                onClick={() => update('piaBloqueado', !piaBloqueado)}
                className="text-[11px] px-2.5 py-1 rounded font-medium"
                style={{ background: piaBloqueado ? '#E8F2EC' : '#FBF1D9', color: piaBloqueado ? '#2D7A4E' : '#9C7A2B' }}>
                {piaBloqueado ? '🔓 Desbloquear PIA (admin)' : '🔒 Bloquear PIA (admin)'}
              </button>
            </div>
          )}
        </div>

        {/* Resumen de totales financieros (calculados) */}
        <div className="px-6 pb-2 grid grid-cols-2 gap-4">
          <div className="p-3 rounded" style={{ background: '#FAF7F0', border: '1px solid #E5DDD0' }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Financiera anual PIA (auto)</div>
            <div className="text-lg font-bold" style={{ color: '#1E2A3A' }}>S/ {fmtDecimal(sumFinPIA)}</div>
          </div>
          <div className="p-3 rounded" style={{ background: '#FBF1D9', border: '1px solid #C9A350' }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: '#9C7A2B' }}>Financiera anual PIM (auto)</div>
            <div className="text-lg font-bold" style={{ color: '#9C7A2B' }}>S/ {fmtDecimal(sumFinPIM)}</div>
          </div>
        </div>

        {/* Programación física mensual PIA y PIM */}
        <div className="px-6 pb-2">
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#9C7A2B' }}>Programación física mensual</div>
          <div className="text-[11px] mb-3" style={{ color: '#7A6F5C' }}>La fila PIA es la programación original (se bloquea tras el registro inicial). La fila PIM es la vigente y se modifica con las reprogramaciones.</div>
        </div>
        <div className="px-6 pb-4">
          <div className="overflow-x-auto rounded-md border" style={{ borderColor: '#E5DDD0' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F0E9D9' }}>
                  <th className="text-left px-2 py-2 text-[10px] uppercase" style={{ color: '#7A6F5C' }}>Tipo</th>
                  {MESES_ABR.map((m, i) => (
                    <th key={i} className="text-center px-1 py-2 text-[10px] uppercase" style={{ color: '#7A6F5C' }}>{m}</th>
                  ))}
                  <th className="text-center px-2 py-2 text-[10px] uppercase" style={{ color: '#1E2A3A', background: '#E5DDD0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1 text-[11px] font-semibold" style={{ color: '#7A6F5C' }}>PIA</td>
                  {MESES.map((m, i) => (
                    <td key={i} className="px-0.5 py-1">
                      <input type="number" value={activity.fisicaMensual?.pia?.[i] ?? 0}
                        onChange={(e) => updateFisicaMensual('pia', i, e.target.value)}
                        readOnly={piaBloqueado}
                        className="w-full text-right px-1 py-1 rounded border text-[11px]"
                        style={{ borderColor: '#E5DDD0', background: piaBloqueado ? '#F0E9D9' : '#FFF', cursor: piaBloqueado ? 'not-allowed' : 'text' }} />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right text-[11px] font-bold" style={{ color: '#1E2A3A', background: '#FAF7F0' }}>{fmtEntero(sumFisPIA)}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 text-[11px] font-semibold" style={{ color: '#9C7A2B' }}>PIM</td>
                  {MESES.map((m, i) => (
                    <td key={i} className="px-0.5 py-1">
                      <input type="number" value={activity.fisicaMensual?.pim?.[i] ?? 0}
                        onChange={(e) => updateFisicaMensual('pim', i, e.target.value)}
                        className="w-full text-right px-1 py-1 rounded border text-[11px]"
                        style={{ borderColor: '#C9A350', background: '#FFFDF7' }} />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right text-[11px] font-bold" style={{ color: '#9C7A2B', background: '#FBF1D9' }}>{fmtEntero(sumFisPIM)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Programación financiera por genérica de gasto */}
        <div className="px-6 pb-2">
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#9C7A2B' }}>Programación financiera por genérica de gasto</div>
          <div className="text-[11px] mb-3" style={{ color: '#7A6F5C' }}>Ingresa los importes con decimales. La fila PIA se bloquea tras el registro inicial; la fila PIM es modificable.</div>
        </div>
        <div className="px-6 pb-4 space-y-4">
          {GENERICAS_GASTO.map(gen => {
            const totPIA = (activity.genericas?.[gen.codigo]?.pia || []).reduce((s, v) => s + (Number(v) || 0), 0);
            const totPIM = (activity.genericas?.[gen.codigo]?.pim || []).reduce((s, v) => s + (Number(v) || 0), 0);
            return (
              <div key={gen.codigo} className="rounded-md border" style={{ borderColor: '#E5DDD0' }}>
                <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#1E2A3A' }}>
                  <span className="text-xs font-semibold" style={{ color: '#C9A350' }}>{gen.codigo} {gen.nombre}</span>
                  <span className="text-[11px]" style={{ color: '#F5F1E8' }}>
                    PIA: S/ {fmtDecimal(totPIA)} &nbsp;|&nbsp; PIM: S/ {fmtDecimal(totPIM)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: '#F0E9D9' }}>
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase" style={{ color: '#7A6F5C' }}>Tipo</th>
                        {MESES_ABR.map((m, i) => <th key={i} className="text-center px-1 py-1.5 text-[10px]" style={{ color: '#7A6F5C' }}>{m}</th>)}
                        <th className="text-center px-2 py-1.5 text-[10px] uppercase" style={{ color: '#1E2A3A', background: '#E5DDD0' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1 text-[11px] font-semibold" style={{ color: '#7A6F5C' }}>PIA</td>
                        {MESES.map((m, i) => (
                          <td key={i} className="px-0.5 py-1">
                            <input type="number" step="0.01" value={activity.genericas?.[gen.codigo]?.pia?.[i] ?? 0}
                              onChange={(e) => updateGenerica(gen.codigo, 'pia', i, e.target.value)}
                              readOnly={piaBloqueado}
                              className="w-full text-right px-1 py-1 rounded border text-[11px]"
                              style={{ borderColor: '#E5DDD0', background: piaBloqueado ? '#F0E9D9' : '#FFF', cursor: piaBloqueado ? 'not-allowed' : 'text' }} />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-right text-[11px] font-bold" style={{ color: '#1E2A3A', background: '#FAF7F0' }}>{fmtEntero(totPIA)}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1 text-[11px] font-semibold" style={{ color: '#9C7A2B' }}>PIM</td>
                        {MESES.map((m, i) => (
                          <td key={i} className="px-0.5 py-1">
                            <input type="number" step="0.01" value={activity.genericas?.[gen.codigo]?.pim?.[i] ?? 0}
                              onChange={(e) => updateGenerica(gen.codigo, 'pim', i, e.target.value)}
                              className="w-full text-right px-1 py-1 rounded border text-[11px]" style={{ borderColor: '#C9A350', background: '#FFFDF7' }} />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-right text-[11px] font-bold" style={{ color: '#9C7A2B', background: '#FBF1D9' }}>{fmtEntero(totPIM)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Totales generales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded flex items-center justify-between" style={{ background: '#1E2A3A' }}>
              <span className="text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Total PIA</span>
              <strong style={{ color: '#F5F1E8', fontSize: 15 }}>S/ {fmtDecimal(sumFinPIA)}</strong>
            </div>
            <div className="p-3 rounded flex items-center justify-between" style={{ background: '#9C7A2B' }}>
              <span className="text-xs uppercase tracking-wider" style={{ color: '#FBF1D9' }}>Total PIM</span>
              <strong style={{ color: '#FFFFFF', fontSize: 15 }}>S/ {fmtDecimal(sumFinPIM)}</strong>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-2 sticky bottom-0" style={{ background: '#FAF7F0', borderColor: '#E5DDD0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm" style={{ color: '#1E2A3A' }}>Cancelar</button>
          <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold" style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
            <Save size={14} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function GestionAreasModal({ areasMap, activities, onAgregarArea, onEliminarArea, onClose }) {
  const [ccSelected, setCcSelected] = useState(CENTROS_COSTO[0].nombre);
  const [nuevaArea, setNuevaArea] = useState('');

  // Áreas del CC seleccionado (predefinidas + en uso)
  const areasDelCC = useMemo(() => {
    const predefinidas = areasMap[ccSelected] || [];
    const enUso = Array.from(new Set(activities.filter(a => a.centroCosto === ccSelected && a.area).map(a => a.area)));
    return Array.from(new Set([...predefinidas, ...enUso])).sort();
  }, [ccSelected, areasMap, activities]);

  async function agregar() {
    const ok = await onAgregarArea(ccSelected, nuevaArea);
    if (ok) setNuevaArea('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
      <div className="rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#FAF7F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ background: '#FAF7F0', borderColor: '#E5DDD0' }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
            ⚙ Gestión de Áreas / Unidades
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
        </div>

        <div className="p-6">
          <div className="mb-4 p-3 rounded text-xs" style={{ background: '#FBF1D9', borderLeft: '3px solid #C9A350', color: '#9C7A2B' }}>
            <strong>ℹ️ Importante:</strong> No se puede eliminar un área si tiene actividades asociadas.
            Primero reasigne o elimine las actividades del área antes de continuar.
            Los cambios se reflejan en todos los módulos del sistema.
          </div>

          {/* Selector de CC */}
          <Field label="Centro de Costo">
            <select value={ccSelected} onChange={(e) => setCcSelected(e.target.value)} className={inputCls}>
              {CENTROS_COSTO.map(cc => <option key={cc.codigo} value={cc.nombre}>{cc.codigo} — {cc.nombre}</option>)}
            </select>
          </Field>

          {/* Agregar nueva área */}
          <div className="mt-4">
            <label className="text-[11px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: '#7A6F5C' }}>
              Agregar nueva área en {ccSelected}
            </label>
            <div className="flex gap-2">
              <input type="text" value={nuevaArea} onChange={(e) => setNuevaArea(e.target.value.toUpperCase())}
                placeholder="Nombre de la nueva área (ej: PIP CUSCO)"
                className={inputCls} style={{ flex: 1 }}
                onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }} />
              <button onClick={agregar}
                disabled={!nuevaArea.trim()}
                className="px-4 py-2 rounded-md text-sm font-semibold"
                style={{ background: '#C9A350', color: '#1E2A3A', opacity: nuevaArea.trim() ? 1 : 0.5 }}>
                + Agregar
              </button>
            </div>
          </div>

          {/* Lista de áreas existentes */}
          <div className="mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#7A6F5C' }}>
              Áreas existentes en {ccSelected} ({areasDelCC.length})
            </div>
            {areasDelCC.length === 0 ? (
              <div className="p-4 text-center text-sm rounded" style={{ background: '#F0E9D9', color: '#7A6F5C' }}>
                No hay áreas registradas en este Centro de Costo.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
                    <th className="p-3 text-left">Área / Unidad</th>
                    <th className="p-3 text-right">Actividades asociadas</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {areasDelCC.map(area => {
                    const count = activities.filter(a => a.centroCosto === ccSelected && a.area === area).length;
                    return (
                      <tr key={area} style={{ borderBottom: '1px solid #E5DDD0', background: '#FFFFFF' }}>
                        <td className="p-3 font-medium" style={{ color: '#1E2A3A' }}>{area}</td>
                        <td className="p-3 text-right" style={{ color: count > 0 ? '#2D7A4E' : '#9C9080' }}>
                          {count > 0 ? <strong>{count} activ{count === 1 ? 'idad' : 'idades'}</strong> : 'Sin actividades'}
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => onEliminarArea(ccSelected, area)}
                            className="px-3 py-1 rounded-md text-xs font-semibold"
                            style={{
                              background: count > 0 ? '#F5D5D5' : '#FFCDCD',
                              color: '#B33B3B',
                              opacity: count > 0 ? 0.5 : 1,
                              cursor: count > 0 ? 'not-allowed' : 'pointer',
                            }}
                            title={count > 0 ? `No se puede eliminar: tiene ${count} actividad${count === 1 ? '' : 'es'}` : 'Eliminar área'}>
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end" style={{ borderColor: '#E5DDD0' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-semibold"
            style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function HistorialReprogModal({ actividad, reprogs, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
      <div className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#FAF7F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ background: '#FAF7F0', borderColor: '#E5DDD0' }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
              Historial de reprogramaciones
            </div>
            <div className="text-xs mt-1 font-mono" style={{ color: '#7A6F5C' }}>
              {actividad.codigoAOI} · {actividad.nombre}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-6">
          {reprogs.map((r, idx) => {
            const original = r.programacionOriginal?.find(p => p.id === actividad.id);
            const nueva = r.programacionNueva?.find(p => p.id === actividad.id);
            const mesesAfect = r.mesesAfectados || [];
            return (
              <div key={r.id} className="border rounded-md p-4" style={{ borderColor: '#E5DDD0' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9C7A2B' }}>
                      Reprogramación #{reprogs.length - idx}
                    </div>
                    <div className="text-sm font-semibold" style={{ color: '#1E2A3A' }}>
                      {r.solicitante} · {r.fechaSolicitud.slice(0, 10)}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
                      Meses modificados: {mesesAfect.map(m => MESES[m-1]).join(', ')}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded font-semibold" style={{ background: '#E0E5EC', color: '#5C6B7F' }}>
                    {r.estado === 'cerrada' ? 'Cerrada' : 'Aprobada'}
                  </span>
                </div>
                <div className="mb-3 text-xs leading-relaxed" style={{ color: '#1E2A3A' }}>
                  <strong>Sustento:</strong> {r.sustento}
                </div>
                {original && nueva && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: '#F0E9D9' }}>
                          <th className="text-left px-2 py-1.5" style={{ color: '#7A6F5C' }}>Concepto</th>
                          {MESES.map((m, i) => (
                            <th key={i} className="text-right px-2 py-1.5"
                              style={{ color: mesesAfect.includes(i+1) ? '#A85D2B' : '#7A6F5C' }}>
                              {m.slice(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                          <td className="px-2 py-1.5 font-semibold" style={{ color: '#1E2A3A' }}>Física antes</td>
                          {original.programacion.map((p, i) => (
                            <td key={i} className="text-right px-2 py-1.5"
                              style={{ color: '#7A6F5C',
                                background: mesesAfect.includes(i+1) ? '#FBF1D9' : 'transparent' }}>
                              {p.fisica}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                          <td className="px-2 py-1.5 font-semibold" style={{ color: '#A85D2B' }}>Física después</td>
                          {nueva.programacion.map((p, i) => (
                            <td key={i} className="text-right px-2 py-1.5 font-semibold"
                              style={{ color: mesesAfect.includes(i+1) ? '#A85D2B' : '#1E2A3A',
                                background: mesesAfect.includes(i+1) ? '#FBE0D0' : 'transparent' }}>
                              {p.fisica}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                          <td className="px-2 py-1.5 font-semibold" style={{ color: '#1E2A3A' }}>Financiera antes</td>
                          {original.programacion.map((p, i) => (
                            <td key={i} className="text-right px-2 py-1.5"
                              style={{ color: '#7A6F5C',
                                background: mesesAfect.includes(i+1) ? '#FBF1D9' : 'transparent' }}>
                              {fmtMoneyShort(p.financiera)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-2 py-1.5 font-semibold" style={{ color: '#A85D2B' }}>Financiera después</td>
                          {nueva.programacion.map((p, i) => (
                            <td key={i} className="text-right px-2 py-1.5 font-semibold"
                              style={{ color: mesesAfect.includes(i+1) ? '#A85D2B' : '#1E2A3A',
                                background: mesesAfect.includes(i+1) ? '#FBE0D0' : 'transparent' }}>
                              {fmtMoneyShort(p.financiera)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-end" style={{ borderColor: '#E5DDD0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm" style={{ color: '#1E2A3A' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SEGUIMIENTO MENSUAL
   Centro de Costo -> Área -> Actividad operativa
============================================================ */
function Seguimiento({ activities, progress, saveProgress, periodos, solicitudes, saveSolicitudes, currentUser, usuarios, logAuditoria, notificar, soloLectura = false }) {
  const ccDisponibles = ccsVisibles(currentUser);
  const [ccSel, setCcSel] = useState(ccDisponibles[0] || CENTROS_COSTO[0].nombre);
  const [areaSel, setAreaSel] = useState('');
  const [actId, setActId] = useState('');
  const anioActualSistema = Math.max(2026, new Date().getFullYear());
  const [year, setYear] = useState(anioActualSistema <= ANIO_FINAL ? anioActualSistema : 2026);
  const [mes, setMes] = useState(3);
  const [showSolicitudModal, setShowSolicitudModal] = useState(false);
  const [importandoSeg, setImportandoSeg] = useState(false);
  const [msgSeg, setMsgSeg] = useState(null);
  const esAdminUser = esAdmin(currentUser);

  // Estado del periodo seleccionado
  const periodoInfo = getEstadoPeriodo(periodos, year, mes);
  const bloqueado = periodoInfo.estado === 'cerrado' || periodoInfo.estado === 'por_abrir';
  const lector = esLector(currentUser);

  // Actividades visibles para el usuario (respeta permisos)
  function actsVisiblesSeg() {
    return esResponsableCC(currentUser)
      ? filtrarActividadesUsuario(activities, currentUser)
      : activities;
  }

  // Datos del reporte de Seguimiento por CC y mes, agrupados por OEI → AEI (modelo "Reporte Seguimiento POI 2026").
  function construirReporteSeguimiento(ccNombre, mesSel, anioSel) {
    const actsCC = actsVisiblesSeg().filter(a => a.centroCosto === ccNombre && a.activo !== false);
    const filas = actsCC.map(a0 => {
      const a = a0.genericas ? a0 : migrarActividadGenericas(a0);
      const fisProgAnual = totalFisicaActividad(a, 'pim');
      const finProgAnual = totalFinancieroActividad(a, 'pim');
      const fisProgMes = Number(a.fisicaMensual?.pim?.[mesSel - 1]) || 0;
      const finProgMes = financieroMesActividad(a, 'pim', mesSel - 1);
      // Ejecutado: acumulado anual y del mes
      let fisEjecAnual = 0, finEjecAnual = 0, fisEjecMes = 0, finEjecMes = 0;
      progress.filter(p => p.actividadId === a.id && p.anio === anioSel).forEach(p => {
        if (p.mes <= mesSel) { fisEjecAnual += Number(p.avanceFisico) || 0; finEjecAnual += Number(p.avanceFinanciero) || 0; }
        if (p.mes === mesSel) { fisEjecMes += Number(p.avanceFisico) || 0; finEjecMes += Number(p.avanceFinanciero) || 0; }
      });
      return {
        oei: a.oei || inferirOeiAei(a.centroCosto).oei, aei: a.aei || inferirOeiAei(a.centroCosto).aei,
        reg: a.codigoRegistro, aoi: a.codigoAOI, nombre: a.nombre, um: a.unidadMedida,
        fisProgAnual, fisEjecAnual, fisProgMes, fisEjecMes,
        finProgAnual, finEjecAnual, finProgMes, finEjecMes,
      };
    });
    // Ordenar por OEI, luego AEI
    filas.sort((x, y) => (x.oei + x.aei).localeCompare(y.oei + y.aei) || x.aoi.localeCompare(y.aoi));
    const totPIM = filas.reduce((s, f) => s + f.finProgAnual, 0);
    const totDev = filas.reduce((s, f) => s + f.finEjecAnual, 0);
    return { filas, totPIM, totDev };
  }

  // Exportar el seguimiento a Excel (CSV compatible con Excel) según el modelo Reporte Seguimiento POI 2026.
  function exportarSeguimientoExcel() {
    const ccList = esResponsableCC(currentUser) ? [ccSel] : CENTROS_COSTO.map(c => c.nombre).filter(n => actsVisiblesSeg().some(a => a.centroCosto === n));
    const rows = [];
    rows.push(['REPORTE DE SEGUIMIENTO DEL PLAN OPERATIVO INSTITUCIONAL (POI) DEL MVCS 2026']);
    rows.push(['PROGRAMA NUESTRAS CIUDADES']);
    rows.push([`Mes: ${MESES[mes - 1].toUpperCase()}`, `Año: ${year}`]);
    rows.push([]);
    rows.push(['Centro de Costo', 'OEI', 'AEI', 'Nro Registro POI', 'Actividad Operativa ID', 'Actividad Operativa', 'Unidad de Medida',
      'FÍSICO Prog. Anual', 'FÍSICO Ejec. Anual', `FÍSICO Prog. ${MESES[mes - 1]}`, `FÍSICO Ejec. ${MESES[mes - 1]}`,
      'FINANCIERO Prog. Anual', 'FINANCIERO Ejec. Anual', `FINANCIERO Prog. ${MESES[mes - 1]}`, `FINANCIERO Ejec. ${MESES[mes - 1]}`]);
    ccList.forEach(ccNombre => {
      const { filas, totPIM, totDev } = construirReporteSeguimiento(ccNombre, mes, year);
      filas.forEach(f => {
        rows.push([ccNombre, f.oei, f.aei, f.reg, f.aoi, f.nombre, f.um,
          f.fisProgAnual.toFixed(0), f.fisEjecAnual.toFixed(0), f.fisProgMes.toFixed(0), f.fisEjecMes.toFixed(0),
          f.finProgAnual.toFixed(2), f.finEjecAnual.toFixed(2), f.finProgMes.toFixed(2), f.finEjecMes.toFixed(2)]);
      });
      rows.push(['', '', '', '', '', '', 'TOTAL ' + ccNombre, '', '', '', '', totPIM.toFixed(2), totDev.toFixed(2), '', '']);
    });

    const csv = '\ufeff' + rows.map(r =>
      r.map(c => {
        const s = String(c).replace(/"/g, '""');
        return /[;"\n]/.test(s) ? `"${s}"` : s;
      }).join(';')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Seguimiento_POI_${year}_${MESES[mes - 1]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (logAuditoria) logAuditoria('exportar_seguimiento_excel', `Exportó Reporte Seguimiento POI ${year} (${MESES[mes - 1]}) a Excel`, {});
  }

  // Exportar el seguimiento a PDF (HTML imprimible) según el modelo Reporte Seguimiento POI 2026.
  // Exportar el seguimiento a PDF (HTML imprimible) según el modelo "Reporte Seguimiento POI 2026":
  // agrupado por OEI → AEI, y por cada Actividad Operativa dos filas (PROGRAMADO y EJECUTADO)
  // con la meta mensual de enero a diciembre, más Acumulado y % Acumulado para físico y financiero.
  function exportarSeguimientoPDF() {
    const ccList = esResponsableCC(currentUser)
      ? [ccSel]
      : CENTROS_COSTO.map(c => c.nombre).filter(n => actsVisiblesSeg().some(a => a.centroCosto === n));
    const fmt2 = (n) => (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmt0 = (n) => (Number(n) || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 });
    const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0).toFixed(1) + '%';
    const aeiNombre = (cod) => (AEI_LISTA.find(x => x.codigo === cod)?.nombre || '');
    const oeiNombre = (cod) => (OEI_LISTA.find(x => x.codigo === cod)?.nombre || '');
    const mesAbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

    // Construye los datos de una actividad: arreglos mensuales programado/ejecutado físico y financiero
    function datosActividad(a0) {
      const a = a0.genericas ? a0 : migrarActividadGenericas(a0);
      const fisProg = (a.fisicaMensual?.pim || Array(12).fill(0)).map(v => Number(v) || 0);
      const finProg = Array.from({ length: 12 }, (_, i) => financieroMesActividad(a, 'pim', i));
      const fisEjec = Array(12).fill(0), finEjec = Array(12).fill(0);
      progress.filter(p => p.actividadId === a.id && p.anio === year).forEach(p => {
        const i = p.mes - 1;
        if (i >= 0 && i < 12) {
          fisEjec[i] += Number(p.avanceFisico) || 0;
          finEjec[i] += Number(p.avanceFinanciero) || 0;
        }
      });
      return { a, fisProg, finProg, fisEjec, finEjec };
    }

    // Suma acumulada hasta el mes seleccionado (inclusive)
    const acum = (arr) => arr.slice(0, mes).reduce((s, v) => s + v, 0);

    let bloques = '';
    ccList.forEach((ccNombre, idxCC) => {
      const ccObj = CENTROS_COSTO.find(c => c.nombre === ccNombre);
      const actsCC = actsVisiblesSeg().filter(a => a.centroCosto === ccNombre && a.activo !== false)
        .map(datosActividad)
        .sort((x, y) => ((x.a.oei || '') + (x.a.aei || '')).localeCompare((y.a.oei || '') + (y.a.aei || '')) || (x.a.codigoAOI || '').localeCompare(y.a.codigoAOI || ''));

      // Totales del CC
      let totFinProgAnual = 0, totFinEjecAcum = 0, totFisProgAnual = 0, totFisEjecAcum = 0;

      let cuerpo = '';
      let curOEI = null, curAEI = null;
      actsCC.forEach(({ a, fisProg, finProg, fisEjec, finEjec }) => {
        const oei = a.oei || inferirOeiAei(a.centroCosto).oei;
        const aei = a.aei || inferirOeiAei(a.centroCosto).aei;
        if (oei !== curOEI) {
          curOEI = oei; curAEI = null;
          cuerpo += `<tr class="oei"><td class="lbl" colspan="2">OEI</td><td colspan="${13 + 2}"><strong>${oei}</strong> — ${oeiNombre(oei)}</td></tr>`;
        }
        if (aei !== curAEI) {
          curAEI = aei;
          cuerpo += `<tr class="aei"><td class="lbl" colspan="2">AEI</td><td colspan="${13 + 2}"><strong>${aei}</strong> — ${aeiNombre(aei)}</td></tr>`;
        }

        const finProgAnual = finProg.reduce((s, v) => s + v, 0);
        const fisProgAnual = fisProg.reduce((s, v) => s + v, 0);
        const finEjecAcum = acum(finEjec);
        const fisEjecAcum = acum(fisEjec);
        totFinProgAnual += finProgAnual; totFinEjecAcum += finEjecAcum;
        totFisProgAnual += fisProgAnual; totFisEjecAcum += fisEjecAcum;

        // Encabezado de la actividad
        cuerpo += `<tr class="act"><td class="reg">${a.codigoRegistro || ''}</td><td class="reg">${a.codigoAOI || ''}</td><td class="nom" colspan="${13}">${a.nombre || ''}</td><td class="um">${a.unidadMedida || ''}</td><td class="um"></td></tr>`;

        // Fila FÍSICO Programado / Ejecutado
        const celdasFisProg = fisProg.map(v => `<td class="n">${fmt0(v)}</td>`).join('');
        const celdasFisEjec = fisEjec.map((v, i) => `<td class="n ${i < mes ? 'on' : 'off'}">${fmt0(v)}</td>`).join('');
        cuerpo += `<tr class="fis prog"><td class="rot" colspan="2">FÍSICO · Programado</td>${celdasFisProg}<td class="ac">${fmt0(fisProgAnual)}</td><td class="ac">100%</td></tr>`;
        cuerpo += `<tr class="fis ejec"><td class="rot" colspan="2">FÍSICO · Ejecutado</td>${celdasFisEjec}<td class="ac">${fmt0(fisEjecAcum)}</td><td class="ac">${pct(fisEjecAcum, acum(fisProg))}</td></tr>`;

        // Fila FINANCIERO Programado / Ejecutado
        const celdasFinProg = finProg.map(v => `<td class="n">${fmt2(v)}</td>`).join('');
        const celdasFinEjec = finEjec.map((v, i) => `<td class="n ${i < mes ? 'on' : 'off'}">${fmt2(v)}</td>`).join('');
        cuerpo += `<tr class="fin prog"><td class="rot" colspan="2">FINANCIERO · Programado</td>${celdasFinProg}<td class="ac">${fmt2(finProgAnual)}</td><td class="ac">100%</td></tr>`;
        cuerpo += `<tr class="fin ejec"><td class="rot" colspan="2">FINANCIERO · Ejecutado</td>${celdasFinEjec}<td class="ac">${fmt2(finEjecAcum)}</td><td class="ac">${pct(finEjecAcum, acum(finProg))}</td></tr>`;
      });

      const thMeses = mesAbr.map((m, i) => `<th class="${i < mes ? 'mon on' : 'mon'}">${m}</th>`).join('');

      bloques += `
      <div class="bloque" style="${idxCC > 0 ? 'page-break-before:always;' : ''}">
        <div class="head">
          REPORTE DE SEGUIMIENTO DEL PLAN OPERATIVO INSTITUCIONAL (POI) ${year}
          <br><span>Acumulado a ${MESES[mes - 1]} de ${year}</span>
        </div>
        <div class="pei">PROGRAMA NUESTRAS CIUDADES &nbsp;·&nbsp; Centro de Costo: ${ccObj?.codigo || ''} - ${ccNombre}</div>
        <table>
          <thead>
            <tr>
              <th colspan="2" rowspan="2" class="lblh">Registro POI / Act. Operativa</th>
              ${mesAbr.map((m, i) => `<th class="${i < mes ? 'mon on' : 'mon'}">${m}</th>`).join('')}
              <th rowspan="2" class="ach">Acum.</th>
              <th rowspan="2" class="ach">% Acum.</th>
            </tr>
            <tr>${mesAbr.map((m, i) => `<th class="${i < mes ? 'mon on' : 'mon'}" style="font-weight:normal;font-size:7px">${i < mes ? '✓' : ''}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${cuerpo || `<tr><td colspan="${17}" style="text-align:center;color:#888">Sin actividades para este Centro de Costo</td></tr>`}
            <tr class="tot">
              <td colspan="2">TOTAL ${ccNombre}</td>
              <td colspan="${12}" class="totlbl">Financiero PIM: ${fmt2(totFinProgAnual)} · Devengado: ${fmt2(totFinEjecAcum)}</td>
              <td class="ac">${fmt2(totFinEjecAcum)}</td>
              <td class="ac">${pct(totFinEjecAcum, totFinProgAnual)}</td>
            </tr>
            <tr class="tot">
              <td colspan="2">META FÍSICA</td>
              <td colspan="${12}" class="totlbl">Física PIM: ${fmt0(totFisProgAnual)} · Ejecutado: ${fmt0(totFisEjecAcum)}</td>
              <td class="ac">${fmt0(totFisEjecAcum)}</td>
              <td class="ac">${pct(totFisEjecAcum, totFisProgAnual)}</td>
            </tr>
          </tbody>
        </table>
        <div class="firma"><div class="linea"></div>RESPONSABLE DEL CENTRO DE COSTO<br><span>${ccNombre}</span></div>
      </div>`;
    });

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
    <title>Reporte Seguimiento POI ${year} - ${MESES[mes - 1]}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #1E2A3A; margin: 14px; }
      .head { background: #F4D03F; color: #1E2A3A; font-weight: bold; text-align: center; padding: 9px; font-size: 12px; border: 1px solid #C9A350; }
      .head span { font-weight: normal; font-size: 10px; }
      .pei { font-size: 10px; background: #FAF7F0; border: 1px solid #E5DDD0; border-top: none; padding: 7px 9px; }
      table { width: 100%; border-collapse: collapse; margin-top: 7px; font-size: 7.5px; table-layout: fixed; }
      th, td { border: 1px solid #B8AE99; padding: 2px 3px; overflow: hidden; }
      th { background: #1E2A3A; color: #fff; text-align: center; font-size: 7px; }
      th.lblh { width: 90px; text-align: left; }
      th.mon { width: auto; }
      th.mon.on { background: #2D7A4E; }
      th.ach { width: 42px; background: #9C7A2B; }
      td.n { text-align: right; }
      td.n.off { color: #B8AE99; }
      td.n.on { color: #1E2A3A; }
      td.ac { text-align: right; background: #FBF6E9; font-weight: bold; }
      td.reg { font-family: monospace; font-size: 7px; white-space: nowrap; }
      td.rot { font-weight: bold; font-size: 7px; background: #F4EEE0; }
      tr.fis .rot { color: #2D7A4E; }
      tr.fin .rot { color: #9C7A2B; }
      tr.act td { background: #EFE7D5; font-weight: bold; }
      tr.act .nom { white-space: normal; }
      tr.oei td { background: #1E2A3A; color: #fff; font-size: 8px; }
      tr.aei td { background: #6E6450; color: #fff; font-size: 7.5px; }
      tr.oei .lbl, tr.aei .lbl { text-align: center; background: rgba(0,0,0,0.15); }
      tr.tot td { background: #F0E9D9; font-weight: bold; font-size: 8px; }
      tr.tot .totlbl { text-align: left; font-weight: normal; }
      .firma { margin-top: 36px; text-align: center; font-size: 10px; }
      .firma .linea { width: 220px; border-top: 1px solid #1E2A3A; margin: 0 auto 4px; }
      .firma span { color: #7A6F5C; }
      .leyenda { font-size: 8px; color: #7A6F5C; margin-top: 6px; }
      @media print { body { margin: 0; } .noprint { display: none; } @page { size: A4 landscape; margin: 8mm; } }
    </style></head><body>
    <div class="noprint" style="text-align:right;margin-bottom:10px;">
      <button onclick="window.print()" style="background:#1E2A3A;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:13px;">Imprimir / Guardar PDF</button>
    </div>
    ${bloques}
    <div class="leyenda">El "Acumulado" y el "% Acum." se calculan de enero hasta ${MESES[mes - 1]} de ${year}, tanto para la meta física como para la ejecución financiera (devengado). Los meses marcados en verde corresponden al periodo ejecutado.</div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    if (logAuditoria) logAuditoria('exportar_seguimiento_pdf', `Generó Reporte Seguimiento POI ${year} (${MESES[mes - 1]}) en PDF`, {});
  }

  // Importa un archivo para el seguimiento, validando el tipo esperado:
  //  'ejec_fisica'     → Ejecución meta física (Excel)
  //  'ejec_financiera' → Ejecución financiera / devengado (Excel)
  //  'comentarios'     → Comentarios del informe mensual (Word .docx)
  async function importarSeguimientoExcel(file, tipoEsperado) {
    if (!file) return;
    setImportandoSeg(true); setMsgSeg(null);
    const etiquetas = {
      ejec_fisica: 'Ejecución meta física',
      ejec_financiera: 'Ejecución financiera (devengado)',
      comentarios: 'Comentarios del informe',
    };
    try {
      const nombre = (file.name || '').toLowerCase();
      const esWord = nombre.endsWith('.docx') || nombre.endsWith('.doc');
      // Comentarios desde Word
      if (tipoEsperado === 'comentarios' || (!tipoEsperado && esWord)) {
        if (!esWord) {
          setMsgSeg({ tipo: 'error', texto: 'Para los comentarios del periodo selecciona el Informe mensual POI en formato Word (.docx).' });
          setImportandoSeg(false); return;
        }
        const texto = await leerDocxTexto(file);
        const parsed = parsearComentariosInforme(texto);
        const res = importarComentariosInforme(parsed, progress, activities, year);
        await saveProgress(res.progress);
        if (logAuditoria) await logAuditoria('importar_word_seguimiento', `Importó comentarios del informe (${res.resumen})`, { anio: year });
        setMsgSeg({ tipo: 'ok', texto: `Comentarios del informe (año ${year}): ${res.resumen}.` });
        setImportandoSeg(false);
        return;
      }
      const { rows } = await leerXlsx(file);
      const { tipo } = detectarTipoExcel(rows);
      if (tipoEsperado && tipo !== tipoEsperado) {
        setMsgSeg({ tipo: 'error', texto: `El archivo no corresponde a "${etiquetas[tipoEsperado]}". Se detectó: ${etiquetas[tipo] || tipo || 'desconocido'}. Verifica que sea el Excel correcto.` });
        setImportandoSeg(false); return;
      }
      let res;
      if (tipo === 'ejec_fisica') {
        res = importarEjecFisica(rows, progress, activities, year);
      } else if (tipo === 'ejec_financiera') {
        res = importarEjecFinanciera(rows, progress, activities, year);
      } else {
        setMsgSeg({ tipo: 'error', texto: 'No se reconoció el archivo. Use el Excel de ejecución meta física o de ejecución financiera POI.' });
        setImportandoSeg(false); return;
      }
      await saveProgress(res.progress);
      if (logAuditoria) await logAuditoria('importar_excel_seguimiento', `Importó ${tipo} (${res.resumen})`, { tipo, anio: year });
      setMsgSeg({ tipo: 'ok', texto: `${etiquetas[tipo]} (año ${year}): ${res.resumen}.` });
    } catch (e) {
      setMsgSeg({ tipo: 'error', texto: 'Error al leer el archivo: ' + (e?.message || e) });
    }
    setImportandoSeg(false);
  }

  // Áreas del CC seleccionado, filtradas por las áreas permitidas al usuario
  // Solo considera actividades activas
  const areas = useMemo(() => {
    const areasUsuario = expandirAreasUsuario(currentUser);
    const set = new Set();
    activities.filter(a => a.centroCosto === ccSel && a.activo !== false).forEach(a => {
      // Si el usuario tiene áreas restringidas y es responsable_cc, solo mostrar esas
      if (esResponsableCC(currentUser) && areasUsuario && !areasUsuario.includes(a.area)) return;
      set.add(a.area);
    });
    return Array.from(set);
  }, [activities, ccSel, currentUser]);

  // Actividades del CC + Área, también filtradas por permisos
  // EXCLUYE actividades deshabilitadas (activo === false)
  const actsFiltered = useMemo(() => {
    return activities.filter(a => {
      if (a.activo === false) return false;
      if (a.centroCosto !== ccSel) return false;
      if (areaSel && a.area !== areaSel) return false;
      if (esResponsableCC(currentUser) && !puedeAccederActividad(currentUser, a)) return false;
      return true;
    });
  }, [activities, ccSel, areaSel, currentUser]);

  // Resetear área cuando cambia CC
  useEffect(() => {
    if (areas.length > 0 && !areas.includes(areaSel)) {
      setAreaSel(areas[0]);
    }
  }, [areas]);

  // Resetear actividad cuando cambia área
  useEffect(() => {
    if (actsFiltered.length > 0 && !actsFiltered.find(a => a.id === actId)) {
      setActId(actsFiltered[0].id);
    }
  }, [actsFiltered]);

  const activity = activities.find(a => a.id === actId);
  const existing = progress.find(p => p.actividadId === actId && p.anio === year && p.mes === mes);

  const [form, setForm] = useState(blank());
  function blank() {
    return { avanceFisico: 0, avanceFinanciero: 0, logros: '', limitaciones: '', medidas: '' };
  }

  useEffect(() => {
    if (existing) {
      setForm({
        avanceFisico: existing.avanceFisico,
        avanceFinanciero: existing.avanceFinanciero,
        logros: existing.logros || '',
        limitaciones: existing.limitaciones || '',
        medidas: existing.medidas || '',
      });
    } else {
      setForm(blank());
    }
  }, [actId, year, mes, progress.length]);



  async function handleSave() {
    if (!activity) return;
    if (bloqueado) {
      alert('El periodo está cerrado. Solicita la apertura al administrador.');
      return;
    }
    const entry = {
      id: existing?.id || uid(),
      actividadId: actId,
      anio: Number(year),
      mes: Number(mes),
      avanceFisico: Number(form.avanceFisico) || 0,
      avanceFinanciero: Number(form.avanceFinanciero) || 0,
      logros: form.logros,
      limitaciones: form.limitaciones,
      medidas: form.medidas,
      fechaRegistro: new Date().toISOString(),
    };
    const next = existing ? progress.map(p => p.id === existing.id ? entry : p) : [...progress, entry];
    await saveProgress(next);
    if (logAuditoria) {
      await logAuditoria(
        existing ? 'actualizar_seguimiento' : 'registrar_seguimiento',
        `${existing ? 'Actualizó' : 'Registró'} avance ${MESES[mes-1]} ${year} para ${activity.codigoAOI} (Físico: ${entry.avanceFisico}, Financiero: S/${entry.avanceFinanciero.toFixed(2)})`,
        { actividadId: actId, anio: year, mes }
      );
    }
    alert('Avance registrado correctamente');
  }

  async function handleEnviarSolicitud(datos) {
    const nuevaSol = {
      id: uid(),
      tipo: datos.tipo,
      anio: year,
      mes: mes,
      centroCosto: ccSel,
      area: areaSel,
      actividadId: actId,
      codigoAOI: activity?.codigoAOI || '',
      solicitante: datos.solicitante,
      cargo: datos.cargo,
      motivo: datos.motivo,
      diasSolicitados: datos.diasSolicitados,
      fechaSolicitud: new Date().toISOString(),
      estado: 'pendiente',
      fechaRespuesta: null,
      respuestaAdmin: '',
    };
    const next = [...solicitudes, nuevaSol];
    await saveSolicitudes(next);

    if (logAuditoria) {
      await logAuditoria('enviar_solicitud',
        `Solicitó ${datos.tipo === 'reapertura' ? 'reapertura' : datos.tipo === 'ampliacion' ? 'ampliación de plazo' : 'apertura anticipada'} para ${MESES[mes-1]} ${year}`,
        { solicitudId: nuevaSol.id, centroCosto: ccSel });
    }
    if (notificar) {
      const dest = adminUsernames(usuarios);
      await notificar({
        destinatarios: dest,
        tipo: 'solicitud_recibida',
        titulo: `Nueva solicitud — ${ccSel}`,
        mensaje: `${datos.solicitante} solicita ${datos.tipo === 'reapertura' ? 'reapertura' : datos.tipo === 'ampliacion' ? 'ampliación de plazo' : 'apertura anticipada'} para ${MESES[mes-1]} ${year}.`,
        link: 'solicitudes',
      });
    }

    setShowSolicitudModal(false);
    alert('Solicitud enviada. El administrador la revisará y notificará la respuesta.');
  }

  const planFis = activity?.programacion?.[mes - 1]?.fisica || 0;
  const planFin = activity?.programacion?.[mes - 1]?.financiera || 0;

  return (
    <>
      <PageHeader title="Seguimiento mensual"
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={exportarSeguimientoExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ background: '#1F7A4D', color: '#FFFFFF' }}
              title="Exportar Reporte de Seguimiento POI a Excel (CSV)">
              <FileSpreadsheet size={16} /> Exportar Excel
            </button>
            <button onClick={exportarSeguimientoPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ background: '#B33B3B', color: '#FFFFFF' }}
              title="Exportar Reporte de Seguimiento POI (PDF) según el modelo oficial, agrupado por OEI/AEI con acumulado físico y financiero">
              <Printer size={16} /> Exportar reporte seguimiento (PDF)
            </button>
            {esAdminUser && !soloLectura && (
              <label
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: '#2D7A4E', color: '#FFFFFF', opacity: importandoSeg ? 0.6 : 1 }}
                title="Importar ejecución de meta física desde Excel">
                <Download size={16} /> Importar ejecución física
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={importandoSeg}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; importarSeguimientoExcel(f, 'ejec_fisica'); }} />
              </label>
            )}
            {esAdminUser && !soloLectura && (
              <label
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: '#9C7A2B', color: '#FFFFFF', opacity: importandoSeg ? 0.6 : 1 }}
                title="Importar ejecución financiera (devengado) desde Excel">
                <Download size={16} /> Importar ejecución financiera
                <input type="file" accept=".xlsx,.xls" className="hidden" disabled={importandoSeg}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; importarSeguimientoExcel(f, 'ejec_financiera'); }} />
              </label>
            )}
            {esAdminUser && !soloLectura && (
              <label
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: '#1E2A3A', color: '#F5F1E8', opacity: importandoSeg ? 0.6 : 1 }}
                title="Importar comentarios del periodo desde el Informe mensual POI (Word)">
                <Download size={16} /> Importar comentarios (Word)
                <input type="file" accept=".docx,.doc" className="hidden" disabled={importandoSeg}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; importarSeguimientoExcel(f, 'comentarios'); }} />
              </label>
            )}
          </div>
        } />

      {msgSeg && (
        <div className="mb-4 px-4 py-3 rounded-md text-sm flex items-start justify-between gap-3"
          style={{
            background: msgSeg.tipo === 'ok' ? '#E8F2EC' : '#F8E8E8',
            color: msgSeg.tipo === 'ok' ? '#1F7A4D' : '#B33B3B',
            border: `1px solid ${msgSeg.tipo === 'ok' ? '#B7DCC4' : '#E8C0C0'}`,
          }}>
          <div>{msgSeg.tipo === 'ok' ? '✓ ' : '⚠ '}{msgSeg.texto}</div>
          <button onClick={() => setMsgSeg(null)} className="opacity-60 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      {/* Centro de costo */}
      <Card className="p-5 mb-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
          Centro de costo
        </div>
        <div className="flex gap-2 flex-wrap">
          {CENTROS_COSTO.filter(c => ccDisponibles.includes(c.nombre)).map(cc => {
            const count = activities.filter(a => a.centroCosto === cc.nombre).length;
            return (
              <button key={cc.codigo} onClick={() => { setCcSel(cc.nombre); setAreaSel(''); }}
                className="px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: ccSel === cc.nombre ? '#1E2A3A' : '#F0E9D9',
                  color: ccSel === cc.nombre ? '#F5F1E8' : '#1E2A3A',
                }}>
                {cc.nombre} <span className="opacity-70 text-xs">({count})</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Área */}
      <Card className="p-5 mb-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
          Área
        </div>
        <div className="flex gap-2 flex-wrap">
          {areas.length === 0 && <div className="text-sm" style={{ color: '#7A6F5C' }}>No hay áreas en este centro de costo.</div>}
          {areas.map(area => {
            const count = activities.filter(a => a.centroCosto === ccSel && a.area === area).length;
            return (
              <button key={area} onClick={() => setAreaSel(area)}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: areaSel === area ? '#C9A350' : '#FAF7F0',
                  color: areaSel === area ? '#1E2A3A' : '#1E2A3A',
                  border: '1px solid #E5DDD0',
                }}>
                {area} <span className="opacity-60 text-xs">({count})</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Actividad operativa */}
      <Card className="p-5 mb-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
          Actividad operativa
        </div>
        <div className="space-y-2">
          {actsFiltered.map(a => {
            const isSelected = actId === a.id;
            return (
              <button key={a.id} onClick={() => setActId(a.id)}
                className="w-full text-left px-4 py-3 rounded-md border transition-colors"
                style={{
                  background: isSelected ? '#1E2A3A' : '#FFFFFF',
                  borderColor: isSelected ? '#1E2A3A' : '#E5DDD0',
                  color: isSelected ? '#F5F1E8' : '#1E2A3A',
                }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-mono mb-1" style={{ color: isSelected ? '#C9A350' : '#9C7A2B' }}>{a.codigoAOI}</div>
                    <div className="text-sm font-medium">{a.nombre}</div>
                  </div>
                  <div className="text-xs whitespace-nowrap" style={{ color: isSelected ? '#D5C9B0' : '#7A6F5C' }}>
                    {a.unidadMedida}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Periodo */}
      <Card className="p-5 mb-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
          Periodo
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Año">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls}>
              {ANIOS_DISPONIBLES.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Mes">
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inputCls}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </Field>
        </div>

        {activity && (
          <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: '#E5DDD0' }}>
            <div className="px-4 py-3 rounded-md" style={{ background: '#F0E9D9' }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>Programado físico — {MESES[mes-1]}</div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
                {planFis} {activity.unidadMedida}
              </div>
            </div>
            <div className="px-4 py-3 rounded-md" style={{ background: '#F0E9D9' }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>Programado financiero</div>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
                {fmtMoney(planFin)}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Avance */}
      <Card className="p-5 mb-4">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
          Avance ejecutado
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Avance físico (${activity?.unidadMedida || ''})`}>
            <input type="number" value={form.avanceFisico} onChange={(e) => setForm({ ...form, avanceFisico: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Avance financiero (S/)">
            <input type="number" step="0.01" value={form.avanceFinanciero} onChange={(e) => setForm({ ...form, avanceFinanciero: e.target.value })} className={inputCls} />
          </Field>
        </div>
      </Card>

      {/* Comentarios */}
      <Card className="p-5 mb-6">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
          Comentarios del periodo
        </div>
        <div className="space-y-4">
          <Field label="Principales logros" full>
            <textarea rows={3} value={form.logros} onChange={(e) => setForm({ ...form, logros: e.target.value })} className={inputCls} placeholder="Describe los principales logros del mes..." />
          </Field>
          <Field label="Limitaciones encontradas" full>
            <textarea rows={3} value={form.limitaciones} onChange={(e) => setForm({ ...form, limitaciones: e.target.value })} className={inputCls} placeholder="Identifica limitaciones, dificultades, riesgos..." />
          </Field>
          <Field label="Medidas adoptadas para cumplir las metas" full>
            <textarea rows={3} value={form.medidas} onChange={(e) => setForm({ ...form, medidas: e.target.value })} className={inputCls} placeholder="Acciones correctivas, gestiones, coordinaciones..." />
          </Field>
        </div>
      </Card>

      {/* Banner de estado del periodo */}
      <PeriodoBanner info={periodoInfo} year={year} mes={mes}
        onSolicitar={() => setShowSolicitudModal(true)} />

      <div className="flex justify-end mb-12">
        {!soloLectura && (
          <button onClick={handleSave}
            disabled={bloqueado}
            className="flex items-center gap-2 px-6 py-3 rounded-md text-sm font-semibold transition-opacity"
            style={{
              background: bloqueado ? '#9C9080' : '#1E2A3A',
              color: '#F5F1E8',
              cursor: bloqueado ? 'not-allowed' : 'pointer',
              opacity: bloqueado ? 0.6 : 1,
            }}>
            {bloqueado ? <Lock size={16} /> : <Save size={16} />}
            {bloqueado ? 'Periodo cerrado' : (existing ? 'Actualizar registro' : 'Guardar registro')}
          </button>
        )}
      </div>

      {showSolicitudModal && (
        <SolicitudModal
          year={year}
          mes={mes}
          ccSel={ccSel}
          areaSel={areaSel}
          activity={activity}
          periodoInfo={periodoInfo}
          currentUser={currentUser}
          onSubmit={handleEnviarSolicitud}
          onClose={() => setShowSolicitudModal(false)}
        />
      )}
    </>
  );
}

function PeriodoBanner({ info, year, mes, onSolicitar }) {
  if (info.estado === 'abierto' || info.estado === 'sin_config') {
    return (
      <Card className="p-4 mb-4" >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#D8EBD3' }}>
            <Unlock size={16} style={{ color: '#2D7A4E' }} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: '#2D7A4E' }}>
              Periodo abierto — {MESES[mes-1]} {year}
            </div>
            <div className="text-xs" style={{ color: '#7A6F5C' }}>{info.motivo}</div>
          </div>
        </div>
      </Card>
    );
  }
  const titulo = info.estado === 'cerrado' ? 'Periodo cerrado' : 'Periodo aún no aperturado';
  const bg = info.estado === 'cerrado' ? '#F5D5D5' : '#FBF1D9';
  const color = info.estado === 'cerrado' ? '#B33B3B' : '#9C7A2B';
  return (
    <Card className="p-4 mb-4" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: bg }}>
          <Lock size={16} style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color }}>
            {titulo} — {MESES[mes-1]} {year}
          </div>
          <div className="text-xs" style={{ color: '#7A6F5C' }}>{info.motivo}. Los registros no pueden modificarse.</div>
        </div>
        <button onClick={onSolicitar}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors"
          style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
          <Send size={14} /> Solicitar apertura
        </button>
      </div>
    </Card>
  );
}

function SolicitudModal({ year, mes, ccSel, areaSel, activity, periodoInfo, currentUser, onSubmit, onClose }) {
  const [tipo, setTipo] = useState(periodoInfo.estado === 'cerrado' ? 'reapertura' : 'apertura_anticipada');
  const [solicitante, setSolicitante] = useState(currentUser?.nombre || '');
  const [cargo, setCargo] = useState(currentUser?.centroCosto ? `Responsable ${currentUser.centroCosto}` : '');
  const [motivo, setMotivo] = useState('');
  const [diasSolicitados, setDiasSolicitados] = useState(5);

  function send() {
    if (!solicitante || !motivo) {
      alert('El nombre del solicitante y el motivo son obligatorios');
      return;
    }
    onSubmit({ tipo, solicitante, cargo, motivo, diasSolicitados });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
      <div className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#FAF7F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5DDD0' }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
              Solicitud al administrador
            </div>
            <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
              {ccSel} · {areaSel || '—'} · {activity?.codigoAOI || '—'} · {MESES[mes-1]} {year}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Tipo de solicitud">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
              <option value="reapertura">Reapertura del periodo (registro inicial o modificación)</option>
              <option value="ampliacion">Ampliación de plazo de registro</option>
              <option value="apertura_anticipada">Apertura anticipada</option>
            </select>
          </Field>
          {(tipo === 'ampliacion' || tipo === 'reapertura') && (
            <Field label="Días adicionales solicitados">
              <input type="number" min="1" max="60" value={diasSolicitados}
                onChange={(e) => setDiasSolicitados(Number(e.target.value) || 1)} className={inputCls} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre del solicitante">
              <input type="text" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} className={inputCls} placeholder="Ej. Juan Pérez" />
            </Field>
            <Field label="Cargo / Área">
              <input type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} className={inputCls} placeholder="Ej. Coordinador UGERDES" />
            </Field>
          </div>
          <Field label="Motivo / justificación" full>
            <textarea rows={5} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}
              placeholder="Explica las razones por las que se requiere la apertura o ampliación del plazo..." />
          </Field>
          <div className="p-3 rounded-md text-xs" style={{ background: '#F0E9D9', color: '#7A6F5C' }}>
            Esta solicitud será enviada al administrador del sistema. Recibirás respuesta en el módulo de seguimiento una vez sea revisada.
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: '#E5DDD0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm" style={{ color: '#1E2A3A' }}>Cancelar</button>
          <button onClick={send}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
            style={{ background: '#C9A350', color: '#1E2A3A' }}>
            <Send size={14} /> Enviar solicitud
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MODIFICACIONES PRESUPUESTALES
============================================================ */
function Modificaciones({ activities, modifs, saveModifs, currentUser }) {
  const ccDisponibles = ccsVisibles(currentUser);
  // Solo el administrador puede registrar, editar o eliminar modificaciones presupuestales.
  // Los responsables de centro de costo y los lectores tienen solo lectura.
  const canEdit = esAdmin(currentUser);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filtroCC, setFiltroCC] = useState(esResponsableCC(currentUser) ? currentUser.centroCosto : 'TODOS');
  const [filtroMes, setFiltroMes] = useState('TODOS');

  const areasUser = expandirAreasUsuario(currentUser);
  const visibleModifs = esResponsableCC(currentUser)
    ? modifs.filter(m => {
        if (m.centroCosto !== currentUser.centroCosto) return false;
        if (!areasUser) return true;
        // Filtrar por área si la modificación está asociada a un AOI
        if (m.codigoAOI) {
          const act = activities.find(a => a.codigoAOI === m.codigoAOI);
          if (act) return areasUser.includes(act.area);
        }
        return true;
      })
    : modifs;

  // Aplicar filtros del usuario
  const filteredModifs = useMemo(() => {
    let r = visibleModifs;
    if (filtroCC !== 'TODOS') r = r.filter(m => m.centroCosto === filtroCC);
    if (filtroMes !== 'TODOS') r = r.filter(m => Number(m.mes) === Number(filtroMes));
    return r.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [visibleModifs, filtroCC, filtroMes]);

  // Reset mes si cambia CC y no hay datos
  useEffect(() => {
    setFiltroMes('TODOS');
  }, [filtroCC]);

  const TIPOS = [
    'Tipo I - Créditos Suplementarios',
    'Tipo II - Reducción Presupuestal',
    'Tipo III - Créditos y Anulaciones',
    'Tipo IV - Habilitaciones entre UE',
    'Tipo V - Modif. funcional programático',
  ];

  function newModif() {
    setEditing({
      id: uid(),
      fecha: new Date().toISOString().slice(0, 10),
      anio: 2026,
      mes: new Date().getMonth() + 1,
      centroCosto: esResponsableCC(currentUser) ? currentUser.centroCosto : (filtroCC !== 'TODOS' ? filtroCC : CENTROS_COSTO[0].nombre),
      area: 'TODAS',
      codigoAOI: '',
      tipo: TIPOS[2],
      // Nuevo: clasificadores como arreglo con importe individual
      clasificadores: [{ id: uid(), clasificador: '', importe: 0 }],
      // Mantener compatibilidad con datos antiguos: clasificador único e importe agregado
      clasificador: '',
      importe: 0,
      concepto: '',
    });
    setShowForm(true);
  }

  function editModif(m) {
    const copia = JSON.parse(JSON.stringify(m));
    // Migración de datos antiguos: si no hay clasificadores[], crear uno desde clasificador+importe
    if (!Array.isArray(copia.clasificadores) || copia.clasificadores.length === 0) {
      copia.clasificadores = [{
        id: uid(),
        clasificador: copia.clasificador || '',
        importe: Number(copia.importe) || 0,
      }];
    }
    setEditing(copia);
    setShowForm(true);
  }

  async function handleSave() {
    if (!editing.centroCosto) {
      alert('Centro de costo es obligatorio');
      return;
    }
    // Validar clasificadores
    const clasifs = (editing.clasificadores || []).filter(c => c.clasificador && c.clasificador.trim() && Number(c.importe) > 0);
    if (clasifs.length === 0) {
      alert('Debes registrar al menos un clasificador con importe mayor a 0');
      return;
    }
    // Calcular importe total a partir de los clasificadores
    const totalImporte = clasifs.reduce((s, c) => s + (Number(c.importe) || 0), 0);
    const clasifText = clasifs.map(c => `${c.clasificador} (S/ ${Number(c.importe).toFixed(2)})`).join(' | ');

    const final = {
      ...editing,
      clasificadores: clasifs,
      importe: totalImporte,
      clasificador: clasifText, // Para compatibilidad/visualización
    };
    // Eliminar el campo documento si quedó
    delete final.documento;

    const exists = modifs.find(x => x.id === final.id);
    const next = exists ? modifs.map(x => x.id === final.id ? final : x) : [...modifs, final];
    await saveModifs(next);
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta modificación?')) return;
    await saveModifs(modifs.filter(x => x.id !== id));
  }

  const porCC = CENTROS_COSTO.filter(c => ccDisponibles.includes(c.nombre)).map(cc => {
    const items = modifs.filter(m => m.centroCosto === cc.nombre);
    const total = items.reduce((s, m) => s + (Number(m.importe) || 0), 0);
    // PIA/PIM reales desde las actividades del CC (no desde el valor estático)
    const actsCC = activities.filter(a => a.centroCosto === cc.nombre);
    const piaCC = actsCC.reduce((s, a0) => { const a = a0.genericas ? a0 : migrarActividadGenericas(a0); return s + totalFinancieroActividad(a, 'pia'); }, 0);
    const pimCC = actsCC.reduce((s, a0) => { const a = a0.genericas ? a0 : migrarActividadGenericas(a0); return s + totalFinancieroActividad(a, 'pim'); }, 0);
    return { ...cc, count: items.length, total, pia: piaCC, pim: pimCC };
  });

  return (
    <>
      <PageHeader title="Modificaciones presupuestales" subtitle="Por centro de costo"
        action={canEdit && (
          <button onClick={newModif}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
            style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
            <Plus size={16} /> Nueva modificación
          </button>
        )} />

      <div className={`grid gap-4 mb-6 ${porCC.length === 1 ? 'grid-cols-1' : 'grid-cols-4'}`}>
        {porCC.map(cc => (
          <Card key={cc.codigo} className="p-4">
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>{cc.nombre}</div>
            <div className="text-xs mb-2" style={{ color: '#9C7A2B' }}>{cc.count} modificaciones</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: '#1E2A3A' }}>
              {fmtMoneyShort(cc.total)}
            </div>
            <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>PIM: {fmtMoneyShort(cc.pim)}</div>
          </Card>
        ))}
      </div>

      {/* Filtros: CC + Mes */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={16} style={{ color: '#7A6F5C' }} />
          <span className="text-xs uppercase tracking-wider font-medium" style={{ color: '#7A6F5C' }}>Centro de costo:</span>
          {!esResponsableCC(currentUser) && (
            <button onClick={() => setFiltroCC('TODOS')}
              className="text-xs px-3 py-1 rounded-md font-medium"
              style={{
                background: filtroCC === 'TODOS' ? '#1E2A3A' : '#F0E9D9',
                color: filtroCC === 'TODOS' ? '#F5F1E8' : '#1E2A3A',
              }}>Todos ({visibleModifs.length})</button>
          )}
          {CENTROS_COSTO.filter(c => ccDisponibles.includes(c.nombre)).map(cc => {
            const count = visibleModifs.filter(m => m.centroCosto === cc.nombre).length;
            return (
              <button key={cc.codigo} onClick={() => setFiltroCC(cc.nombre)}
                className="text-xs px-3 py-1 rounded-md font-medium"
                style={{
                  background: filtroCC === cc.nombre ? '#1E2A3A' : '#F0E9D9',
                  color: filtroCC === cc.nombre ? '#F5F1E8' : '#1E2A3A',
                }}>
                {cc.nombre} ({count})
              </button>
            );
          })}
        </div>

        {/* Selector de mes: solo aparece cuando hay un CC específico */}
        {filtroCC !== 'TODOS' && (
          <div className="flex items-center gap-3 flex-wrap mt-3 pt-3" style={{ borderTop: '1px dashed #E5DDD0' }}>
            <span className="text-xs uppercase tracking-wider font-medium" style={{ color: '#7A6F5C' }}>Mes:</span>
            <button onClick={() => setFiltroMes('TODOS')}
              className="text-xs px-3 py-1 rounded-md font-medium"
              style={{
                background: filtroMes === 'TODOS' ? '#C9A350' : '#F0E9D9',
                color: '#1E2A3A',
              }}>
              Todos ({visibleModifs.filter(m => m.centroCosto === filtroCC).length})
            </button>
            {MESES.map((nom, i) => {
              const mesNum = i + 1;
              const count = visibleModifs.filter(m => m.centroCosto === filtroCC && Number(m.mes) === mesNum).length;
              if (count === 0) return null;
              return (
                <button key={mesNum} onClick={() => setFiltroMes(mesNum)}
                  className="text-xs px-3 py-1 rounded-md font-medium"
                  style={{
                    background: filtroMes === mesNum ? '#C9A350' : '#F0E9D9',
                    color: '#1E2A3A',
                  }}>
                  {nom} ({count})
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Fecha</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>CC</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>AOI</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Tipo</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Clasificadores</th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Importe</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredModifs.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-sm" style={{ color: '#7A6F5C' }}>
                  Sin modificaciones registradas{filtroCC !== 'TODOS' ? ` en ${filtroCC}${filtroMes !== 'TODOS' ? ' para ' + MESES[filtroMes - 1] : ''}` : ''}.
                </td></tr>
              )}
              {filteredModifs.map((m) => {
                const clasifs = Array.isArray(m.clasificadores) && m.clasificadores.length > 0
                  ? m.clasificadores
                  : (m.clasificador ? [{ clasificador: m.clasificador, importe: m.importe }] : []);
                return (
                <tr key={m.id} className="border-b last:border-b-0 hover:bg-stone-50" style={{ borderColor: '#E5DDD0' }}>
                  <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>{m.fecha}</td>
                  <td className="px-4 py-3"><Pill>{m.centroCosto}</Pill></td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1E2A3A' }}>{m.codigoAOI}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>{m.tipo}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#7A6F5C', maxWidth: 280 }}>
                    {clasifs.length === 1 ? (
                      <div className="truncate" title={clasifs[0].clasificador}>{clasifs[0].clasificador}</div>
                    ) : (
                      <div>
                        <div className="font-semibold mb-1" style={{ color: '#9C7A2B' }}>{clasifs.length} clasificadores:</div>
                        {clasifs.map((c, idx) => (
                          <div key={idx} className="truncate text-[11px]" title={c.clasificador}>
                            • {c.clasificador}: <strong>{fmtMoneyShort(c.importe)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: '#1E2A3A' }}>{fmtMoney(m.importe)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {canEdit && puedeEditarCC(currentUser, m.centroCosto) ? (
                      <>
                        <button onClick={() => editModif(m)} className="p-1.5 rounded hover:bg-stone-200 mr-1" title="Editar">
                          <Edit3 size={14} style={{ color: '#1E2A3A' }} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-red-50" title="Eliminar">
                          <Trash2 size={14} style={{ color: '#B33B3B' }} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: '#9C9080' }}>—</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && editing && (
        <ModifForm modif={editing} setModif={setEditing} activities={activities} tipos={TIPOS}
          onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </>
  );
}

function ModifForm({ modif, setModif, activities, tipos, onSave, onClose }) {
  function update(f, v) { setModif({ ...modif, [f]: v }); }

  // Áreas disponibles en el CC seleccionado (basadas en las actividades)
  const areasDisponibles = useMemo(() => {
    const predefinidas = (typeof AREAS_POR_CC !== 'undefined' && AREAS_POR_CC[modif.centroCosto]) || [];
    const enUso = Array.from(new Set(
      activities.filter(a => a.centroCosto === modif.centroCosto && a.area).map(a => a.area)
    ));
    return Array.from(new Set([...predefinidas, ...enUso])).sort();
  }, [modif.centroCosto, activities]);

  // AOIs filtrados por CC y Área (si hay área seleccionada)
  const ccActs = useMemo(() => {
    let r = activities.filter(a => a.centroCosto === modif.centroCosto);
    if (modif.area && modif.area !== 'TODAS') {
      r = r.filter(a => a.area === modif.area);
    }
    return r;
  }, [activities, modif.centroCosto, modif.area]);

  // Si cambia el CC, resetear área a TODAS y limpiar AOI
  function cambiarCC(nuevoCC) {
    setModif({ ...modif, centroCosto: nuevoCC, area: 'TODAS', codigoAOI: '' });
  }

  // Si cambia el área, limpiar AOI si ya no aplica
  function cambiarArea(nuevaArea) {
    const aoisFiltrados = activities.filter(a => a.centroCosto === modif.centroCosto && (nuevaArea === 'TODAS' || a.area === nuevaArea));
    const aoiSigueValido = aoisFiltrados.some(a => a.codigoAOI === modif.codigoAOI);
    setModif({ ...modif, area: nuevaArea, codigoAOI: aoiSigueValido ? modif.codigoAOI : '' });
  }

  // Asegurar que siempre exista el array de clasificadores
  const clasificadores = Array.isArray(modif.clasificadores) && modif.clasificadores.length > 0
    ? modif.clasificadores
    : [{ id: uid(), clasificador: '', importe: 0 }];

  function actualizarClasif(idx, field, value) {
    const next = [...clasificadores];
    next[idx] = { ...next[idx], [field]: field === 'importe' ? (Number(value) || 0) : value };
    setModif({ ...modif, clasificadores: next });
  }

  function agregarClasif() {
    const next = [...clasificadores, { id: uid(), clasificador: '', importe: 0 }];
    setModif({ ...modif, clasificadores: next });
  }

  function eliminarClasif(idx) {
    if (clasificadores.length === 1) {
      alert('Debe haber al menos un clasificador. Si no aplica, deja el campo vacío.');
      return;
    }
    const next = clasificadores.filter((_, i) => i !== idx);
    setModif({ ...modif, clasificadores: next });
  }

  const totalImporte = clasificadores.reduce((s, c) => s + (Number(c.importe) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
      <div className="rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#FAF7F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ background: '#FAF7F0', borderColor: '#E5DDD0' }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
            Modificación presupuestal
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="Fecha">
            <input type="date" value={modif.fecha} onChange={(e) => update('fecha', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Centro de Costo">
            <select value={modif.centroCosto} onChange={(e) => cambiarCC(e.target.value)} className={inputCls}>
              {CENTROS_COSTO.map(cc => <option key={cc.codigo} value={cc.nombre}>{cc.nombre}</option>)}
            </select>
          </Field>
          <Field label="Área / Unidad">
            <select value={modif.area || 'TODAS'} onChange={(e) => cambiarArea(e.target.value)} className={inputCls}>
              <option value="TODAS">— Todas las áreas —</option>
              {areasDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Mes">
            <select value={modif.mes} onChange={(e) => update('mes', Number(e.target.value))} className={inputCls}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </Field>
          <Field label="AOI afectado">
            <select value={modif.codigoAOI} onChange={(e) => update('codigoAOI', e.target.value)} className={inputCls}>
              <option value="">Seleccionar...</option>
              {ccActs.map(a => <option key={a.id} value={a.codigoAOI}>{a.codigoAOI}</option>)}
            </select>
          </Field>
          <Field label="Tipo de modificación" full>
            <select value={modif.tipo} onChange={(e) => update('tipo', e.target.value)} className={inputCls}>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        {/* Bloque de clasificadores múltiples */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A6F5C' }}>
              Clasificadores de gasto
            </label>
            <button type="button" onClick={agregarClasif}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold"
              style={{ background: '#C9A350', color: '#1E2A3A' }}>
              <Plus size={12} /> Agregar clasificador
            </button>
          </div>

          <div className="space-y-2">
            {clasificadores.map((c, idx) => (
              <div key={c.id || idx} className="flex gap-2 items-start p-2 rounded" style={{ background: '#FAF7F0', border: '1px solid #E5DDD0' }}>
                <div className="flex-1">
                  <input type="text"
                    value={c.clasificador}
                    onChange={(e) => actualizarClasif(idx, 'clasificador', e.target.value)}
                    placeholder="2.3.1.3.1.1 COMBUSTIBLES Y CARBURANTES"
                    className={inputCls} />
                </div>
                <div style={{ width: 160 }}>
                  <input type="number" step="0.01"
                    value={c.importe}
                    onChange={(e) => actualizarClasif(idx, 'importe', e.target.value)}
                    placeholder="Importe S/"
                    className={inputCls} />
                </div>
                <button type="button" onClick={() => eliminarClasif(idx)}
                  className="p-2 rounded hover:bg-red-50"
                  title="Eliminar clasificador"
                  style={{ color: '#B33B3B' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end mt-3 p-2 rounded" style={{ background: '#1E2A3A' }}>
            <span className="text-xs uppercase tracking-wider mr-3" style={{ color: '#C9A350' }}>Importe total:</span>
            <strong style={{ color: '#F5F1E8', fontSize: 16 }}>{fmtMoney(totalImporte)}</strong>
          </div>
        </div>

        <div className="px-6 pt-2 pb-6">
          <Field label="Concepto / sustento" full>
            <textarea rows={3} value={modif.concepto} onChange={(e) => update('concepto', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: '#E5DDD0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm" style={{ color: '#1E2A3A' }}>Cancelar</button>
          <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold" style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
            <Save size={14} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   REPORTE — Pantalla principal con dos pestañas
   Tab 1: Reporte Ejecutivo (resumen mensual por CC)
   Tab 2: Informe Técnico (modelo oficial PNC con introducción, base legal, etc.)
============================================================ */
function Reporte({ activities, progress, modifs, currentUser, soloLectura = false }) {
  const [tab, setTab] = useState('ejecutivo'); // 'ejecutivo' | 'tecnico'
  const soloLecturaReporte = soloLectura || currentUser?.rol === 'lector' || currentUser?.rol === 'responsable_cc';

  return (
    <>
      <PageHeader title="Reporte Ejecutivo Mensual" />

      {/* Tabs: Informe Técnico solo visible para Admin */}
      <div className="flex gap-2 mb-4 border-b" style={{ borderColor: '#E5DDD0' }}>
        <button onClick={() => setTab('ejecutivo')}
          className="px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            color: tab === 'ejecutivo' ? '#1E2A3A' : '#7A6F5C',
            borderBottom: tab === 'ejecutivo' ? '3px solid #C9A350' : '3px solid transparent',
            marginBottom: -1,
          }}>
          📋 Reporte Ejecutivo Mensual
        </button>
        {!soloLecturaReporte && (
          <button onClick={() => setTab('tecnico')}
            className="px-4 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2"
            style={{
              color: tab === 'tecnico' ? '#1E2A3A' : '#7A6F5C',
              borderBottom: tab === 'tecnico' ? '3px solid #C9A350' : '3px solid transparent',
              marginBottom: -1,
            }}>
            📄 Informe Técnico Oficial
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: 'linear-gradient(135deg, #C9A350 0%, #E5C66D 100%)',
                color: '#1E2A3A',
                boxShadow: '0 1px 3px rgba(201,163,80,0.4)',
              }}>
              ✨ IA
            </span>
          </button>
        )}
      </div>

      {tab === 'ejecutivo' && (
        <ReporteEjecutivo activities={activities} progress={progress} modifs={modifs} currentUser={currentUser} />
      )}
      {tab === 'tecnico' && (
        <InformeTecnico activities={activities} progress={progress} modifs={modifs} currentUser={currentUser} />
      )}
    </>
  );
}

/* ============================================================
   REPORTE EJECUTIVO MENSUAL — Estructura original institucional
   Por centro de costo: I Resumen, II Logros, III Limitaciones, IV Medidas, V Modificaciones
   Exportable a Word
============================================================ */
function ReporteEjecutivo({ activities, progress, modifs, currentUser }) {
  const ccDisponibles = ccsVisibles(currentUser);
  const ccsParaReporte = CENTROS_COSTO.filter(c => ccDisponibles.includes(c.nombre));
  // 'TODOS' = todos los CC visibles en un solo reporte consolidado
  const [ccSel, setCcSel] = useState(ccsParaReporte.length > 1 ? 'TODOS' : (ccsParaReporte[0]?.nombre || CENTROS_COSTO[0].nombre));
  const [year, setYear] = useState(2026);
  const [mesFin, setMesFin] = useState(3);

  const esTodos = ccSel === 'TODOS';
  const mesesIncluir = Array.from({ length: mesFin }, (_, i) => i + 1);

  // CCs a incluir en este reporte
  const ccsIncluidos = esTodos ? ccsParaReporte : ccsParaReporte.filter(c => c.nombre === ccSel);

  // Para cada CC incluido, recopilar datos
  const datosPorCC = ccsIncluidos.map(cc => {
    const actsCC = activities.filter(a => a.centroCosto === cc.nombre);
    const reporteData = actsCC.map(a => {
      const registros = progress.filter(p => p.actividadId === a.id && p.anio === year && mesesIncluir.includes(p.mes))
        .sort((x, y) => x.mes - y.mes);
      return { actividad: a, registros };
    });
    const modsCC = modifs.filter(m => m.centroCosto === cc.nombre && m.anio === year && mesesIncluir.includes(m.mes))
      .sort((a, b) => a.mes - b.mes);
    // Agregados financieros y físicos REALES (desde las actividades y el seguimiento)
    const ag = calcularAgregados(actsCC, progress, year, mesFin);
    return {
      cc, actsCC, reporteData, modsCC,
      totalMods: ag.totalMods,
      pia: ag.finPIA, pim: ag.finPIM, variacion: ag.variacion,
      ejecFin: ag.ejecFin, avanceFin: ag.avanceFin,
      fisPIA: ag.fisPIA, fisPIM: ag.fisPIM, ejecFis: ag.ejecFis, avanceFis: ag.avanceFis,
      ag,
    };
  });

  // Para vista de un solo CC (compatibilidad con bloques que esperaban variables sueltas)
  const cc = ccsIncluidos[0]?.cc || CENTROS_COSTO[0];
  const primerDato = datosPorCC[0] || { cc, actsCC: [], reporteData: [], modsCC: [], totalMods: 0, pia: 0, pim: 0, variacion: 0, ejecFin: 0, avanceFin: 0, fisPIA: 0, fisPIM: 0, ejecFis: 0, avanceFis: 0, ag: calcularAgregados([], [], year, mesFin) };
  const acts = primerDato.actsCC;
  const reporteData = primerDato.reporteData;
  const modsCC = primerDato.modsCC;
  const totalMods = primerDato.totalMods;
  const pim = primerDato.pim;
  const variacion = primerDato.variacion;

  async function exportarWord() {
    const html = construirHTML();
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nombreArchivo = esTodos ? 'TODOS_CC' : ccSel.replace(/\s+/g, '_');
    link.download = `Reporte_Ejecutivo_${nombreArchivo}_${year}_al_${MESES[mesFin - 1]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function construirHTML() {
    const styles = `
      <style>
        @page { size: A4; margin: 2.5cm; }
        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1E2A3A; }
        h1 { font-size: 18pt; text-align: center; color: #1E2A3A; margin-bottom: 4px; }
        h2 { font-size: 13pt; color: #1E2A3A; border-bottom: 2px solid #C9A350; padding-bottom: 4px; margin-top: 20px; }
        h3 { font-size: 11pt; color: #9C7A2B; margin-top: 14px; margin-bottom: 6px; }
        .center { text-align: center; }
        .info-box { background: #FAF7F0; border-left: 4px solid #C9A350; padding: 10px; margin: 10px 0; font-size: 10pt; }
        table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 10pt; }
        th { background: #1E2A3A; color: #fff; padding: 6px; text-align: left; }
        td { border: 1px solid #ccc; padding: 5px; }
        p { text-align: justify; }
        .mes-label { color: #9C7A2B; font-weight: bold; }
        .sin-reg { color: #9C9080; font-style: italic; }
      </style>`;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>`;
    html += `<h1>Resumen Ejecutivo de Seguimiento mensual del POI</h1>`;
    html += `<p class="center">PROGRAMA NUESTRAS CIUDADES — ${year}</p>`;
    html += `<p class="center">Periodo: Enero — ${MESES[mesFin - 1]} ${year}</p>`;

    if (esTodos) {
      // ========== Reporte CONSOLIDADO de todos los CC ==========
      html += `<p class="center"><strong>REPORTE CONSOLIDADO — ${datosPorCC.length} Centros de Costo</strong></p>`;

      // Resumen general agregado (REAL, desde actividades + seguimiento)
      const agTot = calcularAgregados(
        datosPorCC.flatMap(d => d.actsCC), progress, year, mesFin
      );
      const totPIA = agTot.finPIA;
      const totPIM = agTot.finPIM;
      const totMods = agTot.totalMods;
      const totActs = datosPorCC.reduce((s, d) => s + d.actsCC.length, 0);
      const variacionTot = agTot.variacion;

      html += `<h2>I. RESUMEN EJECUTIVO CONSOLIDADO</h2>`;
      html += `<p>El presente reporte consolida la información de seguimiento del Plan Operativo Institucional (${year}) correspondiente a ${datosPorCC.length} Centros de Costo del Programa Nuestras Ciudades, abarcando el periodo de enero a ${MESES[mesFin - 1].toLowerCase()} de ${year}.</p>`;
      html += `<div class="info-box">`;
      html += `<strong>PIA total:</strong> ${fmtMoney(totPIA)} &nbsp;|&nbsp; `;
      html += `<strong>PIM total:</strong> ${fmtMoney(totPIM)} &nbsp;|&nbsp; `;
      html += `<strong>Modificaciones:</strong> ${fmtMoney(totMods)} &nbsp;|&nbsp; `;
      html += `<strong>Variación:</strong> ${variacionTot >= 0 ? '+' : ''}${variacionTot.toFixed(2)}%</div>`;
      html += `<div class="info-box">`;
      html += `<strong>Ejecución financiera (devengado) al ${MESES[mesFin - 1].toLowerCase()}:</strong> ${fmtMoney(agTot.ejecFin)} (${agTot.avanceFin.toFixed(1)}% del PIM) &nbsp;|&nbsp; `;
      html += `<strong>Ejecución física:</strong> ${fmtNumber(agTot.ejecFis)} (${agTot.avanceFis.toFixed(1)}% de la meta PIM) &nbsp;|&nbsp; `;
      html += `<strong>Total actividades:</strong> ${totActs} &nbsp;|&nbsp; `;
      html += `<strong>Centros de Costo:</strong> ${datosPorCC.length}</div>`;

      // Iterar por cada CC
      datosPorCC.forEach((d, idx) => {
        html += `<div style="page-break-before: ${idx > 0 ? 'always' : 'auto'}"></div>`;
        html += `<h1>Centro de Costo ${idx + 1}: ${d.cc.codigo} — ${d.cc.nombre}</h1>`;

        html += `<h2>${idx + 2}.1 RESUMEN</h2>`;
        html += `<p>${d.cc.resumen || ''}</p>`;
        html += `<div class="info-box">`;
        html += `<strong>PIA:</strong> ${fmtMoney(d.pia)} &nbsp;|&nbsp; `;
        html += `<strong>PIM:</strong> ${fmtMoney(d.pim)} &nbsp;|&nbsp; `;
        html += `<strong>Variación:</strong> ${d.variacion >= 0 ? '+' : ''}${d.variacion.toFixed(2)}% &nbsp;|&nbsp; `;
        html += `<strong>Actividades:</strong> ${d.actsCC.length}</div>`;
        html += `<div class="info-box">`;
        html += `<strong>Ejecución financiera (devengado):</strong> ${fmtMoney(d.ejecFin)} (${d.avanceFin.toFixed(1)}% del PIM) &nbsp;|&nbsp; `;
        html += `<strong>Ejecución física:</strong> ${d.avanceFis.toFixed(1)}%</div>`;

        html += `<h2>${idx + 2}.2 Principales logros</h2>`;
        d.reporteData.forEach(({ actividad, registros }) => {
          html += `<h3>${actividad.codigoAOI}: ${actividad.nombre}</h3>`;
          mesesIncluir.forEach(m => {
            const r = registros.find(x => x.mes === m);
            html += `<p><span class="mes-label">${MESES[m - 1]}:</span> ${r?.logros || '<span class="sin-reg">Sin registro para el periodo.</span>'}</p>`;
          });
        });

        html += `<h2>${idx + 2}.3 Limitaciones</h2>`;
        d.reporteData.forEach(({ actividad, registros }) => {
          html += `<h3>${actividad.codigoAOI}: ${actividad.nombre}</h3>`;
          mesesIncluir.forEach(m => {
            const r = registros.find(x => x.mes === m);
            html += `<p><span class="mes-label">${MESES[m - 1]}:</span> ${r?.limitaciones || '<span class="sin-reg">Sin registro para el periodo.</span>'}</p>`;
          });
        });

        html += `<h2>${idx + 2}.4 Medidas adoptadas</h2>`;
        d.reporteData.forEach(({ actividad, registros }) => {
          html += `<h3>${actividad.codigoAOI}: ${actividad.nombre}</h3>`;
          mesesIncluir.forEach(m => {
            const r = registros.find(x => x.mes === m);
            html += `<p><span class="mes-label">${MESES[m - 1]}:</span> ${r?.medidas || '<span class="sin-reg">Sin registro para el periodo.</span>'}</p>`;
          });
        });

        html += `<h2>${idx + 2}.5 Modificaciones presupuestales</h2>`;
        mesesIncluir.forEach(m => {
          const monthMods = d.modsCC.filter(x => x.mes === m);
          if (monthMods.length === 0) return;
          html += `<h3>${MESES[m - 1]}</h3>`;
          const byTipo = {};
          monthMods.forEach(mm => {
            const tipo = mm.tipo || 'Sin tipo';
            if (!byTipo[tipo]) byTipo[tipo] = [];
            byTipo[tipo].push(mm);
          });
          Object.entries(byTipo).forEach(([tipo, lista]) => {
            html += `<p><strong>${tipo}:</strong></p>`;
            html += `<table><tr><th>AOI</th><th>Importe</th><th>Concepto</th></tr>`;
            let sumTipo = 0;
            lista.forEach(mm => {
              const imp = Number(mm.importe) || 0;
              sumTipo += imp;
              html += `<tr><td>${mm.codigoAOI || '-'}</td><td style="text-align:right">${fmtMoney(imp)}</td><td>${mm.concepto || '-'}</td></tr>`;
            });
            html += `<tr><td colspan="1"><strong>Total</strong></td><td style="text-align:right"><strong>${fmtMoney(sumTipo)}</strong></td><td></td></tr>`;
            html += `</table>`;
          });
        });
      });

      html += `</body></html>`;
      return html;
    }

    // ========== Reporte de UN SOLO CC (original) ==========
    html += `<p class="center"><strong>CENTRO DE COSTOS ${cc.codigo} - ${cc.nombre}</strong></p>`;

    // I. Resumen
    html += `<h2>I. RESUMEN EJECUTIVO</h2>`;
    html += `<p>${cc.resumen || ''}</p>`;
    html += `<div class="info-box">`;
    html += `<strong>PIA:</strong> ${fmtMoney(primerDato.pia)} &nbsp;|&nbsp; `;
    html += `<strong>PIM al cierre:</strong> ${fmtMoney(pim)} &nbsp;|&nbsp; `;
    html += `<strong>Variación:</strong> ${variacion >= 0 ? '+' : ''}${variacion.toFixed(2)}% &nbsp;|&nbsp; `;
    html += `<strong>Actividades:</strong> ${acts.length}</div>`;
    html += `<div class="info-box">`;
    html += `<strong>Ejecución financiera (devengado):</strong> ${fmtMoney(primerDato.ejecFin)} (${primerDato.avanceFin.toFixed(1)}% del PIM) &nbsp;|&nbsp; `;
    html += `<strong>Ejecución física:</strong> ${primerDato.avanceFis.toFixed(1)}%</div>`;

    // II. Logros
    html += `<h2>II. PRINCIPALES LOGROS</h2>`;
    reporteData.forEach(({ actividad, registros }) => {
      html += `<h3>${actividad.codigoAOI}: ${actividad.nombre}</h3>`;
      mesesIncluir.forEach(m => {
        const r = registros.find(x => x.mes === m);
        html += `<p><span class="mes-label">${MESES[m - 1]}:</span> ${r?.logros || '<span class="sin-reg">Sin registro para el periodo.</span>'}</p>`;
      });
    });

    // III. Limitaciones
    html += `<h2>III. LIMITACIONES</h2>`;
    reporteData.forEach(({ actividad, registros }) => {
      html += `<h3>${actividad.codigoAOI}: ${actividad.nombre}</h3>`;
      mesesIncluir.forEach(m => {
        const r = registros.find(x => x.mes === m);
        html += `<p><span class="mes-label">${MESES[m - 1]}:</span> ${r?.limitaciones || '<span class="sin-reg">Sin registro para el periodo.</span>'}</p>`;
      });
    });

    // IV. Medidas
    html += `<h2>IV. MEDIDAS ADOPTADAS PARA CUMPLIR LAS METAS</h2>`;
    reporteData.forEach(({ actividad, registros }) => {
      html += `<h3>${actividad.codigoAOI}: ${actividad.nombre}</h3>`;
      mesesIncluir.forEach(m => {
        const r = registros.find(x => x.mes === m);
        html += `<p><span class="mes-label">${MESES[m - 1]}:</span> ${r?.medidas || '<span class="sin-reg">Sin registro para el periodo.</span>'}</p>`;
      });
    });

    // V. Modificaciones
    html += `<h2>V. MODIFICACIONES PRESUPUESTALES</h2>`;
    mesesIncluir.forEach(m => {
      const monthMods = modsCC.filter(x => x.mes === m);
      const piaCC = primerDato.pia;
      const pimMes = primerDato.pim;
      const varMes = piaCC > 0 ? ((pimMes - piaCC) / piaCC) * 100 : 0;

      html += `<h3>${MESES[m - 1]}</h3>`;
      html += `<p>El Centro de Costo ${cc.codigo} - ${cc.nombre} al cierre del mes de ${MESES[m - 1].toLowerCase()} ${year}, contó con un PIA de <strong>${fmtMoney(piaCC)}</strong> y un PIM de <strong>${fmtMoney(pimMes)}</strong>, representando un incremento/disminución de <strong>${varMes.toFixed(2)}%</strong> del PIA.</p>`;

      if (monthMods.length === 0) {
        html += `<p><em>En el mes de ${MESES[m - 1].toLowerCase()} no se aprobaron modificaciones presupuestales.</em></p>`;
      } else {
        const byTipo = {};
        monthMods.forEach(mm => {
          const tipo = mm.tipo || 'Sin tipo';
          if (!byTipo[tipo]) byTipo[tipo] = [];
          byTipo[tipo].push(mm);
        });
        Object.entries(byTipo).forEach(([tipo, lista]) => {
          html += `<p><strong>${tipo}:</strong></p>`;
          html += `<table><tr><th>AOI</th><th>Importe</th><th>Concepto</th></tr>`;
          let sumTipo = 0;
          lista.forEach(mm => {
            const imp = Number(mm.importe) || 0;
            sumTipo += imp;
            html += `<tr><td>${mm.codigoAOI || '-'}</td><td style="text-align:right">${fmtMoney(imp)}</td><td>${mm.concepto || '-'}</td></tr>`;
          });
          html += `<tr><td colspan="1"><strong>Total</strong></td><td style="text-align:right"><strong>${fmtMoney(sumTipo)}</strong></td><td></td></tr>`;
          html += `</table>`;
        });
      }
    });

    html += `</body></html>`;
    return html;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={exportarWord}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
          style={{ background: '#C9A350', color: '#1E2A3A' }}>
          <Download size={16} /> Exportar a Word
        </button>
      </div>

      <Card className="p-5 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Centro de costo">
            <select value={ccSel} onChange={(e) => setCcSel(e.target.value)} className={inputCls}>
              {ccsParaReporte.length > 1 && (
                <option value="TODOS">📋 TODOS los Centros de Costo (consolidado)</option>
              )}
              {ccsParaReporte.map(c => <option key={c.codigo} value={c.nombre}>{c.codigo} — {c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Año">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls}>
              {ANIOS_DISPONIBLES.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Reporte al mes de">
            <select value={mesFin} onChange={(e) => setMesFin(Number(e.target.value))} className={inputCls}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="p-8">
        <div className="text-center mb-8">
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 500, color: '#1E2A3A' }}>
            Resumen Ejecutivo de Seguimiento mensual del POI
          </div>
          <div className="text-sm mt-2" style={{ color: '#7A6F5C' }}>PROGRAMA NUESTRAS CIUDADES — {year}</div>
          <div className="text-sm" style={{ color: '#7A6F5C' }}>Periodo: Enero — {MESES[mesFin - 1]} {year}</div>
          {esTodos ? (
            <div className="text-sm mt-2 font-semibold" style={{ color: '#1E2A3A' }}>
              REPORTE CONSOLIDADO DE TODOS LOS CENTROS DE COSTO ({datosPorCC.length})
            </div>
          ) : (
            <div className="text-sm mt-2 font-semibold" style={{ color: '#1E2A3A' }}>
              CENTRO DE COSTOS {cc.codigo} - {cc.nombre}
            </div>
          )}
        </div>

        {esTodos ? (
          // ============ Vista CONSOLIDADA: todos los CC ============
          <>
            {/* Resumen general agregado */}
            <ReportSection num="I" title="RESUMEN EJECUTIVO CONSOLIDADO">
              <p className="text-sm leading-relaxed text-justify mb-3" style={{ color: '#1E2A3A' }}>
                El presente reporte consolida la información de seguimiento del Plan Operativo Institucional ({year}) correspondiente a {datosPorCC.length} Centros de Costo del Programa Nuestras Ciudades, abarcando el periodo de enero a {MESES[mesFin - 1].toLowerCase()} de {year}.
              </p>
              {(() => {
                const agTot = calcularAgregados(datosPorCC.flatMap(d => d.actsCC), progress, year, mesFin);
                return (
                  <div className="grid grid-cols-2 gap-2 p-4 rounded" style={{ background: '#FAF7F0', borderLeft: '4px solid #C9A350' }}>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>PIA total:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(agTot.finPIA)}</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>PIM total:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(agTot.finPIM)}</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Modificaciones:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(agTot.totalMods)}</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Variación:</span> <strong style={{ color: agTot.variacion > 0 ? '#2D7A4E' : '#1E2A3A' }}>{agTot.variacion >= 0 ? '+' : ''}{agTot.variacion.toFixed(2)}%</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Ejec. financiera:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(agTot.ejecFin)} ({agTot.avanceFin.toFixed(1)}%)</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Total actividades:</span> <strong style={{ color: '#1E2A3A' }}>{datosPorCC.reduce((s, d) => s + d.actsCC.length, 0)}</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Ejec. física:</span> <strong style={{ color: '#1E2A3A' }}>{agTot.avanceFis.toFixed(1)}%</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Centros de Costo:</span> <strong style={{ color: '#1E2A3A' }}>{datosPorCC.length}</strong></div>
                  </div>
                );
              })()}
            </ReportSection>

            {/* Iterar por cada CC */}
            {datosPorCC.map((d, idx) => (
              <div key={d.cc.codigo} className="mt-8 pt-6" style={{ borderTop: idx > 0 ? '2px dashed #C9A350' : 'none' }}>
                <div className="mb-4 p-3 rounded" style={{ background: '#1E2A3A' }}>
                  <div className="text-sm font-bold" style={{ color: '#C9A350' }}>
                    Centro de Costo {idx + 1}: {d.cc.codigo} — {d.cc.nombre}
                  </div>
                </div>

                <ReportSection num={`${idx + 2}.1`} title={`RESUMEN — ${d.cc.nombre}`}>
                  <p className="text-sm leading-relaxed text-justify" style={{ color: '#1E2A3A' }}>{d.cc.resumen}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 p-4 rounded" style={{ background: '#FAF7F0', borderLeft: '4px solid #C9A350' }}>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>PIA:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(d.pia)}</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>PIM al cierre:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(d.pim)}</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Variación:</span> <strong style={{ color: d.variacion > 0 ? '#2D7A4E' : '#1E2A3A' }}>{d.variacion >= 0 ? '+' : ''}{d.variacion.toFixed(2)}%</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Actividades:</span> <strong style={{ color: '#1E2A3A' }}>{d.actsCC.length}</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Ejec. financiera:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(d.ejecFin)} ({d.avanceFin.toFixed(1)}%)</strong></div>
                    <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Ejec. física:</span> <strong style={{ color: '#1E2A3A' }}>{d.avanceFis.toFixed(1)}%</strong></div>
                  </div>
                </ReportSection>

                <ReportSection num={`${idx + 2}.2`} title="Principales logros">
                  {d.reporteData.map(({ actividad, registros }) => (
                    <ActividadBloque key={actividad.id} actividad={actividad} registros={registros} campo="logros" mesesIncluir={mesesIncluir} />
                  ))}
                </ReportSection>

                <ReportSection num={`${idx + 2}.3`} title="Limitaciones">
                  {d.reporteData.map(({ actividad, registros }) => (
                    <ActividadBloque key={actividad.id} actividad={actividad} registros={registros} campo="limitaciones" mesesIncluir={mesesIncluir} />
                  ))}
                </ReportSection>

                <ReportSection num={`${idx + 2}.4`} title="Medidas adoptadas">
                  {d.reporteData.map(({ actividad, registros }) => (
                    <ActividadBloque key={actividad.id} actividad={actividad} registros={registros} campo="medidas" mesesIncluir={mesesIncluir} />
                  ))}
                </ReportSection>

                <ReportSection num={`${idx + 2}.5`} title="Modificaciones presupuestales">
                  {mesesIncluir.map(m => {
                    const monthMods = d.modsCC.filter(x => x.mes === m);
                    if (monthMods.length === 0) return null;
                    return (
                      <div key={m} className="mb-4">
                        <div className="text-sm font-semibold mb-2" style={{ color: '#9C7A2B' }}>{MESES[m - 1]}</div>
                        <ModifTablaPorAOI mods={monthMods} acts={d.actsCC} />
                      </div>
                    );
                  })}
                </ReportSection>
              </div>
            ))}
          </>
        ) : (
          // ============ Vista de UN solo CC ============
          <>
        <ReportSection num="I" title="RESUMEN EJECUTIVO">
          <p className="text-sm leading-relaxed text-justify" style={{ color: '#1E2A3A' }}>{cc.resumen}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 p-4 rounded" style={{ background: '#FAF7F0', borderLeft: '4px solid #C9A350' }}>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>PIA:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(primerDato.pia)}</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>PIM al cierre:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(pim)}</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Variación:</span> <strong style={{ color: variacion > 0 ? '#2D7A4E' : '#1E2A3A' }}>{variacion >= 0 ? '+' : ''}{variacion.toFixed(2)}%</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Actividades:</span> <strong style={{ color: '#1E2A3A' }}>{acts.length}</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Ejec. financiera:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(primerDato.ejecFin)} ({primerDato.avanceFin.toFixed(1)}%)</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Ejec. física:</span> <strong style={{ color: '#1E2A3A' }}>{primerDato.avanceFis.toFixed(1)}%</strong></div>
          </div>
        </ReportSection>

        <ReportSection num="II" title="PRINCIPALES LOGROS">
          {reporteData.map(({ actividad, registros }) => (
            <ActividadBloque key={actividad.id} actividad={actividad} registros={registros} campo="logros" mesesIncluir={mesesIncluir} />
          ))}
        </ReportSection>

        <ReportSection num="III" title="LIMITACIONES">
          {reporteData.map(({ actividad, registros }) => (
            <ActividadBloque key={actividad.id} actividad={actividad} registros={registros} campo="limitaciones" mesesIncluir={mesesIncluir} />
          ))}
        </ReportSection>

        <ReportSection num="IV" title="MEDIDAS ADOPTADAS PARA CUMPLIR LAS METAS">
          {reporteData.map(({ actividad, registros }) => (
            <ActividadBloque key={actividad.id} actividad={actividad} registros={registros} campo="medidas" mesesIncluir={mesesIncluir} />
          ))}
        </ReportSection>

        <ReportSection num="V" title="MODIFICACIONES PRESUPUESTALES">
          {mesesIncluir.map(m => {
            const monthMods = modsCC.filter(x => x.mes === m);
            const piaCC = primerDato.pia;
            const pimMes = primerDato.pim;
            const varMes = piaCC > 0 ? ((pimMes - piaCC) / piaCC) * 100 : 0;
            // Texto de modificación del periodo (cargado desde el Informe mensual, guardado en el seguimiento)
            const textoModif = (() => {
              const regs = progress.filter(p => acts.some(a => a.id === p.actividadId) && p.anio === year && p.mes === m && p.modificaciones);
              return regs.length ? regs[0].modificaciones : '';
            })();

            return (
              <div key={m} className="mb-6">
                <div className="text-sm font-semibold mb-2" style={{ color: '#9C7A2B' }}>{MESES[m - 1]}</div>
                <p className="text-sm leading-relaxed text-justify mb-3" style={{ color: '#1E2A3A' }}>
                  El Centro de Costo {cc.codigo} - {cc.nombre} al cierre del mes de {MESES[m - 1].toLowerCase()} {year}, contó con un PIA de <strong>{fmtMoney(piaCC)}</strong> y un PIM de <strong>{fmtMoney(pimMes)}</strong>, representando un incremento/disminución de <strong>{varMes.toFixed(2)}%</strong> del PIA.
                </p>
                {textoModif && (
                  <p className="text-sm leading-relaxed text-justify mb-3" style={{ color: '#1E2A3A' }}>{textoModif}</p>
                )}
                {monthMods.length === 0 ? (
                  <p className="text-sm italic" style={{ color: '#7A6F5C' }}>
                    En el mes de {MESES[m - 1].toLowerCase()} no se aprobaron modificaciones presupuestales.
                  </p>
                ) : (
                  <ModifTablaPorAOI mods={monthMods} acts={acts} />
                )}
              </div>
            );
          })}
        </ReportSection>
          </>
        )}
      </Card>
    </>
  );
}

/* ============================================================
   INFORME TÉCNICO POI — Modelo oficial PNC
   Dos tipos:
   1. Mensual: del mes filtrado (Introducción, Base Legal, Análisis, Conclusiones)
   2. Acumulado: todos los meses del año (mismo formato + evolución mensual)
============================================================ */
function InformeTecnico({ activities, progress, modifs, currentUser }) {
  const [tipoInforme, setTipoInforme] = useState('mensual'); // 'mensual' o 'acumulado'
  const [year, setYear] = useState(2026);
  const [mes, setMes] = useState(3);

  // ============ ESTADOS EDITABLES DEL CUERPO DEL INFORME ============
  const numInformeAuto = String(Math.floor(Date.now() / 1000) % 9999999).padStart(7, '0');
  const fechaHoy = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

  // Cabecera editable
  const [editCabecera, setEditCabecera] = useState(false);
  const [numInforme, setNumInforme] = useState(numInformeAuto);
  const [siglas, setSiglas] = useState(currentUser?.usuario || 'jccanto');
  const [dirigidoA, setDirigidoA] = useState('Econ. Rosa Malaspina Pando');
  const [dirigidoCargo, setDirigidoCargo] = useState('Coordinadora (e) Área de Planeamiento y Presupuesto - Programa Nuestras Ciudades');
  const [referencia1, setReferencia1] = useState(`Memorando Múltiple N° 034-${year}-VIVIENDA/SG-OGPP`);
  const [referencia2, setReferencia2] = useState(`Resolución Ministerial N° 363-2025-VIVIENDA que aprueba el POI Anual ${year} consistente con el PIA ${year} del Pliego 037: MVCS`);
  const [fechaInforme, setFechaInforme] = useState(`San Isidro, ${fechaHoy}`);

  // Introducción editable
  const [editIntro, setEditIntro] = useState(false);
  const [intro11, setIntro11] = useState('');
  const [intro12, setIntro12] = useState('El Centro Nacional de Planeamiento Estratégico, en el artículo 7° de la Directiva N° 001-2017-CEPLAN/PCD, establece que las políticas institucionales se concretan en los planes estratégicos institucionales-PEI y los planes operativos institucionales-POI.');
  const [intro13, setIntro13] = useState('El POI establece las Actividades Operativas priorizadas vinculadas al cumplimiento de los Objetivos y Acciones Estratégicas Institucionales.');

  // Auto-actualizar 1.1 y referencias cuando cambien año/mes/tipo
  useEffect(() => {
    const periodoIntro = tipoInforme === 'mensual'
      ? `correspondiente al mes de ${MESES[mes - 1].toLowerCase()} de ${year}`
      : `acumulado al mes de ${MESES[mes - 1].toLowerCase()} de ${year}`;
    setIntro11(`En atención a los documentos de la referencia, se presenta el informe de seguimiento del Plan Operativo Institucional (POI) del Programa Nuestras Ciudades (PNC), ${periodoIntro}. El presente documento detalla el análisis del avance en la ejecución de las metas físicas y financieras, los logros alcanzados, las limitaciones identificadas y las medidas adoptadas.`);
  }, [year, mes, tipoInforme]);

  const ccDisponibles = ccsVisibles(currentUser);
  const ccsParaReporte = CENTROS_COSTO.filter(c => ccDisponibles.includes(c.nombre));

  // ============ CÁLCULO DE INDICADORES ============
  function calcularIndicadoresCC(ccNombre) {
    const ccObj = CENTROS_COSTO.find(c => c.nombre === ccNombre);
    const actsCC = activities.filter(a => a.centroCosto === ccNombre);

    let segsCC = progress.filter(p => {
      const act = activities.find(a => a.id === p.actividadId);
      return act && act.centroCosto === ccNombre && p.anio === year;
    });
    let modsCC = modifs.filter(m => m.centroCosto === ccNombre && m.anio === year);

    if (tipoInforme === 'mensual') {
      // Solo el mes seleccionado
      segsCC = segsCC.filter(s => s.mes === mes);
      modsCC = modsCC.filter(m => m.mes === mes);
    } else {
      // Acumulado: desde enero hasta el mes seleccionado (inclusive)
      segsCC = segsCC.filter(s => s.mes <= mes);
      modsCC = modsCC.filter(m => m.mes <= mes);
    }

    // Agregados financieros y físicos REALES desde las actividades del CC.
    // Para 'mensual' se evalúa solo el mes; para 'acumulado', de enero al mes.
    const mesFinCalc = mes;
    const ag = calcularAgregados(actsCC, progress, year, mesFinCalc);
    const pia = ag.finPIA;            // PIA anual del CC (real)
    const pim = ag.finPIM;            // PIM anual del CC (real)
    const totalMods = ag.totalMods;   // PIM - PIA

    // Ejecutado según el tipo de informe (mensual = solo el mes; acumulado = hasta el mes)
    const ejecFin = segsCC.reduce((s, p) => s + (Number(p.avanceFinanciero) || 0), 0);
    const ejecFis = segsCC.reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);

    // Meta física programada (PIM) según tipo de informe, desde la física mensual real
    let metaFisProg = 0;
    actsCC.forEach(a0 => {
      const a = a0.genericas ? a0 : migrarActividadGenericas(a0);
      const arr = a.fisicaMensual?.pim || [];
      if (tipoInforme === 'mensual') {
        metaFisProg += Number(arr[mes - 1]) || 0;
      } else {
        for (let m = 1; m <= mes; m++) metaFisProg += Number(arr[m - 1]) || 0;
      }
    });

    const pctFin = pim > 0 ? (ejecFin / pim) * 100 : 0;
    const pctFis = metaFisProg > 0 ? (ejecFis / metaFisProg) * 100 : 0;

    return {
      nombre: ccNombre, codigo: ccObj?.codigo || '', pia, totalMods, pim,
      ejecFin, ejecFis, pctFin, pctFis, metaFisProg,
      fisPIA: ag.fisPIA, fisPIM: ag.fisPIM,
      actividades: actsCC.length, seguimientos: segsCC, actividadesData: actsCC,
      modificaciones: modsCC,
    };
  }

  const indicadoresPorCC = ccsParaReporte
    .map(cc => calcularIndicadoresCC(cc.nombre))
    .filter(i => i.actividades > 0);

  // Totales generales
  const totales = {
    pia: indicadoresPorCC.reduce((s, i) => s + i.pia, 0),
    totalMods: indicadoresPorCC.reduce((s, i) => s + i.totalMods, 0),
    pim: indicadoresPorCC.reduce((s, i) => s + i.pim, 0),
    ejecFin: indicadoresPorCC.reduce((s, i) => s + i.ejecFin, 0),
    ejecFis: indicadoresPorCC.reduce((s, i) => s + i.ejecFis, 0),
    metaFisProg: indicadoresPorCC.reduce((s, i) => s + i.metaFisProg, 0),
    fisPIA: indicadoresPorCC.reduce((s, i) => s + (i.fisPIA || 0), 0),
    fisPIM: indicadoresPorCC.reduce((s, i) => s + (i.fisPIM || 0), 0),
    actividades: indicadoresPorCC.reduce((s, i) => s + i.actividades, 0),
  };
  totales.pctFin = totales.pim > 0 ? (totales.ejecFin / totales.pim) * 100 : 0;
  totales.pctFis = totales.metaFisProg > 0 ? (totales.ejecFis / totales.metaFisProg) * 100 : 0;

  // Evolución mensual (solo para acumulado) - hasta el mes seleccionado
  const evolucionMensual = [];
  if (tipoInforme === 'acumulado') {
    // Pre-calcular actividades filtradas por permisos del usuario
    const actsFiltradas = esResponsableCC(currentUser) ? filtrarActividadesUsuario(activities, currentUser) : activities;
    const idsFiltradas = new Set(actsFiltradas.map(a => a.id));

    // Acumulado va de enero hasta el mes seleccionado (mes)
    for (let m = 1; m <= mes; m++) {
      const mAbr = MESES_ABR[m - 1].toLowerCase();
      const segMes = progress.filter(p => p.anio === year && p.mes === m && idsFiltradas.has(p.actividadId));

      // Ejecutado
      const ejecFin = segMes.reduce((s, p) => s + (Number(p.avanceFinanciero) || 0), 0);
      const ejecFis = segMes.reduce((s, p) => s + (Number(p.avanceFisico) || 0), 0);

      // Programado mensual REAL (desde genéricas/física mensual PIM de cada actividad)
      const progFin = actsFiltradas.reduce((s, a0) => {
        const a = a0.genericas ? a0 : migrarActividadGenericas(a0);
        return s + financieroMesActividad(a, 'pim', m - 1);
      }, 0);
      const progFis = actsFiltradas.reduce((s, a0) => {
        const a = a0.fisicaMensual ? a0 : migrarActividadGenericas(a0);
        return s + (Number(a.fisicaMensual?.pim?.[m - 1]) || 0);
      }, 0);

      evolucionMensual.push({
        mes: m,
        mesNombre: MESES[m - 1],
        ejecutado: ejecFin,
        ejecFinanciero: ejecFin,
        ejecFisico: ejecFis,
        progFinanciero: progFin,
        progFisico: progFis,
        registros: segMes.length,
      });
    }
  }

  // Recolección de logros y limitaciones
  /**
   * Construye un resumen consolidado del análisis del CC.
   * Describe la ejecución general SIN entrar en detalle por actividad/mes.
   * Solo cuenta actividades con avance físico > 0.
   */
  function construirResumenCC(ind, periodoTexto) {
    // Actividades con avance físico
    const actsConAvance = new Set();
    let avanceFisicoTotal = 0;
    ind.seguimientos.forEach(s => {
      const avf = Number(s.avanceFisico) || 0;
      if (avf > 0) {
        actsConAvance.add(s.actividadId);
        avanceFisicoTotal += avf;
      }
    });

    const totalActs = ind.actividades;
    const conAvance = actsConAvance.size;

    let resumen = `${periodoTexto} se tiene una ejecución financiera de S/ ${ind.ejecFin.toLocaleString('es-PE', { minimumFractionDigits: 2 })} `;
    resumen += `que representa el ${ind.pctFin.toFixed(2)}% del PIM. `;
    resumen += `Se registró un avance físico promedio de ${ind.pctFis.toFixed(2)}%. `;

    if (conAvance === 0) {
      resumen += `No se registraron avances físicos en las actividades durante el período evaluado.`;
    } else if (conAvance === totalActs) {
      resumen += `Se registraron avances en las ${totalActs} actividades del centro de costo.`;
    } else {
      resumen += `De las ${totalActs} actividades del centro de costo, ${conAvance} presentaron avance físico durante el período.`;
    }

    return resumen;
  }

  // Compatibilidad: stub que devuelve vacío (limitaciones ya no se muestran)
  function recolectarLimitaciones() { return []; }

  /**
   * Devuelve los logros más relevantes del centro de costo.
   * Reglas:
   * 1. Solo considera seguimientos donde la actividad tuvo avance físico > 0
   * 2. Agrupa por actividad (no se repite la misma actividad por mes)
   * 3. Ordena por avance físico acumulado (mayor impacto primero)
   * 4. Devuelve máximo 5 logros más relevantes
   */
  function recolectarLogros(seguimientos, actsData) {
    // Agrupar por actividad: cada actividad con su avance total y todos sus textos de logros
    const porActividad = {};
    seguimientos.forEach(s => {
      const avanceFis = Number(s.avanceFisico) || 0;
      if (avanceFis <= 0) return; // ignorar seguimientos sin avance físico
      const act = actsData.find(a => a.id === s.actividadId);
      if (!act) return;
      const textoLogro = String(s.logros || '').trim();
      if (!textoLogro) return;

      if (!porActividad[act.id]) {
        porActividad[act.id] = {
          codigoAOI: act.codigoAOI,
          nombre: act.nombre,
          area: act.area,
          unidadMedida: act.unidadMedida,
          avanceFisAcum: 0,
          avanceFinAcum: 0,
          textos: [],
        };
      }
      porActividad[act.id].avanceFisAcum += avanceFis;
      porActividad[act.id].avanceFinAcum += Number(s.avanceFinanciero) || 0;
      porActividad[act.id].textos.push({ mes: s.mes, texto: textoLogro });
    });

    // Ordenar por avance físico acumulado descendente y tomar los 5 más relevantes
    const lista = Object.values(porActividad)
      .sort((a, b) => b.avanceFisAcum - a.avanceFisAcum)
      .slice(0, 5);

    // Consolidar el texto de cada actividad (combinar de varios meses si existen)
    return lista.map(item => ({
      codigoAOI: item.codigoAOI,
      nombre: item.nombre,
      area: item.area,
      unidadMedida: item.unidadMedida,
      avanceFisAcum: item.avanceFisAcum,
      avanceFinAcum: item.avanceFinAcum,
      // Toma el texto más completo (más largo) si hay varios, evitando duplicaciones
      texto: item.textos.length === 1
        ? item.textos[0].texto
        : item.textos.sort((x, y) => y.texto.length - x.texto.length)[0].texto,
    }));
  }

  // ============ EXPORTACIÓN A WORD ============
  function exportarWord() {
    const html = construirHTMLInforme();
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sufijo = tipoInforme === 'mensual' ? `${MESES_ABR[mes - 1]}_${year}` : `Acumulado_a_${MESES_ABR[mes - 1]}_${year}`;
    link.download = `Informe_Tecnico_POI_${sufijo}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Descripciones institucionales por CC (tomadas del informe oficial)
  const descripcionesCC = {
    'GESTIÓN PNC': 'Esta unidad se encarga de asegurar la planificación, ejecución, monitoreo y evaluación eficiente de los proyectos de inversión pública en infraestructura urbana y saneamiento a nivel nacional. La Gestión del Programa se enfoca en la gestión administrativa, financiera, técnica y operativa, garantizando la correcta asignación de recursos, el cumplimiento de los plazos establecidos y la calidad de las obras, contribuyendo así al desarrollo sostenible de las ciudades peruanas y la mejora de la calidad de vida de sus habitantes.',
    'UGEDEUS': 'Unidad de Gestión del Desarrollo Urbano Sostenible. Se encarga de desarrollar estudios, brindar asistencia técnica y promover la gestión del desarrollo urbano sostenible a nivel nacional.',
    'UGERDES': 'Unidad de Gestión del Riesgo de Desastres y PNC-Maquinarias. Desarrolla acciones de prevención, reducción de riesgos y atención de emergencias a nivel nacional.',
    'UNINDEUS': 'Unidad de Inversiones en Desarrollo Urbano Sostenible y Proyectos de Inversión pública. Promueve y gestiona los proyectos de inversión pública del PNC.',
  };

  function construirHTMLInforme() {
    const periodoTexto = tipoInforme === 'mensual'
      ? `al mes de ${MESES[mes - 1].toLowerCase()} ${year}`
      : `acumulado al mes de ${MESES[mes - 1].toLowerCase()} ${year}`;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe Técnico POI</title>
<style>
body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; margin: 2cm; color: #000; }
.center { text-align: center; }
.bold { font-weight: bold; }
.italic { font-style: italic; }
h1, h2, h3 { font-family: Arial, sans-serif; color: #1E2A3A; }
h1 { font-size: 14pt; margin-top: 18px; margin-bottom: 10px; }
h2 { font-size: 12pt; margin-top: 16px; margin-bottom: 8px; }
h3 { font-size: 11pt; margin-top: 12px; margin-bottom: 6px; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 10pt; }
th { background: #1E2A3A; color: #fff; padding: 6px; text-align: left; }
td { border: 1px solid #ccc; padding: 5px; }
ul { margin: 6px 0 10px 0; padding-left: 22px; }
li { margin-bottom: 4px; text-align: justify; }
.bloque-info { padding: 10px; background: #FAF7F0; border-left: 3px solid #C9A350; margin: 10px 0; }
p { text-align: justify; margin: 6px 0; }
</style></head><body>`;

    // Cabecera oficial (EDITABLE por el usuario)
    html += `<p class="center italic">"Decenio de la Igualdad de Oportunidades para mujeres y hombres"</p>`;
    html += `<p class="center italic">"Año de la Esperanza y el Fortalecimiento de la Democracia"</p>`;
    html += `<br><p class="center bold" style="font-size:12pt">INFORME TÉCNICO N° ${numInforme}-${year}-VIVIENDA/VMVU/PNC/APP - ${siglas}</p><br>`;
    html += `<p><strong>A:</strong> ${dirigidoA}<br>&nbsp;&nbsp;&nbsp;&nbsp;${dirigidoCargo}</p>`;
    html += `<p><strong>ASUNTO:</strong> Seguimiento del Plan Operativo Institucional ${year} del pliego 037 – MVCS – ${periodoTexto}.</p>`;
    html += `<p><strong>REFERENCIA:</strong><br>- ${referencia1}<br>- ${referencia2}</p>`;
    html += `<p><strong>FECHA:</strong> ${fechaInforme}</p><br>`;
    html += `<p>Tengo el agrado de dirigirme a usted, en relación a los documentos de la referencia mediante los cuales se solicitó el seguimiento del Plan Operativo Institucional ${periodoTexto}.</p>`;
    html += `<p>Sobre el particular debo manifestarle lo siguiente:</p>`;

    // I. INTRODUCCIÓN (EDITABLE)
    html += `<h1>I. INTRODUCCIÓN</h1>`;
    html += `<p><strong>1.1</strong> ${intro11}</p>`;
    html += `<p><strong>1.2</strong> ${intro12}</p>`;
    html += `<p><strong>1.3</strong> ${intro13}</p>`;

    // II. BASE LEGAL
    html += `<h1>II. BASE LEGAL</h1>`;
    html += `<p><strong>2.1</strong> Decreto Legislativo 1440 del Sistema Nacional de Presupuesto Público.</p>`;
    html += `<p><strong>2.2</strong> Guía para el seguimiento y evaluación de políticas nacionales y planes del SINAPLAN aprobada por Resolución de Presidencia de Consejo Directivo N° 00015-2021-CEPLAN/PCD.</p>`;
    html += `<p><strong>2.3</strong> Guía para el Planeamiento Institucional modificada por Resolución de Presidencia del Consejo Directivo N° 0016-2019/CEPLAN/PCD.</p>`;
    html += `<p><strong>2.4</strong> Resolución Ministerial N° 151-2024-VIVIENDA, aprueba el "Plan Estratégico Institucional 2024-2030 del Ministerio de Vivienda, Construcción y Saneamiento".</p>`;
    html += `<p><strong>2.5</strong> Resolución Ministerial N° 363-2025-VIVIENDA, aprueba el "Plan Operativo Institucional ${year}-Consistenciado del Ministerio de Vivienda, Construcción y Saneamiento".</p>`;

    // III. ANÁLISIS
    html += `<h1>III. ANÁLISIS</h1>`;
    html += `<h2>3.1. Resumen General del Programa</h2>`;
    const periodoAnal = tipoInforme === 'mensual'
      ? `Al cierre del mes de ${MESES[mes - 1].toLowerCase()} de ${year}`
      : `Al período acumulado al mes de ${MESES[mes - 1].toLowerCase()} de ${year}`;
    html += `<p>${periodoAnal}, el Programa Nuestras Ciudades (PNC) tiene el Presupuesto Institucional Modificado (PIM) que asciende a <strong>${fmtMoney(totales.pim)}</strong> de los cuales se tiene un avance de ejecución financiera el importe de <strong>${fmtMoney(totales.ejecFin)}</strong>, que representa un avance de ejecución de <strong>${totales.pctFin.toFixed(2)}%</strong>. Por otro lado, se tiene una ejecución de meta física promedio de <strong>${totales.pctFis.toFixed(2)}%</strong> de las actividades operativas e inversiones.</p>`;

    // Tabla resumen
    html += `<table><tr><th>Indicador</th><th>Valor</th></tr>`;
    html += `<tr><td>Presupuesto Institucional de Apertura (PIA)</td><td>${fmtMoney(totales.pia)}</td></tr>`;
    html += `<tr><td>Modificaciones presupuestales</td><td>${fmtMoney(totales.totalMods)}</td></tr>`;
    html += `<tr><td>Presupuesto Institucional Modificado (PIM)</td><td>${fmtMoney(totales.pim)}</td></tr>`;
    html += `<tr><td>Ejecución financiera (devengado)</td><td>${fmtMoney(totales.ejecFin)}</td></tr>`;
    html += `<tr><td>% Avance financiero</td><td>${totales.pctFin.toFixed(2)}%</td></tr>`;
    html += `<tr><td>% Avance físico</td><td>${totales.pctFis.toFixed(2)}%</td></tr>`;
    html += `<tr><td>Total actividades operativas</td><td>${totales.actividades}</td></tr>`;
    html += `</table>`;

    // Evolución mensual (solo acumulado)
    if (tipoInforme === 'acumulado') {
      html += `<h3>Evolución mensual de la ejecución financiera</h3>`;
      html += `<table><tr><th>Mes</th><th>Ejecución Financiera</th><th>Registros</th></tr>`;
      evolucionMensual.forEach(e => {
        if (e.ejecutado > 0 || e.registros > 0) {
          html += `<tr><td>${e.mesNombre}</td><td>${fmtMoney(e.ejecutado)}</td><td>${e.registros}</td></tr>`;
        }
      });
      html += `</table>`;
    }

    // 3.2 Por Centro de Costo
    html += `<h2>3.2. Avance por Unidades (Centros de Costo)</h2>`;
    html += `<p>A continuación, se presenta el desglose del avance físico y financiero por cada unidad responsable del programa.</p>`;

    indicadoresPorCC.forEach((ind, idx) => {
      const desc = descripcionesCC[ind.nombre] || '';
      html += `<h3>3.2.${idx + 1}. ${ind.nombre}</h3>`;
      if (desc) html += `<p>${desc}</p>`;

      const periodoCC = tipoInforme === 'mensual'
        ? `En el mes de ${MESES[mes - 1].toLowerCase()} de ${year}`
        : `En el período acumulado al mes de ${MESES[mes - 1].toLowerCase()} de ${year}`;

      // Resumen consolidado del CC (no detalla actividad por mes)
      const resumenTexto = construirResumenCC(ind, periodoCC);
      html += `<p><strong>Resumen de resultados:</strong> ${resumenTexto}</p>`;

      // Tabla del CC
      html += `<table><tr><th>Indicador</th><th>Valor</th></tr>`;
      html += `<tr><td>PIA</td><td>${fmtMoney(ind.pia)}</td></tr>`;
      html += `<tr><td>Modificaciones</td><td>${fmtMoney(ind.totalMods)}</td></tr>`;
      html += `<tr><td>PIM</td><td>${fmtMoney(ind.pim)}</td></tr>`;
      html += `<tr><td>Ejecución financiera (devengado)</td><td>${fmtMoney(ind.ejecFin)}</td></tr>`;
      html += `<tr><td>% Avance financiero</td><td>${ind.pctFin.toFixed(2)}%</td></tr>`;
      html += `<tr><td>% Avance físico</td><td>${ind.pctFis.toFixed(2)}%</td></tr>`;
      html += `<tr><td>N° actividades</td><td>${ind.actividades}</td></tr>`;
      html += `</table>`;

      // Logros: solo los 3-5 más relevantes (ya filtrados sin avance == 0)
      const logros = recolectarLogros(ind.seguimientos, ind.actividadesData);
      if (logros.length > 0) {
        html += `<p><strong>Principales logros:</strong></p><ul>`;
        logros.forEach(l => {
          html += `<li><strong>${l.codigoAOI}</strong> (${l.unidadMedida || ''}, avance acumulado: ${l.avanceFisAcum.toFixed(2)}): ${l.texto}</li>`;
        });
        html += `</ul>`;
      }
    });

    // IV. CONCLUSIONES Y RECOMENDACIONES
    html += `<h1>IV. CONCLUSIONES Y RECOMENDACIONES</h1>`;
    html += `<h2>4.1 Conclusiones</h2>`;
    const periodoConcl = tipoInforme === 'mensual'
      ? `al culminar el mes de ${MESES[mes - 1].toLowerCase()} de ${year}`
      : `al período acumulado al mes de ${MESES[mes - 1].toLowerCase()} de ${year}`;
    html += `<p><strong>4.1.1</strong> El Programa Nuestras Ciudades, ${periodoConcl} ha alcanzado una ejecución presupuestal de <strong>${fmtMoney(totales.ejecFin)}</strong> que representa el <strong>${totales.pctFin.toFixed(2)}%</strong> del PIM. Asimismo, se tiene un avance de la ejecución física promedio de <strong>${totales.pctFis.toFixed(2)}%</strong> en referencia a la programación.</p>`;
    html += `<p><strong>4.1.2</strong> Se ha cumplido con el registro de la información de seguimiento en el aplicativo CEPLAN V.01, conforme a la normativa vigente.</p>`;
    html += `<p><strong>4.1.3</strong> La trazabilidad de las acciones queda registrada en la bitácora del Sistema de Seguimiento POI del PNC.</p>`;

    html += `<h2>4.2 Recomendaciones</h2>`;
    html += `<p><strong>4.2.1</strong> Se recomienda remitir el presente informe y sus anexos a la Oficina General de Planeamiento y Presupuesto del Ministerio de Vivienda, Construcción y Saneamiento, para los fines correspondientes.</p>`;
    html += `<p><strong>4.2.2</strong> Continuar con el seguimiento mensual de las actividades operativas conforme al cronograma establecido.</p>`;
    html += `<p><strong>4.2.3</strong> Fortalecer las coordinaciones con los responsables de cada centro de costo para mantener el ritmo de ejecución.</p>`;

    html += `<br><p>Es todo cuanto informo a usted para su conocimiento.</p><br>`;
    html += `<p>Atentamente,</p><br><br>`;
    if (currentUser) {
      html += `<p><strong>${currentUser.nombre}</strong><br>`;
      html += `${currentUser.cargo || 'Especialista'}<br>`;
      html += `Programa Nuestras Ciudades</p>`;
    }

    html += `</body></html>`;
    return html;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 p-4 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, #FBF1D9 0%, #F5E5B8 100%)',
          border: '1px solid #C9A350',
        }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: 'linear-gradient(135deg, #C9A350 0%, #E5C66D 100%)' }}>
            <span style={{ fontSize: 20 }}>✨</span>
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2" style={{ color: '#1E2A3A' }}>
              Informe Técnico generado con IA
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: '#1E2A3A', color: '#C9A350' }}>
                ✨ IA
              </span>
            </div>
            <div className="text-xs" style={{ color: '#7A6F5C' }}>
              El sistema usa inteligencia artificial para analizar los datos del seguimiento y redactar automáticamente el informe técnico oficial.
            </div>
          </div>
        </div>
        <button onClick={exportarWord}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap"
          style={{ background: '#1E2A3A', color: '#C9A350' }}>
          <Download size={16} /> Exportar a Word
        </button>
      </div>

      {/* Selector de tipo de informe */}
      <Card className="p-5 mb-4">
        <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#7A6F5C' }}>
          Tipo de informe
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setTipoInforme('mensual')}
            className="p-4 rounded-md text-left transition-all"
            style={{
              background: tipoInforme === 'mensual' ? '#FBF1D9' : '#FFFFFF',
              border: tipoInforme === 'mensual' ? '2px solid #C9A350' : '2px solid #E5DDD0',
              cursor: 'pointer',
            }}>
            <div className="flex items-center gap-2 mb-1" style={{ color: '#1E2A3A', fontWeight: 600, fontSize: 14 }}>
              📅 Informe Mensual
            </div>
            <div className="text-xs" style={{ color: '#7A6F5C' }}>
              Análisis del seguimiento POI de un mes específico
            </div>
          </button>

          <button onClick={() => setTipoInforme('acumulado')}
            className="p-4 rounded-md text-left transition-all"
            style={{
              background: tipoInforme === 'acumulado' ? '#FBF1D9' : '#FFFFFF',
              border: tipoInforme === 'acumulado' ? '2px solid #C9A350' : '2px solid #E5DDD0',
              cursor: 'pointer',
            }}>
            <div className="flex items-center gap-2 mb-1" style={{ color: '#1E2A3A', fontWeight: 600, fontSize: 14 }}>
              📊 Informe Acumulado
            </div>
            <div className="text-xs" style={{ color: '#7A6F5C' }}>
              Análisis acumulado desde enero hasta el mes seleccionado
            </div>
          </button>
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Año">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls}>
              {ANIOS_DISPONIBLES.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label={tipoInforme === 'mensual' ? 'Mes' : 'Acumulado hasta el mes de'}>
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className={inputCls}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </Field>
        </div>
        {tipoInforme === 'acumulado' && (
          <div className="mt-2 text-xs italic" style={{ color: '#7A6F5C' }}>
            El informe acumulado incluirá los meses de <strong>enero</strong> a <strong>{MESES[mes - 1].toLowerCase()}</strong> de {year}.
          </div>
        )}
      </Card>

      {/* PREVISUALIZACIÓN DEL INFORME */}
      <Card className="p-8">
        {/* Toggle editar cabecera */}
        <div className="flex justify-end mb-2">
          <button onClick={() => setEditCabecera(!editCabecera)}
            className="text-xs px-3 py-1 rounded-md font-semibold flex items-center gap-1"
            style={{ background: editCabecera ? '#2D7A4E' : '#F0E9D9', color: editCabecera ? '#FFF' : '#1E2A3A' }}>
            {editCabecera ? '✓ Guardar cabecera' : '✏️ Editar cabecera'}
          </button>
        </div>

        {/* Cabecera oficial */}
        <div className="text-center mb-6" style={{ fontStyle: 'italic', fontSize: 10, color: '#7A6F5C' }}>
          <div>"Decenio de la Igualdad de Oportunidades para mujeres y hombres"</div>
          <div>"Año de la Esperanza y el Fortalecimiento de la Democracia"</div>
        </div>

        {/* Número de informe */}
        {editCabecera ? (
          <div className="mb-6 p-3 rounded" style={{ background: '#FBF1D9', border: '1px dashed #C9A350' }}>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>N° Informe</label>
                <input type="text" value={numInforme} onChange={(e) => setNumInforme(e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>Año</label>
                <input type="text" value={year} readOnly className={inputCls} style={{ background: '#F0E9D9' }} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>Siglas / usuario</label>
                <input type="text" value={siglas} onChange={(e) => setSiglas(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="text-base font-bold" style={{ color: '#1E2A3A' }}>
              INFORME TÉCNICO N° {numInforme}-{year}-VIVIENDA/VMVU/PNC/APP - {siglas}
            </div>
          </div>
        )}

        {/* Dirigido a / Asunto / Referencia / Fecha */}
        {editCabecera ? (
          <div className="mb-6 space-y-3 p-3 rounded" style={{ background: '#FBF1D9', border: '1px dashed #C9A350' }}>
            <div>
              <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>Dirigido a (nombre)</label>
              <input type="text" value={dirigidoA} onChange={(e) => setDirigidoA(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>Cargo del destinatario</label>
              <input type="text" value={dirigidoCargo} onChange={(e) => setDirigidoCargo(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>Asunto (se genera automáticamente)</label>
              <input type="text" readOnly value={`Seguimiento del Plan Operativo Institucional ${year} del pliego 037 – MVCS – ${tipoInforme === 'mensual' ? `al mes de ${MESES[mes - 1].toLowerCase()} ${year}` : `acumulado al mes de ${MESES[mes - 1].toLowerCase()} ${year}`}.`} className={inputCls} style={{ background: '#F0E9D9' }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>Referencia 1</label>
              <textarea rows={2} value={referencia1} onChange={(e) => setReferencia1(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>Referencia 2</label>
              <textarea rows={2} value={referencia2} onChange={(e) => setReferencia2(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>Fecha</label>
              <input type="text" value={fechaInforme} onChange={(e) => setFechaInforme(e.target.value)} className={inputCls} />
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed mb-4" style={{ color: '#1E2A3A' }}>
            <div className="mb-3"><strong>A:</strong> {dirigidoA}<br />
              <span className="ml-4">{dirigidoCargo}</span></div>
            <div className="mb-3"><strong>ASUNTO:</strong> Seguimiento del Plan Operativo Institucional {year} del pliego 037 – MVCS – {tipoInforme === 'mensual' ? `al mes de ${MESES[mes - 1].toLowerCase()} ${year}` : `acumulado al mes de ${MESES[mes - 1].toLowerCase()} ${year}`}.</div>
            <div className="mb-3"><strong>REFERENCIA:</strong><br />
              <span className="ml-4">- {referencia1}<br />
              - {referencia2}</span></div>
            <div className="mb-3"><strong>FECHA:</strong> {fechaInforme}</div>
          </div>
        )}

        <p className="text-sm text-justify mb-2" style={{ color: '#1E2A3A' }}>
          Tengo el agrado de dirigirme a usted, en relación a los documentos de la referencia mediante los cuales se solicitó el seguimiento del Plan Operativo Institucional {tipoInforme === 'mensual' ? `al mes de ${MESES[mes - 1].toLowerCase()} ${year}` : `acumulado al mes de ${MESES[mes - 1].toLowerCase()} ${year}`}.
        </p>
        <p className="text-sm text-justify mb-4" style={{ color: '#1E2A3A' }}>
          Sobre el particular debo manifestarle lo siguiente:
        </p>

        {/* Toggle editar introducción */}
        <div className="flex justify-end mb-2">
          <button onClick={() => setEditIntro(!editIntro)}
            className="text-xs px-3 py-1 rounded-md font-semibold flex items-center gap-1"
            style={{ background: editIntro ? '#2D7A4E' : '#F0E9D9', color: editIntro ? '#FFF' : '#1E2A3A' }}>
            {editIntro ? '✓ Guardar introducción' : '✏️ Editar introducción'}
          </button>
        </div>

        {/* I. INTRODUCCIÓN */}
        <ReportSection num="I" title="INTRODUCCIÓN">
          {editIntro ? (
            <div className="space-y-3 p-3 rounded" style={{ background: '#FBF1D9', border: '1px dashed #C9A350' }}>
              <div>
                <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>1.1 (se actualiza con año/mes automáticamente)</label>
                <textarea rows={4} value={intro11} onChange={(e) => setIntro11(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>1.2</label>
                <textarea rows={4} value={intro12} onChange={(e) => setIntro12(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase" style={{ color: '#7A6F5C' }}>1.3</label>
                <textarea rows={3} value={intro13} onChange={(e) => setIntro13(e.target.value)} className={inputCls} />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-justify mb-3" style={{ color: '#1E2A3A' }}>
                <strong>1.1</strong> {intro11}
              </p>
              <p className="text-sm text-justify mb-3" style={{ color: '#1E2A3A' }}>
                <strong>1.2</strong> {intro12}
              </p>
              <p className="text-sm text-justify" style={{ color: '#1E2A3A' }}>
                <strong>1.3</strong> {intro13}
              </p>
            </>
          )}
        </ReportSection>

        {/* II. BASE LEGAL */}
        <ReportSection num="II" title="BASE LEGAL">
          <ul className="text-sm" style={{ color: '#1E2A3A' }}>
            <li className="mb-2"><strong>2.1</strong> Decreto Legislativo 1440 del Sistema Nacional de Presupuesto Público.</li>
            <li className="mb-2"><strong>2.2</strong> Resolución de Presidencia de Consejo Directivo N° 00015-2021-CEPLAN/PCD.</li>
            <li className="mb-2"><strong>2.3</strong> Resolución de Presidencia del Consejo Directivo N° 0016-2019/CEPLAN/PCD.</li>
            <li className="mb-2"><strong>2.4</strong> Resolución Ministerial N° 151-2024-VIVIENDA (PEI 2024-2030).</li>
            <li className="mb-2"><strong>2.5</strong> Resolución Ministerial N° 363-2025-VIVIENDA (POI {year}).</li>
          </ul>
        </ReportSection>

        {/* III. ANÁLISIS */}
        <ReportSection num="III" title="ANÁLISIS">
          <h3 className="text-sm font-bold mt-3 mb-2" style={{ color: '#1E2A3A' }}>3.1. Resumen General del Programa</h3>
          <p className="text-sm text-justify mb-3" style={{ color: '#1E2A3A' }}>
            {tipoInforme === 'mensual' ? `Al cierre del mes de ${MESES[mes - 1].toLowerCase()} de ${year}` : `Al período acumulado al mes de ${MESES[mes - 1].toLowerCase()} de ${year}`}, el Programa Nuestras Ciudades (PNC) tiene el Presupuesto Institucional Modificado (PIM) que asciende a <strong>{fmtMoney(totales.pim)}</strong> de los cuales se tiene un avance de ejecución financiera el importe de <strong>{fmtMoney(totales.ejecFin)}</strong>, que representa un avance de ejecución de <strong>{totales.pctFin.toFixed(2)}%</strong>. Por otro lado, se tiene una ejecución de meta física promedio de <strong>{totales.pctFis.toFixed(2)}%</strong>.
          </p>

          <div className="mb-4 grid grid-cols-3 gap-2 p-3 rounded" style={{ background: '#FAF7F0', borderLeft: '4px solid #C9A350' }}>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>PIA:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(totales.pia)}</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Modificaciones:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(totales.totalMods)}</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>PIM:</span> <strong style={{ color: '#1E2A3A' }}>{fmtMoney(totales.pim)}</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Ejec. financiera:</span> <strong style={{ color: '#2D7A4E' }}>{fmtMoney(totales.ejecFin)}</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>% Financiero:</span> <strong style={{ color: '#1E2A3A' }}>{totales.pctFin.toFixed(2)}%</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Actividades:</span> <strong style={{ color: '#1E2A3A' }}>{totales.actividades}</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>Ejec. física:</span> <strong style={{ color: '#2D7A4E' }}>{totales.pctFis.toFixed(2)}%</strong></div>
            <div className="text-xs"><span style={{ color: '#7A6F5C' }}>% Físico:</span> <strong style={{ color: '#1E2A3A' }}>{totales.pctFis.toFixed(2)}%</strong></div>
          </div>

          {/* ============================================================
             GRÁFICOS DEL RESUMEN GENERAL
             - Mensual: solo circular (donut)
             - Acumulado: circular + barras superpuestas
          ============================================================ */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Gráfico circular de avance financiero */}
            <div className="p-4 rounded" style={{ background: '#FFFFFF', border: '1px solid #E5DDD0' }}>
              <div className="text-xs font-semibold mb-2 text-center" style={{ color: '#1E2A3A' }}>📊 Avance de Ejecución Financiera</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={[
                    { name: 'Ejecutado', value: Math.round(totales.ejecFin), fill: '#C9A350' },
                    { name: 'Por ejecutar', value: Math.max(0, Math.round(totales.pim - totales.ejecFin)), fill: '#E5DDD0' },
                  ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {[{ fill: '#C9A350' }, { fill: '#E5DDD0' }].map((e, i) => (<Cell key={i} fill={e.fill} />))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtMoney(v)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center text-xs mt-1" style={{ color: '#7A6F5C' }}>
                <strong style={{ color: '#1E2A3A', fontSize: 18 }}>{totales.pctFin.toFixed(2)}%</strong>
                <div>de ejecución del PIM ({fmtMoney(totales.pim)})</div>
              </div>
            </div>

            {/* Gráfico circular de avance físico */}
            <div className="p-4 rounded" style={{ background: '#FFFFFF', border: '1px solid #E5DDD0' }}>
              <div className="text-xs font-semibold mb-2 text-center" style={{ color: '#1E2A3A' }}>📈 Avance de Ejecución Física</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={[
                    { name: 'Ejecutado', value: Math.min(100, Number(totales.pctFis.toFixed(2))), fill: '#2D7A4E' },
                    { name: 'Pendiente', value: Math.max(0, 100 - Number(totales.pctFis.toFixed(2))), fill: '#E5DDD0' },
                  ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {[{ fill: '#2D7A4E' }, { fill: '#E5DDD0' }].map((e, i) => (<Cell key={i} fill={e.fill} />))}
                  </Pie>
                  <Tooltip formatter={(v) => v + '%'} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center text-xs mt-1" style={{ color: '#7A6F5C' }}>
                <strong style={{ color: '#1E2A3A', fontSize: 18 }}>{totales.pctFis.toFixed(2)}%</strong>
                <div>de ejecución física promedio</div>
              </div>
            </div>
          </div>

          {/* Acumulado: SOLO acumulado tiene barras superpuestas del Resumen General */}
          {tipoInforme === 'acumulado' && (
            <div className="p-4 rounded mb-4" style={{ background: '#FFFFFF', border: '1px solid #E5DDD0' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: '#1E2A3A' }}>💰 PIM vs Ejecución por Centro de Costo</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={indicadoresPorCC.map(ind => ({
                  cc: ind.nombre.length > 14 ? ind.nombre.substring(0, 12) + '…' : ind.nombre,
                  ccCompleto: ind.nombre,
                  PIM: Math.round(ind.pim),
                  Ejecutado: Math.round(ind.ejecFin),
                }))} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" />
                  <XAxis dataKey="cc" tick={{ fontSize: 10, fill: '#1E2A3A' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#7A6F5C' }} tickFormatter={(v) => fmtMoneyShort(v)} />
                  <Tooltip formatter={(v) => fmtMoney(v)} labelFormatter={(l, p) => p[0]?.payload?.ccCompleto || l} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {/* barColor con barSize para superposición de Ejecutado sobre PIM */}
                  <Bar dataKey="PIM" fill="#1E2A3A" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="Ejecutado" fill="#C9A350" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Evolución mensual (acumulado) */}
          {tipoInforme === 'acumulado' && (
            <>
              <h3 className="text-sm font-bold mt-4 mb-2" style={{ color: '#1E2A3A' }}>📈 Evolución mensual de la ejecución</h3>
              <p className="text-xs mb-3" style={{ color: '#7A6F5C' }}>
                Comparativa mensual entre lo programado y lo ejecutado, tanto en avance físico como financiero.
              </p>

              {/* Gráfico FINANCIERO mensual: barras superpuestas Programado vs Ejecutado */}
              <div className="p-4 rounded mb-4" style={{ background: '#FFFFFF', border: '1px solid #E5DDD0' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: '#1E2A3A' }}>
                  💰 Avance FINANCIERO mensual (Programado vs Ejecutado)
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={evolucionMensual.map(e => ({
                    mes: MESES_ABR[e.mes - 1],
                    mesCompleto: e.mesNombre,
                    Programado: Math.round(e.progFinanciero),
                    Ejecutado: Math.round(e.ejecFinanciero),
                  }))} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#1E2A3A' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#7A6F5C' }} tickFormatter={(v) => fmtMoneyShort(v)} />
                    <Tooltip formatter={(v) => fmtMoney(v)} labelFormatter={(l, p) => p[0]?.payload?.mesCompleto || l} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {/* Superposición: Programado ancha + Ejecutado angosta encima */}
                    <Bar dataKey="Programado" fill="#1E2A3A" radius={[4, 4, 0, 0]} barSize={28} />
                    <Bar dataKey="Ejecutado" fill="#C9A350" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico FÍSICO mensual: barras superpuestas */}
              <div className="p-4 rounded mb-4" style={{ background: '#FFFFFF', border: '1px solid #E5DDD0' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: '#1E2A3A' }}>
                  📊 Avance FÍSICO mensual (Programado vs Ejecutado)
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={evolucionMensual.map(e => ({
                    mes: MESES_ABR[e.mes - 1],
                    mesCompleto: e.mesNombre,
                    Programado: Number(e.progFisico.toFixed(2)),
                    Ejecutado: Number(e.ejecFisico.toFixed(2)),
                  }))} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#1E2A3A' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#7A6F5C' }} />
                    <Tooltip labelFormatter={(l, p) => p[0]?.payload?.mesCompleto || l} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Programado" fill="#1E2A3A" radius={[4, 4, 0, 0]} barSize={28} />
                    <Bar dataKey="Ejecutado" fill="#2D7A4E" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla detallada de evolución */}
              <table className="w-full text-xs mb-4" style={{ borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#1E2A3A', color: '#fff' }}>
                  <th className="p-2 text-left">Mes</th>
                  <th className="p-2 text-right">Prog. Financ.</th>
                  <th className="p-2 text-right">Ejec. Financ.</th>
                  <th className="p-2 text-right">% Fin.</th>
                  <th className="p-2 text-right">Prog. Físico</th>
                  <th className="p-2 text-right">Ejec. Físico</th>
                  <th className="p-2 text-right">% Fís.</th>
                </tr></thead>
                <tbody>
                  {evolucionMensual.filter(e => e.ejecFinanciero > 0 || e.ejecFisico > 0 || e.progFinanciero > 0).map(e => {
                    const pctFin = e.progFinanciero > 0 ? (e.ejecFinanciero / e.progFinanciero * 100) : 0;
                    const pctFis = e.progFisico > 0 ? (e.ejecFisico / e.progFisico * 100) : 0;
                    return (
                      <tr key={e.mes} style={{ borderBottom: '1px solid #E5DDD0' }}>
                        <td className="p-2"><strong>{e.mesNombre}</strong></td>
                        <td className="p-2 text-right">{fmtMoney(e.progFinanciero)}</td>
                        <td className="p-2 text-right">{fmtMoney(e.ejecFinanciero)}</td>
                        <td className="p-2 text-right"><strong>{pctFin.toFixed(1)}%</strong></td>
                        <td className="p-2 text-right">{e.progFisico.toFixed(2)}</td>
                        <td className="p-2 text-right">{e.ejecFisico.toFixed(2)}</td>
                        <td className="p-2 text-right"><strong>{pctFis.toFixed(1)}%</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* 3.2 Por CC */}
          <h3 className="text-sm font-bold mt-4 mb-3" style={{ color: '#1E2A3A' }}>3.2. Avance por Unidades (Centros de Costo)</h3>
          <p className="text-sm text-justify mb-3" style={{ color: '#1E2A3A' }}>
            A continuación, se presenta el desglose del avance físico y financiero por cada unidad responsable del programa.
          </p>

          {indicadoresPorCC.map((ind, idx) => {
            const desc = descripcionesCC[ind.nombre] || '';
            const logros = recolectarLogros(ind.seguimientos, ind.actividadesData);
            const periodoCC = tipoInforme === 'mensual'
              ? `En el mes de ${MESES[mes - 1].toLowerCase()} de ${year}`
              : `En el período acumulado al mes de ${MESES[mes - 1].toLowerCase()} de ${year}`;
            const resumenConsolidado = construirResumenCC(ind, periodoCC);

            return (
              <div key={ind.nombre} className="mb-6 pb-4" style={{ borderBottom: '1px solid #E5DDD0' }}>
                <h4 className="text-sm font-bold mb-2" style={{ color: '#9C7A2B' }}>3.2.{idx + 1}. {ind.nombre}</h4>
                {desc && <p className="text-sm text-justify mb-2" style={{ color: '#1E2A3A' }}>{desc}</p>}

                <p className="text-sm text-justify mb-3 p-3 rounded" style={{ color: '#1E2A3A', background: '#FAF7F0', borderLeft: '3px solid #C9A350' }}>
                  <strong>Resumen de resultados:</strong> {resumenConsolidado}
                </p>

                <div className="grid grid-cols-3 gap-2 mb-3 p-2 rounded" style={{ background: '#FAF7F0', fontSize: 11 }}>
                  <div><span style={{ color: '#7A6F5C' }}>PIA:</span> <strong>{fmtMoney(ind.pia)}</strong></div>
                  <div><span style={{ color: '#7A6F5C' }}>PIM:</span> <strong>{fmtMoney(ind.pim)}</strong></div>
                  <div><span style={{ color: '#7A6F5C' }}>Ejec. financiera:</span> <strong>{fmtMoney(ind.ejecFin)}</strong></div>
                  <div><span style={{ color: '#7A6F5C' }}>% Fin.:</span> <strong>{ind.pctFin.toFixed(2)}%</strong></div>
                  <div><span style={{ color: '#7A6F5C' }}>Ejec. física:</span> <strong>{ind.pctFis.toFixed(1)}%</strong></div>
                  <div><span style={{ color: '#7A6F5C' }}>Activ.:</span> <strong>{ind.actividades}</strong></div>
                </div>

                {/* Gráfico PIM vs Ejecución */}
                <div className="p-3 rounded mb-3" style={{ background: '#FFFFFF', border: '1px solid #E5DDD0' }}>
                  <div className="text-[11px] font-semibold mb-2 text-center" style={{ color: '#1E2A3A' }}>
                    📊 PIM vs Ejecución
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={[
                      {
                        categoria: 'Financiero',
                        Programado: Math.round(ind.pim),
                        Ejecutado: Math.round(ind.ejecFin),
                      },
                    ]} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD0" />
                      <XAxis dataKey="categoria" tick={{ fontSize: 10, fill: '#1E2A3A' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#7A6F5C' }} tickFormatter={(v) => fmtMoneyShort(v)} />
                      <Tooltip formatter={(v) => fmtMoney(v)} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Programado" fill="#1E2A3A" radius={[4, 4, 0, 0]} barSize={80} />
                      <Bar dataKey="Ejecutado" fill="#C9A350" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-center text-[11px]">
                    <div>
                      <div style={{ color: '#7A6F5C' }}>% Financiero</div>
                      <strong style={{ color: '#1E2A3A', fontSize: 14 }}>{ind.pctFin.toFixed(2)}%</strong>
                    </div>
                    <div>
                      <div style={{ color: '#7A6F5C' }}>% Físico</div>
                      <strong style={{ color: '#1E2A3A', fontSize: 14 }}>{ind.pctFis.toFixed(2)}%</strong>
                    </div>
                  </div>
                </div>

                {logros.length > 0 && (
                  <>
                    <p className="text-sm font-bold mb-1" style={{ color: '#1E2A3A' }}>
                      Principales logros:
                    </p>
                    <ul className="text-sm ml-4 mb-3" style={{ color: '#1E2A3A' }}>
                      {logros.map((l, i) => (
                        <li key={i} className="mb-2">
                          • <strong>{l.codigoAOI}</strong>
                          {l.unidadMedida && <span style={{ color: '#7A6F5C' }}> ({l.unidadMedida}, avance acumulado: {l.avanceFisAcum.toFixed(2)})</span>}
                          : {l.texto}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </ReportSection>

        {/* IV. CONCLUSIONES Y RECOMENDACIONES */}
        <ReportSection num="IV" title="CONCLUSIONES Y RECOMENDACIONES">
          <h3 className="text-sm font-bold mb-2" style={{ color: '#1E2A3A' }}>4.1 Conclusiones</h3>
          <p className="text-sm text-justify mb-2" style={{ color: '#1E2A3A' }}>
            <strong>4.1.1</strong> El Programa Nuestras Ciudades, {tipoInforme === 'mensual' ? `al culminar el mes de ${MESES[mes - 1].toLowerCase()} de ${year}` : `al período acumulado al mes de ${MESES[mes - 1].toLowerCase()} de ${year}`} ha alcanzado una ejecución presupuestal de <strong>{fmtMoney(totales.ejecFin)}</strong> que representa el <strong>{totales.pctFin.toFixed(2)}%</strong> del PIM. Asimismo, se tiene un avance de la ejecución física promedio de <strong>{totales.pctFis.toFixed(2)}%</strong>.
          </p>
          <p className="text-sm text-justify mb-2" style={{ color: '#1E2A3A' }}>
            <strong>4.1.2</strong> Se ha cumplido con el registro de la información de seguimiento en el aplicativo CEPLAN V.01.
          </p>
          <p className="text-sm text-justify mb-4" style={{ color: '#1E2A3A' }}>
            <strong>4.1.3</strong> La trazabilidad de las acciones queda registrada en la bitácora del sistema.
          </p>

          <h3 className="text-sm font-bold mb-2" style={{ color: '#1E2A3A' }}>4.2 Recomendaciones</h3>
          <p className="text-sm text-justify mb-2" style={{ color: '#1E2A3A' }}>
            <strong>4.2.1</strong> Se recomienda remitir el presente informe a la Oficina General de Planeamiento y Presupuesto del MVCS.
          </p>
          <p className="text-sm text-justify mb-2" style={{ color: '#1E2A3A' }}>
            <strong>4.2.2</strong> Continuar con el seguimiento mensual de las actividades operativas.
          </p>
          <p className="text-sm text-justify mb-4" style={{ color: '#1E2A3A' }}>
            <strong>4.2.3</strong> Fortalecer las coordinaciones con los responsables de cada centro de costo.
          </p>
        </ReportSection>

        <p className="text-sm mt-6 mb-4" style={{ color: '#1E2A3A' }}>Es todo cuanto informo a usted para su conocimiento.</p>
        <p className="text-sm mb-8" style={{ color: '#1E2A3A' }}>Atentamente,</p>

        {currentUser && (
          <div className="text-sm" style={{ color: '#1E2A3A' }}>
            <div className="font-bold">{currentUser.nombre}</div>
            <div>{currentUser.cargo || 'Especialista'}</div>
            <div>Programa Nuestras Ciudades</div>
          </div>
        )}
      </Card>
    </>
  );
}


function ReportSection({ num, title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold pb-2 mb-4" style={{ color: '#1E2A3A', borderBottom: '2px solid #C9A350' }}>
        {num}. {title}
      </h2>
      {children}
    </div>
  );
}

function ActividadBloque({ actividad, registros, campo, mesesIncluir }) {
  return (
    <div className="mb-5">
      <div className="mb-2">
        <span className="text-xs font-mono" style={{ color: '#9C7A2B' }}>{actividad.codigoAOI}: </span>
        <span className="text-sm font-semibold" style={{ color: '#1E2A3A' }}>{actividad.nombre}</span>
        <span className="text-xs ml-2" style={{ color: '#7A6F5C' }}>(UM: {actividad.unidadMedida})</span>
      </div>
      <div className="pl-4 space-y-2">
        {mesesIncluir.map(m => {
          const r = registros.find(x => x.mes === m);
          return (
            <div key={m}>
              <span className="text-xs font-semibold" style={{ color: '#9C7A2B' }}>{MESES[m - 1]}: </span>
              <span className="text-sm" style={{ color: '#1E2A3A' }}>
                {r?.[campo] || <em style={{ color: '#9C9080' }}>Sin registro para el periodo.</em>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModifTablaPorAOI({ mods, acts }) {
  const byAOI = {};
  mods.forEach(m => {
    if (!byAOI[m.codigoAOI]) byAOI[m.codigoAOI] = [];
    byAOI[m.codigoAOI].push(m);
  });
  return (
    <div className="space-y-4">
      {Object.entries(byAOI).map(([aoi, items]) => {
        const act = acts.find(a => a.codigoAOI === aoi);
        const porTipo = {};
        items.forEach(it => {
          if (!porTipo[it.tipo]) porTipo[it.tipo] = [];
          porTipo[it.tipo].push(it);
        });
        return (
          <div key={aoi}>
            <div className="text-sm font-semibold mb-2" style={{ color: '#1E2A3A' }}>
              Actividad Operativa: {aoi}
              {act && <span className="font-normal text-xs ml-2" style={{ color: '#7A6F5C' }}>— {act.nombre}</span>}
            </div>
            {Object.entries(porTipo).map(([tipo, lista]) => {
              const sum = lista.reduce((s, l) => s + (Number(l.importe) || 0), 0);
              return (
                <div key={tipo} className="mb-3">
                  <div className="text-xs font-semibold mb-1" style={{ color: '#9C7A2B' }}>{tipo}:</div>
                  <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#1E2A3A' }}>
                        <th className="text-left px-2 py-1.5" style={{ color: '#F5F1E8' }}>Clasificador</th>
                        <th className="text-right px-2 py-1.5" style={{ color: '#F5F1E8' }}>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map(l => (
                        <tr key={l.id} className="border-b" style={{ borderColor: '#E5DDD0' }}>
                          <td className="px-2 py-1.5" style={{ color: '#1E2A3A' }}>{l.clasificador}</td>
                          <td className="px-2 py-1.5 text-right" style={{ color: '#1E2A3A' }}>{fmtMoney(l.importe)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#F0E9D9' }}>
                        <td className="px-2 py-1.5 font-bold" style={{ color: '#1E2A3A' }}>Total</td>
                        <td className="px-2 py-1.5 text-right font-bold" style={{ color: '#1E2A3A' }}>{fmtMoney(sum)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   CONFIGURACIÓN DE PERIODOS DE REGISTRO
============================================================ */
function ConfigPeriodos({ periodos, savePeriodos }) {
  const [year, setYear] = useState(2026);
  const [editing, setEditing] = useState(null);

  function getRow(mes) {
    return periodos.find(p => p.anio === year && p.mes === mes) || {
      id: '', anio: year, mes, fechaApertura: '', horaApertura: '',
      fechaCierre: '', horaCierre: '', estadoForzado: 'auto'
    };
  }

  function openEdit(mes) {
    const existing = periodos.find(p => p.anio === year && p.mes === mes);
    setEditing(existing
      ? JSON.parse(JSON.stringify({ horaApertura: '00:00', horaCierre: '23:59', ...existing }))
      : {
          id: uid(), anio: year, mes,
          fechaApertura: '', horaApertura: '00:00',
          fechaCierre: '', horaCierre: '23:59',
          estadoForzado: 'auto'
        });
  }

  async function handleSave() {
    const exists = periodos.find(p => p.id === editing.id);
    const next = exists
      ? periodos.map(p => p.id === editing.id ? editing : p)
      : [...periodos, editing];
    await savePeriodos(next);
    setEditing(null);
  }

  async function aplicarPlantilla() {
    if (!confirm('Esto generará una configuración estándar: cada mes apertura el día 1 del mes siguiente a las 08:00 y cierra el día 15 a las 18:00. ¿Continuar?')) return;
    const next = [...periodos.filter(p => p.anio !== year)];
    for (let m = 1; m <= 12; m++) {
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? year + 1 : year;
      const mm = String(nextMonth).padStart(2, '0');
      next.push({
        id: uid(), anio: year, mes: m,
        fechaApertura: `${nextYear}-${mm}-01`, horaApertura: '08:00',
        fechaCierre: `${nextYear}-${mm}-15`, horaCierre: '18:00',
        estadoForzado: 'auto',
      });
    }
    await savePeriodos(next);
  }

  return (
    <>
      <PageHeader title="Periodos de registro" subtitle="Administración de fechas y horarios"
        action={
          <button onClick={aplicarPlantilla}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
            style={{ background: '#C9A350', color: '#1E2A3A' }}>
            <CalendarClock size={16} /> Aplicar plantilla estándar
          </button>
        } />

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider font-medium" style={{ color: '#7A6F5C' }}>Año:</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 px-3 py-1.5 rounded-md border text-sm" style={{ borderColor: '#E5DDD0' }}>
            {ANIOS_DISPONIBLES.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="text-xs ml-3" style={{ color: '#7A6F5C' }}>
            Fecha actual del sistema: <strong>{HOY} {HORA_ACTUAL}</strong>
          </span>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Mes</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Apertura</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Cierre</th>
                <th className="text-center px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Estado</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Detalle</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {MESES.map((m, i) => {
                const row = getRow(i + 1);
                const info = getEstadoPeriodo(periodos, year, i + 1);
                const badge =
                  info.estado === 'abierto' ? { bg: '#D8EBD3', color: '#2D7A4E', txt: 'Abierto', icon: Unlock } :
                  info.estado === 'cerrado' ? { bg: '#F5D5D5', color: '#B33B3B', txt: 'Cerrado', icon: Lock } :
                  info.estado === 'por_abrir' ? { bg: '#FBF1D9', color: '#9C7A2B', txt: 'Por abrir', icon: Clock } :
                  { bg: '#F0E9D9', color: '#7A6F5C', txt: 'Sin configurar', icon: AlertCircle };
                const Icon = badge.icon;
                return (
                  <tr key={i} className="border-b last:border-b-0" style={{ borderColor: '#E5DDD0' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#1E2A3A' }}>{m}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: row.fechaApertura ? '#1E2A3A' : '#9C9080' }}>
                      {row.fechaApertura
                        ? <>{row.fechaApertura} <strong style={{ color: '#9C7A2B' }}>{row.horaApertura || '00:00'}</strong></>
                        : 'No configurado'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: row.fechaCierre ? '#1E2A3A' : '#9C9080' }}>
                      {row.fechaCierre
                        ? <>{row.fechaCierre} <strong style={{ color: '#9C7A2B' }}>{row.horaCierre || '23:59'}</strong></>
                        : 'No configurado'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold"
                        style={{ background: badge.bg, color: badge.color }}>
                        <Icon size={11} /> {badge.txt}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#7A6F5C' }}>{info.motivo}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(i + 1)}
                        className="p-1.5 rounded hover:bg-stone-200" title="Configurar">
                        <Edit3 size={14} style={{ color: '#1E2A3A' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
          <div className="rounded-lg max-w-xl w-full" style={{ background: '#FAF7F0' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5DDD0' }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
                Configurar {MESES[editing.mes - 1]} {editing.anio}
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha de apertura">
                  <input type="date" value={editing.fechaApertura}
                    onChange={(e) => setEditing({ ...editing, fechaApertura: e.target.value })}
                    className={inputCls} />
                </Field>
                <Field label="Hora de apertura">
                  <input type="time" value={editing.horaApertura || ''}
                    onChange={(e) => setEditing({ ...editing, horaApertura: e.target.value })}
                    className={inputCls} />
                </Field>
                <Field label="Fecha de cierre">
                  <input type="date" value={editing.fechaCierre}
                    onChange={(e) => setEditing({ ...editing, fechaCierre: e.target.value })}
                    className={inputCls} />
                </Field>
                <Field label="Hora de cierre">
                  <input type="time" value={editing.horaCierre || ''}
                    onChange={(e) => setEditing({ ...editing, horaCierre: e.target.value })}
                    className={inputCls} />
                </Field>
              </div>
              <Field label="Estado forzado (opcional)">
                <select value={editing.estadoForzado || 'auto'}
                  onChange={(e) => setEditing({ ...editing, estadoForzado: e.target.value })}
                  className={inputCls}>
                  <option value="auto">Automático (según fecha y hora)</option>
                  <option value="abierto">Forzar abierto</option>
                  <option value="cerrado">Forzar cerrado</option>
                </select>
              </Field>
              <div className="p-3 rounded-md text-xs" style={{ background: '#F0E9D9', color: '#7A6F5C' }}>
                El sistema verifica fecha + hora para determinar automáticamente el estado del periodo. Por ejemplo: si la apertura es el 1 de abril a las 08:00 y el cierre es el 15 de abril a las 18:00, el periodo estará disponible solo en ese rango exacto.
              </div>
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: '#E5DDD0' }}>
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-md text-sm" style={{ color: '#1E2A3A' }}>Cancelar</button>
              <button onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
                style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   GESTIÓN DE SOLICITUDES
============================================================ */
function Solicitudes({ solicitudes, saveSolicitudes, reprogramaciones, saveReprogramaciones, periodos, savePeriodos, activities, usuarios, logAuditoria, notificar }) {
  const [tab, setTab] = useState('apertura'); // 'apertura' o 'reprogramacion'
  const [filtro, setFiltro] = useState('pendiente');
  const [verDetalle, setVerDetalle] = useState(null);
  const [verReprog, setVerReprog] = useState(null);

  const tiposLabel = {
    reapertura: 'Reapertura',
    ampliacion: 'Ampliación de plazo',
    apertura_anticipada: 'Apertura anticipada',
  };

  const filtradas = filtro === 'todas' ? solicitudes : solicitudes.filter(s => s.estado === filtro);
  const ordenadas = [...filtradas].sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud));

  // Eliminar TODAS las solicitudes de apertura/ampliación
  async function eliminarTodasSolicitudes() {
    if (solicitudes.length === 0) return;
    if (!confirm(`¿Eliminar TODAS las solicitudes (${solicitudes.length})?\n\nEsta acción no se puede deshacer.`)) return;
    await saveSolicitudes([]);
    if (logAuditoria) await logAuditoria('eliminar_todas_solicitudes', 'Eliminó todas las solicitudes de apertura/ampliación', {});
  }

  // Reprogramaciones
  const reprogFiltro = filtro === 'pendiente' ? 'solicitada' :
                        filtro === 'aprobada' ? 'aprobada' :
                        filtro === 'rechazada' ? 'rechazada' : 'todas';
  const reprogsFiltradas = reprogFiltro === 'todas' ? reprogramaciones :
                            reprogramaciones.filter(r => r.estado === reprogFiltro);
  const reprogsOrdenadas = [...reprogsFiltradas].sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud));

  async function aprobar(sol) {
    const resp = prompt('Mensaje de respuesta (opcional):', 'Solicitud aprobada. Se ha actualizado el periodo correspondiente.');
    if (resp === null) return;
    const dias = sol.diasSolicitados || 5;
    const periodoExistente = periodos.find(p => p.anio === sol.anio && p.mes === sol.mes);
    let nuevosPeriodos;
    if (periodoExistente) {
      const newCierre = sumarDias(HOY, dias);
      nuevosPeriodos = periodos.map(p =>
        (p.anio === sol.anio && p.mes === sol.mes)
          ? { ...p, fechaCierre: newCierre, horaCierre: '23:59', estadoForzado: 'auto' }
          : p);
    } else {
      nuevosPeriodos = [...periodos, {
        id: uid(), anio: sol.anio, mes: sol.mes,
        fechaApertura: HOY, horaApertura: '00:00',
        fechaCierre: sumarDias(HOY, dias), horaCierre: '23:59',
        estadoForzado: 'auto',
      }];
    }
    await savePeriodos(nuevosPeriodos);
    const nuevasSol = solicitudes.map(s =>
      s.id === sol.id
        ? { ...s, estado: 'aprobada', respuestaAdmin: resp, fechaRespuesta: new Date().toISOString() }
        : s);
    await saveSolicitudes(nuevasSol);

    // Auditoría
    if (logAuditoria) {
      await logAuditoria('aprobar_solicitud',
        `Aprobó solicitud de ${sol.solicitante} para ${MESES[sol.mes-1]} ${sol.anio} (${sol.centroCosto})`,
        { solicitudId: sol.id, dias });
    }
    // Notificar al solicitante
    if (notificar) {
      const dest = usuariosDelCC(usuarios, sol.centroCosto);
      await notificar({
        destinatarios: dest,
        tipo: 'solicitud_aprobada',
        titulo: `Solicitud aprobada — ${MESES[sol.mes-1]} ${sol.anio}`,
        mensaje: `Tu solicitud de ${sol.tipo === 'reapertura' ? 'reapertura' : sol.tipo === 'ampliacion' ? 'ampliación' : 'apertura anticipada'} fue aprobada. ${resp}`,
        link: 'seguimiento',
      });
    }
    setVerDetalle(null);
  }

  async function rechazar(sol) {
    const resp = prompt('Motivo del rechazo:', '');
    if (resp === null || !resp.trim()) return;
    const nuevasSol = solicitudes.map(s =>
      s.id === sol.id
        ? { ...s, estado: 'rechazada', respuestaAdmin: resp, fechaRespuesta: new Date().toISOString() }
        : s);
    await saveSolicitudes(nuevasSol);

    if (logAuditoria) {
      await logAuditoria('rechazar_solicitud',
        `Rechazó solicitud de ${sol.solicitante} para ${MESES[sol.mes-1]} ${sol.anio}`,
        { solicitudId: sol.id, motivo: resp });
    }
    if (notificar) {
      const dest = usuariosDelCC(usuarios, sol.centroCosto);
      await notificar({
        destinatarios: dest,
        tipo: 'solicitud_rechazada',
        titulo: `Solicitud rechazada — ${MESES[sol.mes-1]} ${sol.anio}`,
        mensaje: `Tu solicitud fue rechazada. Motivo: ${resp}`,
        link: 'mis_solicitudes',
      });
    }
    setVerDetalle(null);
  }

  const counts = {
    pendiente: solicitudes.filter(s => s.estado === 'pendiente').length,
    aprobada: solicitudes.filter(s => s.estado === 'aprobada').length,
    rechazada: solicitudes.filter(s => s.estado === 'rechazada').length,
    todas: solicitudes.length,
  };

  const reprogCounts = {
    pendiente: reprogramaciones.filter(r => r.estado === 'solicitada').length,
    aprobada: reprogramaciones.filter(r => r.estado === 'aprobada').length,
    rechazada: reprogramaciones.filter(r => r.estado === 'rechazada').length,
    cerrada: reprogramaciones.filter(r => r.estado === 'cerrada').length,
    todas: reprogramaciones.length,
  };

  return (
    <>
      <PageHeader title="Solicitudes" subtitle="Apertura de periodos y reprogramaciones POI"
        action={
          tab === 'apertura' && solicitudes.length > 0 ? (
            <button onClick={eliminarTodasSolicitudes}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ background: '#F5D5D5', color: '#B33B3B' }}
              title="Eliminar todas las solicitudes">
              <Trash2 size={16} /> Eliminar todas
            </button>
          ) : null
        } />

      {/* Tabs principales */}
      <Card className="p-2 mb-4">
        <div className="flex gap-2">
          <button onClick={() => setTab('apertura')}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold flex-1 justify-center"
            style={{
              background: tab === 'apertura' ? '#1E2A3A' : 'transparent',
              color: tab === 'apertura' ? '#F5F1E8' : '#1E2A3A',
            }}>
            <MailOpen size={16} /> Apertura / Ampliación de plazo
            {counts.pendiente > 0 && tab !== 'apertura' &&
              <span className="ml-1 px-1.5 rounded-full text-xs font-bold"
                style={{ background: '#C9A350', color: '#1E2A3A' }}>{counts.pendiente}</span>}
          </button>
          <button onClick={() => setTab('reprogramacion')}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold flex-1 justify-center"
            style={{
              background: tab === 'reprogramacion' ? '#1E2A3A' : 'transparent',
              color: tab === 'reprogramacion' ? '#F5F1E8' : '#1E2A3A',
            }}>
            <RefreshCw size={16} /> Reprogramación POI
            {reprogCounts.pendiente > 0 && tab !== 'reprogramacion' &&
              <span className="ml-1 px-1.5 rounded-full text-xs font-bold"
                style={{ background: '#C9A350', color: '#1E2A3A' }}>{reprogCounts.pendiente}</span>}
          </button>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} style={{ color: '#7A6F5C' }} />
          <span className="text-xs uppercase tracking-wider font-medium mr-2" style={{ color: '#7A6F5C' }}>Estado:</span>
          {[
            { id: 'pendiente', label: 'Pendientes', color: '#FBF1D9', activeColor: '#C9A350' },
            { id: 'aprobada', label: 'Aprobadas', color: '#D8EBD3', activeColor: '#2D7A4E' },
            { id: 'rechazada', label: 'Rechazadas', color: '#F5D5D5', activeColor: '#B33B3B' },
            { id: 'todas', label: 'Todas', color: '#F0E9D9', activeColor: '#1E2A3A' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors"
              style={{
                background: filtro === f.id ? f.activeColor : f.color,
                color: filtro === f.id ? '#F5F1E8' : '#1E2A3A',
              }}>
              {f.label} ({tab === 'apertura' ? counts[f.id] : reprogCounts[f.id === 'pendiente' ? 'pendiente' : f.id] || 0})
            </button>
          ))}
        </div>
      </Card>

      {tab === 'apertura' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Fecha</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Tipo</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Periodo</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Solicitante</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>CC / AOI</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-sm" style={{ color: '#7A6F5C' }}>
                    No hay solicitudes en este filtro.
                  </td></tr>
                )}
                {ordenadas.map(s => {
                  const badge =
                    s.estado === 'pendiente' ? { bg: '#FBF1D9', color: '#9C7A2B', icon: Clock } :
                    s.estado === 'aprobada' ? { bg: '#D8EBD3', color: '#2D7A4E', icon: Check } :
                    { bg: '#F5D5D5', color: '#B33B3B', icon: XCircle };
                  const Icon = badge.icon;
                  return (
                    <tr key={s.id} className="border-b last:border-b-0 hover:bg-stone-50" style={{ borderColor: '#E5DDD0' }}>
                      <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>{s.fechaSolicitud.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>{tiposLabel[s.tipo] || s.tipo}</td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: '#1E2A3A' }}>{MESES[s.mes-1]} {s.anio}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>
                        <div className="font-medium">{s.solicitante}</div>
                        <div style={{ color: '#7A6F5C' }}>{s.cargo}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Pill>{s.centroCosto}</Pill>
                        <div className="font-mono mt-1" style={{ color: '#7A6F5C' }}>{s.codigoAOI}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold"
                          style={{ background: badge.bg, color: badge.color }}>
                          <Icon size={11} /> {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setVerDetalle(s)}
                          className="text-xs px-3 py-1.5 rounded-md font-medium"
                          style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'reprogramacion' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Fecha</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>CC</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Meses</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Solicitante</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {reprogsOrdenadas.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#7A6F5C' }}>
                    No hay solicitudes de reprogramación en este filtro.
                  </td></tr>
                )}
                {reprogsOrdenadas.map(r => {
                  const stateBadge =
                    r.estado === 'solicitada' ? { bg: '#FBF1D9', color: '#9C7A2B', icon: Clock, txt: 'Solicitada' } :
                    r.estado === 'aprobada' ? { bg: '#D8EBD3', color: '#2D7A4E', icon: Check, txt: 'Aprobada' } :
                    r.estado === 'rechazada' ? { bg: '#F5D5D5', color: '#B33B3B', icon: XCircle, txt: 'Rechazada' } :
                    { bg: '#E0E5EC', color: '#5C6B7F', icon: Lock, txt: 'Cerrada' };
                  const Icon = stateBadge.icon;
                  return (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-stone-50" style={{ borderColor: '#E5DDD0' }}>
                      <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>{r.fechaSolicitud.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <Pill>{r.centroCosto}</Pill>
                        {r.area && <div className="mt-1"><Pill bg="#FBE0D0" color="#A85D2B">{r.area}</Pill></div>}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: '#1E2A3A' }}>
                        {(r.mesesAfectados || []).map(m => MESES[m-1].slice(0,3)).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>
                        <div className="font-medium">{r.solicitante}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold"
                          style={{ background: stateBadge.bg, color: stateBadge.color }}>
                          <Icon size={11} /> {stateBadge.txt}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setVerReprog(r)}
                          className="text-xs px-3 py-1.5 rounded-md font-medium"
                          style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {verDetalle && (
        <DetalleSolicitudModal
          solicitud={verDetalle}
          tiposLabel={tiposLabel}
          onClose={() => setVerDetalle(null)}
          onAprobar={() => aprobar(verDetalle)}
          onRechazar={() => rechazar(verDetalle)}
        />
      )}

      {verReprog && (
        <DetalleReprogModal
          reprog={verReprog}
          reprogramaciones={reprogramaciones}
          saveReprogramaciones={saveReprogramaciones}
          usuarios={usuarios}
          logAuditoria={logAuditoria}
          notificar={notificar}
          onClose={() => setVerReprog(null)}
        />
      )}
    </>
  );
}

function DetalleReprogModal({ reprog, reprogramaciones, saveReprogramaciones, onClose, usuarios, logAuditoria, notificar }) {
  const [fechaApertura, setFechaApertura] = useState(reprog.fechaApertura || HOY);
  const [horaApertura, setHoraApertura] = useState(reprog.horaApertura || '08:00');
  const [fechaCierre, setFechaCierre] = useState(reprog.fechaCierre || sumarDias(HOY, 7));
  const [horaCierre, setHoraCierre] = useState(reprog.horaCierre || '18:00');
  const [mensaje, setMensaje] = useState('');

  async function aprobar() {
    if (!fechaApertura || !fechaCierre) {
      alert('Define la ventana de apertura y cierre');
      return;
    }
    const msg = mensaje || 'Reprogramación aprobada. Tienes habilitada la ventana para modificar la programación.';
    const next = reprogramaciones.map(r => r.id === reprog.id ? {
      ...r,
      estado: 'aprobada',
      fechaApertura, horaApertura,
      fechaCierre, horaCierre,
      respuestaAdmin: msg,
      fechaRespuesta: new Date().toISOString(),
    } : r);
    await saveReprogramaciones(next);
    if (logAuditoria) {
      await logAuditoria('aprobar_reprog',
        `Aprobó reprogramación de ${reprog.solicitante} para ${reprog.centroCosto} (meses ${(reprog.mesesAfectados||[]).map(m => MESES[m-1]).join(', ')})`,
        { reprogId: reprog.id, ventana: `${fechaApertura} ${horaApertura} - ${fechaCierre} ${horaCierre}` });
    }
    if (notificar && usuarios) {
      const dest = usuariosDelCC(usuarios, reprog.centroCosto);
      await notificar({
        destinatarios: dest,
        tipo: 'reprog_aprobada',
        titulo: `Reprogramación aprobada — ${reprog.centroCosto}`,
        mensaje: `Tu solicitud de reprogramación fue aprobada. Ventana: ${fechaApertura} ${horaApertura} hasta ${fechaCierre} ${horaCierre}. ${msg}`,
        link: 'reprogramacion',
      });
    }
    onClose();
  }

  async function rechazar() {
    if (!mensaje.trim()) {
      alert('Indica el motivo del rechazo');
      return;
    }
    const next = reprogramaciones.map(r => r.id === reprog.id ? {
      ...r,
      estado: 'rechazada',
      respuestaAdmin: mensaje,
      fechaRespuesta: new Date().toISOString(),
    } : r);
    await saveReprogramaciones(next);
    if (logAuditoria) {
      await logAuditoria('rechazar_reprog',
        `Rechazó reprogramación de ${reprog.solicitante} para ${reprog.centroCosto}`,
        { reprogId: reprog.id, motivo: mensaje });
    }
    if (notificar && usuarios) {
      const dest = usuariosDelCC(usuarios, reprog.centroCosto);
      await notificar({
        destinatarios: dest,
        tipo: 'reprog_rechazada',
        titulo: `Reprogramación rechazada — ${reprog.centroCosto}`,
        mensaje: `Tu solicitud de reprogramación fue rechazada. Motivo: ${mensaje}`,
        link: 'reprogramacion',
      });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
      <div className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#FAF7F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5DDD0' }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
              Solicitud de reprogramación POI
            </div>
            <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
              Enviada el {reprog.fechaSolicitud.slice(0, 10)} por {reprog.solicitante}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-3 text-sm">
          <DataRow label="Centro de costo" value={reprog.centroCosto} />
          {reprog.area && <DataRow label="Área" value={reprog.area} />}
          <DataRow label="Meses solicitados" value={(reprog.mesesAfectados || []).map(m => MESES[m-1]).join(', ')} />
          <DataRow label="Solicitante" value={reprog.solicitante} />
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>Sustento técnico</div>
            <div className="p-3 rounded-md text-sm leading-relaxed" style={{ background: '#FFFFFF', border: '1px solid #E5DDD0', color: '#1E2A3A' }}>
              {reprog.sustento}
            </div>
          </div>

          {reprog.estado === 'solicitada' && (
            <>
              <div className="pt-3 border-t" style={{ borderColor: '#E5DDD0' }}>
                <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#9C7A2B' }}>
                  Definir ventana de modificación
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha apertura">
                    <input type="date" value={fechaApertura} onChange={(e) => setFechaApertura(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Hora apertura">
                    <input type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Fecha cierre">
                    <input type="date" value={fechaCierre} onChange={(e) => setFechaCierre(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Hora cierre">
                    <input type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </div>
              <Field label="Mensaje de respuesta">
                <textarea rows={3} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className={inputCls}
                  placeholder="Mensaje opcional al aprobar, o motivo si vas a rechazar..." />
              </Field>
            </>
          )}

          {reprog.estado !== 'solicitada' && reprog.respuestaAdmin && (
            <div>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>
                Respuesta ({reprog.fechaRespuesta?.slice(0, 10)})
              </div>
              <div className="p-3 rounded-md text-sm leading-relaxed"
                style={{ background: reprog.estado === 'aprobada' ? '#D8EBD3' : '#F5D5D5', color: '#1E2A3A' }}>
                {reprog.respuestaAdmin}
              </div>
              {reprog.estado === 'aprobada' && (
                <div className="text-xs mt-2" style={{ color: '#7A6F5C' }}>
                  Ventana: <strong>{reprog.fechaApertura} {reprog.horaApertura}</strong> hasta <strong>{reprog.fechaCierre} {reprog.horaCierre}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: '#E5DDD0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm" style={{ color: '#1E2A3A' }}>Cerrar</button>
          {reprog.estado === 'solicitada' && (
            <>
              <button onClick={rechazar}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
                style={{ background: '#B33B3B', color: '#FFFFFF' }}>
                <XCircle size={14} /> Rechazar
              </button>
              <button onClick={aprobar}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
                style={{ background: '#2D7A4E', color: '#FFFFFF' }}>
                <Check size={14} /> Aprobar y abrir ventana
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetalleSolicitudModal({ solicitud: s, tiposLabel, onClose, onAprobar, onRechazar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
      <div className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#FAF7F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5DDD0' }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
              Detalle de solicitud
            </div>
            <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
              Enviada el {s.fechaSolicitud.slice(0, 10)}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-3 text-sm">
          <DataRow label="Tipo de solicitud" value={tiposLabel[s.tipo] || s.tipo} />
          <DataRow label="Periodo solicitado" value={`${MESES[s.mes-1]} ${s.anio}`} />
          <DataRow label="Centro de costo" value={s.centroCosto} />
          <DataRow label="Área" value={s.area || '—'} />
          <DataRow label="Código AOI" value={s.codigoAOI || '—'} />
          <DataRow label="Solicitante" value={s.solicitante} />
          <DataRow label="Cargo" value={s.cargo || '—'} />
          {(s.tipo === 'ampliacion' || s.tipo === 'reapertura') && (
            <DataRow label="Días solicitados" value={s.diasSolicitados} />
          )}
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>Motivo / justificación</div>
            <div className="p-3 rounded-md text-sm leading-relaxed" style={{ background: '#FFFFFF', border: '1px solid #E5DDD0', color: '#1E2A3A' }}>
              {s.motivo}
            </div>
          </div>

          {s.estado !== 'pendiente' && (
            <div>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>
                Respuesta del administrador ({s.fechaRespuesta?.slice(0, 10)})
              </div>
              <div className="p-3 rounded-md text-sm leading-relaxed"
                style={{ background: s.estado === 'aprobada' ? '#D8EBD3' : '#F5D5D5', color: '#1E2A3A' }}>
                {s.respuestaAdmin || '(Sin mensaje)'}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: '#E5DDD0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm" style={{ color: '#1E2A3A' }}>Cerrar</button>
          {s.estado === 'pendiente' && (
            <>
              <button onClick={onRechazar}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
                style={{ background: '#B33B3B', color: '#FFFFFF' }}>
                <XCircle size={14} /> Rechazar
              </button>
              <button onClick={onAprobar}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
                style={{ background: '#2D7A4E', color: '#FFFFFF' }}>
                <Check size={14} /> Aprobar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-xs uppercase tracking-wider w-44 flex-shrink-0" style={{ color: '#7A6F5C' }}>{label}</div>
      <div className="text-sm font-medium" style={{ color: '#1E2A3A' }}>{value}</div>
    </div>
  );
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/* ============================================================
   MIS SOLICITUDES (vista del responsable)
============================================================ */
function ReprogramacionPOI({ activities, saveActivities, progress, reprogramaciones, saveReprogramaciones, periodos, currentUser, usuarios, logAuditoria, notificar }) {
  const ccDisponibles = ccsVisibles(currentUser);
  const esResp = esResponsableCC(currentUser);
  const ccUser = esResp ? currentUser.centroCosto : null;
  const areasUser = expandirAreasUsuario(currentUser);

  // Filtrar reprogramaciones según el usuario:
  // - Admin/Lector: todas
  // - Responsable sin área: las de su CC
  // - Responsable con área: solo las que afectan sus áreas (cuyo campo 'area' está en sus áreas, o las sin área asignada)
  const reprogsVisibles = !esResp
    ? reprogramaciones
    : reprogramaciones.filter(r => {
        if (r.centroCosto !== ccUser) return false;
        if (!areasUser) return true;
        // Si la reprog tiene área asignada, verificar que sea de mis áreas
        if (r.area && currentUser.areas) return currentUser.areas.includes(r.area);
        return true;
      });

  const [showSolicitud, setShowSolicitud] = useState(false);
  const [editingReprog, setEditingReprog] = useState(null);

  // Para cada reprogramación, calcular si está abierta o cerrada
  function getEstadoReprog(r) {
    if (r.estado === 'solicitada') return { e: 'solicitada', label: 'Solicitada', color: '#9C7A2B', bg: '#FBF1D9', icon: Clock };
    if (r.estado === 'rechazada') return { e: 'rechazada', label: 'Rechazada', color: '#B33B3B', bg: '#F5D5D5', icon: XCircle };
    if (r.estado === 'cerrada') return { e: 'cerrada', label: 'Cerrada', color: '#5C6B7F', bg: '#E0E5EC', icon: Lock };
    // aprobada → ver si está dentro del periodo
    const ini = ts(r.fechaApertura, r.horaApertura);
    const fin = ts(r.fechaCierre, r.horaCierre);
    if (ini && AHORA < ini) return { e: 'por_abrir', label: 'Por abrir', color: '#9C7A2B', bg: '#FBF1D9', icon: Clock };
    if (fin && AHORA > fin) return { e: 'vencida', label: 'Plazo vencido', color: '#B33B3B', bg: '#F5D5D5', icon: Lock };
    return { e: 'abierta', label: 'Abierta', color: '#2D7A4E', bg: '#D8EBD3', icon: Unlock };
  }

  // ¿Hay alguna reprogramación abierta para los meses pendientes del CC?
  function getMesesEditablesParaCC(cc) {
    const set = new Set();
    reprogramaciones
      .filter(r => r.centroCosto === cc && r.estado === 'aprobada')
      .forEach(r => {
        const info = getEstadoReprog(r);
        if (info.e === 'abierta') {
          (r.mesesAfectados || []).forEach(m => set.add(m));
        }
      });
    return set;
  }

  // Meses pendientes de seguimiento del CC, considerando las áreas del usuario
  function getMesesPendientes(cc) {
    // Si el usuario tiene áreas restringidas, considerar solo sus actividades
    let acts;
    if (esResp && areasUser) {
      acts = activities.filter(a => a.centroCosto === cc && areasUser.includes(a.area));
    } else {
      acts = activities.filter(a => a.centroCosto === cc);
    }
    const pendientes = [];
    for (let m = 1; m <= 12; m++) {
      const algunRegistro = acts.some(a =>
        progress.find(p => p.actividadId === a.id && p.anio === 2026 && p.mes === m)
      );
      if (!algunRegistro) pendientes.push(m);
    }
    return pendientes;
  }

  async function enviarSolicitud(datos) {
    // Si el usuario tiene áreas asignadas, etiquetar la reprogramación con su área principal
    const areaLogica = (currentUser.areas && currentUser.areas.length === 1) ? currentUser.areas[0] : (datos.area || '');
    const nueva = {
      id: uid(),
      centroCosto: datos.cc,
      area: areaLogica, // nueva propiedad para filtrado por área
      mesesAfectados: datos.meses,
      solicitante: currentUser.nombre,
      cargo: areaLogica ? `Responsable ${areaLogica}` : (currentUser.centroCosto ? `Responsable ${currentUser.centroCosto}` : ''),
      sustento: datos.sustento,
      fechaSolicitud: new Date().toISOString(),
      estado: 'solicitada',
      fechaApertura: '', horaApertura: '',
      fechaCierre: '', horaCierre: '',
      fechaRespuesta: null,
      respuestaAdmin: '',
      programacionOriginal: null,
      programacionNueva: null,
    };
    await saveReprogramaciones([...reprogramaciones, nueva]);

    if (logAuditoria) {
      await logAuditoria('enviar_reprog',
        `Solicitó reprogramación de meses ${datos.meses.map(m => MESES[m-1]).join(', ')}${areaLogica ? ' (área ' + areaLogica + ')' : ''}`,
        { reprogId: nueva.id, centroCosto: datos.cc, area: areaLogica });
    }
    if (notificar) {
      const dest = adminUsernames(usuarios);
      await notificar({
        destinatarios: dest,
        tipo: 'reprog_recibida',
        titulo: `Nueva solicitud de reprogramación — ${datos.cc}`,
        mensaje: `${currentUser.nombre} solicita reprogramar ${datos.meses.map(m => MESES[m-1]).join(', ')}.`,
        link: 'solicitudes',
      });
    }

    setShowSolicitud(false);
    alert('Solicitud de reprogramación enviada. El administrador la revisará.');
  }

  async function guardarReprog(reprog, actsActualizadas) {
    // Guardar snapshot original solo la primera vez (antes de cualquier modificación)
    const programacionOriginal = reprog.programacionOriginal || actsActualizadas
      .map(a => {
        const original = activities.find(x => x.id === a.id);
        return original ? {
          id: original.id,
          codigoAOI: original.codigoAOI,
          nombre: original.nombre,
          metaAnualFisica: original.metaAnualFisica,
          presupuestoAnual: original.presupuestoAnual,
          programacion: JSON.parse(JSON.stringify(original.programacion)),
        } : null;
      }).filter(Boolean);

    // Aplicar los cambios SOLO en los meses afectados, manteniendo el resto intacto
    // y recalculando los totales anuales (Física anual y Financiera anual)
    const mesesAfect = reprog.mesesAfectados || [];
    const next = activities.map(a => {
      const upd = actsActualizadas.find(x => x.id === a.id);
      if (!upd) return a;
      // Construir nueva programación: meses no afectados se mantienen del original, los afectados toman el valor nuevo
      const nuevaProg = a.programacion.map((mes, i) => {
        if (mesesAfect.includes(i + 1)) {
          return {
            fisica: Number(upd.programacion[i].fisica) || 0,
            financiera: Number(upd.programacion[i].financiera) || 0,
          };
        }
        return mes;
      });
      // Recalcular totales anuales sumando los 12 meses
      const nuevaMetaAnual = nuevaProg.reduce((s, m) => s + (Number(m.fisica) || 0), 0);
      const nuevoPresupAnual = nuevaProg.reduce((s, m) => s + (Number(m.financiera) || 0), 0);
      return {
        ...a,
        programacion: nuevaProg,
        metaAnualFisica: nuevaMetaAnual,
        presupuestoAnual: nuevoPresupAnual,
      };
    });
    await saveActivities(next);

    // Actualizar el registro de reprogramación
    const reprogActualizado = {
      ...reprog,
      programacionOriginal,
      programacionNueva: next
        .filter(a => a.centroCosto === reprog.centroCosto)
        .map(a => ({
          id: a.id, codigoAOI: a.codigoAOI, nombre: a.nombre,
          metaAnualFisica: a.metaAnualFisica,
          presupuestoAnual: a.presupuestoAnual,
          programacion: a.programacion,
        })),
      ultimaModificacion: new Date().toISOString(),
    };
    await saveReprogramaciones(reprogramaciones.map(r => r.id === reprog.id ? reprogActualizado : r));

    if (logAuditoria) {
      await logAuditoria('guardar_reprog',
        `Guardó cambios en reprogramación de ${reprog.centroCosto} (meses ${(reprog.mesesAfectados||[]).map(m => MESES[m-1]).join(', ')})`,
        { reprogId: reprog.id });
    }
    alert('Reprogramación guardada. La Programación POI se ha actualizado.');
  }

  async function cerrarReprog(reprog) {
    if (!confirm('¿Cerrar la reprogramación? Una vez cerrada no se podrá modificar.')) return;
    await saveReprogramaciones(reprogramaciones.map(r =>
      r.id === reprog.id
        ? { ...r, estado: 'cerrada', fechaCierreReal: new Date().toISOString() }
        : r
    ));
    if (logAuditoria) {
      await logAuditoria('cerrar_reprog',
        `Cerró la reprogramación de ${reprog.centroCosto}`,
        { reprogId: reprog.id });
    }
  }

  if (editingReprog) {
    return (
      <EditarReprog
        reprog={editingReprog}
        activities={activities}
        currentUser={currentUser}
        onSave={(acts) => guardarReprog(editingReprog, acts)}
        onClose={() => setEditingReprog(null)}
        onCerrar={() => { cerrarReprog(editingReprog); setEditingReprog(null); }}
      />
    );
  }

  return (
    <>
      <PageHeader title="Reprogramación POI" subtitle="Modificación de la programación física y financiera"
        action={esResp && (
          <button onClick={() => setShowSolicitud(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
            style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
            <Send size={16} /> Solicitar reprogramación
          </button>
        )} />

      {reprogsVisibles.length === 0 ? null : (
        <div className="space-y-4">
          {reprogsVisibles.map(r => {
            const info = getEstadoReprog(r);
            const Icon = info.icon;
            const puedeEditar = esResp && info.e === 'abierta' && r.centroCosto === ccUser;
            const puedeExportar = info.e === 'cerrada' || info.e === 'vencida';
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Pill>{r.centroCosto}</Pill>
                      {r.area && (
                        <Pill bg="#FBE0D0" color="#A85D2B">Área: {r.area}</Pill>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold"
                        style={{ background: info.bg, color: info.color }}>
                        <Icon size={11} /> {info.label}
                      </span>
                    </div>
                    <div className="text-base font-semibold" style={{ color: '#1E2A3A' }}>
                      Meses a reprogramar: {(r.mesesAfectados || []).map(m => MESES[m-1]).join(', ')}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
                      Solicitado el {r.fechaSolicitud.slice(0,10)} por {r.solicitante}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {puedeEditar && (
                      <button onClick={() => setEditingReprog(r)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold"
                        style={{ background: '#C9A350', color: '#1E2A3A' }}>
                        <Edit3 size={14} /> Modificar programación
                      </button>
                    )}
                    {puedeExportar && (
                      <>
                        <button onClick={() => exportarReprogPDF(r, activities)}
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold"
                          style={{ background: '#B33B3B', color: '#FFFFFF' }}>
                          <Printer size={14} /> PDF
                        </button>
                        <button onClick={() => exportarReprogExcel(r, activities)}
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold"
                          style={{ background: '#2D7A4E', color: '#FFFFFF' }}>
                          <FileSpreadsheet size={14} /> Excel
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mb-3 pb-3 border-b" style={{ borderColor: '#E5DDD0' }}>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>Sustento</div>
                  <div className="text-sm leading-relaxed" style={{ color: '#1E2A3A' }}>{r.sustento}</div>
                </div>
                {r.estado === 'aprobada' && (
                  <div className="text-xs" style={{ color: '#7A6F5C' }}>
                    Ventana de edición: <strong style={{ color: '#1E2A3A' }}>{r.fechaApertura} {r.horaApertura}</strong> hasta <strong style={{ color: '#1E2A3A' }}>{r.fechaCierre} {r.horaCierre}</strong>
                  </div>
                )}
                {r.respuestaAdmin && (
                  <div className="mt-2 p-3 rounded-md text-xs leading-relaxed"
                    style={{ background: r.estado === 'rechazada' ? '#F5D5D5' : '#D8EBD3', color: '#1E2A3A' }}>
                    <strong>Respuesta del admin:</strong> {r.respuestaAdmin}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showSolicitud && esResp && (
        <SolicitudReprogModal
          cc={ccUser}
          area={currentUser.areas && currentUser.areas.length === 1 ? currentUser.areas[0] : null}
          mesesPendientes={getMesesPendientes(ccUser)}
          onSubmit={enviarSolicitud}
          onClose={() => setShowSolicitud(false)}
        />
      )}
    </>
  );
}

function SolicitudReprogModal({ cc, mesesPendientes, area, onSubmit, onClose }) {
  const [mesesSel, setMesesSel] = useState([]);
  const [sustento, setSustento] = useState('');

  function toggleMes(m) {
    setMesesSel(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a,b)=>a-b));
  }

  function send() {
    if (mesesSel.length === 0) { alert('Selecciona al menos un mes a reprogramar'); return; }
    if (!sustento.trim()) { alert('El sustento es obligatorio'); return; }
    onSubmit({ cc, meses: mesesSel, sustento, area });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
      <div className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#FAF7F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5DDD0' }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
              Solicitud de reprogramación POI
            </div>
            <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
              Centro de costo: <strong>{cc}</strong>
              {area && <> · Área: <strong style={{ color: '#9C7A2B' }}>{area}</strong></>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: '#7A6F5C' }}>
              Meses pendientes de seguimiento (selecciona los que deseas reprogramar)
            </label>
            {mesesPendientes.length === 0 ? (
              <div className="p-3 rounded-md text-xs" style={{ background: '#F5D5D5', color: '#B33B3B' }}>
                No hay meses pendientes de seguimiento. Solo se pueden reprogramar meses que aún no tienen registros.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mesesPendientes.map(m => {
                  const selected = mesesSel.includes(m);
                  return (
                    <button key={m} onClick={() => toggleMes(m)}
                      className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      style={{
                        background: selected ? '#1E2A3A' : '#F0E9D9',
                        color: selected ? '#F5F1E8' : '#1E2A3A',
                        border: selected ? '1px solid #1E2A3A' : '1px solid #E5DDD0',
                      }}>
                      {MESES[m-1]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <Field label="Sustento técnico de la reprogramación" full>
            <textarea rows={6} value={sustento} onChange={(e) => setSustento(e.target.value)}
              className={inputCls}
              placeholder="Explica detalladamente las razones técnicas que justifican la modificación de la programación física y financiera de los meses seleccionados..." />
          </Field>
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: '#E5DDD0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm" style={{ color: '#1E2A3A' }}>Cancelar</button>
          <button onClick={send}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
            style={{ background: '#C9A350', color: '#1E2A3A' }}>
            <Send size={14} /> Enviar solicitud
          </button>
        </div>
      </div>
    </div>
  );
}

function EditarReprog({ reprog, activities, onSave, onClose, onCerrar, currentUser }) {
  // Clonar las actividades del CC, filtradas por área del usuario si aplica
  const areasUser = expandirAreasUsuario(currentUser);
  const actsCC = activities.filter(a => {
    if (a.centroCosto !== reprog.centroCosto) return false;
    // Si la reprog tiene área asignada, filtrar por las áreas físicas de esa área lógica
    if (reprog.area) {
      const areasFisicas = AREAS_AGRUPADAS[reprog.area] || [reprog.area];
      if (!areasFisicas.includes(a.area)) return false;
    }
    // Si el usuario es responsable con áreas, doble verificación
    if (esResponsableCC(currentUser) && areasUser && !areasUser.includes(a.area)) return false;
    return true;
  });
  const [actsEdit, setActsEdit] = useState(JSON.parse(JSON.stringify(actsCC)));

  function updateProg(actId, mesIdx, campo, value) {
    setActsEdit(prev => prev.map(a => {
      if (a.id !== actId) return a;
      const newProg = [...a.programacion];
      newProg[mesIdx] = { ...newProg[mesIdx], [campo]: Number(value) || 0 };
      return { ...a, programacion: newProg };
    }));
  }

  const mesesAfectados = reprog.mesesAfectados || [];

  return (
    <>
      <PageHeader
        title="Modificar programación"
        subtitle={`${reprog.centroCosto} · Meses: ${mesesAfectados.map(m => MESES[m-1]).join(', ')}`}
        action={
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ background: '#F0E9D9', color: '#1E2A3A' }}>
              Volver
            </button>
            <button onClick={() => onSave(actsEdit)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
              <Save size={16} /> Guardar cambios
            </button>
            <button onClick={onCerrar}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
              style={{ background: '#B33B3B', color: '#FFFFFF' }}>
              <Lock size={16} /> Cerrar reprogramación
            </button>
          </div>
        } />

      <Card className="p-4 mb-4" style={{ background: '#FBF1D9', border: 'none' }}>
        <div className="flex items-center gap-3">
          <Unlock size={20} style={{ color: '#9C7A2B', flexShrink: 0 }} />
          <div className="text-sm" style={{ color: '#1E2A3A' }}>
            <strong>Ventana abierta hasta {reprog.fechaCierre} a las {reprog.horaCierre}</strong>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {actsEdit.map(a => (
          <Card key={a.id} className="p-5">
            <div className="mb-3">
              <div className="text-xs font-mono mb-1" style={{ color: '#9C7A2B' }}>{a.codigoAOI}</div>
              <div className="text-sm font-semibold" style={{ color: '#1E2A3A' }}>{a.nombre}</div>
              <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>{a.area} · U.M.: {a.unidadMedida}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#F0E9D9' }}>
                    <th className="text-left px-2 py-1.5 uppercase" style={{ color: '#7A6F5C' }}>Mes</th>
                    <th className="text-right px-2 py-1.5 uppercase" style={{ color: '#7A6F5C' }}>Física</th>
                    <th className="text-right px-2 py-1.5 uppercase" style={{ color: '#7A6F5C' }}>Financiera (S/)</th>
                    <th className="text-center px-2 py-1.5 uppercase" style={{ color: '#7A6F5C' }}>Editable</th>
                  </tr>
                </thead>
                <tbody>
                  {MESES.map((m, i) => {
                    const editable = mesesAfectados.includes(i + 1);
                    return (
                      <tr key={i} className="border-b" style={{ borderColor: '#E5DDD0', background: editable ? '#FFFFFF' : '#FAF7F0' }}>
                        <td className="px-2 py-1.5 font-medium" style={{ color: editable ? '#1E2A3A' : '#9C9080' }}>{m}</td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={a.programacion[i].fisica}
                            disabled={!editable}
                            onChange={(e) => updateProg(a.id, i, 'fisica', e.target.value)}
                            className="w-full text-right px-2 py-1 rounded border text-xs"
                            style={{
                              borderColor: '#E5DDD0',
                              background: editable ? '#FFFFFF' : '#F0E9D9',
                              color: editable ? '#1E2A3A' : '#9C9080'
                            }} />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.01" value={a.programacion[i].financiera}
                            disabled={!editable}
                            onChange={(e) => updateProg(a.id, i, 'financiera', e.target.value)}
                            className="w-full text-right px-2 py-1 rounded border text-xs"
                            style={{
                              borderColor: '#E5DDD0',
                              background: editable ? '#FFFFFF' : '#F0E9D9',
                              color: editable ? '#1E2A3A' : '#9C9080'
                            }} />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {editable
                            ? <Unlock size={12} style={{ color: '#2D7A4E', display: 'inline' }} />
                            : <Lock size={12} style={{ color: '#9C9080', display: 'inline' }} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

// Exportar reprogramación a PDF (HTML imprimible)
function exportarReprogPDF(reprog, activities) {
  const actsCC = activities.filter(a => a.centroCosto === reprog.centroCosto);
  const mesesAfect = reprog.mesesAfectados || [];

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reprogramación POI - ${reprog.centroCosto}</title>
  <style>
    @page { size: A4 landscape; margin: 1.5cm; }
    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #1E2A3A; }
    h1 { font-size: 16pt; text-align: center; color: #1E2A3A; margin-bottom: 4pt; }
    h2 { font-size: 12pt; color: #1E2A3A; border-bottom: 2px solid #C9A350; padding-bottom: 4pt; margin-top: 14pt; }
    .header { text-align: center; margin-bottom: 18pt; }
    .header .subtitle { color: #7A6F5C; font-size: 9pt; }
    table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 8pt; }
    th { background: #1E2A3A; color: #FFFFFF; padding: 4pt; text-align: center; }
    td { padding: 4pt; border: 1px solid #E5DDD0; }
    .info-box { background: #FAF7F0; padding: 8pt; border-left: 3px solid #C9A350; margin: 8pt 0; }
    p { margin: 4pt 0; }
    .mes-resaltado { background: #FBF1D9; font-weight: bold; }
    .num { text-align: right; }
    @media print { .no-print { display: none; } }
  </style></head><body>`;

  html += `<div class="header">
    <h1>Reporte de Reprogramación POI 2026</h1>
    <div class="subtitle">PROGRAMA NUESTRAS CIUDADES</div>
    <div class="subtitle">Centro de Costo: <strong>${reprog.centroCosto}</strong></div>
  </div>`;

  html += `<h2>I. Datos de la solicitud</h2>
  <div class="info-box">
    <p><strong>Solicitante:</strong> ${reprog.solicitante}</p>
    <p><strong>Fecha de solicitud:</strong> ${reprog.fechaSolicitud.slice(0,10)}</p>
    <p><strong>Meses reprogramados:</strong> ${mesesAfect.map(m => MESES[m-1]).join(', ')}</p>
    <p><strong>Sustento:</strong> ${reprog.sustento}</p>
    <p><strong>Ventana de modificación:</strong> ${reprog.fechaApertura} ${reprog.horaApertura} hasta ${reprog.fechaCierre} ${reprog.horaCierre}</p>
    ${reprog.respuestaAdmin ? `<p><strong>Aprobación:</strong> ${reprog.respuestaAdmin}</p>` : ''}
  </div>`;

  html += `<h2>II. Programación reprogramada por actividad operativa</h2>`;

  actsCC.forEach(a => {
    html += `<p><strong>${a.codigoAOI} — ${a.nombre}</strong><br/>
      <span style="color: #7A6F5C; font-size: 9pt">Área: ${a.area} · U.M.: ${a.unidadMedida}</span></p>`;
    html += `<table><thead><tr>
      <th>Concepto</th>${MESES.map(m => `<th>${m.slice(0,3)}</th>`).join('')}<th>Total</th>
    </tr></thead><tbody>`;
    const totalFis = a.programacion.reduce((s, p) => s + (Number(p.fisica)||0), 0);
    const totalFin = a.programacion.reduce((s, p) => s + (Number(p.financiera)||0), 0);
    html += `<tr><td>Física</td>${a.programacion.map((p, i) => `<td class="num${mesesAfect.includes(i+1) ? ' mes-resaltado' : ''}">${p.fisica}</td>`).join('')}<td class="num"><strong>${totalFis}</strong></td></tr>`;
    html += `<tr><td>Financiera (S/)</td>${a.programacion.map((p, i) => `<td class="num${mesesAfect.includes(i+1) ? ' mes-resaltado' : ''}">${Number(p.financiera).toFixed(2)}</td>`).join('')}<td class="num"><strong>${totalFin.toFixed(2)}</strong></td></tr>`;
    html += `</tbody></table>`;
  });

  html += `<div style="margin-top: 24pt; font-size: 8pt; color: #7A6F5C; text-align: center;">
    Documento generado el ${new Date().toLocaleString('es-PE')} desde el Sistema POI · Programa Nuestras Ciudades
  </div>`;

  html += `</body></html>`;

  // Abrir en nueva ventana para imprimir/guardar como PDF
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// Exportar a Excel (CSV con BOM compatible)
function exportarReprogExcel(reprog, activities) {
  const actsCC = activities.filter(a => a.centroCosto === reprog.centroCosto);
  const mesesAfect = reprog.mesesAfectados || [];
  const sep = '\t'; // tab para que Excel lo abra como columnas
  const rows = [];

  rows.push([`Reprogramación POI 2026 - ${reprog.centroCosto}`]);
  rows.push([]);
  rows.push(['Solicitante', reprog.solicitante]);
  rows.push(['Fecha de solicitud', reprog.fechaSolicitud.slice(0,10)]);
  rows.push(['Meses reprogramados', mesesAfect.map(m => MESES[m-1]).join(', ')]);
  rows.push(['Sustento', reprog.sustento]);
  rows.push(['Ventana', `${reprog.fechaApertura} ${reprog.horaApertura} - ${reprog.fechaCierre} ${reprog.horaCierre}`]);
  rows.push([]);
  rows.push(['Cód. AOI', 'Actividad', 'Área', 'U.M.', 'Concepto', ...MESES, 'Total Anual']);

  actsCC.forEach(a => {
    const totalFis = a.programacion.reduce((s, p) => s + (Number(p.fisica)||0), 0);
    const totalFin = a.programacion.reduce((s, p) => s + (Number(p.financiera)||0), 0);
    rows.push([a.codigoAOI, a.nombre, a.area, a.unidadMedida, 'Física',
      ...a.programacion.map(p => p.fisica), totalFis]);
    rows.push([a.codigoAOI, a.nombre, a.area, a.unidadMedida, 'Financiera (S/)',
      ...a.programacion.map(p => Number(p.financiera).toFixed(2)), totalFin.toFixed(2)]);
  });

  const tsv = rows.map(r => r.join(sep)).join('\n');
  const blob = new Blob(['\ufeff', tsv], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Reprogramacion_${reprog.centroCosto.replace(/\s+/g, '_')}_${reprog.fechaSolicitud.slice(0,10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ============================================================
   NOTIFICACIONES — Panel del usuario
============================================================ */
function Notificaciones({ notificaciones, saveNotificaciones, allNotificaciones, setView }) {
  const ordenadas = [...notificaciones].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  async function marcarLeida(notif) {
    const next = allNotificaciones.map(n => n.id === notif.id ? { ...n, leida: true } : n);
    await saveNotificaciones(next);
  }

  async function marcarTodasLeidas() {
    const ids = new Set(notificaciones.map(n => n.id));
    const next = allNotificaciones.map(n => ids.has(n.id) ? { ...n, leida: true } : n);
    await saveNotificaciones(next);
  }

  async function eliminarTodas() {
    if (!confirm('¿Eliminar todas tus notificaciones?')) return;
    const ids = new Set(notificaciones.map(n => n.id));
    const next = allNotificaciones.filter(n => !ids.has(n.id));
    await saveNotificaciones(next);
  }

  const noLeidas = ordenadas.filter(n => !n.leida).length;
  const tipoColor = {
    solicitud_aprobada: { bg: '#D8EBD3', color: '#2D7A4E', icon: CheckCircle2 },
    solicitud_rechazada: { bg: '#F5D5D5', color: '#B33B3B', icon: XCircle },
    solicitud_recibida: { bg: '#FBF1D9', color: '#9C7A2B', icon: MailOpen },
    reprog_aprobada: { bg: '#D8EBD3', color: '#2D7A4E', icon: RefreshCw },
    reprog_rechazada: { bg: '#F5D5D5', color: '#B33B3B', icon: XCircle },
    reprog_recibida: { bg: '#FBF1D9', color: '#9C7A2B', icon: RefreshCw },
    reprog_cerrada_auto: { bg: '#E0E5EC', color: '#5C6B7F', icon: Lock },
    info: { bg: '#F0E9D9', color: '#1E2A3A', icon: Bell },
  };

  return (
    <>
      <PageHeader title="Notificaciones" subtitle={`${noLeidas} sin leer`}
        action={ordenadas.length > 0 && (
          <div className="flex gap-2">
            {noLeidas > 0 && (
              <button onClick={marcarTodasLeidas}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors"
                style={{ background: '#F0E9D9', color: '#1E2A3A' }}>
                <Check size={14} /> Marcar todas leídas
              </button>
            )}
            <button onClick={eliminarTodas}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors"
              style={{ background: '#F5D5D5', color: '#B33B3B' }}>
              <Trash2 size={14} /> Eliminar todas
            </button>
          </div>
        )} />

      {ordenadas.length === 0 ? null : (
        <div className="space-y-2">
          {ordenadas.map(n => {
            const cfg = tipoColor[n.tipo] || tipoColor.info;
            const Icon = cfg.icon;
            return (
              <Card key={n.id} className={`p-4 ${!n.leida ? '' : 'opacity-70'}`}
                style={{ borderLeft: !n.leida ? `4px solid ${cfg.color}` : '1px solid #E5DDD0' }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-sm font-semibold" style={{ color: '#1E2A3A' }}>
                        {n.titulo}
                        {!n.leida && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                        )}
                      </div>
                      <div className="text-xs flex-shrink-0" style={{ color: '#7A6F5C' }}>
                        {fmtRelativo(n.timestamp)}
                      </div>
                    </div>
                    <div className="text-sm mt-1 leading-relaxed" style={{ color: '#1E2A3A' }}>
                      {n.mensaje}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {n.link && (
                        <button onClick={() => { marcarLeida(n); setView(n.link); }}
                          className="text-xs font-semibold" style={{ color: cfg.color }}>
                          Ir al módulo →
                        </button>
                      )}
                      {!n.leida && (
                        <button onClick={() => marcarLeida(n)}
                          className="text-xs" style={{ color: '#7A6F5C' }}>
                          Marcar como leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ============================================================
   BITÁCORA DE AUDITORÍA — Solo admin
============================================================ */
function Auditoria({ eventos }) {
  const [filtroAccion, setFiltroAccion] = useState('todas');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Categorías de acciones
  const categorias = {
    crear_actividad: { label: 'Crear actividad', cat: 'programacion' },
    editar_actividad: { label: 'Editar actividad', cat: 'programacion' },
    eliminar_actividad: { label: 'Eliminar actividad', cat: 'programacion' },
    registrar_seguimiento: { label: 'Registrar seguimiento', cat: 'seguimiento' },
    actualizar_seguimiento: { label: 'Actualizar seguimiento', cat: 'seguimiento' },
    enviar_solicitud: { label: 'Enviar solicitud', cat: 'solicitudes' },
    aprobar_solicitud: { label: 'Aprobar solicitud', cat: 'solicitudes' },
    rechazar_solicitud: { label: 'Rechazar solicitud', cat: 'solicitudes' },
    enviar_reprog: { label: 'Solicitar reprogramación', cat: 'reprog' },
    aprobar_reprog: { label: 'Aprobar reprogramación', cat: 'reprog' },
    rechazar_reprog: { label: 'Rechazar reprogramación', cat: 'reprog' },
    guardar_reprog: { label: 'Modificar reprogramación', cat: 'reprog' },
    cerrar_reprog: { label: 'Cerrar reprogramación', cat: 'reprog' },
    configurar_periodo: { label: 'Configurar periodo', cat: 'periodos' },
    crear_usuario: { label: 'Crear usuario', cat: 'usuarios' },
    editar_usuario: { label: 'Editar usuario', cat: 'usuarios' },
    eliminar_usuario: { label: 'Eliminar usuario', cat: 'usuarios' },
    crear_modif: { label: 'Registrar modif. presupuestal', cat: 'modifs' },
    editar_modif: { label: 'Editar modif. presupuestal', cat: 'modifs' },
    eliminar_modif: { label: 'Eliminar modif. presupuestal', cat: 'modifs' },
    login: { label: 'Iniciar sesión', cat: 'sesion' },
  };

  const catColor = {
    programacion: { bg: '#E0E5EC', color: '#5C6B7F' },
    seguimiento: { bg: '#D8EBD3', color: '#2D7A4E' },
    solicitudes: { bg: '#FBF1D9', color: '#9C7A2B' },
    reprog: { bg: '#FBE0D0', color: '#A85D2B' },
    periodos: { bg: '#F0E0F0', color: '#7A4E7A' },
    usuarios: { bg: '#E0E5EC', color: '#5C6B7F' },
    modifs: { bg: '#F5D5D5', color: '#B33B3B' },
    sesion: { bg: '#F0E9D9', color: '#1E2A3A' },
  };

  // Listar usuarios únicos para el filtro
  const usuarios = [...new Set(eventos.map(e => e.usuario))];

  // Filtrar eventos
  const filtrados = eventos.filter(e => {
    if (filtroAccion !== 'todas' && e.accion !== filtroAccion) return false;
    if (filtroUsuario && e.usuario !== filtroUsuario) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!e.detalle.toLowerCase().includes(q) && !e.nombre.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function exportarCSV() {
    const sep = '\t';
    const rows = [['Fecha/Hora', 'Usuario', 'Nombre', 'Rol', 'Centro Costo', 'Acción', 'Detalle']];
    filtrados.forEach(e => {
      rows.push([
        fmtTimestamp(e.timestamp),
        e.usuario, e.nombre, e.rol, e.centroCosto || '',
        categorias[e.accion]?.label || e.accion,
        e.detalle,
      ]);
    });
    const tsv = rows.map(r => r.join(sep)).join('\n');
    const blob = new Blob(['\ufeff', tsv], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Auditoria_POI_${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title="Bitácora de auditoría" subtitle={`${eventos.length} eventos registrados`}
        action={filtrados.length > 0 && (
          <button onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
            style={{ background: '#2D7A4E', color: '#FFFFFF' }}>
            <FileSpreadsheet size={16} /> Exportar Excel
          </button>
        )} />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tipo de acción">
            <select value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)} className={inputCls}>
              <option value="todas">Todas las acciones</option>
              {Object.entries(categorias).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Usuario">
            <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} className={inputCls}>
              <option value="">Todos los usuarios</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Buscar en detalle">
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className={inputCls} placeholder="palabra clave..." />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E5DDD0', background: '#F0E9D9' }}>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Fecha/Hora</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Usuario</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Acción</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-sm" style={{ color: '#7A6F5C' }}>
                  {eventos.length === 0
                    ? 'Aún no hay eventos registrados. La bitácora comenzará a llenarse a medida que los usuarios interactúen con el sistema.'
                    : 'Ningún evento coincide con los filtros aplicados.'}
                </td></tr>
              )}
              {filtrados.map(e => {
                const cat = categorias[e.accion];
                const colorCfg = cat ? catColor[cat.cat] : catColor.sesion;
                return (
                  <tr key={e.id} className="border-b last:border-b-0 hover:bg-stone-50" style={{ borderColor: '#E5DDD0' }}>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#1E2A3A' }}>
                      <div className="font-mono">{fmtTimestamp(e.timestamp)}</div>
                      <div style={{ color: '#7A6F5C' }}>{fmtRelativo(e.timestamp)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>
                      <div className="font-semibold">{e.nombre}</div>
                      <div className="font-mono" style={{ color: '#7A6F5C' }}>{e.usuario}</div>
                      {e.centroCosto && <Pill>{e.centroCosto}</Pill>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ background: colorCfg.bg, color: colorCfg.color }}>
                        {cat?.label || e.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#1E2A3A' }}>
                      <div className="leading-snug">{e.detalle}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {filtrados.length > 0 && (
        <div className="text-xs text-center mt-4" style={{ color: '#7A6F5C' }}>
          Mostrando {filtrados.length} de {eventos.length} eventos totales
        </div>
      )}
    </>
  );
}

/* ============================================================
   DATOS DEMO PNC 2026
============================================================ */
function seedDemo() {
  // ===== DATOS INSTITUCIONALES REALES PNC 2026 (generados desde los Excel y Word oficiales) =====
  // Cada actividad: cc, area, reg, aoi, nombre, um, oei, aei, genéricas PIA/PIM (12m), física PIA/PIM (12m)
  const ACTS = [
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820014",aoi:"AOI00108200084",nombre:"REALIZACIÓN DE ASISTENCIA TÉCNICA A LAS UNIDADES FORMULADORAS Y EVALUADORAS DE LOS GOBIERNOS LOCALES",um:"PERSONA CAPACITADA",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.3':{pia:[29238.33,29238.33,29238.33,29238.33,29238.33,29238.33,29238.33,29238.33,29238.33,29238.33,29238.33,29238.37],pim:[0,11280,69682.23,67909.5,51000,53160,51000,37120,9708.27,0,0,0]}},fpia:[0,45,45,45,45,45,45,45,45,45,50,45],fpim:[0,45,45,45,45,45,45,45,45,45,50,45]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820015",aoi:"AOI00108200085",nombre:"PROMOCIÓN DE LAS INVERSIONES PÚBLICO PRIVADAS EN PROYECTOS IDENTIFICADOS EN INSTRUMENTOS PARA LA GESTIÓN URBANO TERRITORIAL",um:"EVENTOS",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.1':{pia:[37592.58,37592.58,37592.58,37592.58,37592.58,37592.58,37592.58,37592.58,37592.58,37592.58,37592.58,37592.62],pim:[52347.76,76521.64,76059.97,63934.7,76521.64,76521.64,76521.64,76521.64,76521.64,72651.73,0,0]},'2.3':{pia:[8500,8500,8500,8500,8500,8500,8500,8500,8500,8500,8500,8500],pim:[0,0,0,0,0,0,0,7000,41000,18000,18000,18000]}},fpia:[0,0,0,0,0,0,1,0,0,1,0,0],fpim:[0,0,0,0,0,0,1,0,0,4,0,0]},
    {cc:"UNINDEUS",area:"CENTRO DE CONVENCIONES",reg:"20260010820035",aoi:"AOI00108200215",nombre:"REALIZACIÓN DEL MANTENIMIENTO DE INSTALACIONES Y EQUIPAMIENTO DEL CENTRO DE CONVENCIONES 27 DE ENERO, CIUDAD DE LIMA",um:"MANTENIMIENTO",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.3':{pia:[424734.33,424734.33,424734.33,424734.33,424734.33,424734.33,424734.33,424734.33,424734.33,424734.33,424734.33,424734.37],pim:[44500,738625.14,1106428.81,370513.73,475070.6,476799.17,472071.17,394299.17,394299.21,679148.97,296020.01,631815.02]},'2.5':{pia:[0,0,0,0,0,0,0,0,0,0,0,0],pim:[0,225297.73,0,0,0,0,0,0,0,0,0,0.27]},'2.6':{pia:[0,0,0,0,0,0,0,0,0,0,0,0],pim:[0,0,0,0,73390,0,0,0,0,0,0,0]}},fpia:[1,1,1,1,1,1,1,1,1,1,1,1],fpim:[1,1,1,1,1,1,1,1,1,1,1,1]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820118",aoi:"AOI00108202256",nombre:"SUPERVISION Y LIQUIDACION - PIP 2300564 BELEN",um:"INFORME",oei:"OEI.01",aei:"AEI.01.05",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"PIP OLMOS",reg:"20260010820131",aoi:"AOI00108201684",nombre:"GESTION Y ADMINISTRACION 2256322 OLMOS",um:"INFORME",oei:"OEI.01",aei:"AEI.01.05",gen:{'2.6':{pia:[32656.92,32656.92,32656.92,32656.92,32656.92,32656.92,32656.92,32656.92,32656.92,32656.92,32656.92,32656.88],pim:[12000,29629.8,10000,34691.5,54109.8,54109.8,54109.8,54109.8,54109.8,54109.8,54109.8,1067081.1]}},fpia:[1,1,1,1,1,1,1,1,1,1,1,1],fpim:[1,1,1,1,1,1,1,1,1,1,1,1]},
    {cc:"UNINDEUS",area:"PIP OLMOS",reg:"20260010820133",aoi:"AOI00108201259",nombre:"GESTION Y ADMINISTRACION PROG-012-2014-SNIP - 2270290 - OLMOS",um:"INFORME",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[30658.17,30658.17,30658.17,30658.17,30658.17,30658.17,30658.17,30658.17,30658.17,30658.17,30658.17,30658.13],pim:[0,1840,18924.06,18000,52920,52920,52920,212294.29,212294.29,212294.29,212294.29,439358.78]}},fpia:[1,1,1,1,1,1,1,1,1,1,1,1],fpim:[1,1,1,1,1,1,1,1,1,1,1,1]},
    {cc:"UNINDEUS",area:"PIP BELÉN",reg:"20260010820134",aoi:"AOI00108201258",nombre:"GESTION Y ADMINSITRACIÓN DEL PROGRAMA DE INVERSION PROG-003-2015-SNIP - 2277384 - BELEN",um:"INFORME",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[74333.33,74333.33,74333.33,74333.33,74333.33,74333.33,74333.33,74333.33,74333.33,74333.33,74333.33,74333.37],pim:[0,3597.2,18957.74,16466.34,36500,31147.4,210614.04,288388.49,16500,18340,198372.33,53116.46]}},fpia:[1,1,1,1,1,1,1,1,1,1,1,1],fpim:[1,1,1,1,1,1,1,1,1,1,1,1]},
    {cc:"UNINDEUS",area:"PIP ZARUMILLA MALECON",reg:"20260010820143",aoi:"AOI00108201680",nombre:"SUPERVISON Y LIQUIDACION DE OBRAS 2288094 ZARUMILLA",um:"INFORME",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[129453.33,129453.33,129453.33,129453.33,129453.33,129453.33,129453.33,129453.33,129453.33,129453.33,129453.33,129453.37],pim:[0,0,0,0,0,0,431004,198506,198506,198506,0,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,1],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"PIP OLMOS",reg:"20260010820146",aoi:"AOI00108201640",nombre:"CONSTRUCCIÓN DEL SISTEMA DE AGUA POTABLE Y ALCANTARILLADO - 2256322 OLMOS",um:"OBRA",oei:"OEI.01",aei:"AEI.01.05",gen:{'2.6':{pia:[0,0,0,580781,0,0,0,0,1000000,0,0,0],pim:[0,0,0,0,0,0,0,0,0,0,0,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"PIP OLMOS",reg:"20260010820156",aoi:"AOI00108201679",nombre:"SUPERVISION Y LIQUIDACION DE LA OBRA CONSTRUCCIÓN DEL SISTEMA DE AGUA POTABLE Y ALCANTARILLADO - 2256322 OLMOS",um:"INFORME",oei:"OEI.01",aei:"AEI.01.05",gen:{'2.6':{pia:[26253.42,26253.42,26253.42,26253.42,26253.42,26253.42,26253.42,26253.42,26253.42,26253.42,26253.42,26253.38],pim:[0,0,0,0,0,0,0,0,0,0,0,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820158",aoi:"AOI00108201695",nombre:"CONSTRUCCION VIA LOCAL 2300167 BELEN",um:"OBRA",oei:"OEI.05",aei:"AEI.05.06",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"PIP OLMOS",reg:"20260010820179",aoi:"AOI00108201778",nombre:"CONSTRUCCION DE VIA LOCAL - PIP 2266697 OLMOS",um:"OBRA",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[895933.25,895933.25,895933.25,895933.25,895933.25,895933.25,895933.25,895933.25,895933.25,895933.25,895933.25,895933.25],pim:[0,0,0,0,0,0,0,0,0,0,5621173,0]}},fpia:[0,0,0,0,0,0,0,0,0,0.1,0,0],fpim:[0,0,0,0,0,0,0,0,0,0.1,0,0]},
    {cc:"UNINDEUS",area:"PIP OLMOS",reg:"20260010820180",aoi:"AOI00108201776",nombre:"SUPERVISION Y LIQUIDACION PIP 2266697 OLMOS",um:"INFORME",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[41001.42,41001.42,41001.42,41001.42,41001.42,41001.42,41001.42,41001.42,41001.42,41001.42,41001.42,41001.38],pim:[0,0,0,0,0,0,0,0,0,0,0,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"PIP OLMOS",reg:"20260010820181",aoi:"AOI00108201777",nombre:"GESTION Y ADMINISTRACION PIP 2266697 OLMOS",um:"INFORME",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[21106,21106,21106,21106,21106,21106,21106,21106,21106,21106,21106,21106],pim:[10000,19753.2,20000,36461,42233.2,64586,64586,64586,64586,64586,64586,923382.6]}},fpia:[1,1,1,1,1,1,1,1,1,1,1,1],fpim:[1,1,1,1,1,1,1,1,1,1,1,1]},
    {cc:"UNINDEUS",area:"PIP OLMOS",reg:"20260010820198",aoi:"AOI00108201852",nombre:"EXPEDIENTE TECNICO 2256322 - OLMOS",um:"EXPEDIENTE TECNICO",oei:"OEI.01",aei:"AEI.01.05",gen:{'2.6':{pia:[30752.67,30752.67,30752.67,30752.67,30752.67,30752.67,30752.67,30752.67,30752.67,30752.67,30752.67,30752.63],pim:[0,0,0,0,212184,0,156848,374890,374890,374890,0,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,0.2],fpim:[0,0,0,0,0,0,0,0,0,0,0,0.2]},
    {cc:"UNINDEUS",area:"PIP OLMOS",reg:"20260010820199",aoi:"AOI00108201854",nombre:"EXPEDIENTE TECNICO PIP 2266697 OLMOS",um:"EXPEDIENTE TECNICO",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[44895.42,44895.42,44895.42,44895.42,44895.42,44895.42,44895.42,44895.42,44895.42,44895.42,44895.42,44895.38],pim:[0,0,0,0,295522,0,243223,0,539310.66,539310.66,539310.68,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,0.2],fpim:[0,0,0,0,0,0,0,0,0,0,0,0.1]},
    {cc:"UNINDEUS",area:"PIP ZARUMILLA MALECON",reg:"20260010820212",aoi:"AOI00108202108",nombre:"CONSTRUCCION DE BOULEVARD - PIP 2288094",um:"OBRA",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[400000,400000,400000,400000,400000,400000,400000,400000,400000,300000,300000,11110],pim:[0,0,0,0,0,0,0,0,2452396.88,349199.12,0,0]}},fpia:[0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06,0.06],fpim:[0,0,0,0,0,0,0.1,0.1,0.1,0.1,0.1,0.1]},
    {cc:"UNINDEUS",area:"PIP ZARUMILLA MALECON",reg:"20260010820215",aoi:"AOI00108202109",nombre:"GESTION Y ADMINISTRACION - PIP 2288094",um:"INFORME",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[8333.17,8333.17,8333.17,8333.17,8333.17,8333.17,8333.17,8333.17,8333.17,8333.17,8333.17,8333.13],pim:[7640,43271.85,57514,89540.45,96350,52088,78188,52088,48490,96350,96350,137007.7]}},fpia:[1,1,1,1,1,1,1,1,1,1,1,1],fpim:[1,1,1,1,1,1,1,1,1,1,1,1]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820221",aoi:"AOI00108202113",nombre:"GESTION Y ADMINISTRACION - PIP 2414594",um:"INFORME",oei:"OEI.05",aei:"AEI.05.06",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820287",aoi:"AOI00108202111",nombre:"EXPEDIENTE TECNICO - PIP 2300167",um:"EXPEDIENTE TECNICO",oei:"OEI.05",aei:"AEI.05.06",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820288",aoi:"AOI00108202112",nombre:"SUPERVISION Y LIQUIDACION DE OBRAS - PIP 2300167",um:"INFORME",oei:"OEI.05",aei:"AEI.05.06",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820292",aoi:"AOI00108202121",nombre:"GESTION Y ADMINISTRACION - PIP 2300167",um:"INFORME",oei:"OEI.05",aei:"AEI.05.06",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"PRE INVERSION",reg:"20260010820329",aoi:"AOI00108202171",nombre:"ESTUDIOS DE PRE - INVERSION",um:"ESTUDIO DE PREINVERSION",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[47500,47500,47500,47500,47500,47500,47500,47500,47500,47500,47500,47500],pim:[7000,28470,194460.31,68475,17000,157149.69,8000,8000,8000,8000,8000,57445]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,3],fpim:[0,0,0,0,0,0,0,0,0,0,0,1]},
    {cc:"UNINDEUS",area:"PIP ZARUMILLA MALECON",reg:"20260010820330",aoi:"AOI00108202172",nombre:"EXPEDIENTE TECNICO -PIP 2288094",um:"EXPEDIENTE TECNICO",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[66687.67,66687.67,66687.67,66687.67,66687.67,66687.67,66687.67,66687.67,66687.67,66687.67,66687.67,66687.63],pim:[0,0,440400.78,0,307025.5,307025.5,307025.5,307025.5,6275.72,307025.5,0,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,0.8],fpim:[0,0,0,0,0,1,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820394",aoi:"AOI00108202238",nombre:"EXPEDIENTE TECNICO 2307577",um:"EXPEDIENTE TECNICO",oei:"OEI.07",aei:"AEI.07.03",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820395",aoi:"AOI00108202240",nombre:"EXPEDIENTE TÉCNICO - 2300564 BELEN",um:"EXPEDIENTE TECNICO",oei:"OEI.01",aei:"AEI.01.05",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820405",aoi:"AOI00108202253",nombre:"CONSTRUCCION DE SISTEMA DE DRENAJE PLUVIAL PI 2307577 BELEN",um:"OBRA",oei:"OEI.07",aei:"AEI.07.03",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820406",aoi:"AOI00108202254",nombre:"SUPERVISION Y LIQUIDACION DE OBRAS PI 2307577 BELEN",um:"INFORME",oei:"OEI.07",aei:"AEI.07.03",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820407",aoi:"AOI00108202255",nombre:"CONSTRUCCION DE SISTEMA DE AGUA POTABLE Y ALCANTARILLADO 2300564 BELEN",um:"OBRA",oei:"OEI.01",aei:"AEI.01.05",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820408",aoi:"AOI00108202257",nombre:"CONSTRUCCION DE BOULEVARD PIP 2414594",um:"OBRA",oei:"OEI.05",aei:"AEI.05.06",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820409",aoi:"AOI00108202258",nombre:"GESTION Y ADMINISTRACION PIP 2300564",um:"INFORME",oei:"OEI.01",aei:"AEI.01.05",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"UNINDEUS",reg:"20260010820410",aoi:"AOI00108202259",nombre:"GESTION Y ADMINISTRACION PIP 2307577",um:"INFORME",oei:"OEI.07",aei:"AEI.07.03",gen:{},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,0,0,0,0,0,0,0,0,0,0]},
    {cc:"UNINDEUS",area:"PIP PLAZA LA HERMANDAD",reg:"20260010820450",aoi:"AOI00108202315",nombre:"GESTIÓN Y ADMINISTRACIÓN 2414594",um:"INFORME TECNICO",oei:"OEI.05",aei:"AEI.05.06",gen:{'2.6':{pia:[0,0,0,0,0,0,0,0,0,0,0,0],pim:[0,0,0,1761.51,60000,150000,123000,28238.49,0,0,0,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,2,1,1,1,1,1,1,1,0,0]},
    {cc:"UGEDEUS",area:"UGEDEUS",reg:"20260010820016",aoi:"AOI00108200103",nombre:"CAPACITACIÓN EN GESTIÓN URBANA PARA LA PLANIFICACIÓN DEL DESARROLLO URBANO SOSTENIBLE",um:"MUNICIPIO",oei:"OEI.06",aei:"AEI.06.03",gen:{'2.3':{pia:[0,987,987,987,10987,987,987,987,987,987,987,990],pim:[0,0,0,0,3100,8200,0,4560,0,5000,0,0]}},fpia:[0,0,0,0,90,0,90,90,0,0,0,0],fpim:[0,0,0,0,0,90,0,0,90,0,90,0]},
    {cc:"UGEDEUS",area:"UGEDEUS",reg:"20260010820027",aoi:"AOI00108200199",nombre:"IMPLEMENTACIÓN Y MONITOREO DE SISTEMAS DE INFORMACIÓN GEOGRÁFICA PARA LA GESTIÓN URBANA TERRITORIAL",um:"MUNICIPIO",oei:"OEI.06",aei:"AEI.06.05",gen:{'2.3':{pia:[0,0,0,0,2000,0,0,0,1620,0,0,0],pim:[0,1600,984.22,0,640,395.78,0,0,0,0,0,0]}},fpia:[0,0,0,0,0,0,0,120,0,0,0,0],fpim:[0,0,0,0,20,50,30,20,0,0,0,0]},
    {cc:"UGEDEUS",area:"UGEDEUS",reg:"20260010820029",aoi:"AOI00108200204",nombre:"ELABORACIÓN DE PLANES DE ACONDICIONAMIENTO TERRITORIAL, PLANES URBANOS Y ESTUDIOS VINCULADOS A LA GESTIÓN URBANA SOSTENIBLE DE LAS CIUDADES",um:"DOCUMENTO",oei:"OEI.06",aei:"AEI.06.04",gen:{'2.1':{pia:[9488.97,9488.97,9488.97,9488.97,9488.97,9488.97,9788.97,9488.97,9488.97,9488.97,9488.97,9691.33],pim:[51134.7,26960.82,26960.82,26960.82,26960.82,26960.82,26960.82,26960.82,26960.82,26960.82,26960.82,56035.1]},'2.3':{pia:[34333,34333,34333,34333,34333,34333,50643,34333,284333,34333,34333,34337],pim:[0,15500,67889.5,47942.14,62280,65000,74907.86,62280,61000,61000,63770,96740.5]}},fpia:[0,0,0,0,0,0,2,0,0,0,0,2],fpim:[0,0,0,0,0,0,2,0,0,0,0,2]},
    {cc:"GESTIÓN PNC",area:"GESTION PNC",reg:"20260010820008",aoi:"AOI00108200041",nombre:"CONDUCCIÓN Y GESTIÓN DEL PROGRAMA NUESTRAS CIUDADES",um:"ACCION",oei:"OEI.06",aei:"AEI.06.01",gen:{'2.1':{pia:[84613.58,84613.58,84613.58,84613.58,84613.58,84613.58,84613.58,84613.58,84613.58,84613.58,84613.58,84613.62],pim:[85018.27,85018.27,84509.97,85018.27,85018.27,85018.27,75273.74,85018.27,85018.27,85018.27,85018.27,90414.86]},'2.3':{pia:[89916.67,89916.67,89916.67,89916.67,89916.67,89916.67,89916.67,89916.67,89916.67,89916.67,89916.67,89916.63],pim:[10000,27560,56159.02,31872.39,245086.5,94972.72,64972.72,72972.72,187972.72,62972.72,92972.72,130879.77]},'2.6':{pia:[0,0,0,0,0,0,0,0,0,0,0,0],pim:[0,0,0,606,0,0,0,0,0,0,0,0]}},fpia:[1,1,1,1,1,1,1,1,1,1,1,1],fpim:[1,1,1,1,1,1,1,1,1,1,1,1]},
    {cc:"UGERDES",area:"UGERDES",reg:"20260010820032",aoi:"AOI00108200212",nombre:"ELABORACIÓN DE ESTUDIOS PARA ESTABLECER EL RIESGO EN LAS CIUDADES",um:"DOCUMENTO TECNICO",oei:"OEI.07",aei:"AEI.07.04",gen:{'2.3':{pia:[59968.33,59968.33,59968.33,59968.33,59968.33,59968.33,59968.33,59968.33,59968.33,59968.33,59968.33,59968.37],pim:[0,0,7545.27,47840,40000,1740,640,257434.73,40000,40000,76000,112160]},'2.4':{pia:[0,0,0,0,0,0,0,0,0,0,0,0],pim:[0,0,0,96260,0,0,0,0,0,0,0,0]}},fpia:[0,0,0,0,0,1,0,0,0,0,0,2],fpim:[0,0,0,0,0,1,0,0,0,0,0,2]},
    {cc:"UGERDES",area:"MAQUINARIAS PREVENCIÓN",reg:"20260010820033",aoi:"AOI00108200213",nombre:"INTERVENCIÓN EN MANTENIMIENTO DE CAUCES, DRENAJES Y ESTRUCTURAS DE SEGURIDAD FÍSICA FRENTE A PELIGROS CON LAS UBOS",um:"INTERVENCION",oei:"OEI.07",aei:"AEI.07.03",gen:{'2.1':{pia:[439510.75,439510.75,439510.75,439510.75,439510.75,439510.75,466810.75,439510.75,439510.75,439510.75,439510.75,466810.75],pim:[492186.61,471747.3,476636.7,482486.77,471747.3,471747.3,471747.3,471747.3,471747.3,471747.3,471747.3,103440.52]},'2.3':{pia:[1292995,1292995,1292995,1292995,1292995,1292995,1292995,1292995,1292995,1292995,1292995,1292995],pim:[109910,937968.34,2045792.36,1918298.75,1858695,1909170.25,1797828,1558648.2,1264019,624589.64,757846,1101566.46]}},fpia:[25,25,25,20,20,20,20,15,15,15,15,13],fpim:[25,25,25,20,20,20,20,15,15,15,15,13]},
    {cc:"UGERDES",area:"UGERDES",reg:"20260010820034",aoi:"AOI00108200214",nombre:"REALIZACIÓN DE ASISTENCIA TÉCNICA Y ACOMPAÑAMIENTO EN GESTIÓN DEL RIESGO DE DESASTRES EN LAS CIUDADES",um:"INFORME TECNICO",oei:"OEI.07",aei:"AEI.07.02",gen:{'2.1':{pia:[19461.75,19461.75,19461.75,19461.75,19461.75,19461.75,20061.75,19461.75,19461.75,19461.75,19461.75,20061.75],pim:[19673.88,19646.43,19673.88,19673.88,19646.43,19646.43,19646.43,19646.43,19646.43,19646.43,19646.43,18547.92]},'2.3':{pia:[22016,18666,18666,18666,43666,18666,78666,18666,51856,18666,18666,18674],pim:[0,0,0,0,41740,1680,189120,5000,40000,40000,28000,0]}},fpia:[0,3,3,3,3,3,3,3,3,3,3,3],fpim:[0,3,3,3,3,3,3,3,3,3,3,3]},
    {cc:"UGERDES",area:"EMERGENCIA-DESCOLMATACIÓN",reg:"20260010820445",aoi:"AOI00108202307",nombre:"ATENCIÓN DE ACTIVIDADES DE EMERGENCIA",um:"KILOMETRO",oei:"OEI.07",aei:"AEI.07.05",gen:{'2.3':{pia:[0,0,0,0,0,0,0,0,0,0,0,0],pim:[0,0,38516,38516,14718.33,90544,669356.67,0,0,0,0,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,10.27,13.94,0,0,0,0,0,0,0,0]},
    {cc:"UGERDES",area:"EMERGENCIA-TRANSITABILIDAD",reg:"20260010820451",aoi:"AOI00108202316",nombre:"ATENCIÓN DE TRANSITABILIDAD DE VÍAS",um:"KILOMETRO",oei:"OEI.07",aei:"AEI.07.05",gen:{'2.3':{pia:[0,0,0,0,0,0,0,0,0,0,0,0],pim:[0,0,0,8584,27000,80504,0,0,0,0,0,0]}},fpia:[0,0,0,0,0,0,0,0,0,0,0,0],fpim:[0,0,2.75,0.89,0,0,0,0,0,0,0,0]},
  ];

  const activities = ACTS.map(d => {
    const genericas = nuevasGenericas();
    Object.keys(d.gen || {}).forEach(code => {
      if (!genericas[code]) genericas[code] = { pia: Array(12).fill(0), pim: Array(12).fill(0) };
      genericas[code].pia = d.gen[code].pia.slice();
      genericas[code].pim = d.gen[code].pim.slice();
    });
    const fisicaMensual = { pia: d.fpia.slice(), pim: d.fpim.slice() };
    const a = {
      id: uid(), centroCosto: d.cc, area: d.area, codigoRegistro: d.reg, codigoAOI: d.aoi,
      nombre: d.nombre, unidadMedida: d.um, responsable: "", oei: d.oei, aei: d.aei,
      activo: true, genericas, fisicaMensual,
    };
    return migrarActividadGenericas(a);
  });

  const byAOI = {}; activities.forEach(a => { byAOI[a.codigoAOI] = a.id; });

  // Registros de seguimiento (ejecución física, financiera y comentarios del Informe mensual POI)
  const PROG = [
    {aoi:"AOI00108200084",mes:1,af:35,afi:0,lg:"En el presente mes, se realizaron 11 asistencias técnicas con 35 personas capacitadas, a diferentes gobiernos locales, como se detalla a continuación: | ÍTEM | CÓDIGO | FECHA | ASUNTO | Personas capacitadas | | --- | --- | --- | --- | --- | | 1 | 01687-2026 | 30/01/2026 04:30 pm | ASISTENCIA TÉCNICA A LA MP CALLAO PARA EL PROYECTO CUI 2617222 (JOSE GALVEZ) | 3 | | 2 | 01674-2026 | 30/01/2026 03:00 pm | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PROYECTO CUI 2672085 (LUNA PIZARRO) | 3 | | 3 | 01663-2026 | 30/01/2026 11:00 am | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2701930 (SÁENZ PEÑA) | 3 | | 4 | 01605-2026 | 29/01/2026 02:30 pm | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA LOS PROYECTOS ALHELÍ YY 12 DE OCTUBRE | 3 | | 5 | 01597-2026 | 29/01/2026 03:00 pm | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES CUI 2673098 (INDEPENDENCIA) | 4 | | 6 | 01401-2026 | 27/01/2026 02:00 pm | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD DISTRITAL DE LA VICTORIA | 3 | | 7 | 01189-2026 | 23/01/2026 03:00 pm | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD DISTRITAL DE SAN MARTÍN DE PORRES | 3 | | 8 | 01121-2026 | 22/01/2026 02:00 pm | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD DISTRITAL DE LA VICTORIA | 3 | | 9 | 01074-2026 | 21/01/2026 03:30 pm | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD DISTRITAL DE SAN MARTÍN DE PORRES | 4 | | 10 | 00190-2026 | 08/01/2026 10:00 am | ASISTENCIA TÉCNICA MUNICIPALIDAD DISTRITAL DE VILLA RICA | 3 | | 11 | 00011-2026 | 05/01/2026 03:00 pm | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD DISTRITAL DE CHORRILLOS | 3 |",li:"Retrasos en las contrataciones de los especialistas evaluadores.",me:"Seguimiento oportuno de las etapas de la evaluación, así como del levantamiento de observaciones por parte de los Gobiernos Locales.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108200084",mes:2,af:183,afi:11280,lg:"En el presente mes, se realizaron 61 asistencias técnicas con 183 personas capacitadas, a diferentes gobiernos locales, como se detalla a continuación: | ÍTEM | CÓDIGO | Fecha | Asunto | Personas Capacitadas | | --- | --- | --- | --- | --- | | 1 | 03606-2026 | 27/02/2026 17:00 | ASISTENCIA TÉCNICA A LA MD VEINTISÉIS DE OCTUBRE PARA EL PROYECTO CUI 2304216 (LA MOLINA II) | 3 | | 2 | 03502-2026 | 26/02/2026 15:45 | AT A LA MD LA VICTORIA PARA EL PI JR. GARCÍA NARANJO CUI 2701760 | 3 | | 3 | 03490-2026 | 26/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD NUEVO CHIMBOTE PARA EL PROYECTO CUI 2601612 (CASUARINAS) | 3 | | 4 | 03426-2026 | 25/02/2026 17:00 | ASISTENCIA TÉCNICA A LA MP CALLAO PARA EL PROYECTO CUI 2678247 (DOMINICOS) | 3 | | 5 | 03420-2026 | 25/02/2026 16:00 | ASISTENCIA TÉCNICA A LA MD INDEPENDENCIA PARA EL PROYECTO CUI 2621891 (CESAR VALLEJO) | 3 | | 6 | 03410-2026 | 25/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA LOS PROYECTOS CUI 2710979 Y CUI 2701930 | 3 | | 7 | 03310-2026 | 24/02/2026 14:30 | AT A LA MD LA VICTORIA PARA EL PI JR. GARCÍA NARANJO CUI 2701760 | 3 | | 8 | 03210-2026 | 23/02/2026 11:30 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA LOS PROYECTOS CUI 2710979 Y CUI 2701930 | 3 | | 9 | 03143-2026 | 20/02/2026 16:30 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA LOS PROYECTOS CUI 2710979 Y CUI 2701930 | 3 | | 10 | 03066-2026 | 20/02/2026 10:00 | ASISTENCIA TÉCNICA PARA EL PI AV. SAN PABLO CON CUI 2701037 DE LA MD LA VICTORIA | 3 | | 11 | 03051-2026 | 19/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MP CALLAO PARA EL PROYECTO CUI 2617222 (JOSÉ GALVEZ) | 3 | | 12 | 03027-2026 | 19/02/2026 11:00 | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD PROVINCIAL DE LA VICTORIA | 3 | | 13 | 02999-2026 | 23/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD INDEPENDENCIA PARA EL PROYECTO CUI 2621891 (CESAR VALLEJO) | 3 | | 14 | 02972-2026 | 18/02/2026 17:00 | AT A LA MD LA VICTORIA PARA LOS PI CON CUI 2701768 Y 2701931 | 3 | | 15 | 02950-2026 | 18/02/2026 15:00 | ASISTENCIA TÉCNICA PARA LOS PROYECTOS CUI 2710979 Y CUI 2701930 | 3 | | 16 | 02935-2026 | 18/02/2026 12:00 | ASISTENCIA TÉCNICA A LA MP CALLAO PARA EL PROYECTO CUI 2678247 (DOMINICOS) | 3 | | 17 | 02843-2026 | 24/02/2026 10:00 | ASISTENCIA TÉCNICA A LA MD CURA MORI PARA EL PROYECTO CUI 2428198 (SANTA ROSA) | 3 | | 18 | 02817-2026 | 18/02/2026 09:00 | ASISTENCIA TÉCNICA PARA LA MDSMP PARA EL PI JR. ALHELÍ CON CUI 2676867 | 3 | | 19 | 02813-2026 | 17/02/2026 14:30 | ASISTENCIA TÉCNICA PARA LA MD LA VICTORIA PARA EL PI JULIO MENDOZA CON CUI 2701931 | 3 | | 20 | 02764-2026 | 16/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA LOS PROYECTOS CUI 2710979 Y CUI 2701930 | 3 | | 21 | 02735-2026 | 17/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PROYECTO CUI 2672085 (LUNA PIZARRO) | 3 | | 22 | 02708-2026 | 13/02/2026 17:00 | ASISTENCIA TÉCNICA A LA MD CURA MORI PARA EL PROYECTO CUI 2428198 (SANTA ROSA) | 3 | | 23 | 02701-2026 | 13/02/2026 16:00 | ASISTENCIA TÉCNICA A LA MP CALLAO PARA EL PROYECTO CUI 2617222 (JOSÉ GALVEZ) | 3 | | 24 | 02688-2026 | 13/02/2026 14:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA LOS PROYECTOS CUI 2710979 Y CUI 2701930 | 3 | | 25 | 02668-2026 | 13/02/2026 09:30 | AT A LA MD LA VICTORIA PARA EL PI AV. SAN PABLO CON CUI 2701037 | 3 | | 26 | 02628-2026 | 12/02/2026 14:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2710979 (PABLO PATRON) | 3 | | 27 | 02614-2026 | 12/02/2026 11:30 | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD DISTRITAL DE LA VICTORIA | 3 | | 28 | 02601-2026 | 12/02/2026 15:00 | ASISTENCIA TÉCNICA PARA LA MD LA VICTORIA PARA LOS PI CON CUI 2701768 Y 2701037 | 3 | | 29 | 02418-2026 | 11/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD CURA MORI PARA EL PROYECTO CUI 2428198 (SANTA ROSA) | 3 | | 30 | 02394-2026 | 11/02/2026 14:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2710979 (PABLO PATRON) | 3 | | 31 | 02371-2026 | 11/02/2026 10:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2701930 (Sáenz PEÑA) | 3 | | 32 | 02367-2026 | 11/02/2026 09:40 | AT A LA MD LA VICTORIA PARA LOS PI JR. RAYMONDI CON CUI 2701768 | 3 | | 33 | 02346-2026 | 10/02/2026 17:00 | ASISTENCIA TÉCNICA A LA MP CALLAO PARA EL PROYECTO CUI 2617222 (JOSÉ GALVEZ) | 3 | | 34 | 02345-2026 | 11/02/2026 10:00 | ASISTENCIA TÉCNICA A LA MD VEINTISÉIS DE OCTUBRE PARA EL PROYECTO CUI 2304216 (LA MOLINA) | 3 | | 35 | 02327-2026 | 10/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PROYECTO CUI 2672085 (LUNA PIZARRO) | 3 | | 36 | 02285-2026 | 10/02/2026 11:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2710979 (PABLO PATRON) | 3 | | 37 | 02265-2026 | 10/02/2026 10:00 | ASISTENCIA A LA MD CURA MORI PARA EL PROYECTO CUI 2428198 (SANTA ROSA) | 3 | | 38 | 02242-2026 | 9/02/2026 16:00 | ASISTENCIA TÉCNICA A LA MD CURA MORI PARA EL PROYECTO CUI 2428198 (SANTA ROSA) | 3 | | 39 | 02233-2026 | 9/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PROYECTO CUI 2673098 (INDEPENDENCIA) | 3 | | 40 | 02207-2026 | 9/02/2026 10:00 | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PROYECTO CUI 2676126 (MARTIR OLAYA) | 3 | | 41 | 02158-2026 | 6/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2710979 (PABLO PATRON) | 3 | | 42 | 02110-2026 | 6/02/2026 12:00 | ASISTENCIA TÉCNICA A LA MD CURA MORI PARA EL PROYECTO CUI 2428198 (SANTA ROSA) | 3 | | 43 | 02080-2026 | 10/02/2026 16:30 | ASISTENCIA TÉCNICA PARA LA MD LA VICTORIA PARA EL PI CON CUI 2701931 | 3 | | 44 | 02078-2026 | 11/02/2026 14:30 | ASISTENCIA TÉCNICA A LA MD SAN MARTÍN DE PORRES PARA EL PI ALHELÍ CON CUI 2676867 | 3 | | 45 | 02076-2026 | 6/02/2026 14:15 | ASISTENCIA TÉCNICA PARA EL PI AV. SAN PABLO CON CUI 2701037 DE LA MD LA VICTORIA | 3 | | 46 | 02047-2026 | 5/02/2026 17:00 | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PROYECTO CUI 2673098 (INDEPENDENCIA) | 3 | | 47 | 02018-2026 | 5/02/2026 14:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2701930 (Sáenz PEÑA) | 3 | | 48 | 01992-2026 | 13/02/2026 14:15 | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PI AV. 12 DE OCTUBRE CON CUI 2677746 | 3 | | 49 | 01970-2026 | 5/02/2026 16:00 | ASISTENCIA TÉCNICA PARA LA MD LA VICTORIA PARA EL PI JULIO MENDOZA CON CUI 2701931 | 3 | | 50 | 01941-2026 | 4/02/2026 16:00 | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PI AV. 12 DE OCTUBRE CON CUI 2677746 | 3 | | 51 | 01926-2026 | 4/02/2026 12:00 | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PROYECTO CUI 2673098 (INDEPENDENCIA) | 3 | | 52 | 01908-2026 | 4/02/2026 10:40 | ASISTENCIA TÉCNICA PARA LA MUNICIPALIDAD LA VICTORIA PARA EL PI ANTONIO RAYMONDI CON CUI 2701768 | 3 | | 53 | 01900-2026 | 4/02/2026 11:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2710979 (PABLO PATRON) | 3 | | 54 | 01843-2026 | 3/02/2026 12:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2701930 (Sáenz PEÑA) | 3 | | 55 | 01833-2026 | 3/02/2026 11:00 | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD DISTRITAL DE LA VICTORIA | 3 | | 56 | 01817-2026 | 3/02/2026 10:00 | ASISTENCIA TÉCNICA A LA MD CURA MORI PARA EL PROYECTO CUI 2428198 (SANTA ROSA) | 3 | | 57 | 01812-2026 | 3/02/2026 14:30 | AT A LA MD LA VICTORIA PARA LOS PI AV SAN PABLO (CUI 2701037) Y JR. JULIO MENDOZA (CUI 2701931) | 3 | | 58 | 01810-2026 | 3/02/2026 10:00 | ASISTENCIA TÉCNICA PARA LA MUNICIPALIDAD LA VICTORIA PARA EL PI ANTONIO RAYMONDI CON CUI 2701768 | 3 | | 59 | 01775-2026 | 2/02/2026 16:00 | ASISTENCIA TÉCNICA A LA MD SAN MARTIN DE PORRES PARA EL PROYECTO CUI 2673098 (INDEPENDENCIA) | 3 | | 60 | 01755-2026 | 2/02/2026 15:00 | ASISTENCIA TÉCNICA A LA MD SAN MARTÍN DE PORRES PARA EL PROYECTO ALHELÍ | 3 | | 61 | 01739-2026 | 2/02/2026 11:00 | ASISTENCIA TÉCNICA A LA MD LA VICTORIA PARA EL PROYECTO CUI 2710979 (PABLO PATRON) | 3 |",li:"Demanda de proyectos para evaluación en aumento, y falta de especialistas para la evaluación.",me:"Seguimiento oportuno de las etapas de la evaluación, así como del levantamiento de observaciones por parte de los Gobiernos Locales.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108200084",mes:3,af:87,afi:69682.23,lg:"En el presente mes, se realizaron 29 asistencias técnicas con 87 personas capacitadas, a diferentes gobiernos locales, como se detalla a continuación: | Ítem | CÓDIGO | Fecha | Asunto | Personas capacitadas | | --- | --- | --- | --- | --- | | 1 | 05992-2026 | 31/03/2026 04:00 pm | ASISTENCIA TÉCNICA A LA MP CALLAO PARA EL PROYECTO CUI 2617222 (JOSE GALVEZ) | 3 | | 2 | 05649-2026 | 30/03/2026 10:30 am | AT A LA MDEGB PARA EL PI CALLES DE MANCHAY CON CUI 2309784 | 3 | | 3 | 05554-2026 | 26/03/2026 09:30 am | AT A LA MDEGB PARA EL PI CALLES DE MANCHAY CON CUI 2309784 | 3 | | 4 | 05510-2026 | 25/03/2026 04:00 pm | AT A LA MDEGB PARA EL PI CALLES DE MANCHAY CON CUI 2309784 | 3 | | 5 | 05418-2026 | 24/03/2026 03:30 pm | ASISTENCIA TÉCNICA A LA MP RIOJA PARA EL PROYECTO CUI 2717731 (CAMPO FERIAL) | 3 | | 6 | 05408-2026 | 24/03/2026 02:30 pm | ASISTENCIA TÉCNICA A LA MD CURA MORI PARA EL PROYECTO CUI 2428198 (SANTA ROSA) | 3 | | 8 | 05179-2026 | 20/03/2026 03:30 pm | ASISTENCIA TÉCNICA A LA MP CALLAO PARA EL PROYECTO CUI 2617222 (JOSE GALVEZ) | 3 | | 9 | 05025-2026 | 19/03/2026 11:30 am | ASISTENCIA TÉCNICA A LA MP RIOJA PARA EL PROYECTO CUI 2717731 (CAMPO FERIAL) | 3 | | 10 | 04819-2026 | 17/03/2026 03:30 pm | ASISTENCIA TÉCNICA A LA MP RIOJA PARA EL CUI 2717731 (CAMPO FERIAL) | 3 | | 11 | 04794-2026 | 17/03/2026 12:00 pm | ASISTENCIA TÉCNICA A LA MD CURA MORI PARA EL CUI 2428198 (SANTA ROSA) | 3 | | 12 | 04785-2026 | 17/03/2026 03:00 pm | AT A LA MDEGB PARA EL PI CALLES DE LACHAY CON CUI 2309784 | 3 | | 13 | 04519-2026 | 13/03/2026 02:30 pm | ASISTENCIA TÉCNICA PARA LOS PI CON CUI 2710708 Y 2717731 DE LA MP RIOJA | 3 | | 14 | 04366-2026 | 11/03/2026 10:00 am | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD PROVINCIAL DE RIOJA | 3 | | 15 | 04340-2026 | 11/03/2026 11:00 am | ASISTENCIA TÉCNICA A LA MD LA VICTORIA | 3 | | 16 | 04161-2026 | 09/03/2026 11:00 am | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD DISTRITAL DE LA VICTORIA | 3 | | 19 | 03879-2026 | 04/03/2026 04:00 pm | AT A LA MDEGB PARA EL PI JR. CLLAES DE LACHAY CON CUI 2309784 | 3 | | 20 | 03870-2026 | 04/03/2026 02:30 pm | ASISTENCIA TÉCNICA A LA MP CALLAO PARA EL PROYECTO CUI 2678247 (DOMINICOS) | 3 | | 21 | 03842-2026 | 04/03/2026 11:00 am | ASISTENCIA TÉCNICA A LA MD INDEPENDENCIA PARA EL PROYECTO CUI 2621891 (CESAR VALLEJO) | 3 | | 22 | 03836-2026 | 04/03/2026 10:00 am | ASISTENCIA TÉCNICA PARA EL PI JR. GARCÍA NARANJO CON CUI 2701760 DE LA MD LA VICTORIA | 3 | | 23 | 03797-2026 | 04/03/2026 11:30 am | ASISTENCIA TÉCNICA A LA MUNICIPALIDAD DISTRITAL DE 26 DE OCTUBRE (CUI 2304216) | 3 | | 24 | 03779-2026 | 03/03/2026 03:00 pm | ASISTENCIA TÉCNICA A LA MD INDEPENDENCIA PARA EL PROYECTO CUI 2621891 (CESAR VALLEJO) | 3 | | 25 | 03761-2026 | 03/03/2026 11:40 am | ASISTENCIA TÉCNICA PARA EL PI JR. GARCÍA NARANJO CON CUI 2701760 DE LA MD LA VICTORIA | 3 | | 26 | 03706-2026 | 02/03/2026 04:00 pm | ASISTENCIA TÉCNICA PARA LA MD NUEVO CHIMBOTE PARA EL PI AV. ALCATRACES CON CUI 2610726 | 3 | | 27 | 03700-2026 | 02/03/2026 04:00 pm | Mesa de Asistencia Técnica en Sede - CAC - LIMA | 3 | | 28 | 03661-2026 | 02/03/2026 10:30 am | Mesa de Asistencia técnica en Sede - CAC - LIMA | 3 | | 29 | 03550-2026 | 02/03/2026 04:00 pm | ASISTENCIA TÉCNICA PARA EL PI AV. ALCATRACES CON CUI 2610726 - MD NUEVO CHIMBOTE | 3 | | TOTAL, PERSONAS CAPACITADAS | 87 |",li:"Demanda de proyectos para evaluación en aumento, y falta de especialistas para la evaluación.",me:"Seguimiento oportuno de las etapas de la evaluación, así como del levantamiento de observaciones por parte de los Gobiernos Locales.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108200084",mes:4,af:33,afi:67909.5,lg:"En el presente mes, se realizaron 11 asistencias técnicas con 33 personas capacitadas, a diferentes gobiernos locales, como se detalla a continuación: | Item | CÓDIGO | Fecha | Asunto | Personas Capacitadas | | --- | --- | --- | --- | --- | | 1 | 08116-2026 | 30/04/2026 03:00 pm | ASISTENCIA TÉCNICA A LA MP RIOJA PARA EL PI  BARRIO RUPACUCHA CON CUI 2710708 | 3 | | 2 | 08091-2026 | 30/04/2026 10:00 am | ASISTENCIA TÉCNICA PARA LA MP CALLAO PARA EL PI  AV. BERTELLO CON CUI 2662874 | 3 | | 3 | 08083-2026 | 30/04/2026 11:10 am | ASISTENCIA TÉCNICA A LA MP RIOJA PARA EL PI  AV. CAMPO FERIAL CON CUI 2727019 | 3 | | 4 | 07749-2026 | 27/04/2026 11:00 am | ASISTENCIA TÉCNICA A LA MP RIOJA PARA VARIOS PI CON CUI 2710708 Y 2717731 | 3 | | 5 | 07486-2026 | 22/04/2026 03:00 pm | ASISTENCIA TÉCNICA A LA MP RIOJA POR VARIOS PROYECTOS | 3 | | 6 | 07398-2026 | 29/04/2026 09:30 am | ASISTENCIA TÉCNICA A LA MDSMP PARA EL PI JR. ALHEL CON CUI 2676867 | 3 | | 7 | 07353-2026 | 21/04/2026 03:00 pm | ASISTENCIA TÉCNICA A LA MDSMP PARA EL PI \"AV HONORIO DELGADO\" CON CUI 2662470 | 3 | | 8 | 06974-2026 | 16/04/2026 11:00 am | ASISTENCIA TÉCNICA A LA MDEGC PARA EL PI \"CALLES DE MANCHAY\" CON CUI 2309784 | 3 | | 9 | 06550-2026 | 10/04/2026 11:30 am | REUNIÓN DE COORDINACIÓN CON LA M.P. ZARUMILLA - PROYECTO PLAZA DE LA HERMANDAD | 3 | | 10 | 06184-2026 | 06/04/2026 04:00 pm | ASISTENCIA TÉCNICA PARA EL PI  \"CALLES DEL BARRIO RUPACUCHA\" CON CUI 2710708  DE LA MP RIOJA | 3 | | 11 | 06117-2026 | 28/04/2026 04:00 pm | AT A LA MD NUEVO CHIMBOTE PARA EL PI AV. ALCATRACES CON CUI 2610726 | 3 | | Total Personas Capacitadas | 33 |",li:"No se presentaron restricciones.",me:"Seguimiento oportuno de las etapas de la evaluación, así como del levantamiento de observaciones por parte de los Gobiernos Locales.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108200085",mes:1,af:0,afi:52347.76,lg:"No se han programado eventos para el presente mes.",li:"No se presentaron restricciones.",me:"En el presente mes no se han programado eventos.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108200085",mes:2,af:0,afi:76521.64,lg:"No se han programado eventos para el presente mes.",li:"No se presentaron restricciones.",me:"En el presente mes no se han programado eventos.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108200085",mes:3,af:0,afi:76059.97,lg:"No se han programado eventos para el presente mes.",li:"No se presentaron restricciones.",me:"En el presente mes no se han programado eventos.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108200085",mes:4,af:0,afi:63934.7,lg:"No se han programado eventos para el presente mes. PRE INVERSIÓN",li:"No se presentaron restricciones. PRE INVERSIÓN",me:"En el presente mes no se han programado eventos. PRE INVERSIÓN",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108200215",mes:1,af:1,afi:44500,lg:"Durante el mes de enero se realiza una prestación de servicio de mantenimiento, el cual es detallado a continuación: - Tratamiento preventivo de agua del circuito cerrado de planta de agua del sistema de HVAC en el Centro de Convenciones “27 DE ENERO” Ciudad de Lima (LCC).",li:"De acuerdo a la asignación presupuestal registrada en el PIM 2026 es de S/. 5,096,812.00, de los cuales no se tiene asignado presupuesto para mantenimiento, como se muestra en el siguiente cuadro: | Clasificador de Gastos | PIM | | --- | --- | | 2.3.1.5.1.2. PAPELERÍA EN GENERAL, ÚTILES Y MATERIALES DE OFICINA | S/ 5,000 | | 2.3.1.1.1.1. ALIMENTOS Y BEBIDAS PARA CONSUMO HUMANO | S/ 2,000 | | 2.3.2.2.1.1. SERVICIO DE SUMINISTRO DE ENERGÍA ELÉCTRICA | S/ 510,000 | | 2.3.2.2.1.2. SERVICIO DE AGUA Y DESAGÜE | S/ 30,000 | | 2.3.2.2.1.3. SERVICIO DE SUMINISTRO DE GAS | S/ 7,000 | | 2.3.2.2.2.2. SERVICIO DE TELEFONÍA FIJA | S/ 10,000 | | 2.3.2.2.2.3. SERVICIO DE INTERNET | S/ 10,000 | | 2.3.2.3.1.1. SERVICIOS DE LIMPIEZA E HIGIENE | S/ 1,320,000 | | 2.3.2.3.1.2. SERVICIOS DE SEGURIDAD Y VIGILANCIA | S/ 2,100,000 | | 2.3.2.7.13.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS JURÍDICAS | S/ 5,674 | | 2.5.4.3.2.1. DERECHOS ADMINISTRATIVOS | S/ 225,298 | | 2.3.2.6.3.99. OTROS SEGUROS DE BIENES MUEBLES E INMUEBLES | S/ 404,818 | | 2.3.2.9.1.1. LOCACIÓN DE SERVICIOS REALIZADOS POR PERSONA NATURAL | S/ 467,022 | | Total general | S/ 5,096,812 |",me:"Se solicitará la incorporación Saldo de Balance del Año Fiscal 2025 con Fuente de Financiamiento Donaciones y Transferencia, el cual facilitará realizar la contratación de las prestaciones requeridas para el mantenimiento del Centro de Convenciones “27 de Enero”, Ciudad de Lima (LCC).",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108200215",mes:2,af:1,afi:963922.87,lg:"- Durante el mes de febrero se continuó ejecutando una prestación de mantenimiento, el cual es detallado a continuación: - Tratamiento preventivo de agua del circuito cerrado de planta de agua del sistema de HVAC en el Centro de Convenciones “27 DE ENERO” Ciudad de Lima (LCC).",li:"Durante el mes de febrero no se registró la incorporación de presupuesto para el cumplimiento de los pagos y contrataciones de mantenimiento requeridos para garantizar la operatividad del LCC, registrándose una deuda de S/. 5,500.00 a la empresa NCH PERÚ S.A., por el servicio de Tratamiento preventivo de agua del circuito cerrado de planta de agua del sistema de HVAC en el LCC, el cual se viene ejecutando según lo establecido en el Contrato N° 041-2025-VIVIENDA-OGA-UE.001-CM.",me:"Se remitió el sustento de incorporación de los Saldos de Balance 2025, mediante el Informe N° 095-2026/PNC/P-CENTRO-DE-CONVENCIONES de fecha 13.02.2026.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108200215",mes:3,af:1,afi:1106428.81,lg:"- Durante el mes de marzo se continuó ejecutando una prestación de mantenimiento, el cual es detallado a continuación: - Tratamiento preventivo de agua del circuito cerrado de planta de agua del sistema de HVAC en el Centro de Convenciones “27 DE ENERO” Ciudad de Lima (LCC).",li:"Durante el mes de marzo no se ha generado la orden de servicio para el pago a la empresa NCH PERÚ S.A., por el servicio de Tratamiento preventivo de agua del circuito cerrado de planta de agua del sistema de HVAC en el LCC, el cual se viene ejecutando según lo establecido en el Contrato N° 041-2025-VIVIENDA-OGA-UE.001-CM, cuya deuda total asciende a S/. 11,000.00. Asimismo, aún no se efectúa la modificación de la Ley de Presupuesto 2026 que permita transferir los recursos provenientes de la realización de eventos privados, los cuales a la fecha sumarían un total de S/. 1,806,689.08, tal y como se detalla a continuación: - Asamblea General Ordinaria De La Asamblea Nacional De Gobiernos Regionales-ANGR (S/ 6,937.66) - Lima Airport: Innova La V2 (S/ 15,037.94) - Encuentro Compartamos 2026 (S/ 53,489.10) - Antorcha 2026 (S/ 120,606.79) - FSL FEBRERO 2026 (S/ 384,877.18) - Directorio CAF (S/ 290,055.41) - IATA WORLD CARGO SYMPOSIUM 2026 (S/ 378,365.41) - XXXIX Seminario Internacional De Blueberries Lima 2026 (S/ 209,437.94) - Incruises (S/ 92,121.77) - Harvard World Model United Nations – Worldmun Lima 2026 (S/ 156,380.00) - XXVIII Seminario Internacional De Seguridad Minera (S/ 99,379.88)",me:"Se incorporó las transferencias provenientes de los Saldos de Balance 2025, y los ingresos provenientes de los eventos realizados por las entidades públicas SERFOR, PROMPERU y JURADO NACIONAL DE ELECCIONES (JNE), los cuales en total suman un total de S/. 657,047.00, facilitando parcialmente el marco presupuestal para la contratación de prestaciones de operación y mantenimiento. A continuación, se detalla los informes remitidos para sustentar las incorporaciones de presupuesto: - Informe N°131-2026/PNC/P-CENTRO-DE-CONVENCIONES de fecha 05.03.2026 - Informe N°134-2026/PNC/P-CENTRO-DE-CONVENCIONES de fecha 10.03.2026 - Informe N°136-2026/PNC/P-CENTRO-DE-CONVENCIONES de fecha 10.03.2026 - Informe N°150-2026/PNC/P-CENTRO-DE-CONVENCIONES de fecha 23.03.2026",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108200215",mes:4,af:1,afi:370513.73,lg:"- Durante el mes de abril se continuó ejecutando una prestación de mantenimiento, el cual es detallada a continuación: Tratamiento preventivo de agua del circuito cerrado de planta de agua del sistema de HVAC en el Centro de Convenciones “27 DE ENERO” Ciudad de Lima (LCC). PROYECTO OLMOS",li:"Durante el mes de abril se evidencia que aún no se efectúa la modificación de la Ley de Presupuesto 2026 que permita transferir los recursos provenientes de la realización de eventos privados, los cuales a la fecha sumarían un total de S/. 2,247,111.09, considerando únicamente los eventos desarrollados hasta el 30.04.2026, los cuales se listan a continuación: - ASAMBLEA GENERAL ORDINARIA DE LA ASAMBLEA NACIONAL DE GOBIERNOS REGIONALES-ANGR - LIMA AIRPORT: INNOVA LA V2 - ENCUENTRO COMPARTAMOS 2026 - ANTORCHA 2026 - FSL FEBRERO 2026 -  DIRECTORIO CAF - IATA WORLD CARGO SYMPOSIUM 2026 - XXXIX SEMINARIO INTERNACIONAL DE BLUEBERRIES LIMA 2026 - INCRUISES - HARVARD WORLD MODEL UNITED NATIONS – WORLDMUN LIMA 2026 - XXVIII SEMINARIO INTERNACIONAL DE SEGURIDAD MINERA - CUMBRE APTC 2026 - WEALTH EXPO PERÚ - ERP SUMMIT 2026 - TALLER SER Y DÍA DE ÉXITO - SUMMIT LIMA 2026 NTTDTA PROYECTO OLMOS",me:"Se incorporó las transferencias generadas por los ingresos provenientes de los eventos realizados por las entidades públicas MINEDU, MIDAGRI, MIDIS y PCM, los cuales en total suman un total de S/. 295,986.00, facilitando parcialmente el marco presupuestal para la contratación de prestaciones de operación y mantenimiento. A continuación, se detalla los informes remitidos para sustentar las incorporaciones de presupuesto: - Informe N°200-2026/PNC/P-CENTRO-DE-CONVENCIONES de fecha 22.04.2026 - Informe N°201-2026/PNC/P-CENTRO-DE-CONVENCIONES de fecha 22.04.2026 - Informe N°205-2026/PNC/P-CENTRO-DE-CONVENCIONES de fecha 24.04.2026 - Informe N°206-2026/PNC/P-CENTRO-DE-CONVENCIONES de fecha 24.04.2026 PROYECTO OLMOS",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202256",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202256",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202256",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202256",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201684",mes:1,af:1,afi:12000,lg:"Durante el mes de enero, se logró realizar un (01) informe, el cual se detalla a continuación: - Informe sobre la necesidad de efectuar las modificaciones presupuestales lo cual permitirá contar con recursos financieros en los diversos clasificadores.",li:"Al cierre del mes de enero no se registró limitaciones en la presente meta.",me:"Necesidad de efectuar las modificaciones presupuestales lo cual permitirá contar con recursos financieros en los diversos clasificadores.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201684",mes:2,af:3,afi:59259.6,lg:"Durante el mes de febrero, se logró realizar tres (03) informes, los cuales se detallan a continuación: - Se elaboró un informe orientado a la actualización de la programación presupuestal en el marco de la priorización de recursos de inversión, concluyendo la necesidad de fortalecer las acciones de gestión y seguimiento presupuestal para optimizar el uso de los recursos disponibles y asegurar la ejecución oportuna de los proyectos en el ejercicio fiscal 2026. - Se elaboró un Informe correspondiente a la evaluación del Noveno Entregable del servicio de vigilancia de infraestructura, correspondiente al Contrato N°070-2025-VIVIENDA-OGA-UE.001, verificando el cumplimiento de las obligaciones contractuales y contribuyendo a la continuidad operativa de las intervenciones en curso. - Se emitió la propuesta de evaluadores para la conformación del comité para la contratación del Servicio de Vigilancia de la Infraestructura Instalada para los Proyectos con Contrato de Obra Resuelto del Programa de Inversión: “PROG 12-2014-SNIP Habilitación para la Creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento de Lambayeque”.",li:"- Dependencia de la disponibilidad y actualización de información presupuestal y administrativa. - Coordinación entre áreas para la evaluación de entregables y procesos de contratación. - Cumplimiento de procedimientos y plazos administrativos institucionales.",me:"- Fortalecer el seguimiento y control de la programación presupuestal para optimizar el uso de los recursos de inversión durante el ejercicio fiscal 2026. - Verificar oportunamente el cumplimiento de las obligaciones contractuales del servicio de vigilancia de infraestructura. - Impulsar el proceso de contratación del servicio de vigilancia mediante la conformación del comité de evaluación correspondiente.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201684",mes:3,af:2,afi:10000,lg:"Durante el mes de marzo, se logró realizar dos (02) informes, los cuales se detallan a continuación: - Informe con pronunciamiento técnico sobre la validación de los requisitos presentados por la empresa Protection Oriente Perú S.A.C., en el marco del perfeccionamiento del Contrato Complementario al Contrato N° 070-2025-VIVIENDA-OGA-UE.001, correspondiente al “Servicio de Vigilancia”. - Informe con pronunciamiento técnico sobre las acciones preventivas y correctivas al Hito de Control N°7, correspondiente al proyecto signado con CUI 2256322.",li:"- Se vienen presentando limitaciones en el desarrollo de las actividades debido al recorte de personal, lo cual afecta la capacidad operativa y pone en riesgo el cumplimiento oportuno de las metas programadas.",me:"Necesidad de efectuar coordinaciones con la Secretaría General para la aprobación de las contrataciones de personal.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201684",mes:4,af:2,afi:34691.5,lg:"Durante el mes de abril, se logró realizar dos (02) informes, los cuales se detallan a continuación: - Informe con pronunciamiento técnico sobre la necesidad de efectuar consulta a OACP sobre la implementación del Comité de Gestión de riesgos, en el marco del Artículo 156 del Reglamento de la Ley General de Contrataciones Públicas. - Informe con pronunciamiento técnico sobre el Grado de Innovación y Nivel de Complejidad de la inversión relacionada al saldo de obra.",li:"- Se vienen presentando limitaciones en el desarrollo de las actividades de las actividades programadas para la nueva convocatoria del saldo de obra, ello a razón de la falta de disponibilidad presupuestal necesaria para garantizar la contratación pública.",me:"Se viene efectuando coordinaciones con la OGPP y la OACP a efectos de buscar la mejor solución para dar inicio a la contratación pública del saldo de obra.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201259",mes:1,af:0,afi:0,lg:"Al mes de enero no se tiene ningún avance de la ejecución de la meta física programada. Aunque, se realizó coordinaciones internas del estado de la subasta del predio, los cuales se obtuvieron conocimiento de dos postores hábiles para la subasta del Predio 11 para desarrollo inmobiliario. La subasta se realizará el 02 de febrero de 2026.",li:"Al cierre del mes de enero se tiene conocimiento de 02 postores hábiles (apertura del Sobre 01) para la subasta pública del predio 11, no se registran limitaciones en la meta física establecida, se continúa el proceso de subasta según cronograma aprobado por la SBN y GORE Lambayeque.",me:"Se espera conocer los resultados de la subasta pública programada para el 02 de febrero de 2026.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201259",mes:2,af:7,afi:1840,lg:"Durante el mes de febrero, se logró realizar siete (07) informes, los cuales se detallan a continuación: - Se elaboró un informe relacionado con la solicitud de información actualizada sobre el estado de la subasta del Macro Lote 11, la implementación del fideicomiso y las acciones desarrolladas a la fecha, a fin de fortalecer el seguimiento de los procesos en curso y contribuir a la toma de decisiones informadas. - Informe N° 00000019-2026/PNC/P-NC-OLMOS, con pronunciamiento sobre la ejecución de acciones de supervisión de Autorización de Desbosque, en atención a lo señalado, se propone al Especialista en Desarrollo Urbano (Coordinador Proyecto Olmos), Ing. Giovanni Yuri Blanco Cuentas, identificado con DNI 01343804 y la Especialista Ambiental Ing. Cynthia Fabiola Avellaneda Villanueva, identificada con DNI 44879559, como equipo técnico para la diligencia programada. - Informe N° 00000022-2026/PNC/P-NC-OLMOS, con pronunciamiento respecto a la solicitud comisión de servicio para la asistencia técnica durante la supervisión de las áreas y componentes desboscados en marco de la autorización de desbosque con código AUT-DES-2017-12, convocada por SERFOR. - Informe N° 00000023-2026/PNC/P-NC-OLMOS, sobre las solicitudes de información de la Municipalidad distrital de Olmos, respecto al proyecto Nueva Ciudad de Olmos y los requerimientos de reunión técnica informativa y de coordinación. - Otros N° 00000003-2026/PNC/P-NC-OLMOS, solicitud de comisión de servicio para la asistencia técnica durante la supervisión de las áreas y componentes desboscados en marco de la autorización de desbosque con código AUT-DES-2017-12, convocada por SERFOR. - Informe N° 00000028-2026/PNC/P-NC-OLMOS, remisión de informe de sustento para reporte registro Formato 12b y Sistema de seguimiento de proyectos (SSP), para proyectos en ejecución del programa de inversión “Habilitación para la creación de la nueva ciudad de olmos” – enero 2026. - Informe N° 00000031-2026/PNC/P-NC-OLMOS, sobre la solicitud de información actualizada del estado actual de la subasta del macro lote 11, la creación del fideicomiso y demás acciones realizadas.",li:"- Dependencia de información proporcionada por otras áreas o entidades para la elaboración de los informes. - Necesidad de coordinación interinstitucional para la ejecución de acciones de supervisión. - Disponibilidad de personal técnico y aspectos logísticos para el desarrollo de las diligencias en campo.",me:"Se remite a la Municipalidad Distrital de Olmos la información actualizada sobre el estado de la subasta del Macro Lote 11, así como los avances relacionados con la creación del Fideicomiso y las demás acciones realizadas a la fecha.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201259",mes:3,af:3,afi:18924.06,lg:"Durante el mes de marzo, se logró realizar tres (03) informes, los cuales se detallan a continuación: - Informe N° 00000028-2026/PNC/P-NC-OLMOS, remisión de informe de sustento para reporte registro Formato 12b y Sistema de seguimiento de proyectos (SSP), para proyectos en ejecución del programa de inversión “Habilitación para la creación de la nueva ciudad de olmos” – enero 2026. - Informe N° 044-2026/PNC/P-NC-OLMOS, respecto del pronunciamiento sobre el otorgamiento de la Reserva de recursos hídricos para atender la demanda hídrica de uso poblacional para la ciudad Charles Sutton (Nueva Ciudad de Olmos) - Informe Técnico Legal N° 002-2026/PNC/P-NC-OLMOS, atención a la solicitud de reunión de alto nivel correspondiente al Convenio Específico N° 071-2016-VIVIENDA y la subasta de Macrolote 11.",li:"- Al cierre del mes de marzo, no hubo avance referido a la venta de los macrolotes, dado la declaratoria de desierto de la primera subasta, lo cual su continuidad está sujeto a las acciones por parte de todos los interesados. - Por otro lado, los proyectos de inversión conformantes del programa se encuentran sujetos a la disponibilidad presupuestal, los proyectos se encuentran sujetos.",me:"Se sostuvo reuniones con las partes interesadas en cuanto a las acciones a seguir relacionados con la creación del Fideicomiso y las demás acciones referidas a la subasta. Asimismo, se analizó el procedimiento óptimo respecto de la formulación de proyectos en etapa de preinversión que conforman el programa.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201259",mes:4,af:2,afi:18000,lg:"Durante el mes de abril, se logró realizar dos (02) informes, los cuales se detallan a continuación: - Informe N° 052-2026/PNC/P-NC-OLMOS, respecto del Plan de Trabajo para implementar acciones en la formulación de la Idea de Proyecto “Creación de la Red de Servicio(S) de Espacios Públicos Urbanos en 4 Unidades Productoras del Centro Poblado Nueva Ciudad de Olmos. - Informe N° 052-2026/PNC/P-NC-OLMOS, respecto Cronograma de actividades y Programación financiera para formulación del proyecto  “Creación de la Red de Servicio(S) de Espacios Públicos Urbanos en 4 Unidades Productoras del Centro Poblado Nueva Ciudad de Olmos",li:"- Al cierre del mes de marzo, no hubo avance referido a la venta de los macrolotes, dado la declaratoria de desierto de la primera subasta, lo cual su continuidad está sujeto a las acciones por parte de todos los interesados. - Por otro lado, no existe avance respecto de los proyectos en etapa de preinversión conformantes del programa, dado que se encuentran sujetos a la disponibilidad presupuestal.",me:"Se sostuvo reuniones con el viceministerio de vivienda y construcción respecto de las acciones a seguir en cuanto a la venta de los macrolotes- subasta. Asimismo se aprobó el Plan de Trabajo para las acciones referidas al proyecto de preinversión que conforma el programa de inversión.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201258",mes:1,af:1,afi:0,lg:"Durante el mes de enero, se consolidó en un informe, varios informes que a continuación se detalla: - Requerimiento N° 001-2026/PNC/P-BELÉN. Sobre requerimiento del servicio especializado en gestión social para la promoción de la sostenibilidad de los servicios, el fortalecimiento del tejido comunitario y la coordinación interinstitucional con los actores involucrados, en la nueva ciudad de Belén – CUI N° 2277384. - Informe N° 001-2026/PNC/P-BELÉN. sobre absolución de consultas y observaciones del concurso público abreviado Nº 19-2025-VIVIENDA-OGA-UE-1 derivado del concurso público para consultoría N° 1-2025-VIVIENDA-OGA-UE-1. Consultoría para elaborar un informe técnico Sustentatorio (ITS) por modificaciones al EIA-D del Programa de inversión pública “habilitación urbana para la reubicación de la población de la zona baja de Belén en el predio el Varillalito en el distrito de san juan bautista, provincia de Maynas, departamento de loreto”. - Informe Técnico Legal N° 001-2026/PNC/P-BELÉN. Sobre propuesta de modificación de la “habilitación urbana para la reubicación de la población de la zona baja de Belén en el predio el Varillalito en el distrito de san juan bautista, provincia de Maynas, departamento de loreto”, con código SNIP PROG-3-2015. - Requerimiento N° 00000002-2026/PNC/P-BELÉN. Sobre contratación del servicio de gestión de proyectos, para el perfeccionamiento del contrato y ejecución contractual del informe técnico sustentatorio (ITS), correspondiente al Programa de inversión de la nueva ciudad de Belén. - Informe N° 00000002-2026/PNC/P-BELÉN. Sobre sobre propuesta de personal con conocimiento técnico para reconformación del comité de selección de la convocatoria para la “consultoría para elaborar un Informe Técnico Sustentatorio (ITS) por modificaciones al EIA-D del Programa de inversión pública “habilitación urbana para la reubicación de la población de la zona baja de Belén en el predio el Varillalito en el distrito de san juan bautista, provincia de Maynas, departamento de loreto”, con código SNIP PROG-3-2015”. - Informe N° 00000003-2026/PNC/P-BELÉN. Sobre informe de sustento para el registro del formato 12b, referente al mes diciembre 2025, correspondiente a la ejecución de los proyectos: CUI N° 2277384, CUI N° 2300564, CUI N° 2300167 y CUI N° 2307577. - Informe N° 00000004-2026/PNC/P-BELÉN. Sobre presentación del plan y cronograma de trabajo sobre documentos archivísticos – proyecto nueva ciudad de Belén.",li:"- Actualmente, no se cuenta con recursos asignados para iniciar el proceso de contratación, el mismo que también está condicionado a la aprobación favorable del Informe Técnico Sustentatorio, que incorporará las modificaciones al proyecto en el EIA-d (modificaciones a la Habilitación Urbana y fuente de agua a través de pozos subterráneos); el mismo que a la fecha del presente se encuentra en perfeccionamiento de contrato para su ejecución. - En el mes de enero no se contó con el personal técnico mínimo para gestionar el proyecto.",me:"Actualmente se cuenta con el requerimiento actualizado a julio de 2025, para la contratación del ejecutor, por lo que se necesita mayor asignación presupuestal. Se tiene programada una reunión para el día 06.02.2026 con la Municipalidad Distrital de San Juan Bautista para evaluar el expediente para la actualización de la Habilitación Urbana de la Nueva Ciudad de Belén – VARILLALITO”.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201258",mes:2,af:1,afi:3597.2,lg:"Durante el mes de febrero, se consolidó en un informe, varios informes que a continuación se detalla: - Informe Técnico N° 001-2026/PNC/P-BELÉN. Sobre validación técnica de los requisitos presentado por el Consorcio Cielo Azul Del Eden, para perfeccionamiento del contrato derivado del Concurso Público Abreviado Nº 19-2025-VIVIENDA-OGA-UE-1; para la “contratación de consultoría para elaborar un informe técnico Sustentatorio (ITS) por modificaciones al EIA-d del programa de inversión pública “habilitación urbana para la reubicación de la población de la zona baja de Belén en el predio el Varillalito en el distrito de san juan bautista. - Informe Técnico N° 002-2026/PNC/P-BELÉN.  Sobre informe complementario al  informe técnico N° 001-2026/PNC/P-BELÉN sobre validación técnica de los requisitos presentado por el consorcio Cielo Azul del Edén, para perfeccionamiento de contrato derivado del concurso público abreviado Nº 19-2025-VIVIENDA-OGA-UE-1; para la  “contratación de consultoría para elaborar un informe técnico Sustentatorio (ITS) por modificaciones al EIA-d del programa de inversión pública “habilitación urbana para la reubicación de la población de la zona baja de Belén. - Informe Técnico Legal N° 002-2026/PNC/P-BELÉN. Sobre solicitud del congresista de la república Edwin Martínez Talavera, respecto al pedido del Sr. Rolando Murrieta Ruiz, presidente del Frente Cívico De Loreto. - Informe N° 00000005-2026/PNC/P-BELÉN. Sobre solicitud de comisión de servicio para brindar asistencia técnica a los especialistas de SERFOR para la supervisión de desbosque con código AUT-DES-2018-17, en el marco del programa de inversión pública “habilitación urbana para la reubicación de la población de la Zona Baja de Belén, en el predio el Varillalito del distrito de San Juan Bautista, provincia de Maynas, departamento de Loreto” con CUI N° 2277384. - Informe N° 00000006-2026/PNC/P-BELÉN. Sobre atención a la nueva consulta presentada por la Sra. Ana María Sinti Díaz sobre el estado del proceso de inconstitucionalidad. - Informe N° 0007-2026/PNC/P-BELÉN, sobre solicitud de comisión de servicio para el Ing. Salvador Ernesto Alvarado Tovar, los días 24 al 26 de febrero, a la ciudad de Iquitos para realizar el levantamiento con vuelo dron que permita dimensionar la totalidad de las ocupaciones del predio el Piñal, del programa de inversión de la Nueva Ciudad de Belén con CUI N°2277384. - Informe N° 008-2026/PNC/P-BELÉN. Sobre solicitud de comisión de servicio para realizar la visita técnica y acompañamiento al levantamiento con vuelo dron que permita dimensionar la totalidad de las ocupaciones del predio el pinal, del programa de inversión de la nueva ciudad de Belén; asimismo, verificar los servicios  de agua potable y alcantarillado en la zona de Varillalito encargado de la operación y mantenimiento por SEDALORETO. - Informe N° 009-2026/PNC/P-BELÉN. Sobre informe de sustento para el registro formato 12B, correspondiente a la ejecución de los proyectos: CUI N° 2277384, CUI N° 2300564, CUI N° 2300167 y CUI N° 2307577 – enero 2026. - Informe N° 00000010-2026/PNC/P-BELÉN. sobre el levantamiento de observaciones de la  validación técnica de los requisitos presentado por el consorcio Cielo Azul del Edén, para perfeccionamiento de contrato derivado del concurso público abreviado Nº 19-2025-VIVIENDA-OGA-UE-1; para la  “contratación de consultoría para elaborar un informe técnico Sustentatorio (ITS) por modificaciones al EIA-d del programa de inversión pública “habilitación urbana para la reubicación de la población de la Zona Baja de Belén en el predio el Varillalito.",li:"- No se cuenta con recursos asignados para iniciar el proceso de contratación, el mismo que también está condicionado a la aprobación favorable del Informe Técnico Sustentatorio, que incorporará las modificaciones al proyecto en el EIA-d (modificaciones a la Habilitación Urbana y fuente de agua a través de pozos subterráneos); el mismo que a la fecha del presente se encuentra en perfeccionamiento de contrato para su ejecución. - En el mes de febrero se tiene contratado un especialista social en la Zona del Proyecto y un especialista en gestión de proyectos para implementar las acciones programadas en el proyecto.",me:"Actualmente se cuenta con el requerimiento actualizado a julio de 2025, para la contratación del ejecutor, por lo que se necesita mayor asignación presupuestal. Con fecha 03.03.2026, mediante Resolución de Licencia de Habilitación Urbana N° 003-2026-CTHUE-SGDT-GDTI-MDSJB, se aprobó la modificación de la Habilitación Urbana de la Nueva Ciudad de Belén – VARILLALITO”.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201258",mes:3,af:4,afi:18957.74,lg:"Durante el mes de marzo, se consolidó en un informe, varios informes que a continuación se detalla: - Informe N° 00000017-2026/PNC/P-BELÉN, Sobre la solicitud de información oficial sobre inversión ejecutada y prevista e impulso de acciones para la continuidad de obras del proyecto Nueva Ciudad de Belén -Varillalito con Código SNIP PRO-3-2015”. - Informe N° 00000019-2026/PNC/P-BELÉN, Persistencia de la necesidad de la continuidad de la contratación pública y la objeción a la modificación del requerimiento - consultoría para elaborar un Informe Técnico Sustentatorio (ITS) por modificaciones al EIA-D del programa de inversión pública “Habilitación urbana para la reubicación de la población de la zona baja de Belén en el predio el Varillalito en el distrito de San Juan Bautista, provincia de Maynas, departamento de Loreto. - Informe N° 00000020-2026/PNC/P-BELÉN, Levantamiento de observaciones referidas a la persistencia de la necesidad de contratar el servicio de consultoría del concurso público abreviado no. 19-2025-VIVIENDA-OGAUE-1. - Informe N° 00000014-2026/PNC/P-BELÉN, Sobre la solicitud de información oficial sobre inversión ejecutada y prevista e impulso de acciones para la continuidad de obras del proyecto nueva ciudad de Belén -Varillalito con Código SNIP PROG-3-2015”.",li:"- No se cuenta con recursos asignados para iniciar el proceso de contratación, el mismo que también está condicionado a la aprobación favorable del Informe Técnico Sustentatorio, que incorporará las modificaciones al proyecto en el EIA-d (modificaciones a la Habilitación Urbana y fuente de agua a través de pozos subterráneos); el mismo que a la fecha del presente se encuentra en perfeccionamiento de contrato para su ejecución. - En el mes de marzo se remitió la persistencia de la necesidad de la continuidad de la contratación de la consultoría para elaborar un informe técnico sustentatorio (ITS) por modificaciones al EIA-D del programa.",me:"Actualmente se remitió la persistencia de la necesidad de la continuidad de la contratación de la consultoría para elaborar un informe técnico sustentatorio (ITS) por modificaciones al EIA-D del programa.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201258",mes:4,af:1,afi:16466.34,lg:"Durante el mes de abril, se consolidó en un informe, varios informes que a continuación se detalla: - INFORME N° 00000021-2026/PNC/P-BELÉN, Habilitación de recursos para proceso de contratación de its para el 2027 consultoría para elaborar un informe técnico sustentatorio (its) por modificaciones al eia-d del programa de inversión publica “habilitación urbana para la reubicación de la población de la zona baja de velen en el predio el varillalito en el distrito de san juan bautista, provincia de Maynas, departamento de loreto”, con código snip prog-3-2015. - INFORME N° 00000020-2026/PNC/P-BELÉN, Levantamiento de observaciones referidas a la persistencia de la necesidad de contratar el servicio de consultoría del concurso público abreviado no. 19-2025-vivienda-ogaue-1. - REQUERIMIENTO N° 00000005-2026/PNC/P-BELÉN, Requerimiento del servicio para la gestión y seguimiento técnico de actividades referidas a la habilitación urbana, así como de realizar acciones de acompañamiento social con los beneficiarios del proyecto nueva ciudad de belén - varillalito correspondiente al componente de gestión del programa de inversión publica con código snip prog 03-2015 – cui n.º 2277384 - OTROS N° 00000005-2026/PNC/P-BELÉN, Requerimiento del servicio en gestión de proyectos, para el seguimiento y control, incluyendo ejecución contractual, a los procesos derivados del programa de inversión de la nueva ciudad de belén. - Informe Técnico N° 00000005-2026/PNC/P-BELÉN, Resolución contractual de la orden de servicio N°0002438-2026 - INFORME DE CONFORMIDAD N° 00000004-2026/PNC/P-BELÉN, Sobre conformidad de servicio al informe de actividades – segundo entregable para el “servicio especializado en gestión social para la promoción de la sostenibilidad de los servicios, el fortalecimiento del tejido comunitario y la coordinación interinstitucional con los actores involucrados, en la nueva ciudad de Belén – CUI N.° 2277384. - REQUERIMIENTO N° 00000004-2026/PNC/P-BELÉN, Requerimiento del servicio para la gestión y seguimiento técnico de actividades referidas a la habilitación urbana, así como de realizar acciones de acompañamiento social con los beneficiarios del proyecto nueva ciudad de belén - varillalito correspondiente al componente de gestión del programa de inversión pública con código snip prog 03-2015 – cui n.º 2277384 - Informe Técnico N° 00000004-2026/PNC/P-BELÉN, Medidas para acelerar la ejecución de las inversiones en el año 2026 del proyecto nueva ciudad de belén - varillalito con código snip prog 03-2015 – cui n.º 2277384 - OTROS N° 00000004-2026/PNC/P-BELÉN, Contratación del servicio en gestión de proyectos, para el seguimiento y control, incluyendo ejecución contractual, a los procesos derivados del programa de inversión de la nueva ciudad de belén. - Informe Técnico N° 00000003-2026/PNC/P-BELÉN, Medidas para acelerar la ejecución de las inversiones en el año 2026 del proyecto nueva ciudad de belén - varillalito con código snip prog 03-2015 – CUI n.º 2277384 - Informe Técnico Legal N° 00000003-2026/PNC/P-BELÉN, Sobre solicitud de emitir informe técnico-legal respecto de los hechos de la demanda interpuesta por remigio Reynaldo Casma Chacaltana - laudo arbitral emitido en el expediente arbitral N° s- 112-2017/sna-osce PROYECTO MALECÓN ZARUMILLA",li:"- Aún no se cuenta con recursos asignados para iniciar el proceso de contratación de Diseño y Obra, lo cual se requiere para iniciar el proceso de convocatoria en Julio. - No se cuenta con ejecución de instalaciones de agua temporal en la 2da etapa, se coordinó con SEDALORETO lo han programado para Setiembre 2026. PROYECTO MALECÓN ZARUMILLA",me:"Se ha convocado el 30 de abril el proceso para el servicio del ITS. Se coordino con SEDALORETO la ejecución de la 2da etapa de agua Se coordinó con MDSJB para apoyo con mejoramiento de vías. Se coordino con COFOPRI para modificación en RRPP del PTL PROYECTO MALECÓN ZARUMILLA",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201680",mes:1,af:0,afi:0,lg:"Al cierre del mes de enero no se realizaron avances de supervisión y liquidación de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"No se presentaron limitaciones.",me:"Al cierre del mes de enero, no se realizaron avances de supervisión y liquidación de obra, por lo tanto, no se cuenta con ninguna medida adoptada a la fecha.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201680",mes:2,af:0,afi:0,lg:"Al cierre del mes de febrero no se realizaron avances de supervisión y liquidación de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"No se presentaron limitaciones.",me:"Al cierre del mes de febrero, no se realizaron avances de supervisión y liquidación de obra, por lo tanto, no se cuenta con ninguna medida adoptada a la fecha.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201680",mes:3,af:0,afi:0,lg:"Al cierre del mes de marzo no se realizaron avances de supervisión y liquidación de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"No se presentaron limitaciones.",me:"Al cierre del mes de marzo, no se realizaron avances de supervisión y liquidación de obra, por lo tanto, no se cuenta con ninguna medida adoptada a la fecha.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201680",mes:4,af:0,afi:0,lg:"Al cierre del mes de abril no se realizaron avances de supervisión y liquidación de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"No se presentaron limitaciones.",me:"Al cierre del mes de abril, no se realizaron avances de supervisión y liquidación de obra, por lo tanto, no se cuenta con ninguna medida adoptada a la fecha.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201640",mes:1,af:0,afi:0,lg:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201640",mes:2,af:0,afi:0,lg:"Al cierre del mes de febrero no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de febrero no se realizaron avances de obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de febrero no se realizaron avances de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201640",mes:3,af:0,afi:0,lg:"Al cierre del mes de marzo no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de marzo no se realizaron avances de obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de marzo no se realizaron avances de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201640",mes:4,af:0,afi:0,lg:"Al cierre del mes de abril no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de abril no se realizaron avances de obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de abril no se realizaron avances de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201679",mes:1,af:0,afi:0,lg:"Al cierre del mes de enero no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de enero no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de enero no se realizaron avances en la supervisión y liquidación de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201679",mes:2,af:0,afi:0,lg:"Al cierre del mes de febrero no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de febrero no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de febrero no se realizaron avances en la supervisión y liquidación de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201679",mes:3,af:0,afi:0,lg:"Al cierre del mes de marzo no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de marzo no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de marzo no se realizaron avances en la supervisión y liquidación de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201679",mes:4,af:0,afi:0,lg:"Al cierre del mes de abril no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de abril no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de abril no se realizaron avances en la supervisión y liquidación de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201695",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201695",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201695",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201695",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201778",mes:1,af:0,afi:0,lg:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201778",mes:2,af:0,afi:0,lg:"Al cierre del mes de febrero no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de febrero no se realizaron avances de obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de febrero no se realizaron avances de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201778",mes:3,af:0,afi:0,lg:"Al cierre del mes de marzo no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de marzo no se realizaron avances de obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de marzo no se realizaron avances de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201778",mes:4,af:0,afi:0,lg:"Al cierre del mes de abril no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de abril no se realizaron avances de obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de abril no se realizaron avances de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201776",mes:1,af:0,afi:0,lg:"Al cierre del mes de enero no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de enero no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de enero no se realizaron avances en la supervisión y liquidación de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201776",mes:2,af:0,afi:0,lg:"Al cierre del mes de febrero no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de febrero no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de febrero no se realizaron avances en la supervisión y liquidación de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201776",mes:3,af:0,afi:0,lg:"Al cierre del mes de marzo no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de marzo no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de marzo no se realizaron avances en la supervisión y liquidación de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201776",mes:4,af:0,afi:0,lg:"Al cierre del mes de abril no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de abril no se realizaron avances en la supervisión y liquidación de la obra, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de abril no se realizaron avances en la supervisión y liquidación de obra, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201777",mes:1,af:1,afi:10000,lg:"Durante el mes de enero, se logró realizar un (01) informe, el cual se detalla a continuación: - Informe sobre la necesidad de efectuar las modificaciones presupuestales lo cual permitirá contar con recursos financieros en los diversos clasificadores.",li:"Al cierre del mes de enero no se registró limitaciones en la presente meta.",me:"Necesidad de efectuar las modificaciones presupuestales lo cual permitirá contar con recursos financieros en los diversos clasificadores.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201777",mes:2,af:1,afi:39506.4,lg:"Durante el mes de febrero, se logró realizar un informe, que consolida los siguientes informes: - Se elaboró un Informe orientado a la actualización de la programación presupuestal en el marco de la priorización de recursos de inversión, concluyendo la necesidad de fortalecer las acciones de gestión y seguimiento presupuestal para optimizar el uso de los recursos disponibles y asegurar la ejecución oportuna de los proyectos en el ejercicio fiscal 2026. - Se elaboró un informe correspondiente a la evaluación del Noveno Entregable del servicio de vigilancia de infraestructura, correspondiente al Contrato N°070-2025-VIVIENDA-OGA-UE.001, verificando el cumplimiento de las obligaciones contractuales y contribuyendo a la continuidad operativa de las intervenciones en curso. - Se emitió la propuesta de evaluadores para la conformación del comité para la contratación del Servicio de Vigilancia de la Infraestructura Instalada para los Proyectos con Contrato de Obra Resuelto del Programa de Inversión: “PROG 12-2014-SNIP Habilitación para la Creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento de Lambayeque”. - Se emitió pronunciamiento sobre la reiteración del aviso de cobranza de los intereses del Laudo Arbitral emitido en el Expediente Arbitral N° I526-2018.",li:"- Dependencia de la disponibilidad y actualización de información presupuestal y administrativa. - Coordinación entre áreas para la evaluación de entregables y procesos de contratación. - Cumplimiento de procedimientos y plazos administrativos institucionales.",me:"- Fortalecer el seguimiento y control de la programación presupuestal para optimizar el uso de los recursos de inversión durante el ejercicio fiscal 2026. - Verificar oportunamente el cumplimiento de las obligaciones contractuales del servicio de vigilancia de infraestructura. - Impulsar el proceso de contratación del servicio de vigilancia mediante la conformación del comité de evaluación correspondiente.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201777",mes:3,af:2,afi:20000,lg:"Durante el mes de marzo, se logró realizar dos (02) informes, los cuales se detallan a continuación: - Informe con pronunciamiento técnico sobre la validación de los requisitos presentados por la empresa Protection Oriente Perú S.A.C., en el marco del perfeccionamiento del Contrato Complementario al Contrato N° 070-2025-VIVIENDA-OGA-UE.001, correspondiente al “Servicio de Vigilancia”. - Informe con pronunciamiento técnico sobre las acciones preventivas y correctivas al Hito de Control N° 10, correspondiente al proyecto signado con CUI 2266697.",li:"- Se vienen presentando limitaciones en el desarrollo de las actividades debido al recorte de personal, lo cual afecta la capacidad operativa y pone en riesgo el cumplimiento oportuno de las metas programadas.",me:"Necesidad de efectuar coordinaciones con la Secretaría General para la aprobación de las contrataciones de personal.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201777",mes:4,af:2,afi:36461,lg:"Durante el mes de abril, se logró realizar dos (02) informes, los cuales se detallan a continuación: - Informe con pronunciamiento técnico sobre la necesidad de efectuar consulta a OACP sobre la implementación del Comité de Gestión de riesgos, en el marco del Artículo 156 del Reglamento de la Ley General de Contrataciones Públicas. - Informe con pronunciamiento técnico sobre el Grado de Innovación y Nivel de Complejidad de la inversión relacionada al saldo de obra.",li:"- Se vienen presentando limitaciones en el desarrollo de las actividades de las actividades programadas para la nueva convocatoria del saldo de obra, ello a razón de la falta de disponibilidad presupuestal necesaria para garantizar la contratación pública.",me:"Se viene efectuando coordinaciones con la OGPP y la OACP a efectos de buscar la mejor solución para dar inicio a la contratación pública del saldo de obra.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201852",mes:1,af:0,afi:0,lg:"Al cierre del mes de enero no se realizaron avances en el expediente técnico, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de enero no se realizaron avances en el expediente técnico, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de enero no se realizaron en el expediente técnico, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201852",mes:2,af:0,afi:0,lg:"Al cierre del mes de febrero no se realizaron avances en el expediente técnico, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de febrero no se realizaron avances en el expediente técnico, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de febrero no se realizaron en el expediente técnico, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201852",mes:3,af:0,afi:0,lg:"Al cierre del mes de marzo no se realizaron avances en el expediente técnico, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de marzo no se realizaron avances en el expediente técnico, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de marzo no se realizaron en el expediente técnico, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201852",mes:4,af:0,afi:0,lg:"Al cierre del mes de abril no se realizaron avances en el expediente técnico, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de abril no se realizaron avances en el expediente técnico, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de abril no se realizaron en el expediente técnico, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201854",mes:1,af:0,afi:0,lg:"Al cierre del mes de enero no se realizaron avances en el expediente técnico, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de enero no se realizaron avances en el expediente técnico, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de enero no se realizaron en el expediente técnico, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108201854",mes:2,af:0,afi:0,lg:"Al cierre del mes de febrero no se realizaron avances en el expediente técnico, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de febrero no se realizaron avances en el expediente técnico, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de febrero no se realizaron en el expediente técnico, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108201854",mes:3,af:0,afi:0,lg:"Al cierre del mes de marzo no se realizaron avances en el expediente técnico, por lo tanto, no se registran progresos en la meta física establecida.",li:"Al cierre del mes de marzo no se realizaron avances en el expediente técnico, por lo tanto, no se registran limitaciones en la meta física establecida.",me:"Al cierre del mes de marzo no se realizaron en el expediente técnico, por lo tanto, no se registran medidas adoptadas en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108201854",mes:4,af:0,afi:0,lg:"Al cierre del mes de abril no se realizaron avances en el expediente técnico, por lo tanto, no se registran progresos en la meta física establecida. PROYECTO BELÉN",li:"Al cierre del mes de abril no se realizaron avances en el expediente técnico, por lo tanto, no se registran limitaciones en la meta física establecida PROYECTO BELÉN",me:"Al cierre del mes de abril no se realizaron en el expediente técnico, por lo tanto, no se registran medidas adoptadas en la meta física establecida. PROYECTO BELÉN",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202108",mes:1,af:0,afi:0,lg:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"No se presentaron limitaciones.",me:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202108",mes:2,af:0,afi:0,lg:"Al cierre del mes de febrero no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"No se presentaron limitaciones.",me:"Al cierre del mes de febrero, no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202108",mes:3,af:0,afi:0,lg:"Al cierre del mes de Marzo no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",li:"No se presentaron limitaciones.",me:"Al cierre del mes de marzo, no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202108",mes:4,af:0,afi:0,lg:"Al cierre del mes de abril no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida",li:"No se presentaron limitaciones.",me:"Al cierre del mes de abril, no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202109",mes:1,af:1,afi:7640,lg:"Al cierre del mes de enero se consolidó en un informe, varios informes que a continuación se detalla: - Informe N° 00000021-2026/PNC/P-MALECÓN-ZARUMILLA, \tsolicitud de nota modificatoria presupuestal: proyecto: “creación del malecón norte y sur norte y sur en la frontera Perú - Ecuador, distrito de aguas verdes, provincia de Zarumilla, región Tumbes”. CUI 2288094 -  Informe N° 00000020-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – único entregable de contrato Nº 67-2025-VIVIENDA-OGA-UE.001-CM y OS N°061-2026. Arq. Ángel Roberto Chávez Ríos. - Informe N° 00000019-2026/PNC/P-MALECÓN-ZARUMILLA, \trevisión del entregable N°01: estudios básicos y complementarios, aprobado por la supervisión, para la “elaboración del expediente técnico y ejecución de obra del proyecto: Malecón Norte y Sur – CUI 2288094 -  Informe N° 00000018-2026/PNC/P-MALECÓN-ZARUMILLA, \tsolicitud de nota modificatoria presupuestal:  creación del Malecón Norte y Sur en la frontera Perú - Ecuador, distrito de Aguas Verdes, provincia de Zarumilla, región Tumbes”. CUI 2288094. -  Informe N° 00000017-2026/PNC/P-MALECÓN-ZARUMILLA conformidad de servicio al informe de actividades – único entregable del Contrato N° 79-2025-VIVIENDA-OGA-UE-001-CM Y OS N° 0000062-2026. LIC. Gudelia Yeny Rosario Beteta. -  Informe N° 00000016-2026/PNC/P-MALECÓN-ZARUMILLA, \tRequerimiento del “servicio profesional especializado para la verificación del cumplimiento BIM y el control de calidad de la información y modelos del expediente técnico del proyecto “Malecón Norte y Sur” – CUI 2288094.” - Informe N° 00000015-2026/PNC/P-MALECÓN-ZARUMILLA, \tRequerimiento del “servicio profesional especializado en control de interferencias y saneamiento físico legal para el proyecto “Malecón Norte y Sur” – CUI 2288094.” -  Informe N° 00000014-2026/PNC/P-MALECÓN-ZARUMILLA, \tcontratación de “servicio profesional especializado para la revisión y pronunciamiento técnico en los componentes de ingeniería del expediente técnico del proyecto “Malecón Norte y Sur” – CUI 2288094”. -  Informe N° 00000013-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – único entregable del contrato N° 80-2025-VIVIENDA-OGA-UE.001-CM, de la OS N° 0065-2026, ING. Cynthia F. Avellaneda Villanueva. -  Informe N° 00000012-2026/PNC/P-MALECÓN-ZARUMILLA, \tatención al pedido de cronograma de actividades y programación financiera mensualizada del proyecto Malecón Norte y Sur, con CUI 2288094 – información complementaria. -  Informe N° 00000011-2026/PNC/P-MALECÓN-ZARUMILLA, \tRequerimiento del “servicio profesional especializado para la verificación del cumplimiento BIM y el control de calidad de la información y modelos del expediente técnico del proyecto “Malecón Norte y Sur” – CUI 2288094.” -  Informe N° 00000010-2026/PNC/P-MALECÓN-ZARUMILLA, \trequerimiento del servicio profesional especializado en control de riesgos sociales, en la etapa de diseño del proyecto de “Malecón Norte y Sur” – CUI 2288094. -  Informe N° 00000009-2026/PNC/P-MALECÓN-ZARUMILLA, \t“servicio profesional especializado para la verificación, seguimiento y control contractual de los contratos de diseño y construcción para la etapa de expediente técnico y supervisión del proyecto “Malecón Norte y Sur”’, con CUI 2288094” - Informe N° 00000008-2026/PNC/P-MALECÓN-ZARUMILLA, \t“servicio profesional especializado para la verificación técnico/funcional y compatibilidad arquitectónica del expediente técnico del proyecto “Malecón Norte y Sur” – cui 2288094 -  Informe N° 00000007-2026/PNC/P-MALECÓN-ZARUMILLA, \tAtención al pedido de cronograma de actividades y programación financiera mensualizada del proyecto Malecón Norte y Sur, con CUI 2288094. - Informe N° 00000006-2026/PNC/P-MALECÓN-ZARUMILLA, sobre la solicitud de reincorporación de una adenda al contrato del proyecto “Creación Malecón Norte y Sur” a “Malecón comercial turístico -  Informe N° 00000005-2026/PNC/P-MALECÓN-ZARUMILLA, \tsolicitud de viaje para realizar acciones de verificación técnica, seguimiento y monitoreo de las actividades relacionadas al expediente técnico del proyecto “Malecón Norte y Sur”. -  Informe N° 00000004-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre evaluación técnica del cambio de gestor BIM, para la ejecución de la “elaboración del expediente técnico y ejecución de obra del proyecto; Malecón Norte y Sur – CUI 2288094 -  Informe N° 00000003-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre la atención al requerimiento de información relacionado al proyecto con CUI 2288094 - Informe Técnico Legal N° 00000002-2026/PNC/P-MALECÓN-ZARUMILLA, solicitud de la Cámara de Comercio y Producción de Aguas Verdes y de la provincia de Zarumilla. -  Informe N° 00000002-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre la presentación de las medidas adoptadas por la supervisión ante incumplimientos del uso adecuado del CDE, relacionado en la “elaboración del expediente técnico y ejecución de obra del proyecto; Malecón Norte y Sur – CUI 2288094” -  Informe N° 00000001-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre evaluación técnica del cambio de especialista en hidrología y drenaje pluvial urbano por el consorcio Sol, de la “elaboración del expediente técnico y ejecución de obra del proyecto; Malecón Norte y Sur en la frontera Perú – CUI 2288094. -  Informe Técnico Legal N° 00000001-2026/PNC/P-MALECÓN-ZARUMILLA, solicitud de la Cámara de Comercio y Producción de Aguas Verdes y de la provincia de Zarumilla.",li:"Al cierre del mes de enero, no presenta limitaciones.",me:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202109",mes:2,af:1,afi:43271.85,lg:"Al cierre del mes de febrero se consolidó en un informe, varios informes que a continuación se detalla: - Informe N° 00000022-2026/PNC/P-MALECÓN-ZARUMILLA, conformidad de servicio al informe de actividades – único entregable del contrato N° 74-2025-VIVIENDA-OGA-UE-001-CM Y LA OS N°064-2026, ING. Howard Hans Flores Cortez. - Informe N° 00000023-2026/PNC/P-MALECÓN-ZARUMILLA, Informe de Actividades y Anexos de Comisión de Servicios dentro del Territorio Nacional, del 26 Al 27 de enero del 2026 a la Ciudad Aguas Verdes - Tumbes. Juan Carlos Chancafe García. - Informe N° 00000024-2026/PNC/P-MALECÓN-ZARUMILLA, presentación del plan y cronograma de trabajo sobre documentos archivísticos del proyecto Zarumilla. - Informe N° 00000025-2026/PNC/P-MALECÓN-ZARUMILLA, conformidad de servicio al informe de actividades – único entregable del contrato N° 081-2025-VIVIENDA-OGA-UE.001-CM, DE LA OS N° 000063-2025, Arq. Juan Carlos Chancafe García - Informe N° 00000026-2026/PNC/P-MALECÓN-ZARUMILLA, solicitud de modificación de recursos, en el interior del proyecto: Malecón Norte y Sur. CUI 2288094. - Informe N° 00000028-2026/PNC/P-MALECÓN-ZARUMILLA, Remisión de informe sobre avances de los proyectos de Zarumilla – Tumbes - INFORME N° 00000027-2026/PNC/P-MALECÓN-ZARUMILLA, contratación de “servicio profesional especializado para la revisión y pronunciamiento técnico en los componentes de ingeniería del expediente técnico del proyecto “Malecón Norte y Sur” – CUI 2288094”. - Informe N° 00000029-2026/PNC/P-MALECÓN-ZARUMILLA, solicitud de certificación, compromiso y emisión presupuestal vinculada a la contratación: “servicio de supervisión en la elaboración del expediente técnico y supervisión de la ejecución de obra del proyecto: Malecón Norte y Sur, con CUI 2288094”: contrato N° 111-2025-VIVIENDA-OGA-UE-01. - Informe N° 00000030-2026/PNC/P-MALECÓN-ZARUMILLA, solicitud de certificación, previsión, rebaja, compromiso y emisión presupuestal, del contrato N°117-2025-VIVIENDA-OGA-UE-01: “elaboración del expediente técnico y ejecución de obra del proyecto: creación del malecón norte y sur en la frontera Perú – ecuador, distrito de aguas verdes, provincia de Zarumilla, región Tumbes – C22UI N° 2288094” - INFORME N° 00000031-2026/PNC/P-MALECÓN-ZARUMILLA, “Pronunciamiento respecto a la conformidad emitida por la supervisión sobre el levantamiento de observaciones del entregable N°01 (Estudios Básicos y Complementarios) del contratista, en la “elaboración del expediente técnico y ejecución de obra del proyecto: “Malecón Norte y Sur”, CON CUI 2288094”\" - Informe N° 00000032-2026/PNC/P-MALECÓN-ZARUMILLA, ausencia del personal clave y no clave por la empresa don Eduardo HJ SAC, encargado de la supervisión para la “Elaboración del expediente técnico y ejecución de obra del proyecto: “Malecón Norte y Sur”– CUI 2288094” - Informe N° 00000033-2026/PNC/P-MALECÓN-ZARUMILLA, consulta a la empresa supervisora sobre la modificación del polígono remitido por el consorcio sol del proyecto: “Malecón Norte y Sur – CUI 2288094” - Etapa Expediente Técnico. - Informe Técnico Legal N° 00000003-2026/PNC/P-MALECÓN-ZARUMILLA, pedido del subsecretario general de la presidencia del consejo de ministros sobre el traslado de la petición del presidente de la junta directiva de la asociación de pequeños comerciantes, sector centro de salud “Héroes del Cenepa”, Tumbes. - Informe N° 00000034-2026/PNC/P-MALECÓN-ZARUMILLA, Atención al pedido de la secretaria general de la municipalidad distrital de aguas verdes respecto al traslado de la solicitud de la asociación de Pequeños Comerciantes del sector centro de salud “Héroes del Cenepa” – Aguas Verdes. - Informe N° 00000035-2026/PNC/P-MALECÓN-ZARUMILLA, traslada opinión técnica sobre la rectificación y ampliación del área polígono de intervención del proyecto: “Malecón Norte y Sur – CUI 2288094” - Informe N° 00000036-2026/PNC/P-MALECÓN-ZARUMILLA, sobre conformidad al segundo entregable (revisión y pronunciamiento del entregable N° 01 del contratista: estudios básicos y complementarios), correspondiente al contrato N° 0111-2025-VIVIENDA-OGA.UE.001: “Supervisión de la elaboración del expediente técnico y supervisión en la ejecución de obra del proyecto; Malecón Norte y Sur, CUI 2288094” – Don Eduardo HJ SAC - Informe N° 00000037-2026/PNC/P-MALECÓN-ZARUMILLA, sobre conformidad al primer entregable: estudios básicos y complementarios, correspondiente al contrato N° 117-2025-VIVIENDA-OGA.UE.001: “Elaboración del Expediente Técnico y Ejecución de Obra del Proyecto; Malecón Norte y Sur, CUI 2288094” – Consorcio Sol. - Informe N° 00000038-2026/PNC/P-MALECÓN-ZARUMILLA, solicitud de viáticos para plan de comisión de servicios a la ciudad de Tumbes – Aguas Verdes relacionado con el proyecto “Malecón Norte y Sur”, DEL SR. Richard Antonio Pinedo Rengifo. - Informe N° 00000039-2026/PNC/P-MALECÓN-ZARUMILLA, solicitud de viáticos para plan de comisión de servicios a la ciudad de Tumbes relacionado con el proyecto “Malecón Norte Y Sur”, del Sr. Charon Zuniga Rondinel.",li:"Al cierre del mes de febrero, no presenta limitaciones.",me:"Al cierre del mes de febrero, no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202109",mes:3,af:1,afi:57514,lg:"Al cierre del mes de marzo se consolidó en un informe, varios informes que a continuación se detalla: - Informe N° 00000040-2026/PNC/P-MALECÓN-ZARUMILLA, remisión de características técnicas para la adquisición de equipamiento tecnológico orientado al control BIM para la ejecución de obra del Proyecto Malecón Norte y Sur, con CUI 2288094. - Informe N° 00000041-2026/PNC/P-MALECÓN-ZARUMILLA, sobre conformidad al segundo entregable (revisión y pronunciamiento del entregable N° 01 del contratista: Estudios Básicos y complementarios), correspondiente al contrato N° 111-2025-VIVIENDA-OGA.UE.001: “Supervisión de la Elaboración Del Expediente Técnico y Supervisión En La Ejecución de Obra del Proyecto; Malecón Norte y Sur, CUI 2288094” – DON EDUARDO HJ SAC. (subsanación de observaciones formuladas por OACP). - Informe N° 00000042-2026/PNC/P-MALECÓN-ZARUMILLA, \trevisión de los informes de hitos de control de las sesiones de coordinación colaborativa (SCC), emitidos por la supervisión del proyecto: “elaboración del expediente técnico y ejecución de obra del proyecto; creación del malecón norte y sur en la frontera Perú – Ecuador, distrito de Aguas Verdes, provincia de Zarumilla, región Tumbes – CUI N° 2288094. - Informe N° 00000043-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre consulta N° 2 ampliación del estado situacional de redes de agua y alcantarillado en la zona del proyecto e inclusión de hidrantes del proyecto: “Malecón Norte y Sur Norte”. CUI 2288094. - Informe N° 00000044-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre la atención al requerimiento de información relacionado al proyecto con CUI 2288094. - Informe N° 00000045-2026/PNC/P-MALECÓN-ZARUMILLA, \ttraslado de evaluación técnica al levantamiento de observaciones - presentación de profesionales no clave CUI 2288094. - Informe N° 00000046-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – primer entregable de la OS N° 00812-2026, Arq. Juan Carlos Chancafe García - Informe Técnico Legal N° 00000004-2026/PNC/P-MALECÓN-ZARUMILLA,\topinión técnica y legal sobre la solicitud de ampliación de plazo por modificación y actualización del polígono de intervención del proyecto: “Malecón Norte y Sur” – CUI 2288094”. - Informe N° 00000047-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – primer entregable de la OS N° 00937-2026, ing. Gilson Charle Cedillo Calderon. - Informe N° 00000048-2026/PNC/P-MALECÓN-ZARUMILLA, \tobservaciones al primer entregable correspondiente a la orden de servicio N°778-2026, Arq. Ángel Roberto Chávez Ríos - Informe N° 00000049-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – primer entregable de la OS N° 0000811-2026, Lic. Gudelia Yeny Rosario Beteta. - Informe N° 00000050-2026/PNC/P-MALECÓN-ZARUMILLA, \tsolicitud de adquisición de EPP para el proyecto: “Malecón Norte Y Sur”, con CUI 2288094. - Informe N° 00000051-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – levantamiento de observaciones al primer entregable de la OS N° 000778-2026, Arq. Ángel Roberto Chavez Rios. - Informe N° 00000052-2026/PNC/P-MALECÓN-ZARUMILLA, \tinforme de actividades y anexos de comisión de servicios dentro del territorio nacional, del 05 al 06 de marzo del 2026 a la ciudad Aguas Verdes - Tumbes. Charon Zuniga Rondinel. - Informe N° 00000053-2026/PNC/P-MALECÓN-ZARUMILLA, \tsolicitud de viáticos para plan de comisión de servicios a la ciudad de tumbes – aguas verdes relacionado con el proyecto “Malecón Norte y Sur”, del sr. Richard Antonio Pinedo Rengifo. - Informe N° 00000054-2026/PNC/P-MALECÓN-ZARUMILLA, \tinforme de actividades y anexos de comisión de servicios dentro del territorio nacional, del 05 al 06 de marzo del 2026 a la ciudad Aguas Verdes - Tumbes. Richard Antonio Pinedo Rengifo. - Informe N° 00000055-2026/PNC/P-MALECÓN-ZARUMILLA, \tsolicitud de viaje para comisión de servicio a la ciudad de relacionado con el proyecto “Malecón Norte y Sur”. Sr. Juan Carlos Chancafe García. - Informe N° 00000056-2026/PNC/P-MALECÓN-ZARUMILLA, \tsolicitud de información relacionada a la elaboración del expediente técnico inicial del proyecto “Malecón Norte y Sur” con cui 2288094. - Informe N° 00000057-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – primer entregable de la OS N° 0001234-2026, Ing. Charon Zuniga Rondinel. - Informe N° 00000060-2026/PNC/P-MALECÓN-ZARUMILLA, \tsolicitud de viáticos para plan de comisión de servicios a la ciudad de Tumbes – Aguas Verdes relacionado con el proyecto “Malecón Norte y Sur”, de la Sra. Jossy Becerra Paquiauri. - Informe N° 00000058-2026/PNC/P-MALECÓN-ZARUMILLA, \trequerimiento del “servicio profesional especializado en gestión social y control de riesgos sociales, en la etapa de diseño del proyecto de “Malecón Norte Y Sur” – CUI 2288094. - Informe N° 00000061-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre la atención al requerimiento de información relacionado al proyecto con CUI 2288094. - Informe N° 00000062-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – primer entregable de la orden de servicio N°0000957-2026, Ing. Howard Hans Flores Cortez. - Informe N° 00000059-2026/PNC/P-MALECÓN-ZARUMILLA, \tRequerimiento del “servicio especializado en gestión de proyectos, monitoreo y supervisión de la ejecución contractual en la etapa de diseño del proyecto “Malecón Norte y Sur”’, con CUI 2288094”. - Informe N° 00000064-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre la notificación del informe de hito de control N° 011-2026-OCI/5303-SCC: proyecto de inversión: “creación del Malecón Norte y Sur en la frontera Perú - Ecuador” por el órgano de control institucional - MVCS. - Informe N° 00000063-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre la notificación del informe de hito de control N° 011-2026-OCI/5303-SCC: proyecto de inversión: “creación del Malecón Norte y Sur en la frontera Perú - Ecuador” por el Órgano de Control Institucional– Contraloría General de la República. - Informe N° 00000065-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – segundo entregable de la OS N° 0000811-2026, Lic. Gudelia Yeny Rosario Beteta. - Informe N° 00000066-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – segundo entregable de la OS N° 0000811-2026, Lic. Gudelia Yeny Rosario Beteta. - Informe N° 00000068-2026/PNC/P-MALECÓN-ZARUMILLA, \t\"informe técnico N° 020 -2026/PNC/P-ZARUMILLA – EQUIPO TÉCNICO. - Informe N° 00000069-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades – segundo entregable de la OS N° 00812-2026, Arq. Juan Carlos Chancafe García. - Informe N° 00000067-2026/PNC/P-MALECÓN-ZARUMILLA, \tconformidad de servicio al informe de actividades –segundo entregable de la OS N° 000778-2026, Arq. Ángel Roberto Chavez Rios.",li:"Al cierre del mes de marzo, no presenta limitaciones.",me:"Al cierre del mes de marzo, no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202109",mes:4,af:1,afi:89540.45,lg:"Al cierre del mes de abril se consolidó en un informe, varios informes que a continuación se detalla: - INFORME N° 00000091-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre la atención al requerimiento de información relacionado al proyecto con CUI 2288094. - INFORME N° 00000090-2026/PNC/P-MALECÓN-ZARUMILLA   \tevaluación sobre la justificación técnica de la alternativa de mitigación por licuefacción en la “elaboración del expediente técnico y ejecución de obra del proyecto; Malecón Norte y Sur – CUI 2288094” - INFORME N° 00000089-2026/PNC/P-MALECÓN-ZARUMILLA   \tadvertencia sobre necesidad de elaboración de expediente técnico de reubicación de interferencias de redes de saneamiento y su impacto en el alcance, costo y plazo del expediente técnico y ejecución de obra del proyecto; creación del Malecón Norte y Sur en la frontera Perú – ecuador, distrito de Aguas Verdes, provincia de Zarumilla, Región Tumbes – CUI N° 2288094” - INFORME N° 00000088-2026/PNC/P-MALECÓN-ZARUMILLA   \tremito informe de sustento para el registro formato 12b, correspondiente a la ejecución del proyecto: “creación del Malecón Norte y Sur en la frontera Perú - Ecuador, distrito de Aguas Verdes, provincia de Zarumilla, región Tumbes”. CUI 2288094 – abril 2026. - INFORME N° 00000087-2026/PNC/P-MALECÓN-ZARUMILLA   \tsobre informe para recepción de gestión. - INFORME N° 00000086-2026/PNC/P-MALECÓN-ZARUMILLA   \t\"sobre plazo adicional sobre la notificación de informe de hito de control N.° 011-2026-OCI/5303-SCC.\" - INFORME N° 00000085-2026/PNC/P-MALECÓN-ZARUMILLA   \tsolicitud de informe especial a la supervisión por demoras en entregables n° 02, 03 y 04 y determinación de responsabilidades. - INFORME N° 00000084-2026/PNC/P-MALECÓN-ZARUMILLA   \tpetitorio del presidente de la junta directiva de la asociación de pequeños comerciantes, sector centro de salud “Héroes del Cenepa”, Tumbes” - INFORME N° 00000083-2026/PNC/P-MALECÓN-ZARUMILLA   \tsobre el pronunciamiento del supervisor y contratista al informe de hito de control n°011-2026-OCI/5303-SCC: proyecto de inversión: “creación del Malecón Norte y Sur en la frontera Perú - Ecuador” por el órgano de control institucional– contraloría general de la república. - INFORME N° 00000082-2026/PNC/P-MALECÓN-ZARUMILLA   \tpetitorio del presidente de la junta directiva de la asociación de pequeños comerciantes, sector centro de salud “Héroes del Cenepa”, Tumbes” - INFORME N° 00000081-2026/PNC/P-MALECÓN-ZARUMILLA   \tAlcanza opinión técnica por modificación de la poligonal definitiva del proyecto por ajustes de las manzanas Q4 Y Q5. - INFORME N° 00000080-2026/PNC/P-MALECÓN-ZARUMILLA   \trevisión del informe de hito de Control de la Sesión de Coordinación Colaborativa (SCC) N° 09, emitido por la supervisión del proyecto: “elaboración del expediente técnico y ejecución de obra del proyecto; creación del Malecón Norte y Sur en la frontera Perú – ecuador, distrito de aguas verdes, provincia de Zarumilla, región Tumbes – CUI N° 2288094” - INFORME N° 00000079-2026/PNC/P-MALECÓN-ZARUMILLA   \trevisión del informe de hito de control de la sesión de Coordinación Colaborativa (SCC) N° 08, emitido por la supervisión del proyecto: “elaboración del expediente técnico y ejecución de obra del proyecto; creación del Malecón Norte y Sur en la frontera Perú – Ecuador, distrito de Aguas Verdes, provincia de Zarumilla, Region Tumbes – CUI N° 2288094” - INFORME N° 00000078-2026/PNC/P-MALECÓN-ZARUMILLA   \trevisión del informe de hito de control de la Sesión de Coordinación Colaborativa (SCC) N° 07, emitido por la supervisión del proyecto: “elaboración del expediente técnico y ejecución de obra del proyecto; creación del Malecón Norte y Sur en la frontera Perú – Ecuador, distrito de Aguas Verdes, provincia de Zarumilla, región Tumbes – CUI N° 2288094” - INFORME N° 00000077-2026/PNC/P-MALECÓN-ZARUMILLA   \trevisión del informe de hito de control de la Sesión de Coordinación Colaborativa (SCC) N° 06, emitido por la supervisión del proyecto: “elaboración del expediente técnico y ejecución de obra del proyecto; creación del Malecón Norte y Sur en la frontera Perú – ecuador, distrito de aguas verdes, provincia de Zarumilla, región tumbes – CUI N° 2288094” - INFORME N° 00000076-2026/PNC/P-MALECÓN-ZARUMILLA   \trevisión del informe de hito de control de la sesión de Coordinación Colaborativa (SCC) N° 05, emitido por la supervisión del proyecto: “elaboración del expediente técnico y ejecución de obra del proyecto; creación del Malecón Norte y Sur en la frontera Perú – Ecuador, distrito de Aguas Verdes, provincia de Zarumilla, región Tumbes – CUI N° 2288094” - INFORME N° 00000075-2026/PNC/P-MALECÓN-ZARUMILLA   \tevaluación técnica sobre la notificación de restricción externa que afecta el cumplimiento del entregable N° 02 y n° 03 de la “elaboración del expediente técnico y ejecución de obra del proyecto; Malecón Norte y Sur – CUI 2288094” - INFORME N° 00000074-2026/PNC/P-MALECÓN-ZARUMILLA   \tsobre evaluación técnico del cambio de especialista ambiental para la supervisión de la “elaboración del expediente técnico y ejecución de obra del proyecto; Malecón Norte y Sur – CUI 2288094” - INFORME N° 00000073-2026/PNC/P-MALECÓN-ZARUMILLA   \t\"sobre ejecución de inversiones al 31 de marzo de 2026. proyecto: creación del malecón norte y sur en la frontera Perú – Ecuador, distrito de Aguas Verdes, provincia de Zarumilla, región Tumbes – CUI N° 2288094”\" - INFORME N° 00000072-2026/PNC/P-MALECÓN-ZARUMILLA, \tsobre evaluación técnico del cambio de especialista ambiental para la supervisión de la “elaboración del expediente técnico y ejecución de obra del proyecto; malecón norte y sur – CUI 2288094”. - INFORME N° 00000071-2026/PNC/P-MALECÓN-ZARUMILLA   \tevaluación técnico a la solicitud de elección de la alternativa de mitigación por licuefacción y recomendación de intervención, para la “elaboración del expediente técnico y ejecución de obra del proyecto; creación del Malecón Norte y Sur en la frontera Perú – ecuador, distrito de aguas verdes, provincia de Zarumilla, región tumbes – CUI N° 2288094” - INFORME N° 00000070-2026/PNC/P-MALECÓN-ZARUMILLA, \tremito solicitud de comisión de servicio para realizar reunión de coordinación y seguimiento, así como visita de campo, correspondientes a los contratos n° 111 y 117-2025-vivienda – OGA.UE.01 para la elaboración de expediente técnico, ejecución de obras y supervisión del proyecto Malecón Norte y Sur Zarumilla con CUI 2288094 - INFORME N° 00000042-2026/PNC/P-MALECÓN-ZARUMILLA   \trevisión de los informes de hitos de Control de las Sesiones de Coordinación Colaborativa (SCC), emitidos por la supervisión del proyecto: “elaboración del expediente técnico y ejecución de obra del proyecto; creación del Malecón Norte y Sur en la frontera Perú – Ecuador, distrito de Aguas Verdes, provincia de Zarumilla, región Tumbes – CUI N° 2288094 - INFORME TÉCNICO LEGAL N° 00000005-2026/PNC/P-MALECÓN-ZARUMILLA  \tAtención a solicitud sobre inclusión comercial en proyecto Malecón Aguas Verdes. - REQUERIMIENTO N° 00004-2026/PNC/P-MALECÓN-ZARUMILLA   \trequerimiento del “servicio profesional especializado para brindar soporte técnico en el análisis, evaluación y pronunciamiento técnico en los componentes de ingeniería del expediente técnico del proyecto “Malecón Norte y Sur” – cui 2288094” - REQUERIMIENTO N° 00000003-2026/PNC/P-MALECÓN-ZARUMILLA   \tRequerimiento del servicio especializado para brindar soporte técnico en la identificación y gestión de las interferencias del proyecto y de los expedientes presentados ante SUNARP en el marco del proyecto de inversión “Malecón Norte y Sur”, CON CUI 2288094. - Conformidad de Servicio N° 00000003-2026/PNC/P-MALECÓN-ZARUMILLA, conformidad de servicio al informe de actividades – segundo entregable de la OS N° 0001234-2026, ING. CHARON ZUNIGA RONDINEL - CONFORMIDAD DE SERVICIO N° 00000002-2026/PNC/P-MALECÓN-ZARUMILLA , conformidad de servicio al informe de actividades – segundo entregable de la OS N° 00937-2026, ING. GILSON CHARLE CEDILLO CALDERON - REQUERIMIENTO N° 00000002-2026/PNC/P-MALECÓN-ZARUMILLA   \trequerimiento del “servicio especializado para la verificación del cumplimiento de la metodología BIM y el control de calidad, orientado a la evaluación y emisión de conformidad de la prestación del expediente técnico y los estudios definitivos de ingeniería del proyecto Malecón Norte y Sur – CUI N° 2288094”. - CONFORMIDAD DE SERVICIO N° 00000001-2026/PNC/P-MALECÓN-ZARUMILLA, conformidad de servicio al informe de actividades – segundo entregable de la orden de servicio N°0000957-2026, ING. HOWARD HANS FLORES CORTEZ - REQUERIMIENTO N° 00000001-2026/PNC/P-MALECÓN-ZARUMILLA   \trequerimiento del “servicio especializado en gestión de proyectos, para brindar soporte técnico para la evaluación y conformidad técnico de prestaciones en contratos de ejecución y supervisión del proyecto de inversión “Malecón Norte y Sur”, CON CUI 2288094”",li:"Al cierre del mes de abril, no presenta limitaciones.",me:"Al cierre del mes de abril, no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202113",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202113",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202113",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202113",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202111",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202111",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202111",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202111",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202112",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202112",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202112",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202112",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202121",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202121",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202121",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202121",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202171",mes:1,af:0,afi:7000,lg:"En el presente mes no se tiene programada la meta física. Adicionalmente, informar que se tienen 4 estudios de pre inversión en proceso de formulación: - PI Espacio Público Multipropósito VMT CUI N°2697527, a la fecha se encuentra en el tercer entregable del servicio de formulación del estudio de pre inversión. Se tiene prevista la viabilidad para marzo 2026. - PI Parque Lineal Chaclacayo, CUI N°2707728, a la fecha cuenta con 06 estudios básicos realizados, y uno en trámite de contratación. Se tiene prevista la viabilidad para el abril 2026. - PI Parque Lineal Olmos CUI N° 2709364, a la fecha cuenta con 04 estudios básicos realizados y uno en trámite de contratación. Se tiene prevista la viabilidad para el mayo 2026. - PI Parque Lineal Moyobamba CUI N° 2717871, a la fecha se encuentra en trámite de contratación los servicios básicos especializados necesarios para la formulación del estudio de pre inversión. Se tiene prevista la viabilidad para junio de 2026.",li:"Retrasos en las contrataciones de los especialistas que forman parte de la unidad formuladora.",me:"Transversalidad en las funciones de los especialistas para el cumplimiento de metas.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202171",mes:2,af:0,afi:28470,lg:"En el presente mes no se tiene programada la meta física. Adicionalmente, informar que se tienen 4 estudios de pre inversión en proceso de formulación: - PI Espacio Público Multipropósito VMT CUI N°2697527, a la fecha se encuentra en el cuarto entregable del servicio de formulación del estudio de pre inversión. Se tiene prevista la viabilidad para marzo 2026. - PI Parque Lineal Chaclacayo, CUI N°2707728, a la fecha cuenta con 06 estudios básicos realizados, y uno en trámite de contratación, debido a la demora de este último servicio, se tiene prevista la viabilidad para mayo del 2026. - PI Parque Lineal Olmos CUI N° 2709364, a la fecha cuenta con 04 estudios básicos realizados y uno en trámite de contratación, debido a la demora en la contratación de este último, se tiene prevista la viabilidad para el junio 2026. - PI Parque Lineal Moyobamba CUI N° 2717871, a la fecha se encuentra en elaboración del Término de Referencia para el proceso de convocatoria para la contratación de los servicios básicos especializados necesarios para la formulación del estudio de pre inversión. Se tiene prevista la viabilidad para agosto de 2026.",li:"Retrasos en los procesos de contratación de los servicios básicos especializados para la formulación, e insuficiente asignación presupuestal.",me:"Transversalidad en las funciones de los especialistas para el cumplimiento de metas.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202171",mes:3,af:0,afi:194460.31,lg:"En el presente mes no se tiene programada la meta física. Adicionalmente, informar que se tienen 4 estudios de pre inversión en proceso de formulación: - PI Espacio Público Multipropósito VMT CUI N°2697527, a la fecha en elaboración del informe de viabilidad para declarar viable el estudio de pre inversión. - PI Parque Lineal Chaclacayo, CUI N°2707728, a la fecha cuenta con 06 estudios básicos realizados, y uno en desarrollo, se tiene prevista la viabilidad para mayo del 2026. - PI Parque Lineal Olmos CUI N° 2709364, a la fecha cuenta con 05 estudios básicos realizados y uno en desarrollo, debido a la demora en la contratación de este último, se tiene prevista la viabilidad para el junio 2026. - PI Parque Lineal Moyobamba CUI N° 2717871, a la fecha se encuentra en elaboración de actos preparatorios para el proceso de convocatoria para la contratación de los servicios básicos especializados necesarios para la formulación del estudio de pre inversión. Se tiene prevista la viabilidad para agosto de 2026.",li:"Insuficiente asignación presupuestal que no permite el cumplimiento de metas.",me:"Transversalidad en las funciones de los especialistas para el cumplimiento de metas.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202171",mes:4,af:1,afi:68475,lg:"En el presente mes se cumplió con la viabilidad de un estudio de pre-inversión. Adicionalmente, informar que se tienen 5 estudios de pre inversión en proceso de formulación: - PI Espacio Público Multipropósito VMT CUI N°2697527, a la fecha se encuentra viable en el banco de inversiones. - PI Parque Lineal Chaclacayo, CUI N°2707728, a la fecha cuenta con 06 estudios básicos realizados, y uno en desarrollo, se tiene prevista la viabilidad para junio del 2026. - PI Parque Lineal Olmos CUI N° 2709364, a la fecha cuenta con 05 estudios básicos realizados y uno en desarrollo, debido a la demora en la contratación de este último, se tiene prevista la viabilidad para el julio 2026. - PI Parque Lineal Moyobamba CUI N° 2717871, a la fecha se encuentra en proceso de emisión de la buena pro para la contratación de los servicios básicos especializados necesarios para la formulación del estudio de pre inversión. Se tiene prevista la viabilidad para septiembre de 2026. - PI Maquinarias, se viene formulando la estrategia para el mejoramiento de la capacidad de intervención de la Unidad de Maquinarias del PNC y sus diecinueve (19) Unidades Operativas Básicas (UBOs). CENTRO DE CONVENCIONES",li:"Insuficiente asignación presupuestal que no permite el cumplimiento de metas. CENTRO DE CONVENCIONES",me:"Transversalidad en las funciones de los especialistas para el cumplimiento de metas. CENTRO DE CONVENCIONES LIMA",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202172",mes:1,af:0,afi:0,lg:"Al cierre del mes de enero, no se tiene ningún expediente técnico aprobado.",li:"Al cierre del mes de enero, se encuentra en etapa de la elaboración del Expediente Técnico, al respecto existen limitaciones en cuanto a personal técnico para el seguimiento y control referido a las especialidades y atención oportuna de los documentos.",me:"Al cierre del mes de enero no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202172",mes:2,af:0,afi:0,lg:"Al cierre del mes de febrero, no se tiene ningún expediente técnico aprobado.",li:"Al cierre del mes de febrero, no presenta limitaciones.",me:"Al cierre del mes de febrero, no se realizaron avances de obra, por lo tanto, no se registran progresos en la meta física establecida",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202172",mes:3,af:0,afi:440400.78,lg:"Al cierre del mes de marzo, no se tiene ningún expediente técnico aprobado.",li:"Al cierre del mes de marzo, el Contratista no ha levantado las observaciones realizadas al segundo entregable del Expediente Técnico, lo que genera retrasos en la aprobación del mismo.",me:"Al cierre del mes de marzo, se realizó una reunión de coordinación con la Supervisión con la finalidad de solicitar medidas necesarias para el cumplimiento de los plazos establecidos para la presentación del segundo entregable del Expediente Técnico.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202172",mes:4,af:0,afi:0,lg:"Al cierre del mes de abril, no se tiene ningún expediente técnico aprobado. PROYECTO PLAZA LA HERMANDAD",li:"- Al cierre del mes de abril, el Contratista no ha levantado las observaciones en su totalidad correspondiente al segundo entregable del Expediente Técnico, lo que genera retrasos en la aprobación del mismo. - Demoras en la otorgación de la factibilidad de servicio por parte de la Unidad Ejecutora 002: Servicios de Saneamientos al proyecto Malecón Norte y Sur, lo que genera retraso para el tercer entregable y para la aprobación del expediente técnico. PROYECTO PLAZA LA HERMANDAD",me:"Al cierre del mes de abril, se realizó una reunión de coordinación con la Supervisión con la finalidad de solicitar medidas necesarias para el cumplimiento de los plazos establecidos para la presentación del segundo entregable del Expediente Técnico. PROYECTO PLAZA LA HERMANDAD",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202238",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202238",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202238",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202238",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202240",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202240",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202240",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202240",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202253",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202253",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202253",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202253",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202254",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202254",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202254",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202254",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202255",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202255",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202255",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202255",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202257",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202257",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202257",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202257",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202258",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202258",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202258",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202258",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202259",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202259",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202259",mes:3,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202259",mes:4,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202315",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {aoi:"AOI00108202315",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {aoi:"AOI00108202315",mes:3,af:2,afi:0,lg:"Al cierre del mes de marzo, se han elaborado los siguientes informes: Informe Técnico N° 00000003-2026/PNC/P-PLAZA H, sobre la solicitud de copia de planos y documentación actual del proyecto “Plaza de la Hermandad”, con CUI N° 2414594. Informe Técnico N° 00000004-2026/PNC/P-PLAZA H, informe de sustento del reporte para el registro del Formato 12-B al mes de febrero de 2026.",li:"Al cierre del mes de marzo, se encuentra en curso la revisión del expediente técnico primigenio del proyecto “Plaza de la Hermandad”; no obstante, la no concreción de la contratación de los locadores de servicios ha generado limitaciones en la disponibilidad de personal. Sin perjuicio de ello, se continúa con el desarrollo de la revisión en la medida de las capacidades disponibles.",me:"Frente a dicha limitación, se han adoptado medidas orientadas a asegurar el cumplimiento de las metas previstas, entre las cuales destacan la priorización de actividades críticas de la revisión del expediente técnico, la redistribución de funciones y la optimización de tiempos mediante una programación más eficiente de las tareas. Asimismo, se viene avanzando progresivamente en la revisión con los recursos existentes, a fin de minimizar retrasos en el cronograma establecido.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108202315",mes:4,af:4,afi:1761.51,lg:"Al cierre del mes de abril, se han elaborado los siguientes informes: INFORME TÉCNICO N° 00000007-2026/PNC/P-PLAZA H, referido a las medidas para acelerar la ejecución de las inversiones en el año 2026 del proyecto “Plaza de la Hermandad”, con CUI N.° 2414594. Asimismo, se ha elaborado el INFORME TÉCNICO N° 00000008-2026/PNC/P-PLAZA H, que contiene el sustento para el reporte del registro del Formato 12B correspondiente al mes de marzo de 2026. De igual manera, se ha elaborado el INFORME TÉCNICO N° 00000009-2026/PNC/P-PLAZA H, referido a la evaluación de la vigencia técnica y la determinación de acciones para la viabilidad del expediente técnico del proyecto “Plaza de la Hermandad”, con CUI N° 2414594. Finalmente, se ha elaborado el INFORME TÉCNICO N° 00000010-2026/PNC/P-PLAZA H, que contiene la propuesta de convenio de cooperación interinstitucional entre el Ministerio de Vivienda, Construcción y Saneamiento, el Gobierno Regional de Tumbes, la Municipalidad Provincial de Zarumilla y la Municipalidad Distrital de Aguas Verdes, en el marco del proyecto con CUI N° 2414594.",li:"Al cierre del mes de abril, se advierte que el CONVENIO N° 159-2022-VIVIENDA de Cooperación Interinstitucional suscritas entre el Ministerio de Vivienda, Construcción y Saneamiento, el Gobierno Regional de Tumbes, la Municipalidad Provincial de Zarumilla y la Municipalidad Distrital de Aguas Verdes ha perdido vigencia.",me:"Frente a dicha limitación, se han adoptado medidas orientadas a asegurar el cumplimiento de las metas previstas, entre las cuales destacan las gestiones realizadas la suscripción de un nuevo convenio de Cooperación Interinstitucional suscritas entre el Ministerio de Vivienda, Construcción y Saneamiento, el Gobierno Regional de Tumbes, la Municipalidad Provincial de Zarumilla y la Municipalidad Distrital de Aguas Verdes ha perdido vigencia.",mo:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {aoi:"AOI00108200103",mes:1,af:0,afi:0,lg:"Durante el mes de enero no se tienen programadas actividades de asistencia o capacitación.",li:"No se presentaron limitaciones",me:"No se ha identificado metas para este mes en el plan de trabajo",mo:"El Centro de Costo 03.07.06 - UNIDAD DE GESTIÓN DEL DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 817,160.00 y un PIM de S/ 869,881.00 representando un incremento/disminución de 6.45% del PIA. En el mes de enero se aprobaron una modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI 00108200204 Elaboración de planes de acondicionamiento territorial, planes urbanos y estudios vinculados a la gestión urbana sostenible de las ciudades: Se incrementó en S/ 50,785.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 600.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 1,336.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS."},
    {aoi:"AOI00108200103",mes:2,af:0,afi:0,lg:"Durante el mes de febrero no se tienen programadas actividades de asistencia o capacitación.",li:"No se presentaron limitaciones",me:"No se ha identificado metas para este mes en el plan de trabajo",mo:"El Centro de Costo 03.07.06 - UNIDAD DE GESTIÓN DEL DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 817,160.00 y un PIM de S/ 1,079,568.00 representando un incremento/disminución de 32.11% del PIA. En el mes de febrero aprobaron una modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI 00108200204 Elaboración de planes de acondicionamiento territorial, planes urbanos y estudios vinculados a la gestión urbana sostenible de las ciudades: Se incrementó en S/ 209,687.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de, para financiar el pago de remuneraciones del personal CAS."},
    {aoi:"AOI00108200103",mes:3,af:1,afi:0,lg:"Durante el mes de marzo se sostuvieron dos reuniones de asistencia técnica a la municipalidad de Ite en la provincia de Jorge Basadre, en el departamento de Tacna, respecto a la elaboración de su esquema de Acondicionamiento urbano",li:"No se presentaron limitaciones",me:"No se ha identificado metas para este mes en el plan de trabajo",mo:"En el mes de marzo no existe ninguna modificación presupuestal"},
    {aoi:"AOI00108200103",mes:4,af:0,afi:0,lg:"Durante el mes de abril se sostuvieron dos reuniones de asistencia técnica a la municipalidad de Ite en la provincia de Jorge Basadre, en el departamento de Tacna, respecto a la elaboración de su Esquema de Acondicionamiento Urbano, debido a que han remitido el esquema para opinión, y que está entrando en consulta pública.",li:"No se presentaron limitaciones",me:"Durante el mes de abril se sostuvieron dos reuniones de asistencia técnica a la municipalidad de Ite en la provincia de Jorge Basadre, en el departamento de Tacna, respecto a la elaboración de su Esquema de Acondicionamiento Urbano.",mo:"En el mes de abril no existe ninguna modificación presupuestal CENTRO DE COSTOS. 03.07.07 UGERDES"},
    {aoi:"AOI00108200199",mes:1,af:0,afi:0,lg:"Durante el mes de enero no se tienen programadas actividades en implementación de sistemas de información geográfica.",li:"No se presentaron limitaciones",me:"Se han cursado invitaciones a gobiernos locales para la preinscripción en los programas de capacitación que realiza la Unidad de Gestión de Desarrollo Urbano Sostenible del PNC.",mo:"El Centro de Costo 03.07.06 - UNIDAD DE GESTIÓN DEL DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 817,160.00 y un PIM de S/ 869,881.00 representando un incremento/disminución de 6.45% del PIA. En el mes de enero se aprobaron una modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI 00108200204 Elaboración de planes de acondicionamiento territorial, planes urbanos y estudios vinculados a la gestión urbana sostenible de las ciudades: Se incrementó en S/ 50,785.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 600.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 1,336.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS."},
    {aoi:"AOI00108200199",mes:2,af:0,afi:1600,lg:"Durante el mes de febrero no se tienen programadas actividades para la realización de cursos para la implementación de sistemas de información geográfica, se ha cursado la convocatoria a los gobiernos locales para su participación en los cursos de capacitación programados para el siguiente periodo.",li:"No se presentaron limitaciones",me:"Se han cursado invitaciones a gobiernos locales para la preinscripción en los programas de capacitación que realiza la Unidad de Gestión de Desarrollo Urbano Sostenible del PNC.",mo:"El Centro de Costo 03.07.06 - UNIDAD DE GESTIÓN DEL DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 817,160.00 y un PIM de S/ 1,079,568.00 representando un incremento/disminución de 32.11% del PIA. En el mes de febrero aprobaron una modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI 00108200204 Elaboración de planes de acondicionamiento territorial, planes urbanos y estudios vinculados a la gestión urbana sostenible de las ciudades: Se incrementó en S/ 209,687.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de, para financiar el pago de remuneraciones del personal CAS."},
    {aoi:"AOI00108200199",mes:3,af:0,afi:984.22,lg:"Durante el mes de marzo no se tienen programadas actividades para la realización de cursos para la implementación de sistemas de información geográfica, se tienen los grupos formados para el inicio de cursos en el mes de abril, se han realizado 2 vuelos fotogramétricos a las ciudades de Sauce y San José de Sisa.",li:"No se presentaron limitaciones",me:"Se han cursado invitaciones a gobiernos locales para la preinscripción en los programas de capacitación que realiza la Unidad de Gestión de Desarrollo urbano Sostenible del PNC.",mo:"En el mes de marzo no existe ninguna modificación presupuestal"},
    {aoi:"AOI00108200199",mes:4,af:0,afi:0,lg:"Durante el mes de abril no se tienen programadas actividades para la realización de cursos para la implementación de sistemas de información geográfica, se ha reprogramado el inicio de las actividades de los grupos para el mes de mayo, se ha realizado 1 vuelo fotogramétrico a las ciudades de Moyobamba, el cual servirá de base para la implementación de su sistema de información geográfica de la ciudad.",li:"No se presentaron limitaciones",me:"Para la implementación de esta actividad se han formado los grupos de trabajo, para el inicio de cursos, igualmente se han realizado 2 vuelos fotogramétricos a las ciudades de Sauce y San José de Sisa.",mo:"En el mes de abril no existe ninguna modificación presupuestal CENTRO DE COSTOS. 03.07.07 UGERDES"},
    {aoi:"AOI00108200204",mes:1,af:0,afi:51134.7,lg:"Durante el mes de enero se viene tramitando la contratación de los especialistas del equipo técnico para la culminación de los estudios de La Mar y Villa Perené",li:"Retrasos en la contratación de especialistas del equipo técnico de UGEDEUS",me:"Se ha remitido Oficio Múltiple de convocatoria destinado a iniciar el proceso de identificación y focalización. Este documento incluirá un instrumento de recopilación de información sobre gestión urbana, cuyos resultados permitirán validar y complementar la selección de los gobiernos locales.",mo:"El Centro de Costo 03.07.06 - UNIDAD DE GESTIÓN DEL DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 817,160.00 y un PIM de S/ 869,881.00 representando un incremento/disminución de 6.45% del PIA. En el mes de enero se aprobaron una modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI 00108200204 Elaboración de planes de acondicionamiento territorial, planes urbanos y estudios vinculados a la gestión urbana sostenible de las ciudades: Se incrementó en S/ 50,785.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 600.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 1,336.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS."},
    {aoi:"AOI00108200204",mes:2,af:0,afi:42460.82,lg:"Durante el mes de febrero se dio la contratación en la quincena de los especialistas del equipo técnico para la culminación de los estudios de La Mar y Villa Perené  en un avance del 92%",li:"No se presentaron limitaciones",me:"No se adoptaron medidas adicionales durante el presente periodo",mo:"El Centro de Costo 03.07.06 - UNIDAD DE GESTIÓN DEL DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 817,160.00 y un PIM de S/ 1,079,568.00 representando un incremento/disminución de 32.11% del PIA. En el mes de febrero aprobaron una modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI 00108200204 Elaboración de planes de acondicionamiento territorial, planes urbanos y estudios vinculados a la gestión urbana sostenible de las ciudades: Se incrementó en S/ 209,687.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de, para financiar el pago de remuneraciones del personal CAS."},
    {aoi:"AOI00108200204",mes:3,af:0,afi:94850.32,lg:"Durante el mes de marzo se tiene un avance del 96% para la culminación de los estudios de La Mar y Villa Perené; asimismo se realizaron los talleres de inicio de los planes de desarrollo urbano de las ciudades de San José de Sisa y Sauce, en el departamento de San Martín.",li:"No se presentaron limitaciones",me:"No se adoptaron medidas adicionales durante el presente periodo",mo:"En el mes de marzo no existe ninguna modificación presupuestal"},
    {aoi:"AOI00108200204",mes:4,af:1,afi:74902.96,lg:"Durante el mes de abril se ha culminado la etapa de elaboración del PDU de San Miguel y el PDU de Perenne se encuentra en un 96% asimismo se viene trabajando la elaboración de los diagnósticos de los PDU de San José de Sisa y Sauce encontrándose en un avance del 30%",li:"No se presentaron limitaciones",me:"Durante el mes de abril se ha culminado la etapa de elaboración del PDU de San Miguel y PDU de Perenne se encuentra en un 96% asimismo se viene trabajando la elaboración de los diagnósticos de los PDU de San José de Sisa y Sauce encontrándose en un avance del 30%.",mo:"En el mes de abril no existe ninguna modificación presupuestal CENTRO DE COSTOS. 03.07.07 UGERDES"},
    {aoi:"AOI00108200041",mes:1,af:1,afi:95018.27,lg:"Durante el mes de enero se elaboró un (01) Informe Técnico consolidado de las actividades ejecutadas por el Programa Nuestras Ciudades.",li:"No se registraron limitaciones durante el presente periodo",me:"Realización de coordinaciones internas en los procesos de contratación de bienes y servicios, así como el apoyo a las áreas técnicas, y proyectos de inversión en la elaboración de los Planes de Trabajo y evaluación de viabilidad financiera, que permita el cumplimiento de metas para el presente ejercicio.",mo:"El Centro de Costo 03.07 - Programa Nuestras Ciudades al cierre del mes de enero 2026, contó con un PIA de S/ 2,094,363.00 y un PIM de S/ 2,094,363.00 representando un incremento/disminución de 0 % del PIA. En el mes de enero no se tiene modificaciones."},
    {aoi:"AOI00108200041",mes:2,af:1,afi:112578.27,lg:"Durante el mes de febrero se elaboró un (01) Informe Técnico consolidado de las actividades ejecutadas por el Programa Nuestras Ciudades.",li:"No se registraron limitaciones durante el presente periodo",me:"Realización de coordinaciones internas en los procesos de contratación de bienes y servicios, así como el apoyo a las áreas técnicas, y proyectos de inversión en la elaboración de los Planes de Trabajo y evaluación de viabilidad financiera, que permita el cumplimiento de metas para el presente ejercicio.",mo:"En el mes de febrero, no hubo ninguna modificación presupuestal."},
    {aoi:"AOI00108200041",mes:3,af:1,afi:140668.99,lg:"Durante el mes de marzo se elaboró un (01) Informe Técnico consolidado de las actividades ejecutadas por el Programa Nuestras Ciudades.",li:"No se registraron limitaciones durante el presente periodo.",me:"Realización de coordinaciones internas en los procesos de contratación de bienes y servicios, así como el apoyo a las áreas técnicas, y proyectos de inversión en la elaboración de los Planes de Trabajo y evaluación de viabilidad financiera, que permita el cumplimiento de metas para el presente ejercicio.",mo:"En el mes de marzo, no hubo ninguna modificación presupuestal."},
    {aoi:"AOI00108200041",mes:4,af:1,afi:107751.51,lg:"Durante el mes de marzo se elaboró un (01) Informe Técnico consolidado de las actividades ejecutadas por el Programa Nuestras Ciudades.",li:"No se registraron limitaciones durante el presente periodo.",me:"Realización de coordinaciones internas en los procesos de contratación de bienes y servicios, así como el apoyo a las áreas técnicas, y proyectos de inversión en la elaboración de los Planes de Trabajo y evaluación de viabilidad financiera, que permita el cumplimiento de metas para el presente ejercicio.",mo:"En el mes de marzo, no hubo ninguna modificación presupuestal. CENTRO DE COSTOS. 03.07.06 UGEDEUS"},
    {aoi:"AOI00108200212",mes:1,af:0,afi:0,lg:"No se ejecutó ningún estudio. Aunque se realizaron coordinaciones con entidades técnico-científicas para la ejecución de los estudios y Gobiernos locales ubicados en el ámbito de los estudios.",li:"No se presentaron limitaciones.",me:"Se vienen realizando coordinaciones con instituciones técnico-científicas, a las cuales se les ha remitido oficio solicitando la expresión de interés y la presentación de su propuesta técnico-económica para la ejecución de los estudios.",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de enero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,144,570.00, representando un incremento/disminución de 0% del PIA. En el mes de enero no se aprobaron modificaciones."},
    {aoi:"AOI00108200212",mes:2,af:0,afi:0,lg:"Zonificación Geofísica: Se elaboró con el Instituto Geofísico del Perú (IGP), la propuesta de convenio específico de Colaboración Interinstitucional entre el Ministerio de Vivienda, Construcción y Saneamiento y el Instituto Geofísico del Perú, para la elaboración de 2 estudios de Zonificación Geofísica. Se definieron los ámbitos para los estudios y se cuenta con la propuesta de Caracterización geofísica, remitida por el IGP. Evaluación De Riesgo: Se realizaron trabajos de campo en el departamento de Cajamarca, en el marco de la elaboración de 2 estudios de Evaluación del Riesgo de Desastres por flujo de detritos en 2 quebradas de la ciudad de Cajamarca.",li:"No se presentaron limitaciones.",me:"En proceso de ejecución de estudios de evaluación de riesgos.",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de febrero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,209,758.00, representando un incremento/disminución de 0.29% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 65,188, para la atención de actividades de emergencia en el departamento de Arequipa, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 29,490.00 | | 2.3.2.4.5.1 .DE VEHÍCULOS | 3,000.00 | | 2.3.2.4.7.1. DE MAQUINARIAS Y EQUIPOS | 12,000.00 | | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES (…) | 20,698.00 | | Total | 65,188.00 |"},
    {aoi:"AOI00108200212",mes:3,af:1,afi:7545.27,lg:"Estudios De Zonificación Geofísica: Se suscribió el Convenio Específico N° 011-2026-VIVIENDA, con el Instituto Geofísico del Perú (IGP), para la ejecución de 2 estudios de Zonificación Geofísica en la localidad de Canta y Antioquia. Estudios De Evaluación De Riesgo: Se ejecutó el estudio de Evaluación del Riesgo de Desastres por flujo de detritos en el ámbito de la  quebrada Samana Cruz, distrito de Cajamarca, departamento y provincia de Cajamarca.",li:"No se presentaron limitaciones.",me:"Se elaboró la propuesta de convenio específico final entre IGP y MVCS, la cual fue revisada por el área legal del PNC, para su posterior remisión al Viceministerio de Vivienda y Urbanismo.",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de marzo 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,882,159.00, representando un incremento/disminución de 3.33% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 368,392, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3. 1 3. 1 1 COMBUSTIBLES Y CARBURANTES | 127,788 | | 2.3. 1 3. 1 3 LUBRICANTES, GRASAS Y AFINES | 2,000 | | 2.3. 1 6. 1 1 DE VEHÍCULOS | 27,200 | | 2.3. 1 11. 1 2 PARA VEHÍCULOS | 75,740 | | 2.3. 1 11. 1 4 PARA MAQUINARIAS Y EQUIPOS | 5,000 | | 2.3. 2 1. 2 99 OTROS GASTOS | 2,150 | | 2.3. 2 4. 5 1 DE VEHÍCULOS | 25,100 | | 2.3. 2 4. 7 1 DE MAQUINARIAS Y EQUIPOS | 27,780 | | 2.3. 2 7.11 2 TRANSPORTE Y TRASLADO DE CARGA, BIENES Y MATERIALES | 37,000 | | 2.3. 2 7.13 98 OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS JURÍDICAS | 3,000 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 295,425, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en las siguientes clasificadores: | Meta | Clasificador | Importe | | --- | --- | --- | | 190 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 26,250.00 | | 192 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,940.00 | | 192 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 9,200.00 | | 193 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,593.00 | | 193 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 11,499.00 | | 196 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 33,320.00 | | 196 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 4,600.00 | | 198 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,755.00 | | 198 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 7,359.00 | | 213 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 42,803.00 | | 213 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 3,526.00 | | 221 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,580.00 | Actividad Operativa: AOI00108202316\tAtención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Meta | Clasificador | Importe | | --- | --- | --- | | 199 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 8,584.00 |"},
    {aoi:"AOI00108200212",mes:4,af:1,afi:144100,lg:"Estudios de Zonificación Geofísica: Se realizaron las coordinaciones con la municipalidad provincial de Canta y la municipalidad distrital de Antioquía para la recopilación y remisión de información de Catastro, Estudios de suelo, Planes urbanos, Estudios de riesgo de desastres, a utilizarse como insumo para la ejecución de los estudios de Zonificación Geofísica. Se elaboró la cartografía base de Canta y Antioquia. Evaluación de Riesgo: Se ejecutó el estudio de Evaluación del Riesgo de Desastres  por flujo de detritos en el ámbito de la quebrada Lucmacucho, distrito y provincia de Cajamarca, departamento de Cajamarca.",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de abril 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 23, 480,701.00, representando un incremento/disminución de 5.69% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 491,038.00, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 460,419.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 98,123.00 | | Total | 598,542.00 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 4,91,038.00, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en los siguientes clasificadores: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 383,118.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 67,920.00 | | Total | 491,038.00 | Actividad Operativa: AOI00108202316 - Atención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 77,301.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 30,203.00 | | Total | 107,504.00 | CENTRO DE COSTOS 03.07.08 UNINDEUS"},
    {aoi:"AOI00108200213",mes:1,af:13,afi:602096.61,lg:"Se logró realizar trece (13) intervenciones ejecutadas en las UBOs de Ancash (02 intervenciones), Arequipa (02 intervenciones), Ayacucho (02) intervenciones, Cajamarca (01 intervención), Huánuco (01 intervención), La Libertad (01 intervención), Lambayeque (01 intervención), Lima (02 intervenciones), Puno (01 intervención).",li:"Reprogramación de intervenciones debido a las maquinarias y vehículos que han ido quedando inoperativos por el propio uso en el desarrollo de las intervenciones. Y en la demora en la contratación de operadores de maquinaria pesada y vehículos.",me:"Se implementaron acciones orientadas a reducir los tiempos en los procesos de contratación de bienes y servicios.",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de enero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,144,570.00, representando un incremento/disminución de 0% del PIA. En el mes de enero no se aprobaron modificaciones."},
    {aoi:"AOI00108200213",mes:2,af:43,afi:1409715.64,lg:"Se logró realizar cuarenta y tres (43) intervenciones ejecutadas en las UBOs de Ancash (06 intervenciones), Apurímac (01 intervención), Ayacucho (03 intervenciones), Cajamarca (02 intervenciones), Junín (03 intervenciones), La Libertad (03 intervenciones), Lambayeque (04 intervenciones), Lima (09 intervenciones), Piura (03 intervenciones), Puno (02 intervenciones), Tacna (04 intervenciones) y Tumbes (03 intervenciones).",li:"Los DS 003 y 005, ocasionaron que se prioricen las intervenciones por emergencia antes que las de prevención, las cuales fueron reprogramadas para los meses subsiguientes.",me:"Coordinaciones permanentes con los Coordinadores zonales de las UBOs para la programación de mayores Fichas Técnicas. Se realiza la contratación de personal con una duración mínima de 60 días, otorgando continuidad del servicio. Además, se viene agilizando los procesos de contratación, lo que permite una cobertura más rápida de las necesidades de personal. Que las intervenciones por prevención programadas se cumplan en los plazos previstos",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de febrero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,209,758.00, representando un incremento/disminución de 0.29% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 65,188, para la atención de actividades de emergencia en el departamento de Arequipa, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 29,490.00 | | 2.3.2.4.5.1 .DE VEHÍCULOS | 3,000.00 | | 2.3.2.4.7.1. DE MAQUINARIAS Y EQUIPOS | 12,000.00 | | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES (…) | 20,698.00 | | Total | 65,188.00 |"},
    {aoi:"AOI00108200213",mes:3,af:65,afi:2522429.06,lg:"Se logró realizar sesenta y cinco (65) intervenciones ejecutadas en las UBOs de Ancash (05 intervenciones), Apurímac (04 intervenciones), Arequipa (01 intervención), Ayacucho (04 intervenciones), Cajamarca (04 intervenciones), Cusco (01 intervención), Huánuco (05 intervenciones), Ica (01 intervención, Junín (04 intervenciones), La Libertad (04 intervenciones), Lambayeque (01 intervenciones), Lima (14 intervenciones), Piura (05 intervenciones), Puno (03 intervenciones), Tacna (01 intervención) y Tumbes (08 intervenciones).",li:"La variación del precio de combustible limita la disponibilidad para la ejecución continua de intervenciones.",me:"Se gestionaron aportes con los gobiernos locales para contribuir al financiamiento de la adquisición de combustible.",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de marzo 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,882,159.00, representando un incremento/disminución de 3.33% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 368,392, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3. 1 3. 1 1 COMBUSTIBLES Y CARBURANTES | 127,788 | | 2.3. 1 3. 1 3 LUBRICANTES, GRASAS Y AFINES | 2,000 | | 2.3. 1 6. 1 1 DE VEHÍCULOS | 27,200 | | 2.3. 1 11. 1 2 PARA VEHÍCULOS | 75,740 | | 2.3. 1 11. 1 4 PARA MAQUINARIAS Y EQUIPOS | 5,000 | | 2.3. 2 1. 2 99 OTROS GASTOS | 2,150 | | 2.3. 2 4. 5 1 DE VEHÍCULOS | 25,100 | | 2.3. 2 4. 7 1 DE MAQUINARIAS Y EQUIPOS | 27,780 | | 2.3. 2 7.11 2 TRANSPORTE Y TRASLADO DE CARGA, BIENES Y MATERIALES | 37,000 | | 2.3. 2 7.13 98 OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS JURÍDICAS | 3,000 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 295,425, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en las siguientes clasificadores: | Meta | Clasificador | Importe | | --- | --- | --- | | 190 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 26,250.00 | | 192 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,940.00 | | 192 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 9,200.00 | | 193 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,593.00 | | 193 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 11,499.00 | | 196 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 33,320.00 | | 196 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 4,600.00 | | 198 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,755.00 | | 198 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 7,359.00 | | 213 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 42,803.00 | | 213 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 3,526.00 | | 221 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,580.00 | Actividad Operativa: AOI00108202316\tAtención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Meta | Clasificador | Importe | | --- | --- | --- | | 199 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 8,584.00 |"},
    {aoi:"AOI00108200213",mes:4,af:51,afi:2400785.52,lg:"Se logró ejecutar cincuenta y uno (51) intervenciones ejecutadas en las UBOs de Ancash (03 intervenciones), Apurímac (01 intervención), Arequipa (02 intervenciones), Ayacucho (01 intervención), Cajamarca (03 intervenciones), Cusco (01 intervención), Huánuco (02 intervenciones), Ica (03 intervenciones), Junín (03 intervenciones), La Libertad (03 intervenciones), Lambayeque (03 intervenciones), Lima (11 intervenciones), Piura (05 intervenciones), Puno (03 intervenciones), Tacna (01 intervención) y Tumbes (06 intervenciones).",li:"El incremento del precio del combustible, ha ocasionado que disminuya la cantidad de los galones establecidos en los contratos con los proveedores, influyendo en la disminución de las intervenciones.",me:"Se intensifica las coordinaciones de los CCRR de las UBOS con las autoridades de los gobiernos locales para generar los aportes correspondientes en combustible",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de abril 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 23, 480,701.00, representando un incremento/disminución de 5.69% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 491,038.00, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 460,419.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 98,123.00 | | Total | 598,542.00 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 4,91,038.00, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en los siguientes clasificadores: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 383,118.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 67,920.00 | | Total | 491,038.00 | Actividad Operativa: AOI00108202316 - Atención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 77,301.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 30,203.00 | | Total | 107,504.00 | CENTRO DE COSTOS 03.07.08 UNINDEUS"},
    {aoi:"AOI00108200214",mes:1,af:4,afi:19673.88,lg:"- Informe Técnico 00000003-2025/VMVU/PNC/UGERDES-identificación de tramos en ámbitos urbanos identificados por la UGERDES para intervención de PNC maquinarias. - Informe Técnico 00000008-2025/VMVU/PNC/UGERDES-evaluación de seguridad física de 234 predios en el ámbito en el que se ubican las viviendas colapsadas e inhabitables en el departamento de lima, para la intervención con el BFH en las modalidades de aplicación de construcción en sitio propio y adquisición de vivienda nueva. - Informe Técnico 00000008-2025/VMVU/PNC/UGERDES-identificación de zonas expuestas a peligro en el marco del cumplimiento de los indicadores del plan de gestión integral de riesgos de desastres naturales (PGIRDN), programa presupuestal 068 reducción de la vulnerabilidad y atención de emergencias por desastres y lineamientos técnicos del proceso de estimación del riesgo de desastres. - Informe Técnico 00000008-2025/VMVU/PNC/UGERDES-solicita intervención de autoridades para evitar ocupación en faja marginal del Río Huallaga, distrito y provincia de Ambo y departamento de Huánuco.",li:"No se presentaron limitaciones.",me:"Se viene realizando la programación de las actividades de asistencia técnica y capacitación.",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de enero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,144,570.00, representando un incremento/disminución de 0% del PIA. En el mes de enero no se aprobaron modificaciones."},
    {aoi:"AOI00108200214",mes:2,af:3,afi:19646.43,lg:"- Informe Técnico 00000010-2025/VMVU/PNC/UGERDES-sustento técnico para la ejecución de intervenciones preventivas en el río Lurín y solicita facilidades institucionales para la gestión de financiamiento ante el FONDES. - Informe Técnico 00000015-2025/VMVU/PNC/UGERDES-opinión técnica respecto a propuesta de alternativa de solución a mitigación de riesgo identificado en proyecto de inversión denominado: “mejoramiento y ampliación del servicio educativo secundaria en la I.E. José Abelardo Quiñones Gonzales, distrito de Oyotún, provincia de Chiclayo, departamento de Lambayeque, CON C.U.I Nº 2661120. - Informe Técnico 00000016-2025/VMVU/PNC/UGERDES- evaluación de seguridad física de 3732 predios del ámbito en el que se ubican las viviendas colapsadas e inhabitables que se basa en los formularios de campo 2A-EDAN, para la intervención con el BFH en las modalidades de aplicación de construcción en sitio propio y adquisición de vivienda nueva.",li:"No se presentaron limitaciones.",me:"Se viene realizando las coordinaciones para la ejecución de las actividades de capacitación.",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de febrero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,209,758.00, representando un incremento/disminución de 0.29% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 65,188, para la atención de actividades de emergencia en el departamento de Arequipa, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 29,490.00 | | 2.3.2.4.5.1 .DE VEHÍCULOS | 3,000.00 | | 2.3.2.4.7.1. DE MAQUINARIAS Y EQUIPOS | 12,000.00 | | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES (…) | 20,698.00 | | Total | 65,188.00 |"},
    {aoi:"AOI00108200214",mes:3,af:4,afi:19673.88,lg:"- Informe Técnico 00000025-2025/VMVU/PNC/UGERDES-evaluación de seguridad física de 3732 predios del ámbito en el que se ubican las viviendas colapsadas e inhabitables que se basa en los formularios de campo 2A-EDAN, para la intervención con el BFH en las modalidades de aplicación de construcción en sitio propio y adquisición de vivienda nueva. - Informe Técnico 00000030-2025/VMVU/PNC/UGERDES-evaluación de seguridad física de 234 predios en el ámbito en el que se ubican las viviendas colapsadas e inhabitables en el departamento de lima, para la intervención con el BFH en las modalidades de aplicación de construcción en sitio propio y adquisición de vivienda nueva. - Informe Técnico 00000031-2025/VMVU/PNC/UGERDES-seguridad física del ámbito en el que se ubican las viviendas colapsadas e inhabitables las fajas marginales. - Informe Técnico 00000032-2025/VMVU/PNC/UGERDES-seguridad física del ámbito en el que se ubican respecto a las 31 viviendas que se ubican en zona de riesgo no mitigable y/o faja marginal, no se ha consignado las fajas marginales en las se encuentran dichas viviendas y si estas se encuentran comprendidas en la zona de riesgo no mitigable.",li:"No se presentaron limitaciones PNC-MAQUINARIAS",me:"Las asistencias técnicas se desarrollan también de manera virtual, a fin de facilitar la participación de un mayor número de funcionarios",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de marzo 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,882,159.00, representando un incremento/disminución de 3.33% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 368,392, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3. 1 3. 1 1 COMBUSTIBLES Y CARBURANTES | 127,788 | | 2.3. 1 3. 1 3 LUBRICANTES, GRASAS Y AFINES | 2,000 | | 2.3. 1 6. 1 1 DE VEHÍCULOS | 27,200 | | 2.3. 1 11. 1 2 PARA VEHÍCULOS | 75,740 | | 2.3. 1 11. 1 4 PARA MAQUINARIAS Y EQUIPOS | 5,000 | | 2.3. 2 1. 2 99 OTROS GASTOS | 2,150 | | 2.3. 2 4. 5 1 DE VEHÍCULOS | 25,100 | | 2.3. 2 4. 7 1 DE MAQUINARIAS Y EQUIPOS | 27,780 | | 2.3. 2 7.11 2 TRANSPORTE Y TRASLADO DE CARGA, BIENES Y MATERIALES | 37,000 | | 2.3. 2 7.13 98 OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS JURÍDICAS | 3,000 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 295,425, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en las siguientes clasificadores: | Meta | Clasificador | Importe | | --- | --- | --- | | 190 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 26,250.00 | | 192 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,940.00 | | 192 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 9,200.00 | | 193 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,593.00 | | 193 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 11,499.00 | | 196 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 33,320.00 | | 196 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 4,600.00 | | 198 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,755.00 | | 198 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 7,359.00 | | 213 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 42,803.00 | | 213 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 3,526.00 | | 221 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,580.00 | Actividad Operativa: AOI00108202316\tAtención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Meta | Clasificador | Importe | | --- | --- | --- | | 199 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 8,584.00 |"},
    {aoi:"AOI00108200214",mes:4,af:2,afi:19673.88,lg:"- Informe Técnico 00000045-2025/VMVU/PNC/UGERDES-evaluación de seguridad física de 16 predios del ámbito en el que se ubican las viviendas colapsadas e inhabitables para entrega de módulos temporales de vivienda, distrito de Tumán, provincia de Chiclayo, departamento de Lambayeque. - Informe Técnico 00000053-2025/VMVU/PNC/UGERDES-evaluación de seguridad física debido a cambio de punto d reinstalación de un (01) Módulo Temporal de Vivienda en el distrito de Tumán, provincia de Chiclayo, departamento de Lambayeque. PNC-MAQUINARIAS",me:"Para los Estudios de Zonificación Geofísica se vienen realizando las coordinaciones con la municipalidad provincial de Canta y la municipalidad distrital de Antioquía para la recopilación y remisión de información de Catastro, Estudios de suelo, Planes urbanos, Estudios de riesgo de desastres, a utilizarse como insumo para la ejecución de los estudios de Zonificación Geofísica. Se elaboró la cartografía base de Canta y Antioquia. PNC-MAQUINARIAS",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de abril 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 23, 480,701.00, representando un incremento/disminución de 5.69% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 491,038.00, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 460,419.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 98,123.00 | | Total | 598,542.00 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 4,91,038.00, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en los siguientes clasificadores: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 383,118.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 67,920.00 | | Total | 491,038.00 | Actividad Operativa: AOI00108202316 - Atención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 77,301.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 30,203.00 | | Total | 107,504.00 | CENTRO DE COSTOS 03.07.08 UNINDEUS"},
    {aoi:"AOI00108202307",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de enero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,144,570.00, representando un incremento/disminución de 0% del PIA. En el mes de enero no se aprobaron modificaciones."},
    {aoi:"AOI00108202307",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de febrero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,209,758.00, representando un incremento/disminución de 0.29% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 65,188, para la atención de actividades de emergencia en el departamento de Arequipa, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 29,490.00 | | 2.3.2.4.5.1 .DE VEHÍCULOS | 3,000.00 | | 2.3.2.4.7.1. DE MAQUINARIAS Y EQUIPOS | 12,000.00 | | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES (…) | 20,698.00 | | Total | 65,188.00 |"},
    {aoi:"AOI00108202307",mes:3,af:10.27,afi:38516,lg:"Se logró realizar cuatro (04) intervenciones de emergencia, que equivalen a 10.27 Km ejecutados en las UBOs de:  Arequipa (4.65 km en 02 intervenciones), Junín (0.74 km en 01 intervención) y Tacna (0.15 km en 01 intervención), Ayacucho (0.28 km), Puno (4.00 km) y Lambayeque (0.45 Km)",li:"La variación del precio de combustible limita la disponibilidad para la ejecución continua de intervenciones.",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de marzo 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,882,159.00, representando un incremento/disminución de 3.33% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 368,392, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3. 1 3. 1 1 COMBUSTIBLES Y CARBURANTES | 127,788 | | 2.3. 1 3. 1 3 LUBRICANTES, GRASAS Y AFINES | 2,000 | | 2.3. 1 6. 1 1 DE VEHÍCULOS | 27,200 | | 2.3. 1 11. 1 2 PARA VEHÍCULOS | 75,740 | | 2.3. 1 11. 1 4 PARA MAQUINARIAS Y EQUIPOS | 5,000 | | 2.3. 2 1. 2 99 OTROS GASTOS | 2,150 | | 2.3. 2 4. 5 1 DE VEHÍCULOS | 25,100 | | 2.3. 2 4. 7 1 DE MAQUINARIAS Y EQUIPOS | 27,780 | | 2.3. 2 7.11 2 TRANSPORTE Y TRASLADO DE CARGA, BIENES Y MATERIALES | 37,000 | | 2.3. 2 7.13 98 OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS JURÍDICAS | 3,000 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 295,425, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en las siguientes clasificadores: | Meta | Clasificador | Importe | | --- | --- | --- | | 190 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 26,250.00 | | 192 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,940.00 | | 192 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 9,200.00 | | 193 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,593.00 | | 193 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 11,499.00 | | 196 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 33,320.00 | | 196 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 4,600.00 | | 198 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,755.00 | | 198 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 7,359.00 | | 213 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 42,803.00 | | 213 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 3,526.00 | | 221 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,580.00 | Actividad Operativa: AOI00108202316\tAtención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Meta | Clasificador | Importe | | --- | --- | --- | | 199 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 8,584.00 |"},
    {aoi:"AOI00108202307",mes:4,af:8.86,afi:14718.33,lg:"Se logró realizar ocho (08) intervenciones de emergencia, que equivalen a 8.861 Km ejecutados en las UBOs de: Junín (0.0.498 km en 01 intervención), Lambayeque (1.39 km en 03 intervenciones) y Puno (6.973 km en 04 intervenciones).",li:"El incremento del precio del combustible, ha ocasionado que disminuya la cantidad de los galones establecidos en los contratos con los proveedores, influyendo en la disminución de las intervenciones.",me:"Las inspecciones realizadas por el Coordinador Regional UBO a la zona de intervención sean inmediatas, formulando el acta de inspección lo más pronto posible",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de abril 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 23, 480,701.00, representando un incremento/disminución de 5.69% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 491,038.00, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 460,419.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 98,123.00 | | Total | 598,542.00 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 4,91,038.00, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en los siguientes clasificadores: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 383,118.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 67,920.00 | | Total | 491,038.00 | Actividad Operativa: AOI00108202316 - Atención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 77,301.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 30,203.00 | | Total | 107,504.00 | CENTRO DE COSTOS 03.07.08 UNINDEUS"},
    {aoi:"AOI00108202316",mes:1,af:0,afi:0,mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de enero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,144,570.00, representando un incremento/disminución de 0% del PIA. En el mes de enero no se aprobaron modificaciones."},
    {aoi:"AOI00108202316",mes:2,af:0,afi:0,mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de febrero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,209,758.00, representando un incremento/disminución de 0.29% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 65,188, para la atención de actividades de emergencia en el departamento de Arequipa, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 29,490.00 | | 2.3.2.4.5.1 .DE VEHÍCULOS | 3,000.00 | | 2.3.2.4.7.1. DE MAQUINARIAS Y EQUIPOS | 12,000.00 | | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES (…) | 20,698.00 | | Total | 65,188.00 |"},
    {aoi:"AOI00108202316",mes:3,af:2.75,afi:0,lg:"En el mes de marzo se realizó la ejecución de 2.75 km en el distrito de Cayma, Provincia de Arequipa en el marco de la Declaratoria de Emergencia con D.S 019-2026-PCM.",li:"La variación del precio de combustible limita la disponibilidad para la ejecución continua de intervenciones.",me:"Las inspecciones realizadas por el Coordinador Regional UBO para las intervenciones de transitabilidad sean inmediatas, formulando el acta de inspección lo más pronto posible",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de marzo 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,882,159.00, representando un incremento/disminución de 3.33% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 368,392, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3. 1 3. 1 1 COMBUSTIBLES Y CARBURANTES | 127,788 | | 2.3. 1 3. 1 3 LUBRICANTES, GRASAS Y AFINES | 2,000 | | 2.3. 1 6. 1 1 DE VEHÍCULOS | 27,200 | | 2.3. 1 11. 1 2 PARA VEHÍCULOS | 75,740 | | 2.3. 1 11. 1 4 PARA MAQUINARIAS Y EQUIPOS | 5,000 | | 2.3. 2 1. 2 99 OTROS GASTOS | 2,150 | | 2.3. 2 4. 5 1 DE VEHÍCULOS | 25,100 | | 2.3. 2 4. 7 1 DE MAQUINARIAS Y EQUIPOS | 27,780 | | 2.3. 2 7.11 2 TRANSPORTE Y TRASLADO DE CARGA, BIENES Y MATERIALES | 37,000 | | 2.3. 2 7.13 98 OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS JURÍDICAS | 3,000 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 295,425, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en las siguientes clasificadores: | Meta | Clasificador | Importe | | --- | --- | --- | | 190 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 26,250.00 | | 192 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,940.00 | | 192 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 9,200.00 | | 193 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,593.00 | | 193 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 11,499.00 | | 196 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 33,320.00 | | 196 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 4,600.00 | | 198 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,755.00 | | 198 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 7,359.00 | | 213 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 42,803.00 | | 213 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 3,526.00 | | 221 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,580.00 | Actividad Operativa: AOI00108202316\tAtención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Meta | Clasificador | Importe | | --- | --- | --- | | 199 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 8,584.00 |"},
    {aoi:"AOI00108202316",mes:4,af:0,afi:8584,lg:"En el mes de abril no se ha ejecutado intervenciones de transitabilidad de vías por declaratoria de estado de emergencia",li:"El incremento del precio del combustible, ha ocasionado que disminuya la cantidad de los galones establecidos en los contratos con los proveedores, influyendo en la disminución de las intervenciones.",me:"Las inspecciones realizadas por el Coordinador Regional UBO para las intervenciones de transitabilidad sean inmediatas, formulando el acta de inspección lo más pronto posible",mo:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de abril 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 23, 480,701.00, representando un incremento/disminución de 5.69% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 491,038.00, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 460,419.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 98,123.00 | | Total | 598,542.00 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 4,91,038.00, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en los siguientes clasificadores: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 383,118.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 67,920.00 | | Total | 491,038.00 | Actividad Operativa: AOI00108202316 - Atención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 77,301.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 30,203.00 | | Total | 107,504.00 | CENTRO DE COSTOS 03.07.08 UNINDEUS"},
  ];

  const progress = PROG.filter(p => byAOI[p.aoi]).map(p => ({
    id: uid(), actividadId: byAOI[p.aoi], anio: 2026, mes: p.mes,
    avanceFisico: p.af || 0, avanceFinanciero: p.afi || 0,
    logros: p.lg || "", limitaciones: p.li || "", medidas: p.me || "", modificaciones: p.mo || "",
    fechaRegistro: new Date().toISOString(),
  }));

  const MODIFS = [
    {cc:"GESTIÓN PNC",mes:1,importe:0,concepto:"El Centro de Costo 03.07 - Programa Nuestras Ciudades al cierre del mes de enero 2026, contó con un PIA de S/ 2,094,363.00 y un PIM de S/ 2,094,363.00 representando un incremento/disminución de 0 % del PIA. En el mes de enero no se tiene modificaciones."},
    {cc:"GESTIÓN PNC",mes:2,importe:0,concepto:"En el mes de febrero, no hubo ninguna modificación presupuestal."},
    {cc:"GESTIÓN PNC",mes:3,importe:0,concepto:"En el mes de marzo, no hubo ninguna modificación presupuestal."},
    {cc:"GESTIÓN PNC",mes:4,importe:0.0,concepto:"En el mes de marzo, no hubo ninguna modificación presupuestal. CENTRO DE COSTOS. 03.07.06 UGEDEUS"},
    {cc:"UGEDEUS",mes:1,importe:0,concepto:"El Centro de Costo 03.07.06 - UNIDAD DE GESTIÓN DEL DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 817,160.00 y un PIM de S/ 869,881.00 representando un incremento/disminución de 6.45% del PIA. En el mes de enero se aprobaron una modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI 00108200204 Elaboración de planes de acondicionamiento territorial, planes urbanos y estudios vinculados a la gestión urbana sostenible de las ciudades: Se incrementó en S/ 50,785.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 600.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 1,336.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS."},
    {cc:"UGEDEUS",mes:2,importe:0,concepto:"El Centro de Costo 03.07.06 - UNIDAD DE GESTIÓN DEL DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 817,160.00 y un PIM de S/ 1,079,568.00 representando un incremento/disminución de 32.11% del PIA. En el mes de febrero aprobaron una modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI 00108200204 Elaboración de planes de acondicionamiento territorial, planes urbanos y estudios vinculados a la gestión urbana sostenible de las ciudades: Se incrementó en S/ 209,687.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de, para financiar el pago de remuneraciones del personal CAS."},
    {cc:"UGEDEUS",mes:3,importe:0,concepto:"En el mes de marzo no existe ninguna modificación presupuestal"},
    {cc:"UGEDEUS",mes:4,importe:262408.0,concepto:"En el mes de abril no existe ninguna modificación presupuestal CENTRO DE COSTOS. 03.07.07 UGERDES"},
    {cc:"UGERDES",mes:1,importe:0,concepto:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de enero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,144,570.00, representando un incremento/disminución de 0% del PIA. En el mes de enero no se aprobaron modificaciones."},
    {cc:"UGERDES",mes:2,importe:0,concepto:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de febrero 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,209,758.00, representando un incremento/disminución de 0.29% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 65,188, para la atención de actividades de emergencia en el departamento de Arequipa, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 29,490.00 | | 2.3.2.4.5.1 .DE VEHÍCULOS | 3,000.00 | | 2.3.2.4.7.1. DE MAQUINARIAS Y EQUIPOS | 12,000.00 | | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES (…) | 20,698.00 | | Total | 65,188.00 |"},
    {cc:"UGERDES",mes:3,importe:0,concepto:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de marzo 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 22,882,159.00, representando un incremento/disminución de 3.33% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 368,392, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3. 1 3. 1 1 COMBUSTIBLES Y CARBURANTES | 127,788 | | 2.3. 1 3. 1 3 LUBRICANTES, GRASAS Y AFINES | 2,000 | | 2.3. 1 6. 1 1 DE VEHÍCULOS | 27,200 | | 2.3. 1 11. 1 2 PARA VEHÍCULOS | 75,740 | | 2.3. 1 11. 1 4 PARA MAQUINARIAS Y EQUIPOS | 5,000 | | 2.3. 2 1. 2 99 OTROS GASTOS | 2,150 | | 2.3. 2 4. 5 1 DE VEHÍCULOS | 25,100 | | 2.3. 2 4. 7 1 DE MAQUINARIAS Y EQUIPOS | 27,780 | | 2.3. 2 7.11 2 TRANSPORTE Y TRASLADO DE CARGA, BIENES Y MATERIALES | 37,000 | | 2.3. 2 7.13 98 OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS JURÍDICAS | 3,000 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 295,425, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en las siguientes clasificadores: | Meta | Clasificador | Importe | | --- | --- | --- | | 190 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 26,250.00 | | 192 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,940.00 | | 192 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 9,200.00 | | 193 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 43,593.00 | | 193 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 11,499.00 | | 196 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 33,320.00 | | 196 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 4,600.00 | | 198 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,755.00 | | 198 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 7,359.00 | | 213 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 42,803.00 | | 213 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 3,526.00 | | 221 | 2.3.1.3.1.1. COMBUSTIBLES Y CARBURANTES | 34,580.00 | Actividad Operativa: AOI00108202316\tAtención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Meta | Clasificador | Importe | | --- | --- | --- | | 199 | 2.3.2.7.14.98. OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 8,584.00 |"},
    {cc:"UGERDES",mes:4,importe:1336131.0,concepto:"El Centro de Costo 03.07.07 - UNIDAD DE GESTIÓN DEL RIESGO DE DESASTRES al cierre del mes de abril 2026, contó con un PIA de S/ 22,144,570.00 y un PIM de S/ 23, 480,701.00, representando un incremento/disminución de 5.69% del PIA. Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200213 Intervención en mantenimiento de cauces, drenajes y estructuras de seguridad física frente a peligros con las UBOs: Se realizó una modificación presupuestal por el importe de S/ 491,038.00, para atender las intervenciones de limpieza, descolmatación, las modificaciones para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 460,419.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 98,123.00 | | Total | 598,542.00 | Actividad Operativa: AOI00108202307 Atención de actividades de emergencia: Se incrementó en S/ 4,91,038.00, para la atención de actividades de emergencia en los departamentos de Junín, Lambayeque, Tacna, Ayacucho, Arequipa, Puno, en marco de las emergencias declaradas por Decreto Supremo. Las modificaciones presupuestarias se realizaron para la habilitación es en los siguientes clasificadores: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 383,118.00 | | 2.3.2.4.7.1.DE MAQUINARIAS Y EQUIPOS | 40,000.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 67,920.00 | | Total | 491,038.00 | Actividad Operativa: AOI00108202316 - Atención de Transitabilidad de Vías Se incrementó en S/ 8,584.00, para la atención de actividades de emergencia en los departamentos de Arequipa, para atender actividades de transitabilidad de vías, en el marco del D.S 019-2026-PCM. Las modificaciones presupuestarias para habilitación de recursos fueron en los siguientes clasificadores de gasto: | Clasificador | Importe | | --- | --- | | 2.3.1.3.1.1.COMBUSTIBLES Y CARBURANTES | 77,301.00 | | 2.3.2.7.14.98.OTROS SERVICIOS TÉCNICOS Y PROFESIONALES DESARROLLADOS POR PERSONAS NATURALES | 30,203.00 | | Total | 107,504.00 | CENTRO DE COSTOS 03.07.08 UNINDEUS"},
    {cc:"UNINDEUS",mes:1,importe:0,concepto:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de enero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,339,694.00 representando un incremento/disminución de 0.52% del PIA. En el mes de enero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Actividad Operativa: AOI00108200085 Promoción de las inversiones público privadas en proyectos identificados en instrumentos para la gestión urbano territorial Se incrementó en S/ 148,370.00 en el especifica de gasto 2.1.1.13.1.2. Contrato administrativo de servicios - transitorio; se incrementó en S/ 1,200.00 en el clasificador 2.1.1.9.1.4. Aguinaldos de contrato administrativo de servicios y se incrementó en S/ 2,673.00 en el clasificador 2.1.3.1.1.15. contribuciones a ESSALUD de contrato administrativo de servicios, para financiar el pago de remuneraciones del personal CAS. Inversiones - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque. - Se redujo a S/ 1,487,298.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador  2.6.2.3.2.3. Costo de construcción por contrata, para financiar el PIP 2256322. Instalación de los servicios de agua potable y alcantarillado sanitario en la Nueva Ciudad de Olmos, distrito de Olmos - provincia de Lambayeque - región Lambayeque, en el clasificador 2.6.8.1.4.3. Gasto por la contratación de servicios y en el PIP 2270290. Gestión del programa y otros: habilitación para la creación de la Nueva Ciudad de Olmos, provincia de Lambayeque, departamento Lambayeque en el clasificador 2.6.3.2.3.1. Equipos computacionales y periféricos, 2.6.8.1.4.3. Gasto por la Contratación de servicios, 2.6.6.1.3.2. Softwares, 2.6.8.1.4.2. Gasto por la compra de bienes con la finalidad de asegurar la continuidad del proyecto a través de la contratación de especialistas, adquisición de equipo de cómputo, software y EPPs."},
    {cc:"UNINDEUS",mes:2,importe:0,concepto:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de febrero 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,274,506.00 representando un incremento de 0.30% del PIA. En el mes de febrero se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 65,188.00 del 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 003-2025-PCM y 019-2025 PCM - Se redujo a S/ 65,188.00  en el proyecto con CUI 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, y servicio de mantenimiento preventivo de los vehículos y maquinarias, en el marco de las emergencias en el departamento de Arequipa."},
    {cc:"UNINDEUS",mes:3,importe:0,concepto:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de marzo 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,627,544.00 representando un incremento de 1.51% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | PROMPERU | 0000005-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 24,886.00 | | PROMPERU | 0000001-2026 | 078-2026-VIVIENDA | 09/03/2026 | 15,606.00 | | SERFOR | 0000001-2026 | 0081-2026-VIVIENDA | 12/03/2026 | 12,027.00 | | PCM | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 6.00 | | DEVIDA | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 108.00 | | MINAGRI | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 31,031.00 | | PCM | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 4,362.00 | | MINEDU | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 2,778.00 | | INIA | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 85,085.00 | | ANIN | 0000001-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,120.00 | | CONGRESO | 0000004-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 1,798.00 | | MINEDU | 0000003-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 47,621.00 | | DEVIDA | 0000058-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 8,964.00 | | MEF | 0000002-2025 | 0089-2026-VIVIENDA | 18/03/2026 | 15,134.00 | | SERFOR | 0000002-2026 | 0095-2026-VIVIENDA | 22/03/2026 | 5,918.00 | | SERFOR | 0000003-2025 | 0098-2026-VIVIENDA | 22/03/2026 | 55,445.00 | | JNE | 0000001-2026 | 0101-2026-VIVIENDA | 26/03/2026 | 345,158.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 304,009.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, del departamento de Arequipa en el marco de la emergencia declarada por los decretos supremos N° 019-2026 PCM, 025-2026 PCM, 032-2026 PCM - Se redujo a S/ 304,009.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
    {cc:"UNINDEUS",mes:4,importe:586741.0,concepto:"El Centro de Costo 03.07.08 - UNIDAD DE INVERSIONES EN DESARROLLO URBANO SOSTENIBLE al cierre del mes de abril 2026, contó con un PIA de S/ 29,187,451.00 y un PIM de S/ 29,774,192.00 representando un incremento de 1.97% del PIA. En el mes de marzo se aprobaron 3 notas de modificación, correspondiendo las principales a: Tipo II (Créditos Suplementarios): Actividad Operativa AOI00108200215 Realización del Mantenimiento de Instalaciones y Equipamiento del Centro de Convenciones 27 De Enero, Ciudad de Lima En el mes de marzo se asignaron mayores recursos por transferencias financieras realizadas a favor de LCC, por préstamo de los ambientes del LCC a las instituciones públicas, de acuerdo al cuadro siguientes: | ENTIDAD | N° TRANSF | RESOLUCIÓN | FECHA APROB | IMPORTE APROB | | --- | --- | --- | --- | --- | | MINEDU | 0000002-2026 | 00179-2026-VIVIENDA | 27/04/2026 | 13,069.00 | | MINAGRI | 0000002-2026 | 00180-2026-VIVIENDA | 27/04/2026 | 188,644.00 | | MIDIS | 0000002-2026 | 00181-2026-VIVIENDA | 27/04/2026 | 34,426.00 | | MIDIS | 0000001-2026 | 00187-2026-VIVIENDA | 29/04/2026 | 59,847.00 | Tipo III (Créditos Presupuestales y Anulaciones dentro de la Unidad Ejecutora): Inversiones - Se redujo a S/ 732,197.00 en el PIP  2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, para financiar actividades de emergencia, en el marco de la emergencia declarada por los decretos supremos N° 025-2026 PCM, 032-2026 PCM, 036-2026 PCM, 039-2026 PCM, 047-2026 PCM. - Se redujo a S/ 732,197.00 en el PIP 2266697. Instalación de los servicios de vialidad urbana para la Nueva Ciudad de Olmos, distrito de Olmos, provincia de Lambayeque - departamento Lambayeque, en el clasificador 2.6.8.1.4.4. gasto por laudos arbitrales o sentencias vinculadas a inversiones para financiar la adquisición de combustible, contratación de operadores, en el marco de las emergencias."},
  ];
  const ccCodigoMap = { "GESTIÓN PNC": "03.07", "UGEDEUS": "03.07.06", "UGERDES": "03.07.07", "UNINDEUS": "03.07.08" };
  const modifs = MODIFS.map(m => ({
    id: uid(),
    fecha: `2026-${String(m.mes).padStart(2, "0")}-15`,
    anio: 2026,
    mes: m.mes,
    centroCosto: m.cc,
    area: "TODAS",
    codigoAOI: "",
    tipo: "Tipo III - Modificación en el Nivel Funcional Programático",
    clasificadores: [{ id: uid(), clasificador: m.concepto, importe: Number(m.importe) || 0 }],
    clasificador: m.concepto,
    importe: Number(m.importe) || 0,
    concepto: m.concepto,
  }));
  const periodos = buildSeedPeriodos();
  const solicitudes = [];

  return { activities, progress, modifs, periodos, solicitudes };
}

// Genera el seed para años 2027+: mismas 42 actividades operativas (misma estructura OEI/AEI)
// Para años futuros (2027+): datos completamente vacíos.
// Las OEI, AEI, actividades operativas y programación física/financiera se cargarán
// en enero de cada año desde el reporte de CEPLAN, tal como se hizo para 2026.
function seedAnioVacio(year) {
  // Los periodos del año nuevo se pre-generan para habilitar el control de acceso por mes.
  const periodos = buildSeedPeriodos().map(p => ({
    ...p,
    anio: year,
    id: uid(),
    // Ajustar fechas al año correcto
    fechaApertura: p.fechaApertura.replace('2026', String(year)).replace('2027', String(year + 1)),
    fechaCierre:   p.fechaCierre.replace('2026', String(year)).replace('2027', String(year + 1)),
  }));
  // Actividades, progreso, modificaciones y solicitudes: completamente vacíos.
  // Se importarán desde Ceplan en enero del año correspondiente.
  return { activities: [], progress: [], modifs: [], periodos, solicitudes: [] };
}

function buildSeedPeriodos() {
  // Plantilla estándar para 2026: cada mes apertura día 1 del mes siguiente a las 08:00 y cierra día 15 a las 18:00
  const periodos = [];
  for (let m = 1; m <= 12; m++) {
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? 2027 : 2026;
    const mm = String(nextMonth).padStart(2, '0');
    periodos.push({
      id: Math.random().toString(36).slice(2, 10),
      anio: 2026, mes: m,
      fechaApertura: `${nextYear}-${mm}-01`, horaApertura: '08:00',
      fechaCierre: `${nextYear}-${mm}-15`, horaCierre: '18:00',
      estadoForzado: 'auto',
    });
  }
  return periodos;
}

function buildSeedSolicitudes() {
  return [
    {
      id: Math.random().toString(36).slice(2, 10),
      tipo: 'ampliacion',
      anio: 2026, mes: 3,
      centroCosto: 'UGERDES',
      area: 'MAQUINARIAS PREVENCIÓN',
      actividadId: '',
      codigoAOI: 'AOI00108200213',
      solicitante: 'Carlos Mendoza',
      cargo: 'Coordinador UGERDES',
      motivo: 'Se requiere ampliar el plazo de registro del mes de marzo por 5 días adicionales debido a que la consolidación de las 65 intervenciones ejecutadas en las UBOs a nivel nacional aún se encuentra en proceso de validación con los coordinadores regionales.',
      diasSolicitados: 5,
      fechaSolicitud: '2026-04-16T10:30:00.000Z',
      estado: 'pendiente',
      fechaRespuesta: null,
      respuestaAdmin: '',
    },
    {
      id: Math.random().toString(36).slice(2, 10),
      tipo: 'reapertura',
      anio: 2026, mes: 2,
      centroCosto: 'UGEDEUS',
      area: 'UGEDEUS',
      actividadId: '',
      codigoAOI: 'AOI00108200204',
      solicitante: 'María Quispe',
      cargo: 'Especialista UGEDEUS',
      motivo: 'Solicito la reapertura del mes de febrero para corregir el monto de avance financiero registrado, ya que el SIAF reflejó un ajuste posterior al cierre.',
      diasSolicitados: 3,
      fechaSolicitud: '2026-04-10T09:15:00.000Z',
      estado: 'aprobada',
      fechaRespuesta: '2026-04-10T15:00:00.000Z',
      respuestaAdmin: 'Solicitud aprobada. Se otorgan 3 días adicionales para realizar la corrección del registro.',
    },
  ];
}

/* ============================================================
   MIS SOLICITUDES — Vista del responsable
============================================================ */
function MisSolicitudes({ solicitudes }) {
  const ordenadas = [...solicitudes].sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud));

  const tiposLabel = {
    reapertura: 'Reapertura',
    ampliacion: 'Ampliación de plazo',
    apertura_anticipada: 'Apertura anticipada',
  };

  const counts = {
    pendiente: solicitudes.filter(s => s.estado === 'pendiente').length,
    aprobada: solicitudes.filter(s => s.estado === 'aprobada').length,
    rechazada: solicitudes.filter(s => s.estado === 'rechazada').length,
  };

  return (
    <>
      <PageHeader title="Mis solicitudes" subtitle="Historial de solicitudes enviadas" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4" style={{ borderLeft: '4px solid #C9A350' }}>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>Pendientes</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 500, color: '#9C7A2B' }}>
            {counts.pendiente}
          </div>
        </Card>
        <Card className="p-4" style={{ borderLeft: '4px solid #2D7A4E' }}>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>Aprobadas</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 500, color: '#2D7A4E' }}>
            {counts.aprobada}
          </div>
        </Card>
        <Card className="p-4" style={{ borderLeft: '4px solid #B33B3B' }}>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>Rechazadas</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 500, color: '#B33B3B' }}>
            {counts.rechazada}
          </div>
        </Card>
      </div>

      {ordenadas.length === 0 ? null : (
        <div className="space-y-4">
          {ordenadas.map(s => {
            const badge =
              s.estado === 'pendiente' ? { bg: '#FBF1D9', color: '#9C7A2B', icon: Clock, label: 'Pendiente' } :
              s.estado === 'aprobada' ? { bg: '#D8EBD3', color: '#2D7A4E', icon: Check, label: 'Aprobada' } :
              { bg: '#F5D5D5', color: '#B33B3B', icon: XCircle, label: 'Rechazada' };
            const Icon = badge.icon;
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#9C7A2B' }}>
                      {tiposLabel[s.tipo] || s.tipo}
                    </div>
                    <div className="text-base font-semibold" style={{ color: '#1E2A3A' }}>
                      Periodo: {MESES[s.mes - 1]} {s.anio}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#7A6F5C' }}>
                      Enviada el {s.fechaSolicitud.slice(0, 10)} · {s.area} · {s.codigoAOI}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold"
                    style={{ background: badge.bg, color: badge.color }}>
                    <Icon size={11} /> {badge.label}
                  </span>
                </div>
                <div className="mb-3 pb-3 border-b" style={{ borderColor: '#E5DDD0' }}>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>Motivo</div>
                  <div className="text-sm leading-relaxed" style={{ color: '#1E2A3A' }}>{s.motivo}</div>
                  {(s.tipo === 'ampliacion' || s.tipo === 'reapertura') && (
                    <div className="text-xs mt-2" style={{ color: '#7A6F5C' }}>
                      Días solicitados: <strong>{s.diasSolicitados}</strong>
                    </div>
                  )}
                </div>
                {s.estado !== 'pendiente' && (
                  <div>
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#7A6F5C' }}>
                      Respuesta del administrador ({s.fechaRespuesta?.slice(0, 10)})
                    </div>
                    <div className="text-sm p-3 rounded-md leading-relaxed"
                      style={{ background: s.estado === 'aprobada' ? '#D8EBD3' : '#F5D5D5', color: '#1E2A3A' }}>
                      {s.respuestaAdmin || '(Sin mensaje)'}
                    </div>
                  </div>
                )}
                {s.estado === 'pendiente' && (
                  <div className="text-xs italic flex items-center gap-2" style={{ color: '#9C7A2B' }}>
                    <Clock size={12} /> Tu solicitud está en revisión por el administrador.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ============================================================
   GESTIÓN DE USUARIOS — Solo administrador
============================================================ */
function GestionUsuarios({ usuarios, saveUsuarios }) {
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);

  function newUser() {
    setIsNew(true);
    setEditing({
      id: uid(),
      usuario: '',
      password: '',
      nombre: '',
      rol: 'responsable_cc',
      centroCosto: CENTROS_COSTO[0].nombre,
    });
  }

  function editUser(u) {
    setEditing(JSON.parse(JSON.stringify(u)));
    setIsNew(false);
  }

  async function handleSave() {
    if (!editing.usuario || !editing.password || !editing.nombre) {
      alert('Usuario, contraseña y nombre son obligatorios');
      return;
    }
    // Validar usuario único
    const otro = usuarios.find(u => u.usuario === editing.usuario && u.id !== editing.id);
    if (otro) {
      alert('El nombre de usuario ya está en uso');
      return;
    }
    if (editing.rol !== 'responsable_cc') {
      editing.centroCosto = null;
    }
    const exists = usuarios.find(u => u.id === editing.id);
    const next = exists ? usuarios.map(u => u.id === editing.id ? editing : u) : [...usuarios, editing];
    await saveUsuarios(next);
    setEditing(null);
  }

  async function handleDelete(id) {
    const u = usuarios.find(x => x.id === id);
    if (u?.rol === 'admin' && usuarios.filter(x => x.rol === 'admin').length === 1) {
      alert('No puedes eliminar al único administrador');
      return;
    }
    if (!confirm('¿Eliminar este usuario?')) return;
    await saveUsuarios(usuarios.filter(u => u.id !== id));
  }

  const roleLabel = {
    admin: 'Administrador',
    responsable_cc: 'Responsable CC',
    lector: 'Solo lectura',
  };
  const roleBadge = {
    admin: { bg: '#FBF1D9', color: '#9C7A2B' },
    responsable_cc: { bg: '#D8EBD3', color: '#2D7A4E' },
    lector: { bg: '#E0E5EC', color: '#5C6B7F' },
  };

  return (
    <>
      <PageHeader title="Gestión de usuarios" subtitle="Cuentas y permisos del sistema"
        action={
          <button onClick={newUser}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors"
            style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
            <Plus size={16} /> Nuevo usuario
          </button>
        } />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPI icon={Shield} label="Administradores" value={usuarios.filter(u => u.rol === 'admin').length} hint="Acceso total" />
        <KPI icon={User} label="Responsables CC" value={usuarios.filter(u => u.rol === 'responsable_cc').length} hint="Por centro de costo" />
        <KPI icon={Eye} label="Solo lectura" value={usuarios.filter(u => u.rol === 'lector').length} hint="Directivos / auditores" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: '#E5DDD0' }}>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Usuario</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Nombre</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Rol</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Centro de Costo</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider" style={{ color: '#7A6F5C' }}>Contraseña</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const badge = roleBadge[u.rol] || roleBadge.lector;
                return (
                  <tr key={u.id} className="border-b last:border-b-0 hover:bg-stone-50" style={{ borderColor: '#E5DDD0' }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1E2A3A' }}>{u.usuario}</td>
                    <td className="px-4 py-3" style={{ color: '#1E2A3A' }}>{u.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded font-semibold"
                        style={{ background: badge.bg, color: badge.color }}>
                        {roleLabel[u.rol]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: u.centroCosto ? '#1E2A3A' : '#9C9080' }}>
                      {u.centroCosto || '— (todos)'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#7A6F5C' }}>
                      ••••••••
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => editUser(u)} className="p-1.5 rounded hover:bg-stone-200 mr-1" title="Editar">
                        <Edit3 size={14} style={{ color: '#1E2A3A' }} />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded hover:bg-red-50" title="Eliminar">
                        <Trash2 size={14} style={{ color: '#B33B3B' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <UsuarioForm
          usuario={editing}
          setUsuario={setEditing}
          isNew={isNew}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function UsuarioForm({ usuario, setUsuario, isNew, onSave, onClose }) {
  const [showPwd, setShowPwd] = useState(false);
  function update(field, value) { setUsuario({ ...usuario, [field]: value }); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,58,0.6)' }}>
      <div className="rounded-lg max-w-2xl w-full" style={{ background: '#FAF7F0' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5DDD0' }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 500, color: '#1E2A3A' }}>
            {isNew ? 'Nuevo usuario' : 'Editar usuario'}
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-200"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="Nombre completo" full>
            <input type="text" value={usuario.nombre} onChange={(e) => update('nombre', e.target.value)}
              className={inputCls} placeholder="Ej. Juan Pérez Salazar" />
          </Field>
          <Field label="Usuario (login)">
            <input type="text" value={usuario.usuario} onChange={(e) => update('usuario', e.target.value.toLowerCase().replace(/\s/g, ''))}
              className={inputCls} placeholder="ej. jperez" />
          </Field>
          <Field label="Contraseña">
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={usuario.password}
                onChange={(e) => update('password', e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-md border text-sm bg-white" style={{ borderColor: '#E5DDD0' }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPwd ? <EyeOff size={14} style={{ color: '#7A6F5C' }} /> : <Eye size={14} style={{ color: '#7A6F5C' }} />}
              </button>
            </div>
          </Field>
          <Field label="Rol">
            <select value={usuario.rol} onChange={(e) => update('rol', e.target.value)} className={inputCls}>
              <option value="admin">Administrador (acceso total)</option>
              <option value="responsable_cc">Responsable de Centro de Costo</option>
              <option value="lector">Solo lectura (directivos)</option>
            </select>
          </Field>
          {usuario.rol === 'responsable_cc' && (
            <Field label="Centro de Costo asignado">
              <select value={usuario.centroCosto || ''} onChange={(e) => update('centroCosto', e.target.value)} className={inputCls}>
                {CENTROS_COSTO.map(cc => <option key={cc.codigo} value={cc.nombre}>{cc.nombre}</option>)}
              </select>
            </Field>
          )}
        </div>

        <div className="px-6 pb-4">
          <div className="p-3 rounded-md text-xs" style={{ background: '#F0E9D9', color: '#7A6F5C' }}>
            <strong style={{ color: '#9C7A2B' }}>Permisos según rol:</strong>
            <ul className="mt-1 ml-4 list-disc space-y-0.5">
              <li><strong>Administrador:</strong> ve todo, edita todo, gestiona periodos, aprueba solicitudes y administra usuarios.</li>
              <li><strong>Responsable CC:</strong> ve y edita solo su Centro de Costo. Puede enviar solicitudes de apertura.</li>
              <li><strong>Solo lectura:</strong> ve todo el programa pero no puede modificar nada (uso directivo).</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: '#E5DDD0' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm" style={{ color: '#1E2A3A' }}>Cancelar</button>
          <button onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
            style={{ background: '#1E2A3A', color: '#F5F1E8' }}>
            <Save size={14} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FALLBACK localStorage (para entornos sin window.storage)
   Permite ejecutar el sistema en testing o entornos sin el
   storage de artefactos de Claude, usando localStorage del navegador.
============================================================ */
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const v = localStorage.getItem(key);
        return v !== null ? { key, value: v, shared: false } : null;
      } catch { return null; }
    },
    set: async (key, value) => {
      try {
        const v = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, v);
        return { key, value: v, shared: false };
      } catch { return null; }
    },
    delete: async (key) => {
      try { localStorage.removeItem(key); return { key, deleted: true, shared: false }; }
      catch { return null; }
    },
    list: async (prefix = '') => {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        return { keys, prefix, shared: false };
      } catch { return { keys: [] }; }
    },
  };
}
