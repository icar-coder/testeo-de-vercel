console.log('✅ JavaScript cargado');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Prueba 1: JSON en raíz
        const response = await fetch('public/productos.json');
        console.log('Status de productos.json:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Productos cargados:', data.productos);
            document.querySelector('h1').textContent = `✅ ${data.productos.length} productos cargados`;
        } else {
            document.querySelector('h1').textContent = '❌ Error cargando JSON';
        }
    } catch (error) {
        console.error('Error:', error);
        document.querySelector('h1').textContent = '❌ Error: ' + error.message;
    }
});