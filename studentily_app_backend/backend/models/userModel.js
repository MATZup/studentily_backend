import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
  },

  email: {
    type: String,
  },

  password: {
    type: String,
  },

  createdAt: {
    type: Date,
    default: new Date().getTime(),
  },
});

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
