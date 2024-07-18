import mongoose from "mongoose";

const Schema = mongoose.Schema;

const todoSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  textContent: {
    type: String,
    required: false,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: String,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
});

const todoModel = mongoose.model("Todo", todoSchema);
export default todoModel;
