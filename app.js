// 메인 애플리케이션 로직

class CoupApp {
    constructor() {
        this.currentScreen = 'nickname-screen';
        this.nickname = '';
        this.currentRoom = null;
        this.playerId = this.generatePlayerId();
        this.isOnline = false;
        
        this.initializeOnlineFeatures();
        this.initializeEventListeners();
        this.checkURLForRoomCode();
        this.showScreen('nickname-screen');
        
        // 전역 참조 설정 (Firebase 콜백용)
        window.coupApp = this;
    }

    // 온라인 기능 초기화
    initializeOnlineFeatures() {
        // Firebase 초기화 시도
        setTimeout(() => {
            const firebaseInitialized = initializeFirebase();
            this.isOnline = firebaseInitialized;
            
            if (firebaseInitialized) {
                onlineRoomManager = new OnlineRoomManager();
                this.updateConnectionStatus('online', '🌐 온라인 모드 (전세계 플레이 가능!)');
            } else {
                this.updateConnectionStatus('offline', '💻 로컬 모드 (같은 기기에서만 플레이)');
            }
        }, 1000);
    }

    // 연결 상태 업데이트
    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connection-status');
        const indicatorElement = document.getElementById('status-indicator');
        const textElement = document.getElementById('status-text');
        
        if (statusElement && indicatorElement && textElement) {
            statusElement.className = `connection-status ${status}`;
            textElement.textContent = message;
            
            switch (status) {
                case 'online':
                    indicatorElement.textContent = '🌐';
                    break;
                case 'offline':
                    indicatorElement.textContent = '💻';
                    break;
                case 'connecting':
                    indicatorElement.textContent = '🔄';
                    break;
            }
        }
    }

    // 고유 플레이어 ID 생성
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    // 이벤트 리스너 초기화
    initializeEventListeners() {
        // 닉네임 화면
        const nicknameInput = document.getElementById('nickname-input');
        const nicknameConfirm = document.getElementById('nickname-confirm');
        
        nicknameInput.addEventListener('input', () => {
            const nickname = nicknameInput.value.trim();
            nicknameConfirm.disabled = nickname.length < 2 || nickname.length > 12;
            
            if (nickname.length > 0) {
                document.getElementById('nickname-error').textContent = '';
            }
        });

        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !nicknameConfirm.disabled) {
                this.confirmNickname();
            }
        });

        nicknameConfirm.addEventListener('click', () => this.confirmNickname());

        // 메인 메뉴
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.showScreen('create-room-screen');
        });

        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.showScreen('join-room-screen');
        });

        document.getElementById('game-rules-btn').addEventListener('click', () => {
            this.showGameRules();
        });

        // 방 생성 화면
        document.getElementById('create-room-confirm').addEventListener('click', () => {
            this.createRoom();
        });

        document.getElementById('back-to-menu-1').addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        // 방 입장 화면
        const roomCodeInput = document.getElementById('room-code-input');
        const joinRoomConfirm = document.getElementById('join-room-confirm');

        roomCodeInput.addEventListener('input', () => {
            const code = roomCodeInput.value.trim().toUpperCase();
            roomCodeInput.value = code;
            joinRoomConfirm.disabled = code.length !== GAME_CONFIG.ROOM_CODE_LENGTH;
        });

        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !joinRoomConfirm.disabled) {
                this.joinRoom();
            }
        });

        joinRoomConfirm.addEventListener('click', () => this.joinRoom());
        document.getElementById('back-to-menu-2').addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        // 게임 설명서
        document.getElementById('back-to-menu-3').addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        // 대기실
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('leave-room-btn').addEventListener('click', () => {
            this.leaveRoom();
        });

        // 공유 버튼들
        document.getElementById('copy-url-btn').addEventListener('click', () => {
            this.copyRoomURL();
        });

        document.getElementById('copy-code-btn').addEventListener('click', () => {
            this.copyRoomCode();
        });

        // 게임 화면
        document.getElementById('help-btn').addEventListener('click', () => {
            this.showHelpModal();
        });

        // 게임 종료 화면
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.playAgain();
        });

        document.getElementById('leave-game-btn').addEventListener('click', () => {
            this.leaveGame();
        });

        // 모달 닫기
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('help-modal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    // 화면 전환
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    // 닉네임 확인
    confirmNickname() {
        const nicknameInput = document.getElementById('nickname-input');
        const nickname = nicknameInput.value.trim();
        
        if (nickname.length < 2) {
            this.showError('nickname-error', '닉네임은 2자 이상이어야 합니다.');
            return;
        }

        if (nickname.length > 12) {
            this.showError('nickname-error', '닉네임은 12자 이하여야 합니다.');
            return;
        }

        this.nickname = nickname;
        document.getElementById('current-nickname').textContent = nickname;
        
        // URL에 방 코드가 있으면 자동으로 방 입장 시도
        if (this.autoJoinRoomCode) {
            document.getElementById('room-code-input').value = this.autoJoinRoomCode;
            this.showScreen('join-room-screen');
            this.showNotification(`${nickname}님 환영합니다! 방 "${this.autoJoinRoomCode}"에 입장합니다.`, 'success');
            
            // 자동으로 방 입장 버튼 활성화
            document.getElementById('join-room-confirm').disabled = false;
        } else {
            this.showScreen('main-menu');
            this.showNotification(`${nickname}님 환영합니다!`, 'success');
        }
    }

    // 방 생성
    async createRoom() {
        const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
        
        try {
            let roomCode;
            
            if (this.isOnline && onlineRoomManager) {
                roomCode = await onlineRoomManager.createRoom(this.playerId, this.nickname, gameMode);
                this.currentRoom = await onlineRoomManager.getRoom(roomCode);
            } else {
                roomCode = roomManager.createRoom(this.playerId, this.nickname, gameMode);
                this.currentRoom = roomManager.getRoom(roomCode);
            }
            
            game.myPlayerId = this.playerId;
            
            // URL 업데이트
            const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
            window.history.pushState({}, '', newUrl);
            
            this.showWaitingRoom();
            
            const modeText = this.isOnline ? '(온라인 멀티플레이)' : '(로컬)';
            this.showNotification(`방이 생성되었습니다! 코드: ${roomCode} ${modeText}`, 'success');
        } catch (error) {
            console.error('방 생성 오류:', error);
            this.showNotification('방 생성에 실패했습니다.', 'error');
        }
    }

    // 방 입장
    async joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
        
        try {
            let result;
            
            if (this.isOnline && onlineRoomManager) {
                result = await onlineRoomManager.joinRoom(roomCode, this.playerId, this.nickname);
            } else {
                result = roomManager.joinRoom(roomCode, this.playerId, this.nickname);
            }
            
            if (result.success) {
                this.currentRoom = result.room;
                game.myPlayerId = this.playerId;
                
                // URL 업데이트
                const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                window.history.pushState({}, '', newUrl);
                
                this.showWaitingRoom();
                
                const modeText = this.isOnline ? '(온라인)' : '(로컬)';
                this.showNotification(`방에 입장했습니다! ${modeText}`, 'success');
            } else {
                this.showError('join-error', result.message);
            }
        } catch (error) {
            console.error('방 입장 오류:', error);
            this.showError('join-error', '방 입장에 실패했습니다.');
        }
    }

    // 대기실 표시
    showWaitingRoom() {
        if (!this.currentRoom) return;

        this.showScreen('waiting-room');
        
        document.getElementById('room-code-display').textContent = this.currentRoom.code;
        document.getElementById('game-mode-display').textContent = 
            this.currentRoom.gameMode === 'expansion' ? '확장판 모드' : '기본판 모드';
        
        this.updatePlayersList();
        
        // 호스트인 경우에만 시작 버튼 표시
        const startBtn = document.getElementById('start-game-btn');
        if (this.currentRoom.host === this.playerId) {
            startBtn.style.display = 'block';
            startBtn.disabled = this.currentRoom.players.length < GAME_CONFIG.MIN_PLAYERS;
        } else {
            startBtn.style.display = 'none';
        }
    }

    // 플레이어 목록 업데이트
    updatePlayersList() {
        if (!this.currentRoom) return;

        const container = document.getElementById('players-container');
        const playerCount = document.getElementById('player-count');
        
        playerCount.textContent = this.currentRoom.players.length;
        
        container.innerHTML = '';
        
        this.currentRoom.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            
            if (player.id === this.currentRoom.host) {
                playerDiv.classList.add('host');
            }
            if (player.id === this.playerId) {
                playerDiv.classList.add('me');
            }
            
            playerDiv.innerHTML = `
                <span>${player.name}</span>
                <span>${player.id === this.currentRoom.host ? '👑 호스트' : player.id === this.playerId ? '(나)' : ''}</span>
            `;
            
            container.appendChild(playerDiv);
        });
    }

    // 게임 시작
    startGame() {
        if (!this.currentRoom || this.currentRoom.host !== this.playerId) return;

        const result = roomManager.startGame(this.currentRoom.code, this.playerId);
        
        if (result.success) {
            // 게임 상태를 로컬 game 인스턴스에 복사
            Object.assign(game, result.game);
            this.showGameScreen();
            this.showNotification('게임이 시작되었습니다!', 'success');
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    // 방 나가기
    leaveRoom() {
        if (!this.currentRoom) return;

        roomManager.leaveRoom(this.currentRoom.code, this.playerId);
        this.currentRoom = null;
        
        // URL에서 방 코드 제거
        const newUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.pushState({}, '', newUrl);
        
        this.showScreen('main-menu');
        this.showNotification('방에서 나갔습니다.', 'success');
    }

    // 게임 화면 표시
    showGameScreen() {
        this.showScreen('game-screen');
        this.updateGameUI();
        this.setupGameEventListeners();
    }

    // 게임 이벤트 리스너 설정
    setupGameEventListeners() {
        // 행동 버튼들
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleActionSelection(action);
            });
        });

        // 캐릭터 버튼 이벤트는 동적으로 추가
        this.updateActionButtons();
    }

    // 행동 선택 처리
    handleActionSelection(action) {
        const currentPlayer = game.getCurrentPlayer();
        
        if (currentPlayer.id !== this.playerId) {
            this.showNotification('당신의 차례가 아닙니다.', 'warning');
            return;
        }

        // 10개 이상 코인 보유시 강제 쿠데타
        if (currentPlayer.coins >= GAME_CONFIG.MAX_COINS_BEFORE_COUP && action !== 'coup') {
            this.showNotification('코인 10개 이상 보유시 반드시 쿠데타를 해야 합니다!', 'warning');
            return;
        }

        switch (action) {
            case 'income':
                this.executeAction('income');
                break;
            case 'foreign-aid':
                this.executeAction('foreign_aid');
                break;
            case 'coup':
                if (currentPlayer.coins < GAME_CONFIG.COUP_COST) {
                    this.showNotification('코인이 부족합니다.', 'warning');
                    return;
                }
                this.showTargetSelection('coup');
                break;
            case 'character':
                this.showCharacterSelection();
                break;
            case 'change-my-religion':
                this.changeMyreligion();
                break;
            case 'change-other-religion':
                this.changeOtherReligion();
                break;
            case 'take-sanctuary':
                this.takeSanctuary();
                break;
        }
    }

    // 캐릭터 선택 표시
    showCharacterSelection() {
        const container = document.getElementById('character-buttons');
        const selectionDiv = document.getElementById('character-selection');
        
        container.innerHTML = '';
        
        // 사용 가능한 캐릭터 행동들
        const availableActions = [
            { id: 'tax', name: '👑 공작 - 세금 (코인 3개)', character: 'duke' },
            { id: 'assassinate', name: '🔪 암살자 - 암살 (코인 3개 소모)', character: 'assassin' },
            { id: 'steal', name: '🕵️ 사령관 - 갈취 (코인 2개 훔치기)', character: 'captain' }
        ];

        if (game.gameMode === 'basic') {
            availableActions.push({ id: 'exchange', name: '🛡️ 대사 - 교환 (카드 2장)', character: 'ambassador' });
        } else {
            availableActions.push({ id: 'exchange_one', name: '⛪ 종교재판관 - 교환 (카드 1장)', character: 'inquisitor' });
            availableActions.push({ id: 'examine', name: '⛪ 종교재판관 - 심문', character: 'inquisitor' });
        }

        availableActions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'character-btn';
            btn.textContent = action.name;
            
            // 암살 시 코인 확인
            if (action.id === 'assassinate' && game.getCurrentPlayer().coins < 3) {
                btn.disabled = true;
                btn.textContent += ' (코인 부족)';
            }
            
            btn.addEventListener('click', () => {
                if (action.id === 'assassinate' || action.id === 'steal' || action.id === 'examine') {
                    this.showTargetSelection(action.id);
                } else {
                    this.executeAction(action.id);
                }
                selectionDiv.style.display = 'none';
            });
            
            container.appendChild(btn);
        });

        selectionDiv.style.display = 'block';
        document.getElementById('action-selection').style.display = 'none';
    }

    // 대상 선택 표시
    showTargetSelection(action) {
        const container = document.getElementById('target-buttons');
        const selectionDiv = document.getElementById('target-selection');
        
        container.innerHTML = '';
        
        const currentPlayer = game.getCurrentPlayer();
        const possibleTargets = game.getAlivePlayers().filter(p => p.id !== currentPlayer.id);

        possibleTargets.forEach(target => {
            // 확장판 종교 규칙 확인 (종교 변경은 예외)
            if (game.gameMode === 'expansion' && 
                game.isSameReligion(currentPlayer, target) &&
                ['coup', 'assassinate', 'steal'].includes(action)) {
                return; // 같은 종교는 공격 불가
            }

            const btn = document.createElement('button');
            btn.className = 'target-btn';
            btn.textContent = `${target.name} (카드 ${target.cards.length}장, 코인 ${target.coins}개)`;
            
            if (game.gameMode === 'expansion' && target.religion) {
                const religionIcon = target.religion === 'catholic' ? '✝️' : '✡️';
                const religionName = target.religion === 'catholic' ? '가톨릭' : '개신교';
                btn.textContent += ` ${religionIcon} ${religionName}`;
            }
            
            btn.addEventListener('click', () => {
                this.executeAction(action, target.id);
                selectionDiv.style.display = 'none';
            });
            
            container.appendChild(btn);
        });

        if (possibleTargets.length === 0) {
            container.innerHTML = '<p>공격 가능한 대상이 없습니다.</p>';
        }

        selectionDiv.style.display = 'block';
        document.getElementById('action-selection').style.display = 'none';
        document.getElementById('character-selection').style.display = 'none';
    }

    // 행동 실행
    executeAction(action, targetId = null) {
        // 종교 변경 특별 처리
        if (action === 'change_other_religion' && targetId) {
            const result = game.changeReligion(this.playerId, targetId, 2);
            
            if (result.success) {
                this.updateGameUI();
                this.showNotification('다른 플레이어의 종교를 변경했습니다!', 'success');
                game.nextTurn();
            } else {
                this.showNotification(result.message, 'error');
            }
            return;
        }

        const result = game.executeAction(action, targetId);
        
        if (!result.success) {
            this.showNotification(result.message, 'error');
            return;
        }

        this.updateGameUI();

        // 특별한 처리가 필요한 경우
        if (result.waitingFor) {
            this.handleWaitingState(result);
        }

        if (result.gameEnded) {
            this.showGameEndScreen(result.rankings);
        }
    }

    // 대기 상태 처리
    handleWaitingState(result) {
        switch (result.waitingFor) {
            case 'challenges':
                this.showChallengeOptions(true, false);
                break;
            case 'blocks':
                this.showChallengeOptions(false, true);
                break;
            case 'block_challenges':
                this.showChallengeOptions(true, false);
                break;
            case 'card_selection':
                this.showCardSelection(result.drawnCards, result.playerCards);
                break;
            case 'card_elimination':
                this.showCardElimination(result.playerId);
                break;
            case 'card_examine':
                this.showCardExamination(result.targetCards);
                break;
        }
    }

    // 도전/차단 옵션 표시
    showChallengeOptions(canChallenge, canBlock) {
        const challengeDiv = document.getElementById('challenge-defense');
        const challengeBtn = document.getElementById('challenge-btn');
        const blockBtn = document.getElementById('block-btn');
        const allowBtn = document.getElementById('allow-btn');
        
        const action = game.currentAction;
        const actor = game.getPlayerById(action.playerId);
        
        document.getElementById('challenge-message').textContent = 
            `${actor.name}님이 ${game.getActionName(action.type)}을(를) 시도합니다.`;

        challengeBtn.style.display = canChallenge ? 'block' : 'none';
        blockBtn.style.display = canBlock ? 'block' : 'none';

        challengeBtn.onclick = () => this.processChallenge();
        blockBtn.onclick = () => this.processBlock();
        allowBtn.onclick = () => this.allowAction();

        challengeDiv.style.display = 'block';
        document.getElementById('action-selection').style.display = 'none';
    }

    // 도전 처리
    processChallenge() {
        const result = game.processChallenge(this.playerId);
        this.updateGameUI();
        
        if (result.gameEnded) {
            this.showGameEndScreen(result.rankings);
        }

        document.getElementById('challenge-defense').style.display = 'none';
    }

    // 차단 처리
    processBlock() {
        const action = game.currentAction.type;
        let blockCharacter;

        // 차단 가능한 캐릭터 확인
        if (action === 'foreign_aid') {
            blockCharacter = 'duke';
        } else if (action === 'assassinate') {
            blockCharacter = 'contessa';
        } else if (action === 'steal') {
            // 여러 캐릭터가 가능한 경우 선택
            this.showBlockCharacterSelection();
            return;
        }

        const result = game.processBlock(this.playerId, blockCharacter);
        this.updateGameUI();
        
        if (result.waitingFor) {
            this.handleWaitingState(result);
        }

        document.getElementById('challenge-defense').style.display = 'none';
    }

    // 차단 캐릭터 선택
    showBlockCharacterSelection() {
        const characters = ['captain'];
        if (game.gameMode === 'basic') {
            characters.push('ambassador');
        } else {
            characters.push('inquisitor');
        }

        // 간단한 프롬프트로 처리 (나중에 더 나은 UI로 개선 가능)
        const choice = confirm('사령관으로 차단하시겠습니까? (취소시 대사/종교재판관으로 차단)');
        const blockCharacter = choice ? 'captain' : (game.gameMode === 'basic' ? 'ambassador' : 'inquisitor');

        const result = game.processBlock(this.playerId, blockCharacter);
        this.updateGameUI();
        
        if (result.waitingFor) {
            this.handleWaitingState(result);
        }

        document.getElementById('challenge-defense').style.display = 'none';
    }

    // 행동 허용
    allowAction() {
        const result = game.resolveAction();
        this.updateGameUI();
        
        if (result.gameEnded) {
            this.showGameEndScreen(result.rankings);
        }

        document.getElementById('challenge-defense').style.display = 'none';
    }

    // 카드 선택 표시 (교환 시)
    showCardSelection(drawnCards, playerCards) {
        // 간단한 구현 - 실제로는 더 나은 UI 필요
        alert('카드 교환 기능은 개발 중입니다.');
        // 임시로 교환하지 않고 진행
        game.completeExchange(this.playerId, playerCards, drawnCards);
        this.updateGameUI();
    }

    // 카드 제거 표시
    showCardElimination(playerId) {
        if (playerId !== this.playerId) return;

        const myPlayer = game.getMyPlayer();
        if (myPlayer.cards.length <= 1) return;

        // 간단한 선택 UI
        const cardNames = myPlayer.cards.map(card => CHARACTERS[card.toUpperCase()].name);
        const choice = prompt(`제거할 카드를 선택하세요:\n${cardNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}`);
        
        const cardIndex = parseInt(choice) - 1;
        if (cardIndex >= 0 && cardIndex < myPlayer.cards.length) {
            const result = game.completeElimination(playerId, cardIndex);
            this.updateGameUI();
            
            if (result.gameEnded) {
                this.showGameEndScreen(result.rankings);
            }
        }
    }

    // 카드 조사 표시
    showCardExamination(targetCards) {
        const cardNames = targetCards.map(card => CHARACTERS[card.toUpperCase()].name);
        alert(`상대방의 카드: ${cardNames.join(', ')}`);
        
        // 간단한 구현
        const shouldExchange = confirm('카드를 교체하시겠습니까?');
        const cardIndex = shouldExchange ? 0 : -1;
        
        game.completeExamine(this.playerId, game.currentAction.targetId, cardIndex, shouldExchange);
        this.updateGameUI();
    }

    // 피난처 시스템 메서드들 (확장판)
    changeMyreligion() {
        const currentPlayer = game.getCurrentPlayer();
        
        if (currentPlayer.coins < 1) {
            this.showNotification('코인이 부족합니다.', 'warning');
            return;
        }

        const result = game.changeReligion(this.playerId);
        
        if (result.success) {
            this.updateGameUI();
            this.showNotification('종교를 변경했습니다!', 'success');
            game.nextTurn();
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    changeOtherReligion() {
        const currentPlayer = game.getCurrentPlayer();
        
        if (currentPlayer.coins < 2) {
            this.showNotification('코인이 부족합니다.', 'warning');
            return;
        }

        this.showTargetSelection('change_other_religion');
    }

    takeSanctuary() {
        const result = game.takeSanctuary(this.playerId);
        
        if (result.success) {
            this.updateGameUI();
            this.showNotification('피난처를 획득했습니다!', 'success');
            game.nextTurn();
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    // 게임 UI 업데이트
    updateGameUI() {
        this.updatePlayersDisplay();
        this.updateMyCards();
        this.updateActionLog();
        this.updateActionButtons();
        this.updateCurrentTurn();
        this.updateSanctuaryDisplay();
    }

    // 플레이어 표시 업데이트
    updatePlayersDisplay() {
        const container = document.getElementById('other-players-container');
        const myPlayer = game.getMyPlayer();
        
        container.innerHTML = '';
        
        game.players.forEach(player => {
            if (player.id === this.playerId) return; // 내 정보는 따로 표시

            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-card';
            
            if (player.id === game.getCurrentPlayer().id) {
                playerDiv.classList.add('current-turn');
            }
            
            if (!player.isAlive) {
                playerDiv.classList.add('eliminated');
            }

            let religionInfo = '';
            if (game.gameMode === 'expansion' && player.religion) {
                const religionIcon = player.religion === 'catholic' ? '✝️' : '✡️';
                religionInfo = ` ${religionIcon}`;
            }

            playerDiv.innerHTML = `
                <div class="player-name">${player.name}${religionInfo}</div>
                <div class="player-stats">
                    카드: ${player.cards.length}장<br>
                    코인: ${player.coins}개
                </div>
            `;
            
            container.appendChild(playerDiv);
        });

        // 내 코인 표시 업데이트
        if (myPlayer) {
            document.getElementById('my-coin-count').textContent = myPlayer.coins;
        }
    }

    // 내 카드 표시 업데이트
    updateMyCards() {
        const container = document.getElementById('my-cards-container');
        const myPlayer = game.getMyPlayer();
        
        if (!myPlayer) return;

        container.innerHTML = '';
        
        myPlayer.cards.forEach((cardId, index) => {
            const character = CHARACTERS[cardId.toUpperCase()];
            const cardDiv = document.createElement('div');
            cardDiv.className = 'character-card';
            
            cardDiv.innerHTML = `
                <div class="character-icon">${character.icon}</div>
                <div class="character-name">${character.name}</div>
            `;
            
            container.appendChild(cardDiv);
        });
    }

    // 행동 로그 업데이트
    updateActionLog() {
        const container = document.getElementById('action-log-content');
        
        container.innerHTML = '';
        
        game.actionLog.slice(0, 5).forEach(log => {
            const logDiv = document.createElement('div');
            logDiv.className = 'action-log-item';
            logDiv.textContent = `${log.timestamp} - ${log.message}`;
            container.appendChild(logDiv);
        });
    }

    // 현재 턴 표시 업데이트
    updateCurrentTurn() {
        const currentPlayer = game.getCurrentPlayer();
        document.getElementById('current-player').textContent = currentPlayer.name;
    }

    // 피난처 표시 업데이트 (확장판)
    updateSanctuaryDisplay() {
        if (game.gameMode === 'expansion') {
            document.getElementById('sanctuary-actions').style.display = 'block';
            document.getElementById('sanctuary-coins').textContent = game.sanctuary;
        } else {
            document.getElementById('sanctuary-actions').style.display = 'none';
        }
    }

    // 행동 버튼 업데이트
    updateActionButtons() {
        const currentPlayer = game.getCurrentPlayer();
        const isMyTurn = currentPlayer && currentPlayer.id === this.playerId;
        
        // 행동 선택 영역 표시/숨김
        document.getElementById('action-selection').style.display = isMyTurn ? 'block' : 'none';
        document.getElementById('character-selection').style.display = 'none';
        document.getElementById('target-selection').style.display = 'none';
        document.getElementById('challenge-defense').style.display = 'none';

        if (isMyTurn) {
            // 버튼 활성화/비활성화
            const actionButtons = document.querySelectorAll('.action-btn');
            actionButtons.forEach(btn => {
                const action = btn.dataset.action;
                
                if (action === 'coup') {
                    btn.disabled = currentPlayer.coins < GAME_CONFIG.COUP_COST;
                } else if (action === 'change-my-religion') {
                    btn.disabled = currentPlayer.coins < 1;
                } else if (action === 'change-other-religion') {
                    btn.disabled = currentPlayer.coins < 2;
                } else if (action === 'take-sanctuary') {
                    btn.disabled = !currentPlayer.cards.includes('duke');
                } else if (currentPlayer.coins >= GAME_CONFIG.MAX_COINS_BEFORE_COUP) {
                    btn.disabled = action !== 'coup';
                } else {
                    btn.disabled = false;
                }
            });
        }
    }

    // 게임 설명서 표시
    showGameRules() {
        document.getElementById('rules-content').innerHTML = GAME_RULES_CONTENT;
        this.showScreen('game-rules-screen');
    }

    // 도움말 모달 표시
    showHelpModal() {
        document.getElementById('help-content').innerHTML = HELP_CONTENT;
        document.getElementById('help-modal').style.display = 'block';
    }

    // 모달 닫기
    closeModal() {
        document.getElementById('help-modal').style.display = 'none';
    }

    // 게임 종료 화면 표시
    showGameEndScreen(rankings) {
        const container = document.getElementById('rankings-list');
        
        container.innerHTML = '';
        
        rankings.forEach((ranking, index) => {
            const rankDiv = document.createElement('div');
            rankDiv.className = 'ranking-item';
            
            if (index === 0) rankDiv.classList.add('first');
            else if (index === 1) rankDiv.classList.add('second');
            else if (index === 2) rankDiv.classList.add('third');
            
            const medal = ['🥇', '🥈', '🥉'][index] || `${index + 1}등`;
            
            rankDiv.innerHTML = `
                <div>
                    <strong>${medal} ${ranking.name}</strong>
                    ${ranking.name === this.nickname ? ' (나)' : ''}
                </div>
                <div>
                    카드 ${ranking.cards}장 | 코인 ${ranking.coins}개
                </div>
            `;
            
            container.appendChild(rankDiv);
        });

        this.showScreen('game-end-screen');
    }

    // 다시 플레이
    playAgain() {
        if (!this.currentRoom) return;

        // 게임 상태 초기화
        game.reset();
        this.currentRoom.status = 'waiting';
        
        this.showWaitingRoom();
        this.showNotification('새 게임을 위해 대기실로 돌아갑니다.', 'success');
    }

    // 게임 나가기
    leaveGame() {
        this.leaveRoom();
    }

    // 에러 메시지 표시
    showError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }

    // URL에서 방 코드 확인
    checkURLForRoomCode() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('room');
        
        if (roomCode && roomCode.length === GAME_CONFIG.ROOM_CODE_LENGTH) {
            // URL에 방 코드가 있으면 입력 필드에 자동 입력
            this.autoJoinRoomCode = roomCode;
        }
    }

    // 방 URL 복사
    copyRoomURL() {
        if (!this.currentRoom) return;

        const url = `${window.location.origin}${window.location.pathname}?room=${this.currentRoom.code}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification('방 URL이 복사되었습니다! 친구들에게 공유하세요! 🎉', 'success');
            }).catch(() => {
                this.fallbackCopyText(url);
            });
        } else {
            this.fallbackCopyText(url);
        }
    }

    // 방 코드 복사
    copyRoomCode() {
        if (!this.currentRoom) return;

        const code = this.currentRoom.code;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                this.showNotification(`방 코드 "${code}"가 복사되었습니다! 📋`, 'success');
            }).catch(() => {
                this.fallbackCopyText(code);
            });
        } else {
            this.fallbackCopyText(code);
        }
    }

    // 클립보드 복사 대체 방법
    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showNotification('복사되었습니다! 📋', 'success');
        } catch (err) {
            this.showNotification('복사에 실패했습니다. 수동으로 복사해주세요.', 'error');
        }
        
        document.body.removeChild(textArea);
    }

    // 실시간 방 상태 업데이트 (Firebase 콜백)
    onRoomUpdated(room) {
        if (!room || !this.currentRoom || room.code !== this.currentRoom.code) return;
        
        const oldPlayerCount = this.currentRoom.players ? this.currentRoom.players.length : 0;
        const newPlayerCount = room.players ? room.players.length : 0;
        
        this.currentRoom = room;
        
        // 플레이어 수 변화 알림
        if (newPlayerCount > oldPlayerCount) {
            const newPlayer = room.players[room.players.length - 1];
            if (newPlayer.id !== this.playerId) {
                this.showNotification(`${newPlayer.name}님이 입장했습니다! 👋`, 'success');
            }
        } else if (newPlayerCount < oldPlayerCount) {
            this.showNotification('플레이어가 나갔습니다. 👋', 'warning');
        }
        
        // 게임 시작 알림
        if (room.status === 'playing' && this.currentScreen === 'waiting-room') {
            this.showNotification('게임이 시작됩니다! 🎮', 'success');
            setTimeout(() => {
                this.showGameScreen();
            }, 1000);
        }
        
        // UI 업데이트
        if (this.currentScreen === 'waiting-room') {
            this.updatePlayersList();
        }
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
    new CoupApp();
});