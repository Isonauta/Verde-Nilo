// Configuración de conexión a Supabase, compartida por el panel admin y la tienda.
//
// Reemplaza los dos valores de abajo por los de TU proyecto:
// Supabase Dashboard > Project Settings > API > "Project URL" y "anon public" key.
// La anon key es pública por diseño (queda expuesta en el navegador); la seguridad
// real la dan las políticas de Row Level Security definidas en supabase/migrations/.
window.SUPABASE_CONFIG = {
  url: 'https://dclyojjdgjnkwqxjvybx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbHlvampkZ2pua3dxeGp2eWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjAyODYsImV4cCI6MjEwMzU5NjI4Nn0.taAkmcegDxUioWniW1gPguZq0PHnENrvYied8CJgEho',
};
