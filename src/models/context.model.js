import mongoose from "mongoose";

const contextSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    context: {
        type: String,
        required: true
    }
});

const Context = mongoose.models.Context || mongoose.model("Context", contextSchema);

export default Context;
