const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create transporter based on environment
const createTransporter = () => {
  // If no email credentials configured, return null (emails will be logged only)
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
    return null;
  }

  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
    });
  }

  // Development with configured credentials
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
  });
};

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Send an email
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transport = getTransporter();
    if (!transport) {
      logger.info(`Email not sent (no SMTP configured): to=${to}, subject=${subject}`);
      return { success: true, messageId: 'dev-no-smtp', skipped: true };
    }
    const mailOptions = {
      from: `"HouseWise" <${process.env.EMAIL_USER || 'noreply@housewise.in'}>`,
      to,
      subject,
      html,
      text: text || subject,
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`Email sent to ${to}`, { messageId: info.messageId });

    // In dev, log Ethereal preview URL
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`Email preview: ${previewUrl}`);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email send failed:', { error: error.message, to, subject });
    return { success: false, error: error.message };
  }
};

/**
 * Email templates
 */
const templates = {
  verification: (name, verificationUrl) => ({
    subject: 'Verify your HouseWise account',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff3cac; font-size: 28px; margin: 0;">HouseWise</h1>
        </div>
        <h2 style="color: #333; font-size: 22px;">Welcome, ${name}!</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Thank you for joining HouseWise. Please verify your email address to activate your account.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: linear-gradient(to right, #ff3cac, #784ba0); color: white; padding: 14px 32px; border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">
          This link expires in 24 hours. If you didn't create an account, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} HouseWise. All rights reserved.
        </p>
      </div>
    `,
  }),

  forgotPassword: (name, resetUrl) => ({
    subject: 'Reset your HouseWise password',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff3cac; font-size: 28px; margin: 0;">HouseWise</h1>
        </div>
        <h2 style="color: #333; font-size: 22px;">Password Reset Request</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Hi ${name}, we received a request to reset your password. Click the button below to create a new password.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(to right, #ff3cac, #784ba0); color: white; padding: 14px 32px; border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">
          This link expires in 1 hour. If you didn't request this, please ignore this email — your password won't change.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} HouseWise. All rights reserved.
        </p>
      </div>
    `,
  }),

  passwordChanged: (name) => ({
    subject: 'Your HouseWise password was changed',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff3cac; font-size: 28px; margin: 0;">HouseWise</h1>
        </div>
        <h2 style="color: #333; font-size: 22px;">Password Changed</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Hi ${name}, your password was successfully changed. If you didn't make this change, please contact support immediately.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} HouseWise. All rights reserved.
        </p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, templates };
