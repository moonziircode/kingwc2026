window.onerror = function(message, source, lineno, colno, error) {
    alert("JS Error: " + message + " on line " + lineno + "\nSource: " + source);
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // Buttons
    const btnCreateLeague = document.getElementById('btn-create-league');
    const btnJoinLeague = document.getElementById('btn-join-league');
    const linkContinue = document.getElementById('link-continue');

    // Dialogs
    const dialogCreate = document.getElementById('dialog-create');
    const dialogJoin = document.getElementById('dialog-join');
    const dialogContinue = document.getElementById('dialog-continue');

    // Forms
    const formCreate = document.getElementById('form-create');
    const formJoin = document.getElementById('form-join');
    const formContinue = document.getElementById('form-continue');

    // Close buttons
    const closeBtns = document.querySelectorAll('.close-btn');

    // Open Modals
    btnCreateLeague.addEventListener('click', () => dialogCreate.showModal());
    btnJoinLeague.addEventListener('click', () => dialogJoin.showModal());
    linkContinue.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Check if player code already in local storage
        const savedCode = localStorage.getItem('kg_player_code');
        if(savedCode) {
            document.getElementById('continue-player-code').value = savedCode;
        }
        
        dialogContinue.showModal();
    });

    // Close Modals
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('dialog').close();
            resetForms();
        });
    });

    // Generate random alphanumeric code
    const generateCode = (length) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // Save player code
    const savePlayerCode = (code) => {
        localStorage.setItem('kg_player_code', code);
    };

    // Helper to generate mock predictions for 72 group matches
    const generateMockPredictions = () => {
        const preds = {};
        for (let i = 1; i <= 72; i++) {
            preds[`m${i}`] = {
                A: Math.floor(Math.random() * 4), // 0-3 goals
                B: Math.floor(Math.random() * 4)  // 0-3 goals
            };
        }
        return preds;
    };

    // Handle Create League Submit
    formCreate.addEventListener('submit', (e) => {
        e.preventDefault();
        const leagueName = document.getElementById('create-league-name').value;
        const nickname = document.getElementById('create-nickname').value;

        if (leagueName && nickname) {
            const leagueCode = generateCode(6);
            const playerCode = generateCode(12);

            // Initialize league data with mock players
            const leagueData = {
                leagueCode: leagueCode,
                leagueName: leagueName,
                hostPlayerCode: playerCode,
                actualScores: {},
                chatMessages: [
                    { sender: "System", message: `Liga "${leagueName}" berhasil dibuat! Bagikan kode liga ${leagueCode} ke teman-temanmu.`, time: new Date().toISOString() },
                    { sender: "Budi", message: "Halo guys! Siap mengalahkan kalian semua 😎", time: new Date().toISOString() },
                    { sender: "Citra", message: "Gua udah isi prediksi, moga-moga menang deh haha", time: new Date().toISOString() }
                ],
                players: [
                    { playerCode: playerCode, nickname: nickname, isHost: true, predictions: {}, points: 0 },
                    { playerCode: "MOCKBUDI1234", nickname: "Budi", isHost: false, predictions: generateMockPredictions(), points: 0 },
                    { playerCode: "MOCKCITRA567", nickname: "Citra", isHost: false, predictions: generateMockPredictions(), points: 0 },
                    { playerCode: "MOCKDONI8910", nickname: "Doni", isHost: false, predictions: generateMockPredictions(), points: 0 }
                ]
            };

            localStorage.setItem(`kg_league_${leagueCode}`, JSON.stringify(leagueData));
            localStorage.setItem('kg_current_league_code', leagueCode);
            savePlayerCode(playerCode);

            // Hide form, show result
            formCreate.classList.add('hidden');
            const resultBox = document.getElementById('create-result');
            resultBox.classList.remove('hidden');

            document.getElementById('display-league-code').textContent = leagueCode;
            document.getElementById('display-player-code-create').textContent = playerCode;
        }
    });

    // Handle Join League Submit
    formJoin.addEventListener('submit', (e) => {
        e.preventDefault();
        const leagueCode = document.getElementById('join-league-code').value.toUpperCase();
        const nickname = document.getElementById('join-nickname').value;

        if (leagueCode && nickname) {
            const playerCode = generateCode(12);
            let leagueData = null;

            // Try to load existing league
            const rawLeague = localStorage.getItem(`kg_league_${leagueCode}`);
            if (rawLeague) {
                try {
                    leagueData = JSON.parse(rawLeague);
                } catch (err) {
                    console.error("Error parsing league:", err);
                }
            }

            if (!leagueData) {
                // Auto-create a mock league if it doesn't exist to prevent getting stuck
                leagueData = {
                    leagueCode: leagueCode,
                    leagueName: `Liga ${leagueCode}`,
                    hostPlayerCode: "MOCKHOST1234",
                    actualScores: {},
                    chatMessages: [
                        { sender: "System", message: `Liga "${leagueCode}" diinisialisasi otomatis!`, time: new Date().toISOString() },
                        { sender: "Budi", message: "Yuk main!", time: new Date().toISOString() }
                    ],
                    players: [
                        { playerCode: "MOCKHOST1234", nickname: "Rian (Host)", isHost: true, predictions: generateMockPredictions(), points: 0 },
                        { playerCode: "MOCKBUDI1234", nickname: "Budi", isHost: false, predictions: generateMockPredictions(), points: 0 }
                    ]
                };
            }

            // Add new player
            leagueData.players.push({
                playerCode: playerCode,
                nickname: nickname,
                isHost: false,
                predictions: {},
                points: 0
            });

            // Add joining chat message
            leagueData.chatMessages.push({
                sender: "System",
                message: `${nickname} telah bergabung ke dalam liga! 👋`,
                time: new Date().toISOString()
            });

            localStorage.setItem(`kg_league_${leagueCode}`, JSON.stringify(leagueData));
            localStorage.setItem('kg_current_league_code', leagueCode);
            savePlayerCode(playerCode);

            // Hide form, show result
            formJoin.classList.add('hidden');
            const resultBox = document.getElementById('join-result');
            resultBox.classList.remove('hidden');

            document.getElementById('display-player-code-join').textContent = playerCode;
        }
    });

    // Handle Continue Submit
    formContinue.addEventListener('submit', (e) => {
        e.preventDefault();
        const playerCode = document.getElementById('continue-player-code').value.toUpperCase();
        
        if (playerCode) {
            let foundLeague = null;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('kg_league_')) {
                    try {
                        const lData = JSON.parse(localStorage.getItem(key));
                        if (lData.players.some(p => p.playerCode === playerCode)) {
                            foundLeague = lData.leagueCode;
                            break;
                        }
                    } catch(err) {
                        console.error(err);
                    }
                }
            }

            if (foundLeague) {
                savePlayerCode(playerCode);
                localStorage.setItem('kg_current_league_code', foundLeague);
                dialogContinue.close();
                window.location.href = 'dashboard.html';
            } else {
                alert('Kode Pemain tidak ditemukan di liga manapun. Silakan buat atau gabung liga baru.');
            }
        }
    });

    // Enter Game buttons after generation
    document.getElementById('btn-enter-game-create').addEventListener('click', () => {
        dialogCreate.close();
        window.location.href = 'dashboard.html';
    });

    document.getElementById('btn-enter-game-join').addEventListener('click', () => {
        dialogJoin.close();
        window.location.href = 'dashboard.html';
    });

    const resetForms = () => {
        formCreate.reset();
        formJoin.reset();
        formContinue.reset();
        
        formCreate.classList.remove('hidden');
        document.getElementById('create-result').classList.add('hidden');
        
        formJoin.classList.remove('hidden');
        document.getElementById('join-result').classList.add('hidden');
    };
});
