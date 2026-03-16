// fichier backend/src/modules/mailer/mailer.service.ts
import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../shared/utils/logger';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
});

export interface OrderConfirmationData {
  customerEmail: string;
  customerName: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  totalCents: number;
  address: string;
}

export async function sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    const shopName = env.SHOP_NAME;
    const shopDescription = env.SHOP_DESCRIPTION;
    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
      <div style="background:grey;padding:30px;text-align:center">
        <h1 style="color:white;margin:0">${shopName}</h1>
      </div>
      <div style="padding:30px">
        <h2>Bonjour ${data.customerName},</h2>
        <p>Merci pour votre commande !</p>
        
        <div style="background:#f9f9f9;padding:15px;border-radius:8px;margin:20px 0">
          <strong>Référence commande :</strong> #${data.orderId}
        </div>

        <h3>Détail de votre commande</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f9f9f9">
              <th style="padding:12px;text-align:left">Article</th>
              <th style="padding:12px;text-align:center">Qté</th>
              <th style="padding:12px;text-align:right">Prix unitaire</th>
            </tr>
          </thead>
          <tbody>
	  ${data.items.map(item =>
          `<tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${item.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${(item.unitPrice / 100).toFixed(2)} €</td>
          </tr>`).join('')}
	  </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:12px;text-align:right;font-weight:bold">Total :</td>
              <td style="padding:12px;text-align:right;font-weight:bold;color:#b5838d;font-size:1.2em">
                ${(data.totalCents / 100).toFixed(2)} €
              </td>
            </tr>
          </tfoot>
        </table>

        <h3>Adresse de livraison</h3>
        <p style="background:#f9f9f9;padding:15px;border-radius:8px">${data.address.replace(/\n/g, '<br>')}</p>
        <p>À bientôt avec ${shopName}</p>
      </div>
      <div style="background:#f0e6e8;padding:15px;text-align:center;font-size:0.85em;color:#888">
        ${shopName} — ${shopDescription}
      </div>
    </body>
    </html>
    `;

const text = `
    ${shopName}
    
    Bonjour ${data.customerName},
    
    Merci pour votre commande !
    Référence : #${data.orderId}
    
    Détail de votre commande :
    ${data.items.map(item => `- ${item.name} x${item.quantity} : ${(item.unitPrice / 100).toFixed(2)} €`).join('\n')}
    
    Total : ${(data.totalCents / 100).toFixed(2)} €
    
    Adresse de livraison :
    ${data.address}
    
    À bientôt avec ${shopName}
    `;

console.log('mailer.service.ts adresse=', data.address );

   try {
    await transporter.sendMail({
    from: `"${shopName}" <${env.GMAIL_USER}>`,
    to: data.customerEmail,
    subject: `Confirmation de la commande #${data.orderId}`,
    html,
    text,
    });
    logger.info('Email envoyé', { orderId: data.orderId, email: data.customerEmail });
    return (true);
   } catch (error: any) {
     logger.error('Email problème', { orderId: data.orderId, error: error.message });
     return (false);
// Ne pas rejeter → la commande reste valide??
   }

}


