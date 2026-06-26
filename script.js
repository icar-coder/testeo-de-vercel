let productos = [];
let productosFiltrados = [];

// Cargar productos - Versión para Vercel con JSON en public/
// Intenta primero una ruta, si falla prueba la otra
async function cargarProductos() {
    try {
        let response = await fetch('/public/productos.json');
        if (!response.ok) {
            // Si falla, intenta en la raíz
            response = await fetch('productos.json');
        }
        const data = await response.json();
        productos = data.productos;
        productosFiltrados = [...productos];
        mostrarProductos(productosFiltrados);
        console.log('✅ Productos cargados');
    } catch (error) {
        console.error('❌ Error:', error);
        // Mostrar error en pantalla
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
            <img src="${producto.imagen || 'https://via.placeholder.com/150'}" alt="${producto.nombre}" />
            <span class="category">${producto.categoria}</span>
            <h3>${producto.nombre}</h3>
            <p class="description">${producto.descripcion}</p>
            <div class="price">$${producto.precio.toFixed(2)}</div>
        </div>
    `).join('');
}

// Función de búsqueda con filtros y ordenamiento
function buscarProductos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const category = document.getElementById('categoryFilter').value;
    const sort = document.getElementById('sortFilter').value;

    // Filtrar por término de búsqueda y categoría
    let resultados = productos.filter(producto => {
        const matchesSearch = !searchTerm || 
            producto.nombre.toLowerCase().includes(searchTerm) ||
            producto.categoria.toLowerCase().includes(searchTerm) ||
            producto.descripcion.toLowerCase().includes(searchTerm);
        
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
                    const aScore = a.nombre.toLowerCase().includes(searchTerm) ? 2 : 1;
                    const bScore = b.nombre.toLowerCase().includes(searchTerm) ? 2 : 1;
                    return bScore - aScore;
                });
            }
    }

    productosFiltrados = resultados;
    mostrarProductos(resultados);
}

// Configurar eventos cuando el DOM esté listo
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

    searchButton.addEventListener('click', buscarProductos);
    categoryFilter.addEventListener('change', buscarProductos);
    sortFilter.addEventListener('change', buscarProductos);

    // Enter key para buscar
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            buscarProductos();
        }
    });
});