// 게임 상수 및 데이터 정의

// 게임 설정
const GAME_CONFIG = {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 6,
    STARTING_COINS: 2,
    STARTING_CARDS: 2,
    COUP_COST: 7,
    ASSASSINATION_COST: 3,
    MAX_COINS_BEFORE_COUP: 10,
    ROOM_CODE_LENGTH: 6
};

// 캐릭터 정보
const CHARACTERS = {
    DUKE: {
        id: 'duke',
        name: '공작',
        icon: '👑',
        description: '세금 징수 및 해외 원조 차단',
        actions: ['tax'],
        blocks: ['foreign_aid'],
        actionDescription: '세금: 코인 3개 획득',
        blockDescription: '해외 원조를 막을 수 있음'
    },
    ASSASSIN: {
        id: 'assassin',
        name: '암살자',
        icon: '🔪',
        description: '다른 플레이어 암살',
        actions: ['assassinate'],
        blocks: [],
        actionDescription: '암살: 코인 3개로 다른 플레이어 카드 1장 제거',
        blockDescription: '방어 능력 없음'
    },
    AMBASSADOR: {
        id: 'ambassador',
        name: '대사',
        icon: '🛡️',
        description: '카드 교환 및 갈취 방어',
        actions: ['exchange'],
        blocks: ['steal'],
        actionDescription: '교환: 덱에서 2장을 보고 카드 교체',
        blockDescription: '갈취를 막을 수 있음'
    },
    CAPTAIN: {
        id: 'captain',
        name: '사령관',
        icon: '🕵️',
        description: '다른 플레이어에게서 갈취',
        actions: ['steal'],
        blocks: ['steal'],
        actionDescription: '갈취: 다른 플레이어에게서 코인 2개 훔치기',
        blockDescription: '갈취를 막을 수 있음'
    },
    CONTESSA: {
        id: 'contessa',
        name: '백작부인',
        icon: '🧱',
        description: '암살 방어',
        actions: [],
        blocks: ['assassinate'],
        actionDescription: '특별 행동 없음',
        blockDescription: '암살을 막을 수 있음'
    },
    INQUISITOR: {
        id: 'inquisitor',
        name: '종교재판관',
        icon: '⛪',
        description: '카드 조사 및 갈취 방어 (확장판)',
        actions: ['exchange_one', 'examine'],
        blocks: ['steal'],
        actionDescription: '교환: 덱에서 1장을 보고 교체 / 심문: 다른 플레이어 카드 조사',
        blockDescription: '갈취를 막을 수 있음'
    }
};

// 기본 행동들
const BASIC_ACTIONS = {
    INCOME: {
        id: 'income',
        name: '소득',
        description: '코인 1개 획득',
        coins: 1,
        challengeable: false,
        blockable: false,
        targetRequired: false
    },
    FOREIGN_AID: {
        id: 'foreign_aid',
        name: '해외 원조',
        description: '코인 2개 획득',
        coins: 2,
        challengeable: false,
        blockable: true,
        blockedBy: ['duke'],
        targetRequired: false
    },
    COUP: {
        id: 'coup',
        name: '쿠데타',
        description: '코인 7개로 다른 플레이어 카드 1장 제거',
        cost: 7,
        challengeable: false,
        blockable: false,
        targetRequired: true,
        effect: 'eliminate_card'
    }
};

// 캐릭터별 행동들
const CHARACTER_ACTIONS = {
    TAX: {
        id: 'tax',
        name: '세금',
        character: 'duke',
        description: '코인 3개 획득',
        coins: 3,
        challengeable: true,
        blockable: false,
        targetRequired: false
    },
    ASSASSINATE: {
        id: 'assassinate',
        name: '암살',
        character: 'assassin',
        description: '코인 3개로 다른 플레이어 카드 1장 제거',
        cost: 3,
        challengeable: true,
        blockable: true,
        blockedBy: ['contessa'],
        targetRequired: true,
        effect: 'eliminate_card'
    },
    STEAL: {
        id: 'steal',
        name: '갈취',
        character: 'captain',
        description: '다른 플레이어에게서 코인 2개 훔치기',
        challengeable: true,
        blockable: true,
        blockedBy: ['captain', 'ambassador', 'inquisitor'],
        targetRequired: true,
        effect: 'steal_coins'
    },
    EXCHANGE: {
        id: 'exchange',
        name: '교환',
        character: 'ambassador',
        description: '덱에서 2장을 보고 카드 교체',
        challengeable: true,
        blockable: false,
        targetRequired: false,
        effect: 'exchange_cards'
    },
    EXCHANGE_ONE: {
        id: 'exchange_one',
        name: '교환 (1장)',
        character: 'inquisitor',
        description: '덱에서 1장을 보고 카드 교체',
        challengeable: true,
        blockable: false,
        targetRequired: false,
        effect: 'exchange_one_card'
    },
    EXAMINE: {
        id: 'examine',
        name: '심문',
        character: 'inquisitor',
        description: '다른 플레이어 카드 1장 조사',
        challengeable: true,
        blockable: false,
        targetRequired: true,
        effect: 'examine_card'
    }
};

// 종교 시스템 (확장판)
const RELIGIONS = {
    CATHOLIC: {
        id: 'catholic',
        name: '가톨릭',
        icon: '✝️',
        color: '#3182ce'
    },
    PROTESTANT: {
        id: 'protestant',
        name: '개신교',
        icon: '✡️',
        color: '#38a169'
    }
};

// 피난처 행동 (확장판)
const SANCTUARY_ACTIONS = {
    CHANGE_MY_RELIGION: {
        id: 'change_my_religion',
        name: '내 종교 바꾸기',
        cost: 1,
        description: '코인 1개를 피난처에 놓고 종교 카드 뒤집기'
    },
    CHANGE_OTHER_RELIGION: {
        id: 'change_other_religion',
        name: '남의 종교 바꾸기',
        cost: 2,
        description: '코인 2개를 피난처에 놓고 다른 플레이어 종교 바꾸기'
    },
    TAKE_SANCTUARY: {
        id: 'take_sanctuary',
        name: '피난처 획득',
        character: 'duke',
        description: '공작으로 피난처의 모든 코인 획득'
    }
};

// 게임 설명서 내용
const GAME_RULES_CONTENT = `
<h3>🎯 게임 목표</h3>
<p>다른 플레이어들의 카드(영향력)를 모두 없애고, 내 카드가 끝까지 살아남는 것!</p>
<p>마지막까지 카드가 남은 1명이 승리합니다.</p>

<h3>🎴 캐릭터 소개</h3>
<table class="character-table">
    <thead>
        <tr>
            <th>캐릭터</th>
            <th>능력</th>
            <th>방어</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>👑 공작</td>
            <td>세금: 코인 3개 획득</td>
            <td>해외 원조 차단</td>
        </tr>
        <tr>
            <td>🔪 암살자</td>
            <td>암살: 코인 3개로 카드 1장 제거</td>
            <td>없음</td>
        </tr>
        <tr>
            <td>🛡️ 대사</td>
            <td>교환: 덱에서 2장 보고 교체</td>
            <td>갈취 방어</td>
        </tr>
        <tr>
            <td>🕵️ 사령관</td>
            <td>갈취: 코인 2개 훔치기</td>
            <td>갈취 방어</td>
        </tr>
        <tr>
            <td>🧱 백작부인</td>
            <td>특별 능력 없음</td>
            <td>암살 방어</td>
        </tr>
    </tbody>
</table>

<h3>🎮 기본 행동</h3>
<h4>1. 소득</h4>
<p>코인 1개를 가져옵니다. 누구도 막거나 도전할 수 없습니다.</p>

<h4>2. 해외 원조</h4>
<p>코인 2개를 가져옵니다. 공작을 가진 플레이어가 막을 수 있습니다.</p>

<h4>3. 쿠데타</h4>
<p>코인 7개를 지불하고 다른 플레이어의 카드 1장을 제거합니다. 막을 수 없습니다.</p>

<h4>4. 캐릭터 능력</h4>
<p>가지고 있는(또는 가진 척하는) 캐릭터의 특별 능력을 사용합니다.</p>

<h3>🚨 도전 시스템</h3>
<div class="tip-box">
<p><strong>누군가 캐릭터 능력을 사용할 때, 다른 플레이어가 "도전"할 수 있습니다!</strong></p>
</div>

<h4>도전 결과:</h4>
<ul>
    <li><strong>진짜였다:</strong> 도전한 플레이어가 카드 1장을 잃고, 능력 사용자는 카드를 셔플 후 새 카드로 교체</li>
    <li><strong>거짓말이었다:</strong> 도전받은 플레이어가 카드 1장을 잃음</li>
</ul>

<div class="example-box">
<h4>💡 예시 상황</h4>
<p><strong>다연:</strong> "나 공작이야! 세금 3개 가져갈래~"</p>
<p><strong>뭉개:</strong> "에이~ 거짓말이지? 도전!"</p>
<p><strong>다연:</strong> "짜잔! 진짜 공작~" (카드 보여줌)</p>
<p><strong>뭉개:</strong> "앗... 내 카드 하나 버릴게..."</p>
</div>

<h3>🧩 확장판 특별 규칙</h3>
<h4>⛪ 종교 시스템</h4>
<ul>
    <li>모든 플레이어는 종교 카드(가톨릭/개신교) 1장을 받습니다</li>
    <li><strong>같은 종교끼리는 공격할 수 없습니다!</strong></li>
    <li>암살, 쿠데타, 갈취가 불가능합니다</li>
</ul>

<h4>🏠 피난처 시스템</h4>
<ul>
    <li>내 종교 바꾸기: 코인 1개를 피난처에 놓고 종교 변경</li>
    <li>남의 종교 바꾸기: 코인 2개를 피난처에 놓고 다른 플레이어 종교 변경</li>
    <li>피난처 획득: 공작으로 피난처의 모든 코인 가져오기</li>
</ul>

<h4>🧑‍⚖️ 종교재판관 (대사 대신 사용)</h4>
<ul>
    <li>교환: 덱에서 1장 보고 카드 교체</li>
    <li>심문: 다른 플레이어 카드 1장 조사</li>
    <li>갈취 방어 가능</li>
</ul>

<h3>🎉 승리 조건</h3>
<div class="warning-box">
<p><strong>중요:</strong> 코인이 10개 이상이면 반드시 쿠데타를 해야 합니다!</p>
</div>
<p>카드 2장을 모두 잃으면 탈락하며, 마지막까지 살아남은 1명이 승자입니다!</p>

<h3>🧠 게임 꿀팁</h3>
<ul>
    <li>블러핑을 적절히 사용하세요 - 없는 카드도 있는 척할 수 있습니다!</li>
    <li>다른 플레이어의 행동 패턴을 관찰하세요</li>
    <li>너무 자주 거짓말하면 의심받습니다</li>
    <li>상황에 따라 도전할지 말지 신중히 결정하세요</li>
    <li>확장판에서는 종교를 전략적으로 활용하세요</li>
</ul>
`;

// 도움말 내용
const HELP_CONTENT = `
<h2>🎮 게임 진행 도움말</h2>

<h3>📝 내 차례에 할 수 있는 행동</h3>
<ul>
    <li><strong>소득:</strong> 코인 1개 (막을 수 없음)</li>
    <li><strong>해외 원조:</strong> 코인 2개 (공작이 막을 수 있음)</li>
    <li><strong>쿠데타:</strong> 코인 7개 지불, 카드 1장 제거</li>
    <li><strong>캐릭터 능력:</strong> 각 캐릭터의 특별 능력 사용</li>
</ul>

<h3>🛡️ 방어 가능한 행동</h3>
<ul>
    <li><strong>해외 원조 → 공작</strong>이 막을 수 있음</li>
    <li><strong>암살 → 백작부인</strong>이 막을 수 있음</li>
    <li><strong>갈취 → 사령관, 대사, 종교재판관</strong>이 막을 수 있음</li>
</ul>

<h3>⚡ 도전 규칙</h3>
<p>캐릭터 능력을 사용할 때 다른 플레이어가 도전할 수 있습니다.</p>
<p>도전이 성공하면 거짓말한 플레이어가 카드를 잃고,</p>
<p>도전이 실패하면 도전한 플레이어가 카드를 잃습니다.</p>

<h3>🎯 전략 팁</h3>
<ul>
    <li>블러핑을 적절히 활용하세요</li>
    <li>다른 플레이어의 패턴을 관찰하세요</li>
    <li>코인이 많을 때는 견제받기 쉽습니다</li>
    <li>확장판에서는 종교를 전략적으로 사용하세요</li>
</ul>
`;

// 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GAME_CONFIG,
        CHARACTERS,
        BASIC_ACTIONS,
        CHARACTER_ACTIONS,
        RELIGIONS,
        SANCTUARY_ACTIONS,
        GAME_RULES_CONTENT,
        HELP_CONTENT
    };
}