// Fase 4: recibe las notificaciones de pago de Mercado Pago.
//
// Por seguridad nunca confiamos en los datos que trae la notificación en sí
// (se pueden falsificar): con el id de pago que llega, le volvemos a
// preguntar a la API de Mercado Pago (con el access token privado) cuál es
// el estado real del pago.
//
// Cuando el pago queda "aprobado" acá NO se marca el producto como vendido
// automáticamente: el pedido pasa a estado "aprobado" y aparece en la
// sección "Pedidos" del panel admin para que Isabel lo vea y lo marque como
// vendido ella misma (así evitamos vender el mismo producto dos veces si dos
// personas pagan casi al mismo tiempo).

const { MercadoPagoConfig, Payment } = require('mercadopago');
const { supabaseRequest } = require('./_lib/supabase');

function mapStatus(mpStatus) {
  if (mpStatus === 'approved') return 'aprobado';
  if (mpStatus === 'rejected' || mpStatus === 'cancelled') return 'rechazado';
  return 'pendiente';
}

module.exports = async function handler(req, res) {
  try {
    const paymentId = req.body?.data?.id || req.query?.['data.id'] || req.query?.id;
    const type = req.body?.type || req.query?.type || req.query?.topic;

    // Mercado Pago también manda notificaciones de otros tipos (merchant_order,
    // etc.) y un ping de prueba al configurar la URL. Las ignoramos.
    if (!paymentId || (type && type !== 'payment')) {
      res.status(200).send('ok');
      return;
    }

    const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = await new Payment(mpClient).get({ id: paymentId });

    const orderId = payment.external_reference;
    if (orderId) {
      await supabaseRequest(`orders?id=eq.${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: mapStatus(payment.status),
          mp_payment_id: String(payment.id),
          buyer_name: [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(' ') || null,
          buyer_email: payment.payer?.email || null,
        }),
      });
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error('mercadopago-webhook error:', err);
    // Igual respondemos 200: si devolvemos error, Mercado Pago reintenta el
    // mismo webhook muchas veces seguidas.
    res.status(200).send('ok');
  }
};
