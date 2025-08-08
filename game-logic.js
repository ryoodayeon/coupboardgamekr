// 게임 로직 및 상태 관리

class CoupGame {
    constructor() {
        this.reset();
    }

    reset() {
        this.gameId = null;
        this.gameMode = 'basic'; // 'basic' 또는 'expansion'
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gamePhase = 'waiting'; // 'waiting', 'playing', 'ended'
        this.deck = [];
        this.discardPile = [];
        this.currentAction = null;
        this.pendingChallenges = [];
        this.pendingBlocks = [];
        this.actionLog = [];
        this.sanctuary = 0; // 확장판용 피난처 코인
        this.myPlayerId = null;
        this.host = null;
    }

    // 게임 초기화
    initializeGame(players, gameMode = 'basic') {
        // 플레이어 순서 랜덤 섞기
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        
        this.players = shuffledPlayers.map((player, index) => ({
            id: player.id,
            name: player.name,
            cards: [],
            coins: GAME_CONFIG.STARTING_COINS,
            isAlive: true,
            isHost: player.id === players[0].id, // 원래 호스트 유지
            religion: gameMode === 'expansion' ? (index % 2 === 0 ? 'catholic' : 'protestant') : null,
            turnOrder: index
        }));
        
        this.gameMode = gameMode;
        this.currentPlayerIndex = 0;
        this.gamePhase = 'starting'; // 시작 단계 추가
        this.sanctuary = 0;
        this.host = players[0].id;
        this.firstPlayer = shuffledPlayers[0]; // 첫 번째 플레이어 저장
        
        this.createDeck();
        this.dealCards();
        this.shuffleDeck();
        
        this.logAction(`게임이 시작되었습니다! (${gameMode === 'expansion' ? '확장판' : '기본판'})`);
        this.logAction(`플레이어 순서: ${this.players.map(p => p.name).join(' → ')}`);
        this.logAction(`${this.firstPlayer.name}님이 첫 번째 차례입니다!`);
    }

    // 덱 생성 (기본판: 각 캐릭터 3장씩 총 15장)
    createDeck() {
        this.deck = [];
        
        if (this.gameMode === 'basic') {
            // 기본판: 공작, 암살자, 대사, 사령관, 백작부인 각 3장씩
            Object.keys(CHARACTERS).forEach(charId => {
                if (charId !== 'INQUISITOR') { // 확장판 캐릭터 제외
                    for (let i = 0; i < GAME_CONFIG.CARDS_PER_CHARACTER; i++) {
                        this.deck.push(charId.toLowerCase());
                    }
                }
            });
        } else {
            // 확장판: 대사 대신 종교재판관
            Object.keys(CHARACTERS).forEach(charId => {
                if (charId !== 'AMBASSADOR') { // 대사 제외
                    for (let i = 0; i < GAME_CONFIG.CARDS_PER_CHARACTER; i++) {
                        this.deck.push(charId.toLowerCase());
                    }
                }
            });
        }
        
        this.shuffleDeck();
        console.log(`덱 생성 완료: 총 ${this.deck.length}장 (${this.gameMode})`);
    }

    // 덱 셔플
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    // 카드 배분
    dealCards() {
        console.log('🃏 카드 배분 시작');
        console.log('📦 덱 상태:', this.deck.length, '장');
        
        this.players.forEach((player, index) => {
            player.cards = [];
            for (let i = 0; i < GAME_CONFIG.STARTING_CARDS; i++) {
                if (this.deck.length > 0) {
                    const card = this.deck.pop();
                    player.cards.push(card);
                    console.log(`👤 ${player.name}에게 ${card} 카드 배분`);
                } else {
                    console.error('❌ 덱에 카드가 부족합니다!');
                }
            }
            console.log(`✅ ${player.name}: ${player.cards.length}장 (${player.cards.join(', ')})`);
        });
        
        console.log('🃏 카드 배분 완료. 남은 덱:', this.deck.length, '장');
    }

    // 현재 플레이어 가져오기
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    // 살아있는 플레이어 가져오기
    getAlivePlayers() {
        return this.players.filter(player => player.isAlive);
    }

    // 플레이어 찾기
    getPlayerById(id) {
        return this.players.find(player => player.id === id);
    }

    // 내 플레이어 정보 가져오기
    getMyPlayer() {
        return this.getPlayerById(this.myPlayerId);
    }

    // 게임 실제 시작 (첫 플레이어가 시작 버튼 클릭 후)
    startActualGame() {
        if (this.gamePhase === 'starting') {
            this.gamePhase = 'playing';
            this.logAction(`게임이 본격적으로 시작됩니다!`);
            return true;
        }
        return false;
    }

    // 다음 차례로 넘기기
    nextTurn() {
        const alivePlayers = this.getAlivePlayers();
        if (alivePlayers.length <= 1) {
            this.endGame();
            return;
        }

        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (!this.players[this.currentPlayerIndex].isAlive);

        const currentPlayer = this.getCurrentPlayer();
        
        // 10개 이상 코인 보유시 강제 쿠데타
        if (currentPlayer.coins >= GAME_CONFIG.MAX_COINS_BEFORE_COUP) {
            this.logAction(`${currentPlayer.name}님은 코인 ${currentPlayer.coins}개를 보유하여 반드시 쿠데타를 해야 합니다!`);
        } else {
            this.logAction(`${currentPlayer.name}님의 차례입니다.`);
        }
    }

    // 행동 실행
    executeAction(action, targetId = null, characterId = null) {
        const player = this.getCurrentPlayer();
        const target = targetId ? this.getPlayerById(targetId) : null;

        // 행동 유효성 검사
        if (!this.isValidAction(action, player, target, characterId)) {
            return { success: false, message: '유효하지 않은 행동입니다.' };
        }

        this.currentAction = {
            type: action,
            playerId: player.id,
            targetId: targetId,
            characterId: characterId,
            blocked: false,
            challenged: false
        };

        // 도전 가능한 행동인지 확인
        if (this.isChallengeable(action)) {
            this.logAction(`${player.name}님이 ${this.getActionName(action, characterId)}을(를) 시도합니다.`);
            return { success: true, waitingFor: 'challenges' };
        }

        // 차단 가능한 행동인지 확인
        if (this.isBlockable(action)) {
            this.logAction(`${player.name}님이 ${this.getActionName(action, characterId)}을(를) 시도합니다.`);
            return { success: true, waitingFor: 'blocks' };
        }

        // 즉시 실행 가능한 행동
        return this.resolveAction();
    }

    // 행동 유효성 검사
    isValidAction(action, player, target, characterId) {
        // 코인 부족 검사
        if (action === 'coup' && player.coins < GAME_CONFIG.COUP_COST) {
            return false;
        }
        if (action === 'assassinate' && player.coins < CHARACTER_ACTIONS.ASSASSINATE.cost) {
            return false;
        }

        // 타겟 필요 검사
        if (['coup', 'assassinate', 'steal', 'examine'].includes(action) && !target) {
            return false;
        }

        // 확장판 종교 규칙 검사
        if (this.gameMode === 'expansion' && target) {
            if (this.isSameReligion(player, target) && 
                ['coup', 'assassinate', 'steal'].includes(action)) {
                return false;
            }
        }

        // 10개 이상 코인 보유시 강제 쿠데타
        if (player.coins >= GAME_CONFIG.MAX_COINS_BEFORE_COUP && action !== 'coup') {
            return false;
        }

        return true;
    }

    // 종교 확인 (확장판)
    isSameReligion(player1, player2) {
        return player1.religion && player2.religion && player1.religion === player2.religion;
    }

    // 도전 가능 여부 확인
    isChallengeable(action) {
        return ['tax', 'assassinate', 'steal', 'exchange', 'exchange_one', 'examine'].includes(action);
    }

    // 차단 가능 여부 확인
    isBlockable(action) {
        return ['foreign_aid', 'assassinate', 'steal'].includes(action);
    }

    // 도전 처리
    processChallenge(challengerId) {
        if (!this.currentAction) return { success: false };

        const challenger = this.getPlayerById(challengerId);
        const actor = this.getPlayerById(this.currentAction.playerId);
        const requiredCharacter = this.getRequiredCharacter(this.currentAction.type);

        this.logAction(`${challenger.name}님이 ${actor.name}님을 도전합니다!`);

        // 도전 결과 확인
        const hasCharacter = actor.cards.includes(requiredCharacter);

        if (hasCharacter) {
            // 도전 실패 - 도전자가 카드 잃음
            this.logAction(`${actor.name}님이 실제로 ${CHARACTERS[requiredCharacter.toUpperCase()].name}을(를) 가지고 있었습니다!`);
            this.eliminateCard(challenger);
            
            // 카드 셔플
            this.reshuffleCharacterCard(actor, requiredCharacter);
            
            // 행동 실행
            this.currentAction.challenged = true;
            return this.resolveAction();
        } else {
            // 도전 성공 - 행동자가 카드 잃음
            this.logAction(`${actor.name}님이 ${CHARACTERS[requiredCharacter.toUpperCase()].name}을(를) 가지고 있지 않았습니다!`);
            this.eliminateCard(actor);
            
            this.currentAction = null;
            this.nextTurn();
            return { success: true, challenged: true };
        }
    }

    // 차단 처리
    processBlock(blockerId, blockCharacter) {
        if (!this.currentAction) return { success: false };

        const blocker = this.getPlayerById(blockerId);
        const actor = this.getPlayerById(this.currentAction.playerId);

        this.logAction(`${blocker.name}님이 ${CHARACTERS[blockCharacter.toUpperCase()].name}로 차단을 시도합니다!`);

        // 차단도 도전받을 수 있음
        this.currentAction.blocked = true;
        this.currentAction.blockerId = blockerId;
        this.currentAction.blockCharacter = blockCharacter;

        return { success: true, waitingFor: 'block_challenges' };
    }

    // 차단에 대한 도전 처리
    processBlockChallenge(challengerId) {
        const challenger = this.getPlayerById(challengerId);
        const blocker = this.getPlayerById(this.currentAction.blockerId);
        const blockCharacter = this.currentAction.blockCharacter;

        this.logAction(`${challenger.name}님이 ${blocker.name}님의 차단을 도전합니다!`);

        const hasCharacter = blocker.cards.includes(blockCharacter);

        if (hasCharacter) {
            // 차단 도전 실패 - 차단 성공
            this.logAction(`${blocker.name}님이 실제로 ${CHARACTERS[blockCharacter.toUpperCase()].name}을(를) 가지고 있었습니다!`);
            this.eliminateCard(challenger);
            this.reshuffleCharacterCard(blocker, blockCharacter);
            
            this.logAction(`${this.getActionName(this.currentAction.type)}이(가) 차단되었습니다.`);
            this.currentAction = null;
            this.nextTurn();
            return { success: true, blocked: true };
        } else {
            // 차단 도전 성공 - 차단 실패, 원래 행동 실행
            this.logAction(`${blocker.name}님이 ${CHARACTERS[blockCharacter.toUpperCase()].name}을(를) 가지고 있지 않았습니다!`);
            this.eliminateCard(blocker);
            
            // 원래 행동 실행
            return this.resolveAction();
        }
    }

    // 행동 이름 가져오기
    getActionName(action, characterId) {
        switch (action) {
            case 'income': return '소득';
            case 'foreign_aid': return '해외 원조';
            case 'coup': return '쿠데타';
            case 'tax': return '세금';
            case 'assassinate': return '암살';
            case 'steal': return '갈취';
            case 'exchange': return '교환';
            case 'exchange_one': return '교환 (1장)';
            case 'examine': return '심문';
            default: return action;
        }
    }

    // 필요한 캐릭터 가져오기
    getRequiredCharacter(action) {
        switch (action) {
            case 'tax': return 'duke';
            case 'assassinate': return 'assassin';
            case 'steal': return 'captain';
            case 'exchange': return 'ambassador';
            case 'exchange_one':
            case 'examine': return 'inquisitor';
            default: return null;
        }
    }

    // 행동 해결
    resolveAction() {
        if (!this.currentAction) return { success: false };

        const player = this.getPlayerById(this.currentAction.playerId);
        const target = this.currentAction.targetId ? this.getPlayerById(this.currentAction.targetId) : null;

        switch (this.currentAction.type) {
            case 'income':
                player.coins += 1;
                this.logAction(`${player.name}님이 소득으로 코인 1개를 획득했습니다.`);
                break;

            case 'foreign_aid':
                player.coins += 2;
                this.logAction(`${player.name}님이 해외 원조로 코인 2개를 획득했습니다.`);
                break;

            case 'coup':
                player.coins -= GAME_CONFIG.COUP_COST;
                this.logAction(`${player.name}님이 ${target.name}님을 쿠데타했습니다!`);
                return this.eliminateCard(target);

            case 'tax':
                player.coins += 3;
                this.logAction(`${player.name}님이 세금으로 코인 3개를 획득했습니다.`);
                break;

            case 'assassinate':
                player.coins -= CHARACTER_ACTIONS.ASSASSINATE.cost;
                this.logAction(`${player.name}님이 ${target.name}님을 암살했습니다!`);
                return this.eliminateCard(target);

            case 'steal':
                const stolenCoins = Math.min(2, target.coins);
                target.coins -= stolenCoins;
                player.coins += stolenCoins;
                this.logAction(`${player.name}님이 ${target.name}님에게서 코인 ${stolenCoins}개를 갈취했습니다.`);
                break;

            case 'exchange':
                return this.handleExchange(player, 2);

            case 'exchange_one':
                return this.handleExchange(player, 1);

            case 'examine':
                return this.handleExamine(player, target);
        }

        this.currentAction = null;
        this.nextTurn();
        return { success: true };
    }

    // 카드 교환 처리
    handleExchange(player, cardCount) {
        const drawnCards = [];
        for (let i = 0; i < cardCount && this.deck.length > 0; i++) {
            drawnCards.push(this.deck.pop());
        }

        this.logAction(`${player.name}님이 카드를 교환합니다.`);
        
        // 클라이언트에서 카드 선택을 기다림
        return { 
            success: true, 
            waitingFor: 'card_selection',
            drawnCards: drawnCards,
            playerCards: [...player.cards]
        };
    }

    // 카드 교환 완료
    completeExchange(playerId, selectedCards, returnedCards) {
        const player = this.getPlayerById(playerId);
        
        // 선택한 카드로 교체
        player.cards = selectedCards;
        
        // 반환할 카드들을 덱에 추가
        this.deck.push(...returnedCards);
        this.shuffleDeck();

        this.logAction(`${player.name}님이 카드 교환을 완료했습니다.`);
        
        this.currentAction = null;
        this.nextTurn();
        return { success: true };
    }

    // 카드 조사 처리
    handleExamine(examiner, target) {
        this.logAction(`${examiner.name}님이 ${target.name}님의 카드를 조사합니다.`);
        
        return {
            success: true,
            waitingFor: 'card_examine',
            targetCards: [...target.cards]
        };
    }

    // 카드 조사 완료
    completeExamine(examinerId, targetId, cardIndex, shouldExchange) {
        const examiner = this.getPlayerById(examinerId);
        const target = this.getPlayerById(targetId);

        if (shouldExchange && this.deck.length > 0) {
            const oldCard = target.cards[cardIndex];
            const newCard = this.deck.pop();
            
            target.cards[cardIndex] = newCard;
            this.deck.push(oldCard);
            this.shuffleDeck();
            
            this.logAction(`${examiner.name}님이 ${target.name}님의 카드를 교체했습니다.`);
        } else {
            this.logAction(`${examiner.name}님이 ${target.name}님의 카드를 그대로 두었습니다.`);
        }

        this.currentAction = null;
        this.nextTurn();
        return { success: true };
    }

    // 카드 제거
    eliminateCard(player) {
        if (player.cards.length === 0) return { success: false };

        if (player.cards.length === 1) {
            // 카드가 1장만 남은 경우 자동 제거
            const eliminatedCard = player.cards.pop();
            this.discardPile.push(eliminatedCard);
            
            if (player.cards.length === 0) {
                player.isAlive = false;
                this.logAction(`${player.name}님이 탈락했습니다!`);
                
                // 게임 종료 확인
                const alivePlayers = this.getAlivePlayers();
                if (alivePlayers.length === 1) {
                    this.endGame();
                    return { success: true, gameEnded: true };
                }
            }
        } else {
            // 카드 선택을 기다림
            this.logAction(`${player.name}님이 제거할 카드를 선택해야 합니다.`);
            return { 
                success: true, 
                waitingFor: 'card_elimination',
                playerId: player.id 
            };
        }

        this.currentAction = null;
        this.nextTurn();
        return { success: true };
    }

    // 카드 제거 완료
    completeElimination(playerId, cardIndex) {
        const player = this.getPlayerById(playerId);
        const eliminatedCard = player.cards.splice(cardIndex, 1)[0];
        this.discardPile.push(eliminatedCard);

        this.logAction(`${player.name}님이 ${CHARACTERS[eliminatedCard.toUpperCase()].name} 카드를 잃었습니다.`);

        if (player.cards.length === 0) {
            player.isAlive = false;
            this.logAction(`${player.name}님이 탈락했습니다!`);
            
            // 게임 종료 확인
            const alivePlayers = this.getAlivePlayers();
            if (alivePlayers.length === 1) {
                this.endGame();
                return { success: true, gameEnded: true };
            }
        }

        this.currentAction = null;
        this.nextTurn();
        return { success: true };
    }

    // 캐릭터 카드 재섞기
    reshuffleCharacterCard(player, character) {
        const cardIndex = player.cards.indexOf(character);
        if (cardIndex !== -1) {
            player.cards.splice(cardIndex, 1);
            this.deck.push(character);
            this.shuffleDeck();
            
            if (this.deck.length > 0) {
                player.cards.push(this.deck.pop());
            }
        }
    }

    // 확장판: 종교 변경
    changeReligion(playerId, targetId = null, cost = 1) {
        const player = this.getPlayerById(playerId);
        const target = targetId ? this.getPlayerById(targetId) : player;

        if (player.coins < cost) return { success: false, message: '코인이 부족합니다.' };

        player.coins -= cost;
        this.sanctuary += cost;
        
        target.religion = target.religion === 'catholic' ? 'protestant' : 'catholic';
        
        if (targetId) {
            this.logAction(`${player.name}님이 ${target.name}님의 종교를 변경했습니다.`);
        } else {
            this.logAction(`${player.name}님이 자신의 종교를 변경했습니다.`);
        }

        return { success: true };
    }

    // 확장판: 피난처 획득
    takeSanctuary(playerId) {
        const player = this.getPlayerById(playerId);
        
        if (!player.cards.includes('duke')) {
            return { success: false, message: '공작 카드가 필요합니다.' };
        }

        const coins = this.sanctuary;
        player.coins += coins;
        this.sanctuary = 0;

        this.logAction(`${player.name}님이 피난처에서 코인 ${coins}개를 획득했습니다.`);
        return { success: true };
    }

    // 게임 종료
    endGame() {
        this.gamePhase = 'ended';
        const alivePlayers = this.getAlivePlayers();
        
        if (alivePlayers.length === 1) {
            this.logAction(`🎉 ${alivePlayers[0].name}님이 승리했습니다!`);
        }

        // 순위 계산
        const rankings = this.calculateRankings();
        return { gameEnded: true, rankings: rankings };
    }

    // 순위 계산
    calculateRankings() {
        return this.players
            .sort((a, b) => {
                // 살아있는 플레이어가 우선
                if (a.isAlive !== b.isAlive) return b.isAlive - a.isAlive;
                // 카드 수로 정렬
                if (a.cards.length !== b.cards.length) return b.cards.length - a.cards.length;
                // 코인 수로 정렬
                return b.coins - a.coins;
            })
            .map((player, index) => ({
                rank: index + 1,
                name: player.name,
                cards: player.cards.length,
                coins: player.coins,
                isAlive: player.isAlive
            }));
    }

    // 행동 로그 추가
    logAction(message) {
        this.actionLog.unshift({
            message: message,
            timestamp: new Date().toLocaleTimeString()
        });
        
        // 최대 20개 로그만 유지
        if (this.actionLog.length > 20) {
            this.actionLog = this.actionLog.slice(0, 20);
        }
    }

    // 게임 상태 가져오기
    getGameState() {
        return {
            gameId: this.gameId,
            gameMode: this.gameMode,
            gamePhase: this.gamePhase,
            players: this.players,
            currentPlayerIndex: this.currentPlayerIndex,
            currentAction: this.currentAction,
            actionLog: this.actionLog,
            sanctuary: this.sanctuary,
            myPlayerId: this.myPlayerId
        };
    }
}

// 방 관리 클래스 (localStorage 기반)
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.loadRoomsFromStorage();
        
        // 주기적으로 만료된 방 정리 (5분마다)
        setInterval(() => {
            this.cleanupExpiredRooms();
        }, 5 * 60 * 1000);
    }

    // localStorage에서 방 데이터 로드
    loadRoomsFromStorage() {
        try {
            const storedRooms = localStorage.getItem('coup_rooms');
            if (storedRooms) {
                const roomsData = JSON.parse(storedRooms);
                Object.entries(roomsData).forEach(([code, roomData]) => {
                    // 30분 이내에 생성된 방만 로드
                    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
                    if (roomData.createdAt > thirtyMinutesAgo) {
                        const room = {
                            ...roomData,
                            game: new CoupGame()
                        };
                        if (roomData.gameState) {
                            Object.assign(room.game, roomData.gameState);
                        }
                        this.rooms.set(code, room);
                    }
                });
            }
        } catch (error) {
            console.warn('방 데이터 로드 실패:', error);
        }
    }

    // localStorage에 방 데이터 저장
    saveRoomsToStorage() {
        try {
            const roomsData = {};
            this.rooms.forEach((room, code) => {
                roomsData[code] = {
                    code: room.code,
                    gameMode: room.gameMode,
                    host: room.host,
                    players: room.players,
                    status: room.status,
                    createdAt: room.createdAt,
                    gameState: room.status === 'playing' ? room.game.getGameState() : null
                };
            });
            localStorage.setItem('coup_rooms', JSON.stringify(roomsData));
        } catch (error) {
            console.warn('방 데이터 저장 실패:', error);
        }
    }

    // 만료된 방 정리
    cleanupExpiredRooms() {
        const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
        const expiredRooms = [];
        
        this.rooms.forEach((room, code) => {
            if (room.createdAt < thirtyMinutesAgo) {
                expiredRooms.push(code);
            }
        });
        
        expiredRooms.forEach(code => {
            this.rooms.delete(code);
        });
        
        if (expiredRooms.length > 0) {
            this.saveRoomsToStorage();
        }
    }

    // 방 생성
    createRoom(hostId, hostName, gameMode = 'basic') {
        const roomCode = this.generateRoomCode();
        const room = {
            code: roomCode,
            gameMode: gameMode,
            host: hostId,
            players: [{ id: hostId, name: hostName }],
            game: new CoupGame(),
            status: 'waiting',
            createdAt: Date.now()
        };
        
        this.rooms.set(roomCode, room);
        this.saveRoomsToStorage();
        return roomCode;
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

    // 방 입장
    joinRoom(roomCode, playerId, playerName) {
        // 먼저 최신 데이터 로드
        this.loadRoomsFromStorage();
        
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, message: '존재하지 않는 방입니다.' };
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

        room.players.push({ id: playerId, name: playerName });
        this.saveRoomsToStorage();
        return { success: true, room: room };
    }

    // 방 나가기
    leaveRoom(roomCode, playerId) {
        const room = this.rooms.get(roomCode);
        if (!room) return { success: false };

        room.players = room.players.filter(p => p.id !== playerId);

        if (room.players.length === 0) {
            this.rooms.delete(roomCode);
        } else if (room.host === playerId) {
            // 호스트가 나가면 다음 플레이어가 호스트
            room.host = room.players[0].id;
        }

        this.saveRoomsToStorage();
        return { success: true, room: room };
    }

    // 방 정보 가져오기
    getRoom(roomCode) {
        this.loadRoomsFromStorage();
        return this.rooms.get(roomCode);
    }

    // 게임 시작
    startGame(roomCode, hostId) {
        const room = this.rooms.get(roomCode);
        if (!room || room.host !== hostId) {
            return { success: false, message: '권한이 없습니다.' };
        }

        if (room.players.length < GAME_CONFIG.MIN_PLAYERS) {
            return { success: false, message: '최소 2명의 플레이어가 필요합니다.' };
        }

        room.status = 'playing';
        room.game.initializeGame(room.players, room.gameMode);
        this.saveRoomsToStorage();
        
        return { success: true, game: room.game };
    }
}

// 전역 인스턴스
const roomManager = new RoomManager();
const game = new CoupGame();