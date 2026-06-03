export default async function handler(req, res) {
    // Add CORS headers to allow frontend testing locally if needed
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const API_KEY = process.env.SPORTMONKS_API_KEY;
    const IS_MOCK = process.env.MOCK_LIVE_API === 'true';

    // If API KEY is not set and we are not mocking, return error
    if (!API_KEY && !IS_MOCK) {
        return res.status(500).json({ 
            error: "SPORTMONKS_API_KEY is not configured in Vercel Environment Variables." 
        });
    }

    try {
        let matches = [];

        if (IS_MOCK) {
            // Mock data for testing when there are no live matches
            matches = [
                { teamA: "Argentina", teamB: "Jordan", scoreA: 2, scoreB: 1, status: "LIVE" },
                { teamA: "Brazil", teamB: "Morocco", scoreA: 0, scoreB: 0, status: "LIVE" }
            ];
        } else {
            // Fetch from Sportmonks API
            const url = `https://api.sportmonks.com/v3/football/livescores/inplay?include=participants;scores&api_token=${API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Sportmonks API responded with status ${response.status}`);
            }

            const data = await response.json();
            
            if (data.data && Array.isArray(data.data)) {
                matches = data.data.map(match => {
                    const participants = match.participants || [];
                    const scores = match.scores || [];
                    
                    let teamA = "Unknown";
                    let teamB = "Unknown";
                    let scoreA = 0;
                    let scoreB = 0;

                    if (participants.length >= 2) {
                        // Usually index 0 is home, index 1 is away
                        // We check the meta meta.location to be sure if needed, but array order usually works
                        teamA = participants[0].name;
                        teamB = participants[1].name;
                        
                        const idA = participants[0].id;
                        const idB = participants[1].id;

                        // Find current score for each team from the scores array
                        // Type 1 is usually the 'CURRENT' score in Sportmonks v3
                        const scoreObjA = scores.find(s => s.participant_id === idA && s.description === "CURRENT");
                        const scoreObjB = scores.find(s => s.participant_id === idB && s.description === "CURRENT");

                        if (scoreObjA) scoreA = scoreObjA.score.goals;
                        if (scoreObjB) scoreB = scoreObjB.score.goals;
                    }

                    return {
                        teamA: teamA,
                        teamB: teamB,
                        scoreA: scoreA,
                        scoreB: scoreB,
                        status: "LIVE"
                    };
                });
            }
        }

        res.status(200).json({
            success: true,
            data: matches
        });
    } catch (error) {
        console.error("Error fetching live scores:", error);
        res.status(500).json({ error: "Failed to fetch live scores", details: error.message });
    }
}
