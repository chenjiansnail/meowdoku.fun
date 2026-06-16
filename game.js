/* Meowdoku — cat logic puzzle (Queens-style rules), vanilla JS, no dependencies.
 * Rules: one cat per row, one per column, one per colored region,
 * and no two cats may touch diagonally.
 */
(function () {
  "use strict";

  var REGION_COLORS = [
    "#f94144", "#f3722c", "#f9c74f", "#90be6d", "#43aa8b",
    "#577590", "#277da1", "#9d4edd", "#f72585"
  ];

  var STATE_EMPTY = 0, STATE_X = 1, STATE_CAT = 2;
  var MAX_HEARTS = 3;

  var els = {};
  var puzzles = [];
  var byDifficulty = {}; // size -> [puzzles]
  var current = null;     // active puzzle object {size, regions, solution}
  var board = null;       // n x n grid of cell states
  var locked = null;      // n x n grid of booleans — cells pre-placed at start
  var hearts = MAX_HEARTS;
  var timerHandle = null;
  var seconds = 0;
  var solved = false;
  var lockedOut = false;
  var usedIds = {}; // size -> Set of used puzzle ids (avoid repeats within a session)

  function $(id) { return document.getElementById(id); }

  function init() {
    els.board = $("meowdoku-board");
    els.hearts = $("meowdoku-hearts");
    els.timer = $("meowdoku-timer");
    els.message = $("meowdoku-message");
    els.newBtn = $("meowdoku-new");
    els.restartBtn = $("meowdoku-restart");
    els.hintBtn = $("meowdoku-hint");
    els.difficulty = $("meowdoku-difficulty");

    var dataNode = $("meowdoku-puzzle-data");
    if (!dataNode) return;
    try {
      puzzles = JSON.parse(dataNode.textContent);
    } catch (e) {
      els.message.textContent = "Couldn't load puzzles.";
      return;
    }
    puzzles.forEach(function (p) {
      (byDifficulty[p.size] = byDifficulty[p.size] || []).push(p);
      usedIds[p.size] = usedIds[p.size] || new Set();
    });

    els.newBtn.addEventListener("click", function () { loadPuzzle(currentSize()); });
    els.restartBtn.addEventListener("click", restartCurrent);
    els.hintBtn.addEventListener("click", giveHint);
    els.difficulty.addEventListener("change", function () { loadPuzzle(currentSize()); });

    loadPuzzle(currentSize());
  }

  function currentSize() {
    return parseInt(els.difficulty.value, 10);
  }

  function pickPuzzle(size) {
    var pool = byDifficulty[size] || [];
    if (pool.length === 0) return null;
    var used = usedIds[size];
    var available = pool.filter(function (p) { return !used.has(p.id); });
    if (available.length === 0) {
      used.clear();
      available = pool;
    }
    var choice = available[Math.floor(Math.random() * available.length)];
    used.add(choice.id);
    return choice;
  }

  function loadPuzzle(size) {
    var puzzle = pickPuzzle(size);
    if (!puzzle) return;
    current = puzzle;
    var n = puzzle.size;
    board = [];
    locked = [];
    for (var r = 0; r < n; r++) {
      board.push(new Array(n).fill(STATE_EMPTY));
      locked.push(new Array(n).fill(false));
    }
    hearts = MAX_HEARTS;
    solved = false;
    lockedOut = false;
    seconds = 0;
    els.message.textContent = "";
    // pre-place one random cat from the solution
    var startRow = Math.floor(Math.random() * n);
    puzzle._startRow = startRow;
    var startCol = puzzle.solution[startRow];
    board[startRow][startCol] = STATE_CAT;
    locked[startRow][startCol] = true;
    updateHearts();
    startTimer();
    render();
  }

  function restartCurrent() {
    if (!current) return;
    var n = current.size;
    board = [];
    locked = [];
    for (var r = 0; r < n; r++) {
      board.push(new Array(n).fill(STATE_EMPTY));
      locked.push(new Array(n).fill(false));
    }
    // restore the same opening cat
    var startRow = current._startRow;
    var startCol = current.solution[startRow];
    board[startRow][startCol] = STATE_CAT;
    locked[startRow][startCol] = true;
    hearts = MAX_HEARTS;
    solved = false;
    lockedOut = false;
    seconds = 0;
    els.message.textContent = "";
    updateHearts();
    startTimer();
    render();
  }

  function startTimer() {
    if (timerHandle) clearInterval(timerHandle);
    updateTimer();
    timerHandle = setInterval(function () {
      if (solved || lockedOut) return;
      seconds++;
      updateTimer();
    }, 1000);
  }

  function updateTimer() {
    var m = Math.floor(seconds / 60), s = seconds % 60;
    els.timer.textContent = m + ":" + (s < 10 ? "0" : "") + s;
  }

  function updateHearts() {
    var full = "♥".repeat(Math.max(hearts, 0));
    var empty = "♡".repeat(MAX_HEARTS - Math.max(hearts, 0));
    els.hearts.textContent = full + empty;
  }

  function render() {
    var n = current.size;
    els.board.innerHTML = "";
    els.board.style.setProperty("--n", n);
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "meow-cell";
        cell.setAttribute("data-r", r);
        cell.setAttribute("data-c", c);
        var regionId = current.regions[r][c];
        cell.style.background = REGION_COLORS[regionId % REGION_COLORS.length];
        if (locked[r][c]) {
          cell.classList.add("locked");
          cell.disabled = true;
        } else {
          cell.addEventListener("click", onCellClick);
        }
        renderCellContent(cell, board[r][c]);
        els.board.appendChild(cell);
      }
    }
  }

  function renderCellContent(cell, state) {
    if (state === STATE_CAT) {
      cell.textContent = "🐱";
      cell.classList.add("has-cat");
      cell.classList.remove("has-x");
    } else if (state === STATE_X) {
      cell.textContent = "✕";
      cell.classList.add("has-x");
      cell.classList.remove("has-cat");
    } else {
      cell.textContent = "";
      cell.classList.remove("has-cat", "has-x");
    }
  }

  function onCellClick(e) {
    if (solved || lockedOut) return;
    var r = parseInt(e.currentTarget.getAttribute("data-r"), 10);
    var c = parseInt(e.currentTarget.getAttribute("data-c"), 10);
    var next = (board[r][c] + 1) % 3;
    board[r][c] = next;
    renderCellContent(e.currentTarget, next);

    if (next === STATE_CAT) {
      var conflicts = findConflicts(r, c);
      if (conflicts.length > 0) {
        flashConflicts(conflicts.concat([[r, c]]));
        hearts--;
        updateHearts();
        board[r][c] = STATE_EMPTY;
        setTimeout(function () {
          var cellEl = els.board.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
          if (cellEl) renderCellContent(cellEl, STATE_EMPTY);
        }, 500);
        if (hearts <= 0) {
          lockedOut = true;
          els.message.textContent = "Out of hearts — hit Restart to try again.";
        }
        return;
      }
      checkWin();
    }
  }

  function findConflicts(r, c) {
    var n = current.size;
    var regionId = current.regions[r][c];
    var conflicts = [];
    for (var rr = 0; rr < n; rr++) {
      for (var cc = 0; cc < n; cc++) {
        if (rr === r && cc === c) continue;
        if (board[rr][cc] !== STATE_CAT) continue;
        var sameRow = rr === r;
        var sameCol = cc === c;
        var sameRegion = current.regions[rr][cc] === regionId;
        var diagTouch = Math.abs(rr - r) === 1 && Math.abs(cc - c) === 1;
        if (sameRow || sameCol || sameRegion || diagTouch) {
          conflicts.push([rr, cc]);
        }
      }
    }
    return conflicts;
  }

  function flashConflicts(cells) {
    cells.forEach(function (pos) {
      var el = els.board.querySelector('[data-r="' + pos[0] + '"][data-c="' + pos[1] + '"]');
      if (el) {
        el.classList.add("conflict");
        setTimeout(function () { el.classList.remove("conflict"); }, 500);
      }
    });
  }

  function checkWin() {
    var n = current.size;
    var catCount = 0;
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (board[r][c] === STATE_CAT) catCount++;
      }
    }
    if (catCount !== n) return;
    // every cat placed with zero conflicts among them already guaranteed by
    // findConflicts gating each placement, so n cats placed == solved.
    solved = true;
    els.message.textContent = "🎉 Solved in " + els.timer.textContent + " with " + hearts + " heart(s) left!";
  }

  function giveHint() {
    if (!current || solved || lockedOut) return;
    var n = current.size;
    for (var r = 0; r < n; r++) {
      var solCol = current.solution[r];
      if (board[r][solCol] !== STATE_CAT) {
        // clear any wrong cat in this row first
        for (var c = 0; c < n; c++) {
          if (board[r][c] === STATE_CAT) {
            board[r][c] = STATE_EMPTY;
            var prevEl = els.board.querySelector('[data-r="' + r + '"][data-c="' + c + '"]');
            if (prevEl) renderCellContent(prevEl, STATE_EMPTY);
          }
        }
        board[r][solCol] = STATE_CAT;
        var el = els.board.querySelector('[data-r="' + r + '"][data-c="' + solCol + '"]');
        if (el) renderCellContent(el, STATE_CAT);
        checkWin();
        return;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
