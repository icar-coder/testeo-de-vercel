let productos = [];
let productosFiltrados = [];

// Cargar productos desde el archivo JSON
async function cargarProductos() {
    try {
        const response = await fetch('/productos.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        productos = data.productos;
        productosFiltrados = [...productos];
        mostrarProductos(productosFiltrados);
        actualizarEstadisticas(productos);
    } catch (error) {
        console.error('Error cargando productos:', error);
        document.getElementById('results').innerHTML = `
            <div class="no-results">
                <h3>❌ Error al cargar productos</h3>
                <p>Error: ${error.message}</p>
                <p style="font-size:0.8rem; color:#555;">Revisa que el archivo productos.json exista</p>
            </div>
        `;
    }
}

// Mostrar productos en la interfaz
function mostrarProductos(productosArray) {
    const resultsDiv = document.getElementById('results');
    
    if (!productosArray || productosArray.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <h3>🔍 No se encontraron productos</h3>
                <p>Prueba con otros términos de búsqueda</p>
            </div>
        `;
        return;
    }

    resultsDiv.innerHTML = productosArray.map(producto => `
        <div class="product-card">
            <span class="category">${producto.categoria || 'Sin categoría'}</span>
            <h3>${producto.nombre || 'Sin nombre'}</h3>
            ${producto.marca ? `<p class="marca">🏷️ ${producto.marca}</p>` : ''}
            <p class="description">${producto.descripcion || 'Sin descripción'}</p>
            <div class="price-container">
                <div class="price">$${producto.precio.toFixed(2)}</div>
                ${producto.iva ? `<div class="iva">IVA: $${producto.iva.toFixed(2)}</div>` : ''}
            </div>
            ${producto.base_imponible ? `<div class="base">Base: $${producto.base_imponible.toFixed(2)}</div>` : ''}
            ${producto.codigo ? `<div class="codigo">Código: ${producto.codigo}</div>` : ''}
        </div>
    `).join('');
}

// Actualizar estadísticas
function actualizarEstadisticas(productosArray) {
    const stats = document.getElementById('stats');
    if (!stats) return;
    
    const categorias = [...new Set(productosArray.map(p => p.categoria).filter(Boolean))];
    const marcas = [...new Set(productosArray.map(p => p.marca).filter(Boolean))];
    
    // Calcular precio promedio
    const precios = productosArray.map(p => p.precio).filter(p => p > 0);
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

    // Filtrar productos
    let resultados = productos.filter(producto => {
        const matchesSearch = !searchTerm || 
            producto.nombre.toLowerCase().includes(searchTerm) ||
            (producto.categoria && producto.categoria.toLowerCase().includes(searchTerm)) ||
            (producto.marca && producto.marca.toLowerCase().includes(searchTerm)) ||
            (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !category || producto.categoria === category;
        
        return matchesSearch && matchesCategory;
    });

    // Ordenar resultados
    switch(sort) {
        case 'price-asc':
            resultados.sort((a, b) => a.precio - b.precio);
            break;
        case 'price-desc':
            resultados.sort((a, b) => b.precio - a.precio);
            break;
        case 'name':
            resultados.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        default: // relevance
            if (searchTerm) {
                resultados.sort((a, b) => {
                    const aScore = a.nombre.toLowerCase().includes(searchTerm) ? 2 : 
                                   (a.marca && a.marca.toLowerCase().includes(searchTerm)) ? 1 : 0;
                    const bScore = b.nombre.toLowerCase().includes(searchTerm) ? 2 : 
                                   (b.marca && b.marca.toLowerCase().includes(searchTerm)) ? 1 : 0;
                    return bScore - aScore;
                });
            }
    }

    productosFiltrados = resultados;
    mostrarProductos(resultados);
    actualizarEstadisticas(resultados);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');

    // Búsqueda en tiempo real con debounce
    let timeoutId;
    searchInput.addEventListener('input', () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(buscarProductos, 300);
    });

    // Búsqueda al hacer clic en el botón
    searchButton.addEventListener('click', buscarProductos);

    // Filtros
    categoryFilter.addEventListener('change', buscarProductos);
    sortFilter.addEventListener('change', buscarProductos);

    // Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            buscarProductos();
        }
    });
});

// Para depuración en consola
console.log('🚀 Buscador de productos cargado');