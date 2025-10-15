// ============================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================

const CONFIG = {
    // ============================================
    // CREDENCIALES DE SUPABASE
    // ============================================
    // IMPORTANTE: Reemplaza estos valores con los de TU proyecto
    
    // 1. Ve a https://supabase.com
    // 2. Inicia sesión y selecciona tu proyecto
    // 3. Ve a Settings > API
    // 4. Copia los valores de abajo:
    
    // URL del proyecto (ejemplo: https://xyzabc123.supabase.co)
    SUPABASE_URL: 'https://lqhmlegbzvxycvtrtwof.supabase.co',
    
    // Clave pública anon (es una clave MUY larga que empieza con eyJ...)
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxaG1sZWdienZ4eWN2dHJ0d29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTMzMDYsImV4cCI6MjA3NjAyOTMwNn0.qfGwrmzjJJDCYvA9O5-8Ag6E-ZVtgh0EZnilG02o-u4',
    
    // ============================================
    // CREDENCIALES DE ADMINISTRADOR
    // ============================================
    // Cambia estos valores si quieres usar otras credenciales
    
    ADMIN_USERNAME: 'admin_unico',
    ADMIN_PASSWORD: 'admin2025',
    
    // ============================================
    // CONFIGURACIÓN DE LA APLICACIÓN
    // ============================================
    
    // Número de registros por página en la tabla
    ITEMS_PER_PAGE: 50
};

// ============================================
// NOTAS IMPORTANTES:
// ============================================
// 
// 1. NUNCA compartas este archivo públicamente con tus credenciales reales
// 2. Si subes a GitHub, agrega config.js al .gitignore
// 3. Para cambiar las credenciales de admin, solo edita las líneas 25-26
// 4. El plan gratuito de Supabase es suficiente para ~100,000 registros
// 5. Puedes cambiar ITEMS_PER_PAGE si quieres más/menos registros por página
//