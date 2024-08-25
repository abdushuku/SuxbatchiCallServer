const { promises: fs } = require('fs');
const { fileURLToPath } = require('url');
const { dirname, join } = require('path');

// Get the __filename and __dirname in CommonJS
const __filename = fileURLToPath(require('url').pathToFileURL(__filename));
const __dirname = dirname(__filename);

const JSON_FILE_PATH = join(__dirname, 'temp.json');

async function fetchPhoneNumber(userId) {
    try {
        const response = await fetch('http://localhost:5000', {
            method: 'GET',
            credentials: "include",
            headers: {
                'Cookie': `userId=${userId}`
            }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error fetching phone number: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        console.log('Phone number:', data.phoneNumber);
        
        // Save to JSON file
        await saveToJson({ phoneNumber: data.phoneNumber });
        
        return data.phoneNumber;
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    }       
}

async function saveToJson(data) {
    try {
        await fs.writeFile(JSON_FILE_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving to JSON:', error);
    }
}

async function getFromJson() {
    try {
        const data = await fs.readFile(JSON_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('JSON file not found. Returning null.');
            return null;
        }
        console.error('Error reading from JSON:', error);
        return null;
    }
}

// Export the functions using module.exports
module.exports = { fetchPhoneNumber, getFromJson };
