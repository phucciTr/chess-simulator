console.log('hello');

class Game {
  constructor() {
    this.board = [];
    this.reds = [];
    this.blues = [];
    this.turn = 'blue';
    this.highlightedSquares = [];
    this.currentTurnView = document.createElement('h1');
    this.possibleMoves = new Set();

    this.handlePieceDrop = this.handlePieceDrop.bind(this);
    this.setSuggestedMovesRenderer = this.setSuggestedMovesRenderer.bind(this);
    this.currentTurnView.setAttribute('id', 'current-turn');
  }

  startGame() {
    const boardView = document.createElement('table');
    const boardBodyView = document.createElement('tbody');
    boardView.setAttribute('id', 'board');

    for (let r = 0; r < 8; r++) {
      const row = [];
      const rowView = document.createElement('tr');

      for (let c = 0; c < 8; c++) {
        const squareView = document.createElement('td');
        this.colorSquare(r, c, squareView);
        this.makeDroppable(squareView);
        this.addPiece(r, c, squareView, row);
        rowView.append(squareView);
      }

      boardBodyView.append(rowView);
      this.board.push(row);
    }

    boardView.append(this.currentTurnView, boardBodyView);
    document.querySelector('body').append(boardView);
    this.toggleTurn();
  }

  toggleTurn() {
    if (this.turn === 'red') {
      this.reds.forEach((red) => red.blockDrag());
      this.blues.forEach((blue) => blue.allowDrag());
      this.turn = 'blue';
      this.currentTurnView.innerText = `${this.turn} turn`;
      return;
    }

    this.blues.forEach((blue) => blue.blockDrag());
    this.reds.forEach((red) => red.allowDrag());
    this.turn = 'red';
    this.currentTurnView.innerText = `${this.turn} turn`;
  }

  makeDroppable(square) {
    square.addEventListener('dragover', (e) => e.preventDefault());
    square.addEventListener('drop', (e) => this.handlePieceDrop(e, square));
  }

  handlePieceDrop(e, square) {
    e.preventDefault();
    this.clearSuggestedMoves();
    const [row, col] = e.dataTransfer.getData('text').split('');
    const transferredPiece = this.board[row][col]
    if (this.isMoveInvalid(square, transferredPiece)) { return; }
    this.placePiece(square, transferredPiece);
  }

  placePiece(square, transferredPiece) {
    const squareIndex = square.getAttribute('index');
    const [targetRow, targetCol] = squareIndex.split('');
    const [transferredRow, transferredCol] = transferredPiece.index.split('');
    if (square.hasChildNodes()) { square.removeChild(square.firstChild); this.board[targetRow][targetCol] = ''; }

    const targetPiece = this.board[targetRow][targetCol];
    transferredPiece.updateIndex(squareIndex);
    square.append(transferredPiece.shape);
    this.board[targetRow][targetCol] = transferredPiece;
    this.board[transferredRow][transferredCol] = targetPiece;
    this.toggleTurn();
  }

  getSquareColor(square) {
    return square.firstChild ? square.firstChild.style.color : '';
  }

  setSuggestedMovesRenderer(suggestedMoves) {
    const suggestedSquares = {}, game = this;
    game.possibleMoves = new Set(suggestedMoves);

    suggestedMoves.forEach((index) => {
      if (!suggestedSquares[index]) { suggestedSquares[index] = document.querySelector(`[index="${index}"]`); }
      const square = suggestedSquares[index];

      if (game.getSquareColor(square) !== game.turn) { square.style['background-color'] = game.turn; }
      if (!square.innerText) {square.style.opacity = `0.1`; }
      game.highlightedSquares.push(square);
    });

  }

  isMoveInvalid(square, transferredPiece) {
    const squareIndex = square.getAttribute('index');
    return !this.possibleMoves.has(squareIndex) || this.getSquareColor(square) === transferredPiece.getColor();
  }

  clearSuggestedMoves() {
    while (this.highlightedSquares.length) {
      const square = this.highlightedSquares.pop();
      square.style['opacity'] = '1';
      square.style['background-color'] = '';
    }
  }

  addPiece(r, c, square, row) {
    const pieces = [Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook];

    let piece = '';
    if (r === 0 || r === 7) { piece = new pieces[c](this.setSuggestedMovesRenderer, this.board); }
    if (r === 1 || r === 6) { piece = new Pawn(this.setSuggestedMovesRenderer, this.board); }
    if (r === 0 || r === 1) { piece.setColor('blue'); this.blues.push(piece); }
    if (r === 6 || r === 7) { piece.setColor('red'); this.reds.push(piece); }
    if (r === 0 || r === 1 || r === 6 || r === 7) { piece.updateIndex(`${r}${c}`, true); square.append(piece.shape); }

    row.push(piece);
  }

  colorSquare(r, c, square) {
    square.setAttribute('index', `${r}${c}`);

    if (r % 2 === 0) {
      return c % 2 === 0
        ? square.classList.add('black-square')
        : square.classList.add('square');
    }

    return c % 2 !== 0
      ? square.classList.add('black-square')
      : square.classList.add('square');
  }
}


class Piece {
  constructor(setSuggestedMovesRenderer, board) {
    this.shape = document.createElement('span');
    this.index = '';
    this.name = '';
    this.possibleMoves = [];
    this.board = board;

    this.shape.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text', this.index);
      setSuggestedMovesRenderer(this.suggestMoves());
    });
  }

  setColor(color) {
    this.shape.style.color = color;
  }

  blockDrag() {
    this.shape.setAttribute('draggable', 'false');
  }

  allowDrag() {
    this.shape.setAttribute('draggable', 'true');
  }

  getColor() {
    return this.shape.style.color;
  }

  updateIndex(index, init) {
    this.index = index;
    this.shape.setAttribute('index', index);
    if (!init && this.name === 'pawn') { this.isPawnFirstMove = false; }
  }

  isSuggestedMoveValid(r, c) {
    if (r < 0 || r >= 8 || c < 0 || c >= 8) { return false; }
    const neighbor = this.board[r][c];
    return !neighbor || this.getColor() !== neighbor.getColor();
  }

  suggestMoves() {
    const suggestedMoves = [];

    this.forEachPossibleMove((targetRow, targetCol, i, nextRow, nextCol) => {
      while (this.isSuggestedMoveValid(targetRow, targetCol)) {
        const targetPiece = this.board[targetRow][targetCol];
        suggestedMoves.push([targetRow, targetCol].join(''));
        if (targetPiece) { break; }
        targetRow += nextRow; targetCol += nextCol;
      }
    });

    return suggestedMoves;
  }

  forEachPossibleMove(suggestMove) {
    const [row, col] = this.index.split('');

    for (let i = 0; i < this.possibleMoves.length; i++) {
      const [r, c] = this.possibleMoves[i];
      let targetRow = Number(row) + r, targetCol = Number(col) + c;
      if (!this.isSuggestedMoveValid(targetRow, targetCol)) { continue; }
      suggestMove(targetRow, targetCol, i, r, c);
    }
  }
}

class King extends Piece {
  constructor(setSuggestedMovesRenderer, board) {
    super(setSuggestedMovesRenderer, board);
    this.name = 'queen';
    this.shape.innerText = '♔';
    this.possibleMoves = [[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]];
  }

  suggestMoves() {
    const suggestedMoves = [];

    this.forEachPossibleMove((targetRow, targetCol) => {
      if (this.isSuggestedMoveValid(targetRow, targetCol)) { suggestedMoves.push([targetRow, targetCol].join('')); }
    });

    return suggestedMoves;
  }
}

class Queen extends Piece {
  constructor(setSuggestedMovesRenderer, board) {
    super(setSuggestedMovesRenderer, board);
    this.name = 'king';
    this.shape.innerText = '♕';
    this.possibleMoves = [[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]];
  }
}

class Knight extends King {
  constructor(setSuggestedMovesRenderer, board) {
    super(setSuggestedMovesRenderer, board);
    this.name = 'knight';
    this.shape.innerText = '♘';
    this.possibleMoves = [[-2,-1],[-1,-2],[1,-2],[2,-1],[2,1],[1,2],[-1,2],[-2,1]];
  }
}

class Bishop extends Piece {
  constructor(setSuggestedMovesRenderer, board) {
    super(setSuggestedMovesRenderer, board);
    this.name = 'bishop';
    this.shape.innerText = '♗';
    this.possibleMoves = [[-1,-1],[-1,1],[1,1],[1,-1]];
  }
}

class Rook extends Piece {
  constructor(setSuggestedMovesRenderer, board) {
    super(setSuggestedMovesRenderer, board);
    this.name = 'rook';
    this.shape.innerText = '♖';
    this.possibleMoves = [[-1,0],[0,1],[1,0],[0,-1]];
  }
}

class Pawn extends Piece {
  constructor(setSuggestedMovesRenderer, board) {
    super(setSuggestedMovesRenderer, board);
    this.name = 'pawn';
    this.shape.innerText = '♙';
    this.isPawnFirstMove = true;
  }

  setColor(color) {
    super.setColor(color);
    this.possibleMoves = this.getColor() === 'red'
      ? [[-1,0],[-2,0],[-1,0],[-1,-1],[-1,1]]
      : [[1,0],[2,0],[1,0],[1,-1],[1,1]];
  }


  suggestMoves() {
    let suggestedMoves = [], prevTargetPiece;

    this.forEachPossibleMove((targetRow, targetCol, i) => {
      const targetPiece = this.board[targetRow][targetCol];
      if (i > 2 && targetPiece && this.isSuggestedMoveValid(targetRow, targetCol)) { suggestedMoves.push([targetRow, targetCol].join('')); }

      if (this.isPawnFirstMove) {
        if (i === 0 && !targetPiece) { suggestedMoves.push([targetRow, targetCol].join('')); }
        if (i === 1 && !prevTargetPiece && !targetPiece) { suggestedMoves.push([targetRow, targetCol].join('')); }
        prevTargetPiece = targetPiece;
      }
      else if (i === 2 && !targetPiece) { suggestedMoves.push([targetRow, targetCol].join('')); }
    });

    return suggestedMoves;
  }

}

const game = new Game();
game.startGame();