// src/utils/visitorLogger.ts

// Helper function to pad numbers with leading zero
const pad = (num: number) => num.toString().padStart(2, '0');

export async function logVisitorData() {
    console.log("Starting visitor data logging...");

    try {
        // Fetch detailed IP geolocation data
        const geoResponse = await fetch('http://ip-api.com/json/?fields=query,city,region,regionName,country,countryCode,zip,lat,lon,as,org');
        const geoData = await geoResponse.json();

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

        // 2. Map API data and calculate/placeholder missing fields
        const ip = geoData.query || 'N/A';
        const ipVersion = ip.includes(':') ? 'IPv6' : (ip !== 'N/A' ? 'IPv4' : 'Unknown');
        const city = geoData.city || 'N/A';
        const region = geoData.regionName || 'N/A';
        const regionCode = geoData.region || 'N/A';
        const country = geoData.countryCode || 'N/A';
        const countryName = geoData.country || 'N/A';
        const postalCode = geoData.zip || 'N/A';
        const lat = geoData.lat || 'N/A';
        const lon = geoData.lon || 'N/A';
        const asn = geoData.as ? geoData.as.split(' ')[0] : 'N/A'; 
        const organization = geoData.org || 'N/A';

        // Placeholders for data not available in the free API or easily calculated:
        const countryCapital = 'N/A (API limitation)';
        const countryCallingCode = 'N/A (API limitation)';

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
        console.error("Failed to log visitor data:", error);
    }
}