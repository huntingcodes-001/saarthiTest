// src/utils/visitorLogger.ts

// Helper function to pad numbers with leading zero
const pad = (num: number) => num.toString().padStart(2, '0');

export async function logVisitorData() {
    try {
        // Fetch detailed IP geolocation data using ipapi.co
        const geoResponse = await fetch('https://ipapi.co/json/');
        const geoData = await geoResponse.json();

        // Check if fetching failed or if data is not for public IP
        if (geoData.error || !geoData.ip) {
            console.warn("Geolocation API failed or returned an error:", geoData.reason || geoData.error);
            return;
        }

        // 1. Get client-side date/time data
        const date = new Date();
        
        // Server Timestamp format (MM-DD-YY HH:mm:ss 24h, custom format)
        const stMonth = pad(date.getMonth() + 1);
        const stDay = pad(date.getDate());
        const stYear = date.getFullYear().toString().slice(-2);
        const stHours = pad(date.getHours());
        const stMinutes = pad(date.getMinutes());
        const stSeconds = pad(date.getSeconds());
        const serverTimestamp = `${stMonth}-${stDay}-${stYear} ${stHours}:${stMinutes}:${stSeconds}`;

        // User Time format (Localized string, forced to en-US style to match example)
        const userTime = date.toLocaleString('en-US'); 
        
        // Referral Source
        const referralSource = document.referrer ? new URL(document.referrer).hostname : 'Direct Visit';

        // 2. Map new API data to your desired format
        const ip = geoData.ip || 'N/A';
        const ipVersion = ip.includes(':') ? 'IPv6' : (ip !== 'N/A' ? 'IPv4' : 'Unknown');
        const city = geoData.city || 'N/A';
        const region = geoData.region || 'N/A';
        const regionCode = geoData.region_code || 'N/A';
        const country = geoData.country_code || 'N/A';
        const countryName = geoData.country_name || 'N/A';
        const countryCapital = geoData.country_capital || 'N/A'; // Available in this API
        const postalCode = geoData.postal || 'N/A';
        const lat = geoData.latitude || 'N/A';
        const lon = geoData.longitude || 'N/A';
        const countryCallingCode = geoData.country_calling_code || 'N/A'; // Available in this API
        const asn = geoData.asn || 'N/A'; 
        const organization = geoData.org || 'N/A';

        // 3. Format the final output string
        const logOutput = `
------------------------------------------------------------------------------
Server Timestamp: ${serverTimestamp}
User Time: ${userTime}
IP: ${ip}
IP Version: ${ipVersion}
City: ${city}
Region: ${region}
Region Code: ${regionCode}
Country: ${country}
Country Name: ${countryName}
Country Capital: ${countryCapital}
Postal Code: ${postalCode}
Latitude: ${lat}
Longitude: ${lon}
Country Calling Code: ${countryCallingCode}
ASN: ${asn}
Organization: ${organization}
Referral Source: ${referralSource}
------------------------------------------------------------------------------
`;
        
        // 4. Send the log data to the server endpoint
        await fetch('/api/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: logOutput,
        });
        
    } catch (error) {
        console.error("Failed to log visitor data (check network and API limits):", error);
    }
}