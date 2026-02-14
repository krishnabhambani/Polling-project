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

async function runTests() {
    try {
        console.log('--- Testing Backend API ---');

        // 1. Create Poll
        console.log('\n1. Creating Poll...');
        const createRes = await request('POST', '/api/polls', {
            question: 'Favorite Language?',
            options: ['JavaScript', 'Python'],
            allowMultiple: false
        });
        console.log('Create Response:', createRes.statusCode, createRes.body);
        const pollId = createRes.body.id;
        const optionId = createRes.body.options[0].id;

        if (!pollId || !createRes.body.shareUrl) throw new Error('Poll creation failed or shareUrl missing');
        console.log('Share URL:', createRes.body.shareUrl);

        // 2. Get Poll
        console.log(`\n2. Getting Poll ${pollId}...`);
        const getRes = await request('GET', `/api/polls/${pollId}`);
        console.log('Get Response:', getRes.statusCode, getRes.body);

        // 3. Vote on Poll
        console.log(`\n3. Voting on Option ${optionId}...`);
        const voteRes = await request('POST', `/api/polls/${pollId}/vote`, {
            optionId: optionId,
            sessionId: 'user_session_1'
        });
        console.log('Vote Response:', voteRes.statusCode, voteRes.body);

        if (!voteRes.body.success || !voteRes.body.poll) throw new Error('Vote response structure incorrect');
        if (typeof voteRes.body.poll.options[0].percentage === 'undefined') throw new Error('Percentage missing in vote response');

        // 4. Duplicate Vote Check
        console.log('\n4. Attempting Duplicate Vote...');
        const duplicateVoteRes = await request('POST', `/api/polls/${pollId}/vote`, {
            optionId: optionId,
            sessionId: 'user_session_1'
        });
        console.log('Duplicate Vote Response (Expected 403):', duplicateVoteRes.statusCode, duplicateVoteRes.body);

        // 5. Close Poll
        console.log('\n5. Closing Poll...');
        const closeRes = await request('POST', `/api/polls/${pollId}/close`);
        console.log('Close Response:', closeRes.statusCode, closeRes.body);

        // 6. Vote on Closed Poll
        console.log('\n6. Attempting Vote on Closed Poll...');
        const closedVoteRes = await request('POST', `/api/polls/${pollId}/vote`, {
            optionId: optionId,
            sessionId: 'user_session_2'
        });
        console.log('Closed Vote Response (Expected 400):', closedVoteRes.statusCode, closedVoteRes.body);

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

runTests();
