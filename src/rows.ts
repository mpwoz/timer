import { parseDuration } from './duration';

const ROW_HTML = `
  <label><input class="min" type="text" inputmode="numeric" placeholder="0" aria-label="Minutes" /><span>min</span></label>
  <span class="colon">:</span>
  <label><input class="sec" type="text" inputmode="numeric" placeholder="00" aria-label="Seconds" /><span>sec</span></label>
  <button type="button" class="remove" tabindex="-1" aria-label="Remove interval" title="Remove (Backspace on empty row)">×</button>`;

const minOf = (row: HTMLElement) => row.querySelector<HTMLInputElement>('.min')!;
const secOf = (row: HTMLElement) => row.querySelector<HTMLInputElement>('.sec')!;

/**
 * The list of min:sec input rows, one per interval.
 * Keyboard: "+" in a row inserts a new row after it; Backspace in an empty row removes it.
 */
export class RowList {
  constructor(
    private container: HTMLElement,
    private onChange: () => void,
  ) {}

  get rows(): HTMLElement[] {
    return [...this.container.children] as HTMLElement[];
  }

  /** Replace all rows with the given intervals (at least one, possibly empty, row). */
  set(intervals: number[]): void {
    this.container.replaceChildren();
    if (intervals.length === 0) this.add();
    for (const ms of intervals) this.add(undefined, ms);
  }

  /** Insert a row (after `after`, or at the end) and return it. */
  add(after?: HTMLElement, ms?: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = ROW_HTML;
    const min = minOf(row);
    const sec = secOf(row);
    if (ms) {
      const total = Math.round(ms / 1000);
      min.value = String(Math.floor(total / 60));
      sec.value = String(total % 60).padStart(2, '0');
    }

    for (const input of [min, sec]) {
      input.addEventListener('focus', () => input.select());
      input.addEventListener('input', this.onChange);
      input.addEventListener('keydown', (e) => {
        if (e.key === '+') {
          e.preventDefault();
          this.focus(this.add(row));
        }
      });
    }
    min.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && min.value === '' && sec.value === '' && this.rows.length > 1) {
        e.preventDefault();
        this.remove(row);
      }
    });
    const removeBtn = row.querySelector('button')!;
    removeBtn.addEventListener('mousedown', (e) => e.preventDefault());
    removeBtn.addEventListener('click', () => this.remove(row));

    if (after) after.after(row);
    else this.container.append(row);
    this.onChange();
    return row;
  }

  /** Remove a row and move focus to the end of the previous one. The last row can't be removed. */
  remove(row: HTMLElement): void {
    if (this.rows.length <= 1) return;
    const neighbor = (row.previousElementSibling ?? row.nextElementSibling) as HTMLElement;
    row.remove();
    const sec = secOf(neighbor);
    sec.focus();
    this.onChange();
  }

  focus(row: HTMLElement = this.rows[0]): void {
    minOf(row).focus();
    minOf(row).select();
  }

  /**
   * Parse all rows. Fully blank rows are skipped; `used[i]` is the row element for `intervals[i]`.
   * Rows with unparseable content are reported in `invalid`.
   */
  read(): { intervals: number[]; used: HTMLElement[]; invalid: HTMLElement[] } {
    const intervals: number[] = [];
    const used: HTMLElement[] = [];
    const invalid: HTMLElement[] = [];
    for (const row of this.rows) {
      const m = minOf(row).value;
      const s = secOf(row).value;
      if (!m.trim() && !s.trim()) continue;
      const ms = parseDuration(m, s);
      if (ms === null) invalid.push(row);
      else {
        intervals.push(ms);
        used.push(row);
      }
    }
    return { intervals, used, invalid };
  }
}
