// Fase 4: crea una preferencia de pago de Mercado Pago (Checkout Pro) para
// un producto y devuelve la URL a la que hay que redirigir al comprador.
//
// Requiere la variable de entorno MP_ACCESS_TOKEN (Access Token de Mercado
// Pago, de prueba o de producción) configurada en Vercel.

const { MercadoPagoConfig, Preference } = require('mercadopago');
const { supabaseRequest } = require('./_lib/supabase');

const SITE_URL = 'https://verdenilo.cl';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { productId } = req.body || {};
  if (!productId) {
    res.status(400).json({ error: 'Falta productId' });
    return;
  }

  try {
    const products = await supabaseRequest(
      `products?id=eq.${encodeURIComponent(productId)}&select=id,name,price,status`
    );
    const product = products[0];
    if (!product || product.status !== 'disponible') {
      res.status(404).json({ error: 'Ese producto ya no está disponible' });
      return;
    }

    // Se crea primero el pedido en "pendiente" para tener un id propio que
    // usar como external_reference y así poder identificar el pago cuando
    // llegue el webhook.
    const [order] = await supabaseRequest('orders', {
      method: 'POST',
      body: JSON.stringify({
        product_id: product.id,
        product_name: product.name,
        amount: product.price,
        status: 'pendiente',
      }),
    });

    const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = await new Preference(mpClient).create({
      body: {
        items: [
          {
            id: product.id,
            title: product.name,
            quantity: 1,
            unit_price: product.price,
            currency_id: 'CLP',
          },
        ],
        external_reference: order.id,
        back_urls: {
          success: `${SITE_URL}/?pago=exito`,
          pending: `${SITE_URL}/?pago=pendiente`,
          failure: `${SITE_URL}/?pago=error`,
        },
        auto_return: 'approved',
        notification_url: `${SITE_URL}/api/mercadopago-webhook`,
      },
    });

    await supabaseRequest(`orders?id=eq.${order.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ mp_preference_id: preference.id }),
    });

    res.status(200).json({ init_point: preference.init_point });
  } catch (err) {
    console.error('create-preference error:', err);
    res.status(500).json({ error: 'No se pudo iniciar el pago. Intenta de nuevo.' });
  }
};
