import type { VocabularyWordItem } from "@mezon-tutors/shared";

export const WORD_SEARCH_GRID_SIZE = 14;
export const WORD_SEARCH_WORD_COUNT = 10;

export type WordSearchDirection = "horizontal" | "vertical";

export type WordSearchPlacement = {
  wordId: string;
  displayWord: string;
  text: string;
  startRow: number;
  startCol: number;
  direction: WordSearchDirection;
};

export type WordSearchWord = {
  id: string;
  displayWord: string;
};

export type WordSearchPuzzle = {
  grid: string[][];
  words: WordSearchWord[];
  placements: WordSearchPlacement[];
};

export type WordSearchSessionResult = {
  foundCount: number;
  totalCount: number;
};

export type GridCell = {
  row: number;
  col: number;
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function normalizeWordForSearch(word: string): string {
  return word.replace(/[^a-zA-Z]/g, "").toUpperCase();
}

export function pickWordSearchWords(
  words: VocabularyWordItem[],
): VocabularyWordItem[] {
  const pool = words.filter(
    (word) =>
      word.status === "learned" ||
      word.status === "learning" ||
      word.status === "ready",
  );

  const valid = pool.filter((word) => {
    const normalized = normalizeWordForSearch(word.word);
    return normalized.length >= 2 && normalized.length <= WORD_SEARCH_GRID_SIZE;
  });

  return shuffle(valid).slice(
    0,
    Math.min(WORD_SEARCH_WORD_COUNT, valid.length),
  );
}

function canPlaceWord(
  grid: (string | null)[][],
  text: string,
  row: number,
  col: number,
  horizontal: boolean,
): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const targetRow = horizontal ? row : row + i;
    const targetCol = horizontal ? col + i : col;

    if (
      targetRow < 0 ||
      targetCol < 0 ||
      targetRow >= WORD_SEARCH_GRID_SIZE ||
      targetCol >= WORD_SEARCH_GRID_SIZE
    ) {
      return false;
    }

    const existing = grid[targetRow][targetCol];
    if (existing !== null && existing !== text[i]) {
      return false;
    }
  }

  return true;
}

function placeWordOnGrid(
  grid: (string | null)[][],
  text: string,
  row: number,
  col: number,
  horizontal: boolean,
): void {
  for (let i = 0; i < text.length; i += 1) {
    const targetRow = horizontal ? row : row + i;
    const targetCol = horizontal ? col + i : col;
    grid[targetRow][targetCol] = text[i];
  }
}

function fillEmptyCells(grid: (string | null)[][]): string[][] {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return grid.map((row) =>
    row.map((cell) => {
      if (cell !== null) return cell;
      return letters[Math.floor(Math.random() * letters.length)];
    }),
  );
}

function tryBuildPuzzle(
  wordItems: VocabularyWordItem[],
): WordSearchPuzzle | null {
  const grid: (string | null)[][] = Array.from(
    { length: WORD_SEARCH_GRID_SIZE },
    () => Array<string | null>(WORD_SEARCH_GRID_SIZE).fill(null),
  );
  const placements: WordSearchPlacement[] = [];

  const ordered = shuffle([...wordItems]).sort(
    (a, b) =>
      normalizeWordForSearch(b.word).length -
      normalizeWordForSearch(a.word).length,
  );

  for (const item of ordered) {
    const text = normalizeWordForSearch(item.word);
    const candidates: Array<{
      row: number;
      col: number;
      horizontal: boolean;
    }> = [];

    for (let row = 0; row < WORD_SEARCH_GRID_SIZE; row += 1) {
      for (let col = 0; col < WORD_SEARCH_GRID_SIZE; col += 1) {
        candidates.push({ row, col, horizontal: true });
        candidates.push({ row, col, horizontal: false });
      }
    }

    let placed = false;

    for (const candidate of shuffle(candidates)) {
      if (
        !canPlaceWord(
          grid,
          text,
          candidate.row,
          candidate.col,
          candidate.horizontal,
        )
      ) {
        continue;
      }

      placeWordOnGrid(
        grid,
        text,
        candidate.row,
        candidate.col,
        candidate.horizontal,
      );
      placements.push({
        wordId: item.id,
        displayWord: item.word.toUpperCase(),
        text,
        startRow: candidate.row,
        startCol: candidate.col,
        direction: candidate.horizontal ? "horizontal" : "vertical",
      });
      placed = true;
      break;
    }

    if (!placed) {
      return null;
    }
  }

  return {
    grid: fillEmptyCells(grid),
    words: wordItems.map((item) => ({
      id: item.id,
      displayWord: item.word.toUpperCase(),
    })),
    placements,
  };
}

export function buildWordSearchPuzzle(
  words: VocabularyWordItem[],
): WordSearchPuzzle | null {
  const selected = pickWordSearchWords(words);
  if (selected.length === 0) {
    return null;
  }

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const puzzle = tryBuildPuzzle(shuffle(selected));
    if (puzzle) {
      return puzzle;
    }
  }

  for (let count = selected.length - 1; count >= 1; count -= 1) {
    const subset = shuffle(selected).slice(0, count);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const puzzle = tryBuildPuzzle(shuffle(subset));
      if (puzzle) {
        return puzzle;
      }
    }
  }

  return null;
}

export function constrainSelectionEnd(
  start: GridCell,
  current: GridCell,
): GridCell {
  const deltaRow = Math.abs(current.row - start.row);
  const deltaCol = Math.abs(current.col - start.col);

  if (deltaRow >= deltaCol) {
    return { row: current.row, col: start.col };
  }

  return { row: start.row, col: current.col };
}

export function getCellsBetween(start: GridCell, end: GridCell): GridCell[] {
  if (start.row === end.row) {
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    return Array.from({ length: maxCol - minCol + 1 }, (_, index) => ({
      row: start.row,
      col: minCol + index,
    }));
  }

  if (start.col === end.col) {
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    return Array.from({ length: maxRow - minRow + 1 }, (_, index) => ({
      row: minRow + index,
      col: start.col,
    }));
  }

  return [];
}

export function getCellKey(cell: GridCell): string {
  return `${cell.row}-${cell.col}`;
}

export function getSelectedWordId(
  selectedCells: GridCell[],
  placements: WordSearchPlacement[],
): string | null {
  if (selectedCells.length === 0) {
    return null;
  }

  const selectedKeys = new Set(selectedCells.map(getCellKey));

  for (const placement of placements) {
    const placementCells: GridCell[] = [];

    for (let i = 0; i < placement.text.length; i += 1) {
      placementCells.push({
        row:
          placement.direction === "horizontal"
            ? placement.startRow
            : placement.startRow + i,
        col:
          placement.direction === "horizontal"
            ? placement.startCol + i
            : placement.startCol,
      });
    }

    const forwardMatch = placementCells.every((cell) =>
      selectedKeys.has(getCellKey(cell)),
    );
    const reverseMatch = placementCells
      .slice()
      .reverse()
      .every((cell) => selectedKeys.has(getCellKey(cell)));

    if (
      (forwardMatch || reverseMatch) &&
      placementCells.length === selectedCells.length
    ) {
      return placement.wordId;
    }
  }

  return null;
}

export function getPlacementCells(placement: WordSearchPlacement): GridCell[] {
  return Array.from({ length: placement.text.length }, (_, index) => ({
    row:
      placement.direction === "horizontal"
        ? placement.startRow
        : placement.startRow + index,
    col:
      placement.direction === "horizontal"
        ? placement.startCol + index
        : placement.startCol,
  }));
}
