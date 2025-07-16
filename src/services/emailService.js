const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    this.transporter = nodemailer.createTransport({  // <- CORREGIDO: createTransport
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Conexión de email verificada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error en la conexión de email:', error);
      return false;
    }
  }

  generateTemporaryPassword(length = 8) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  async sendPasswordResetEmail(email, temporaryPassword, userName) {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_EMAIL}>`,
      to: email,
      subject: 'Recuperación de Contraseña - Sistema de Cotización',
      html: this.getPasswordResetTemplate(temporaryPassword, userName)
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de recuperación enviado:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return { success: false, error: error.message };
    }
  }

  getPasswordResetTemplate(temporaryPassword, userName) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
            }
            .header { 
                background: #1a1a1a; 
                color: #d4af37; 
                padding: 20px; 
                text-align: center; 
                border-radius: 8px 8px 0 0; 
            }
            .content { 
                background: #f9f9f9; 
                padding: 30px; 
                border-radius: 0 0 8px 8px; 
                border: 1px solid #ddd; 
            }
            .password-box { 
                background: #fff; 
                border: 2px solid #d4af37; 
                padding: 15px; 
                text-align: center; 
                margin: 20px 0; 
                border-radius: 8px; 
            }
            .password { 
                font-size: 24px; 
                font-weight: bold; 
                color: #1a1a1a; 
                letter-spacing: 2px; 
            }
            .warning { 
                background: #fff3cd; 
                border: 1px solid #ffeaa7; 
                padding: 15px; 
                border-radius: 8px; 
                margin: 20px 0; 
            }
            .footer { 
                text-align: center; 
                margin-top: 30px; 
                color: #666; 
                font-size: 12px; 
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Sistema de Cotización</h1>
            <p>Perdomo y Asociados - Auditores y Consultores</p>
        </div>
        
        <div class="content">
            <h2>Recuperación de Contraseña</h2>
            
            <p>Hola <strong>${userName}</strong>,</p>
            
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Tu nueva contraseña temporal es:</p>
            
            <div class="password-box">
                <div class="password">${temporaryPassword}</div>
            </div>
            
            <div class="warning">
                <strong>⚠️ IMPORTANTE:</strong>
                <ul>
                    <li>Esta es una contraseña temporal</li>
                    <li><strong>Debes cambiarla inmediatamente</strong> después de iniciar sesión</li>
                    <li>Por seguridad, no compartas esta contraseña con nadie</li>
                    <li>Si no solicitaste este cambio, contacta al administrador del sistema</li>
                </ul>
            </div>
            
            <p><strong>Pasos a seguir:</strong></p>
            <ol>
                <li>Ingresa al sistema con tu usuario y esta contraseña temporal</li>
                <li>Ve inmediatamente a "Configuración de Usuario"</li>
                <li>Cambia tu contraseña por una nueva y segura</li>
            </ol>
            
            <p>Si tienes problemas para acceder, contacta al equipo de soporte.</p>
            
            <p>Saludos,<br>
            <strong>Equipo de Sistemas - Perdomo y Asociados</strong></p>
        </div>
        
        <div class="footer">
            <p>Este es un mensaje automático, por favor no responder a este email.</p>
            <p>© 2025 Perdomo y Asociados - Auditores y Consultores</p>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();