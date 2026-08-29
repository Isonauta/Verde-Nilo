// Configuración de conexión a Supabase, compartida por el panel admin y la tienda.
//
// Reemplaza los dos valores de abajo por los de TU proyecto:
// Supabase Dashboard > Project Settings > API > "Project URL" y "anon public" key.
// La anon key es pública por diseño (queda expuesta en el navegador); la seguridad
// real la dan las políticas de Row Level Security definidas en supabase/migrations/.
window.SUPABASE_CONFIG = {
  url: 'https://TU-PROYECTO.supabase.co',
  anonKey: 'TU-ANON-PUBLIC-KEY',
};
