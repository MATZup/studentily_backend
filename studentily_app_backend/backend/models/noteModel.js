import mongoose from "mongoose";

const Schema = mongoose.Schema;

const noteSchema = new Schema({
  title: {
    type: String,
    required: true,
  },

  textContent: {
    type: String,
    required: true,
  },

  tags: {
    type: [String],
    default: [],
  },

  isPinned: {
    type: Boolean,
    default: false,
  },

  userId: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: new Date().getTime(),
  },
});

const noteModel = mongoose.model("Note", noteSchema);
export default noteModel;
