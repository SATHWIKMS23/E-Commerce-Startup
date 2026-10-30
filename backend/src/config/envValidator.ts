import 'dotenv/config';

export const validateEnv = () => {
    const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';

    const requiredEnv = [
        'DATABASE_URL',
        'JWT_SECRET_KEY',
        'GOOGLE_CLIENT_ID',
        'PAYMENT_GATEWAY',
        'CUSTOMER_FRONTEND_URL',
        'SELLER_FRONTEND_URL',
        'ADMIN_FRONTEND_URL'
    ];

    const missing = requiredEnv.filter(name => !process.env[name]);

    // DIRECT_URL is required in production so Prisma Migrate/CLI can reach the
    // database directly (Neon pooled endpoints cannot run migrations). In
    // development only, the runtime falls back to DATABASE_URL (see prisma.ts).
    if (isProduction && !process.env.DIRECT_URL) {
        console.error("FATAL: Missing environment variable DIRECT_URL. Expected a Neon direct connection string.");
        process.exit(1);
    }

    const gateway = (process.env.PAYMENT_GATEWAY || '').toUpperCase();
    if (gateway === 'RAZORPAY') {
        if (!process.env.RAZORPAY_KEY_ID) missing.push('RAZORPAY_KEY_ID');
        if (!process.env.RAZORPAY_KEY_SECRET) missing.push('RAZORPAY_KEY_SECRET');
        if (!process.env.RAZORPAY_WEBHOOK_SECRET) missing.push('RAZORPAY_WEBHOOK_SECRET');
    } else if (gateway === 'PHONEPE') {
        if (!process.env.PHONEPE_MERCHANT_ID) missing.push('PHONEPE_MERCHANT_ID');
        if (!process.env.PHONEPE_SALT_KEY) missing.push('PHONEPE_SALT_KEY');
    }

    const provider = (process.env.DELIVERY_PROVIDER || '').toUpperCase();
    if (provider === 'PORTER') {
        if (!process.env.PORTER_API_KEY) missing.push('PORTER_API_KEY');
        if (!process.env.PORTER_API_URL) missing.push('PORTER_API_URL');
        if (!process.env.PORTER_WEBHOOK_SECRET) missing.push('PORTER_WEBHOOK_SECRET');
    }

    if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_BUCKET_NAME) {
        if (!process.env.AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
        if (!process.env.AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');
        if (!process.env.AWS_REGION) missing.push('AWS_REGION');
        if (!process.env.S3_BUCKET_NAME) missing.push('S3_BUCKET_NAME');
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
    if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');

    if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
    if (!process.env.EMAIL_FROM) missing.push('EMAIL_FROM');

    if (process.env.REDIS_URL) {
        try {
            const parsed = new URL(process.env.REDIS_URL);
            if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
                console.error("FATAL: Invalid REDIS_URL protocol. Expected redis:// or rediss://");
                process.exit(1);
            }
        } catch {
            console.error("FATAL: Malformed REDIS_URL provided.");
            process.exit(1);
        }
    } else if (isProduction) {
        console.warn("[EnvValidator] Notice: REDIS_URL not configured. Shared caching and cross-process Pub/Sub will run in fallback mode.");
    }

    if (missing.length > 0) {
        console.error(`FATAL: Missing required environment variables on startup: ${missing.join(', ')}`);
        process.exit(1);
    }
};
