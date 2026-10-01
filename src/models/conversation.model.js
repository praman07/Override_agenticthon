import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    isPinned: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

conversationSchema.index({ user: 1, isPinned: -1, updatedAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

export default Conversation;
