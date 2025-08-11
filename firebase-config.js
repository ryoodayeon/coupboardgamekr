// Firebase 설정 및 실시간 데이터베이스 연동

// Firebase 초기화 (실제 설정값)
const firebaseConfig = {
    apiKey: "AIzaSyBkAygqR6tP_cLKCyfe4yVyExhL1hopYh0",
    authDomain: "coupboardgamekr.firebaseapp.com",
    databaseURL: "https://coupboardgamekr-default-rtdb.firebaseio.com",
    projectId: "coupboardgamekr",
    storageBucket: "coupboardgamekr.firebasestorage.app",
    messagingSenderId: "476698707291",
    appId: "1:476698707291:web:ec634f83754727172d467e",
    measurementId: "G-EJVZ9SLZ2K"
};

// Firebase가 로드되었는지 확인
let firebaseApp, database;
let isFirebaseEnabled = false;

function initializeFirebase() {
    try {
        // Firebase SDK가 로드되었는지 확인
        if (typeof firebase !== 'undefined') {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            isFirebaseEnabled = true;
            console.log('🔥 Firebase 연결 성공! 실시간 멀티플레이 활성화됨');
            return true;
        } else {
            console.warn('⚠️ Firebase SDK가 로드되지 않았습니다. 로컬 모드로 실행됩니다.');
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Firebase 초기화 실패:', error.message);
        console.warn('로컬 모드로 실행됩니다.');
        return false;
    }
}

// 온라인 방 관리 클래스
class OnlineRoomManager {
    constructor() {
        this.localRoomManager = new RoomManager(); // 기존 로컬 매니저
        this.isOnline = isFirebaseEnabled;
        this.roomListeners = new Map(); // 방별 리스너 저장
    }

    // 방 생성 (온라인)
    async createRoom(hostId, hostName, gameMode = 'basic') {
        if (!this.isOnline) {
            return this.localRoomManager.createRoom(hostId, hostName, gameMode);
        }

        try {
            const roomCode = this.generateRoomCode();
            const room = {
                code: roomCode,
                gameMode: gameMode,
                host: hostId,
                players: [{ id: hostId, name: hostName }],
                status: 'waiting',
                createdAt: Date.now(),
                lastActivity: Date.now()
            };

            // Firebase에 방 데이터 저장
            await database.ref(`rooms/${roomCode}`).set(room);
            
            // 방 생성자에게 자동으로 리스너 추가
            this.addRoomListener(roomCode);
            
            console.log(`🌐 온라인 방 생성됨: ${roomCode}`);
            return roomCode;
        } catch (error) {
            console.error('온라인 방 생성 실패:', error);
            // 실패시 로컬 모드로 폴백
            return this.localRoomManager.createRoom(hostId, hostName, gameMode);
        }
    }

    // 방 입장 (온라인)
    async joinRoom(roomCode, playerId, playerName) {
        if (!this.isOnline) {
            return this.localRoomManager.joinRoom(roomCode, playerId, playerName);
        }

        try {
            const roomRef = database.ref(`rooms/${roomCode}`);
            const snapshot = await roomRef.once('value');
            const room = snapshot.val();

            if (!room) {
                return { success: false, message: '존재하지 않는 방입니다.' };
            }

            // 방이 30분 이상 된 경우
            const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
            if (room.createdAt < thirtyMinutesAgo) {
                await roomRef.remove();
                return { success: false, message: '만료된 방입니다.' };
            }

            if (room.players.length >= GAME_CONFIG.MAX_PLAYERS) {
                return { success: false, message: '방이 가득 찼습니다.' };
            }

            if (room.status !== 'waiting') {
                return { success: false, message: '이미 게임이 시작된 방입니다.' };
            }

            // 중복 이름 검사
            if (room.players.some(p => p.name === playerName)) {
                return { success: false, message: '이미 사용 중인 닉네임입니다.' };
            }

            // 플레이어 추가
            const newPlayer = { id: playerId, name: playerName };
            const updatedPlayers = [...room.players, newPlayer];
            
            await database.ref(`rooms/${roomCode}/players`).set(updatedPlayers);
            await database.ref(`rooms/${roomCode}/lastActivity`).set(Date.now());

            // 방 리스너 추가
            this.addRoomListener(roomCode);

            const updatedRoom = { ...room, players: updatedPlayers };
            console.log(`🌐 온라인 방 입장됨: ${roomCode}`);
            return { success: true, room: updatedRoom };
        } catch (error) {
            console.error('온라인 방 입장 실패:', error);
            return { success: false, message: '방 입장에 실패했습니다.' };
        }
    }

    // 방 나가기 (온라인)
    async leaveRoom(roomCode, playerId) {
        if (!this.isOnline) {
            return this.localRoomManager.leaveRoom(roomCode, playerId);
        }

        try {
            const roomRef = database.ref(`rooms/${roomCode}`);
            const snapshot = await roomRef.once('value');
            const room = snapshot.val();

            if (!room) return { success: false };

            // 플레이어 제거
            const updatedPlayers = room.players.filter(p => p.id !== playerId);

            if (updatedPlayers.length === 0) {
                // 방이 비었으면 삭제
                await roomRef.remove();
            } else {
                // 호스트가 나가면 다음 플레이어가 호스트
                let newHost = room.host;
                if (room.host === playerId) {
                    newHost = updatedPlayers[0].id;
                }

                await database.ref(`rooms/${roomCode}/players`).set(updatedPlayers);
                await database.ref(`rooms/${roomCode}/host`).set(newHost);
                await database.ref(`rooms/${roomCode}/lastActivity`).set(Date.now());
            }

            // 리스너 제거
            this.removeRoomListener(roomCode);

            return { success: true };
        } catch (error) {
            console.error('온라인 방 나가기 실패:', error);
            return { success: false };
        }
    }

    // 방 정보 가져오기
    async getRoom(roomCode) {
        if (!this.isOnline) {
            return this.localRoomManager.getRoom(roomCode);
        }

        try {
            const snapshot = await database.ref(`rooms/${roomCode}`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('방 정보 가져오기 실패:', error);
            return null;
        }
    }

    // 실시간 방 상태 리스너 추가
    addRoomListener(roomCode) {
        if (!this.isOnline || this.roomListeners.has(roomCode)) return;

        const roomRef = database.ref(`rooms/${roomCode}`);
        const listener = roomRef.on('value', (snapshot) => {
            const room = snapshot.val();
            if (room && window.coupApp) {
                // 앱에 방 상태 변경 알림
                window.coupApp.onRoomUpdated(room);
            }
        });

        this.roomListeners.set(roomCode, { ref: roomRef, listener: listener });
        console.log(`🔄 실시간 리스너 추가: ${roomCode}`);
    }

    // 리스너 제거
    removeRoomListener(roomCode) {
        const listenerData = this.roomListeners.get(roomCode);
        if (listenerData) {
            listenerData.ref.off('value', listenerData.listener);
            this.roomListeners.delete(roomCode);
            console.log(`🔄 리스너 제거: ${roomCode}`);
        }
    }

    // 게임 시작
    async startGame(roomCode, hostId) {
        if (!this.isOnline) {
            return this.localRoomManager.startGame(roomCode, hostId);
        }

        try {
            const room = await this.getRoom(roomCode);
            if (!room || room.host !== hostId) {
                return { success: false, message: '권한이 없습니다.' };
            }

            if (room.players.length < GAME_CONFIG.MIN_PLAYERS) {
                return { success: false, message: '최소 2명의 플레이어가 필요합니다.' };
            }

            // 게임 로직 초기화
            const gameInstance = new CoupGame();
            gameInstance.initializeGame(room.players, room.gameMode);
            
            console.log('🎮 Firebase 게임 로직 초기화 완료:', gameInstance);
            console.log('👥 플레이어 목록:', gameInstance.players.map(p => ({name: p.name, cards: p.cards.length})));
            
            // 게임 상태를 Firebase에 저장
            const gameState = gameInstance.getGameState();
            await database.ref(`rooms/${roomCode}/status`).set('playing');
            await database.ref(`rooms/${roomCode}/game`).set(gameState);
            await database.ref(`rooms/${roomCode}/lastActivity`).set(Date.now());
            
            console.log('🔥 Firebase에 게임 데이터 저장 완료');

            return { success: true, room: { ...room, game: gameInstance } };
        } catch (error) {
            console.error('온라인 게임 시작 실패:', error);
            return { success: false, message: '게임 시작에 실패했습니다.' };
        }
    }

    // 게임 액션 동기화
    async syncGameAction(roomCode, action) {
        if (!this.isOnline) return;

        try {
            await database.ref(`rooms/${roomCode}/lastAction`).set({
                ...action,
                timestamp: Date.now()
            });
            await database.ref(`rooms/${roomCode}/lastActivity`).set(Date.now());
        } catch (error) {
            console.error('게임 액션 동기화 실패:', error);
        }
    }

    // 방 코드 생성
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < GAME_CONFIG.ROOM_CODE_LENGTH; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 게임 상태 업데이트
    async updateGameState(gameState) {
        if (!this.currentRoomCode) return;
        
        try {
            await this.database.ref(`rooms/${this.currentRoomCode}/game`).set(gameState);
            console.log('🔄 Firebase 게임 상태 업데이트 완료');
        } catch (error) {
            console.error('❌ Firebase 게임 상태 업데이트 실패:', error);
            throw error;
        }
    }

    // 행동 대응 브로드캐스트
    async broadcastActionResponse(actionData) {
        if (!this.currentRoomCode) return;
        
        try {
            // 행동 데이터를 임시 컬렉션에 저장
            await this.database.ref(`rooms/${this.currentRoomCode}/pendingActions`).push({
                ...actionData,
                timestamp: Date.now()
            });
            console.log('📢 행동 대응 요청 브로드캐스트:', actionData);
        } catch (error) {
            console.error('❌ 행동 대응 브로드캐스트 실패:', error);
        }
    }

    // 행동 응답 전송
    async sendActionResponse(responseData) {
        if (!this.currentRoomCode) return;
        
        try {
            await this.database.ref(`rooms/${this.currentRoomCode}/actionResponses`).push({
                ...responseData,
                timestamp: Date.now()
            });
            console.log('📤 행동 응답 전송:', responseData);
        } catch (error) {
            console.error('❌ 행동 응답 전송 실패:', error);
        }
    }

    // 연결 상태 확인
    isConnected() {
        return this.isOnline;
    }

    // 모든 리스너 정리
    cleanup() {
        this.roomListeners.forEach((listenerData, roomCode) => {
            this.removeRoomListener(roomCode);
        });
    }
}

// 전역 변수로 설정
let onlineRoomManager;