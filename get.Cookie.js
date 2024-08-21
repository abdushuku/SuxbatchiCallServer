async function fetchHeaderValue() {
    try {
        const response = await fetch('http://localhost:5000', {
            method: 'GET',
            credentials: 'include' // Include cookies in the request
        });
        console.log(response);
        const setCookieHeader = response.headers.get('set-cookie');
        const json = JSON.stringify(setCookieHeader);
        console.log('Set-Cookie Header:', json);
        const number = setCookieHeader.split(';')[4].split('=')[1];
        console.log('Set-Cookie Header Value:', number);
        return number
    } catch (error) {
        console.error('Error fetching header from Server A:', error);
    }
}

fetchHeaderValue()

// export { fetchHeaderValue };