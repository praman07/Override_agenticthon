import mongoose from 'mongoose';

/**
 * MongoDB user schema for authentication and profile metadata.
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
            required: true,
            minlength: 6,
        },
    },
    {
        timestamps: true,
    },
);

/**
 * User model used by auth controllers.
 */
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
