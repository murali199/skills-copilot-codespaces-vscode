// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

// Create server
const app = express();
// Use body-parser
app.use(bodyParser.json());
// Use cors
app.use(cors());

// Create object to store comments
const commentsByPostId = {};

// Create route to get comments
app.get('/posts/:id/comments', (req, res) => {
  // Return comments
  res.send(commentsByPostId[req.params.id] || []);
});

// Create route to create comments
app.post('/posts/:id/comments', async (req, res) => {
  // Create id
  const commentId = randomBytes(4).toString('hex');
  // Get content and store it in commentsByPostId
  const { content } = req.body;
  // Get comments
  const comments = commentsByPostId[req.params.id] || [];
  // Push new comment
  comments.push({ id: commentId, content, status: 'pending' });
  // Store comments
  commentsByPostId[req.params.id] = comments;
  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });
  // Return comments
  res.status(201).send(comments);
});

// Create route to receive events
app.post('/events', async (req, res) => {
  // Get event
  const { type, data } = req.body;
  // Check if type is CommentModerated
  if (type === 'CommentModerated') {
    // Get comments
    const comments = commentsByPostId[data.postId];
    // Get comment
    const comment = comments.find((comment) => comment.id === data.id);
    // Update status
    comment.status = data.status;
    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id: data.id, content: data.content, postId: data.postId, status: data.status },
    });
  }
  // Send status
  res.send();

});