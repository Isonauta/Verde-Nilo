// Cliente REST mínimo para hablar con Supabase desde las funciones serverless,
// usando la service role key (nunca la anon key: esta ignora RLS a propósito,
// porque el público no tiene ninguna política de lectura/escritura sobre
// products/orders desde acá).
//
// No usamos el paquete @supabase/supabase-js para mantener las funciones
// livianas: PostgREST expone todo lo que necesitamos con fetch simple.

const SUPABASE_URL = 'https://dclyojjdgjnkwqxjvybx.supabase.co';

async function supabaseRequest(path, options = {}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY');
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase respondió ${res.status} en "${path}": ${await res.text()}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

module.exports = { supabaseRequest };
