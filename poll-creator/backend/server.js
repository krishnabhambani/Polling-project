const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// In-memory data store
let polls = [];

// Helper function to generate unique IDs
const generateId = (prefix = 'id') => {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
};

// Root route
app.get('/', (req, res) => {
    res.send('Poll Creator API is running. Access the frontend at http://localhost:5173');
});

// GET /api/polls/:id
app.get('/api/polls/:id', (req, res) => {
    const poll = polls.find(p => p.id === req.params.id);
    if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
    }
    res.json(poll);
});

// POST /api/polls
app.post('/api/polls', (req, res) => {
    const { question, options, allowMultiple, expiresAt } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Question and at least 2 options are required' });
    }

    const id = generateId('poll');
    const newPoll = {
        id,
        question,
        options: options.map(opt => ({
            id: generateId('opt'),
            text: opt,
            votes: 0
        })),
        allowMultiple: !!allowMultiple,
        totalVotes: 0,
        voters: [], // Stores session IDs or IPs
        status: 'active',
        createdAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        shareUrl: `/poll/${id}`
    };

    polls.push(newPoll);
    res.status(201).json(newPoll);
});

// POST /api/polls/:id/vote
app.post('/api/polls/:id/vote', (req, res) => {
    const { optionId, sessionId } = req.body;
    const pollId = req.params.id;
    const voterId = sessionId || req.ip; // Fallback to IP if no session ID provided

    const pollIndex = polls.findIndex(p => p.id === pollId);
    if (pollIndex === -1) {
        return res.status(404).json({ error: 'Poll not found' });
    }

    const poll = polls[pollIndex];

    if (poll.status !== 'active') {
        return res.status(400).json({ error: 'Poll is closed' });
    }

    if (poll.expiresAt && new Date() > new Date(poll.expiresAt)) {
        poll.status = 'closed';
        return res.status(400).json({ error: 'Poll has expired' });
    }

    if (poll.voters.includes(voterId)) {
        return res.status(403).json({ error: 'You have already voted on this poll' });
    }

    const optionIndex = poll.options.findIndex(o => o.id === optionId);
    if (optionIndex === -1) {
        return res.status(404).json({ error: 'Option not found' });
    }

    // Update vote counts
    poll.options[optionIndex].votes += 1;
    poll.totalVotes += 1;
    poll.voters.push(voterId);

    // Calculate percentages for response
    const optionsWithStats = poll.options.map(opt => ({
        ...opt,
        percentage: poll.totalVotes === 0 ? 0 : Math.round((opt.votes / poll.totalVotes) * 100)
    }));

    res.json({
        success: true,
        poll: {
            ...poll,
            options: optionsWithStats
        }
    });
});

// POST /api/polls/:id/close
app.post('/api/polls/:id/close', (req, res) => {
    const pollId = req.params.id;
    const pollIndex = polls.findIndex(p => p.id === pollId);

    if (pollIndex === -1) {
        return res.status(404).json({ error: 'Poll not found' });
    }

    polls[pollIndex].status = 'closed';
    res.json(polls[pollIndex]);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
