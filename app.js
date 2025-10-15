// ============================================
// APLICACIÓN COMPLETA - SISTEMA DE CONSUMO ELÉCTRICO
// Versión: Corregida y funcional
// ============================================

// Prevenir errores de puerto desconectado y otros errores de LiveServer
window.addEventListener('error', function(event) {
    if (event.message && (
        event.message.includes('disconnected port') || 
        event.message.includes('port object') ||
        event.message.includes('proxy.js') ||
        event.message.includes('backendManager')
    )) {
        event.preventDefault();
        event.stopPropagation();
        console.warn('Se detectó un error de LiveServer, pero fue manejado correctamente.');
        return false;
    }
});

// Capturar errores no manejados de promesas
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && (
        (event.reason.message && (
            event.reason.message.includes('disconnected port') || 
            event.reason.message.includes('port object') ||
            event.reason.message.includes('proxy.js') ||
            event.reason.message.includes('backendManager')
        )) || 
        (typeof event.reason === 'string' && (
            event.reason.includes('disconnected port') ||
            event.reason.includes('port object') ||
            event.reason.includes('proxy.js') ||
            event.reason.includes('backendManager')
        ))
    )) {
        event.preventDefault();
        console.warn('Se detectó un error de LiveServer en una promesa, pero fue manejado correctamente.');
        return false;
    }
});

const { useState, useEffect, useRef, useMemo } = React;

// Inicializar Supabase con configuración completa
const supabaseOptions = {
    schema: 'public',
    headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
};

const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, supabaseOptions);

// Función para verificar si hay errores en las respuestas de Supabase
const handleSupabaseError = (error) => {
    if (error) {
        console.error('Error de Supabase:', error);
        if (error.message && error.message.includes('apikey')) {
            console.error('Problema con la API key. Verifica tu configuración.');
        }
    }
    return error;
};

// ============================================
// COMPONENTE: Icon
// ============================================
const Icon = ({ name, size = 24, className = '' }) => {
    const iconRef = useRef(null);
    useEffect(() => {
        if (iconRef.current && window.lucide) lucide.createIcons();
    }, [name]);
    
    return React.createElement('i', {
        ref: iconRef,
        'data-lucide': name,
        className,
        style: { width: `${size}px`, height: `${size}px`, display: 'inline-block' }
    });
};

// ============================================
// COMPONENTE: ChartComponent
// ============================================
const ChartComponent = ({ type, data, options }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (chartRef.current) chartRef.current.destroy();
            chartRef.current = new Chart(ctx, { type, data, options });
        }
        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [type, data, options]);

    return React.createElement('canvas', { ref: canvasRef });
};

// ============================================
// COMPONENTE PRINCIPAL: App
// ============================================
const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [data, setData] = useState([]);
    const [importHistory, setImportHistory] = useState([]);
    const [currentImportId, setCurrentImportId] = useState(1);
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('upload');
    const [stats, setStats] = useState({ total: 0, periods: 0, rpus: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [tableFilters, setTableFilters] = useState({
        importeRange: [0, 100000],
        RPU: [], Periodo: [], Nombre: [], Dirección: [], Ciudad: [], Estado: [], RFC: []
    });
    const [filters, setFilters] = useState({
        montoRange: [0, 100000],
        estados: [], ciudades: [], rfcs: [], periodos: []
    });

    useEffect(() => { checkUser(); }, []);

    useEffect(() => {
        updateStats();
        if (data.length > 0) {
            const range = getMontoRange();
            setFilters(prev => ({ ...prev, montoRange: [range.min, range.max] }));
            setTableFilters(prev => ({ ...prev, importeRange: [range.min, range.max] }));
        }
    }, [data]);

    const checkUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                await loadData();
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Autenticación con Supabase usando el usuario creado
            const { data, error } = await supabase.auth.signInWithPassword({
                email: 'maurer.sergio@gmail.com',
                password: 'S3llB4t1c'
            });
            
            if (error) {
                console.error('Error de autenticación:', error);
                showNotification('Error de autenticación: ' + error.message, 'error');
                
                // Fallback a la autenticación local si hay error con Supabase
                if (loginForm.username === CONFIG.ADMIN_USERNAME && loginForm.password === CONFIG.ADMIN_PASSWORD) {
                    setUser({
                        id: 'admin-001',
                        email: 'admin@sistema.com',
                        user_metadata: { username: CONFIG.ADMIN_USERNAME, role: 'admin' }
                    });
                    
                    showNotification('¡Bienvenido, Administrador! (Modo local)', 'success');
                    await loadData();
                } else {
                    showNotification('Credenciales incorrectas', 'error');
                }
            } else {
                // Autenticación exitosa con Supabase
                setUser(data.user);
                showNotification('¡Bienvenido, ' + data.user.email + '!', 'success');
                await loadData();
            }
        } catch (error) {
            console.error('Error en login:', error);
            showNotification('Error: ' + (error.message || 'Problema de autenticación'), 'error');
            
            // Fallback a la autenticación local en caso de error
            if (loginForm.username === CONFIG.ADMIN_USERNAME && loginForm.password === CONFIG.ADMIN_PASSWORD) {
                setUser({
                    id: 'admin-001',
                    email: 'admin@sistema.com',
                    user_metadata: { username: CONFIG.ADMIN_USERNAME, role: 'admin' }
                });
                showNotification('¡Bienvenido, Administrador! (Modo local)', 'success');
                await loadData();
            } else {
                showNotification('Credenciales incorrectas', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        setData([]);
        setImportHistory([]);
        setLoginForm({ username: '', password: '' });
        showNotification('Sesión cerrada correctamente', 'success');
    };

    const loadData = async () => {
        try {
            console.log('Cargando datos de Supabase...');
            
            // Asegurar que los headers estén configurados correctamente
            supabase.headers = {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            };
            
            // Añadir headers explícitos para cada llamada
            const { data: records, error } = await supabase
                .from('consumption_records')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                handleSupabaseError(error);
                console.error('Error al cargar registros:', error);
                showNotification('Error al cargar datos. Intente nuevamente.', 'error');
                return;
            }
            
            if (records) {
                console.log(`Registros cargados: ${records.length}`);
                setData(records);
            } else {
                console.log('No se encontraron registros');
                setData([]);
            }

            const { data: history, error: historyError } = await supabase
                .from('import_history')
                .select('*')
                .order('created_at', { ascending: false });

            if (historyError) {
                handleSupabaseError(historyError);
                throw historyError;
            }

            if (history && history.length > 0) {
                console.log(`Historial de importaciones cargado: ${history.length}`);
                setImportHistory(history.map(h => ({
                    id: h.id,
                    date: new Date(h.created_at).toLocaleString('es-MX'),
                    fileName: h.file_name,
                    recordsAdded: h.records_added
                })));
                setCurrentImportId(Math.max(...history.map(h => h.id)) + 1);
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            showNotification('Error al cargar datos: ' + error.message, 'error');
        }
    };

    const updateStats = () => {
        const uniqueRPUs = new Set(data.map(row => row.rpu));
        const uniquePeriods = new Set(data.map(row => row.periodo));
        setStats({
            total: data.length,
            rpus: uniqueRPUs.size,
            periods: uniquePeriods.size
        });
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const getMontoRange = () => {
        if (data.length === 0) return { min: 0, max: 100000 };
        const montos = data.map(row => parseFloat(row.importe_total) || 0).filter(m => m > 0);
        if (montos.length === 0) return { min: 0, max: 100000 };
        return { min: 0, max: Math.ceil(Math.max(...montos)) };
    };

    const processExcelFile = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { cellDates: true, cellNF: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        let jsonData = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
            defval: '',
            raw: false
        });

        jsonData = jsonData.slice(18);
        if (jsonData.length === 0) throw new Error('El archivo no contiene datos');

        jsonData = jsonData.map(row => {
            const newRow = [...row];
            const fechaDesde = newRow[92] || '';
            const fechaHasta = newRow[93] || '';
            const fechaLimitePago = newRow[94] || '';
            let filteredRow = newRow.slice(0, 26);
            filteredRow.splice(3, 1);
            filteredRow.splice(2, 1);
            filteredRow.push(fechaDesde, fechaHasta, fechaLimitePago);
            return filteredRow;
        });

        const columns = [
            'RPU', 'Periodo', 'Nombre', 'Dirección', 'Ciudad', 'Estado', 'RFC',
            'Colonia', 'Calle 1', 'Calle 2', 'Base imponible calculada', 'Total DAP',
            'IVA calculado', 'Depósitos', 'Total calculado', 'Diferencia total',
            'Diferencia IVA', 'Importe total', 'Importe energía total', 'Importe IVA',
            'Importe DAP', 'Importe créditos a la factura', 'Diferencia más', 'Diferencia menos',
            'Fecha desde', 'Fecha hasta', 'Fecha límite de pago'
        ];

        return jsonData.slice(1).map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
                let value = row[idx] !== undefined ? row[idx] : '';
                
                if (col === 'Importe total' && value) {
                    value = parseFloat(String(value).replace(/[$,\s]/g, '')) || 0;
                }
                
                if (col === 'Periodo' && value) {
                    const periodoStr = String(value).replace(/\D/g, '');
                    if (periodoStr.length >= 6) {
                        value = periodoStr.substring(0, 4) + '-' + periodoStr.substring(4, 6);
                    }
                }
                
                obj[col] = value;
            });
            return obj;
        }).filter(row => row.RPU && row.Periodo);
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        setLoading(true);
        console.log(`Procesando archivo: ${file.name}`);
        
        try {
            const processedData = await processExcelFile(file);
            console.log(`Datos procesados: ${processedData.length} registros`);
            
            let addedCount = 0;
            let duplicateCount = 0;
            const recordsToInsert = [];

            for (const newRow of processedData) {
                try {
                    // Cambiamos .single() por .maybeSingle() para evitar errores cuando no hay resultados
                    const { data: existing, error } = await supabase
                        .from('consumption_records')
                        .select('id')
                        .eq('rpu', newRow.RPU)
                        .eq('periodo', newRow.Periodo);
                    
                    if (error) {
                        handleSupabaseError(error);
                        console.error(`Error verificando duplicados: ${error.message}`);
                        continue;
                    }

                    // Verificamos si hay registros existentes (ahora existing es un array)
                    if (!existing || existing.length === 0) {
                        recordsToInsert.push({
                            import_id: currentImportId,
                            rpu: newRow.RPU,
                            periodo: newRow.Periodo,
                            nombre: newRow.Nombre,
                            direccion: newRow.Dirección,
                            ciudad: newRow.Ciudad,
                            estado: newRow.Estado,
                            rfc: newRow.RFC,
                            colonia: newRow.Colonia,
                            calle_1: newRow['Calle 1'],
                            calle_2: newRow['Calle 2'],
                            importe_total: newRow['Importe total'],
                            fecha_desde: newRow['Fecha desde'],
                            fecha_hasta: newRow['Fecha hasta'],
                            fecha_limite_pago: newRow['Fecha límite de pago']
                        });
                        addedCount++;
                    } else {
                        duplicateCount++;
                    }
                } catch (rowError) {
                    console.error(`Error procesando fila: ${rowError.message}`);
                }
            }

            console.log(`Registros a insertar: ${recordsToInsert.length}`);
            
            if (recordsToInsert.length > 0) {
                // Obtenemos la sesión actual
                const { data: { session } } = await supabase.auth.getSession();
                
                // Creamos un cliente con la sesión autenticada
                const supabaseClient = window.supabase.createClient(
                    CONFIG.SUPABASE_URL,
                    CONFIG.SUPABASE_ANON_KEY,
                    {
                        global: {
                            headers: {
                                'Authorization': `Bearer ${session ? session.access_token : CONFIG.SUPABASE_ANON_KEY}`,
                                'apikey': CONFIG.SUPABASE_ANON_KEY
                            }
                        },
                        auth: {
                            persistSession: true
                        }
                    }
                );
                
                // Ahora insertamos con el cliente autenticado
                const { error: insertError } = await supabaseClient
                    .from('consumption_records')
                    .insert(recordsToInsert)
                    .select();

                if (insertError) {
                    handleSupabaseError(insertError);
                    throw insertError;
                }

                const { error: historyError } = await supabaseClient
                    .from('import_history')
                    .insert({
                        id: currentImportId,
                        file_name: file.name,
                        records_added: addedCount
                    })
                    .select();

                if (historyError) {
                    handleSupabaseError(historyError);
                    throw historyError;
                }

                await loadData();
            }

            showNotification(
                `Importación completada: ${addedCount} agregados, ${duplicateCount} duplicados`,
                'success'
            );
        } catch (error) {
            console.error('Error en la importación:', error);
            showNotification('Error: ' + error.message, 'error');
        } finally {
            setLoading(false);
            event.target.value = '';
        }
    };

    const deleteImport = async (importId) => {
        if (window.confirm(`¿Eliminar todos los registros de la importación #${importId}?`)) {
            setLoading(true);
            try {
                console.log(`Eliminando importación #${importId}`);
                
                // Obtenemos la sesión actual
                const { data: { session } } = await supabase.auth.getSession();
                
                // Creamos un cliente con la sesión autenticada
                const supabaseClient = window.supabase.createClient(
                    CONFIG.SUPABASE_URL,
                    CONFIG.SUPABASE_ANON_KEY,
                    {
                        global: {
                            headers: {
                                'Authorization': `Bearer ${session ? session.access_token : CONFIG.SUPABASE_ANON_KEY}`,
                                'apikey': CONFIG.SUPABASE_ANON_KEY
                            }
                        },
                        auth: {
                            persistSession: true
                        }
                    }
                );
                
                const { error: deleteRecordsError } = await supabaseClient
                    .from('consumption_records')
                    .delete()
                    .eq('import_id', importId);
                
                if (deleteRecordsError) {
                    handleSupabaseError(deleteRecordsError);
                    throw deleteRecordsError;
                }
                
                const { error: deleteHistoryError } = await supabaseClient
                    .from('import_history')
                    .delete()
                    .eq('id', importId);
                
                if (deleteHistoryError) {
                    handleSupabaseError(deleteHistoryError);
                    throw deleteHistoryError;
                }
                
                await loadData();
                showNotification('Importación eliminada correctamente', 'success');
            } catch (error) {
                console.error('Error eliminando importación:', error);
                showNotification('Error: ' + error.message, 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data.map(row => ({
            RPU: row.rpu,
            Periodo: row.periodo,
            Nombre: row.nombre,
            Dirección: row.direccion,
            Ciudad: row.ciudad,
            Estado: row.estado,
            RFC: row.rfc,
            'Importe total': row.importe_total,
            'Fecha desde': row.fecha_desde,
            'Fecha hasta': row.fecha_hasta,
            'Fecha límite pago': row.fecha_limite_pago
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Datos');
        XLSX.writeFile(wb, `consumo_electrico_${new Date().toISOString().split('T')[0]}.xlsx`);
        showNotification('Archivo exportado correctamente', 'success');
    };

    const getFilteredTableData = useMemo(() => {
        return data.filter(row => {
            const importe = parseFloat(row.importe_total) || 0;
            const matchImporte = importe >= tableFilters.importeRange[0] && importe <= tableFilters.importeRange[1];
            const matchRPU = tableFilters.RPU.length === 0 || tableFilters.RPU.includes(row.rpu);
            const matchPeriodo = tableFilters.Periodo.length === 0 || tableFilters.Periodo.includes(row.periodo);
            const matchNombre = tableFilters.Nombre.length === 0 || tableFilters.Nombre.includes(row.nombre);
            const matchCiudad = tableFilters.Ciudad.length === 0 || tableFilters.Ciudad.includes(row.ciudad);
            const matchEstado = tableFilters.Estado.length === 0 || tableFilters.Estado.includes(row.estado);
            const matchRFC = tableFilters.RFC.length === 0 || tableFilters.RFC.includes(row.rfc);
            
            return matchImporte && matchRPU && matchPeriodo && matchNombre && matchCiudad && matchEstado && matchRFC;
        });
    }, [data, tableFilters]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
        return getFilteredTableData.slice(startIndex, startIndex + CONFIG.ITEMS_PER_PAGE);
    }, [getFilteredTableData, currentPage]);

    const totalPages = Math.ceil(getFilteredTableData.length / CONFIG.ITEMS_PER_PAGE);

    // Valores únicos para filtros de checkboxes
    const uniqueRPU = useMemo(() => Array.from(new Set(data.map(r => r.rpu))).filter(Boolean).sort(), [data]);
    const uniquePeriodos = useMemo(() => Array.from(new Set(data.map(r => r.periodo))).filter(Boolean).sort(), [data]);
    const uniqueNombres = useMemo(() => Array.from(new Set(data.map(r => r.nombre))).filter(Boolean).sort(), [data]);

    // Helper para alternar valores en filtros de checkboxes
    const toggleFilter = (key, value) => {
        setTableFilters(prev => {
            const arr = prev[key] || [];
            const exists = arr.includes(value);
            const nextArr = exists ? arr.filter(v => v !== value) : [...arr, value];
            return { ...prev, [key]: nextArr };
        });
    };

    // Formateo robusto de fechas (muestra original si no es parseable)
    const formatDate = (value) => {
        if (!value) return '-';
        const d = new Date(value);
        return isNaN(d.getTime()) ? (typeof value === 'string' ? value : '-') : d.toLocaleDateString();
    };

    const prepareChartData = () => {
        const filtered = data.filter(row => {
            const importe = parseFloat(row.importe_total) || 0;
            return importe >= filters.montoRange[0] && importe <= filters.montoRange[1] &&
                (filters.estados.length === 0 || filters.estados.includes(row.estado)) &&
                (filters.ciudades.length === 0 || filters.ciudades.includes(row.ciudad)) &&
                (filters.periodos.length === 0 || filters.periodos.includes(row.periodo));
        });

        const byPeriod = {};
        filtered.forEach(row => {
            const periodo = row.periodo || 'Sin periodo';
            const importe = parseFloat(row.importe_total) || 0;
            byPeriod[periodo] = (byPeriod[periodo] || 0) + importe;
        });

        return {
            labels: Object.keys(byPeriod).sort(),
            values: Object.keys(byPeriod).sort().map(k => Math.round(byPeriod[k])),
            filteredCount: filtered.length
        };
    };

    // RENDER
    if (!user) {
        return React.createElement('div', {
            className: 'min-h-screen flex items-center justify-center p-6'
        }, 
            React.createElement('div', {
                className: 'glass-effect neo-shadow rounded-2xl p-8 w-full max-w-md'
            },
                React.createElement('div', { className: 'text-center mb-8' },
                    React.createElement('div', { className: 'inline-block p-4 rounded-xl mb-4 btn-primary' },
                        React.createElement(Icon, { name: 'lock', size: 48, className: 'text-white' })
                    ),
                    React.createElement('h1', { className: 'text-3xl font-bold text-gray-800 mb-2' }, 'Iniciar Sesión'),
                    React.createElement('p', { className: 'text-gray-600' }, 'Sistema de Gestión de Consumo Eléctrico')
                ),
                React.createElement('form', {
                    onSubmit: handleLogin,
                    className: 'space-y-4'
                },
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-bold text-gray-700 mb-2' }, 'Usuario'),
                        React.createElement('input', {
                            type: 'text',
                            value: loginForm.username,
                            onChange: (e) => setLoginForm({...loginForm, username: e.target.value}),
                            className: 'w-full px-4 py-3 border rounded-xl',
                            placeholder: 'admin_unico',
                            required: true
                        })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm font-bold text-gray-700 mb-2' }, 'Contraseña'),
                        React.createElement('input', {
                            type: 'password',
                            value: loginForm.password,
                            onChange: (e) => setLoginForm({...loginForm, password: e.target.value}),
                            className: 'w-full px-4 py-3 border rounded-xl',
                            placeholder: '••••••••',
                            required: true
                        })
                    ),
                    React.createElement('button', {
                        type: 'submit',
                        disabled: loading,
                        className: 'w-full btn-primary text-white py-3 rounded-xl font-bold disabled:opacity-50'
                    }, loading ? 'Iniciando...' : 'Ingresar')
                ),
                React.createElement('div', { className: 'mt-6 p-4 bg-blue-50 rounded-xl' },
                    React.createElement('p', { className: 'text-sm text-center' },
                        React.createElement('strong', null, 'Usuario:'), ' admin_unico / admin2025'
                    )
                )
            )
        );
    }

    return React.createElement('div', { className: 'min-h-screen p-6' },
        loading && React.createElement('div', {
            className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
        },
            React.createElement('div', { className: 'spinner' })
        ),
        
        React.createElement('div', { className: 'max-w-7xl mx-auto' },
            React.createElement('div', { className: 'glass-effect neo-shadow rounded-2xl p-6 mb-6' },
                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', { className: 'flex items-center gap-4' },
                        React.createElement('div', { className: 'p-3 rounded-xl btn-primary' },
                            React.createElement(Icon, { name: 'zap', size: 32, className: 'text-white' })
                        ),
                        React.createElement('div', null,
                            React.createElement('h1', { className: 'text-3xl font-bold text-gray-800' }, 'Sistema de Consumo Eléctrico'),
                            React.createElement('p', { className: 'text-gray-600 mt-1' }, 'Gestión inteligente de datos')
                        )
                    ),
                    React.createElement('div', { className: 'flex gap-3 items-center' },
                        React.createElement('div', { className: 'text-right mr-4' },
                            React.createElement('p', { className: 'text-sm font-bold' }, user.user_metadata?.username || 'Admin'),
                            React.createElement('p', { className: 'text-xs text-gray-600' }, user.user_metadata?.role || 'admin')
                        ),
                        React.createElement('button', {
                            onClick: handleLogout,
                            className: 'btn-secondary flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-medium'
                        },
                            React.createElement(Icon, { name: 'log-out', size: 18 }),
                            'Salir'
                        ),
                        React.createElement('button', {
                            onClick: exportToExcel,
                            disabled: data.length === 0,
                            className: 'btn-success flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-medium disabled:opacity-40'
                        },
                            React.createElement(Icon, { name: 'download', size: 18 }),
                            'Exportar'
                        )
                    )
                )
            ),

            notification && React.createElement('div', {
                className: `notification-enter mb-6 p-4 rounded-xl flex items-center gap-3 ${
                    notification.type === 'success' 
                        ? 'bg-green-50 border-l-4 border-green-500' 
                        : 'bg-red-50 border-l-4 border-red-500'
                }`
            },
                React.createElement(Icon, {
                    name: notification.type === 'success' ? 'check-circle' : 'alert-circle',
                    size: 20,
                    className: notification.type === 'success' ? 'text-green-600' : 'text-red-600'
                }),
                React.createElement('span', { className: 'font-medium' }, notification.message)
            ),

            React.createElement('div', { className: 'grid grid-cols-3 gap-6 mb-6' },
                React.createElement('div', { className: 'stat-card rounded-2xl p-6' },
                    React.createElement('div', { className: 'flex items-center justify-between' },
                        React.createElement('div', null,
                            React.createElement('p', { className: 'text-gray-600 text-sm font-medium mb-1' }, 'Total Registros'),
                            React.createElement('p', { className: 'text-4xl font-bold text-red-600' }, stats.total)
                        ),
                        React.createElement('div', { className: 'p-4 rounded-xl bg-red-50' },
                            React.createElement(Icon, { name: 'database', size: 28, className: 'text-red-600' })
                        )
                    )
                ),
                React.createElement('div', { className: 'stat-card rounded-2xl p-6' },
                    React.createElement('div', { className: 'flex items-center justify-between' },
                        React.createElement('div', null,
                            React.createElement('p', { className: 'text-gray-600 text-sm font-medium mb-1' }, 'RPUs Únicos'),
                            React.createElement('p', { className: 'text-4xl font-bold text-gray-700' }, stats.rpus)
                        ),
                        React.createElement('div', { className: 'p-4 rounded-xl bg-gray-100' },
                            React.createElement(Icon, { name: 'users', size: 28, className: 'text-gray-600' })
                        )
                    )
                ),
                React.createElement('div', { className: 'stat-card rounded-2xl p-6' },
                    React.createElement('div', { className: 'flex items-center justify-between' },
                        React.createElement('div', null,
                            React.createElement('p', { className: 'text-gray-600 text-sm font-medium mb-1' }, 'Periodos'),
                            React.createElement('p', { className: 'text-4xl font-bold text-red-600' }, stats.periods)
                        ),
                        React.createElement('div', { className: 'p-4 rounded-xl bg-red-50' },
                            React.createElement(Icon, { name: 'calendar', size: 28, className: 'text-red-600' })
                        )
                    )
                )
            ),

            React.createElement('div', { className: 'glass-effect neo-shadow rounded-2xl overflow-hidden' },
                React.createElement('div', { className: 'flex border-b' },
                    [
                        { id: 'upload', icon: 'upload', label: 'Importar' },
                        { id: 'data', icon: 'table-2', label: 'Datos' },
                        { id: 'analytics', icon: 'bar-chart-3', label: 'Información' }
                    ].map(tab =>
                        React.createElement('button', {
                            key: tab.id,
                            onClick: () => setActiveTab(tab.id),
                            className: `futuristic-tab flex-1 px-6 py-4 font-medium transition-all ${
                                activeTab === tab.id 
                                    ? 'active text-red-600 bg-red-50' 
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`
                        },
                            React.createElement(Icon, { name: tab.icon, size: 20, className: 'inline mr-2' }),
                            tab.label
                        )
                    )
                ),

                React.createElement('div', { className: 'p-6' },
                    activeTab === 'upload' && React.createElement('div', null,
                        React.createElement('div', { className: 'border-2 border-dashed rounded-2xl p-12 text-center hover:border-red-600 transition-all cursor-pointer neo-inset' },
                            React.createElement('div', { className: 'inline-block p-6 rounded-2xl mb-4 bg-red-50' },
                                React.createElement(Icon, { name: 'upload-cloud', size: 64, className: 'text-red-600' })
                            ),
                            React.createElement('h3', { className: 'text-2xl font-bold text-gray-800 mb-2' }, 'Subir Archivo Excel'),
                            React.createElement('p', { className: 'text-gray-600 mb-6' }, 'Selecciona un archivo .xlsx o .xls'),
                            React.createElement('label', { className: 'inline-block btn-primary px-8 py-3 text-white rounded-xl cursor-pointer font-medium' },
                                'Seleccionar Archivo',
                                React.createElement('input', {
                                    type: 'file',
                                    accept: '.xlsx,.xls',
                                    onChange: handleFileUpload,
                                    className: 'hidden'
                                })
                            )
                        ),

                        importHistory.length > 0 && React.createElement('div', { className: 'mt-8' },
                            React.createElement('h3', { className: 'text-xl font-bold text-gray-800 mb-4 flex items-center gap-2' },
                                React.createElement(Icon, { name: 'history', size: 24, className: 'text-red-600' }),
                                'Historial'
                            ),
                            React.createElement('div', { className: 'space-y-3' },
                                importHistory.map(imp =>
                                    React.createElement('div', {
                                        key: imp.id,
                                        className: 'flex items-center justify-between glass-effect rounded-xl p-4 hover:shadow-lg transition-all accent-border'
                                    },
                                        React.createElement('div', null,
                                            React.createElement('p', { className: 'font-semibold text-gray-800' }, `Importación #${imp.id} - ${imp.fileName}`),
                                            React.createElement('p', { className: 'text-sm text-gray-600 mt-1' }, `${imp.date} • ${imp.recordsAdded} registros`)
                                        ),
                                        React.createElement('button', {
                                            onClick: () => deleteImport(imp.id),
                                            className: 'btn-secondary p-3 rounded-xl'
                                        },
                                            React.createElement(Icon, { name: 'trash-2', size: 20, className: 'text-white' })
                                        )
                                    )
                                )
                            )
                        )
                    ),

                    activeTab === 'data' && React.createElement('div', null,
                        data.length === 0 
                            ? React.createElement('div', { className: 'text-center py-20' },
                                React.createElement('div', { className: 'inline-block p-8 rounded-2xl mb-4 bg-gray-100' },
                                    React.createElement(Icon, { name: 'inbox', size: 80, className: 'text-gray-300' })
                                ),
                                React.createElement('p', { className: 'text-gray-500 text-xl font-medium' }, 'No hay datos disponibles'),
                                React.createElement('p', { className: 'text-gray-400 mt-2' }, 'Importa un archivo Excel para comenzar')
                            )
                            : React.createElement('div', null,
                                // Panel de filtros
                                React.createElement('div', { className: 'mb-6 rounded-2xl bg-white neo-shadow p-6' },
                                    React.createElement('div', { className: 'flex flex-col gap-6' },
                                        // Slider único para importe (máximo)
                                        React.createElement('div', null,
                                            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Importe máximo'),
                                            React.createElement('div', { className: 'flex items-center gap-3' },
                                                React.createElement('input', {
                                                    type: 'range', min: 0, max: filters.montoRange[1],
                                                    value: tableFilters.importeRange[1],
                                                    onChange: (e) => setTableFilters(prev => ({ ...prev, importeRange: [0, Number(e.target.value)] })),
                                                    className: 'w-full'
                                                }),
                                                React.createElement('span', { className: 'text-sm text-gray-700 w-28 text-right' }, `$${Number(tableFilters.importeRange[1]).toFixed(0)}`)
                                            )
                                        ),
                                        // Checkboxes de RPU, Periodo y Nombre
                                        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-6' },
                                            React.createElement('div', null,
                                                React.createElement('h4', { className: 'text-sm font-semibold text-gray-800 mb-2' }, 'RPU'),
                                                React.createElement('div', { className: 'max-h-40 overflow-auto border rounded-lg p-2' },
                                                    uniqueRPU.map((v) => React.createElement('label', { key: v, className: 'flex items-center gap-2 py-1 text-sm' },
                                                        React.createElement('input', {
                                                            type: 'checkbox', checked: tableFilters.RPU.includes(v),
                                                            onChange: () => toggleFilter('RPU', v)
                                                        }),
                                                        React.createElement('span', null, v)
                                                    ))
                                                )
                                            ),
                                            React.createElement('div', null,
                                                React.createElement('h4', { className: 'text-sm font-semibold text-gray-800 mb-2' }, 'Periodo'),
                                                React.createElement('div', { className: 'max-h-40 overflow-auto border rounded-lg p-2' },
                                                    uniquePeriodos.map((v) => React.createElement('label', { key: v, className: 'flex items-center gap-2 py-1 text-sm' },
                                                        React.createElement('input', {
                                                            type: 'checkbox', checked: tableFilters.Periodo.includes(v),
                                                            onChange: () => toggleFilter('Periodo', v)
                                                        }),
                                                        React.createElement('span', null, v)
                                                    ))
                                                )
                                            ),
                                            React.createElement('div', null,
                                                React.createElement('h4', { className: 'text-sm font-semibold text-gray-800 mb-2' }, 'Nombre'),
                                                React.createElement('div', { className: 'max-h-40 overflow-auto border rounded-lg p-2' },
                                                    uniqueNombres.map((v) => React.createElement('label', { key: v, className: 'flex items-center gap-2 py-1 text-sm' },
                                                        React.createElement('input', {
                                                            type: 'checkbox', checked: tableFilters.Nombre.includes(v),
                                                            onChange: () => toggleFilter('Nombre', v)
                                                        }),
                                                        React.createElement('span', null, v)
                                                    ))
                                                )
                                            )
                                        ),
                                        React.createElement('div', { className: 'flex justify-end' },
                                            React.createElement('button', {
                                                className: 'px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm',
                                                onClick: () => setTableFilters(prev => ({ ...prev, RPU: [], Periodo: [], Nombre: [] }))
                                            }, 'Limpiar filtros')
                                        )
                                    )
                                ),
                                React.createElement('div', { className: 'overflow-x-auto' },
                                    React.createElement('table', { className: 'min-w-full bg-white rounded-xl overflow-hidden neo-shadow' },
                                        React.createElement('thead', { className: 'bg-gray-100' },
                                            React.createElement('tr', null,
                                                React.createElement('th', { className: 'py-3 px-4 text-left text-sm font-medium text-gray-600' }, 'RPU'),
                                                React.createElement('th', { className: 'py-3 px-4 text-left text-sm font-medium text-gray-600' }, 'Periodo'),
                                                React.createElement('th', { className: 'py-3 px-4 text-left text-sm font-medium text-gray-600' }, 'Nombre'),
                                                React.createElement('th', { className: 'py-3 px-4 text-left text-sm font-medium text-gray-600' }, 'Dirección'),
                                                React.createElement('th', { className: 'py-3 px-4 text-left text-sm font-medium text-gray-600' }, 'Importe total ($)'),
                                                React.createElement('th', { className: 'py-3 px-4 text-left text-sm font-medium text-gray-600' }, 'Fecha desde'),
                                                React.createElement('th', { className: 'py-3 px-4 text-left text-sm font-medium text-gray-600' }, 'Fecha hasta'),
                                                React.createElement('th', { className: 'py-3 px-4 text-left text-sm font-medium text-gray-600' }, 'Fecha límite de pago')
                                            )
                                        ),
                                        React.createElement('tbody', null,
                                            paginatedData.map((item, index) => 
                                                React.createElement('tr', { 
                                                    key: index,
                                                    className: index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                },
                                                    React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700' }, item?.rpu ?? '-'),
                                                    React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700' }, item?.periodo ?? '-'),
                                                    React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700' }, item?.nombre ?? '-'),
                                                    React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700' }, item?.direccion ?? '-'),
                                                    React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700' }, (item?.importe_total !== undefined && item?.importe_total !== null && !isNaN(Number(item.importe_total))) ? `$${Number(item.importe_total).toFixed(2)}` : '-'),
                                                    React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700' }, formatDate(item?.fecha_desde)),
                                                    React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700' }, formatDate(item?.fecha_hasta)),
                                                    React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700' }, formatDate(item?.fecha_limite_pago))
                                                )
                                            )
                                        )
                                    )
                                ),
                                React.createElement('p', { className: 'text-center text-gray-600 py-4' }, 
                                    `Mostrando ${Array.isArray(paginatedData) ? paginatedData.length : 0} de ${Array.isArray(getFilteredTableData) ? getFilteredTableData.length : 0} registros (página ${currentPage} de ${totalPages})`
                                ),
                                React.createElement('div', { className: 'flex justify-center gap-2 mt-4' },
                                    React.createElement('button', {
                                        onClick: () => setCurrentPage(Math.max(1, currentPage - 1)),
                                        disabled: currentPage === 1,
                                        className: 'btn-secondary px-4 py-2 text-white rounded-lg disabled:opacity-40'
                                    }, '← Anterior'),
                                    React.createElement('button', {
                                        onClick: () => setCurrentPage(Math.min(totalPages, currentPage + 1)),
                                        disabled: currentPage === totalPages,
                                        className: 'btn-secondary px-4 py-2 text-white rounded-lg disabled:opacity-40'
                                    }, 'Siguiente →')
                                )
                            )
                    ),

                    activeTab === 'analytics' && React.createElement('div', null,
                        data.length === 0
                            ? React.createElement('div', { className: 'text-center py-20' },
                                React.createElement('div', { className: 'inline-block p-8 rounded-2xl mb-4 bg-gray-100' },
                                    React.createElement(Icon, { name: 'trending-up', size: 80, className: 'text-gray-300' })
                                ),
                                React.createElement('p', { className: 'text-gray-500 text-xl font-medium' }, 'No hay datos para analizar')
                            )
                            : React.createElement('div', null,
                                React.createElement('div', { className: 'glass-effect rounded-2xl p-6 neo-shadow' },
                                    React.createElement('h3', { className: 'text-xl font-bold text-gray-800 mb-4' }, 'Suma de Importe Total por Periodo'),
                                    React.createElement('div', { style: { height: '400px' } },
                                        React.createElement(ChartComponent, {
                                            type: 'bar',
                                            data: {
                                                labels: prepareChartData().labels,
                                                datasets: [{
                                                    label: 'Importe Total',
                                                    data: prepareChartData().values,
                                                    backgroundColor: 'rgba(236, 28, 36, 0.8)',
                                                    borderColor: '#ec1c24',
                                                    borderWidth: 2,
                                                    borderRadius: 8
                                                }]
                                            },
                                            options: {
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: { display: true, position: 'top' },
                                                    tooltip: {
                                                        callbacks: {
                                                            label: (context) => `Importe: ${context.parsed.y.toLocaleString('es-MX')}`
                                                        }
                                                    }
                                                },
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        ticks: {
                                                            callback: (value) => `${(value / 1000).toFixed(0)}k`
                                                        }
                                                    }
                                                }
                                            }
                                        })
                                    )
                                ),
                                
                                React.createElement('div', { className: 'glass-effect rounded-2xl p-6 mt-6 neo-shadow' },
                                    React.createElement('h3', { className: 'text-xl font-bold text-gray-800 mb-4' }, 'Resumen Estadístico'),
                                    React.createElement('div', { className: 'grid grid-cols-4 gap-4' },
                                        (() => {
                                            const totales = data.map(r => parseFloat(r.importe_total) || 0);
                                            const suma = totales.reduce((a, b) => a + b, 0);
                                            const promedio = suma / totales.length || 0;
                                            const max = Math.max(...totales, 0);
                                            const min = totales.length > 0 ? Math.min(...totales.filter(t => t > 0)) : 0;
                                            
                                            return [
                                                { label: 'Total Facturado', value: suma, color: 'red' },
                                                { label: 'Promedio', value: promedio, color: 'green' },
                                                { label: 'Máximo', value: max, color: 'gray' },
                                                { label: 'Mínimo', value: min, color: 'yellow' }
                                            ].map((stat, idx) =>
                                                React.createElement('div', {
                                                    key: idx,
                                                    className: `rounded-xl p-5 bg-${stat.color}-50 border-2 border-${stat.color}-100`
                                                },
                                                    React.createElement('p', { className: 'text-gray-600 text-sm font-semibold mb-2' }, stat.label),
                                                    React.createElement('p', { className: `text-3xl font-bold text-${stat.color}-600` }, 
                                                        `${stat.value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
                                                    )
                                                )
                                            );
                                        })()
                                    )
                                )
                            )
                    )
                )
            )
        )
    );
};

// INICIALIZAR APLICACIÓN
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));