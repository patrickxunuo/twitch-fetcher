const axios = require('axios');
require('dotenv').config();

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

async function getOAuthToken() {
    const url = 'https://id.twitch.tv/oauth2/token';
    const params = {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
    };
    const response = await axios.post(url, null, { params });
    return response.data.access_token;
}

async function fetchUserByUsername(username, token) {
    const url = 'https://api.twitch.tv/helix/users';
    const headers = {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
    };
    const params = { login: username };
    const response = await axios.get(url, { headers, params });
    return response.data.data;
}

module.exports = {
    getOAuthToken,
    fetchUserByUsername
};
