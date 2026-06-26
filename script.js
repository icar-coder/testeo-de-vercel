let datosExcel = [];
let productosJSON = [];
let workbookGlobal = null;
let productosCompletos = [];
let paginaActual = 1;
const productosPorPagina = 10;

// Elementos DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const sheetSelect = document.getElementById('sheetSelect');
const headerRow = document.getElementById('headerRow');
const filterEmpty = document.getElementById('filterEmpty');
const previewContainer = document.getElementById('previewContainer');
const jsonOutput = document.getElementById('jsonOutput');
const tableContainer = document.getElementById('tableContainer');
const statsBar = document.getElementById('statsBar');
const totalProductos = document.getElementById('totalProductos');
const totalCategorias = document.getElementById('totalCategorias');
const totalMarcas = document.getElementById('totalMarcas');
const precioPromedio = document.getElementById('precioPromedio');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const downloadJsonBtn2 = document.getElementById('downloadJsonBtn2');

// Configuración de columnas
const COLUMN_MAP = {
    'codigos': 'codigo',
    'códigos': 'codigo',
    'code': 'codigo',
    'descripcion': 'nombre',
    'descripción': 'nombre',
    'description': 'nombre',
    'nombre': 'nombre',
    'linea de producto': 'categoria',
    'línea de producto': 'categoria',
    'categoria': 'categoria',
    'categoría': 'categoria',
    'category': 'categoria',
    'marca': 'marca',
    'brand': 'marca',
    'precio hablador': 'precio',
    'precio': 'precio',
    'price': 'precio',
    'precio de venta': 'precio_venta',
    'base imponible': 'base_imponible',
    'iva': 'iva',
    'precio de venta $': 'precio_usd',
    'precio $': 'precio_usd',
    'base imponible $': 'base_usd',
    'iva en $': 'iva_usd',
    'observación': 'observacion',
    'observación para tienda': 'observacion'
};

// ============ INICIALIZACIÓN ============

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ============ CARGA DE EXCEL ============

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivo(file);
});

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) procesarArchivo(file);
});

// Eventos de configuración
sheetSelect.addEventListener('change', () => {
    if (workbookGlobal) {
        paginaActual = 1; // reiniciar página
        procesarSegunSeleccion();
    }
});
headerRow.addEventListener('change', () => {
    if (workbookGlobal) {
        paginaActual = 1;
        procesarSegunSeleccion();
    }
});
filterEmpty.addEventListener('change', () => {
    if (workbookGlobal) {
        paginaActual = 1;
        procesarSegunSeleccion();
    }
});

// ============ PROCESAR ARCHIVO ============

function procesarArchivo(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            workbookGlobal = workbook;

            sheetSelect.innerHTML = '';
            workbook.SheetNames.forEach((name, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = name;
                sheetSelect.appendChild(option);
            });
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = '📋 TODAS LAS HOJAS';
            sheetSelect.appendChild(allOption);
            sheetSelect.value = 'all';
            paginaActual = 1;

            procesarSegunSeleccion();

        } catch (error) {
            alert('❌ Error al leer el archivo: ' + error.message);
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
}

// ============ PROCESAR SEGÚN SELECCIÓN ============

function procesarSegunSeleccion() {
    if (!workbookGlobal) return;
    const selected = sheetSelect.value;
    if (selected === 'all') {
        procesarTodasLasHojas();
    } else {
        procesarHojaPorIndice(parseInt(selected));
    }
}

// ============ PROCESAR TODAS LAS HOJAS ============

function procesarTodasLasHojas() {
    if (!workbookGlobal) return;
    const filterEmptyVal = filterEmpty.checked;
    const headerRowNum = parseInt(headerRow.value) - 1;
    let todosLosProductos = [];
    let errores = [];

    workbookGlobal.SheetNames.forEach(sheetName => {
        const worksheet = workbookGlobal.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (rawData.length === 0) return;

        const headers = rawData[headerRowNum] || [];
        const columnMap = {};
        headers.forEach((header, index) => {
            const headerStr = String(header).toLowerCase().trim();
            let matched = false;
            for (const [key, value] of Object.entries(COLUMN_MAP)) {
                if (headerStr.includes(key) || key.includes(headerStr)) {
                    columnMap[index] = value;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                const cleanName = headerStr.replace(/[^a-z0-9]/g, '_');
                columnMap[index] = cleanName || `col_${index}`;
            }
        });

        for (let i = headerRowNum + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.every(cell => !String(cell).trim())) continue;
            const producto = {};
            let hasName = false;

            for (const [colIndex, field] of Object.entries(columnMap)) {
                const value = row[parseInt(colIndex)] || '';
                const cleanValue = String(value).trim();
                if (['precio', 'precio_venta', 'base_imponible', 'iva', 'precio_usd', 'base_usd', 'iva_usd'].includes(field)) {
                    const numValue = parseFloat(cleanValue.replace(/[^0-9.]/g, ''));
                    if (!isNaN(numValue) && numValue > 0) {
                        producto[field] = numValue;
                    }
                } else {
                    producto[field] = cleanValue;
                }
                if (field === 'nombre' && cleanValue) hasName = true;
            }

            if (!hasName && filterEmptyVal) {
                errores.push(`Fila ${i+1} (hoja ${sheetName}): Sin nombre, omitida`);
                continue;
            }

            Object.keys(producto).forEach(key => {
                if (producto[key] === '' || producto[key] === null || producto[key] === undefined) {
                    delete producto[key];
                }
            });

            if (producto.nombre || producto.codigo) {
                todosLosProductos.push(producto);
            }
        }
    });

    todosLosProductos.forEach((p, index) => p.id = index + 1);

    datosExcel = todosLosProductos;
    productosJSON = todosLosProductos;

    actualizarUI(todosLosProductos);
    actualizarStats(todosLosProductos);
    actualizarTabla(todosLosProductos);
    actualizarJSON(todosLosProductos);
    paginaActual = 1;
    actualizarPreview(todosLosProductos);
    statsBar.style.display = 'grid';

    if (errores.length > 0) {
        console.warn('Productos omitidos:', errores);
    }
}

// ============ PROCESAR UNA HOJA POR ÍNDICE ============

function procesarHojaPorIndice(sheetIndex) {
    if (!workbookGlobal) return;
    const sheetName = workbookGlobal.SheetNames[sheetIndex];
    const worksheet = workbookGlobal.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (rawData.length === 0) {
        mostrarError('La hoja está vacía');
        return;
    }

    const filterEmptyVal = filterEmpty.checked;
    const headerRowNum = parseInt(headerRow.value) - 1;
    const headers = rawData[headerRowNum] || [];

    const columnMap = {};
    headers.forEach((header, index) => {
        const headerStr = String(header).toLowerCase().trim();
        let matched = false;
        for (const [key, value] of Object.entries(COLUMN_MAP)) {
            if (headerStr.includes(key) || key.includes(headerStr)) {
                columnMap[index] = value;
                matched = true;
                break;
            }
        }
        if (!matched) {
            const cleanName = headerStr.replace(/[^a-z0-9]/g, '_');
            columnMap[index] = cleanName || `col_${index}`;
        }
    });

    const productos = [];
    const errors = [];

    for (let i = headerRowNum + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.every(cell => !String(cell).trim())) continue;
        const producto = {};
        let hasName = false;

        for (const [colIndex, field] of Object.entries(columnMap)) {
            const value = row[parseInt(colIndex)] || '';
            const cleanValue = String(value).trim();
            if (['precio', 'precio_venta', 'base_imponible', 'iva', 'precio_usd', 'base_usd', 'iva_usd'].includes(field)) {
                const numValue = parseFloat(cleanValue.replace(/[^0-9.]/g, ''));
                if (!isNaN(numValue) && numValue > 0) {
                    producto[field] = numValue;
                }
            } else {
                producto[field] = cleanValue;
            }
            if (field === 'nombre' && cleanValue) hasName = true;
        }

        if (!hasName && filterEmptyVal) {
            errors.push(`Fila ${i+1}: Sin nombre, omitida`);
            continue;
        }

        Object.keys(producto).forEach(key => {
            if (producto[key] === '' || producto[key] === null || producto[key] === undefined) {
                delete producto[key];
            }
        });

        if (producto.nombre || producto.codigo) {
            productos.push(producto);
        }
    }

    productos.forEach((p, index) => p.id = index + 1);

    datosExcel = productos;
    productosJSON = productos;

    actualizarUI(productos);
    actualizarStats(productos);
    actualizarTabla(productos);
    actualizarJSON(productos);
    paginaActual = 1;
    actualizarPreview(productos);
    statsBar.style.display = 'grid';

    if (errors.length > 0) {
        console.warn('Productos omitidos:', errors);
    }
}

// ============ ACTUALIZAR UI ============

function actualizarUI(productos) {
    console.log(`✅ UI actualizada: ${productos.length} productos cargados`);
}

function actualizarPreview(productos) {
    if (!productos || productos.length === 0) {
        previewContainer.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <h3>No hay productos</h3>
                <p>No se encontraron datos válidos</p>
            </div>
        `;
        return;
    }

    // Guardar productos completos para paginación
    productosCompletos = productos;
    const totalPaginas = Math.ceil(productos.length / productosPorPagina);
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    if (paginaActual < 1) paginaActual = 1;
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = Math.min(inicio + productosPorPagina, productos.length);
    const productosPagina = productos.slice(inicio, fin);

    let html = '<div class="preview-grid">';
    productosPagina.forEach(p => {
        html += `
            <div class="preview-card">
                <div class="p-nombre">${p.nombre || p.codigo || 'Sin nombre'}</div>
                <div class="p-categoria">${p.categoria || 'Sin categoría'}</div>
                <div class="p-marca">${p.marca || ''}</div>
                <div class="p-precio">${p.precio ? '$' + p.precio.toFixed(2) : p.precio_usd ? '$' + p.precio_usd.toFixed(2) : 'Precio no disponible'}</div>
            </div>
        `;
    });
    html += '</div>';

    // Controles de paginación
    html += `<div class="pagination-controls">
        <span>Mostrando ${inicio+1}-${fin} de ${productos.length} productos</span>
        <div>
            <button class="pag-btn" data-page="prev" ${paginaActual === 1 ? 'disabled' : ''}>Anterior</button>
            <button class="pag-btn" data-page="next" ${paginaActual === totalPaginas ? 'disabled' : ''}>Siguiente</button>
        </div>
    </div>`;

    previewContainer.innerHTML = html;

    // Event listeners para paginación
    document.querySelectorAll('.pag-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.dataset.page;
            if (action === 'prev' && paginaActual > 1) {
                paginaActual--;
            } else if (action === 'next' && paginaActual < totalPaginas) {
                paginaActual++;
            } else {
                return;
            }
            actualizarPreview(productosCompletos);
        });
    });
}

function actualizarJSON(productos) {
    if (!productos || productos.length === 0) {
        jsonOutput.textContent = 'No hay datos para mostrar';
        return;
    }
    jsonOutput.textContent = JSON.stringify(productos, null, 2);
}

function actualizarTabla(productos) {
    if (!productos || productos.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                <div class="icon">📊</div>
                <h3>No hay datos para mostrar</h3>
            </div>
        `;
        return;
    }
    const allKeys = new Set();
    productos.forEach(p => Object.keys(p).forEach(k => allKeys.add(k)));
    const columns = Array.from(allKeys);
    let html = '<table><thead><tr>';
    columns.forEach(col => {
        const label = col.charAt(0).toUpperCase() + col.slice(1);
        html += `<th>${label}</th>`;
    });
    html += '</tr></thead><tbody>';
    productos.forEach(p => {
        html += '<tr>';
        columns.forEach(col => {
            const value = p[col] !== undefined ? p[col] : '';
            html += `<td>${value}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    tableContainer.innerHTML = html;
}

function actualizarStats(productos) {
    if (!productos || productos.length === 0) {
        statsBar.style.display = 'none';
        return;
    }
    const categorias = new Set(productos.map(p => p.categoria).filter(Boolean));
    const marcas = new Set(productos.map(p => p.marca).filter(Boolean));
    let totalPrecio = 0;
    let countPrecio = 0;
    productos.forEach(p => {
        const price = p.precio || p.precio_usd || 0;
        if (price > 0) {
            totalPrecio += price;
            countPrecio++;
        }
    });
    const avg = countPrecio > 0 ? totalPrecio / countPrecio : 0;
    totalProductos.textContent = productos.length;
    totalCategorias.textContent = categorias.size;
    totalMarcas.textContent = marcas.size;
    precioPromedio.textContent = `$${avg.toFixed(2)}`;
}

function mostrarError(mensaje) {
    previewContainer.innerHTML = `
        <div class="empty-state">
            <div class="icon">⚠️</div>
            <h3>Error</h3>
            <p>${mensaje}</p>
        </div>
    `;
}

// ============ BOTONES ============

copyJsonBtn.addEventListener('click', () => {
    const text = jsonOutput.textContent;
    if (!text || text === 'No hay datos para mostrar') {
        alert('⚠️ No hay JSON para copiar');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        const original = copyJsonBtn.textContent;
        copyJsonBtn.textContent = '✅ ¡Copiado!';
        setTimeout(() => copyJsonBtn.textContent = original, 2000);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('📋 JSON copiado al portapapeles');
    });
});

downloadJsonBtn.addEventListener('click', () => {
    const text = jsonOutput.textContent;
    if (!text || text === 'No hay datos para mostrar') {
        alert('⚠️ No hay JSON para descargar');
        return;
    }
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'productos.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

downloadJsonBtn2.addEventListener('click', () => {
    const text = jsonOutput.textContent;
    if (!text || text === 'No hay datos para mostrar') {
        alert('⚠️ No hay JSON para descargar');
        return;
    }
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'productos_formateado.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// ============ KEYBOARD SHORTCUTS ============

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (workbookGlobal) procesarSegunSeleccion();
    }
});

console.log('🚀 Excel to JSON Converter listo!');
console.log('📂 Arrastra un archivo Excel para comenzar');
console.log('💡 Selecciona "TODAS LAS HOJAS" para procesar todo el libro.');

// Mostrar mensaje inicial
previewContainer.innerHTML = `
    <div class="empty-state">
        <div class="icon">📤</div>
        <h3>Carga un archivo Excel para comenzar</h3>
        <p>Arrastra tu archivo o haz clic en "Seleccionar archivo"</p>
        <p style="font-size:0.85rem; color:#555; margin-top:10px;">
            Formatos soportados: .xlsx, .xls
        </p>
    </div>
`;
jsonOutput.textContent = 'Esperando datos...';