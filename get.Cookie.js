async function postCookie(phone_number) {
    if (!phone_number) {
        console.error("Phone number must be provided");
        return null;
    }

    try {
        const response = await fetch('http://localhost:5000/api/v2/cookie', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone_number }),
            credentials: 'include' // Include cookies in the request
        });

        const setCookieHeader = response.headers.get('set-cookie');
        console.log('Set-Cookie Header:', setCookieHeader);

        if (setCookieHeader) {
            const number = setCookieHeader.split(';')[0].split('=')[1];
            console.log('Received Cookie Value:', number);
            return number;
        } else {
            console.error('No Set-Cookie header found.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// Function to get the cookie value from another server
async function getCookie(phone_number) {
    try {
        const cookieValue = await postCookie(phone_number);
        if (!cookieValue) {
            console.error('Failed to retrieve cookie value.');
            return null;
        }

        const get = await fetch('http://localhost:5000/api/v1/models/twilio/model/promp/get', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!get.ok) {
            throw new Error(`HTTP error! status: ${get.status}`);
        }

        const responseBody = await get.text();
        console.log('GET Response:', responseBody);
        return responseBody;

    } catch (error) {
        console.log('Error in getCookie:', error);
        return null;
    }
}


module.exports = { getCookie }