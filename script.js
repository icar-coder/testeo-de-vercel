let productos = [];
let productosFiltrados = [];

async function cargarProductos() {
    try {
        const rutas = ['/productos.json', './productos.json', '/public/productos.json'];
        let response = null;

        for (const ruta of rutas) {
            response = await fetch(ruta);
            if (response.ok) {
                break;
            }
        }

        if (!response || !response.ok) {
            throw new Error(`No se pudo cargar el JSON. Último estado: ${response ? response.status : 'sin respuesta'}`);
        }

        const data = await response.json();
        productos = Array.isArray(data.productos) ? data.productos : [];
        productosFiltrados = [...productos];
        mostrarProductos(productosFiltrados);
        console.log('✅ Productos cargados');
    } catch (error) {
        console.error('❌ Error al cargar productos:', error);
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <h3>⚠️ No se pudieron cargar los productos</h3>
                    <p>Revisa que el archivo exista en la carpeta public y que la ruta sea correcta.</p>
                </div>
            `;
        }
    }
}

function mostrarProductos(productosArray) {
    const resultsDiv = document.getElementById('results');

    if (!resultsDiv) {
        return;
    }

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
            <div class="price">$${Number(producto.precio || 0).toFixed(2)}</div>
        </div>
    `).join('');
}

function buscarProductos() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (!searchInput || !categoryFilter || !sortFilter) {
        return;
    }

    const searchTerm = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;
    const sort = sortFilter.value;

    let resultados = productos.filter(producto => {
        const matchesSearch = !searchTerm ||
            producto.nombre.toLowerCase().includes(searchTerm) ||
            producto.categoria.toLowerCase().includes(searchTerm) ||
            producto.descripcion.toLowerCase().includes(searchTerm);

        const matchesCategory = !category || producto.categoria === category;

        return matchesSearch && matchesCategory;
    });

    switch (sort) {
        case 'price-asc':
            resultados.sort((a, b) => a.precio - b.precio);
            break;
        case 'price-desc':
            resultados.sort((a, b) => b.precio - a.precio);
            break;
        case 'name':
            resultados.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        default:
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

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (searchInput) {
        let timeoutId;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(buscarProductos, 300);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                buscarProductos();
            }
        });
    }

    if (searchButton) {
        searchButton.addEventListener('click', buscarProductos);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', buscarProductos);
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', buscarProductos);
    }
});