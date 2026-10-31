export const themes = ['light', 'dark', 'system'] as const;

export type Theme = typeof themes[number];

export type ResolvedTheme = Exclude<Theme, 'system'>;

export const defaultTheme: Theme = 'dark';
