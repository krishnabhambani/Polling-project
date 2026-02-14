import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreatePoll = () => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState([{ text: '' }, { text: '' }]);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [expiresAt, setExpiresAt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Debugging: This will show you exactly what Vercel "sees" in the browser console
    console.log('Current API URL:', import.meta.env.VITE_API_URL);

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index].text = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, { text: '' }]);
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Basic validation
        if (!question.trim()) {
            setError('Question is required');
            setLoading(false);
            return;
        }
        const validOptions = options.map(o => o.text.trim()).filter(text => text.length > 0);
        if (validOptions.length < 2) {
            setError('At least 2 valid options are required');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                question,
                options: validOptions,
                allowMultiple,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
            };

            // ✅ Using Environment Variable
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/polls`, payload);
            const { id } = response.data;
            navigate(`/poll/${id}`);
        } catch (err) {
            console.error('Error creating poll:', err);
            setError('Failed to create poll. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-poll-container fade-in">
            <div className="card glass-effect">
                <h1 className="title gradient-text">Create a Poll</h1>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="question">Question</label>
                        <input
                            type="text"
                            id="question"
                            className="input-field"
                            placeholder="What would you like to ask?"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Options</label>
                        {options.map((option, index) => (
                            <div key={index} className="option-row">
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder={`Option ${index + 1}`}
                                    value={option.text}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    required
                                />
                                {options.length > 2 && (
                                    <button
                                        type="button"
                                        className="icon-button delete-btn"
                                        onClick={() => removeOption(index)}
                                        aria-label="Remove option"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" className="text-button" onClick={addOption}>
                            + Add Option
                        </button>
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={allowMultiple}
                                onChange={(e) => setAllowMultiple(e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            Allow multiple selections
                        </label>
                    </div>

                    <div className="form-group">
                        <label htmlFor="expiresAt">Expires At (Optional)</label>
                        <input
                            type="datetime-local"
                            id="expiresAt"
                            className="input-field"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="primary-button" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Poll'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreatePoll;