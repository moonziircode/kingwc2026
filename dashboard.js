window.onerror = function(message, source, lineno, colno, error) {
    alert("JS Error: " + message + " on line " + lineno + "\nSource: " + source);
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // Check login state
    const playerCode = localStorage.getItem('kg_player_code');
    if (!playerCode) {
        window.location.href = 'index.html';
        return;
    }

    // Load league data
    let leagueCode = localStorage.getItem('kg_current_league_code');
    let leagueData = null;
    if (leagueCode) {
        leagueData = JSON.parse(localStorage.getItem(`kg_league_${leagueCode}`));
    }
    
    // Fallback search league by playerCode if current league code is missing
    if (!leagueData && playerCode) {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('kg_league_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.players.some(p => p.playerCode === playerCode)) {
                        leagueData = data;
                        leagueCode = data.leagueCode;
                        localStorage.setItem('kg_current_league_code', leagueCode);
                        break;
                    }
                } catch (e) {
                    console.error("Error reading league storage key:", key, e);
                }
            }
        }
    }

    if (!leagueData) {
        window.location.href = 'index.html';
        return;
    }

    // Find current player
    const currentPlayer = leagueData.players.find(p => p.playerCode === playerCode);
    if (!currentPlayer) {
        window.location.href = 'index.html';
        return;
    }

    // Display user details on navbar & header
    document.getElementById('player-nickname').textContent = currentPlayer.nickname;
    document.getElementById('league-name-display').textContent = leagueData.leagueName;

    // Check host status
    const isHost = (playerCode === leagueData.hostPlayerCode);
    if (isHost) {
        document.getElementById('host-mode-container').classList.remove('hidden');
    }

    // Tab Navigation - REMOVED for 3-column layout

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Group Phase & Knockout Stage mappings
    const groupTeams = {
        "A": ["Mexico", "South Africa", "South Korea", "Czechia"],
        "B": ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
        "C": ["USA", "Paraguay", "Australia", "Türkiye"],
        "D": ["Brazil", "Morocco", "Haiti", "Scotland"],
        "E": ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
        "F": ["Netherlands", "Japan", "Sweden", "Tunisia"],
        "G": ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
        "H": ["Belgium", "Egypt", "Iran", "New Zealand"],
        "I": ["France", "Senegal", "Iraq", "Norway"],
        "J": ["Argentina", "Algeria", "Austria", "Jordan"],
        "K": ["Portugal", "Congo DR", "Uzbekistan", "Colombia"],
        "L": ["England", "Croatia", "Ghana", "Panama"]
    };

    const teamFlags = {
        'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Czechia': 'cz',
        'Canada': 'ca', 'Bosnia and Herzegovina': 'ba', 'USA': 'us', 'Paraguay': 'py',
        'Qatar': 'qa', 'Switzerland': 'ch', 'Brazil': 'br', 'Morocco': 'ma',
        'Haiti': 'ht', 'Scotland': 'gb-sct', 'Australia': 'au', 'Türkiye': 'tr',
        'Germany': 'de', 'Curaçao': 'cw', 'Netherlands': 'nl', 'Japan': 'jp',
        'Ivory Coast': 'ci', 'Ecuador': 'ec', 'Sweden': 'se', 'Tunisia': 'tn',
        'Spain': 'es', 'Cape Verde': 'cv', 'Belgium': 'be', 'Egypt': 'eg',
        'Saudi Arabia': 'sa', 'Uruguay': 'uy', 'Iran': 'ir', 'New Zealand': 'nz',
        'France': 'fr', 'Senegal': 'sn', 'Iraq': 'iq', 'Norway': 'no',
        'Argentina': 'ar', 'Algeria': 'dz', 'Austria': 'at', 'Jordan': 'jo',
        'Portugal': 'pt', 'Congo DR': 'cd', 'England': 'gb-eng', 'Croatia': 'hr',
        'Ghana': 'gh', 'Panama': 'pa', 'Uzbekistan': 'uz', 'Colombia': 'co'
    };

    // State Variables
    let allMatches = [];
    let isHostModeActive = false;
    const container = document.getElementById('matches-container');
    const filterSelect = document.getElementById('round-filter');

    // Host Mode Toggle listener
    const hostModeToggle = document.getElementById('host-mode-toggle');
    if (hostModeToggle) {
        hostModeToggle.addEventListener('change', (e) => {
            isHostModeActive = e.target.checked;
            renderMatches(allMatches);
            
            const btn = document.getElementById('btn-save-predictions');
            if (isHostModeActive) {
                btn.textContent = 'Save Actual Scores (Host) ✓';
                btn.style.backgroundColor = 'var(--gold)';
                btn.style.color = 'var(--bg-color)';
            } else {
                btn.textContent = 'Save Predictions';
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }
        });
    }

    // Bracket Auto-Calculation & knockout updating
    const resetAndRecalculateKnockout = () => {
        // Deep clone matchesData from matches.js to reset placeholders
        allMatches = JSON.parse(JSON.stringify(matchesData));

        const standings = {};
        Object.keys(groupTeams).forEach(g => {
            standings[g] = groupTeams[g].map(name => ({
                name: name,
                code: teamFlags[name] || 'xx',
                gp: 0, pts: 0, gd: 0, gf: 0
            }));
        });

        // Group Stage matches (m1 to m72)
        for (let i = 1; i <= 72; i++) {
            const mId = `m${i}`;
            const actual = leagueData.actualScores[mId];
            if (actual && actual.A !== undefined && actual.B !== undefined) {
                const mObj = allMatches.find(m => m.id === mId);
                if (!mObj) continue;

                let group = null;
                Object.keys(groupTeams).forEach(g => {
                    if (groupTeams[g].includes(mObj.teamA)) group = g;
                });

                if (group) {
                    const tA = standings[group].find(t => t.name === mObj.teamA);
                    const tB = standings[group].find(t => t.name === mObj.teamB);
                    if (tA && tB) {
                        tA.gp++;
                        tB.gp++;
                        tA.gf += actual.A;
                        tB.gf += actual.B;
                        tA.gd += (actual.A - actual.B);
                        tB.gd += (actual.B - actual.A);
                        if (actual.A > actual.B) tA.pts += 3;
                        else if (actual.B > actual.A) tB.pts += 3;
                        else { tA.pts += 1; tB.pts += 1; }
                    }
                }
            }
        }

        // Sort Groups
        Object.keys(standings).forEach(g => {
            standings[g].sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.gd !== a.gd) return b.gd - a.gd;
                if (b.gf !== a.gf) return b.gf - a.gf;
                return a.name.localeCompare(b.name);
            });
        });

        // Best 3rd place teams ranking
        const thirdPlaceTeams = [];
        Object.keys(standings).forEach(g => {
            thirdPlaceTeams.push({ group: g, team: standings[g][2] });
        });
        thirdPlaceTeams.sort((a, b) => {
            if (b.team.pts !== a.team.pts) return b.team.pts - a.team.pts;
            if (b.team.gd !== a.team.gd) return b.team.gd - a.team.gd;
            if (b.team.gf !== a.team.gf) return b.team.gf - a.team.gf;
            return a.team.name.localeCompare(b.team.name);
        });
        const bestThird = thirdPlaceTeams.slice(0, 8).map(x => x.team);

        // Helper to check if group has played at least one game to show standing names
        const groupHasStarted = (g) => {
            return standings[g].some(t => t.gp > 0);
        };

        const getGroupWinner = (g) => {
            return groupHasStarted(g) ? standings[g][0] : { name: `Winner Group ${g}`, code: 'xx' };
        };
        const getGroupRunnerUp = (g) => {
            return groupHasStarted(g) ? standings[g][1] : { name: `Runner-up Group ${g}`, code: 'xx' };
        };

        const setMatchTeams = (mId, teamA, codeA, teamB, codeB) => {
            const m = allMatches.find(x => x.id === mId);
            if (m) {
                m.teamA = teamA; m.codeA = codeA;
                m.teamB = teamB; m.codeB = codeB;
            }
        };

        // Fill Round of 32 Slots (m73 - m88)
        setMatchTeams('m73', getGroupRunnerUp('A').name, getGroupRunnerUp('A').code, getGroupRunnerUp('B').name, getGroupRunnerUp('B').code);
        setMatchTeams('m74', getGroupWinner('C').name, getGroupWinner('C').code, getGroupRunnerUp('F').name, getGroupRunnerUp('F').code);
        setMatchTeams('m75', getGroupWinner('E').name, getGroupWinner('E').code, bestThird[0] ? bestThird[0].name : "3rd Best (A/B/C/D/F)", bestThird[0] ? bestThird[0].code : "xx");
        setMatchTeams('m76', getGroupWinner('F').name, getGroupWinner('F').code, getGroupRunnerUp('C').name, getGroupRunnerUp('C').code);
        setMatchTeams('m77', getGroupRunnerUp('E').name, getGroupRunnerUp('E').code, getGroupRunnerUp('I').name, getGroupRunnerUp('I').code);
        setMatchTeams('m78', getGroupWinner('I').name, getGroupWinner('I').code, bestThird[1] ? bestThird[1].name : "3rd Best (C/D/F/G/H)", bestThird[1] ? bestThird[1].code : "xx");
        setMatchTeams('m79', getGroupWinner('A').name, getGroupWinner('A').code, bestThird[2] ? bestThird[2].name : "3rd Best (C/E/F/H/I)", bestThird[2] ? bestThird[2].code : "xx");
        setMatchTeams('m80', getGroupWinner('L').name, getGroupWinner('L').code, bestThird[3] ? bestThird[3].name : "3rd Best (E/H/I/J/K)", bestThird[3] ? bestThird[3].code : "xx");
        setMatchTeams('m81', getGroupWinner('G').name, getGroupWinner('G').code, bestThird[4] ? bestThird[4].name : "3rd Best (E/H/I/J/K)", bestThird[4] ? bestThird[4].code : "xx");
        setMatchTeams('m82', getGroupWinner('D').name, getGroupWinner('D').code, bestThird[5] ? bestThird[5].name : "3rd Best (B/E/F/I/J)", bestThird[5] ? bestThird[5].code : "xx");
        setMatchTeams('m83', getGroupWinner('H').name, getGroupWinner('H').code, getGroupRunnerUp('J').name, getGroupRunnerUp('J').code);
        setMatchTeams('m84', getGroupRunnerUp('K').name, getGroupRunnerUp('K').code, getGroupRunnerUp('L').name, getGroupRunnerUp('L').code);
        setMatchTeams('m85', getGroupWinner('B').name, getGroupWinner('B').code, bestThird[6] ? bestThird[6].name : "3rd Best (E/F/G/I/J)", bestThird[6] ? bestThird[6].code : "xx");
        setMatchTeams('m86', getGroupRunnerUp('D').name, getGroupRunnerUp('D').code, getGroupRunnerUp('G').name, getGroupRunnerUp('G').code);
        setMatchTeams('m87', getGroupWinner('J').name, getGroupWinner('J').code, getGroupRunnerUp('H').name, getGroupRunnerUp('H').code);
        setMatchTeams('m88', getGroupWinner('K').name, getGroupWinner('K').code, bestThird[7] ? bestThird[7].name : "3rd Best (D/E/I/J/L)", bestThird[7] ? bestThird[7].code : "xx");

        // Helper for Knockout winner progression
        const getKnockoutWinner = (mId) => {
            const m = allMatches.find(x => x.id === mId);
            if (!m || m.teamA.includes("Group") || m.teamB.includes("Group") || m.teamA.includes("TBC") || m.teamB.includes("TBC")) return null;
            const actual = leagueData.actualScores[mId];
            if (actual && actual.A !== undefined && actual.B !== undefined) {
                if (actual.A > actual.B) return { name: m.teamA, code: m.codeA };
                if (actual.B > actual.A) return { name: m.teamB, code: m.codeB };
                
                // Tie breaker override for draw matches
                const penWin = leagueData.actualScores[`${mId}_penaltyWinner`];
                if (penWin === 'B') return { name: m.teamB, code: m.codeB };
                return { name: m.teamA, code: m.codeA };
            }
            return null;
        };

        const getKnockoutLoser = (mId) => {
            const m = allMatches.find(x => x.id === mId);
            if (!m || m.teamA.includes("Group") || m.teamB.includes("Group") || m.teamA.includes("TBC") || m.teamB.includes("TBC")) return null;
            const actual = leagueData.actualScores[mId];
            if (actual && actual.A !== undefined && actual.B !== undefined) {
                if (actual.A > actual.B) return { name: m.teamB, code: m.codeB };
                if (actual.B > actual.A) return { name: m.teamA, code: m.codeA };
                
                const penWin = leagueData.actualScores[`${mId}_penaltyWinner`];
                if (penWin === 'B') return { name: m.teamA, code: m.codeA };
                return { name: m.teamB, code: m.codeB };
            }
            return null;
        };

        const updateKnockoutPair = (targetId, srcA, srcB, useWinner = true) => {
            const tMatch = allMatches.find(x => x.id === targetId);
            if (!tMatch) return;
            const tA = useWinner ? getKnockoutWinner(srcA) : getKnockoutLoser(srcA);
            const tB = useWinner ? getKnockoutWinner(srcB) : getKnockoutLoser(srcB);
            
            tMatch.teamA = tA ? tA.name : `${useWinner ? 'Winner' : 'Loser'} ${srcA.toUpperCase()}`;
            tMatch.codeA = tA ? tA.code : 'xx';
            tMatch.teamB = tB ? tB.name : `${useWinner ? 'Winner' : 'Loser'} ${srcB.toUpperCase()}`;
            tMatch.codeB = tB ? tB.code : 'xx';
        };

        // Round of 16 (m89 - m96)
        updateKnockoutPair('m89', 'm73', 'm74');
        updateKnockoutPair('m90', 'm75', 'm76');
        updateKnockoutPair('m91', 'm77', 'm78');
        updateKnockoutPair('m92', 'm79', 'm80');
        updateKnockoutPair('m93', 'm81', 'm82');
        updateKnockoutPair('m94', 'm83', 'm84');
        updateKnockoutPair('m95', 'm85', 'm86');
        updateKnockoutPair('m96', 'm87', 'm88');

        // Quarter-Finals (m97 - m100)
        updateKnockoutPair('m97', 'm89', 'm90');
        updateKnockoutPair('m98', 'm91', 'm92');
        updateKnockoutPair('m99', 'm93', 'm94');
        updateKnockoutPair('m100', 'm95', 'm96');

        // Semi-Finals (m101 - m102)
        updateKnockoutPair('m101', 'm97', 'm98');
        updateKnockoutPair('m102', 'm99', 'm100');

        // Finals (m103 - m104)
        updateKnockoutPair('m103', 'm101', 'm102', false); // Third place match
        updateKnockoutPair('m104', 'm101', 'm102', true);  // Final
    };

    // Calculate player points based on actual scores
    const calculateAllPlayerPoints = () => {
        leagueData.players.forEach(p => {
            let pts = 0;
            Object.keys(leagueData.actualScores).forEach(mId => {
                if (mId.includes('_penaltyWinner')) return;
                
                const actual = leagueData.actualScores[mId];
                const pred = p.predictions ? p.predictions[mId] : null;

                if (actual && actual.A !== undefined && actual.B !== undefined && pred && pred.A !== undefined && pred.B !== undefined) {
                    if (pred.A === actual.A && pred.B === actual.B) {
                        pts += 3; // Perfect score
                    } else if (
                        (pred.A > pred.B && actual.A > actual.B) ||
                        (pred.A < pred.B && actual.A < actual.B) ||
                        (pred.A === pred.B && actual.A === actual.B)
                    ) {
                        pts += 1; // Correct outcome
                    }
                }
            });
            p.points = pts;
        });
    };

    // Render matches UI
    const renderMatches = (matchesToRender) => {
        container.innerHTML = '';
        let currentRound = '';

        matchesToRender.forEach(match => {
            if (match.round !== currentRound) {
                currentRound = match.round;
                const roundHeader = document.createElement('h3');
                roundHeader.className = 'round-header';
                roundHeader.style.gridColumn = '1 / -1';
                roundHeader.style.color = 'var(--gold)';
                roundHeader.style.marginTop = '2rem';
                roundHeader.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                roundHeader.style.paddingBottom = '0.5rem';
                roundHeader.textContent = currentRound;
                container.appendChild(roundHeader);
            }

            const matchNum = parseInt(match.id.substring(1));
            const isKnockout = matchNum > 72;

            // Load values
            const actual = leagueData.actualScores[match.id];
            const actualA = (actual && actual.A !== undefined) ? actual.A : '';
            const actualB = (actual && actual.B !== undefined) ? actual.B : '';

            const pred = currentPlayer.predictions ? currentPlayer.predictions[match.id] : null;
            const predA = (pred && pred.A !== undefined) ? pred.A : '';
            const predB = (pred && pred.B !== undefined) ? pred.B : '';

            // Card HTML
            const card = document.createElement('div');
            card.className = 'match-card';
            
            // Build Actual score badge if exists (and player mode is active)
            let actualBadgeHtml = '';
            if (!isHostModeActive && actual && actual.A !== undefined && actual.B !== undefined) {
                const isTie = actual.A === actual.B;
                let penText = '';
                if (isKnockout && isTie) {
                    const penWin = leagueData.actualScores[`${match.id}_penaltyWinner`];
                    const winnerName = penWin === 'B' ? match.teamB : match.teamA;
                    penText = ` (Pen: ${winnerName} lolos)`;
                }
                actualBadgeHtml = `
                    <div style="background: rgba(0, 255, 135, 0.1); border: 1px solid var(--primary-color); color: var(--primary-color); padding: 0.3rem 0.6rem; border-radius: 8px; font-size: 0.8rem; font-weight: 800; text-align: center; margin-bottom: 0.8rem; letter-spacing: 0.05em;">
                        SKOR AKHIR: ${actual.A} - ${actual.B}${penText}
                    </div>
                `;
            }

            // Input fields layout
            let scoreInputsHtml = '';
            if (isHostModeActive) {
                scoreInputsHtml = `
                    <div class="score-inputs">
                        <input type="number" min="0" max="25" class="score-input actual-score-input" data-match="${match.id}" data-team="A" placeholder="Act" value="${actualA}">
                        <span class="dash">:</span>
                        <input type="number" min="0" max="25" class="score-input actual-score-input" data-match="${match.id}" data-team="B" placeholder="Act" value="${actualB}">
                    </div>
                `;
                
                // Penalty winner selector for knockout draws
                if (isKnockout) {
                    const penWin = leagueData.actualScores[`${match.id}_penaltyWinner`] || 'A';
                    scoreInputsHtml += `
                        <div class="penalty-selection" style="margin-top: 0.8rem; text-align: center; font-size: 0.8rem; opacity: 0.9;">
                            <span style="color: var(--text-muted); display: block; margin-bottom: 0.2rem;">Lolos ke babak berikutnya:</span>
                            <select class="penalty-winner-dropdown" data-match="${match.id}" style="padding: 0.3rem 0.5rem; background: var(--bg-color); color: var(--gold); border: 1px solid var(--gold); border-radius: 6px; cursor: pointer; outline: none; font-size: 0.8rem;">
                                <option value="A" ${penWin === 'A' ? 'selected' : ''}>${match.teamA}</option>
                                <option value="B" ${penWin === 'B' ? 'selected' : ''}>${match.teamB}</option>
                            </select>
                        </div>
                    `;
                }
            } else {
                scoreInputsHtml = `
                    <div class="score-inputs">
                        <input type="number" min="0" max="25" class="score-input pred-score-input" data-match="${match.id}" data-team="A" placeholder="-" value="${predA}">
                        <span class="dash">-</span>
                        <input type="number" min="0" max="25" class="score-input pred-score-input" data-match="${match.id}" data-team="B" placeholder="-" value="${predB}">
                    </div>
                `;
            }

            card.innerHTML = `
                ${actualBadgeHtml}
                <div class="match-datetime">${match.date} &bull; ${match.time} WIB</div>
                <div class="match-teams">
                    <div class="team">
                        <img src="https://flagcdn.com/w80/${match.codeA}.png" alt="${match.teamA} Flag" class="team-flag" onerror="this.src='https://via.placeholder.com/80/1c2541/FFFFFF?text=${match.teamA.substring(0,3)}'">
                        <span class="team-name">${match.teamA}</span>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team">
                        <img src="https://flagcdn.com/w80/${match.codeB}.png" alt="${match.teamB} Flag" class="team-flag" onerror="this.src='https://via.placeholder.com/80/1c2541/FFFFFF?text=${match.teamB.substring(0,3)}'">
                        <span class="team-name">${match.teamB}</span>
                    </div>
                </div>
                ${scoreInputsHtml}
            `;
            container.appendChild(card);
        });
    };

    // Render leaderboard ranking table
    const renderLeaderboard = () => {
        calculateAllPlayerPoints();
        const sorted = [...leagueData.players].sort((a, b) => b.points - a.points);
        
        const tbody = document.querySelector('.leaderboard-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        sorted.forEach((p, idx) => {
            let rankClass = '';
            if (idx === 0) rankClass = 'gold';
            else if (idx === 1) rankClass = 'silver';
            else if (idx === 2) rankClass = 'bronze';

            const tr = document.createElement('tr');
            if (p.playerCode === playerCode) {
                tr.style.background = 'rgba(0, 255, 135, 0.06)';
                tr.style.borderLeft = '3px solid var(--primary-color)';
            }

            tr.innerHTML = `
                <td><span class="rank ${rankClass}">${idx + 1}</span></td>
                <td>
                    <span style="font-weight: 700;">${p.nickname}</span>
                    ${p.isHost ? '<span style="color: var(--gold); font-size: 0.7rem; margin-left: 0.5rem; border: 1px solid var(--gold); padding: 1px 4px; border-radius: 4px; font-weight: 800;">HOST</span>' : ''}
                    ${p.playerCode === playerCode ? '<span style="color: var(--primary-color); font-size: 0.7rem; margin-left: 0.5rem; font-weight: 600;">(Anda)</span>' : ''}
                </td>
                <td class="points">${p.points}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    // Initialize Bracket calculations
    resetAndRecalculateKnockout();

    // Populate phase filter options dynamically
    const rounds = [...new Set(allMatches.map(m => m.round))];
    rounds.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        filterSelect.appendChild(opt);
    });

    // Handle filter dropdown changes
    filterSelect.addEventListener('change', (e) => {
        const selected = e.target.value;
        if (selected === 'all') {
            renderMatches(allMatches);
        } else {
            const filtered = allMatches.filter(m => m.round === selected);
            renderMatches(filtered);
        }
    });

    // Trigger initial renders
    renderMatches(allMatches);
    renderLeaderboard();
    // Note: renderChat is defined later, so we will call it where we removed tabs or at the end.
    // However, JS hoisting does not apply to const arrow functions. 
    // We should move the renderChat() call to after it's defined, or just let the chat section trigger it.

    // ----------------------------------------------------
    // Actual Scores Sync & Tournament Simulation Logic
    // ----------------------------------------------------
    const SCORE_API_URL = "/api/sync";

    const fetchActualScores = async (isManual = false) => {
        const btn = document.getElementById('btn-sync-scores');
        const originalText = btn ? btn.innerHTML : '';
        if (btn && isManual) {
            btn.innerHTML = '🔄 Syncing Live Scores...';
            btn.disabled = true;
        }

        try {
            const response = await fetch(SCORE_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            
            if (result && result.success && Array.isArray(result.data)) {
                
                // Map the array of live matches to our match IDs
                result.data.forEach(liveMatch => {
                    // Find corresponding match ID in allMatches
                    const matchObj = allMatches.find(m => 
                        (m.teamA.toLowerCase() === liveMatch.teamA.toLowerCase() && m.teamB.toLowerCase() === liveMatch.teamB.toLowerCase()) ||
                        (m.teamA.toLowerCase() === liveMatch.teamB.toLowerCase() && m.teamB.toLowerCase() === liveMatch.teamA.toLowerCase())
                    );

                    if (matchObj) {
                        const mId = matchObj.id;
                        // Ensure we assign A and B to the correct teams based on how they appear in our allMatches
                        const scoreA = (matchObj.teamA.toLowerCase() === liveMatch.teamA.toLowerCase()) ? liveMatch.scoreA : liveMatch.scoreB;
                        const scoreB = (matchObj.teamB.toLowerCase() === liveMatch.teamB.toLowerCase()) ? liveMatch.scoreB : liveMatch.scoreA;

                        leagueData.actualScores[mId] = { A: scoreA, B: scoreB };
                    }
                });
                
                resetAndRecalculateKnockout();
                calculateAllPlayerPoints();
                
                localStorage.setItem(`kg_league_${leagueCode}`, JSON.stringify(leagueData));
                
                renderMatches(allMatches);
                renderLeaderboard();
                
                console.log("Live scores auto-synced successfully via Vercel API!");
                if (btn && isManual) {
                    btn.innerHTML = '✅ Sync Sukses!';
                    btn.style.color = 'var(--primary-color)';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        btn.style.color = '';
                    }, 2000);
                }
            }
        } catch (err) {
            console.error("Failed to sync actual scores:", err);
            if (btn && isManual) {
                btn.innerHTML = '❌ Sync Gagal';
                btn.style.color = 'var(--danger)';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    btn.style.color = '';
                }, 2500);
                alert("Gagal mengambil skor aktual. Pastikan koneksi internet aktif dan file skor publik sudah di-host di URL GitHub.");
            }
        }
    };

    // Auto-sync on page load (silent fallback)
    fetchActualScores(false);

    // Manual Sync Button Listener
    const btnSyncScores = document.getElementById('btn-sync-scores');
    if (btnSyncScores) {
        btnSyncScores.addEventListener('click', () => {
            fetchActualScores(true);
        });
    }



    // Save predictions or actual scores
    document.getElementById('btn-save-predictions').addEventListener('click', () => {
        if (isHostModeActive) {
            // Save actual scores (host action)
            const actualInputs = document.querySelectorAll('.actual-score-input');
            actualInputs.forEach(input => {
                const mId = input.getAttribute('data-match');
                const team = input.getAttribute('data-team');
                if (!leagueData.actualScores[mId]) {
                    leagueData.actualScores[mId] = {};
                }
                if (input.value !== '') {
                    leagueData.actualScores[mId][team] = parseInt(input.value);
                } else {
                    delete leagueData.actualScores[mId][team];
                }
            });

            // Handle penalty winners
            const penSelects = document.querySelectorAll('.penalty-winner-dropdown');
            penSelects.forEach(select => {
                const mId = select.getAttribute('data-match');
                leagueData.actualScores[`${mId}_penaltyWinner`] = select.value;
            });

            resetAndRecalculateKnockout();
            calculateAllPlayerPoints();

            localStorage.setItem(`kg_league_${leagueCode}`, JSON.stringify(leagueData));
            renderMatches(allMatches);
            renderLeaderboard();
        } else {
            // Save user predictions (participant action)
            const predInputs = document.querySelectorAll('.pred-score-input');
            const playerIdx = leagueData.players.findIndex(p => p.playerCode === playerCode);
            if (playerIdx !== -1) {
                if (!leagueData.players[playerIdx].predictions) {
                    leagueData.players[playerIdx].predictions = {};
                }
                predInputs.forEach(input => {
                    const mId = input.getAttribute('data-match');
                    const team = input.getAttribute('data-team');
                    if (!leagueData.players[playerIdx].predictions[mId]) {
                        leagueData.players[playerIdx].predictions[mId] = {};
                    }
                    if (input.value !== '') {
                        leagueData.players[playerIdx].predictions[mId][team] = parseInt(input.value);
                    } else {
                        delete leagueData.players[playerIdx].predictions[mId][team];
                    }
                });

                localStorage.setItem(`kg_league_${leagueCode}`, JSON.stringify(leagueData));
                renderLeaderboard();
            }
        }

        // Show save confirmation
        const btn = document.getElementById('btn-save-predictions');
        const originalText = btn.textContent;
        btn.textContent = 'Saved! ✓';
        btn.style.backgroundColor = 'var(--gold)';
        btn.style.color = 'var(--bg-color)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            if (isHostModeActive) {
                btn.textContent = 'Save Actual Scores (Host) ✓';
                btn.style.backgroundColor = 'var(--gold)';
                btn.style.color = 'var(--bg-color)';
            } else {
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }
        }, 2000);
    });

    // Chat Tab Implementation
    const chatContainer = document.getElementById('chat-messages-container');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    const renderChat = () => {
        if (!chatContainer) return;
        chatContainer.innerHTML = '';
        
        leagueData.chatMessages.forEach(msg => {
            const div = document.createElement('div');
            let senderClass = 'received';
            
            if (msg.sender === 'System') {
                senderClass = 'system';
            } else if (msg.playerCode === playerCode) {
                senderClass = 'sent';
            }

            div.className = `chat-message ${senderClass}`;
            const timeFormatted = new Date(msg.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            if (senderClass === 'system') {
                div.innerHTML = `<div class="chat-text">${msg.message}</div>`;
            } else {
                div.innerHTML = `
                    <span class="chat-sender">${msg.sender}</span>
                    <div class="chat-text">${msg.message}</div>
                    <span class="chat-time">${timeFormatted}</span>
                `;
            }
            chatContainer.appendChild(div);
        });

        chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    const botReplies = [
        "Wah tebakan lu berani juga ya! Kalo menurut gua sih beda jauh 😂",
        "Siap-siap aja koin kita diadu nanti pas peluit akhir dibunyikan!",
        "Gua sih dapet wangsit semalem kalo Argentina bakal ngamuk di grup.",
        "Prediksi lu aman gak tuh? Jangan-jangan cuma modal feeling aja wkwk",
        "Tenang, klasemen masih panjang. Gua bakal nyalip lu besok!",
        "Matchday ini berat banget ditebak, tapi feeling gua skornya tipis.",
        "Ayo kita liat siapa yang bakal jadi King Gambler sejati tahun ini! 🏆",
        "Teori dari mana tuh? Hati-hati zonk dapet 0 poin haha"
    ];

    const simulateBotReply = (userMsg) => {
        const bots = leagueData.players.filter(p => p.playerCode !== playerCode && p.playerCode !== "MOCKHOST1234");
        if (bots.length === 0) return;
        const randomBot = bots[Math.floor(Math.random() * bots.length)];
        
        let response = botReplies[Math.floor(Math.random() * botReplies.length)];
        const lowerMsg = userMsg.toLowerCase();
        
        if (lowerMsg.includes('argentina') || lowerMsg.includes('messi')) {
            response = "Argentina emang skuadnya kuat, tapi Jordan bisa aja bikin kejutan di Matchday 3!";
        } else if (lowerMsg.includes('brazil') || lowerMsg.includes('morocco')) {
            response = "Gua megang Brazil menang telak di matchday pertama, maap nih maap wkwk";
        } else if (lowerMsg.includes('menang') || lowerMsg.includes('juara')) {
            response = "Boleh diadu prediksi klasemennya gan, gua yakin menang mutlak kali ini.";
        } else if (lowerMsg.includes('skor') || lowerMsg.includes('prediksi')) {
            response = "Prediksi gua udah gua racik dengan perhitungan matematis, dijamin mantul!";
        }

        const botMsg = {
            sender: randomBot.nickname,
            message: response,
            time: new Date().toISOString(),
            playerCode: randomBot.playerCode
        };

        leagueData.chatMessages.push(botMsg);
        localStorage.setItem(`kg_league_${leagueCode}`, JSON.stringify(leagueData));
        renderChat();
    };

    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const msgText = chatInput.value.trim();
            if (!msgText) return;

            const newMsg = {
                sender: currentPlayer.nickname,
                message: msgText,
                time: new Date().toISOString(),
                playerCode: playerCode
            };

            leagueData.chatMessages.push(newMsg);
            localStorage.setItem(`kg_league_${leagueCode}`, JSON.stringify(leagueData));
            chatInput.value = '';
            renderChat();

            // Simulate Bot Reply after 1.5 seconds
            setTimeout(() => {
                simulateBotReply(msgText);
            }, 1500);
        });
    }

    // Initialize Chat UI
    renderChat();
});
