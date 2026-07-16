const WA_API_URL = 'https://graph.facebook.com/v23.0';

const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID || '';
const WA_ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN || '';
const NOTIFY_PHONE = '2347054867749';

interface BookingNotification {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceCategory: string;
  pkg: string;
  description: string;
}

export async function sendBookingWhatsApp(booking: BookingNotification): Promise<void> {
  if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID) {
    console.warn('WhatsApp notification skipped: WA_ACCESS_TOKEN or WA_PHONE_NUMBER_ID not set');
    return;
  }

  const catLabel = booking.serviceCategory === 'web-development' ? 'Web Development' : 'Graphics Design';

  const body = [
    '📋 *New Booking Alert*',
    '',
    `*Client:* ${booking.clientName}`,
    `*Email:* ${booking.clientEmail}`,
    `*Phone:* ${booking.clientPhone}`,
    `*Category:* ${catLabel}`,
    `*Package:* ${booking.pkg || 'N/A'}`,
    '',
    '*Description:*',
    booking.description.slice(0, 500),
  ].join('\n');

  try {
    const res = await fetch(`${WA_API_URL}/${WA_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: NOTIFY_PHONE,
        type: 'text',
        text: { body },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('WhatsApp API error:', JSON.stringify(data));
      return;
    }

    console.log('WhatsApp notification sent:', data.messages?.[0]?.id);
  } catch (err: any) {
    console.error('WhatsApp notification failed:', err.message);
  }
}
