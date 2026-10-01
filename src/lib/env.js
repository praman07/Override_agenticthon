const isProduction = process.env.NODE_ENV === 'production';

// Support both deployed Vercel URL and local development host seamlessly
const defaultClientUrl = isProduction ? 'https://overriderag.vercel.app' : 'http://localhost:3000';

const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: Number(process.env.PORT) || 3000,
    CLIENT_URL: process.env.CLIENT_URL || defaultClientUrl,
    COOKIE_NAME: process.env.COOKIE_NAME || 'token',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    MISTRALAI_API_KEY: process.env.MISTRALAI_API_KEY || process.env.MISTRAL_API_KEY || '',
    JWT_SECRET: process.env.JWT_SECRET || 'TOjRVUIilaeatr50ICcexGRF3Kz8XMrNnmocvuM66yQ',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genai_chatgpt',
    MONGODB_URI: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genai_chatgpt',
    VECTOR_DB_URL: process.env.VECTOR_DB_URL || '',
    VECTOR_DB_API_KEY: process.env.VECTOR_DB_API_KEY || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
};

export default env;
