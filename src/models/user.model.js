import mongoose from 'mongoose';

/**
 * MongoDB user schema for authentication and profile metadata.
 * Supports both email/password and Google OAuth authentication.
 */
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 60,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: false,
            minlength: 6,
        },
        googleId: {
            type: String,
            default: null,
            sparse: true,
        },
        avatar: {
            type: String,
            default: null,
        },
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },
    },
    {
        timestamps: true,
    },
);

/**
 * User model used by auth controllers.
 */
if (mongoose.models && mongoose.models.User) {
    delete mongoose.models.User;
}

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;

