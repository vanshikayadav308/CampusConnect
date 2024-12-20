const nodemailer = require('nodemailer');

// Configure transporter with Mailtrap
const transporter = nodemailer.createTransport({
  host: 'smtp.mailtrap.io', // Mailtrap host
  port: 2525, // Mailtrap port
  auth: {
    user: 'your-mailtrap-username', // Replace with your Mailtrap username
    pass: 'your-mailtrap-password', // Replace with your Mailtrap password
  },
});

// Function to send email
async function sendEmail(to, subject, htmlContent) {
  try {
    await transporter.sendMail({
      from: '"CampusConnect" <no-reply@campusconnect.com>', // Sender address
      to, // Recipient email
      subject, // Subject line
      html: htmlContent, // HTML content
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Error sending email:', err.message);
  }
}

module.exports = sendEmail;
