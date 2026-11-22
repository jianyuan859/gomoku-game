/* ============================================================
   五子棋 · 游戏逻辑
   ============================================================ */

(function () {
  'use strict';

  const SIZE = 15;                                  // 棋盘 15 × 15
  const NEED = 5;                                   // 连成 5 颗即获胜
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];   // 横、竖、右斜、左斜

  const domBoard = document.getElementById('board');
  const domTip = document.getElementById('tip');
  const domWinLine = document.getElementById('win-line');
  const domRestart = document.getElementById('restart');

  let board = createBoard();   // board[y][x]：'black' / 'white' / null
  let isBlack = true;          // 当前是否轮到黑棋
  let gameOver = false;        // 是否已经分出结果
  let winLine = [];            // 获胜的五个坐标 [{x, y}, ...]

  /* ------------------------- 棋盘数据 ------------------------- */

  function createBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  function inBoard(x, y) {
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
  }

  function isFull() {
    return board.every(row => row.every(cell => cell !== null));
  }

  /* ------------------------- 渲染 ------------------------- */

  function render() {
    const fragment = document.createDocumentFragment();

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.addEventListener('click', () => clickCell(x, y));

        const color = board[y][x];
        if (color) {
          const chess = document.createElement('div');
          chess.className = 'chess ' + color;
          // 落在获胜连线上：加上发光动画的标记
          if (winLine.some(point => point.x === x && point.y === y)) {
            chess.classList.add('win');
          }
          cell.appendChild(chess);
        }

        fragment.appendChild(cell);
      }
    }

    domBoard.replaceChildren(fragment);
    domBoard.appendChild(domWinLine);   // 重绘会清掉连线，这里放回去

    drawWinLine();
  }

  /* ------------------------- 落子 ------------------------- */

  function clickCell(x, y) {
    if (gameOver || board[y][x]) return;   // 已分胜负 / 该位置有棋子：不接受落子

    const color = isBlack ? 'black' : 'white';
    board[y][x] = color;

    const line = findWinLine(x, y, color);
    if (line) {                            // 五连
      winLine = line;
      gameOver = true;
      render();
      flashBoard();
      showResult(color === 'black' ? '黑棋获胜' : '白棋获胜', false);
      return;
    }

    if (isFull()) {                        // 棋盘下满，和棋
      gameOver = true;
      render();
      showResult('和棋', true);
      return;
    }

    isBlack = !isBlack;
    domTip.classList.remove('tip-result', 'draw');
    domTip.textContent = isBlack ? '轮到黑棋' : '轮到白棋';
    render();
  }

  /* ------------------------- 胜负判定 ------------------------- */

  // 从 (x, y) 出发，沿 (dx, dy) 收集同色连子（含落子本身）
  function collectLine(x, y, dx, dy, color) {
    const after = [{ x: x, y: y }];
    for (let d = 1; d < SIZE; d++) {
      const nx = x + dx * d;
      const ny = y + dy * d;
      if (!inBoard(nx, ny) || board[ny][nx] !== color) break;
      after.push({ x: nx, y: ny });
    }

    const before = [];
    for (let d = 1; d < SIZE; d++) {
      const nx = x - dx * d;
      const ny = y - dy * d;
      if (!inBoard(nx, ny) || board[ny][nx] !== color) break;
      before.unshift({ x: nx, y: ny });
    }

    return before.concat(after);
  }

  // 这一手若能连成五子，返回真正相连的 5 个坐标；否则返回 null
  function findWinLine(x, y, color) {
    for (const [dx, dy] of DIRS) {
      const line = collectLine(x, y, dx, dy, color);
      if (line.length < NEED) continue;

      // 超过五连时，取一段包含刚落子的 5 颗
      const index = line.findIndex(point => point.x === x && point.y === y);
      const start = Math.max(0, Math.min(index - (NEED - 1), line.length - NEED));
      return line.slice(start, start + NEED);
    }
    return null;
  }

  /* ------------------------- 判定效果 ------------------------- */

  function showResult(text, isDraw) {
    domTip.textContent = text;
    domTip.classList.add('tip-result');
    domTip.classList.toggle('draw', isDraw);
  }

  function flashBoard() {
    domBoard.classList.remove('win-flash');
    void domBoard.offsetWidth;    // 触发一次重排，让动画能重新播放
    domBoard.classList.add('win-flash');
  }

  // 把金色连线铺在获胜的五个棋子上
  function drawWinLine() {
    if (!winLine.length) {
      domWinLine.classList.remove('show');
      domWinLine.style.width = '0px';
      return;
    }

    const cellSize = domBoard.clientWidth / SIZE;   // 实际格距，与 CSS 的 32px 一致
    const first = winLine[0];
    const last = winLine[winLine.length - 1];

    const x1 = first.x * cellSize + cellSize / 2;
    const y1 = first.y * cellSize + cellSize / 2;
    const x2 = last.x * cellSize + cellSize / 2;
    const y2 = last.y * cellSize + cellSize / 2;

    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const length = Math.hypot(x2 - x1, y2 - y1) + cellSize * 0.55;

    domWinLine.classList.remove('show');
    domWinLine.style.width = '0px';
    domWinLine.style.left = x1 + 'px';
    domWinLine.style.top = y1 + 'px';
    domWinLine.style.transform = 'translate(0, -50%) rotate(' + angle + 'deg)';

    requestAnimationFrame(() => {
      domWinLine.classList.add('show');
      domWinLine.style.width = length + 'px';
    });
  }

  /* ------------------------- 重新开始 ------------------------- */

  function resetGame() {
    board = createBoard();
    isBlack = true;
    gameOver = false;
    winLine = [];

    domTip.textContent = '黑棋先行';
    domTip.classList.remove('tip-result', 'draw');
    domBoard.classList.remove('win-flash');

    render();
  }

  domRestart.addEventListener('click', resetGame);

  resetGame();
})();
