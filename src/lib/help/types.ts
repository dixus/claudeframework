export interface HelpTooltip {
  term: string;
  definition: string;
  source?: string;
}

export interface PanelHelp {
  panelId: string;
  title: string;
  content: string;
  bullets?: string[];
  source: string;
}
