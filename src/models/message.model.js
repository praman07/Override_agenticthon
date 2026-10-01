import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    author: {
        type: String,
        enum: [ 'user', 'ai' ],
        default: 'user',
    },
    content: {
        type: String,
        default: ''
    },
    attachments: [
        {
            type: {
                type: String,
                enum: ['image', 'document'],
                required: true,
            },
            url: { type: String, required: true },
            name: { type: String, required: true },
            mimeType: { type: String, required: true },
            extractedText: { type: String, default: '' },
        }
    ],
    sources: [
        {
            chunkId: { type: String, default: '' },
            paperTitle: { type: String, default: '' },
            pageNumber: { type: Number, default: null },
            score: { type: Number, default: 0 },
            text: { type: String, default: '' },
        }
    ],
    taggedDocument: {
        id: { type: String, default: null },
        title: { type: String, default: null },
    }
}, {
    timestamps: true
});

messageSchema.index({ conversation: 1, createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;
