import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const PollPage = () => {
    const { id } = useParams();
    const [poll, setPoll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [hasVoted, setHasVoted] = useState(false);
    const [voting, setVoting] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchPoll();
        checkIfVoted();

        const interval = setInterval(() => {
            fetchPoll();
        }, 3000);

        return () => clearInterval(interval);
    }, [id]);

    const fetchPoll = async () => {
        try {
            // ✅ Using Environment Variable
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/polls/${id}`);
            setPoll(response.data);
        } catch (err) {
            setError('Failed to load poll. It may not exist.');
        } finally {
            setLoading(false);
        }
    };

    const checkIfVoted = () => {
        const voted = localStorage.getItem(`voted_poll_${id}`);
        if (voted) {
            setHasVoted(true);
        }
    };

    const handleOptionChange = (optionId) => {
        if (poll.allowMultiple) {
            if (selectedOptions.includes(optionId)) {
                setSelectedOptions(selectedOptions.filter(id => id !== optionId));
            } else {
                setSelectedOptions([...selectedOptions, optionId]);
            }
        } else {
            setSelectedOption(optionId);
        }
    };

    const handleVote = async () => {
        if (!selectedOption && selectedOptions.length === 0) return;

        setVoting(true);
        try {
            const optionsToVote = poll.allowMultiple ? selectedOptions : [selectedOption];

            let lastPollData = null;
            for (const optId of optionsToVote) {
                // ✅ Using Environment Variable
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/polls/${id}/vote`, {
                    optionId: optId,
                    sessionId: 'client_' + Math.random().toString(36).substr(2, 9)
                });
                if (response.data.success && response.data.poll) {
                    lastPollData = response.data.poll;
                }
            }

            localStorage.setItem(`voted_poll_${id}`, 'true');
            setHasVoted(true);

            if (lastPollData) {
                setPoll(lastPollData);
            } else {
                fetchPoll();
            }
        } catch (err) {
            console.error(err);
            setError('Failed to submit vote. You may have already voted.');
        } finally {
            setVoting(false);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const closePoll = async () => {
        if (!confirm('Are you sure you want to close this poll? User voting will no longer be possible.')) return;
        try {
            // ✅ Using Environment Variable
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/polls/${id}/close`);
            setPoll(response.data);
        } catch (err) {
            alert('Failed to close poll');
        }
    };

    if (loading) return <div className="loading-spinner">Loading...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!poll) return null;

    const totalVotes = poll.totalVotes;
    const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
    const showResults = hasVoted || poll.status === 'closed' || isExpired;
    const maxVotes = Math.max(...poll.options.map(o => o.votes));

    return (
        <div className="poll-page-container fade-in">
            <div className="card glass-effect">
                <h1 className="title gradient-text">{poll.question}</h1>

                {showResults ? (
                    <div className="results-container">
                        {poll.options.map(option => {
                            const percent = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
                            const isWinner = option.votes === maxVotes && maxVotes > 0;

                            return (
                                <div key={option.id} className={`result-row ${isWinner ? 'winner' : ''}`}>
                                    <div className="result-info">
                                        <span className="result-text">{option.text}</span>
                                        <span className="result-stat">{option.percentage ?? percent}% ({option.votes} votes)</span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${option.percentage ?? percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="poll-footer">
                            <p className="total-votes">Total Votes: {totalVotes}</p>
                            {isExpired && <p className="status-badge closed">Poll Closed</p>}
                        </div>

                        <div className="action-buttons">
                            <button className="secondary-button share-btn" onClick={handleShare}>
                                {copied ? 'Link Copied!' : 'Share Poll'}
                            </button>

                            {poll.status === 'active' && !isExpired && (
                                <button className="delete-btn close-poll-btn" onClick={closePoll} title="Close Poll">
                                    Close Poll
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="voting-container">
                        {poll.options.map(option => (
                            <label key={option.id} className={`vote-option ${(poll.allowMultiple ? selectedOptions.includes(option.id) : selectedOption === option.id)
                                ? 'selected' : ''
                                }`}>
                                <input
                                    type={poll.allowMultiple ? "checkbox" : "radio"}
                                    name="poll-option"
                                    value={option.id}
                                    checked={poll.allowMultiple ? selectedOptions.includes(option.id) : selectedOption === option.id}
                                    onChange={() => handleOptionChange(option.id)}
                                />
                                <span className="option-text">{option.text}</span>
                            </label>
                        ))}

                        <button
                            className="primary-button"
                            onClick={handleVote}
                            disabled={votesValid(poll.allowMultiple, selectedOption, selectedOptions) || voting}
                        >
                            {voting ? 'Voting...' : 'Vote'}
                        </button>

                        {isExpired && <p className="warning-text">This poll has expired.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

const votesValid = (allowMultiple, selectedOption, selectedOptions) => {
    if (allowMultiple) return selectedOptions.length === 0;
    return !selectedOption;
}

export default PollPage;