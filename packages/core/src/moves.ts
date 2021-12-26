import type { Board, Piece, PieceType, Square, Side, Direction } from './board'
import {
  getEnemySide,
  shift,
  inBoard,
  findPieces,
  atSquare,
  squareEquals,
  squareDiff,
  mutateBoard,
  serializePiece,
  readPieceType,
} from './board'
import { isUpperCase } from './utils'

export type Move = { from: Square, to: Square }
type Take = { piece: Piece; square: Square }
export type MoveWithTake = Move & { take?: Take } // exported only for testing!
export type FullMove = Move & { take?: Take; promotion?: PieceType }
export type HistoryMove = { move: FullMove; notation: string }
export type CheckState = 'SAFE' | 'CHECK' | 'CHECKMATE'

function getTraversalUntilBlockOrEnemy(from: Square, side: Side, dirs: Direction[], board: Board): MoveWithTake[] {
  const traversal: MoveWithTake[] = []
  for (const dir of dirs) {
    let current = shift(from, dir)
    while (inBoard(current, board) && !atSquare(current, board)) {
      traversal.push({ from, to: current })
      current = shift(current, dir)
    }
    const finalSquareInBoard = inBoard(current, board)
    const pieceAtEnd = finalSquareInBoard && atSquare(current, board)
    if (finalSquareInBoard && pieceAtEnd && pieceAtEnd.side === getEnemySide(side)) {
      traversal.push({
        from,
        to: current,
        take: {
          square: current,
          piece: pieceAtEnd
        }
      })
    }
  }
  return traversal
}

function getFeasibleBishopMoves(from: Square, side: Side, board: Board): MoveWithTake[] {
  const piece = atSquare(from, board)
  if (!piece) {
    throw new Error(`Piece not available at ${from} to move!`)
  }
  if (!(piece.type === 'bishop')) {
    throw new Error(`Piece is not a bishop to move!`)
  }
  if (piece.side !== side) { throw new Error(`Piece moved does not match moving side.`) }
  const diagonalDirs : Direction[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  return getTraversalUntilBlockOrEnemy(from, piece.side, diagonalDirs, board)
}

function getFeasibleRookMoves(from: Square, side: Side, board: Board): MoveWithTake[] {
  const piece = atSquare(from, board)
  if (!piece) {
    throw new Error(`Piece not available at ${from} to move!`)
  }
  if (!(piece.type === 'rook')) {
    throw new Error(`Piece is not a rook to move!`)
  }
  if (piece.side !== side) { throw new Error(`Piece moved does not match moving side.`) }
  const rowColDirs: Direction[] = [[-1, 0], [0, 1], [0, -1], [1, 0]]
  return getTraversalUntilBlockOrEnemy(from, piece.side, rowColDirs, board)
}

function getFeasibleKnightMoves(from: Square, side: Side, board: Board): MoveWithTake[] {
  const piece = atSquare(from, board)
  if (!piece) {
    throw new Error(`Piece not available at ${from} to move!`)
  }
  if (!(piece.type === 'knight')) {
    throw new Error(`Piece is not a knight to move!`)
  }
  if (piece.side !== side) { throw new Error(`Piece moved does not match moving side.`) }
  const jumpDirs: Direction[] = [[-1, 2], [-1, -2], [1, -2], [1, 2], [-2, -1], [-2, 1], [2, 1], [2, -1]]
  return getTraversalUntilBlockOrEnemy(from, piece.side, jumpDirs, board)
}

function getFeasiblePawnMoves(from: Square, previous: Move | undefined, side: Side, board: Board): MoveWithTake[] {
  const piece = atSquare(from, board)
  if (!piece) {
    throw new Error(`Piece not available at ${from} to move!`)
  }
  if (!(piece.type === 'pawn')) {
    throw new Error(`Piece is not a pawn to move!`)
  }
  if (piece.side !== side) { throw new Error(`Piece moved does not match moving side.`) }
  const moves: MoveWithTake[] = []

  const startRow = piece.side === 'black' ? 1 : board.length - 2
  const enemyStartRow = piece.side === 'black' ? board.length - 2 : 1
  const enemyJumpRow = piece.side === 'black' ? board.length - 4 : 3
  const moveDirection: Direction = piece.side === 'black' ? [1, 0] : [-1, 0]
  const jumpDirection: Direction = piece.side === 'black' ? [2, 0] : [-2, 0]
  const takeDirections: Direction[] = piece.side === 'black' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]]

  // forward moves
  const moveSquare = shift(from, moveDirection)
  if (inBoard(moveSquare, board) && !atSquare(moveSquare, board)) {
    moves.push({ from, to: moveSquare })
  }
  if (from[0] === startRow) {
    const jumpSquare = shift(from, jumpDirection)
    if (inBoard(jumpSquare, board) && !atSquare(jumpSquare, board)) {
      moves.push({ from, to: jumpSquare })
    }
  }

  // Logic for handling en passant
  if (previous) {
    const pieceAtPreviousMoveTarget = previous ? atSquare(previous.to, board) : null
    const enemyPawnMovedLast = pieceAtPreviousMoveTarget?.type === 'pawn' && pieceAtPreviousMoveTarget?.side === getEnemySide(side)
    const enemyPawnJumped = previous.from[0] === enemyStartRow && previous.to[0] === enemyJumpRow
    const diffToEnemyPawn = squareDiff(from, previous.to)
    const nextToEnemyPawn = squareEquals(diffToEnemyPawn, [0, -1]) || squareEquals(diffToEnemyPawn, [0, 1])
    if (enemyPawnMovedLast && enemyPawnJumped && nextToEnemyPawn) {
      const dir = shift(diffToEnemyPawn, side === 'black' ? [1, 0] : [-1, 0])
      const take = { square: previous.to, piece: pieceAtPreviousMoveTarget }
      moves.push({ from, to: shift(from, dir), take })
    }
  }

  // normal pawn takes
  for (const dir of takeDirections) {
    const takeSquare = shift(from, dir)
    const takeSquareInBoard = inBoard(takeSquare, board)
    const takenPiece = takeSquareInBoard ? atSquare(takeSquare, board) : null
    if (takeSquareInBoard && takenPiece?.side === getEnemySide(piece.side)) {
      const take = { square: takeSquare, piece: takenPiece }
      moves.push({ from, to: takeSquare, take })
    }
  }

  return moves
}

function getFeasibleQueenMoves(from: Square, side: Side, board: Board): MoveWithTake[] {
  const piece = atSquare(from, board)
  if (!piece) {
    throw new Error(`Piece not available at ${from} to move!`)
  }
  if (!(piece.type === 'queen')) {
    throw new Error(`Piece is not a knight to move!`)
  }
  if (piece.side !== side) { throw new Error(`Piece moved does not match moving side.`) }
  const allDirs : Direction[] = [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [0, 1], [0, -1], [1, 0]]
  return getTraversalUntilBlockOrEnemy(from, piece.side, allDirs, board)
}

// TODO: Does not account for castling
function getFeasibleKingMoves(from: Square, side: Side, board: Board): MoveWithTake[] {
  const piece = atSquare(from, board)
  if (!piece || !(piece.type === 'king')) { throw new Error('Not a king being moved!'); }
  if (piece.side !== side) { throw new Error(`Piece moved does not match moving side.`) }

  const allDirs : Direction[] = [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [0, 1], [0, -1], [1, 0]]
  const moves: MoveWithTake[] = []

  for (const dir of allDirs) {
    const moveSquare = shift(from, dir)
    const squareInBoard = inBoard(moveSquare, board)
    if (!squareInBoard) { continue }
    const squareEmpty = !(atSquare(moveSquare, board))
    const pieceAtMoveSquare = atSquare(moveSquare, board)
    const squareEnemy = pieceAtMoveSquare?.side === getEnemySide(piece.side)
    if (squareEmpty) {
      moves.push({ from, to: moveSquare })
    }
    if (squareEnemy) {
      const take = { square: moveSquare, piece: pieceAtMoveSquare }
      moves.push({ from, to: moveSquare, take })
    }
  }

  return moves
}

// NOTE: exported only for testing
export function getFeasibleMoves(from: Square, previous: Move | undefined, side: Side, board: Board): MoveWithTake[] {
  const piece = atSquare(from, board)
  if (!piece) { throw new Error(`No piece at square: ${from} to get moves for!`) }
  if (piece.side !== side) { throw new Error(`Piece moved does not match moving side.`) }
  switch(piece.type) {
    case 'pawn':
      return getFeasiblePawnMoves(from, previous, side, board)
    case 'bishop':
      return getFeasibleBishopMoves(from, side, board)
    case 'rook':
      return getFeasibleRookMoves(from, side, board)
    case 'knight':
      return getFeasibleKnightMoves(from, side, board)
    case 'queen':
      return getFeasibleQueenMoves(from, side, board)
    case 'king':
      return getFeasibleKingMoves(from, side, board)
  }
}

function getTakeForMove(move: Move, previous: Move | undefined, side: Side, board: Board): Take | undefined {
  const feasibleMoves = getFeasibleMoves(move.from, previous, side, board)
  const moveWithTake = feasibleMoves.find(feasibleMove => squareEquals(feasibleMove.to, move.to))
  return moveWithTake?.take
}

function isFeasibleMove(move: Move, previous: Move | undefined, side: Side, board: Board): boolean {
  const feasibleMoves = getFeasibleMoves(move.from, previous, side, board)
  return feasibleMoves.some(feasibleMove => squareEquals(feasibleMove.to, move.to))
}

export function getAllFeasibleMoves(previous: Move | undefined, side: Side, board: Board): MoveWithTake[] {
  const squares = findPieces({ side }, board)
  return squares.map(
    square => getFeasibleMoves(square, previous, side, board)
  ).flat()
}

export function isCheck(previous: Move | undefined, side: Side, board: Board): boolean {
  const ownKingSquare = findPieces({ type: 'king', side: side }, board)
  const enemySide = getEnemySide(side)
  const enemyMoves = getAllFeasibleMoves(previous, enemySide, board)
  return enemyMoves.some(move => move.to[0] === ownKingSquare[0]?.[0] && move.to[1] === ownKingSquare[0]?.[1])
}

export function getValidMoves(from: Square, previous: Move | undefined, side: Side, board: Board): MoveWithTake[] {
  const piece = atSquare(from, board)
  if (!piece) { return [] }
  const feasibleMoves = getFeasibleMoves(from, previous, side, board)
  const validMoves: MoveWithTake[] = []
  feasibleMoves.forEach(move => {
    // may need to be careful here about GC
    const boardAfterMove = mutateBoard([
      { square: from, piece: null },
      { square: move.to, piece }
    ], board)

    if (!isCheck(previous, piece.side, boardAfterMove)) {
      validMoves.push(move)
    }
  })
  return validMoves
}

export function isValidMove(move: Move, previous: Move | undefined, side: Side, board: Board): boolean {
  const validMoves = getValidMoves(move.from, previous, side, board)
  return validMoves.some(validMove => squareEquals(validMove.to, move.to))
}

export function getCheckState(previous: Move | undefined, side: Side, board: Board): CheckState {
  const ownKingSquare = findPieces({ type: 'king', side: side }, board)[0]
  if (!ownKingSquare) { throw new Error('Could not find own king!') }

  const kingMoves = getValidMoves(ownKingSquare, previous, side, board)
  const hasCheck = isCheck(previous, side, board)
  const hasMate = kingMoves.length === 0 && hasCheck
  if (hasMate) { return 'CHECKMATE' }
  if (hasCheck) { return 'CHECK' }
  return 'SAFE'
}

export function canPromoteFromAssumedValidMove(move: Move, side: Side, board: Board): boolean {
  const piece = atSquare(move.from, board)
  const lastRow = side === 'black' ? board[board.length - 1] : 0
  if (piece?.side !== side) { throw new Error(`Piece moved does not match moving side.`) }
  return piece?.type === 'pawn' && move.to[0] === lastRow
}

export function executeMove(move: Move, previous: Move | undefined, promotion: PieceType | undefined, side: Side, board: Board): {
  fullMove: FullMove;
  newBoard: Board;
} {
  const isValid = isValidMove(move, previous, side, board)
  if (!isValid) {
    throw new Error(`Move ${move} is not valid.`)
  }
  const take = getTakeForMove(move, previous, side, board)
  let piece = atSquare(move.from, board)
  const canPromote = canPromoteFromAssumedValidMove(move, side, board)
  if (canPromote && !promotion) {
    throw new Error('Cannot make a final rank move without promotion.')
  }
  if (canPromote && promotion) {
    piece = { type: promotion, side };
  }

  const boardAfterMove = mutateBoard([
    { square: move.from, piece: null },
    { square: move.to, piece },
    ...(take?.square && !squareEquals(take?.square, move.to) ? [{ square: take?.square, piece: null }] : [])
  ], board)

  const fullMove = {
    ...move,
    ...take && ({ take }),
    ...promotion && ({ promotion }),
  }

  return {
    fullMove,
    newBoard: boardAfterMove,
  }
}

function notateSquare(square: Square): string {
  const charCodeOfLowerA = 97
  const column = String.fromCharCode(charCodeOfLowerA + square[1])
  const row = 8 - square[0]
  return `${column}${row}`
}

// NOTE: generally assumes move is valid...
// if pawn take, need to include column
export function notate(move: FullMove, previous: FullMove | undefined, side: Side, board: Board): string {
  const piece = atSquare(move.from, board)
  if (!piece) { throw new Error('No piece being moved...') }
  const pieceString = piece.type === 'pawn' ? '' : serializePiece(piece)[1]
  const targetSquareString = notateSquare(move.to)

  // Disambiguation
  // NOTE: ideally use isValidMove, but need to avoid expensive computation
  const similarPieceSquares = findPieces(piece, board)
  const piecesWithSameMove = similarPieceSquares.filter(
    square => isFeasibleMove({ from: square, to: move.to }, previous, side, board)
  )
  const shouldIncludePawnColumnForTake = piece.type === 'pawn' && !!move.take
  const shouldDisambiguateColumn = new Set([move.from, ...piecesWithSameMove].map(square => square[1])).size < piecesWithSameMove.length
  const shouldDisambiguateRow = new Set([move.from, ...piecesWithSameMove].map(square => square[0])).size < piecesWithSameMove.length
  const disambiguationSquare = notateSquare(move.from)
  const disambiguationString = `${(shouldDisambiguateColumn || shouldIncludePawnColumnForTake) ? disambiguationSquare[0] : ''}${shouldDisambiguateRow ? disambiguationSquare[1] : ''}`

  // handling piece takes
  const takeString = move.take ? 'x' : ''

  // promotion string, slightly hacky since we don't care about side
  let promotionString = ''
  if (move.promotion) {
    const promotionPieceString = move.promotion ? serializePiece({ type: move.promotion, side: 'white' })[1] : ''
    promotionString = '=' + promotionPieceString
  }

  // en passant
  let enPassantString = ''
  if (move.take && !squareEquals(move.take.square, move.to)) {
    enPassantString = ' e.p.'
  }

  // test for check
  const { newBoard } = executeMove(move, previous, move.promotion, side, board)
  const newBoardCheckState = getCheckState(previous, getEnemySide(side), newBoard)
  let checkStateString = ''
  if (newBoardCheckState === 'CHECK') { checkStateString = '+' }
  if (newBoardCheckState === 'CHECKMATE') { checkStateString = '#' }


  return `${pieceString}${disambiguationString}${takeString}${targetSquareString}${promotionString}${checkStateString}${enPassantString}`
}

function parseSquare(squareString: string, board: Board): Square {
  const column = squareString[0]
  const row = squareString[1]
  if (!column || !row) { throw new Error(`String ${squareString} does not represent a square!`) }

  const parsedColumn = column.charCodeAt(0) - 97
  const parsedRow = board.length - parseInt(row)
  if (
    parsedColumn >= board[0].length || parsedColumn < 0 ||
    parsedRow < 0 || parsedRow >= board.length
  ) {
    throw new Error(`Parsed square ${squareString} is out of board dimensions.`)
  }

  return [parsedRow, parsedColumn]
}

// NOTE: only works for limited range of squares
const disambiguationRegex = /([a-z])?([1-9])?/
function parseDisambiguationString(disambiguationString: string, board: Board): { row?: number; column?: number } {
  const matches = disambiguationString.match(disambiguationRegex)
  const columnString = matches?.[1]
  const rowString = matches?.[2]

  return {
    ...columnString && ({ column: columnString.charCodeAt(0) - 97 }),
    ...rowString && ({ row: board.length - parseInt(rowString) })
  }
}

// NOTE: may be cleaner with RegExp
export function parseMoveNotation(notation: string, side: Side, board: Board): FullMove {
  // extract en passant
  const enPassant = notation.endsWith(' e.p.')
  const notationWithEnPassantRemoved = notation.split(' e.p.')[0]
  if (notationWithEnPassantRemoved === undefined) { throw new Error('Bad notation string split') }

  // extract check or checkmate
  const hasCheckString = notation.endsWith('#') || notation.endsWith('+')
  const notationWithCheckRemoved = hasCheckString ?
    notationWithEnPassantRemoved.substr(0, notationWithEnPassantRemoved.length - 1) :
    notationWithEnPassantRemoved

  // extract promotion
  const [notationWithPromotionRemoved, promotionString] = notationWithCheckRemoved.split('=')
  const promotion = promotionString ? readPieceType(promotionString) : undefined
  if (notationWithPromotionRemoved === undefined) { throw new Error('Bad notation string split') }

  // extract target square
  const targetSquareString = notationWithPromotionRemoved.substr(notationWithPromotionRemoved.length - 2)
  const targetSquare = parseSquare(targetSquareString, board)
  const notationWithTargetRemoved = notationWithPromotionRemoved.split(targetSquareString)[0]
  if (notationWithTargetRemoved === undefined) { throw new Error('Bad notation string split') }

  // extract take segment
  const hasTake = notationWithTargetRemoved.endsWith('x')
  let take: Take | undefined = undefined;
  if (hasTake && enPassant) {
    const takePiece = { type: 'pawn' as PieceType, side: getEnemySide(side) }
    const backOneSquareDir: [number, number] = side === 'black' ? [-1, 0] : [1, 0]
    const takeSquare = shift(targetSquare, backOneSquareDir)
    take = { piece: takePiece, square: takeSquare }
  } else if (hasTake) {
    const takePiece = atSquare(targetSquare, board)
    if (!takePiece || takePiece.side != getEnemySide(side)) {
      throw new Error('Piece does not exist or has wrong side at target square in notation')
    }
    take = { piece: takePiece, square: targetSquare }
  }
  const notationWithTakeRemoved = notationWithTargetRemoved.split('x')[0]
  if (notationWithTakeRemoved === undefined) { throw new Error('Bad notation string split') }

  // extract piece being moved
  const pieceType = isUpperCase(notationWithTakeRemoved[0] || 'a') ? readPieceType(notationWithTakeRemoved[0] || '') : 'pawn'
  const piece = { side, type: pieceType }
  const disambiguationString = notationWithTakeRemoved.substr(pieceType === 'pawn' ? 0 : 1)
  const disambiguation = parseDisambiguationString(disambiguationString, board)
  const similarPieceSquares = findPieces(piece, board)
  const matchingPieceSquares = similarPieceSquares.filter(square => {
    if (pieceType === 'pawn') {
      const matchesRow =
        (disambiguation.row === undefined && Math.abs(square[0] - targetSquare[0]) <= 2) ||
        (disambiguation.row !== undefined && square[0] === disambiguation.row)
      const matchesColumn =
        (disambiguation.column === undefined && (square[1] === targetSquare[1])) ||
        (disambiguation.column !== undefined && (square[1] === disambiguation.column))
      return matchesRow && matchesColumn
    }
    const matchesRow = disambiguation.row === undefined || (disambiguation.row === square[0])
    const matchesColumn = disambiguation.column === undefined || (disambiguation.column === square[1])
    return matchesRow && matchesColumn
  })
  if (matchingPieceSquares.length === 0) {
    throw new Error('Could not find piece matching disambiguation in notation')
  }
  if (matchingPieceSquares.length > 1 && pieceType !== 'pawn') {
    throw new Error('Squares for move could not be disambiguated')
  }
  const matchingPawnSquare =
    matchingPieceSquares.find(square => Math.abs(square[0] - targetSquare[0]) === 1) ||
    matchingPieceSquares.find(square => Math.abs(square[0] - targetSquare[0]) === 2)

  const matchingPieceSquare = pieceType === 'pawn' ? matchingPawnSquare : matchingPieceSquares[0]
  if (!matchingPieceSquare) {
    throw new Error('Could not find matching piece for notated move')
  }

  return {
    from: matchingPieceSquare,
    to: targetSquare,
    ...take && ({ take }),
    ...promotion && ({ promotion }),
  }
}
