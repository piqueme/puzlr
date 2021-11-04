import { readBoard } from '../board'
import type { Square, Piece } from '../board'
import type { Move, MoveWithTake } from '../moves'
import {
  getFeasibleMoves,
  isFeasibleMove,
  getAllFeasibleMoves,
  getValidMoves,
  getCheckState,
  canPromoteFromAssumedValidMove,
  executeMove,
} from '../moves'

// helps compare sets of moves
const moveSorter = (move1: Move, move2: Move) => {
  if (move2.to[0] === move1.to[0]) {
    return move1.to[1] - move2.to[1]
  }
  if (move2.to[0] < move1.to[0]) { return 1 }
  return -1
}

describe('getFeasibleMoves', () => {
  test('finds all knight moves in presence of empty, blocked, and takeable squares', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |wN|  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |wQ|  |  |',
      '----------------',
    ].join('\n'))

    const fromSquare: Square = [2, 1]
    const moves = getFeasibleMoves(fromSquare, null, 'white', testBoard)
    const targets: Square[] = [[0, 0], [0, 2], [1, 3], [3, 3], [4, 0]]
    const expectedMoves = targets.map(to => {
      const takenPiece = testBoard[to[0]]?.[to[1]]
      const take = { square: [to[0], to[1]], piece: takenPiece }
      return {
        from: fromSquare,
        to,
        ...(takenPiece ? { take } : {})
      }
    })
    expect(moves.sort(moveSorter)).toEqual(expectedMoves.sort(moveSorter))
  });

  test('finds all queen moves in presence of empty, blocked, and takeable squares', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |wN|  |  |  |',
      '----------------',
      '|  |  |  |bB|  |',
      '----------------',
      '|  |  |wQ|  |  |',
      '----------------',
    ].join('\n'))

    const fromSquare: Square = [4, 2]
    const moves = getFeasibleMoves(fromSquare, null, 'white', testBoard)
    const targets: Square[] = [
      [0, 2], [1, 2], [2, 2], [3, 2], [3, 3],
      [2, 0], [3, 1], [4, 0], [4, 1], [4, 3], [4, 4]
    ]
    const expectedMoves = targets.map(to => {
      const takenPiece = testBoard[to[0]]?.[to[1]]
      const take = { square: [to[0], to[1]], piece: takenPiece }
      return {
        from: fromSquare,
        to,
        ...(takenPiece ? { take } : {})
      }
    })
    expect(moves.sort(moveSorter)).toEqual(expectedMoves.sort(moveSorter))
  });

  test('finds black pawn moves in presence of empty, blocked, and takeable squares', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |wQ|  |  |',
      '----------------',
      '|  |bP|  |  |  |',
      '----------------',
      '|  |  |wQ|  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))

    const fromSquare: Square = [2, 1]
    const moves = getFeasibleMoves(fromSquare, null, 'black', testBoard)
    const targets: Square[] = [[3, 1], [3, 2]]
    const expectedMoves = targets.map(to => {
      const takenPiece = testBoard[to[0]]?.[to[1]]
      const take = { square: [to[0], to[1]], piece: takenPiece }
      return {
        from: fromSquare,
        to,
        ...(takenPiece ? { take } : {})
      }
    })
    expect(moves.sort(moveSorter)).toEqual(expectedMoves.sort(moveSorter))
  });

  test('finds king moves in presence of empty, blocked, and takeable squares', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |wN|  |  |',
      '----------------',
      '|bQ|bK|  |  |  |',
      '----------------',
      '|  |wP|  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))

    const fromSquare: Square = [2, 1]
    const moves = getFeasibleMoves(fromSquare, null, 'black', testBoard)
    const targets: Square[] = [[1, 0], [1, 1], [1, 2], [2, 2], [3, 0], [3, 1], [3, 2]]
    const expectedMoves = targets.map(to => {
      const takenPiece = testBoard[to[0]]?.[to[1]]
      const take = { square: [to[0], to[1]], piece: takenPiece }
      return {
        from: fromSquare,
        to,
        ...(takenPiece ? { take } : {})
      }
    })
    expect(moves.sort(moveSorter)).toEqual(expectedMoves.sort(moveSorter))
  });
});

describe('isFeasibleMove', () => {
  test('validates pawn en passant', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bP|bK|',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |wP|bP|  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wP|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))

    const isFeasible = isFeasibleMove({
      from: [3, 1],
      to: [2, 2],
    }, {
      from: [1, 2],
      to: [3, 2]
    }, 'white', testBoard)
    expect(isFeasible).toEqual(true)
  });

  test('validates knight takes piece', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |wN|  |  |',
      '----------------',
      '|bQ|bK|  |  |  |',
      '----------------',
      '|  |wP|  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))

    const isFeasible = isFeasibleMove({
      from: [1, 2],
      to: [2, 0],
    }, null, 'white', testBoard)
    expect(isFeasible).toEqual(true)
  });

  test('rejects queen moves past enemy piece', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |bK|  |  |',
      '----------------',
      '|  |  |wN|  |  |',
      '----------------',
      '|bQ|  |wR|  |  |',
      '----------------',
      '|  |wP|  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))

    const isFeasible = isFeasibleMove({
      from: [2, 0],
      to: [2, 4],
    }, null, 'black', testBoard)
    expect(isFeasible).toEqual(false)
  });
})

describe('getAllFeasibleMoves', () => {
  test('gets all feasible moves for small board with few pieces', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |bK|  |  |',
      '----------------',
      '|  |  |wN|  |  |',
      '----------------',
      '|bQ|  |wR|  |  |',
      '----------------',
      '|  |wP|  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))

    const feasibleMoves = getAllFeasibleMoves(
      null,
      'black',
      testBoard
    )
    const whiteRook: Piece = { type: 'rook', side: 'white' }
    const whitePawn: Piece = { type: 'pawn', side: 'white' }
    const whiteKnight: Piece = { type: 'knight', side: 'white' }
    const expectedMoves: MoveWithTake[] = [
      { from: [0, 2], to: [0, 1] },
      { from: [0, 2], to: [1, 1] },
      { from: [0, 2], to: [1, 2], take: { square: [1, 2], piece: whiteKnight } },
      { from: [0, 2], to: [0, 3] },
      { from: [0, 2], to: [1, 3] },
      { from: [2, 0], to: [0, 0] },
      { from: [2, 0], to: [1, 0] },
      { from: [2, 0], to: [3, 0] },
      { from: [2, 0], to: [4, 0] },
      { from: [2, 0], to: [1, 1] },
      { from: [2, 0], to: [2, 1] },
      { from: [2, 0], to: [3, 1], take: { square: [3, 1], piece: whitePawn } },
      { from: [2, 0], to: [2, 2], take: { square: [2, 2], piece: whiteRook } },
    ]
    expect(feasibleMoves.sort(moveSorter)).toEqual(expectedMoves.sort(moveSorter))
  });
})

describe('getValidMoves', () => {
  test('finds all knight moves including those that remove piece', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |wN|  |  |  |',
      '----------------',
      '|  |  |wK|  |  |',
      '----------------',
      '|  |  |wQ|  |  |',
      '----------------',
    ].join('\n'))

    const fromSquare: Square = [2, 1]
    const moves = getValidMoves(fromSquare, null, 'white', testBoard)
    const targets: Square[] = [[0, 0], [0, 2], [1, 3], [3, 3], [4, 0]]
    const expectedMoves = targets.map(to => {
      const takenPiece = testBoard[to[0]]?.[to[1]]
      const take = { square: [to[0], to[1]], piece: takenPiece }
      return {
        from: fromSquare,
        to,
        ...(takenPiece ? { take } : {})
      }
    })
    expect(moves.sort(moveSorter)).toEqual(expectedMoves.sort(moveSorter))
  });

  test('finds only move for knight that blocks existing check', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |wN|  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |wQ|wK|  |',
      '----------------',
    ].join('\n'))

    const fromSquare: Square = [2, 1]
    const moves = getValidMoves(fromSquare, null, 'white', testBoard)
    const targets: Square[] = [[3, 3]]
    const expectedMoves = targets.map(to => {
      const takenPiece = testBoard[to[0]]?.[to[1]]
      const take = { square: [to[0], to[1]], piece: takenPiece }
      return {
        from: fromSquare,
        to,
        ...(takenPiece ? { take } : {})
      }
    })
    expect(moves.sort(moveSorter)).toEqual(expectedMoves.sort(moveSorter))
  });

  test('finds no moves for bishop that is blocking check', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wB|  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const fromSquare: Square = [3, 3]
    const moves = getValidMoves(fromSquare, null, 'white', testBoard)
    expect(moves.sort(moveSorter)).toEqual([])
  });

  test('finds moves for king that take out of check from rook', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const fromSquare: Square = [4, 3]
    const moves = getValidMoves(fromSquare, null, 'white', testBoard)
    const targets: Square[] = [[3, 2], [4, 2], [3, 4], [4, 4]]
    const expectedMoves = targets.map(to => {
      return {
        from: fromSquare,
        to,
      }
    })
    expect(moves.sort(moveSorter)).toEqual(expectedMoves.sort(moveSorter))
  });
})

describe('getCheckState', () => {
  test('validates that there are no checks', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |wN|  |  |',
      '----------------',
      '|bQ|bK|  |  |  |',
      '----------------',
      '|  |wP|  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))
    expect(getCheckState(null, 'black', testBoard)).toEqual('SAFE')
  })

  test('validates that there is a check from a single piece', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |wN|  |  |',
      '----------------',
      '|bQ|bK|  |  |  |',
      '----------------',
      '|  |  |wP|  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))
    expect(getCheckState(null, 'black', testBoard)).toEqual('CHECK')
  })

  test('validates that there is a check from multiple pieces', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |wN|  |  |',
      '----------------',
      '|bQ|bK|  |wR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wB|  |',
      '----------------',
    ].join('\n'))
    expect(getCheckState(null, 'black', testBoard)).toEqual('CHECK')
  })

  test('recognizes checkmate', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |bK|  |  |wR|',
      '----------------',
      '|  |  |  |wR|  |',
      '----------------',
      '|  |  |  |  |wK|',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))
    expect(getCheckState(null, 'black', testBoard)).toEqual('CHECKMATE')
  })
})

describe('canPromoteFromAssumedValidMove', () => {
  test('returns true when pawn moves to last row validly', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |bK|bR|  |  |',
      '----------------',
      '|  |  |  |wP|  |',
      '----------------',
      '|  |  |  |  |wK|',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))
    const canPromote = canPromoteFromAssumedValidMove({
      from: [1, 3],
      to: [0, 2]
    }, 'white', testBoard)
    expect(canPromote).toEqual(true)
  })

  test('returns true even when pawn moves to last row invalidly (existing check)', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |bK|bR|  |  |',
      '----------------',
      '|  |  |  |wP|  |',
      '----------------',
      '|  |  |  |  |wK|',
      '----------------',
      '|  |  |  |  |bR|',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))
    const canPromote = canPromoteFromAssumedValidMove({
      from: [1, 3],
      to: [0, 3]
    }, 'white', testBoard)
    expect(canPromote).toEqual(true)
  })

  test('returns false pawn does not move to last row', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |bK|bR|  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wP|wK|',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))
    const canPromote = canPromoteFromAssumedValidMove({
      from: [2, 3],
      to: [1, 3]
    }, 'white', testBoard)
    expect(canPromote).toEqual(false)
  })

  test('returns false when pawn moves to own side last row', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |bK|bR|  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wR|wK|',
      '----------------',
      '|  |  |  |wP|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))
    const canPromote = canPromoteFromAssumedValidMove({
      from: [3, 3],
      to: [4, 3]
    }, 'white', testBoard)
    expect(canPromote).toEqual(false)
  })

  test('throws error when checking non-pawn moving to last row', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |bK|bR|  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wR|wK|',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
    ].join('\n'))
    const canPromote = canPromoteFromAssumedValidMove({
      from: [2, 3],
      to: [0, 3]
    }, 'white', testBoard)
    expect(canPromote).toEqual(false)
  })
})

// pawn first move
// pawn en passant
// queen takes bishop
// failure no piece at from
// failure move to same side piece
// failure move past piece
// failure move into check

describe('executeMove', () => {
  test('throws error when no piece at from square', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    expect(() => {
      executeMove(
        { from: [3, 3], to: [3, 4] },
        null,
        null,
        'black',
        testBoard
      )
    }).toThrowError()
  })

  test('throws error if piece at from square is not given side', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    expect(() => {
      executeMove(
        { from: [4, 3], to: [4, 2] },
        null,
        null,
        'black',
        testBoard
      )
    }).toThrowError()
  })

  test('throws error if move goes to square out of piece movement range', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |wQ|  |  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    expect(() => {
      executeMove(
        { from: [3, 1], to: [0, 4] },
        null,
        null,
        'white',
        testBoard
      )
    }).toThrowError()
  })

  test('throws error if move goes to square resulting in check', () => {
    const testBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wB|  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    expect(() => {
      executeMove(
        { from: [3, 3], to: [2, 2] },
        null,
        null,
        'white',
        testBoard
      )
    }).toThrowError()
  })

  test('returns a new updated board for a valid move to an empty square', () => {
    const preMoveBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wB|  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const postMoveBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wB|  |',
      '----------------',
      '|  |  |wK|  |  |',
      '----------------',
    ].join('\n'))

    const moveResult = executeMove(
      { from: [4, 3], to: [4, 2] },
      null,
      null,
      'white',
      preMoveBoard
    )

    expect(moveResult).toEqual({
      board: postMoveBoard,
    })
  })

  test('returns a new updated board for a valid move taking a piece', () => {
    const preMoveBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |bR|  |',
      '----------------',
      '|  |  |wB|  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const postMoveBoard = readBoard([
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wB|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const moveResult = executeMove(
      { from: [2, 2], to: [1, 3] },
      null,
      null,
      'white',
      preMoveBoard
    )

    expect(moveResult).toEqual({
      board: postMoveBoard,
      take: {
        square: [1, 3],
        piece: { type: 'rook', side: 'black' }
      }
    })
  })

  test('successfully executes first pawn move two squares', () => {
    const preMoveBoard = readBoard([
      '----------------',
      '|  |  |  |bK|  |',
      '----------------',
      '|bP|bP|bP|bP|  |',
      '----------------',
      '|  |  |  |  |bP|',
      '----------------',
      '|  |  |  |wP|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |wP|wP|  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const postMoveBoard = readBoard([
      '----------------',
      '|  |  |  |bK|  |',
      '----------------',
      '|bP|  |bP|bP|  |',
      '----------------',
      '|  |  |  |  |bP|',
      '----------------',
      '|  |bP|  |wP|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |wP|wP|  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const moveResult = executeMove(
      { from: [1, 1], to: [3, 1] },
      null,
      null,
      'black',
      preMoveBoard
    )

    expect(moveResult).toEqual({
      board: postMoveBoard,
    })
  })

  test('successfully executes pawn en passant', () => {
    const preMoveBoard = readBoard([
      '----------------',
      '|  |  |  |bK|  |',
      '----------------',
      '|bP|bP|  |bP|  |',
      '----------------',
      '|  |  |  |  |bP|',
      '----------------',
      '|  |  |bP|wP|  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |wP|wP|  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const postMoveBoard = readBoard([
      '----------------',
      '|  |  |  |bK|  |',
      '----------------',
      '|bP|bP|  |bP|  |',
      '----------------',
      '|  |  |wP|  |bP|',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |wP|wP|  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const moveResult = executeMove(
      { from: [3, 3], to: [2, 2] },
      { from: [1, 2], to: [3, 2] },
      null,
      'white',
      preMoveBoard
    )

    expect(moveResult).toEqual({
      board: postMoveBoard,
      take: {
        piece: { side: 'black', type: 'pawn' },
        square: [3, 2]
      }
    })
  })

  test('successfully executes pawn take and promote', () => {
    const preMoveBoard = readBoard([
      '----------------',
      '|  |  |bR|bK|  |',
      '----------------',
      '|bP|wP|  |bP|  |',
      '----------------',
      '|  |  |  |  |bP|',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |wP|wP|  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const postMoveBoard = readBoard([
      '----------------',
      '|  |  |wQ|bK|  |',
      '----------------',
      '|bP|  |  |bP|  |',
      '----------------',
      '|  |  |  |  |bP|',
      '----------------',
      '|  |  |  |  |  |',
      '----------------',
      '|  |wP|wP|  |  |',
      '----------------',
      '|  |  |  |wK|  |',
      '----------------',
    ].join('\n'))

    const moveResult = executeMove(
      { from: [1, 1], to: [0, 2] },
      null,
      'queen',
      'white',
      preMoveBoard
    )

    expect(moveResult).toEqual({
      board: postMoveBoard,
      take: {
        piece: { side: 'black', type: 'rook' },
        square: [0, 2]
      },
      promotion: 'queen'
    })
  })
})
