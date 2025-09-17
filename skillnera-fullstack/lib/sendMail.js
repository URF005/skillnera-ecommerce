import nodemailer from 'nodemailer';

export const sendMail = async (subject, receiver, body) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,               // Updated host
        port: process.env.SMTP_PORT,               // Updated port (465)
        secure: process.env.SMTP_SECURE === 'true', // Use 'true' for SSL (465)
        auth: {
            user: process.env.SMTP_USER,           // Updated email user
            pass: process.env.SMTP_PASS,           // Updated email password
        }
    });

    const options = {
        from: `"${process.env.FROM_NAME}" <${process.env.SMTP_USER}>`, // Updated sender info
        to: receiver || process.env.CONTACT_TO,    // Default to CONTACT_TO if no receiver is provided
        subject: subject,
        html: body
    };

    try {
        await transporter.sendMail(options);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};
