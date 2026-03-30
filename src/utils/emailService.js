const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendNotificationEmail = async (type, details, user) => {
  console.log(`[EMAIL_SERVICE] Initiating notification for type: ${type}`);
  try {
    const recipientsStr = process.env.NOTIFICATION_EMAILS || '';
    if (!recipientsStr) {
      console.warn('[EMAIL_SERVICE] WARNING: No NOTIFICATION_EMAILS defined in environment.');
      return false;
    }

    const recipients = recipientsStr.split(',').map(e => e.trim()).filter(e => e !== '');
    if (recipients.length === 0) {
      console.warn('[EMAIL_SERVICE] WARNING: Recipient list is empty after parsing.');
      return false;
    }
    
    console.log(`[EMAIL_SERVICE] Targeted Recipients: ${recipients.join(', ')}`);
    console.log(`[EMAIL_SERVICE] Using SMTP User: ${process.env.SMTP_USER}`);
    
    let subject = `Election Portal: New ${type} Submitted`;
    let html = `
      <div style="font-family: 'JetBrains Mono', monospace; background: #0a0b10; padding: 40px; color: #fff; border-radius: 20px; border: 1px solid #00ff9f;">
        <h2 style="color: #00ff9f; letter-spacing: 2px;">DEPLOYMENT_NOTIFICATION</h2>
        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-top: 20px;">
          <p style="color: #64748b; font-size: 0.8rem; margin: 0;">SOURCE_OPERATOR:</p>
          <p style="font-size: 1.1rem; font-weight: 800; margin: 5px 0 15px 0;">${user?.name || 'Unknown Operator'} (${user?.email || 'N/A'})</p>
          
          <p style="color: #64748b; font-size: 0.8rem; margin: 0;">MISSION_TYPE:</p>
          <p style="font-size: 1.1rem; font-weight: 800; margin: 5px 0 15px 0; color: #00ff9f;">${type.toUpperCase()}</p>
        </div>

        <div style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
          <p style="color: #64748b; font-size: 0.8rem; margin-bottom: 10px;">MISSION_INTEL_DUMP:</p>
          <div style="background: #000; padding: 15px; border-radius: 8px; border: 1px solid rgba(0,255,159,0.2); overflow-x: auto;">
            <pre style="color: #00ff9f; font-size: 0.85rem; margin: 0;">${JSON.stringify(details, null, 2)}</pre>
          </div>
        </div>

        <p style="color: #475569; font-size: 0.7rem; margin-top: 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
          THIS IS AN AUTOMATED SECURE TRANSMISSION. DO NOT REPLY.
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Tactical Command Center" <${process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject: subject,
      html: html
    });

    console.log('Operational notification dispatched:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email dispatch failure:', error);
    return false;
  }
};

module.exports = { sendNotificationEmail };
