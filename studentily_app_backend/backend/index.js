import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import tokenAuth from "./helper.js";
import userModel from "./models/userModel.js";
import noteModel from "./models/noteModel.js";
import journalModel from "./models/journalModel.js";
import bcrypt from "bcrypt";
import todoModel from "./models/todoModel.js";

dotenv.config();

const server = express();

const port = process.env.PORT || 8000;

server.use(express.json());
server.use(
  cors({
    origin: ["https://studentily.com"],
    credentials: true,
  })
);

server.get("/", (req, res) => {
  res.send("läuft ok");
});

// Create Account (register)
server.post("/create-account", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username) {
      return res
        .status(400)
        .json({ error: true, message: "Please type in your complete name" });
    }

    if (!email) {
      return res
        .status(400)
        .json({ error: true, message: "Please type in your E-Mail" });
    }

    if (!password) {
      return res
        .status(400)
        .json({ error: true, message: "Please type in your password" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const isUser = await userModel.findOne({ email: email });

    if (isUser) {
      return res.json({
        error: true,
        message: "Username already exists",
      });
    }

    const user = new userModel({ username, email, password: hashedPassword });

    await user.save();

    const secretToken = jwt.sign({ user }, process.env.SECRET_KEY, {
      expiresIn: "20d",
    });

    return res.json({
      error: false,
      user,
      secretToken,
      message: "Your registration was successful",
    });
  } catch (error) {
    console.error("Error creating account:", error);
    return res
      .status(500)
      .json({ error: true, message: "Failed to create account" });
  }
});

// Delete User
server.delete("/delete-account", tokenAuth, async (req, res) => {
  try {
    const userId = req.user.user._id;
    await userModel.findByIdAndDelete(userId);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Error deleting account" });
  }
});

// Get User
server.get("/get-user", tokenAuth, async (req, res) => {
  const { user } = req.user;

  const isUser = await userModel.findOne({ _id: user._id });

  if (!isUser) {
    return res.sendStatus(401);
  }

  return res.json({
    user: {
      username: isUser.username,
      email: isUser.email,
      _id: isUser._id,
      createdAt: isUser.createdAt,
    },
    message: "",
  });
});

// Login
server.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Please enter your email" });
  }

  if (!password) {
    return res.status(400).json({ message: "Please enter your password" });
  }

  try {
    const userInformation = await userModel.findOne({ email: email });

    if (!userInformation) {
      return res.status(400).json({ message: "User could not be found" });
    }

    // Passwort mit bcrypt.compare testen
    const isPasswordValid = await bcrypt.compare(
      password,
      userInformation.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Passwort ist gültig, JWT-Token generieren
    const user = { user: userInformation };
    const secretToken = jwt.sign(user, process.env.SECRET_KEY, {
      expiresIn: "20d",
    });

    return res.json({
      error: false,
      message: "Login was successful",
      email,
      secretToken,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Failed to log in" });
  }
});

// JOURNAL

// Create Journal
server.post("/create-journal-unit", tokenAuth, async (req, res) => {
  const { title, textContent, tags } = req.body;
  const { user } = req.user;

  if (!title) {
    return res
      .status(400)
      .json({ error: true, message: "Please enter a title" });
  }

  if (!textContent) {
    return res
      .status(400)
      .json({ error: true, message: "Please enter some content" });
  }

  try {
    const journalUnit = new journalModel({
      title,
      textContent,
      tags: tags || [],
      userId: user._id,
    });

    await journalUnit.save();

    return res.json({
      error: false,
      journalUnit,
      message: "Journal-Unit was created, success!",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Ops, Server Error",
    });
  }
});

// edit journal unit
server.patch("/edit-journal-unit/:journalId", tokenAuth, async (req, res) => {
  const journalId = req.params.journalId;
  const { title, textContent, tags, isPinned } = req.body;
  const { user } = req.user;

  if (!title && !textContent && !tags) {
    return res
      .status(400)
      .json({ error: true, message: "No changes were made" });
  }

  try {
    const journalUnit = await journalModel.findOne({
      _id: journalId,
      userId: user._id,
    });

    if (!journalUnit) {
      return res
        .status(404)
        .json({ error: true, message: "Journal-Unit could not be found" });
    }
    if (title) {
      journalUnit.title = title;
    }
    if (textContent) {
      journalUnit.textContent = textContent;
    }

    if (tags) {
      journalUnit.tags = tags;
    }

    if (isPinned) {
      journalUnit.isPinned = isPinned;
    }

    await journalUnit.save();

    return res.json({
      error: false,
      journalUnit,
      message: "Journal-Unit was updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: "Ops, Server Error" });
  }
});

// get all Journal-Units
server.get("/get-all-journal-units/", tokenAuth, async (req, res) => {
  const { user } = req.user;

  try {
    const journalUnits = await journalModel
      .find({ userId: user._id })
      .sort({ isPinned: -1 });

    return res.json({
      error: false,
      journalUnits,
      message: "All Journal-Units successfully received",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Ops, Server Error",
    });
  }
});

// delete journal unit
server.delete(
  "/delete-journal-unit/:journalId",
  tokenAuth,
  async (req, res) => {
    const journalId = req.params.journalId;
    const { user } = req.user;

    try {
      const journalUnit = await journalModel.findOne({
        _id: journalId,
        userId: user._id,
      });

      if (!journalUnit) {
        return res
          .status(404)
          .json({ error: true, message: "Journal-Unit could not be found" });
      }

      await journalModel.deleteOne({ _id: journalId, userId: user._id });

      return res.json({
        error: false,
        message: "Journal-Unit deleted, success!",
      });
    } catch (error) {
      return res.status(500).json({
        error: true,
        message: "Ops, Server Error",
      });
    }
  }
);

// pin Journal-Units
server.patch(
  "/update-pinned-journal-unit/:journalId",
  tokenAuth,
  async (req, res) => {
    const journalId = req.params.journalId;
    const { isPinned } = req.body;
    const { user } = req.user;

    try {
      const journalUnit = await journalModel.findOne({
        _id: journalId,
        userId: user._id,
      });

      if (!journalUnit) {
        return res
          .status(404)
          .json({ error: true, message: "Journal-Unit could not be found" });
      }

      journalUnit.isPinned = isPinned;

      await journalUnit.save();

      return res.json({
        error: false,
        journalUnit,
        message: "Journal-Unit was updated successfully",
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: true, message: "Ops, Server Error" });
    }
  }
);

// NOTES

// Create note
server.post("/create-note", tokenAuth, async (req, res) => {
  const { title, textContent, tags } = req.body;
  const { user } = req.user;

  if (!title) {
    return res
      .status(400)
      .json({ error: true, message: "Please enter a title" });
  }

  if (!textContent) {
    return res
      .status(400)
      .json({ error: true, message: "Please enter some content" });
  }

  try {
    const note = new noteModel({
      title,
      textContent,
      tags: tags || [],
      userId: user._id,
    });

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note was created, success!",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Ops, Server Error",
    });
  }
});

// edit note
server.patch("/edit-note/:noteId", tokenAuth, async (req, res) => {
  const noteId = req.params.noteId;
  const { title, textContent, tags, isPinned } = req.body;
  const { user } = req.user;

  if (!title && !textContent && !tags) {
    return res
      .status(400)
      .json({ error: true, message: "No changes were made" });
  }

  try {
    const note = await noteModel.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res
        .status(404)
        .json({ error: true, message: "Note could not be found" });
    }
    if (title) {
      note.title = title;
    }
    if (textContent) {
      note.textContent = textContent;
    }

    if (tags) {
      note.tags = tags;
    }

    if (isPinned) {
      note.isPinned = isPinned;
    }

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note was updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: "Ops, Server Error" });
  }
});

// get all notes
server.get("/get-all-notes/", tokenAuth, async (req, res) => {
  const { user } = req.user;

  try {
    const notes = await noteModel
      .find({ userId: user._id })
      .sort({ isPinned: -1 });

    return res.json({
      error: false,
      notes,
      message: "All notes successfully received",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Ops, Server Error",
    });
  }
});

// delete note
server.delete("/delete-note/:noteId", tokenAuth, async (req, res) => {
  const noteId = req.params.noteId;
  const { user } = req.user;

  try {
    const note = await noteModel.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res
        .status(404)
        .json({ error: true, message: "Note could not be found" });
    }

    await noteModel.deleteOne({ _id: noteId, userId: user._id });

    return res.json({
      error: false,
      message: "Note deleted, success!",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Ops, Server Error",
    });
  }
});

// pin note
server.patch("/update-pinned-note/:noteId", tokenAuth, async (req, res) => {
  const noteId = req.params.noteId;
  const { isPinned } = req.body;
  const { user } = req.user;

  try {
    const note = await noteModel.findOne({ _id: noteId, userId: user._id });

    if (!note) {
      return res
        .status(404)
        .json({ error: true, message: "Note could not be found" });
    }

    note.isPinned = isPinned;

    await note.save();

    return res.json({
      error: false,
      note,
      message: "Note was updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: "Ops, Server Error" });
  }
});

// TODOS

// Create Todo
server.post("/create-todo", tokenAuth, async (req, res) => {
  const { title, textContent } = req.body;
  const { user } = req.user;

  if (!title) {
    return res
      .status(400)
      .json({ error: true, message: "Please enter a Todo" });
  }

  try {
    const todo = new todoModel({
      title,
      textContent,
      userId: user._id,
      isCompleted: false, // Standardmäßig nicht abgeschlossen
    });

    await todo.save();

    return res.json({
      error: false,
      todo,
      message: "Todo was created, success!",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Ops, Server Error",
    });
  }
});

// Edit Todo
server.patch("/edit-todo/:todoId", tokenAuth, async (req, res) => {
  const todoId = req.params.todoId;
  const { title, textContent, isPinned } = req.body;
  const { user } = req.user;

  if (!title && !textContent && isPinned === undefined) {
    return res
      .status(400)
      .json({ error: true, message: "No changes were made" });
  }

  try {
    const todo = await todoModel.findOne({ _id: todoId, userId: user._id });

    if (!todo) {
      return res
        .status(404)
        .json({ error: true, message: "Todo could not be found" });
    }

    if (title) {
      todo.title = title;
    }
    if (textContent !== undefined) {
      todo.textContent = textContent;
    }

    if (isPinned !== undefined) {
      todo.isPinned = isPinned;
    }

    await todo.save();

    return res.json({
      error: false,
      todo,
      message: "Todo was updated successfully",
    });
  } catch (error) {
    console.error("Error updating todo:", error);
    return res.status(500).json({ error: true, message: "Ops, Server Error" });
  }
});

// Get all Todos
server.get("/get-all-todos/", tokenAuth, async (req, res) => {
  const { user } = req.user;

  try {
    const todos = await todoModel
      .find({ userId: user._id })
      .sort({ isPinned: -1 });

    return res.json({
      error: false,
      todos,
      message: "All todos successfully received",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Ops, Server Error",
    });
  }
});

// Delete Todo
server.delete("/delete-todo/:todoId", tokenAuth, async (req, res) => {
  const todoId = req.params.todoId;
  const { user } = req.user;

  try {
    const todo = await todoModel.findOne({ _id: todoId, userId: user._id });

    if (!todo) {
      return res
        .status(404)
        .json({ error: true, message: "Todo could not be found" });
    }

    await todoModel.deleteOne({ _id: todoId, userId: user._id });

    return res.json({
      error: false,
      message: "Todo deleted, success!",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Ops, Server Error",
    });
  }
});

// Pin Todo
server.patch("/update-pinned-todo/:todoId", tokenAuth, async (req, res) => {
  const todoId = req.params.todoId;
  const { isPinned } = req.body;
  const { user } = req.user;

  try {
    const todo = await todoModel.findOne({ _id: todoId, userId: user._id });

    if (!todo) {
      return res
        .status(404)
        .json({ error: true, message: "Todo could not be found" });
    }

    todo.isPinned = isPinned;

    await todo.save();

    return res.json({
      error: false,
      todo,
      message: "Todo was updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: "Ops, Server Error" });
  }
});

// Route zum Markieren eines Todos als abgeschlossen
server.patch("/todos/:todoId/mark-completed", tokenAuth, async (req, res) => {
  const { todoId } = req.params;
  const { user } = req.user;

  try {
    const updatedTodo = await todoModel.findOneAndUpdate(
      { _id: todoId, userId: user._id },
      { isCompleted: true },
      { new: true }
    );

    if (!updatedTodo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json({ todo: updatedTodo });
  } catch (error) {
    console.error(`Error marking todo ${todoId} as completed:`, error);
    res
      .status(500)
      .json({ error: "An error occurred while marking todo as completed" });
  }
});

// Route zum Markieren eines Todos als nicht erledigt
server.patch("/todos/:todoId/mark-uncompleted", tokenAuth, async (req, res) => {
  const { todoId } = req.params;
  const { user } = req.user;

  try {
    const updatedTodo = await todoModel.findOneAndUpdate(
      { _id: todoId, userId: user._id },
      { isCompleted: false },
      { new: true }
    );

    if (!updatedTodo) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json({ todo: updatedTodo });
  } catch (error) {
    console.error(`Error marking todo ${todoId} as uncompleted:`, error);
    res
      .status(500)
      .json({ error: "An error occurred while marking todo as uncompleted" });
  }
});

mongoose
  .connect(process.env.MONGODB_CONNECTION, { useNewUrlParser: true })
  .then(() => {
    server.listen(port, () => {
      console.log(`Server listen - Port: ${port}`);
    });
  })
  .catch((err) => {
    throw new Error(err);
  });

export default server;
