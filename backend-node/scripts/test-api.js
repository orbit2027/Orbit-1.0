/**
 * Smoke test end-to-end contra el backend Node.js (Express + Mongoose).
 * Cubre: salud, registro, login, perfil, tareas, mapa mental,
 * estadisticas, proyectos y administracion.
 *
 * Uso: node scripts/test-api.js [URL_BASE]
 */
const BASE = process.argv[2] || 'http://localhost:4000/api';

let aprobadas = 0;
let fallidas = 0;
const errores = [];

function comprobar(nombre, condicion, detalle) {
    if (condicion) {
        aprobadas++;
        console.log(`  OK  ${nombre}`);
    } else {
        fallidas++;
        errores.push(`${nombre}: ${detalle || 'condicion falsa'}`);
        console.log(`FALLO  ${nombre}  ->  ${detalle || ''}`);
    }
}

async function peticion(ruta, opciones = {}) {
    const resp = await fetch(BASE + ruta, {
        ...opciones,
        headers: {
            'Content-Type': 'application/json',
            ...(opciones.headers || {}),
        },
    });
    let datos = null;
    try { datos = await resp.json(); } catch (_) { /* sin cuerpo */ }
    return { resp, datos };
}

async function run() {
    console.log(`Iniciando smoke test contra ${BASE}`);

    // ── Salud ──
    const salud = await peticion('/salud/');
    comprobar('GET /salud/ responde 200', salud.resp.status === 200, JSON.stringify(salud.datos));

    // ── Autenticacion ──
    const sufijo = Date.now();
    const correo = `smoke_node_${sufijo}@orbit.test`;

    // Acceso sin token -> 403 not_authenticated
    const sinToken = await peticion('/tareas/');
    comprobar(
        'GET /tareas/ sin token -> 403 not_authenticated',
        sinToken.resp.status === 403 && sinToken.datos && sinToken.datos.code === 'not_authenticated',
        JSON.stringify(sinToken.datos)
    );

    // Acceso con token invalido -> 401
    const tokenInvalido = await peticion('/tareas/', { headers: { Authorization: 'Bearer token.falso.xxxx' } });
    comprobar(
        'GET /tareas/ con token invalido -> 401',
        tokenInvalido.resp.status === 401,
        JSON.stringify(tokenInvalido.datos)
    );

    // Registro con contrasena debil -> 400
    const regDebil = await peticion('/usuarios/registro/', {
        method: 'POST',
        body: JSON.stringify({ nombre_completo: 'Smoke', correo, contrasena: 'hola', captcha_token: 'test-token' }),
    });
    comprobar('Registro con contrasena debil -> 400', regDebil.resp.status === 400, JSON.stringify(regDebil.datos));

    // Registro valido
    const registro = await peticion('/usuarios/registro/', {
        method: 'POST',
        body: JSON.stringify({ nombre_completo: 'Smoke Test', correo, contrasena: 'Clave1234', captcha_token: 'test-token' }),
    });
    comprobar('Registro valido -> 201 con tokens', registro.resp.status === 201 && !!registro.datos.tokens?.access, JSON.stringify(registro.datos));
    let tokenAcceso = registro.datos.tokens.access;
    const usuarioId = registro.datos.usuario.id;

    // Registro duplicado -> 400
    const regDup = await peticion('/usuarios/registro/', {
        method: 'POST',
        body: JSON.stringify({ nombre_completo: 'Smoke Test', correo, contrasena: 'Clave1234', captcha_token: 'test-token' }),
    });
    comprobar('Registro duplicado -> 400', regDup.resp.status === 400, JSON.stringify(regDup.datos));

    // Login correcto
    const login = await peticion('/usuarios/login/', {
        method: 'POST',
        body: JSON.stringify({ correo, contrasena: 'Clave1234', captcha_token: 'test-token' }),
    });
    comprobar('Login valido -> 200 con tokens', login.resp.status === 200 && !!login.datos.tokens?.access, JSON.stringify(login.datos));
    tokenAcceso = login.datos.tokens.access;

    // Login incorrecto -> 401
    const loginMal = await peticion('/usuarios/login/', {
        method: 'POST',
        body: JSON.stringify({ correo, contrasena: 'Incorrecta1', captcha_token: 'test-token' }),
    });
    comprobar('Login con contrasena mala -> 401', loginMal.resp.status === 401, JSON.stringify(loginMal.datos));

    const auth = { Authorization: `Bearer ${tokenAcceso}` };
    const corsJson = { 'Content-Type': 'application/json' };

    // ── Perfil ──
    const perfil = await peticion('/usuarios/perfil/', { headers: auth });
    comprobar(
        'GET /usuarios/perfil/ -> 200 con id y rol',
        perfil.resp.status === 200 && perfil.datos.id && perfil.datos.rol === 'usuario',
        JSON.stringify(perfil.datos)
    );

    const editar = await peticion('/usuarios/editar/', {
        method: 'PUT',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ nombre_completo: 'Smoke Test Editado' }),
    });
    comprobar('PUT /usuarios/editar/ -> 200', editar.resp.status === 200 && editar.datos.usuario.nombre_completo === 'Smoke Test Editado', JSON.stringify(editar.datos));

    // ── Tareas ──
    const crearTarea = await peticion('/tareas/', {
        method: 'POST',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ titulo: 'Tarea smoke', descripcion: 'desc', etiqueta: 'Trabajo', color_etiqueta: '#00E5FF' }),
    });
    comprobar('POST /tareas/ -> 201', crearTarea.resp.status === 201 && crearTarea.datos.id, JSON.stringify(crearTarea.datos));
    const tareaId = crearTarea.datos.id;
    const tareaProyecto = crearTarea.datos.proyecto;

    const listarTareas = await peticion('/tareas/', { headers: auth });
    comprobar('GET /tareas/ -> 200 con array', listarTareas.resp.status === 200 && Array.isArray(listarTareas.datos) && listarTareas.datos.length >= 1, JSON.stringify(listarTareas.datos));

    const moverTarea = await peticion(`/tareas/${tareaId}`, {
        method: 'PATCH',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ estado: 'en_progreso' }),
    });
    comprobar('PATCH /tareas/:id -> 200 con estado en_progreso', moverTarea.resp.status === 200 && moverTarea.datos.estado === 'en_progreso', JSON.stringify(moverTarea.datos));

    // ── Mapa mental ──
    const mapa = await peticion('/mapa-mental/', { headers: auth });
    comprobar('GET /mapa-mental/ -> 200 con nodos y conexiones', mapa.resp.status === 200 && Array.isArray(mapa.datos.nodos) && Array.isArray(mapa.datos.conexiones), JSON.stringify(mapa.datos));

    const crearNodo = await peticion('/mapa-mental/nodos/', {
        method: 'POST',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ texto: 'Nodo smoke', color: '#00E5FF', posicion_x: 10, posicion_y: 20 }),
    });
    comprobar('POST /mapa-mental/nodos/ -> 201', crearNodo.resp.status === 201 && crearNodo.datos.id, JSON.stringify(crearNodo.datos));
    const nodoId = crearNodo.datos.id;

    const crearNodo2 = await peticion('/mapa-mental/nodos/', {
        method: 'POST',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ texto: 'Nodo smoke 2' }),
    });
    const nodoId2 = crearNodo2.datos.id;

    const autoConexion = await peticion('/mapa-mental/conexiones/', {
        method: 'POST',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ nodo_origen: nodoId, nodo_destino: nodoId }),
    });
    comprobar('Conexion consigo mismo -> 400', autoConexion.resp.status === 400, JSON.stringify(autoConexion.datos));

    const crearConexion = await peticion('/mapa-mental/conexiones/', {
        method: 'POST',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ nodo_origen: nodoId, nodo_destino: nodoId2 }),
    });
    comprobar('POST /mapa-mental/conexiones/ -> 201', crearConexion.resp.status === 201 && crearConexion.datos.id, JSON.stringify(crearConexion.datos));
    const conexionId = crearConexion.datos.id;

    // RF-MAP-06: convertir nodo en tarea (no debe duplicar)
    const convertir = await peticion(`/mapa-mental/nodos/${nodoId}/convertir-tarea/`, {
        method: 'POST',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ descripcion: 'Desde nodo', etiqueta: 'Personal', color_etiqueta: '#A78BFA' }),
    });
    comprobar('POST convertir-tarea/ -> 201 con tarea_id', convertir.resp.status === 201 && convertir.datos.tarea_id, JSON.stringify(convertir.datos));

    const convertirDup = await peticion(`/mapa-mental/nodos/${nodoId}/convertir-tarea/`, {
        method: 'POST',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({}),
    });
    comprobar('Convertir nodo ya convertido -> 400', convertirDup.resp.status === 400, JSON.stringify(convertirDup.datos));

    const eliminarConexion = await peticion(`/mapa-mental/conexiones/${conexionId}`, {
        method: 'DELETE',
        headers: auth,
    });
    comprobar('DELETE /mapa-mental/conexiones/:id -> 200', eliminarConexion.resp.status === 200, JSON.stringify(eliminarConexion.datos));

    const editarNodo = await peticion(`/mapa-mental/nodos/${nodoId2}`, {
        method: 'PATCH',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ texto: 'Nodo smoke 2 editado' }),
    });
    comprobar('PATCH /mapa-mental/nodos/:id -> 200', editarNodo.resp.status === 200 && editarNodo.datos.texto === 'Nodo smoke 2 editado', JSON.stringify(editarNodo.datos));

    // ── Estadisticas ──
    const stats = await peticion('/estadisticas/', { headers: auth });
    comprobar(
        'GET /estadisticas/ -> 200 con total y semanal',
        stats.resp.status === 200 && typeof stats.datos.total === 'number' && Array.isArray(stats.datos.semanal) && stats.datos.semanal.length === 4,
        JSON.stringify(stats.datos)
    );

    // ── Proyectos ──
    const crearProyecto = await peticion('/proyectos/', {
        method: 'POST',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ nombre: 'Proyecto smoke', descripcion: 'proyecto de prueba', color: '#00C48C' }),
    });
    comprobar('POST /proyectos/ -> 201', crearProyecto.resp.status === 201 && crearProyecto.datos.id, JSON.stringify(crearProyecto.datos));
    const proyectoId = crearProyecto.datos.id;

    // Tarea asociada a proyecto
    const tareaConProyecto = await peticion('/tareas/', {
        method: 'POST',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ titulo: 'Tarea de proyecto', proyecto: proyectoId, estado: 'completado' }),
    });
    comprobar('POST /tareas/ con proyecto -> 201', tareaConProyecto.resp.status === 201 && tareaConProyecto.datos.proyecto === proyectoId, JSON.stringify(tareaConProyecto.datos));

    const listaProyectos = await peticion('/proyectos/', { headers: auth });
    const proyectoConMetricas = listaProyectos.datos.find(p => p.id === proyectoId);
    comprobar(
        'GET /proyectos/ con metricas (tareas_totales)',
        listaProyectos.resp.status === 200 && proyectoConMetricas && proyectoConMetricas.tareas_totales >= 1,
        JSON.stringify(listaProyectos.datos)
    );

    const detalleProyecto = await peticion(`/proyectos/${proyectoId}`, { headers: auth });
    comprobar(
        'GET /proyectos/:id -> 200 con lista de tareas',
        detalleProyecto.resp.status === 200 && Array.isArray(detalleProyecto.datos.tareas) && detalleProyecto.datos.tareas.length >= 1,
        JSON.stringify(detalleProyecto.datos)
    );

    const archivar = await peticion(`/proyectos/${proyectoId}/archivar/`, {
        method: 'PATCH',
        headers: auth,
    });
    comprobar('PATCH /proyectos/:id/archivar/ -> 200 archivado', archivar.resp.status === 200 && archivar.datos.estado === 'archivado', JSON.stringify(archivar.datos));

    // Acceso no-admin a /proyectos/admin/todos/ -> 403
    const adminTodosNoAdmin = await peticion('/proyectos/admin/todos/', { headers: auth });
    comprobar('GET /proyectos/admin/todos/ como usuario -> 403', adminTodosNoAdmin.resp.status === 403, JSON.stringify(adminTodosNoAdmin.datos));

    // ── Administracion (login admin) ──
    const loginAdmin = await peticion('/usuarios/login/', {
        method: 'POST',
        headers: corsJson,
        body: JSON.stringify({ correo: 'admin@orbit.local', contrasena: 'Admin1234', captcha_token: 'test-token' }),
    });
    comprobar('Login admin -> 200', loginAdmin.resp.status === 200 && loginAdmin.datos.usuario.rol === 'administrador', JSON.stringify(loginAdmin.datos));
    const tokenAdmin = loginAdmin.datos.tokens.access;
    const authAdmin = { Authorization: `Bearer ${tokenAdmin}` };

    const statsAdmin = await peticion('/administracion/estadisticas/', { headers: authAdmin });
    comprobar(
        'GET /administracion/estadisticas/ -> 200 con crecimiento_mensual',
        statsAdmin.resp.status === 200 && Array.isArray(statsAdmin.datos.crecimiento_mensual) && statsAdmin.datos.crecimiento_mensual.length === 6,
        JSON.stringify(statsAdmin.datos)
    );

    const listarUsuarios = await peticion('/administracion/usuarios/', { headers: authAdmin });
    comprobar('GET /administracion/usuarios/ -> 200 con array', listarUsuarios.resp.status === 200 && Array.isArray(listarUsuarios.datos), JSON.stringify(listarUsuarios.datos));

    const adminTodos = await peticion('/proyectos/admin/todos/', { headers: authAdmin });
    comprobar('GET /proyectos/admin/todos/ como admin -> 200', adminTodos.resp.status === 200 && Array.isArray(adminTodos.datos), JSON.stringify(adminTodos.datos));

    // ── Limpieza ──
    const eliminarNodo = await peticion(`/mapa-mental/nodos/${nodoId2}`, { method: 'DELETE', headers: auth });
    comprobar('DELETE /mapa-mental/nodos/:id -> 200', eliminarNodo.resp.status === 200, JSON.stringify(eliminarNodo.datos));

    const eliminarTarea = await peticion(`/tareas/${tareaId}`, { method: 'DELETE', headers: auth });
    comprobar('DELETE /tareas/:id -> 200', eliminarTarea.resp.status === 200, JSON.stringify(eliminarTarea.datos));

    const eliminarProyecto = await peticion(`/proyectos/${proyectoId}`, { method: 'DELETE', headers: auth });
    comprobar('DELETE /proyectos/:id -> 200', eliminarProyecto.resp.status === 200, JSON.stringify(eliminarProyecto.datos));

    // Eliminar cuenta (tiene tareas/nodos restantes)
    const eliminarCuenta = await peticion('/usuarios/eliminar/', {
        method: 'DELETE',
        headers: { ...auth, ...corsJson },
        body: JSON.stringify({ contrasena: 'Clave1234', captcha_token: 'test-token' }),
    });
    comprobar('DELETE /usuarios/eliminar/ -> 200', eliminarCuenta.resp.status === 200, JSON.stringify(eliminarCuenta.datos));

    console.log(`\nResumen: ${aprobadas} aprobadas, ${fallidas} fallidas`);
    if (errores.length > 0) {
        console.log('\nDetalle de fallos:');
        errores.forEach(e => console.log(`  - ${e}`));
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Error fatal en la prueba:', err);
    process.exit(1);
});