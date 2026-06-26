let productos = [];
let productosFiltrados = [];
let paginaActual = 1;
const productosPorPagina = 10;

// Cargar productos desde el archivo JSON
async function cargarProductos() {
    try {
        const response = await fetch('productos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        productos = data;
        productosFiltrados = [...productos];
        paginaActual = 1;
        mostrarPagina();
        actualizarEstadisticas(productosFiltrados);
        actualizarFiltroCategorias(productos);
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('results').innerHTML = `
            <div class="no-results">
                <h3>❌ Error al cargar productos</h3>
                <p>Error: ${error.message}</p>
                <p style="font-size:0.8rem; color:#555;">Revisa que el archivo productos.json exista en la misma carpeta</p>
            </div>
        `;
        document.getElementById('loadMoreBtn').style.display = 'none';
    }
}

// Actualizar el filtro de categorías
function actualizarFiltroCategorias(productosArray) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    const categorias = [...new Set(productosArray.map(p => p.categoria).filter(Boolean))];
    categorias.sort();
    
    const currentValue = categoryFilter.value;
    categoryFilter.innerHTML = `
        <option value="">📂 Todas las categorías</option>
        ${categorias.map(cat => `
            <option value="${cat}">${cat}</option>
        `).join('')}
    `;
    categoryFilter.value = currentValue;
}

// Mostrar la página actual de productos
function mostrarPagina() {
    const start = (paginaActual - 1) * productosPorPagina;
    const end = start + productosPorPagina;
    const productosPagina = productosFiltrados.slice(start, end);

    const resultsDiv = document.getElementById('results');
    
    if (productosFiltrados.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <h3>🔍 No se encontraron productos</h3>
                <p>Prueba con otros términos de búsqueda</p>
            </div>
        `;
        document.getElementById('loadMoreBtn').style.display = 'none';
        return;
    }

    if (productosPagina.length === 0 && paginaActual === 1) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <h3>🔍 No se encontraron productos</h3>
                <p>Prueba con otros términos de búsqueda</p>
            </div>
        `;
        document.getElementById('loadMoreBtn').style.display = 'none';
        return;
    }

    // Renderizar los productos de esta página
    resultsDiv.innerHTML = productosPagina.map(producto => `
        <div class="product-card">
            <span class="category">${producto.categoria || 'Sin categoría'}</span>
            <h3>${producto.nombre || 'Sin nombre'}</h3>
            ${producto.marca ? `<div class="marca">🏷️ ${producto.marca}</div>` : ''}
            <div class="price-container">
                <div class="price">$${typeof producto.precio === 'number' ? producto.precio.toFixed(2) : producto.precio}</div>
                ${producto.iva ? `<div class="iva">IVA: $${typeof producto.iva === 'number' ? producto.iva.toFixed(2) : producto.iva}</div>` : ''}
            </div>
            ${producto.base_imponible ? `<div class="base">Base: $${typeof producto.base_imponible === 'number' ? producto.base_imponible.toFixed(2) : producto.base_imponible}</div>` : ''}
            ${producto.id ? `<div class="codigo">ID: ${producto.id}</div>` : ''}
        </div>
    `).join('');

    // Controlar el botón "Cargar más"
    const loadBtn = document.getElementById('loadMoreBtn');
    if (end < productosFiltrados.length) {
        loadBtn.style.display = 'block';
        loadBtn.disabled = false;
        loadBtn.textContent = `Cargar más (${productosFiltrados.length - end} restantes)`;
    } else {
        loadBtn.style.display = 'none';
    }
}

// Actualizar estadísticas
function actualizarEstadisticas(productosArray) {
    const stats = document.getElementById('stats');
    if (!stats) return;
    
    const categorias = [...new Set(productosArray.map(p => p.categoria).filter(Boolean))];
    const marcas = [...new Set(productosArray.map(p => p.marca).filter(Boolean))];
    
    const precios = productosArray.map(p => p.precio).filter(p => typeof p === 'number' && p > 0);
    const promedio = precios.length > 0 ? precios.reduce((a,b) => a + b, 0) / precios.length : 0;
    
    stats.innerHTML = `
        📦 <strong>${productosArray.length}</strong> productos · 
        📂 <strong>${categorias.length}</strong> categorías · 
        🏷️ <strong>${marcas.length}</strong> marcas · 
        💰 Promedio: <strong>$${promedio.toFixed(2)}</strong>
    `;
}

// Función principal de búsqueda y filtrado
function buscarProductos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const category = document.getElementById('categoryFilter').value;
    const sort = document.getElementById('sortFilter').value;

    let resultados = productos.filter(producto => {
        const matchesSearch = !searchTerm || 
            (producto.nombre && producto.nombre.toLowerCase().includes(searchTerm)) ||
            (producto.categoria && producto.categoria.toLowerCase().includes(searchTerm)) ||
            (producto.marca && producto.marca.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !category || producto.categoria === category;
        
        return matchesSearch && matchesCategory;
    });

    // Ordenar resultados
    switch(sort) {
        case 'price-asc':
            resultados.sort((a, b) => (a.precio || 0) - (b.precio || 0));
            break;
        case 'price-desc':
            resultados.sort((a, b) => (b.precio || 0) - (a.precio || 0));
            break;
        case 'name':
            resultados.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            break;
        default: // relevance
            if (searchTerm) {
                resultados.sort((a, b) => {
                    const aScore = (a.nombre && a.nombre.toLowerCase().includes(searchTerm)) ? 2 : 
                                   (a.marca && a.marca.toLowerCase().includes(searchTerm)) ? 1 : 0;
                    const bScore = (b.nombre && b.nombre.toLowerCase().includes(searchTerm)) ? 2 : 
                                   (b.marca && b.marca.toLowerCase().includes(searchTerm)) ? 1 : 0;
                    return bScore - aScore;
                });
            }
    }

    productosFiltrados = resultados;
    paginaActual = 1;
    mostrarPagina();
    actualizarEstadisticas(resultados);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    // Búsqueda en tiempo real con debounce
    let timeoutId;
    searchInput.addEventListener('input', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(buscarProductos, 300);
    });

    searchButton.addEventListener('click', buscarProductos);
    categoryFilter.addEventListener('change', buscarProductos);
    sortFilter.addEventListener('change', buscarProductos);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            buscarProductos();
        }
    });

    // Cargar más productos
    loadMoreBtn.addEventListener('click', () => {
        paginaActual++;
        mostrarPagina();
    });
});

console.log('🚀 Buscador de productos con paginación cargado');