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
                
                // 행동 요청 콜백 설정
                if (window.onlineRoomManager) {
                    window.onlineRoomManager.onActionRequest = (actionData) => {
                        console.log('📢 다른 플레이어 행동 요청 수신:', actionData);
                        this.showActionResponsePopup(actionData);
                    };
                }
                
                // 전역 참조 설정
                window.coupApp = this;
                
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
        this.updateStartButton(); // 별도 메서드로 분리
    }

    // 게임 시작 버튼 상태 업데이트
    updateStartButton() {
        if (!this.currentRoom) return;

        const startBtn = document.getElementById('start-game-btn');
        
        // 호스트인 경우에만 시작 버튼 표시
        if (this.currentRoom.host === this.playerId) {
            startBtn.style.display = 'block';
            
            // 2명 이상이면 게임 시작 가능
            const canStart = this.currentRoom.players.length >= GAME_CONFIG.MIN_PLAYERS;
            startBtn.disabled = !canStart;
            
            // 버튼 텍스트 업데이트
            if (canStart) {
                startBtn.textContent = `게임 시작 (${this.currentRoom.players.length}명)`;
                startBtn.classList.remove('disabled');
            } else {
                startBtn.textContent = `게임 시작 (최소 2명 필요)`;
                startBtn.classList.add('disabled');
            }
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
    async startGame() {
        if (!this.currentRoom || this.currentRoom.host !== this.playerId) {
            this.showNotification('게임을 시작할 권한이 없습니다.', 'error');
            return;
        }

        try {
            let result;
            
            // 온라인/오프라인 모드에 따라 분기
            if (this.isOnline && onlineRoomManager) {
                result = await onlineRoomManager.startGame(this.currentRoom.code, this.playerId);
            } else {
                result = roomManager.startGame(this.currentRoom.code, this.playerId);
            }
            
            if (result.success) {
                // 온라인 모드에서는 실시간 동기화로 게임 시작됨
                if (this.isOnline) {
                    this.showNotification('게임이 시작됩니다! 🎮', 'success');
                    // 온라인에서는 Firebase 리스너가 자동으로 게임 화면으로 전환
                } else {
                    // 로컬 모드에서는 직접 게임 시작
                    console.log('🎮 로컬 게임 시작:', result);
                    
                    if (result.game) {
                        // 게임 데이터를 전역 game 객체에 복사
                        Object.assign(game, result.game);
                        console.log('📋 게임 데이터 복사 완료:', game);
                    } else {
                        console.error('❌ result.game이 없습니다:', result);
                    }
                    
                    this.showGameScreen();
                    this.showNotification('게임이 시작되었습니다!', 'success');
                }
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('게임 시작 오류:', error);
            this.showNotification('게임 시작에 실패했습니다.', 'error');
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
        console.log('🎮 게임 화면 표시 시작');
        console.log('🆔 내 플레이어 ID:', this.playerId);
        console.log('🎯 게임 객체:', game);
        
        // 게임 로직에 내 플레이어 ID 설정
        if (game && this.playerId) {
            game.myPlayerId = this.playerId;
            console.log('✅ myPlayerId 설정 완료:', game.myPlayerId);
        } else {
            console.error('❌ 게임 객체 또는 플레이어 ID가 없습니다!');
        }
        
        this.showScreen('game-screen');
        this.updateGameUI();
        this.setupGameEventListeners();
        
        // 첫 번째 플레이어라면 시작 팝업 표시
        if (game && game.gamePhase === 'starting' && game.firstPlayer && game.firstPlayer.id === this.playerId) {
            console.log('🎊 첫 번째 플레이어 시작 팝업 표시');
            this.showStartPopup();
        } else {
            console.log('ℹ️ 시작 팝업 조건 미충족:', {
                hasGame: !!game,
                gamePhase: game?.gamePhase,
                firstPlayer: game?.firstPlayer?.id,
                myId: this.playerId
            });
        }
    }
    
    // 게임 시작 팝업 표시
    showStartPopup() {
        const modal = document.getElementById('game-start-modal');
        if (modal) {
            modal.style.display = 'block';
            
            // 시작 버튼 이벤트 리스너
            const startBtn = document.getElementById('start-game-popup-btn');
            if (startBtn) {
                startBtn.onclick = () => {
                    modal.style.display = 'none';
                    this.startActualGame();
                };
            }
        }
    }
    
    // 실제 게임 시작
    startActualGame() {
        if (game && game.startActualGame()) {
            this.updateGameUI();
            this.showNotification('게임이 시작되었습니다!', 'success');
        }
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

        // 도전/방어 버튼들
        const challengeBtn = document.getElementById('challenge-btn');
        const blockBtn = document.getElementById('block-btn');
        const allowBtn = document.getElementById('allow-btn');
        
        if (challengeBtn) {
            challengeBtn.addEventListener('click', () => this.challengeAction());
        }
        
        if (blockBtn) {
            blockBtn.addEventListener('click', () => this.blockAction());
        }
        
        if (allowBtn) {
            allowBtn.addEventListener('click', () => this.allowAction());
        }

        // 캐릭터 버튼 이벤트는 동적으로 추가
        this.updateActionButtons();
    }
    
    // 카드 선택 함수
    selectCharacterCard(cardId) {
        if (!this.isMyTurn()) {
            this.showNotification('당신의 차례가 아닙니다!', 'error');
            return;
        }
        
        // 선택된 카드로 액션 실행
        this.executeCharacterAction(cardId);
    }
    
    // 내 차례인지 확인
    isMyTurn() {
        if (!game || !game.getCurrentPlayer()) return false;
        return game.getCurrentPlayer().id === this.playerId;
    }
    
    // 캐릭터 액션 실행
    executeCharacterAction(cardId) {
        const character = CHARACTERS[cardId.toUpperCase()];
        if (!character || !character.actions || character.actions.length === 0) {
            this.showNotification('이 캐릭터는 특별한 능력이 없습니다.', 'error');
            return;
        }
        
        const action = character.actions[0]; // 첫 번째 액션 실행
        this.handleActionSelection(action);
    }
    
    // 도전 액션
    challengeAction() {
        this.showNotification('도전 기능은 추후 구현 예정입니다.', 'info');
    }
    
    // 방어 액션
    blockAction() {
        this.showNotification('방어 기능은 추후 구현 예정입니다.', 'info');
    }
    
    // 기본 행동 실행
    async executeBasicAction(action) {
        const currentPlayer = game.getCurrentPlayer();
        let targetId = null;

        // 타겟이 필요한 행동인지 확인
        if (['coup', 'assassinate', 'steal'].includes(action)) {
            targetId = await this.selectTarget(action);
            if (!targetId) {
                this.showNotification('타겟을 선택해야 합니다.', 'warning');
                return;
            }
        }

        console.log(`🎯 ${action} 실행:`, { action, targetId });

        // 게임 로직에서 행동 실행
        const result = game.executeAction(action, targetId);

        if (!result.success) {
            this.showNotification(result.message, 'error');
            return;
        }

        // 도전 또는 차단 대기 상태라면 다른 플레이어들에게 팝업 표시
        if (result.waitingFor) {
            this.showActionToOtherPlayers(action, targetId, result.waitingFor);
        } else {
            // 즉시 실행되는 행동
            this.showNotification(`${game.getActionName(action)}을(를) 실행했습니다!`, 'success');
            this.updateGameUI();
            this.syncGameState();
        }
    }

    // 타겟 선택
    async selectTarget(action) {
        return new Promise((resolve) => {
            const alivePlayers = game.getAlivePlayers().filter(p => p.id !== this.playerId);
            
            if (alivePlayers.length === 0) {
                resolve(null);
                return;
            }

            if (alivePlayers.length === 1) {
                resolve(alivePlayers[0].id);
                return;
            }

            // 여러 타겟이 있으면 선택 UI 표시
            this.showTargetSelection(alivePlayers, resolve);
        });
    }

    // 타겟 선택 UI 표시
    showTargetSelection(players, callback) {
        const targetSelection = document.getElementById('target-selection');
        const targetButtons = document.getElementById('target-buttons');
        
        targetButtons.innerHTML = '';
        
        players.forEach(player => {
            const button = document.createElement('button');
            button.className = 'target-btn';
            button.textContent = `${player.name} (💳${player.cards.length}장 🪙${player.coins}개)`;
            button.onclick = () => {
                targetSelection.style.display = 'none';
                callback(player.id);
            };
            targetButtons.appendChild(button);
        });
        
        targetSelection.style.display = 'block';
    }

    // 다른 플레이어들에게 행동 대응 팝업 표시
    showActionToOtherPlayers(action, targetId, waitingFor) {
        const actionData = {
            action,
            targetId,
            waitingFor,
            playerId: this.playerId,
            playerName: game.getPlayerById(this.playerId).name,
            actionName: game.getActionName(action)
        };

        // 온라인 모드라면 Firebase를 통해 전송
        if (this.isOnline && window.onlineRoomManager) {
            window.onlineRoomManager.broadcastActionResponse(actionData);
        } else {
            // 로컬 모드에서는 다른 플레이어들에게만 팝업 표시 (시뮬레이션)
            console.log('🎮 로컬 모드: 다른 플레이어들에게 행동 대응 팝업 표시 시뮬레이션');
            
            // 멀티플레이어 시뮬레이션: 2초 후 자동 허용
            setTimeout(() => {
                this.showNotification('다른 플레이어들이 행동을 허용했습니다.', 'info');
                const result = game.resolveAction();
                this.updateGameUI();
                this.syncGameState();
                console.log('🎮 로컬 모드 자동 허용 후 게임 진행');
            }, 2000);
        }
    }

    // 행동 대응 팝업 표시 (다른 플레이어용)
    showActionResponsePopup(actionData) {
        const modal = document.getElementById('action-response-modal');
        const title = document.getElementById('action-response-title');
        const details = document.getElementById('action-response-details');
        const allowBtn = document.getElementById('allow-action-btn');
        const challengeBtn = document.getElementById('challenge-action-btn');
        const blockBtn = document.getElementById('block-action-btn');

        title.textContent = `${actionData.playerName}님이 행동을 했습니다!`;
        details.innerHTML = `
            <div><strong>행동:</strong> ${actionData.actionName}</div>
            ${actionData.targetId ? `<div><strong>대상:</strong> ${game.getPlayerById(actionData.targetId).name}</div>` : ''}
        `;

        // 버튼 표시/숨김
        allowBtn.style.display = 'block';
        challengeBtn.style.display = actionData.waitingFor === 'challenges' ? 'block' : 'none';
        blockBtn.style.display = actionData.waitingFor === 'blocks' ? 'block' : 'none';

        // 이벤트 리스너 설정
        allowBtn.onclick = () => this.respondToAction('allow', actionData);
        challengeBtn.onclick = () => this.respondToAction('challenge', actionData);
        blockBtn.onclick = () => this.respondToAction('block', actionData);

        modal.style.display = 'block';
        this.startResponseTimer();
    }

    // 행동에 대한 응답
    respondToAction(response, actionData) {
        document.getElementById('action-response-modal').style.display = 'none';
        this.clearResponseTimer();

        const responseData = {
            response,
            playerId: this.playerId,
            originalAction: actionData
        };

        if (this.isOnline && window.onlineRoomManager) {
            window.onlineRoomManager.sendActionResponse(responseData);
        }

        this.showNotification(`${response === 'allow' ? '허용' : response === 'challenge' ? '도전' : '차단'}했습니다!`, 'info');
        
        // 모든 응답에 대해 행동 실행하고 다음 턴으로
        setTimeout(() => {
            if (response === 'challenge' || response === 'block') {
                this.showNotification('도전/차단 시스템은 추후 업데이트 예정입니다. 일단 허용처리됩니다.', 'info');
            }
            
            const result = game.resolveAction();
            this.updateGameUI();
            this.syncGameState();
            console.log(`✅ ${response} 응답 후 게임 진행:`, result);
        }, response === 'allow' ? 1000 : 1500);
    }

    // 응답 타이머 시작
    startResponseTimer() {
        let seconds = 15;
        const timerElement = document.getElementById('timer-seconds');
        
        this.responseTimer = setInterval(() => {
            seconds--;
            timerElement.textContent = seconds;
            
            if (seconds <= 0) {
                this.clearResponseTimer();
                document.getElementById('action-response-modal').style.display = 'none';
                this.showNotification('시간 초과로 행동을 허용했습니다.', 'info');
                
                // 시간 초과 시에도 게임 진행
                setTimeout(() => {
                    const result = game.resolveAction();
                    this.updateGameUI();
                    this.syncGameState();
                    console.log('⏰ 시간 초과로 행동 허용 후 게임 진행:', result);
                }, 1000);
            }
        }, 1000);
    }

    // 응답 타이머 정리
    clearResponseTimer() {
        if (this.responseTimer) {
            clearInterval(this.responseTimer);
            this.responseTimer = null;
        }
    }

    // 로컬 모드에서 즉시 행동 실행
    resolveActionImmediately() {
        const result = game.resolveAction();
        this.showNotification('행동이 실행되었습니다!', 'success');
        this.updateGameUI();
        this.syncGameState();
    }

    // 게임 상태 동기화
    async syncGameState() {
        if (this.isOnline && window.onlineRoomManager) {
            try {
                await window.onlineRoomManager.updateGameState(game.getGameState());
                console.log('🔄 게임 상태 동기화 완료');
            } catch (error) {
                console.error('❌ 게임 상태 동기화 실패:', error);
            }
        } else {
            // 로컬 모드에서는 localStorage에 저장
            try {
                const roomCode = localStorage.getItem('currentRoomCode');
                if (roomCode && window.roomManager) {
                    window.roomManager.updateGameState(roomCode, game.getGameState());
                }
            } catch (error) {
                console.error('❌ 로컬 게임 상태 저장 실패:', error);
            }
        }
    }

    // 허용 액션
    allowAction() {
        this.showNotification('액션을 허용했습니다.', 'success');
        this.hideChallengPanel();
    }
    
    // 도전/방어 패널 숨기기
    hideChallengPanel() {
        const panel = document.getElementById('challenge-defense');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    // 행동 선택 처리  
    handleActionSelection(action) {
        const currentPlayer = game.getCurrentPlayer();
        
        if (currentPlayer.id !== this.playerId) {
            this.showNotification('당신의 차례가 아닙니다.', 'warning');
            return;
        }

        // 기본 행동들 처리
        if (['income', 'foreign-aid', 'coup', 'tax', 'assassinate', 'steal', 'exchange'].includes(action)) {
            this.executeBasicAction(action);
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
        console.log('🎮 게임 UI 업데이트 시작', game);
        
        if (!game || !game.players || game.players.length === 0) {
            console.error('❌ 게임 데이터가 없습니다!');
            return;
        }
        
        console.log('📊 게임 상태:', {
            phase: game.gamePhase,
            players: game.players.length,
            myPlayerId: game.myPlayerId,
            currentPlayer: game.getCurrentPlayer()?.name
        });
        
        this.updatePlayersDisplay();
        this.updateMyCards();
        this.updateActionLog();
        this.updateCurrentTurn();
        this.updateActionButtons(); // 차례 업데이트 후 버튼 업데이트
        this.updateSanctuaryDisplay();
        
        console.log('✅ 게임 UI 업데이트 완료');
    }

    // 플레이어 표시 업데이트
    updatePlayersDisplay() {
        const container = document.getElementById('other-players-container');
        
        if (!game || !game.players) {
            console.warn('게임 데이터가 없습니다.');
            return;
        }
        
        container.innerHTML = '';
        
        game.players.forEach(player => {
            if (player.id === this.playerId) return; // 내 정보는 따로 표시

            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-card';
            
            if (game.getCurrentPlayer() && player.id === game.getCurrentPlayer().id) {
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
                    <div class="card-count">💳 ${player.cards.length}장</div>
                    <div class="coin-count">🪙 ${player.coins}개</div>
                </div>
            `;
            
            container.appendChild(playerDiv);
        });

        // 내 코인 표시 업데이트
        const myPlayer = game.getMyPlayer();
        if (myPlayer) {
            console.log('🪙 코인 업데이트:', myPlayer.coins);
            this.updateCoinDisplay(myPlayer.coins);
        } else {
            console.warn('⚠️ 내 플레이어를 찾을 수 없어서 코인 업데이트 불가');
            // 임시로 기본값 표시
            if (game.players && game.players.length > 0) {
                const tempPlayer = game.players.find(p => p.id === game.myPlayerId) || game.players[0];
                if (tempPlayer) {
                    console.log('🔄 임시 플레이어 코인 사용:', tempPlayer.coins);
                    this.updateCoinDisplay(tempPlayer.coins);
                }
            }
        }
    }

    // 내 카드 표시 업데이트
    updateMyCards() {
        const container = document.getElementById('my-cards-container');
        
        console.log('🃏 내 카드 업데이트 시작');
        
        if (!container) {
            console.error('❌ my-cards-container를 찾을 수 없습니다!');
            return;
        }
        
        if (!game || !game.getMyPlayer) {
            console.warn('⚠️ 게임 또는 getMyPlayer 메서드가 없습니다.');
            return;
        }
        
        const myPlayer = game.getMyPlayer();
        console.log('👤 내 플레이어:', myPlayer);
        
        if (!myPlayer) {
            console.warn('⚠️ 내 플레이어 데이터가 없습니다. myPlayerId:', game.myPlayerId);
            // 임시로 첫 번째 플레이어를 사용 (테스트용)
            if (game.players && game.players.length > 0) {
                const tempPlayer = game.players.find(p => p.id === game.myPlayerId) || game.players[0];
                console.log('🔄 임시 플레이어 사용:', tempPlayer);
                this.displayPlayerCards(tempPlayer, container);
            }
            return;
        }

        if (!myPlayer.cards || myPlayer.cards.length === 0) {
            console.warn('⚠️ 내 카드가 없습니다. 카드를 배분해야 합니다.');
            container.innerHTML = '<p>카드를 배분 중입니다...</p>';
            return;
        }

        this.displayPlayerCards(myPlayer, container);
    }
    
    // 플레이어 카드 표시 헬퍼 함수
    displayPlayerCards(player, container) {
        container.innerHTML = '';
        
        console.log(`🃏 ${player.name}의 카드 표시:`, player.cards);
        
        player.cards.forEach((cardId, index) => {
            const character = CHARACTERS[cardId.toUpperCase()];
            if (!character) {
                console.warn(`❌ 캐릭터 정보를 찾을 수 없습니다: ${cardId}`);
                return;
            }
            
            const cardDiv = document.createElement('div');
            cardDiv.className = 'character-card';
            cardDiv.dataset.cardId = cardId;
            
            // 이미지가 있으면 이미지 사용, 없으면 아이콘 사용
            const imageHtml = character.image ? 
                `<img src="${character.image}" alt="${character.name}" class="character-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                 <div class="character-icon" style="display: none;">${character.icon}</div>` :
                `<div class="character-icon">${character.icon}</div>`;
            
            cardDiv.innerHTML = `
                ${imageHtml}
                <div class="character-name">${character.name}</div>
                <div class="character-description">${character.actionDescription}</div>
            `;
            
            // 카드 클릭 시 해당 캐릭터 능력 사용
            cardDiv.addEventListener('click', () => {
                this.selectCharacterCard(cardId);
            });
            
            container.appendChild(cardDiv);
        });
        
        console.log(`✅ ${player.cards.length}장의 카드 표시 완료`);
    }
    
    // 코인 표시 업데이트
    updateCoinDisplay(coinCount) {
        const coinContainer = document.getElementById('coin-container');
        const coinCountElement = document.getElementById('my-coin-count');
        
        console.log('🪙 코인 표시 업데이트:', coinCount);
        
        if (coinCountElement) {
            coinCountElement.textContent = coinCount || 0;
        }
        
        if (coinContainer) {
            coinContainer.innerHTML = '';
            
            const displayCoins = coinCount || 0;
            
            // 코인 이미지 또는 아이콘으로 표시 (최대 10개까지만 표시)
            const displayCount = Math.min(displayCoins, 10);
            for (let i = 0; i < displayCount; i++) {
                const coinDiv = document.createElement('div');
                coinDiv.className = 'coin-item';
                
                if (GAME_CONFIG.COIN_IMAGE) {
                    coinDiv.innerHTML = `<img src="${GAME_CONFIG.COIN_IMAGE}" alt="코인" class="coin-image" onerror="this.outerHTML='🪙';">`;
                } else {
                    coinDiv.innerHTML = '🪙';
                }
                
                coinContainer.appendChild(coinDiv);
            }
            
            // 10개 이상이면 +표시
            if (displayCoins > 10) {
                const moreDiv = document.createElement('div');
                moreDiv.className = 'coin-more';
                moreDiv.textContent = `+${displayCoins - 10}`;
                coinContainer.appendChild(moreDiv);
            }
            
            console.log(`✅ ${displayCount}개 코인 표시 완료`);
        }
    }

    // 행동 로그 업데이트
    updateActionLog() {
        const container = document.getElementById('action-log-content');
        
        if (!game || !game.actionLog) {
            return;
        }
        
        container.innerHTML = '';
        
        // 최근 5개의 로그만 표시
        const recentLogs = game.actionLog.slice(-5);
        
        recentLogs.forEach(logEntry => {
            const logDiv = document.createElement('div');
            logDiv.className = 'log-entry';
            logDiv.textContent = logEntry;
            container.appendChild(logDiv);
        });
        
        // 스크롤을 맨 아래로
        container.scrollTop = container.scrollHeight;
    }

    // 현재 차례 표시 업데이트
    updateCurrentTurn() {
        const currentPlayerElement = document.getElementById('current-player');
        
        if (!game || !currentPlayerElement) {
            return;
        }
        
        const currentPlayer = game.getCurrentPlayer();
        if (currentPlayer) {
            currentPlayerElement.textContent = currentPlayer.name;
            
                    // 내 차례인지 표시
        if (currentPlayer.id === this.playerId) {
            currentPlayerElement.style.fontWeight = 'bold';
            currentPlayerElement.style.color = '#007bff';
            this.showNotification(`당신의 차례입니다! 🎯`, 'success');
        } else {
            currentPlayerElement.style.fontWeight = 'normal';
            currentPlayerElement.style.color = '#333';
        }
        }
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
            console.log('🔥 Firebase에서 게임 시작 신호 받음:', room);
            
            // Firebase에서 받은 게임 데이터를 로컬 game 객체에 복사
            if (room.game) {
                console.log('📋 Firebase 게임 데이터를 로컬에 복사:', room.game);
                Object.assign(game, room.game);
                
                // myPlayerId 설정
                game.myPlayerId = this.playerId;
                console.log('✅ 온라인 게임 데이터 복사 완료. 플레이어 수:', game.players?.length);
            } else {
                console.error('❌ Firebase room.game 데이터가 없습니다!');
            }
            
            this.showNotification('게임이 시작됩니다! 🎮', 'success');
            setTimeout(() => {
                this.showGameScreen();
            }, 1000);
        }
        
        // UI 업데이트
        if (this.currentScreen === 'waiting-room') {
            this.updatePlayersList();
            this.updateStartButton(); // 시작 버튼도 함께 업데이트
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