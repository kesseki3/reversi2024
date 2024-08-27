const gameContainer = document.getElementById('game');
const textdata = [
    {
        status_black: "黒のターンです",
        status_white: "白のターンです",
        black: "黒",
        white: "白",
        winner: "色の勝ち!",
        score: "【スコア】",
        gameover: "＜ゲーム終了＞",
        aior2p: "対戦方法を選択して下さい",
        playwith_ai: "AIと対戦",
        playwith_2p: "2人で対戦"
    }, 
    {
        status_black: "It's black turn!",
        status_white: "It's white turn!",
        black: "Black",
        white: "White",
        winner: " is Winner!",
        score: "【Score】",
        aior2p: "Which do you play with?",
        playwith_ai: "AI Match",
        playwith_2p: "2P Match"
    }
];
let currentPlayer = 1; // 1が黒で2が白
let currentLanguage = 0; //0が日本語、1が他言語
let players; //1がAI対戦、2が2P対戦
let board = initializeBoard();
let gamePaused = false;
let isSelectingPlayer = false;

function initializeBoard() {
    const board = [];
    for (let i = 0; i < 8; i++) {
        board[i] = [];
        for (let j = 0; j < 8; j++) {
            board[i][j] = 0;
        }
    }
    board[3][3] = 2;
    board[3][4] = 1;
    board[4][3] = 1;
    board[4][4] = 2;
    return board;
}

function drawBoard(board) {
    const table = document.createElement('table');
    for (let i = 0; i < 8; i++) {
        const tr = document.createElement('tr');
        for (let j = 0; j < 8; j++) {
            const td = createCell(i, j, board);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    addDots(table);
    gameContainer.innerHTML = '';
    gameContainer.appendChild(table);
    updateScore(board);
    updateBoardCursor();
}

function createCell(i, j, board) {
    const td = document.createElement('td');
    if (board[i][j] !== 0 || !canFlip(i, j, board, currentPlayer)) {
        td.classList.add('default-cursor');
    }
    const circle = document.createElement('div');
    circle.className = 'circle';
    if (board[i][j] === 1) {
        circle.classList.add('black');
    } else if (board[i][j] === 2) {
        circle.classList.add('white');
    } else if (canFlip(i, j, board, currentPlayer)) {
        circle.classList.add('hint');
    }
    td.appendChild(circle);
    td.onclick = () => placePiece(i, j, board);
    return td;
}

function addDots(table) {
    const dotPositions = [[2, 2], [2, 6], [6, 2], [6, 6]];
    dotPositions.forEach(pos => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        table.rows[pos[0]].cells[pos[1]].appendChild(dot);
    });
}

function placePiece(row, col, board) {
    if (gamePaused || !canFlip(row, col, board, currentPlayer)) return;
    board[row][col] = currentPlayer;
    flipPieces(row, col, board, currentPlayer);
    currentPlayer = 3 - currentPlayer;
    drawBoard(board);
    updateStatus();
    updateScore(board);
    updateBoardCursor();
    if (!skipTurn(board) && players === 1 && currentPlayer === 2) {
        setTimeout(placeAIPiece, 500); // AIの手を少し遅らせて実行
    }
}

async function placeAIPiece() {
    if (gamePaused) return;
    const gameTree = generateGameTree(board, currentPlayer, AI_LEVEL);
    const bestMove = await findTheBestMoveByAI(gameTree); // AIの手を取得
    if (bestMove) {
        board[bestMove.x][bestMove.y] = currentPlayer;
        flipPieces(bestMove.x, bestMove.y, board, currentPlayer);
        currentPlayer = 3 - currentPlayer;
        drawBoard(board);
        updateStatus();
        updateScore(board);
        updateBoardCursor();
        if (!skipTurn(board) && currentPlayer === 2) {
            setTimeout(placeAIPiece, 500); // 次のAIの手を遅らせる
        }
    } else {
        currentPlayer = 3 - currentPlayer; // AIが置けない場合はターンをスキップ
        updateStatus();
        if (!hasValidMoves(board, currentPlayer)) {
            gameOver();
        }
    }
}

function updateBoardCursor() {
    const cells = document.querySelectorAll('td');
    cells.forEach(cell => {
        if (gamePaused) {
            cell.classList.remove('active');
        } else {
            cell.classList.add('active');
        }
    });
}

function updateStatus() {
    const status = document.getElementById('status');
    status.textContent = currentPlayer === 1 ? textdata[currentLanguage]["status_black"] : textdata[currentLanguage]["status_white"];
}

function gameOver() {
    const winner = determineWinner(board);
    const winnerText = document.getElementById('winner');
    const statusText = document.getElementById('status');
    winnerText.style.display = 'block';
    winnerText.textContent = `${winner === 1 ? textdata[currentLanguage]["black"] : textdata[currentLanguage]["white"]}${textdata[currentLanguage]["winner"]}`;
    statusText.textContent = textdata[currentLanguage]["gameover"];
}

function determineWinner(board) {
    let blackCount = 0, whiteCount = 0;
    board.forEach(row => row.forEach(cell => {
        if (cell === 1) blackCount++;
        if (cell === 2) whiteCount++;
    }));
    return blackCount > whiteCount ? 1 : 2;
}

function canFlip(row, col, board, player) {
    if (board[row][col] !== 0) return false;

    let directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

    let canFlip = false;

    directions.forEach(([dx, dy]) => {
        let x = row + dx;
        let y = col + dy;
        let hasOpponentBetween = false;

        while (x >= 0 && x < 8 && y >= 0 && y < 8) {
            if (board[x][y] === 0) break;
            if (board[x][y] === player) {
                if (hasOpponentBetween) {
                    canFlip = true;
                }
                break;
            }
            hasOpponentBetween = true;
            x += dx;
            y += dy;
        }
    });
    return canFlip;
}

function flipPieces(row, col, board, player) {
    // 上下
    for (let i = row - 1; i >= 0; i--) {
        if (board[i][col] === 0) break;
        if (board[i][col] === player) {
            for (let j = i + 1; j < row; j++) {
                board[j][col] = player;
            }
            break;
        }
    }
    for (let i = row + 1; i < 8; i++) {
        if (board[i][col] === 0) break;
        if (board[i][col] === player) {
            for (let j = i - 1; j > row; j--) {
                board[j][col] = player;
            }
            break;
        }
    }

    // 左右
    for (let i = col - 1; i >= 0; i--) {
        if (board[row][i] === 0) break;
        if (board[row][i] === player) {
            for (let j = i + 1; j < col; j++) {
                board[row][j] = player;
            }
            break;
        }
    }
    for (let i = col + 1; i < 8; i++) {
        if (board[row][i] === 0) break;
        if (board[row][i] === player) {
            for (let j = i - 1; j > col; j--) {
                board[row][j] = player;
            }
            break;
        }
    }

    // 斜め
    let i = row - 1;
    let j = col - 1;
    while (i >= 0 && j >= 0) {
        if (board[i][j] === 0) break;
        if (board[i][j] === player) {
            let k = i + 1;
            let l = j + 1;
            while (k < row && l < col) {
                board[k][l] = player;
                k++;
                l++;
            }
            break;
        }
        i--;
        j--;
    }
    i = row + 1;
    j = col + 1;
    while (i < 8 && j < 8) {
        if (board[i][j] === 0) break;
        if (board[i][j] === player) {
            let k = i - 1;
            let l = j - 1;
            while (k > row && l > col) {
                board[k][l] = player;
                k--;
                l--;
            }
            break;
        }
        i++;
        j++;
    }
    i = row - 1;
    j = col + 1;
    while (i >= 0 && j < 8) {
        if (board[i][j] === 0) break;
        if (board[i][j] === player) {
            let k = i + 1;
            let l = j - 1;
            while (k < row && l > col) {
                board[k][l] = player;
                k++;
                l--;
            }
            break;
        }
        i--;
        j++;
    }
    i = row + 1;
    j = col - 1;
    while (i < 8 && j >= 0) {
        if (board[i][j] === 0) break;
        if (board[i][j] === player) {
            let k = i - 1;
            let l = j + 1;
            while (k > row && l < col) {
                board[k][l] = player;
                k--;
                l++;
            }
            break;
        }
        i++;
        j--;
    }
}

function updateScore(board) {
    let blackCount = 0, whiteCount = 0;
    board.forEach(row => row.forEach(cell => {
        if (cell === 1) blackCount++;
        if (cell === 2) whiteCount++;
    }));
    document.getElementById('score').textContent = `${textdata[currentLanguage]["score"]}${textdata[currentLanguage]["black"]}: ${blackCount}　${textdata[currentLanguage]["white"]}: ${whiteCount}`;
}

function skipTurn(board) {
    if (!hasValidMoves(board, currentPlayer)) {
        currentPlayer = 3 - currentPlayer; 
        updateStatus();
        if (!hasValidMoves(board, currentPlayer)) {
            gameOver();
            return true;
        } else {
            drawBoard(board);
            return true;
        }
    }
    return false;
}

function hasValidMoves(board, player) {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (board[i][j] === 0 && canFlip(i, j, board, player)) {
                return true;
            }
        }
    }
    return false;
}

function changeLanguage() {
    event.preventDefault();
    if (isSelectingPlayer){
        selectNumPlayer();
        return;
    }
    if (currentLanguage == 0) {
        currentLanguage = 1;
        document.getElementById('JP').style.display = "none";
        document.getElementById('EN').style.display = "block";
        document.getElementById('reset').textContent = "↺ Reset";
        document.getElementById('lang').textContent = "言語を変更";
    } else {
        currentLanguage = 0;
        document.getElementById('JP').style.display = "block";
        document.getElementById('EN').style.display = "none";
        document.getElementById('reset').textContent = "↺再試合";
        document.getElementById('lang').textContent = "Change Language";
    }
    updateStatus();
    updateScore(board);
}

function resetGame() {
    board = initializeBoard();
    currentPlayer = 1;
    drawBoard(board);
    updateStatus();
    document.getElementById('winner').style.display = 'none';
}

function startGame() {
    selectNumPlayer();
}

function pauseGame(boolean) {
    if (boolean) {
        gamePaused = true;
        document.getElementById('pause').textContent = "ゲームを再開";
    } else {
        gamePaused = false;
        document.getElementById('pause').textContent = "ゲームを一時停止";
    }
    updateBoardCursor();
}

function selectNumPlayer() {
    if (isSelectingPlayer) {
        alert("【おことわり / Wrong Operation / عملية خاطئة】\n\n・対戦方法選択中にボタンは押せません。\n・You can't push the button while selecting.\n・چين करत घरी रउरा बटन ना दबा सकेनी.");
        return;
    }
    gamePaused = true;
    updateBoardCursor();
    isSelectingPlayer = true;
    const board = document.querySelector('.board');
    board.style.filter = 'blur(5px)';
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '50%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = 'white';
    overlay.style.padding = '20px';
    overlay.style.borderRadius = '10px';
    overlay.style.textAlign = 'center';
    overlay.style.zIndex = '9999';
    const text = document.createElement('p');
    text.textContent = textdata[currentLanguage]["aior2p"];
    const aiButton = document.createElement('button');
    aiButton.textContent = textdata[currentLanguage]["playwith_ai"];
    aiButton.style.marginRight = '10px';
    aiButton.style.filter = 'none';
    aiButton.type = 'button';
    aiButton.addEventListener('click', () => {
        $(overlay).fadeOut(100, function() {
            board.style.filter = '';
            $(overlay).remove();
            isSelectingPlayer = false;
            gamePaused = false;
            players = 1;
            if (currentPlayer === 2) {
                placeAIPiece();
            }
        });
    });
    const twoPlayerButton = document.createElement('button');
    twoPlayerButton.textContent = textdata[currentLanguage]["playwith_2p"];
    twoPlayerButton.style.filter = 'none';
    twoPlayerButton.type = 'button';
    twoPlayerButton.addEventListener('click', () => {
        $(overlay).fadeOut(100, function() {
            board.style.filter = '';
            $(overlay).remove();
            isSelectingPlayer = false;
            gamePaused = false;
            players = 2;
        });
    });
    overlay.appendChild(text);
    overlay.appendChild(aiButton);
    overlay.appendChild(twoPlayerButton);
    overlay.style.zIndex = '99';
    document.body.appendChild(overlay);
}

function reload() {
    resetGame();
    startGame();
}
reload();






/*ここからAIの機能*/





function limitGameTreeDepth(gameTree, depth) {
    if (depth === 0) {
        return {
            board: gameTree.board,
            player: gameTree.player,
            moves: []
        };
    }

    return {
        board: gameTree.board,
        player: gameTree.player,
        moves: gameTree.moves.map(m => ({
            x: m.x,
            y: m.y,
            gameTreePromise: m.gameTreePromise.then(subTree => limitGameTreeDepth(subTree, depth - 1))
        }))
    };
}

function scoreBoard(board, player) {
    const opponent = 3 - player;
    return sum(board.flat().map(v => v === player ? 1 : 0)) -
           sum(board.flat().map(v => v === opponent ? 1 : 0));
}

function sum(ns) {
    return ns.reduce((t, n) => t + n, 0);
}

function ratePosition(gameTree, player) {
    if (gameTree.moves.length > 0) {
        const choose = gameTree.player === player ? Math.max : Math.min;
        return choose(...calculateRatings(gameTree, player));
    } else {
        return gameTree.score || scoreBoard(gameTree.board, player); // 評価スコアがあれば使用
    }
}

function calculateRatings(gameTree, player) {
    return gameTree.moves.map(m => ratePosition(force(m.gameTreePromise), player));
}

let AI_LEVEL = 4;

function findTheBestMoveByAI(gameTree) {
    return gameTree.moves.map(m => m.gameTreePromise)
        .reduce((promiseChain, currentPromise) => 
            promiseChain.then(results => 
                currentPromise.then(result => results.concat(result))
            ), Promise.resolve([]))
        .then(results => {
            const scores = results.map(result => ratePosition(result, 1)); // プレイヤー1の評価
            const bestScore = Math.max(...scores);
            return results[scores.indexOf(bestScore)];
        });
}

function generateGameTree(board, player, depth) {
    console.log("Generating Game Tree for player:", player);
    console.log("Current Board State:", board);

    if (depth === 0) {
        return {
            board: board,
            player: player,
            moves: [],
            score: scoreBoard(board, player) // 深さが0の場合、評価スコアを計算
        };
    }
    const validMoves = getValidMoves(board, player);
    console.log("Valid Moves for player", player, ":", validMoves);
    // 各有効な手についてゲームツリーを再帰的に生成
    const moves = validMoves.map(move => {
        const newBoard = applyMove(board, move, player);
        const nextPlayer = 3 - player;

        // 非同期にゲームツリーを生成する
        return {
            x: move[0],
            y: move[1],
            gameTreePromise: generateGameTree(newBoard, nextPlayer, depth - 1)
        };
    });

    return {
        board: board,
        player: player,
        moves: moves
    };
}

function getValidMoves(board, player) {
    const moves = [];
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (canFlip(i, j, board, player)) {
                moves.push([i, j]);
            }
        }
    }
    return moves;
}

function applyMove(board, move, player) {
    const newBoard = board.map(row => row.slice());
    newBoard[move[0]][move[1]] = player;
    flipPieces(move[0], move[1], newBoard, player);
    return newBoard;
}

function delay(fn) {
    return new Promise(resolve => setTimeout(() => resolve(fn()), 0));
}

function force(promise) {
    return promise.then(result => result);
}