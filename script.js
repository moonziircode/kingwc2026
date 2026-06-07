import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

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

    const generateCode = (length) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const savePlayerCode = (code) => {
        localStorage.setItem('kg_player_code', code);
    };

    const showLoading = (btn) => {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.textContent = "Loading...";
    };

    const hideLoading = (btn) => {
        btn.disabled = false;
        if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    };

    // Handle Create League Submit
    formCreate.addEventListener('submit', async (e) => {
        e.preventDefault();
        const leagueName = document.getElementById('create-league-name').value;
        const nickname = document.getElementById('create-nickname').value;
        const btnSubmit = formCreate.querySelector('button[type="submit"]');

        if (leagueName && nickname) {
            showLoading(btnSubmit);
            const leagueCode = generateCode(6);
            const playerCode = generateCode(12);

            const leagueData = {
                leagueCode: leagueCode,
                leagueName: leagueName,
                hostPlayerCode: playerCode,
                actualScores: {},
                chatMessages: [
                    { sender: "System", message: `Liga "${leagueName}" berhasil dibuat! Bagikan kode liga ${leagueCode} ke teman-temanmu.`, time: new Date().toISOString() }
                ],
                playerCodes: [playerCode], // For querying
                players: [
                    { playerCode: playerCode, nickname: nickname, isHost: true, predictions: {}, points: 0 }
                ]
            };

            try {
                await setDoc(doc(db, "leagues", leagueCode), leagueData);
                localStorage.setItem('kg_current_league_code', leagueCode);
                savePlayerCode(playerCode);

                formCreate.classList.add('hidden');
                document.getElementById('create-result').classList.remove('hidden');
                document.getElementById('display-league-code').textContent = leagueCode;
                document.getElementById('display-player-code-create').textContent = playerCode;
            } catch (error) {
                console.error("Error creating league:", error);
                alert("Gagal membuat liga. Coba lagi.");
            } finally {
                hideLoading(btnSubmit);
            }
        }
    });

    // Handle Join League Submit
    formJoin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const leagueCode = document.getElementById('join-league-code').value.toUpperCase();
        const nickname = document.getElementById('join-nickname').value;
        const btnSubmit = formJoin.querySelector('button[type="submit"]');

        if (leagueCode && nickname) {
            showLoading(btnSubmit);
            const playerCode = generateCode(12);

            try {
                const docRef = doc(db, "leagues", leagueCode);
                const snap = await getDoc(docRef);

                if (!snap.exists()) {
                    alert("Kode liga tidak ditemukan di server. Periksa kembali kodenya.");
                    hideLoading(btnSubmit);
                    return;
                }

                const newPlayer = {
                    playerCode: playerCode,
                    nickname: nickname,
                    isHost: false,
                    predictions: {},
                    points: 0
                };

                const joinMsg = {
                    sender: "System",
                    message: `${nickname} telah bergabung ke dalam liga! 👋`,
                    time: new Date().toISOString()
                };

                await updateDoc(docRef, {
                    players: arrayUnion(newPlayer),
                    playerCodes: arrayUnion(playerCode),
                    chatMessages: arrayUnion(joinMsg)
                });

                localStorage.setItem('kg_current_league_code', leagueCode);
                savePlayerCode(playerCode);

                formJoin.classList.add('hidden');
                document.getElementById('join-result').classList.remove('hidden');
                document.getElementById('display-player-code-join').textContent = playerCode;

            } catch (error) {
                console.error("Error joining league:", error);
                alert("Gagal bergabung ke liga.");
            } finally {
                hideLoading(btnSubmit);
            }
        }
    });

    // Handle Continue Submit
    formContinue.addEventListener('submit', async (e) => {
        e.preventDefault();
        const playerCode = document.getElementById('continue-player-code').value.toUpperCase();
        const btnSubmit = formContinue.querySelector('button[type="submit"]');
        
        if (playerCode) {
            showLoading(btnSubmit);
            try {
                const q = query(collection(db, "leagues"), where("playerCodes", "array-contains", playerCode));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const foundLeague = querySnapshot.docs[0].id;
                    savePlayerCode(playerCode);
                    localStorage.setItem('kg_current_league_code', foundLeague);
                    dialogContinue.close();
                    window.location.href = 'dashboard.html';
                } else {
                    alert('Kode Pemain tidak ditemukan di liga manapun. Silakan buat atau gabung liga baru.');
                }
            } catch (error) {
                console.error("Error finding league:", error);
                alert("Terjadi kesalahan jaringan.");
            } finally {
                hideLoading(btnSubmit);
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

    // Copy to clipboard functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            const textToCopy = document.getElementById(targetId).textContent;
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = e.target.textContent;
                e.target.textContent = '✅ Copied!';
                e.target.style.color = 'var(--primary-color)';
                setTimeout(() => {
                    e.target.textContent = originalText;
                    e.target.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Gagal menyalin kode. Silakan blok dan salin manual.');
            });
        });
    });
});
