# Historical Net Profit Screen Design Notes

This document captures the reusable design language of the **Historical net profit** screen so it can be recreated in other products, dashboards, or websites without depending on this codebase.

## Visual Intent

The screen should feel like a calm financial control panel: compact, premium, analytical, and easy to scan. It avoids flashy decoration and instead relies on soft cream surfaces, thin borders, restrained shadows, small uppercase labels, and one strong accent color for the active state and chart bars.

The strongest visual idea is the contrast between:

- A narrow **year selector rail** on the left.
- A larger **annual detail panel** on the right.
- Inside the detail panel, a **calendar-style month grid** next to a **monthly profit trend chart**.

## Layout

Use a two-column layout on desktop:

- Left column: year selector, fixed/narrow width around `180-220px`.
- Right column: main content, flexible width.
- Gap between columns: `16px`.
- On tablet/mobile: stack columns vertically.

Suggested desktop grid:

```css
.historical-layout {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

@media (max-width: 1199px) {
  .historical-layout {
    grid-template-columns: 1fr;
  }
}
```

## Page Header

The header is simple and left aligned.

- Title: `Historical net profit`
- Title size: `26px`, weight `700`, tight line height.
- Description: `14px`, muted gray, max width around `640px`.
- Spacing below header: `16px`.

Avoid placing the header inside a card. It should sit directly on the page background.

## Color Tokens

Use these colors as the base palette:

```css
:root {
  --cream-50: #FDFCFA;
  --cream-100: #F8F5F0;
  --cream-200: #EDE8DF;

  --ink-900: #171717;
  --ink-700: #374151;
  --ink-600: #4B5563;
  --ink-500: #6B7280;
  --ink-400: #9CA3AF;
  --ink-300: #D1D5DB;
  --ink-200: #E5E7EB;
  --ink-100: #F3F4F6;

  --brand-red: #B91C1C;
  --brand-red-mid: #DC2626;
  --brand-red-dark: #991B1B;

  --white: #FFFFFF;
}
```

Recommended usage:

- Page background: `--cream-100`.
- Main cards: `--white`.
- Selector rail background: `--cream-50` at 60-70% opacity.
- Inner chart/card backgrounds: `--cream-50` at 40-60% opacity.
- Primary text: `--ink-900`.
- Secondary text: `--ink-500`.
- Borders: `--ink-300` for outer cards, `--ink-200` for lighter inner borders.
- Active year border and chart bars: `--brand-red`.

## Typography

Recommended font stack:

```css
font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Use small, precise type:

- Section labels: `10-11px`, uppercase, `font-weight: 600`, letter spacing `0.08em`.
- Year item title: `13px`, `font-weight: 600`.
- Annual total: `22-24px`, `font-weight: 700`, tight line height.
- Month tile value: `14px`, `font-weight: 700`.
- Badges: `10px`, `font-weight: 600`.
- Chart axis labels: `9-10px`.

Do not use oversized dashboard typography here. The design works because it is dense but breathable.

## Card System

Outer cards:

```css
.card {
  background: var(--white);
  border: 1px solid var(--ink-300);
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05);
}
```

Inner panels:

```css
.inner-panel {
  background: rgba(253, 252, 250, 0.55);
  border: 1px solid var(--ink-200);
  border-radius: 12px;
}
```

Month tiles:

```css
.month-tile {
  background: var(--white);
  border: 1px solid var(--ink-300);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}
```

## Year Selector Rail

The left rail should look like a compact control surface.

Container:

- Background: `rgba(253, 252, 250, 0.6)`.
- Border: `1px solid --ink-300`.
- Radius: `16px`.
- Padding: `12px`.
- Full height aligned to main panel.

Label:

- Text: `Years`.
- `11px`, uppercase, letter spaced, muted.
- Padding-bottom: `8px`.

Year buttons:

- White background.
- Radius: `12px`.
- Border: `1px solid --ink-300`.
- Padding: `12px`.
- Text aligned left.
- Active state: border becomes `--brand-red`, text becomes `--ink-900`.
- Inactive state: muted text, hover border darkens.
- Annual total appears as a small pill on the right.

## Main Annual Panel

The right panel contains:

1. Header row with selected year, annual total, and month count.
2. Divider line.
3. Two inner panels: calendar grid and bar chart.

Panel padding:

- `16px` on small screens.
- `20px` on wider screens.

Header row:

- Use `flex-wrap` so the badge does not collide on small widths.
- Bottom border: `1px solid --ink-100`.
- Bottom padding: `10px`.

Annual total format:

```text
£1.25M annual net profit
```

The value should be bold and dark; the suffix should be smaller and muted.

## Month Calendar Grid

The month grid is a signature part of the screen.

Desktop structure:

- 12 slots.
- 4 columns by 3 rows.
- Fixed visual height around `200px`.
- Gap: `8px`.

```css
.month-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 8px;
  height: 200px;
}
```

Each filled month tile:

- Center content vertically and horizontally.
- Month label: uppercase, `10px`, muted.
- Value: `14px`, bold, dark.

Empty months:

- White at 40% opacity.
- Light border.
- No text.

This allows partial years to still look intentional rather than broken.

## Profit Trend Chart

Use a vertical bar chart for monthly net profit.

Chart container:

- Inner panel background: `rgba(253, 252, 250, 0.6)`.
- Border: `1px solid --ink-300`.
- Radius: `12px`.
- Padding: `12px`.
- Height: `200px` for the chart area.

Chart header:

- Left label: `Profit trend`.
- Right label: `Monthly net profit`.
- Both small, `10px`; left uppercase and letter spaced.

Bar styling:

- Fill: `#B91C1C`.
- Stroke: `#991B1B`.
- Active/hover fill: `#DC2626`.
- Radius: `4px 4px 0 0`.

Axis styling:

- No axis lines.
- No tick lines.
- Tick text: `9px`, `--ink-500`.
- Y-axis values abbreviated as `k`, for example `120k`.

Tooltip:

- White background.
- Border: `1px solid --ink-200`.
- Radius: `12px`.
- Shadow: `0 10px 30px rgba(15,23,42,0.08)`.
- Font size: `12px`.
- Show formatted currency.

## Data Shape

Minimum reusable data model:

```ts
type NetProfitMonth = {
  monthNumber: number;       // 1-12
  month: string;             // January, February, etc.
  netProfit: number;         // numeric value in display currency
};

type NetProfitYear = {
  year: number;
  months: NetProfitMonth[];
};
```

Derived values:

```ts
annualTotal = months.reduce((sum, month) => sum + month.netProfit, 0)
monthCount = months.length
chartData = months.map(month => ({
  month: month.month.slice(0, 3).toUpperCase(),
  netProfit: month.netProfit,
}))
```

Calendar slots should always render January to December. If data for a month is missing, render an empty tile.

## Currency Formatting

Use compact financial formatting:

- `£1.2M` for millions.
- `£125k` for thousands.
- Avoid decimals under `£1M` unless the use case requires precision.
- Keep the same format in year pills, month tiles, chart tooltip, and annual total.

Example:

```ts
function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `£${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `£${Math.round(value / 1_000)}k`;
  return `£${Math.round(value)}`;
}
```

## Responsive Behavior

Desktop:

- Two columns: selector rail + main panel.
- Inside main panel: calendar and chart side by side.
- Calendar can be slightly narrower, chart slightly wider.

Tablet:

- Selector rail stacks above main panel.
- Calendar and chart can remain side by side if there is room.

Mobile:

- Everything stacks vertically.
- Calendar grid remains 4x3 if width allows; otherwise use 3 columns x 4 rows.
- Keep chart height at least `180px`.

Suggested inner grid:

```css
.annual-content {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 1.3fr);
}

@media (max-width: 1023px) {
  .annual-content {
    grid-template-columns: 1fr;
  }
}
```

## Interaction Details

Year selection:

- Clicking a year updates the annual panel, month grid, and chart together.
- The selected year should be obvious via red border, not by filling the whole button red.
- Keep transitions short: `150ms`.

Hover:

- Inactive year button border darkens slightly.
- Text becomes darker.

Do not animate the layout size when changing years; the panel should feel stable.

## Copy Pattern

Recommended labels:

- Screen title: `Historical net profit`
- Description: `Monthly net profit by year.`
- Left rail label: `Years`
- Main header suffix: `annual net profit`
- Badge: `{n} months`
- Calendar/chart section label: `Profit trend`
- Chart helper label: `Monthly net profit`

Keep copy short. This screen is for reading numbers, not explaining the product.

## Implementation Checklist

- Use a cream page background.
- Put the page header outside cards.
- Use one narrow year selector card and one larger detail card.
- Use `16px` outer card radius and `12px` inner panel radius.
- Use small uppercase labels with letter spacing.
- Keep annual total large but not hero-sized.
- Render month data as a 12-slot calendar grid.
- Render the trend as a red monthly bar chart.
- Use red only for active state and chart bars.
- Use muted gray for supporting labels and axes.
- Keep shadows subtle.
- Avoid nested decorative cards beyond the necessary selector, annual panel, month tiles, and chart panel.

