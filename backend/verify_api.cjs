const http = require('http');

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data ? JSON.parse(data) : {},
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function verifyAPI() {
    try {
        console.log('--- Verifying API Alignment ---');

        // 1. Create Poll
        console.log('\n1. Creating Poll...');
        const createRes = await request('POST', '/api/polls', {
            question: 'API Spec Test?',
            options: ['Yes', 'No'],
            allowMultiple: false
        });

        console.log('Create Response Code:', createRes.statusCode);
        const pollId = createRes.body.id;
        const shareUrl = createRes.body.shareUrl;

        if (!shareUrl || !shareUrl.includes(pollId)) {
            throw new Error(`shareUrl missing or incorrect: ${shareUrl}`);
        }
        console.log('shareUrl Verified:', shareUrl);

        // 2. Vote
        console.log(`\n2. Voting on Poll ${pollId}...`);
        const optionId = createRes.body.options[0].id;
        const voteRes = await request('POST', `/api/polls/${pollId}/vote`, {
            optionId: optionId,
            sessionId: 'verify_session_' + Date.now()
        });

        console.log('Vote Response Code:', voteRes.statusCode);
        const body = voteRes.body;

        if (!body.success || !body.poll) {
            console.log('Response Body:', JSON.stringify(body, null, 2));
            throw new Error('Vote response structure incorrect. Expected { success: true, poll: ... }');
        }

        const votedOption = body.poll.options.find(o => o.id === optionId);
        if (votedOption.percentage === undefined) {
            throw new Error('Percentage missing in vote response options');
        }
        console.log('Vote Response Verified: success=true, poll object present, percentage present');
        console.log(`Option Percentage: ${votedOption.percentage}%`);

        console.log('\n--- API Verification Passed ---');

    } catch (error) {
        console.error('Verification Failed:', error.message);
        process.exit(1);
    }
}

verifyAPI();
