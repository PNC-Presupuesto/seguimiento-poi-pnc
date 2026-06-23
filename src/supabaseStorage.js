import { supabase } from './supabaseClient.js'

async function cargarTabla(tabla, filtroAnio = null) {
  let query = supabase.from(tabla).select('*')
  if (filtroAnio && !['usuarios','notificaciones','auditoria','reprogramaciones','areas_config','oei_lista','aei_lista'].includes(tabla)) {
    query = query.eq('anio', filtroAnio)
  }
  const { data, error } = await query
  if (error) { console.error(`Error cargando ${tabla}:`, error); return [] }
  return data || []
}

function mapActividad(row) {
  if (!row) return null
  return {
    id: row.id, anio: row.anio, centroCosto: row.centro_costo, area: row.area,
    codigoRegistro: row.codigo_registro, codigoAOI: row.codigo_aoi, nombre: row.nombre,
    unidadMedida: row.unidad_medida, responsable: row.responsable, oei: row.oei, aei: row.aei,
    activo: row.activo, piaBloqueado: row.pia_bloqueado,
    metaAnualFisica: Number(row.meta_anual_fisica) || 0,
    metaAnualFisicaPIM: Number(row.meta_anual_fisica_pim) || 0,
    presupuestoAnual: Number(row.presupuesto_anual) || 0,
    presupuestoAnualPIA: Number(row.presupuesto_anual_pia) || 0,
    genericas: row.genericas || {},
    fisicaMensual: row.fisica_mensual || { pia: Array(12).fill(0), pim: Array(12).fill(0) },
    programacion: row.programacion || [],
  }
}

function mapProgress(row) {
  if (!row) return null
  return {
    id: row.id, actividadId: row.actividad_id, anio: row.anio, mes: row.mes,
    avanceFisico: Number(row.avance_fisico) || 0, avanceFinanciero: Number(row.avance_financiero) || 0,
    logros: row.logros || '', limitaciones: row.limitaciones || '',
    medidas: row.medidas || '', modificaciones: row.modificaciones || '',
    fechaRegistro: row.fecha_registro,
  }
}

function mapModif(row) {
  if (!row) return null
  return {
    id: row.id, fecha: row.fecha, anio: row.anio, mes: row.mes,
    centroCosto: row.centro_costo, area: row.area, codigoAOI: row.codigo_aoi,
    tipo: row.tipo, clasificadores: row.clasificadores || [],
    clasificador: row.clasificador, importe: Number(row.importe) || 0, concepto: row.concepto,
  }
}

function mapPeriodo(row) {
  if (!row) return null
  return {
    id: row.id, anio: row.anio, mes: row.mes,
    fechaApertura: row.fecha_apertura, horaApertura: row.hora_apertura,
    fechaCierre: row.fecha_cierre, horaCierre: row.hora_cierre,
    estadoForzado: row.estado_forzado,
  }
}

function mapSolicitud(row) {
  if (!row) return null
  return {
    id: row.id, tipo: row.tipo, anio: row.anio, mes: row.mes,
    centroCosto: row.centro_costo, area: row.area, actividadId: row.actividad_id,
    codigoAOI: row.codigo_aoi, solicitante: row.solicitante, cargo: row.cargo,
    motivo: row.motivo, diasSolicitados: row.dias_solicitados,
    fechaSolicitud: row.fecha_solicitud, estado: row.estado,
    fechaRespuesta: row.fecha_respuesta, respuestaAdmin: row.respuesta_admin,
  }
}

function mapReprog(row) {
  if (!row) return null
  return {
    id: row.id, centroCosto: row.centro_costo, area: row.area,
    mesesAfectados: row.meses_afectados || [], solicitante: row.solicitante,
    cargo: row.cargo, sustento: row.sustento, fechaSolicitud: row.fecha_solicitud,
    estado: row.estado, fechaApertura: row.fecha_apertura, horaApertura: row.hora_apertura,
    fechaCierre: row.fecha_cierre, horaCierre: row.hora_cierre,
    fechaRespuesta: row.fecha_respuesta, respuestaAdmin: row.respuesta_admin,
    programacionOriginal: row.programacion_original, programacionNueva: row.programacion_nueva,
    cierreAutomatico: row.cierre_automatico,
  }
}

function mapNotif(row) {
  if (!row) return null
  return {
    id: row.id, timestamp: row.timestamp, destinatario: row.destinatario,
    remitente: row.remitente, tipo: row.tipo, titulo: row.titulo,
    mensaje: row.mensaje, link: row.link, leida: row.leida,
  }
}

function mapAudit(row) {
  if (!row) return null
  return {
    id: row.id, timestamp: row.timestamp, usuario: row.usuario, nombre: row.nombre,
    rol: row.rol, centroCosto: row.centro_costo, accion: row.accion,
    detalle: row.detalle, contexto: row.contexto,
  }
}

export const storage = {
  async loadAll(year) {
    const [acts, progs, mods, pers, sols, reprogs, audit, notifs, areas, oeis, aeis, usrs] = await Promise.all([
      cargarTabla('actividades', year), cargarTabla('progress', year),
      cargarTabla('modifs', year), cargarTabla('periodos', year),
      cargarTabla('solicitudes', year), cargarTabla('reprogramaciones'),
      cargarTabla('auditoria'), cargarTabla('notificaciones'),
      cargarTabla('areas_config'), cargarTabla('oei_lista'),
      cargarTabla('aei_lista'), cargarTabla('usuarios'),
    ])
    return {
      activities: acts.map(mapActividad), progress: progs.map(mapProgress),
      modifs: mods.map(mapModif), periodos: pers.map(mapPeriodo),
      solicitudes: sols.map(mapSolicitud), reprogramaciones: reprogs.map(mapReprog),
      auditoria: audit.map(mapAudit), notificaciones: notifs.map(mapNotif),
      areasConfig: areas, oeiLista: oeis, aeiLista: aeis, usuarios: usrs,
    }
  },

  async saveActivities(activities, year) {
    await supabase.from('actividades').delete().eq('anio', year)
    const rows = activities.map(a => ({
      anio: year, centro_costo: a.centroCosto, area: a.area,
      codigo_registro: a.codigoRegistro, codigo_aoi: a.codigoAOI, nombre: a.nombre,
      unidad_medida: a.unidadMedida, responsable: a.responsable, oei: a.oei, aei: a.aei,
      activo: a.activo, pia_bloqueado: a.piaBloqueado,
      meta_anual_fisica: a.metaAnualFisica, meta_anual_fisica_pim: a.metaAnualFisicaPIM,
      presupuesto_anual: a.presupuestoAnual, presupuesto_anual_pia: a.presupuestoAnualPIA,
      genericas: a.genericas, fisica_mensual: a.fisicaMensual, programacion: a.programacion,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('actividades').insert(rows)
      if (error) console.error('Error guardando actividades:', error)
    }
  },

  async saveProgress(progress, year) {
    await supabase.from('progress').delete().eq('anio', year)
    const rows = progress.map(p => ({
      actividad_id: p.actividadId, anio: year, mes: p.mes,
      avance_fisico: p.avanceFisico, avance_financiero: p.avanceFinanciero,
      logros: p.logros, limitaciones: p.limitaciones,
      medidas: p.medidas, modificaciones: p.modificaciones,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('progress').insert(rows)
      if (error) console.error('Error guardando progress:', error)
    }
  },

  async saveModifs(modifs, year) {
    await supabase.from('modifs').delete().eq('anio', year)
    const rows = modifs.map(m => ({
      fecha: m.fecha, anio: year, mes: m.mes, centro_costo: m.centroCosto,
      area: m.area, codigo_aoi: m.codigoAOI, tipo: m.tipo,
      clasificadores: m.clasificadores, clasificador: m.clasificador,
      importe: m.importe, concepto: m.concepto,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('modifs').insert(rows)
      if (error) console.error('Error guardando modifs:', error)
    }
  },

  async savePeriodos(periodos, year) {
    await supabase.from('periodos').delete().eq('anio', year)
    const rows = periodos.map(p => ({
      anio: year, mes: p.mes, fecha_apertura: p.fechaApertura,
      hora_apertura: p.horaApertura, fecha_cierre: p.fechaCierre,
      hora_cierre: p.horaCierre, estado_forzado: p.estadoForzado,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('periodos').insert(rows)
      if (error) console.error('Error guardando periodos:', error)
    }
  },

  async saveSolicitudes(solicitudes, year) {
    await supabase.from('solicitudes').delete().eq('anio', year)
    const rows = solicitudes.map(s => ({
      tipo: s.tipo, anio: year, mes: s.mes, centro_costo: s.centroCosto,
      area: s.area, actividad_id: s.actividadId, codigo_aoi: s.codigoAOI,
      solicitante: s.solicitante, cargo: s.cargo, motivo: s.motivo,
      dias_solicitados: s.diasSolicitados, fecha_solicitud: s.fechaSolicitud,
      estado: s.estado, fecha_respuesta: s.fechaRespuesta, respuesta_admin: s.respuestaAdmin,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('solicitudes').insert(rows)
      if (error) console.error('Error guardando solicitudes:', error)
    }
  },

  async saveReprogramaciones(reprogs) {
    await supabase.from('reprogramaciones').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const rows = reprogs.map(r => ({
      centro_costo: r.centroCosto, area: r.area, meses_afectados: r.mesesAfectados,
      solicitante: r.solicitante, cargo: r.cargo, sustento: r.sustento,
      fecha_solicitud: r.fechaSolicitud, estado: r.estado,
      fecha_apertura: r.fechaApertura, hora_apertura: r.horaApertura,
      fecha_cierre: r.fechaCierre, hora_cierre: r.horaCierre,
      fecha_respuesta: r.fechaRespuesta, respuesta_admin: r.respuestaAdmin,
      programacion_original: r.programacionOriginal, programacion_nueva: r.programacionNueva,
      cierre_automatico: r.cierreAutomatico,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('reprogramaciones').insert(rows)
      if (error) console.error('Error guardando reprogs:', error)
    }
  },

  async saveAuditoria(audit) {
    await supabase.from('auditoria').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const rows = audit.map(a => ({
      timestamp: a.timestamp, usuario: a.usuario, nombre: a.nombre, rol: a.rol,
      centro_costo: a.centroCosto, accion: a.accion, detalle: a.detalle, contexto: a.contexto,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('auditoria').insert(rows)
      if (error) console.error('Error guardando auditoría:', error)
    }
  },

  async saveNotificaciones(notifs) {
    await supabase.from('notificaciones').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const rows = notifs.map(n => ({
      timestamp: n.timestamp, destinatario: n.destinatario, remitente: n.remitente,
      tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje, link: n.link, leida: n.leida,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('notificaciones').insert(rows)
      if (error) console.error('Error guardando notifs:', error)
    }
  },

  async saveUsuarios(usrs) {
    await supabase.from('usuarios').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const rows = usrs.map(u => ({
      usuario: u.usuario, password: u.password, email: u.email, nombre: u.nombre,
      cargo: u.cargo, rol: u.rol, centro_costo: u.centroCosto, areas: u.areas,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('usuarios').insert(rows)
      if (error) console.error('Error guardando usuarios:', error)
    }
  },

  async saveAreasConfig(areasMap) {
    await supabase.from('areas_config').delete().eq('key', 'areas_por_cc')
    const { error } = await supabase.from('areas_config').insert({ key: 'areas_por_cc', value: areasMap })
    if (error) console.error('Error guardando áreas:', error)
  },

  async saveOeiLista(oeis) {
    await supabase.from('oei_lista').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const rows = oeis.map(o => ({ codigo: o.codigo, nombre: o.nombre }))
    if (rows.length > 0) {
      const { error } = await supabase.from('oei_lista').insert(rows)
      if (error) console.error('Error guardando OEI:', error)
    }
  },

  async saveAeiLista(aeis) {
    await supabase.from('aei_lista').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const rows = aeis.map(a => ({ codigo: a.codigo, oei: a.oei, nombre: a.nombre }))
    if (rows.length > 0) {
      const { error } = await supabase.from('aei_lista').insert(rows)
      if (error) console.error('Error guardando AEI:', error)
    }
  },

  subscribe(onChange) {
    const channel = supabase.channel('poi-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actividades' }, () => onChange('activities'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'progress' }, () => onChange('progress'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modifs' }, () => onChange('modifs'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'periodos' }, () => onChange('periodos'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => onChange('solicitudes'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reprogramaciones' }, () => onChange('reprogramaciones'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' }, () => onChange('notificaciones'))
      .subscribe()
    return channel
  },

  unsubscribe(channel) {
    if (channel) supabase.removeChannel(channel)
  }
}
